import axios from 'axios';
import crypto from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import pool from './db.js';
import { coletarNoticias, selecionarTopNoticias, getConfig } from './collector.js';
import { renderizarVideoNoticias } from './renderer.js';

// Callback para publicar no YouTube (injetado pelo server.js)
let _publicarNoYoutubeFn = null;
export function setPublicarYoutubeFn(fn) { _publicarNoYoutubeFn = fn; }

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEDIA_DIR = resolve(__dirname, '..', '..', 'media');
// Ler env vars no momento de uso (dotenv.config() roda depois dos imports ESM)
function getGeminiKey() { return process.env.GEMINI_API_KEY; }
function getPexelsKey() { return process.env.PEXELS_API_KEY; }
function getGroqKey() { return process.env.GROQ_API_KEY; }
function getOpenRouterKey() { return process.env.OPENROUTER_API_KEY; }

// Armazenamento em memória para status (mesmo padrão do server.js)
export const newsVideosStatus = new Map();

// ========================================
// PIPELINE PRINCIPAL
// ========================================
export async function executarPipelineNoticias(opcoes = {}) {
  const config = await getConfig();
  const videoId = crypto.randomUUID();

  const hoje = new Date();
  const dataStr = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusObj = {
    id: videoId,
    titulo: `Resumo do Dia — ${dataStr}`,
    status: 'COLETANDO',
    progresso: 0,
    etapa: 'Coletando notícias...',
    criado_em: hoje.toISOString(),
  };
  newsVideosStatus.set(videoId, statusObj);

  // Criar registro no banco
  const { rows } = await pool.query(
    `INSERT INTO news_videos (id, titulo, status, config)
     VALUES ($1, $2, 'COLETANDO', $3) RETURNING *`,
    [videoId, statusObj.titulo, JSON.stringify(opcoes)]
  );

  // Disparar pipeline assíncrono
  _executarPipeline(videoId, statusObj, config, opcoes).catch((err) => {
    console.error(`❌ Erro no pipeline de notícias ${videoId}:`, err);
    statusObj.status = 'ERRO';
    statusObj.etapa = `Erro: ${err.message}`;
    pool.query("UPDATE news_videos SET status = 'ERRO' WHERE id = $1", [videoId]);
  });

  return { videoId, titulo: statusObj.titulo };
}

async function _executarPipeline(videoId, statusObj, config, opcoes) {
  try {
    // === ETAPA 1: Coletar ===
    statusObj.etapa = 'Coletando notícias dos feeds RSS...';
    statusObj.progresso = 5;
    const coleta = await coletarNoticias();
    console.log(`📰 Coleta: ${coleta.coletadas} novas de ${coleta.fontes} fontes`);

    // === ETAPA 2: Selecionar ===
    statusObj.etapa = 'Selecionando notícias relevantes...';
    statusObj.progresso = 15;

    const maxNoticias = opcoes.max_noticias || config.max_noticias || 8;
    const threshold = opcoes.threshold_minimo || config.threshold_minimo || 3;
    const categorias = opcoes.categorias || config.categorias_filtro || [];

    const noticias = await selecionarTopNoticias(maxNoticias, categorias);

    if (noticias.length < threshold) {
      console.log(`⚠️ Apenas ${noticias.length} notícias (mínimo: ${threshold}). Cancelando.`);
      statusObj.status = 'SEM_NOTICIAS';
      statusObj.etapa = `Apenas ${noticias.length} notícias encontradas (mínimo: ${threshold})`;
      await pool.query(
        "UPDATE news_videos SET status = 'SEM_NOTICIAS', total_noticias = $2 WHERE id = $1",
        [videoId, noticias.length]
      );
      return;
    }

    console.log(`✅ ${noticias.length} notícias selecionadas para o vídeo`);

    // Registrar itens no banco
    for (let i = 0; i < noticias.length; i++) {
      await pool.query(
        'INSERT INTO news_video_items (news_video_id, news_item_id, ordem) VALUES ($1, $2, $3)',
        [videoId, noticias[i].id, i + 1]
      );
    }

    // === ETAPA 3: Gerar roteiro ===
    statusObj.status = 'ROTEIRO_GERADO';
    statusObj.etapa = 'Gerando roteiro com IA...';
    statusObj.progresso = 25;

    const tom = opcoes.tom || config.tom || 'casual';
    const roteiro = await gerarRoteiroNoticias(noticias, tom);
    statusObj.titulo = roteiro.titulo || statusObj.titulo;

    await pool.query(
      "UPDATE news_videos SET roteiro = $2, titulo = $3, status = 'ROTEIRO_GERADO', total_noticias = $4 WHERE id = $1",
      [videoId, JSON.stringify(roteiro), roteiro.titulo || statusObj.titulo, noticias.length]
    );
    console.log(`✅ Roteiro gerado: "${roteiro.titulo}" (${roteiro.noticias.length} notícias)`);

    // === ETAPA 4: Narração TTS ===
    statusObj.status = 'NARRACAO_PRONTA';
    statusObj.etapa = 'Gerando narração...';
    statusObj.progresso = 40;

    const audioPaths = await gerarNarracaoNoticias(videoId, roteiro);

    await pool.query(
      "UPDATE news_videos SET audio_url = $2, status = 'NARRACAO_PRONTA' WHERE id = $1",
      [videoId, audioPaths.host]
    );
    console.log('✅ Narração completa');

    // === ETAPA 5: Buscar visuais ===
    statusObj.etapa = 'Buscando material visual...';
    statusObj.progresso = 55;

    const visuais = await buscarVisuaisNoticias(roteiro, noticias);
    console.log(`✅ ${visuais.length} visuais encontrados`);

    // === ETAPA 6: Renderizar vídeo ===
    statusObj.status = 'RENDERIZANDO';
    statusObj.etapa = 'Renderizando vídeo estilo news...';
    statusObj.progresso = 65;

    const videoPaths = await renderizarVideoNoticias(videoId, roteiro, audioPaths, visuais);

    await pool.query(
      "UPDATE news_videos SET video_url = $2, status = 'RENDERIZADO' WHERE id = $1",
      [videoId, videoPaths.host]
    );

    statusObj.status = 'RENDERIZADO';
    statusObj.progresso = 90;
    statusObj.videoUrl = videoPaths.host;
    statusObj.etapa = 'Vídeo pronto!';

    // Marcar notícias como usadas
    const usedIds = noticias.map((n) => n.id);
    await pool.query(
      'UPDATE news_items SET usado_em_video = true WHERE id = ANY($1::uuid[])',
      [usedIds]
    );

    // === ETAPA 7: Upload YouTube (opcional) ===
    if (opcoes.publicarYoutube && _publicarNoYoutubeFn) {
      try {
        statusObj.status = 'PUBLICANDO';
        statusObj.etapa = 'Publicando no YouTube...';
        statusObj.progresso = 92;

        const videoPaths = { host: statusObj.videoUrl };
        const youtubeId = await _publicarNoYoutubeFn(videoId, videoPaths, roteiro);

        await pool.query(
          "UPDATE news_videos SET youtube_id = $2, status = 'PUBLICADO' WHERE id = $1",
          [videoId, youtubeId]
        );
        statusObj.status = 'PUBLICADO';
        statusObj.etapa = `Publicado no YouTube! (${youtubeId})`;
        console.log(`📺 Vídeo de notícias publicado no YouTube: ${youtubeId}`);
      } catch (ytErr) {
        console.error('⚠️ Erro ao publicar no YouTube:', ytErr.message);
        statusObj.etapa = `Vídeo pronto! (Falha no YouTube: ${ytErr.message})`;
        // Não falha o pipeline inteiro, vídeo já está renderizado
      }
    } else if (opcoes.publicarYoutube && !_publicarNoYoutubeFn) {
      console.warn('⚠️ YouTube solicitado mas não autenticado');
      statusObj.etapa = 'Vídeo pronto! (YouTube não autenticado)';
    }

    statusObj.progresso = 100;
    if (!statusObj.etapa.includes('Publicado') && !statusObj.etapa.includes('Falha')) {
      statusObj.etapa = 'Vídeo de notícias pronto!';
    }
    console.log(`✅ Pipeline de notícias concluído: ${videoId}`);

  } catch (error) {
    statusObj.status = 'ERRO';
    statusObj.etapa = `Erro: ${error.message}`;
    await pool.query("UPDATE news_videos SET status = 'ERRO' WHERE id = $1", [videoId]);
    throw error;
  }
}

// ========================================
// GERAR ROTEIRO COM LLM
// ========================================
async function gerarRoteiroNoticias(noticias, tom = 'casual') {
  const hoje = new Date();
  const dataStr = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const tomInstrucoes = {
    formal: 'Tom jornalístico formal, sério e objetivo. Como um telejornal tradicional.',
    casual: `Tom casual, ENGRAÇADO e descontraído, como um comediante comentando notícias. 
USE OBRIGATORIAMENTE em CADA notícia:
- Pelo menos 1 TROCADILHO com palavras-chave da notícia
- Pelo menos 1 PIADA ou observação humorística (pode ser irônica, sarcástica ou absurda)
- Comentários espirituosos tipo "e eu que achava que...", "spoiler:", "plot twist:"
- Referências a memes ou cultura pop quando couber
- Transições engraçadas entre notícias tipo "mas se você achou isso doido, espera só..."
O humor deve ser LEVE e INTELIGENTE, nunca ofensivo. Pense no estilo Greg News ou Porta dos Fundos.`,
    dramatico: 'Tom dramático e urgente, como breaking news. Crie suspense e impacto.',
  };

  const noticiasTexto = noticias
    .map((n, i) =>
      `${i + 1}. [${n.fonte}] ${n.titulo}\nResumo: ${n.resumo || 'Sem resumo'}\nURL: ${n.url}`
    )
    .join('\n\n');

  const prompt = `Você é um roteirista profissional de vídeos de RESUMO DIÁRIO DE NOTÍCIAS para YouTube em português brasileiro.

Data de hoje: ${dataStr}
Tom: ${tomInstrucoes[tom] || tomInstrucoes.casual}

NOTÍCIAS DO DIA (use TODAS):
${noticiasTexto}

REGRAS:
1. REESCREVA cada notícia com suas próprias palavras (NÃO copie o texto)
2. Cada notícia deve ter 4-6 frases de narração, com HUMOR, trocadilhos e piadinhas
3. Crie uma abertura EMPOLGANTE e ENGRAÇADA e um encerramento com CTA divertido
4. A keyword_visual deve ser em INGLÊS (para busca em stock)
5. Mantenha o roteiro entre 3-8 minutos de narração total
6. Indique a fonte original de cada notícia
7. FAÇA TROCADILHOS com palavras da manchete (ex: "isso sim é dar um CTRL+Z na situação")
8. Use TRANSIÇÕES ENGRAÇADAS entre notícias ("e por falar em confusão...", "agora segura essa...")

Retorne APENAS JSON válido (sem markdown):

{
  "titulo": "Resumo do Dia — ${hoje.toLocaleDateString('pt-BR')} | As Principais Notícias",
  "descricao": "Descrição SEO para YouTube com timestamps e keywords",
  "tags": ["noticias", "resumo do dia", "hoje", ...mais tags],
  "abertura": {
    "texto_narracao": "Texto da abertura...",
    "duracao_estimada": 10
  },
  "noticias": [
    {
      "numero": 1,
      "manchete": "Manchete curta",
      "texto_narracao": "Reescrita ENGRAÇADA da notícia em 4-6 frases com trocadilhos e humor...",
      "keyword_visual": "english keywords for stock search",
      "fonte": "Nome da Fonte",
      "url_fonte": "url original",
      "duracao_estimada": 30
    }
  ],
  "encerramento": {
    "texto_narracao": "Texto de encerramento com CTA...",
    "duracao_estimada": 10
  },
  "thumbnail_manchete": "Manchete MAIS impactante para thumbnail"
}`;

  let content;

  try {
    // Vertex AI
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const accessToken = await auth.getAccessToken();
    const projectId = await auth.getProjectId();

    const resp = await axios.post(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent`,
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        timeout: 60000,
      }
    );
    content = resp.data.candidates[0].content.parts[0].text;
    console.log('✅ Roteiro de notícias gerado via Vertex AI');
  } catch (vertexErr) {
    console.warn('⚠️ Vertex falhou, tentando API Key...', vertexErr.message);

    // === Fallback 1: Gemini API Key — múltiplos modelos (quotas separadas) ===
    if (getGeminiKey()) {
      const geminiModels = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
      for (const model of geminiModels) {
        if (content) break;
        try {
          console.log(`  🔄 Gemini API Key (${model})...`);
          const resp = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { headers: { 'Content-Type': 'application/json' }, params: { key: getGeminiKey() }, timeout: 60000 }
          );
          content = resp.data.candidates[0].content.parts[0].text;
          console.log(`✅ Roteiro de notícias gerado via Gemini API Key (${model})`);
        } catch (apiKeyErr) {
          const status = apiKeyErr.response?.status;
          console.warn(`  ⚠️ Gemini ${model}: ${status || apiKeyErr.message}`);
        }
      }
    }

    // === Fallback 2: Groq (gratuito com API key — generoso free tier) ===
    if (!content && getGroqKey()) {
      const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'];
      for (const model of groqModels) {
        try {
          console.log(`  🔄 Groq (${model})...`);
          const groqResp = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            { model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 },
            {
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getGroqKey()}` },
              timeout: 60000,
            }
          );
          const groqContent = groqResp.data?.choices?.[0]?.message?.content;
          if (groqContent) {
            const jsonMatch2 = groqContent.match(/\{[\s\S]*"titulo"[\s\S]*\}/);
            if (jsonMatch2) {
              content = groqContent;
              console.log(`✅ Roteiro de notícias gerado via Groq (${model})`);
              break;
            } else {
              console.warn(`  ⚠️ Groq ${model}: resposta sem campo titulo`);
            }
          }
        } catch (groqErr) {
          console.warn(`  ⚠️ Groq ${model}: ${groqErr.response?.status || groqErr.message}`);
        }
      }
    }

    // === Fallback 3: OpenRouter (precisa API key, free tier generoso) ===
    if (!content && getOpenRouterKey()) {
      const openRouterModels = [
        'deepseek/deepseek-chat-v3-0324:free',
        'google/gemma-3-27b-it:free',
        'meta-llama/llama-4-maverick:free',
        'qwen/qwen3-235b-a22b:free',
      ];
      for (const model of openRouterModels) {
        try {
          const modelShort = model.split('/')[1]?.split(':')[0] || model;
          console.log(`  🔄 OpenRouter (${modelShort})...`);
          const orResp = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            { model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 4096 },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getOpenRouterKey()}`,
                'HTTP-Referer': 'https://videoforge.tech',
                'X-Title': 'VideoForge News',
              },
              timeout: 90000,
            }
          );
          const orContent = orResp.data?.choices?.[0]?.message?.content;
          if (orContent) {
            const jsonMatch2 = orContent.match(/\{[\s\S]*"titulo"[\s\S]*\}/);
            if (jsonMatch2) {
              content = orContent;
              console.log(`✅ Roteiro de notícias gerado via OpenRouter (${modelShort})`);
              break;
            } else {
              console.warn(`  ⚠️ OpenRouter ${modelShort}: resposta sem campo titulo`);
            }
          }
        } catch (orErr) {
          console.warn(`  ⚠️ OpenRouter ${model.split('/')[1]?.split(':')[0] || model}: ${orErr.response?.status || orErr.message}`);
        }
      }
    }

    // === Fallback 4: Pollinations.ai (gratuito, sem API key) ===
    if (!content) {
      const pollinationsModels = ['openai', 'mistral', 'llama'];
      for (const model of pollinationsModels) {
        try {
          console.log(`  🔄 Pollinations (${model})...`);
          const polResp = await axios.post(
            'https://text.pollinations.ai/',
            { messages: [{ role: 'user', content: prompt }], model, seed: Date.now() },
            { headers: { 'Content-Type': 'application/json' }, timeout: 90000, responseType: 'text' }
          );
          let raw = typeof polResp.data === 'string' ? polResp.data : JSON.stringify(polResp.data);
          try {
            const parsed = typeof polResp.data === 'object' ? polResp.data : JSON.parse(raw);
            if (parsed.content && typeof parsed.content === 'string') raw = parsed.content;
            else if (parsed.choices?.[0]?.message?.content) raw = parsed.choices[0].message.content;
          } catch (_) {}
          const jsonMatch2 = raw.match(/\{[\s\S]*"titulo"[\s\S]*\}/);
          if (jsonMatch2) {
            content = raw;
            console.log(`✅ Roteiro de notícias gerado via Pollinations (${model})`);
            break;
          } else {
            console.warn(`  ⚠️ Pollinations ${model}: resposta sem campo titulo`);
          }
        } catch (polErr) {
          console.warn(`  ⚠️ Pollinations ${model}: ${polErr.response?.status || polErr.message}`);
        }
      }
    }

    if (!content) throw new Error('Todos os provedores de LLM falharam. Configure GROQ_API_KEY (grátis em groq.com) como backup confiável.');
  }

  const jsonMatch = content.match(/\{[\s\S]*"titulo"[\s\S]*\}/);
  const roteiro = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

  // Validar que o roteiro tem os campos essenciais
  if (!roteiro.titulo) {
    const hoje2 = new Date();
    roteiro.titulo = `Resumo do Dia — ${hoje2.toLocaleDateString('pt-BR')} | As Principais Notícias`;
  }
  if (!roteiro.noticias || !Array.isArray(roteiro.noticias)) {
    throw new Error('Roteiro gerado pela IA não contém campo "noticias" válido');
  }
  return roteiro;
}

// ========================================
// NARRAÇÃO TTS
// ========================================
async function gerarNarracaoNoticias(videoId, roteiro) {
  const dockerAudioPath = `/media/audios/news_${videoId}.mp3`;
  const hostAudioPath = resolve(MEDIA_DIR, 'audios', `news_${videoId}.mp3`);

  await fs.mkdir(resolve(MEDIA_DIR, 'audios'), { recursive: true });
  await fs.mkdir(resolve(MEDIA_DIR, 'temp', videoId), { recursive: true });

  // Montar lista de textos: abertura + notícias + encerramento
  const textos = [];
  textos.push(roteiro.abertura.texto_narracao);
  for (const n of roteiro.noticias) {
    textos.push(n.texto_narracao);
  }
  textos.push(roteiro.encerramento.texto_narracao);

  const cenasPath = resolve(MEDIA_DIR, 'temp', `${videoId}_news_textos.json`);
  await fs.writeFile(cenasPath, JSON.stringify(textos), 'utf-8');

  const scriptContent = `
import json, subprocess, os, sys, asyncio
import edge_tts

video_id = sys.argv[1]
output_path = sys.argv[2]
cenas_path = sys.argv[3]

textos = json.load(open(cenas_path))
temp_dir = f'/media/temp/{video_id}'
os.makedirs(temp_dir, exist_ok=True)

# Voz neural brasileira masculina (natural, estilo jornalista)
VOZ = 'pt-BR-AntonioNeural'
# Rate ligeiramente acelerado para notícias (+8%)
RATE = '+8%'
PITCH = '+0Hz'

audio_files = []
duracoes = []

async def gerar_segmento(i, texto):
    raw_path = f'{temp_dir}/news_{i}_raw.mp3'
    enhanced_path = f'{temp_dir}/news_{i}_audio.mp3'
    
    # Edge TTS - voz neural Microsoft
    communicate = edge_tts.Communicate(texto, VOZ, rate=RATE, pitch=PITCH)
    await communicate.save(raw_path)
    
    # Enhance: equalização e normalização (sem atempo - edge-tts já tem rate)
    subprocess.run([
        'ffmpeg', '-y', '-i', raw_path,
        '-filter_complex',
        'equalizer=f=2800:width_type=o:width=2:g=3,'
        'equalizer=f=5000:width_type=o:width=2:g=2,'
        'equalizer=f=150:width_type=o:width=2:g=-2,'
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ar', '44100', '-b:a', '192k',
        enhanced_path
    ], capture_output=True, timeout=60)
    
    if not os.path.exists(enhanced_path) or os.path.getsize(enhanced_path) < 1000:
        # Fallback: usar sem enhance
        import shutil
        shutil.copy2(raw_path, enhanced_path)
    
    r = subprocess.run([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', enhanced_path
    ], capture_output=True, text=True)
    dur = float(r.stdout.strip() or '5')
    duracoes.append(dur)
    audio_files.append(enhanced_path)
    print(f'Segmento {i+1}/{len(textos)}: {dur:.1f}s')

async def main():
    # Gerar segmentos sequencialmente (edge-tts precisa de conexão)
    for i, texto in enumerate(textos):
        await gerar_segmento(i, texto)

asyncio.run(main())

concat_list = f'{temp_dir}/news_audio_list.txt'
with open(concat_list, 'w') as f:
    for af in audio_files:
        f.write(f"file '{af}'\\n")

subprocess.run([
    'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
    '-c:a', 'libmp3lame', '-b:a', '192k', output_path
], capture_output=True, timeout=120)

dur_path = f'/media/temp/{video_id}_news_duracoes.json'
json.dump(duracoes, open(dur_path, 'w'))
os.chmod(dur_path, 0o666)

# Corrigir permissoes de todos os arquivos criados pelo Docker
for root_dir, dirs, files in os.walk(temp_dir):
    for fname in files:
        try:
            os.chmod(os.path.join(root_dir, fname), 0o666)
        except:
            pass
    for dname in dirs:
        try:
            os.chmod(os.path.join(root_dir, dname), 0o777)
        except:
            pass
try:
    os.chmod(temp_dir, 0o777)
    os.chmod(output_path, 0o666)
except:
    pass

total = sum(duracoes)
print(f'Total: {total:.1f}s | Segmentos: {len(duracoes)}')
print(f'DURACOES:{json.dumps(duracoes)}')
`;

  const scriptPath = resolve(MEDIA_DIR, 'temp', `${videoId}_news_tts.py`);
  await fs.writeFile(scriptPath, scriptContent, 'utf-8');

  const cmd = `docker exec videoforge-python-worker python /media/temp/${videoId}_news_tts.py "${videoId}" "${dockerAudioPath}" "/media/temp/${videoId}_news_textos.json"`;

  const { stdout } = await execAsync(cmd, { timeout: 180000 });
  console.log('🔊 News TTS:', stdout.trim());

  const durMatch = stdout.match(/DURACOES:(\[.*\])/);
  const duracoes = durMatch ? JSON.parse(durMatch[1]) : null;

  await fs.access(hostAudioPath);
  return { docker: dockerAudioPath, host: hostAudioPath, duracoes };
}

// ========================================
// BUSCAR VISUAIS PARA NOTÍCIAS
// ========================================
// ========================================
// EXTRAIR og:image DE UMA URL DE NOTÍCIA
// ========================================
async function buscarOgImage(url) {
  if (!url) return null;
  try {
    const resp = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)',
        'Accept': 'text/html',
      },
      maxRedirects: 3,
      responseType: 'text',
    });
    const html = resp.data || '';
    // og:image, twitter:image, ou primeira <img> de alta resolução
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1] && m[1].startsWith('http') && !m[1].includes('logo') && !m[1].includes('icon')) {
        return m[1];
      }
    }
  } catch (_) { /* timeout or blocked */ }
  return null;
}

async function buscarVisuaisNoticias(roteiro, noticias) {
  const visuais = [];

  // Abertura: og:image das primeiras notícias + fallback Pexels
  const aberturaImgs = await buscarImagensPexels('breaking news broadcast live television studio', 3);
  visuais.push({
    tipo: 'abertura',
    urls: aberturaImgs,
    manchete: null,
    modo: 'slideshow',
  });

  // Para cada notícia: og:image (print real do portal) + Pexels como backup
  for (let i = 0; i < roteiro.noticias.length; i++) {
    const n = roteiro.noticias[i];
    const noticiaOriginal = noticias[i];

    const urls = [];

    // Prioridade 1: og:image do site da notícia (print/screenshot via meta tag)
    if (noticiaOriginal?.url) {
      console.log(`  🖼️ Buscando og:image: ${noticiaOriginal.url.substring(0, 60)}...`);
      const ogImg = await buscarOgImage(noticiaOriginal.url);
      if (ogImg) {
        urls.push(ogImg);
        console.log(`  ✅ og:image encontrado: ${ogImg.substring(0, 60)}`);
      }
    }

    // Prioridade 2: imagem_url salva no banco (thumbnail do feed RSS)
    if (noticiaOriginal?.imagem_url && !urls.includes(noticiaOriginal.imagem_url)) {
      urls.push(noticiaOriginal.imagem_url);
    }

    // Completar com Pexels para ter no mínimo 2 imagens por slide
    const needed = Math.max(3 - urls.length, 1);
    const pexelsImgs = await buscarImagensPexels(n.keyword_visual || n.manchete, needed);
    urls.push(...pexelsImgs);

    visuais.push({
      tipo: 'noticia',
      numero: n.numero,
      urls: urls.slice(0, 4),
      manchete: n.manchete,
      fonte: n.fonte,
      url_original: noticiaOriginal?.url || null,
      modo: 'slideshow',
    });
  }

  // Encerramento
  const encImgs = await buscarImagensPexels('subscribe like notification social media youtube', 3);
  visuais.push({
    tipo: 'encerramento',
    urls: encImgs,
    manchete: null,
    modo: 'slideshow',
  });

  return visuais;
}

async function buscarImagensPexels(query, count = 3) {
  const fallback = 'https://images.pexels.com/photos/518543/pexels-photo-518543.jpeg';
  const pexelsKey = getPexelsKey();
  if (!pexelsKey) {
    console.warn('⚠️ PEXELS_API_KEY não definida, usando fallback');
    return Array(count).fill(fallback);
  }

  try {
    const resp = await axios.get('https://api.pexels.com/v1/search', {
      params: { query: query.substring(0, 80), per_page: Math.min(count + 2, 10), orientation: 'landscape' },
      headers: { Authorization: pexelsKey },
    });
    if (resp.data.photos?.length > 0) {
      const urls = resp.data.photos.slice(0, count).map(p => p.src.large2x);
      // Completar se não tiver o suficiente
      while (urls.length < count) urls.push(urls[0] || fallback);
      return urls;
    }
  } catch (err) {
    console.warn(`⚠️ Pexels falhou para "${query}": ${err.message}`);
  }
  return Array(count).fill(fallback);
}

async function buscarImagemPexels(query) {
  const imgs = await buscarImagensPexels(query, 1);
  return imgs[0];
}

// ========================================
// Listar vídeos de notícias (do banco)
// ========================================
export async function listarNewsVideos() {
  const { rows } = await pool.query(
    'SELECT id, titulo, status, total_noticias, video_url, youtube_id, created_at FROM news_videos ORDER BY created_at DESC LIMIT 50'
  );
  // Merge com status em memória
  return rows.map((r) => {
    const mem = newsVideosStatus.get(r.id);
    if (mem) {
      return { ...r, progresso: mem.progresso, etapa: mem.etapa };
    }
    return { ...r, progresso: r.status === 'RENDERIZADO' || r.status === 'PUBLICADO' ? 100 : 0, etapa: r.status };
  });
}

export async function getNewsVideo(id) {
  const { rows } = await pool.query('SELECT * FROM news_videos WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  const mem = newsVideosStatus.get(id);
  if (mem) {
    return { ...rows[0], progresso: mem.progresso, etapa: mem.etapa };
  }
  return rows[0];
}
