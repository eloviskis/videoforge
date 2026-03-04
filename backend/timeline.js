// ============================================
// TIMELINE: Upload de clipes + merge + roteiro IA
// ============================================
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { resolve, basename, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registrarRotasTimeline(app) {
  // Usar mesmo MEDIA_DIR do server.js
  const MEDIA_DIR = process.env.MEDIA_DIR || resolve(__dirname, '..', 'media');
  const TIMELINE_DIR = resolve(MEDIA_DIR, 'timeline');
  console.log(`🎬 TIMELINE_DIR: ${TIMELINE_DIR}`);
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Garantir diretório
  fs.mkdir(TIMELINE_DIR, { recursive: true }).catch(() => {});

  // ── Multer config ──────────────────────────
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const projectId = req.params.projectId || uuidv4();
      const dir = resolve(TIMELINE_DIR, projectId);
      await fs.mkdir(dir, { recursive: true });
      req.timelineProjectId = projectId;
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname) || '.mp4';
      const name = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
      cb(null, name);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB por arquivo
    fileFilter: (req, file, cb) => {
      const allowed = /video\/(mp4|webm|quicktime|x-msvideo|x-matroska|mpeg)|audio\/(mpeg|mp3|wav|ogg|aac)|application\/octet-stream/;
      const videoExts = /\.(mp4|webm|mov|avi|mkv|mpeg|mp3|wav|ogg|aac)$/i;
      if (allowed.test(file.mimetype) || videoExts.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo não suportado: ${file.mimetype}`), false);
      }
    }
  });

  // ── Criar projeto de timeline ──────────────
  app.post('/api/timeline/projects', async (req, res) => {
    try {
      const projectId = uuidv4();
      const dir = resolve(TIMELINE_DIR, projectId);
      await fs.mkdir(dir, { recursive: true });

      // Salvar metadata do projeto
      const meta = {
        id: projectId,
        name: req.body.name || 'Projeto sem título',
        createdAt: new Date().toISOString(),
        clips: [],
        roteiro: null,
        musica: null,
        legendas: null,
        status: 'editing'
      };
      await fs.writeFile(resolve(dir, 'meta.json'), JSON.stringify(meta, null, 2));
      res.json(meta);
    } catch (e) {
      console.error('Erro criar projeto timeline:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Upload de clipes ───────────────────────
  app.post('/api/timeline/projects/:projectId/clips', upload.array('clips', 20), async (req, res) => {
    try {
      const { projectId } = req.params;
      const dir = resolve(TIMELINE_DIR, projectId);
      const metaPath = resolve(dir, 'meta.json');

      if (!existsSync(metaPath)) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

      // Extrair info de cada clipe com ffprobe
      const newClips = [];
      for (const file of req.files) {
        let duration = 10;
        let width = 1920, height = 1080;
        try {
          const probe = await execAsync(
            `ffprobe -v quiet -print_format json -show_format -show_streams "${resolve(dir, file.filename)}"`
          );
          const info = JSON.parse(probe.stdout);
          duration = parseFloat(info.format?.duration || 10);
          const vs = info.streams?.find(s => s.codec_type === 'video');
          if (vs) { width = vs.width; height = vs.height; }
        } catch (e) {
          console.warn(`ffprobe falhou para ${file.filename}: ${e.message}`);
        }

        // Gerar thumbnail
        const thumbName = `thumb_${file.filename.replace(/\.\w+$/, '.jpg')}`;
        try {
          await execAsync(
            `ffmpeg -y -i "${resolve(dir, file.filename)}" -ss 1 -vframes 1 -vf "scale=320:-1" "${resolve(dir, thumbName)}"`
          );
        } catch {
          // sem thumbnail, ok
        }

        newClips.push({
          id: uuidv4(),
          filename: file.filename,
          originalName: file.originalname,
          thumbnail: existsSync(resolve(dir, thumbName)) ? thumbName : null,
          duration,
          width, height,
          order: meta.clips.length + newClips.length,
          trimStart: 0,
          trimEnd: duration,
          volume: 1.0,
          addedAt: new Date().toISOString()
        });
      }

      meta.clips.push(...newClips);
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

      res.json({ clips: newClips, total: meta.clips.length });
    } catch (e) {
      console.error('Erro upload clips:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Listar projeto ─────────────────────────
  app.get('/api/timeline/projects/:projectId', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Projeto não encontrado' });
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      res.json(meta);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Deletar projeto ────────────────────────
  app.delete('/api/timeline/projects/:projectId', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      if (!existsSync(dir)) return res.status(404).json({ error: 'Projeto não encontrado' });
      await fs.rm(dir, { recursive: true, force: true });
      res.json({ ok: true, message: 'Projeto removido' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Servir thumbnail/clipe ─────────────────
  app.get('/api/timeline/projects/:projectId/files/:filename', async (req, res) => {
    try {
      const filePath = resolve(TIMELINE_DIR, req.params.projectId, req.params.filename);
      if (!existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });
      res.sendFile(filePath);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Reordenar / atualizar clipes ───────────
  app.put('/api/timeline/projects/:projectId/clips', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Projeto não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      const { clips } = req.body; // Array com id, order, trimStart, trimEnd, volume
      if (!clips) return res.status(400).json({ error: 'clips é obrigatório' });

      // Atualizar clips mantendo dados do servidor
      for (const update of clips) {
        const clip = meta.clips.find(c => c.id === update.id);
        if (clip) {
          if (update.order !== undefined) clip.order = update.order;
          if (update.trimStart !== undefined) clip.trimStart = update.trimStart;
          if (update.trimEnd !== undefined) clip.trimEnd = update.trimEnd;
          if (update.volume !== undefined) clip.volume = update.volume;
          if (update.speed !== undefined) clip.speed = update.speed;
        }
      }
      meta.clips.sort((a, b) => a.order - b.order);
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json(meta);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Remover clipe ──────────────────────────
  app.delete('/api/timeline/projects/:projectId/clips/:clipId', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      const clip = meta.clips.find(c => c.id === req.params.clipId);
      if (!clip) return res.status(404).json({ error: 'Clipe não encontrado' });

      // Deletar arquivos
      try { await fs.unlink(resolve(dir, clip.filename)); } catch {}
      if (clip.thumbnail) try { await fs.unlink(resolve(dir, clip.thumbnail)); } catch {}

      meta.clips = meta.clips.filter(c => c.id !== req.params.clipId);
      meta.clips.forEach((c, i) => c.order = i);
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json(meta);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Gerar roteiro baseado nos vídeos ───────
  app.post('/api/timeline/projects/:projectId/generate-script', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (meta.clips.length === 0) return res.status(400).json({ error: 'Adicione clipes primeiro' });

      const { tom, idioma, instrucoes } = req.body;
      const tomTexto = tom || 'narração envolvente de documentário';
      const idiomaTexto = idioma || 'português brasileiro';

      // Extrair info de cada clipe (nomes, duração, thumbnails)
      const clipInfos = meta.clips.map((c, i) => ({
        numero: i + 1,
        nome: c.originalName,
        duracao: `${(c.trimEnd - c.trimStart).toFixed(1)}s`,
        resolucao: `${c.width}x${c.height}`
      }));

      const duracaoTotal = meta.clips.reduce((s, c) => s + (c.trimEnd - c.trimStart), 0);

      // Tentar extrair frames dos vídeos para enviar ao Gemini Vision
      const frameDescriptions = [];
      for (const clip of meta.clips) {
        const framePath = resolve(dir, `frame_${clip.id}.jpg`);
        try {
          await execAsync(
            `ffmpeg -y -i "${resolve(dir, clip.filename)}" -ss ${Math.min(1, clip.duration / 2)} -vframes 1 -vf "scale=512:-1" -q:v 3 "${framePath}"`
          );
          if (existsSync(framePath)) {
            const frameBuffer = await fs.readFile(framePath);
            const base64 = frameBuffer.toString('base64');
            frameDescriptions.push({
              clipNum: clip.order + 1,
              clipName: clip.originalName,
              base64,
              mimeType: 'image/jpeg'
            });
          }
        } catch {
          // Se não conseguiu extrair frame, sem problema
        }
      }

      let roteiro;

      // Se temos frames e API do Gemini, usar Vision para analisar
      if (frameDescriptions.length > 0 && GEMINI_API_KEY && GEMINI_API_KEY !== 'sua_chave_aqui') {
        console.log(`🎬 Timeline: Analisando ${frameDescriptions.length} frames com Gemini Vision...`);

        const parts = [];

        // Adicionar cada frame como imagem inline
        for (const fd of frameDescriptions) {
          parts.push({
            inlineData: {
              mimeType: fd.mimeType,
              data: fd.base64
            }
          });
          parts.push({
            text: `[Clipe ${fd.clipNum}: "${fd.clipName}"]`
          });
        }

        // Prompt final com instrução
        parts.push({
          text: `Você é um roteirista profissional. Acima estão frames extraídos de ${meta.clips.length} clipes de vídeo que serão montados em sequência.

Informações dos clipes:
${clipInfos.map(c => `- Clipe ${c.numero}: "${c.nome}" (${c.duracao}, ${c.resolucao})`).join('\n')}

Duração total estimada: ${duracaoTotal.toFixed(0)} segundos

Tom desejado: ${tomTexto}
Idioma: ${idiomaTexto}
${instrucoes ? `Instruções adicionais: ${instrucoes}` : ''}

ANALISE as imagens acima e crie um roteiro COMPLETO que:
1. Descreva uma narração para CADA clipe, sincronizada com o conteúdo visual
2. A narração deve fluir naturalmente entre um clipe e o próximo
3. Cada trecho de narração deve corresponder à duração do clipe
4. Inclua sugestão de música de fundo (gênero/mood) e pontos de destaque para legendas

Retorne APENAS um JSON válido:
{
  "titulo": "Título para o vídeo final",
  "descricao": "Descrição curta para YouTube/redes",
  "musicaSugerida": "Gênero/mood de música de fundo sugerido",
  "cenas": [
    {
      "clipNum": 1,
      "narracao": "Texto da narração para este clipe",
      "legendaDestaque": "Frase curta de destaque para legenda (máx 10 palavras)",
      "transicao": "Tipo de transição sugerida para o próximo clipe (ex: fade, cut, dissolve)"
    }
  ]
}`
        });

        // Chamar Gemini com Vision
        const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let success = false;

        for (const model of models) {
          try {
            const response = await axios.post(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              { contents: [{ parts }] },
              {
                headers: { 'Content-Type': 'application/json' },
                params: { key: GEMINI_API_KEY },
                timeout: 90000
              }
            );

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              console.log(`  ✅ Gemini Vision (${model}) analisou os clipes`);
              let jsonStr = text;
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) jsonStr = jsonMatch[0];
              jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');

              roteiro = JSON.parse(jsonStr);
              success = true;
              break;
            }
          } catch (e) {
            console.warn(`  ⚠️ Gemini Vision ${model}: ${e.response?.status || e.message}`);
          }
        }

        if (!success) {
          // Fallback: usar apenas texto sem imagens
          roteiro = await gerarRoteiroTexto(clipInfos, duracaoTotal, tomTexto, idiomaTexto, instrucoes, GEMINI_API_KEY);
        }
      } else if (GEMINI_API_KEY && GEMINI_API_KEY !== 'sua_chave_aqui') {
        // Sem frames, usar apenas metadados de texto
        roteiro = await gerarRoteiroTexto(clipInfos, duracaoTotal, tomTexto, idiomaTexto, instrucoes, GEMINI_API_KEY);
      } else {
        // Sem API — gerar roteiro template
        roteiro = {
          titulo: meta.name || 'Meu Vídeo',
          descricao: `Compilação de ${meta.clips.length} clipes`,
          musicaSugerida: 'Música ambiente suave / lo-fi',
          cenas: meta.clips.map((c, i) => ({
            clipNum: i + 1,
            narracao: `Cena ${i + 1}: ${c.originalName.replace(/\.\w+$/, '')}. `,
            legendaDestaque: c.originalName.replace(/\.\w+$/, ''),
            transicao: i < meta.clips.length - 1 ? 'fade' : 'none'
          }))
        };
      }

      meta.roteiro = roteiro;
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

      // Limpar frames temporários
      for (const clip of meta.clips) {
        try { await fs.unlink(resolve(dir, `frame_${clip.id}.jpg`)); } catch {}
      }

      res.json(roteiro);
    } catch (e) {
      console.error('Erro gerar roteiro timeline:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Atualizar roteiro manualmente ──────────
  app.put('/api/timeline/projects/:projectId/script', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      meta.roteiro = req.body.roteiro;
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════
  // IA AUTO-EDIT: Análise inteligente dos clipes
  // ══════════════════════════════════════════════════════
  app.post('/api/timeline/projects/:projectId/ai-edit', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (meta.clips.length === 0) return res.status(400).json({ error: 'Adicione clipes primeiro' });

      const { estilo } = req.body; // ex: 'dinamico', 'cinematico', 'rapido'
      const estiloTexto = estilo || 'edição profissional e dinâmica';

      // Extrair frame do meio de cada clipe
      const frameData = [];
      for (const clip of meta.clips) {
        const framePath = resolve(dir, `aiedit_frame_${clip.id}.jpg`);
        try {
          const midPoint = Math.min(clip.duration / 2, (clip.trimEnd - clip.trimStart) / 2 + clip.trimStart);
          await execAsync(
            `ffmpeg -y -i "${resolve(dir, clip.filename)}" -ss ${midPoint} -vframes 1 -vf "scale=512:-1" -q:v 3 "${framePath}"`,
            { timeout: 15000 }
          );
          if (existsSync(framePath)) {
            const buf = await fs.readFile(framePath);
            frameData.push({
              clipId: clip.id,
              clipNum: clip.order + 1,
              name: clip.originalName,
              duration: clip.duration,
              trimStart: clip.trimStart,
              trimEnd: clip.trimEnd,
              base64: buf.toString('base64')
            });
          }
        } catch {}
      }

      // Limpar frames temp
      for (const clip of meta.clips) {
        try { await fs.unlink(resolve(dir, `aiedit_frame_${clip.id}.jpg`)); } catch {}
      }

      if (!GEMINI_API_KEY || GEMINI_API_KEY === 'sua_chave_aqui') {
        // Sem API — gerar sugestões heurísticas simples
        const sugestoes = meta.clips.map((clip, i) => {
          const dur = clip.duration;
          // Heurística: cortar 10% do início e 10% do fim
          const sugTrimStart = Math.round(dur * 0.1 * 10) / 10;
          const sugTrimEnd = Math.round(dur * 0.9 * 10) / 10;
          return {
            clipId: clip.id,
            clipNum: i + 1,
            nome: clip.originalName,
            trimStart: sugTrimStart,
            trimEnd: sugTrimEnd,
            volume: 1.0,
            speed: 1.0,
            ordem: i,
            motivo: `Corte sugerido: remover ${sugTrimStart.toFixed(1)}s do início e ${(dur - sugTrimEnd).toFixed(1)}s do fim`
          };
        });
        return res.json({ sugestoes, usouIA: false, mensagem: 'Sugestões heurísticas (sem chave Gemini configurada)' });
      }

      // Com Gemini Vision — análise real
      console.log(`🤖 AI Edit: Analisando ${frameData.length} clipes...`);

      const parts = [];
      for (const fd of frameData) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: fd.base64 } });
        parts.push({ text: `[Clipe ${fd.clipNum}: "${fd.name}" | Duração total: ${fd.duration.toFixed(1)}s | Trim atual: ${fd.trimStart.toFixed(1)}s → ${fd.trimEnd.toFixed(1)}s]` });
      }

      parts.push({
        text: `Você é um editor de vídeo profissional com IA. Analise os frames acima e sugira a MELHOR EDIÇÃO possível para criar um vídeo ${estiloTexto}.

Para CADA clipe, retorne:
- O melhor ponto de início (trimStart) e fim (trimEnd) em segundos — foque nos momentos mais interessantes
- Volume ideal (0.0 a 2.0) — equilibre volumes entre clipes
- Velocidade ideal (0.5 a 2.0) — use slow-motion (0.5-0.8) para momentos impactantes, normal (1.0) ou acelerado (1.2-1.5) para partes menos relevantes
- Ordem sugerida — reordene se uma sequência diferente ficaria melhor
- Motivo breve da sugestão

REGRAS:
- Cada clipe deve ter no MÍNIMO 2 segundos após o trim
- Priorize os momentos visualmente mais interessantes
- Crie variação de ritmo: alterne momentos rápidos e lentos
- Considere que o vídeo final precisa fluir bem

Retorne APENAS JSON válido:
{
  "sugestoes": [
    {
      "clipId": "id_do_clip",
      "clipNum": 1,
      "nome": "nome_do_arquivo",
      "trimStart": 0.5,
      "trimEnd": 8.0,
      "volume": 1.0,
      "speed": 1.0,
      "ordem": 0,
      "motivo": "Motivo breve da edição sugerida"
    }
  ],
  "dicaGeral": "Dica geral sobre a edição do projeto"
}`
      });

      const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let result = null;

      for (const model of models) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            { contents: [{ parts }] },
            {
              headers: { 'Content-Type': 'application/json' },
              params: { key: GEMINI_API_KEY },
              timeout: 90000
            }
          );

          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            let jsonStr = text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonStr = jsonMatch[0];
            jsonStr = jsonStr.replace(/,\s*([\]\}])/g, '$1');
            result = JSON.parse(jsonStr);
            console.log(`  ✅ AI Edit (${model}): ${result.sugestoes?.length} sugestões`);
            break;
          }
        } catch (e) {
          console.warn(`  ⚠️ AI Edit ${model}: ${e.response?.status || e.message}`);
        }
      }

      if (!result || !result.sugestoes) {
        return res.status(500).json({ error: 'IA não retornou sugestões válidas' });
      }

      // Validar e sanitizar sugestões
      result.sugestoes = result.sugestoes.map(sug => {
        const clip = meta.clips.find(c => c.id === sug.clipId);
        if (!clip) return sug;
        return {
          ...sug,
          trimStart: Math.max(0, Math.min(sug.trimStart || 0, clip.duration - 2)),
          trimEnd: Math.max(2, Math.min(sug.trimEnd || clip.duration, clip.duration)),
          volume: Math.max(0, Math.min(sug.volume || 1.0, 2.0)),
          speed: Math.max(0.25, Math.min(sug.speed || 1.0, 3.0)),
          ordem: sug.ordem || 0
        };
      });

      res.json({ ...result, usouIA: true });
    } catch (e) {
      console.error('Erro AI Edit:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════
  // APLICAR sugestões de edição da IA
  // ══════════════════════════════════════════════════════
  app.post('/api/timeline/projects/:projectId/apply-ai-edit', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      const { sugestoes } = req.body;
      if (!sugestoes?.length) return res.status(400).json({ error: 'Nenhuma sugestão' });

      for (const sug of sugestoes) {
        const clip = meta.clips.find(c => c.id === sug.clipId || c.originalName === sug.clipId || c.filename === sug.clipId);
        if (!clip) continue;
        if (sug.trimStart !== undefined) clip.trimStart = sug.trimStart;
        if (sug.trimEnd !== undefined) clip.trimEnd = sug.trimEnd;
        if (sug.volume !== undefined) clip.volume = sug.volume;
        if (sug.speed !== undefined) clip.speed = sug.speed;
        if (sug.ordem !== undefined) clip.order = sug.ordem;
      }
      meta.clips.sort((a, b) => a.order - b.order);
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json(meta);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════
  // TTS: Gerar narração a partir do roteiro
  // ══════════════════════════════════════════════════════
  app.post('/api/timeline/projects/:projectId/generate-narration', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (!meta.roteiro?.cenas?.length) return res.status(400).json({ error: 'Gere o roteiro primeiro' });

      const { voz, velocidade } = req.body;
      const vozTTS = voz || 'pt-BR-AntonioNeural';
      const rate = velocidade || '+0%';

      meta.narrationStatus = 'generating';
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json({ status: 'generating', message: 'Gerando narração...' });

      // Gerar em background
      gerarNarracaoTimeline(meta, dir, metaPath, vozTTS, rate).catch(async (e) => {
        console.error('Erro gerar narração timeline:', e.message);
        meta.narrationStatus = 'error';
        meta.narrationError = e.message;
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Status da narração ─────────────────────
  app.get('/api/timeline/projects/:projectId/narration-status', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      res.json({
        status: meta.narrationStatus || 'none',
        progress: meta.narrationProgress || 0,
        narrationFile: meta.narrationFile || null,
        narrationDurations: meta.narrationDurations || null,
        error: meta.narrationError || null
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════
  // AUDIO TRACKS: Upload e gerenciamento de faixas de áudio
  // ══════════════════════════════════════════════════════
  const audioUpload = multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        const dir = resolve(TIMELINE_DIR, req.params.projectId);
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname) || '.mp3';
        cb(null, `audio_${Date.now()}_${Math.random().toString(36).slice(2, 5)}${ext}`);
      }
    }),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const audioExts = /\.(mp3|wav|ogg|aac|m4a|flac|wma)$/i;
      const audioMime = /audio\//;
      if (audioMime.test(file.mimetype) || audioExts.test(file.originalname) || file.mimetype === 'application/octet-stream') {
        cb(null, true);
      } else {
        cb(new Error(`Tipo não suportado: ${file.mimetype}`), false);
      }
    }
  });

  // Upload de faixas de áudio (música, efeitos)
  app.post('/api/timeline/projects/:projectId/audio-tracks', audioUpload.array('audios', 10), async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (!meta.audioTracks) meta.audioTracks = [];

      const newTracks = [];
      for (const file of req.files) {
        let duration = 0;
        try {
          const probe = await execAsync(`ffprobe -v quiet -print_format json -show_format "${resolve(dir, file.filename)}"`);
          const info = JSON.parse(probe.stdout);
          duration = parseFloat(info.format?.duration || 0);
        } catch {}

        newTracks.push({
          id: uuidv4(),
          filename: file.filename,
          originalName: file.originalname,
          duration,
          volume: 0.3,
          startAt: 0,
          fadeIn: 0,
          fadeOut: 2,
          loop: false,
          type: 'music',
          addedAt: new Date().toISOString()
        });
      }

      meta.audioTracks.push(...newTracks);
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json({ tracks: newTracks, total: meta.audioTracks.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Atualizar faixa de áudio (volume, posição, etc.)
  app.put('/api/timeline/projects/:projectId/audio-tracks/:trackId', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      const track = (meta.audioTracks || []).find(t => t.id === req.params.trackId);
      if (!track) return res.status(404).json({ error: 'Faixa não encontrada' });

      const { volume, startAt, fadeIn, fadeOut, loop, type } = req.body;
      if (volume !== undefined) track.volume = parseFloat(volume);
      if (startAt !== undefined) track.startAt = parseFloat(startAt);
      if (fadeIn !== undefined) track.fadeIn = parseFloat(fadeIn);
      if (fadeOut !== undefined) track.fadeOut = parseFloat(fadeOut);
      if (loop !== undefined) track.loop = !!loop;
      if (type !== undefined) track.type = type;

      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json(track);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Remover faixa de áudio
  app.delete('/api/timeline/projects/:projectId/audio-tracks/:trackId', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      const track = (meta.audioTracks || []).find(t => t.id === req.params.trackId);
      if (track) {
        try { await fs.unlink(resolve(dir, track.filename)); } catch {}
        meta.audioTracks = meta.audioTracks.filter(t => t.id !== req.params.trackId);
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      }
      res.json({ ok: true, total: meta.audioTracks?.length || 0 });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Renderizar vídeo final ─────────────────
  app.post('/api/timeline/projects/:projectId/render', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (meta.clips.length === 0) return res.status(400).json({ error: 'Sem clipes' });

      meta.status = 'rendering';
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      res.json({ status: 'rendering', message: 'Renderização iniciada' });

      // Renderizar em background
      renderTimeline(meta, dir, metaPath).catch(async (e) => {
        console.error('Erro renderizar timeline:', e.message);
        meta.status = 'error';
        meta.error = e.message;
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Status de renderização ─────────────────
  app.get('/api/timeline/projects/:projectId/status', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      res.json({
        status: meta.status,
        progress: meta.renderProgress || 0,
        outputFile: meta.outputFile || null,
        error: meta.error || null
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Servir vídeo final ─────────────────────
  app.get('/api/timeline/projects/:projectId/output', async (req, res) => {
    try {
      const dir = resolve(TIMELINE_DIR, req.params.projectId);
      const metaPath = resolve(dir, 'meta.json');
      if (!existsSync(metaPath)) return res.status(404).json({ error: 'Não encontrado' });

      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      if (!meta.outputFile) return res.status(404).json({ error: 'Vídeo ainda não renderizado' });

      const outputPath = resolve(dir, meta.outputFile);
      if (!existsSync(outputPath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

      res.sendFile(outputPath);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Listar projetos ────────────────────────
  app.get('/api/timeline/projects', async (req, res) => {
    try {
      await fs.mkdir(TIMELINE_DIR, { recursive: true });
      const entries = await fs.readdir(TIMELINE_DIR, { withFileTypes: true });
      const projects = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metaPath = resolve(TIMELINE_DIR, entry.name, 'meta.json');
          if (existsSync(metaPath)) {
            try {
              const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
              projects.push({
                id: meta.id,
                name: meta.name,
                clipCount: meta.clips?.length || 0,
                status: meta.status,
                createdAt: meta.createdAt
              });
            } catch {}
          }
        }
      }
      projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(projects);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ── Helpers ──────────────────────────────────

async function gerarRoteiroTexto(clipInfos, duracaoTotal, tom, idioma, instrucoes, apiKey) {
  const prompt = `Você é um roteirista profissional. Preciso de um roteiro para um vídeo montado com ${clipInfos.length} clipes existentes.

Clipes na sequência:
${clipInfos.map(c => `- Clipe ${c.numero}: "${c.nome}" (${c.duracao}, ${c.resolucao})`).join('\n')}

Duração total: ${duracaoTotal.toFixed(0)} segundos
Tom: ${tom}
Idioma: ${idioma}
${instrucoes ? `Instruções: ${instrucoes}` : ''}

Baseando-se nos NOMES dos arquivos e na sequência, crie um roteiro com narração para cada clipe.
A narração deve fluir naturalmente, com a duração proporcional a cada clipe.

Retorne APENAS JSON:
{
  "titulo": "Título do vídeo",
  "descricao": "Descrição curta",
  "musicaSugerida": "Gênero/mood",
  "cenas": [
    {
      "clipNum": 1,
      "narracao": "Texto narrado",
      "legendaDestaque": "Frase destaque curta",
      "transicao": "fade|cut|dissolve"
    }
  ]
}`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { contents: [{ parts: [{ text: prompt }] }] },
        {
          headers: { 'Content-Type': 'application/json' },
          params: { key: apiKey },
          timeout: 60000
        }
      );
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        let jsonStr = text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(jsonStr);
      }
    } catch (e) {
      console.warn(`  ⚠️ gerarRoteiroTexto ${model}: ${e.response?.status || e.message}`);
    }
  }

  // Fallback template
  return {
    titulo: 'Compilação de Vídeos',
    descricao: `Vídeo com ${clipInfos.length} segmentos`,
    musicaSugerida: 'Lo-fi / Ambient',
    cenas: clipInfos.map(c => ({
      clipNum: c.numero,
      narracao: `Segmento ${c.numero}: ${c.nome.replace(/\.\w+$/, '')}`,
      legendaDestaque: c.nome.replace(/\.\w+$/, ''),
      transicao: 'fade'
    }))
  };
}

// ══════════════════════════════════════════════════════
// TTS: Gerar narração via Edge TTS (gratuito)
// ══════════════════════════════════════════════════════
async function gerarNarracaoTimeline(meta, dir, metaPath, voz, rate) {
  console.log(`🎙️ Gerando narração para timeline: ${meta.id}`);
  const cenas = meta.roteiro.cenas;
  const audioFiles = [];
  const duracoes = [];

  for (let i = 0; i < cenas.length; i++) {
    const texto = cenas[i].narracao;
    if (!texto || texto.trim().length === 0) {
      // Cena sem narração → silêncio de 1s
      const silencePath = resolve(dir, `narr_${i}_silence.mp3`);
      await execAsync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -c:a libmp3lame "${silencePath}"`, { timeout: 10000 });
      audioFiles.push(silencePath);
      duracoes.push(1);
      continue;
    }

    const rawPath = resolve(dir, `narr_${i}_raw.mp3`);
    const enhancedPath = resolve(dir, `narr_${i}.mp3`);

    // Salvar texto em arquivo para evitar problemas de escape
    const txtPath = resolve(dir, `tts_${i}.txt`);
    await fs.writeFile(txtPath, texto, 'utf-8');

    // Gerar com Edge TTS via Python
    const pyScript = `
import asyncio, edge_tts, sys, pathlib
async def main():
    text = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
    communicate = edge_tts.Communicate(text=text, voice="${voz}", rate="${rate}")
    await communicate.save(sys.argv[1])
asyncio.run(main())
`.trim();

    const pyPath = resolve(dir, `tts_${i}.py`);
    await fs.writeFile(pyPath, pyScript, 'utf-8');

    try {
      await execAsync(`python "${pyPath}" "${rawPath}" "${txtPath}"`, { timeout: 60000 });
    } catch (e) {
      // Tentar com python3
      try {
        await execAsync(`python3 "${pyPath}" "${rawPath}" "${txtPath}"`, { timeout: 60000 });
      } catch (e2) {
        console.warn(`⚠️ TTS falhou cena ${i + 1}: ${e2.message}`);
        // Gerar silêncio como fallback
        await execAsync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 3 -c:a libmp3lame "${rawPath}"`, { timeout: 10000 });
      }
    }

    // Normalizar áudio (loudnorm)
    try {
      await execAsync(
        `ffmpeg -y -i "${rawPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -b:a 192k "${enhancedPath}"`,
        { timeout: 60000 }
      );
    } catch {
      // Se loudnorm falhar, copiar raw
      await fs.copyFile(rawPath, enhancedPath);
    }

    // Obter duração
    let dur = 3;
    try {
      const probe = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${enhancedPath}"`);
      dur = parseFloat(probe.stdout.trim()) || 3;
    } catch {}

    audioFiles.push(enhancedPath);
    duracoes.push(dur);

    // Limpar temp
    try { await fs.unlink(pyPath); } catch {}
    try { await fs.unlink(rawPath); } catch {}
    try { await fs.unlink(txtPath); } catch {}

    // Atualizar progresso
    meta.narrationProgress = Math.round(((i + 1) / cenas.length) * 100);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    console.log(`  🎙️ Cena ${i + 1}/${cenas.length}: ${dur.toFixed(1)}s`);
  }

  // Concatenar todas as narrações
  const concatList = resolve(dir, 'narr_concat.txt');
  await fs.writeFile(concatList, audioFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

  const narrationFile = `narration_${meta.id.slice(0, 8)}.mp3`;
  const narrationPath = resolve(dir, narrationFile);
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:a libmp3lame -b:a 192k "${narrationPath}"`,
    { timeout: 120000 }
  );

  // Limpar temp
  for (const f of audioFiles) { try { await fs.unlink(f); } catch {} }
  try { await fs.unlink(concatList); } catch {}

  // Atualizar meta
  meta.narrationFile = narrationFile;
  meta.narrationDurations = duracoes;
  meta.narrationStatus = 'done';
  meta.narrationProgress = 100;
  delete meta.narrationError;
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  // Duração total
  const totalDur = duracoes.reduce((s, d) => s + d, 0);
  console.log(`✅ Narração gerada: ${narrationFile} (${totalDur.toFixed(1)}s, ${cenas.length} cenas)`);
}

// ══════════════════════════════════════════════════════
// RENDER: Pipeline completo com narração + áudio
// ══════════════════════════════════════════════════════
async function renderTimeline(meta, dir, metaPath) {
  console.log(`🎬 Renderizando timeline: ${meta.id} (${meta.clips.length} clipes)`);

  // Limpar estado anterior
  delete meta.error;
  meta.renderProgress = 0;

  const clips = [...meta.clips].sort((a, b) => a.order - b.order);
  const hasNarration = meta.narrationFile && existsSync(resolve(dir, meta.narrationFile));
  const audioTracks = (meta.audioTracks || []).filter(t => existsSync(resolve(dir, t.filename)));
  const hasAudioTracks = audioTracks.length > 0;

  console.log(`  📊 Narração: ${hasNarration ? 'sim' : 'não'} | Áudios extras: ${audioTracks.length}`);

  // 1. Normalizar cada clipe (resolução, codec, trim)
  const normalizedList = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const inputPath = resolve(dir, clip.filename);
    const normalizedPath = resolve(dir, `norm_${i}.mp4`);

    const trimStart = clip.trimStart || 0;
    const trimEnd = clip.trimEnd || clip.duration;
    const duration = trimEnd - trimStart;
    const clipVolume = clip.volume !== undefined ? clip.volume : 1.0;
    const clipSpeed = clip.speed !== undefined ? clip.speed : 1.0;

    // Filtros de vídeo: scale + setpts para velocidade
    const vfParts = ['scale=1920:1080:force_original_aspect_ratio=decrease', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black', 'setsar=1'];
    if (clipSpeed !== 1.0) vfParts.push(`setpts=${(1 / clipSpeed).toFixed(4)}*PTS`);
    const vfStr = vfParts.join(',');

    // Filtros de áudio: volume + velocidade (atempo)
    const afParts = [`volume=${clipVolume}`, 'aresample=44100'];
    if (clipSpeed !== 1.0) {
      // atempo aceita 0.5-100, pra valores fora encadear
      let s = clipSpeed;
      while (s > 2.0) { afParts.push('atempo=2.0'); s /= 2.0; }
      while (s < 0.5) { afParts.push('atempo=0.5'); s *= 2.0; }
      afParts.push(`atempo=${s.toFixed(4)}`);
    }
    const afStr = afParts.join(',');

    // Normalizar: 1080p, 30fps, h264, aac com volume e speed
    const cmd = [
      'ffmpeg -y',
      `-ss ${trimStart}`,
      `-i "${inputPath}"`,
      `-t ${duration}`,
      `-vf "${vfStr}"`,
      '-r 30',
      '-c:v libx264 -preset fast -crf 23',
      '-c:a aac -ar 44100 -ac 2',
      `-af "${afStr}"`,
      '-shortest',
      `"${normalizedPath}"`
    ].join(' ');

    try {
      await execAsync(cmd, { timeout: 120000 });
      normalizedList.push(normalizedPath);
    } catch (e) {
      // Sem track de áudio → gerar silêncio
      const cmdNoAudio = [
        'ffmpeg -y',
        `-ss ${trimStart}`,
        `-i "${inputPath}"`,
        `-t ${duration}`,
        '-f lavfi -i anullsrc=r=44100:cl=stereo',
        `-vf "${vfStr}"`,
        '-r 30',
        '-c:v libx264 -preset fast -crf 23',
        '-c:a aac -ar 44100 -ac 2',
        '-shortest',
        `-t ${duration}`,
        `"${normalizedPath}"`
      ].join(' ');
      await execAsync(cmdNoAudio, { timeout: 120000 });
      normalizedList.push(normalizedPath);
    }

    meta.renderProgress = Math.round(((i + 1) / clips.length) * 40);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  }

  // 2. Concatenar vídeos
  const concatPath = resolve(dir, 'concat.txt');
  const concatContent = normalizedList.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(concatPath, concatContent);

  const concatVideoFile = (hasNarration || hasAudioTracks) ? `concat_video_${meta.id.slice(0, 8)}.mp4` : `output_${meta.id.slice(0, 8)}.mp4`;
  const concatVideoPath = resolve(dir, concatVideoFile);

  try {
    const concatResult = await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c copy "${concatVideoPath}"`, { timeout: 300000 });
    console.log(`  📦 Concat OK: ${concatVideoFile} (exists: ${existsSync(concatVideoPath)})`);
    if (concatResult.stderr) console.log(`  ⚠️ Concat stderr: ${concatResult.stderr.slice(-200)}`);
  } catch (concatErr) {
    console.error(`  ❌ Concat falhou: ${concatErr.message}`);
    // Tentar com re-encoding
    try {
      const reencodeCmd = `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k "${concatVideoPath}"`;
      await execAsync(reencodeCmd, { timeout: 300000 });
      console.log(`  📦 Concat (re-encode) OK: ${concatVideoFile}`);
    } catch (reErr) {
      console.error(`  ❌ Concat re-encode falhou: ${reErr.message}`);
      throw new Error('Falha ao concatenar vídeos: ' + reErr.message);
    }
  }

  meta.renderProgress = 50;
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  // 3. Se tem narração ou áudios, mixar
  let finalOutputFile = concatVideoFile;

  if (hasNarration || hasAudioTracks) {
    finalOutputFile = `output_${meta.id.slice(0, 8)}.mp4`;
    const finalOutputPath = resolve(dir, finalOutputFile);

    // Obter duração do vídeo concatenado
    let videoDuration = 0;
    try {
      const probe = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${concatVideoPath}"`);
      videoDuration = parseFloat(probe.stdout.trim()) || 0;
    } catch {}

    // Construir comando ffmpeg com múltiplos inputs e filtergraph
    const inputs = [`-i "${concatVideoPath}"`];
    let inputIdx = 1;
    const narrationIdx = hasNarration ? inputIdx++ : -1;
    const trackIdxMap = [];

    if (hasNarration) {
      inputs.push(`-i "${resolve(dir, meta.narrationFile)}"`);
    }

    for (const track of audioTracks) {
      inputs.push(`-i "${resolve(dir, track.filename)}"`);
      trackIdxMap.push(inputIdx++);
    }

    // Construir filter_complex para mixar todos os áudios
    const filters = [];
    const amixInputs = ['[0:a]']; // áudio original do vídeo

    // Narração
    if (hasNarration) {
      const narrVol = meta.narrationVolume !== undefined ? meta.narrationVolume : 1.0;
      filters.push(`[${narrationIdx}:a]volume=${narrVol}[narr]`);
      amixInputs.push('[narr]');
    }

    // Faixas de áudio (música, efeitos)
    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i];
      const idx = trackIdxMap[i];
      const vol = track.volume !== undefined ? track.volume : 0.3;
      const delay = Math.round((track.startAt || 0) * 1000); // ms

      let audioFilter = `[${idx}:a]`;
      const filterChain = [];

      // Volume
      filterChain.push(`volume=${vol}`);

      // Loop se necessário (repetir até cobrir duração do vídeo)
      if (track.loop && videoDuration > 0) {
        // Loop é aplicado antes dos filtros no input
        // Vamos usar aloop ou simplificar com atrim
      }

      // Fade in/out
      if (track.fadeIn > 0) {
        filterChain.push(`afade=t=in:st=0:d=${track.fadeIn}`);
      }
      if (track.fadeOut > 0 && videoDuration > 0) {
        const fadeStart = Math.max(0, videoDuration - track.fadeOut - (track.startAt || 0));
        filterChain.push(`afade=t=out:st=${fadeStart}:d=${track.fadeOut}`);
      }

      // Delay (posição na timeline)
      if (delay > 0) {
        filterChain.push(`adelay=${delay}|${delay}`);
      }

      // Truncar na duração do vídeo
      if (videoDuration > 0) {
        filterChain.push(`atrim=0:${videoDuration}`);
        filterChain.push('asetpts=PTS-STARTPTS');
      }

      const label = `aud${i}`;
      filters.push(`${audioFilter}${filterChain.join(',')}[${label}]`);
      amixInputs.push(`[${label}]`);
    }

    // Amix
    const mixCount = amixInputs.length;
    const amixLabel = 'mixout';
    filters.push(`${amixInputs.join('')}amix=inputs=${mixCount}:duration=first:dropout_transition=2[${amixLabel}]`);

    const filterComplex = filters.join(';');

    const mixCmd = [
      'ffmpeg -y',
      ...inputs,
      `-filter_complex "${filterComplex}"`,
      '-map 0:v',
      `-map [${amixLabel}]`,
      '-c:v copy',
      '-c:a aac -b:a 192k',
      '-shortest',
      `"${finalOutputPath}"`
    ].join(' ');

    meta.renderProgress = 70;
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

    console.log(`  🔊 Mixando ${mixCount} faixas de áudio...`);
    console.log(`  📝 Filter: ${filterComplex}`);
    try {
      await execAsync(mixCmd, { timeout: 300000 });
      console.log(`  ✅ Mix concluído`);
    } catch (e) {
      // No Windows, ffmpeg pode retornar exit code 1 mesmo quando gera output
      if (existsSync(finalOutputPath)) {
        const stat = await fs.stat(finalOutputPath);
        if (stat.size > 10000) {
          console.log(`  ⚠️ Mix retornou erro mas output existe (${stat.size} bytes) - considerando sucesso`);
        } else {
          console.error('Erro mixando áudios (output inválido):', e.message);
          // Fallback: usar vídeo sem mix
          try {
            if (concatVideoFile !== finalOutputFile && existsSync(concatVideoPath)) {
              await fs.copyFile(concatVideoPath, finalOutputPath);
              console.log('  ⚠️ Usando vídeo sem mix de áudio (fallback)');
            }
          } catch (copyErr) {
            console.error('  ❌ Fallback copyFile também falhou:', copyErr.message);
          }
        }
      } else {
        console.error('Erro mixando áudios:', e.message);
        try {
          if (concatVideoFile !== finalOutputFile && existsSync(concatVideoPath)) {
            await fs.copyFile(concatVideoPath, finalOutputPath);
            console.log('  ⚠️ Usando vídeo sem mix de áudio (fallback)');
          }
        } catch (copyErr) {
          console.error('  ❌ Fallback também falhou:', copyErr.message);
        }
      }
    }

    // Limpar vídeo intermediário
    if (concatVideoFile !== finalOutputFile && existsSync(concatVideoPath)) {
      try { await fs.unlink(concatVideoPath); } catch {}
    }
  }

  meta.renderProgress = 90;
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  // 4. Limpar temp
  for (const f of normalizedList) {
    try { await fs.unlink(f); } catch {}
  }
  try { await fs.unlink(concatPath); } catch {}

  meta.renderProgress = 100;
  meta.status = 'done';
  meta.outputFile = finalOutputFile;

  // Obter duração final
  try {
    const probe = await execAsync(`ffprobe -v quiet -print_format json -show_format "${resolve(dir, finalOutputFile)}"`);
    const info = JSON.parse(probe.stdout);
    meta.outputDuration = parseFloat(info.format?.duration || 0);
    meta.outputSize = parseInt(info.format?.size || 0);
  } catch {}

  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  console.log(`✅ Timeline renderizada: ${finalOutputFile}`);
}
