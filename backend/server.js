import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve, basename } from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import cron from 'node-cron';
import { createHmac } from 'crypto';

// News module imports
import { coletarNoticias, selecionarTopNoticias, listarFontes, criarFonte, atualizarFonte, deletarFonte, listarNoticias, getConfig as getNewsConfig, updateConfig as updateNewsConfig } from './news/collector.js';
import { executarPipelineNoticias, listarNewsVideos, getNewsVideo, newsVideosStatus, setPublicarYoutubeFn, retryNewsVideo } from './news/pipeline.js';
import newsPool from './news/db.js';

// Gerador de roteiro offline (zero APIs, zero tokens)
import { gerarRoteiroDark, HISTORIAS_DARK } from './roteiro-offline-dark.js';

// Auth + Hotmart + Admin
import { authMiddleware, loginUsuario, criarUsuario, buscarUsuarioPorEmail, hashSenha, gerarToken } from './auth.js';
import { registrarRotasHotmart } from './hotmart.js';
import { registrarRotasAdmin } from './admin.js';
import { registrarRotasUserSettings } from './user-settings.js';
import { registrarRotasSocialOAuth } from './social-oauth.js';
import { registrarRotasFeedback } from './feedback.js';
import { registrarRotasTimeline } from './timeline.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env — prioriza __dirname/backend, depois cwd (para executável empacotado)
const envFilePath = existsSync(resolve(__dirname, '.env'))
  ? resolve(__dirname, '.env')
  : resolve(process.cwd(), '.env');
dotenv.config({ path: envFilePath });
console.log(`📄 .env carregado de: ${envFilePath}`);

// Encontrar caminho do Docker (resolve PATH em Windows/Linux/macOS)
function findDockerPath() {
  // Locations comuns do Docker por plataforma
  const candidates = process.platform === 'win32'
    ? [
        'docker',
        'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
        'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe',
        `${process.env.LOCALAPPDATA || ''}\\Docker\\Docker\\resources\\bin\\docker.exe`,
        `${process.env.ProgramFiles || 'C:\\Program Files'}\\Docker\\Docker\\resources\\bin\\docker.exe`,
      ]
    : [
        'docker',
        '/usr/bin/docker',
        '/usr/local/bin/docker',
        '/snap/bin/docker',
        '/opt/homebrew/bin/docker',
      ];
  
  for (const candidate of candidates) {
    try {
      if (!candidate) continue;
      execSync(`"${candidate}" --version`, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`🐳 Docker encontrado: ${candidate}`);
      return candidate;
    } catch {}
  }
  console.warn('⚠️  Docker não encontrado no PATH. Funcionalidades de TTS e renderização não funcionarão.');
  return 'docker'; // fallback
}

const DOCKER_CMD = findDockerPath();

// Modo sem Docker (Railway/cloud): define NO_DOCKER=true para rodar Python/FFmpeg diretamente
const NO_DOCKER = process.env.NO_DOCKER === 'true';
if (NO_DOCKER) console.log('☁️  Modo NO_DOCKER ativo — Python/FFmpeg executados diretamente');

// Helper: monta comando para executar dentro do container OU diretamente
// Em modo NO_DOCKER, containerCmd deve usar /media/xxx — o Railway expõe MEDIA_DIR em /media
function makeExecCmd(containerCmd) {
  if (NO_DOCKER) return containerCmd;
  return `"${DOCKER_CMD}" exec videoforge-python-worker ${containerCmd}`;
}

// Caminhos - detectar diretório de mídia montado pelo Docker
function detectDockerMediaPath() {
  if (NO_DOCKER) return null;
  try {
    const result = execSync(
      `"${DOCKER_CMD}" inspect videoforge-python-worker --format "{{json .Mounts}}"`,
      { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const mounts = JSON.parse(result.trim());
    const mediaMount = mounts.find(m => m.Destination === '/media');
    if (mediaMount && mediaMount.Source && existsSync(mediaMount.Source)) {
      console.log(`🐳 Docker media mount detectado: ${mediaMount.Source}`);
      return mediaMount.Source;
    }
  } catch {}
  return null;
}

const MEDIA_DIR = process.env.MEDIA_DIR        // passado explicitamente pelo Electron ou Railway
  || (NO_DOCKER ? '/media'                      // Railway: usa /media diretamente
  : (process.env.ELECTRON_RUN
    ? (detectDockerMediaPath() || resolve(process.cwd(), 'media'))
    : resolve(__dirname, '..', 'media')));
console.log(`📂 MEDIA_DIR: ${MEDIA_DIR}`);

const app = express();
const PORT = process.env.PORT || 3001;
const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// CORS: em produção (NO_DOCKER/Railway), aceita o frontend do Vercel e qualquer localhost
const ALLOWED_ORIGIN = process.env.FRONTEND_URL; // ex: https://videoforge-app.vercel.app
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // requests sem origin (Electron, curl, etc.)
    if (!ALLOWED_ORIGIN) return callback(null, true); // sem restrição quando não configurado
    if (origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// ============================================
// AUTH: Rotas de login/registro (ANTES do middleware)
// ============================================
const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false'; // ativo por padrão

app.post('/api/auth/login', async (req, res) => {
  try {
    // Bypass login quando auth desativado (dev local)
    if (!AUTH_ENABLED) {
      return res.json({
        token: 'dev-token-local',
        user: { id: 'dev-user', email: 'dev@local', nome: 'Dev Local', plano: 'vitalicio', ativo: true, is_admin: true, videos_mes_limite: 999, videos_mes_usados: 0 }
      });
    }
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatórios' });
    const result = await loginUsuario(email, senha);
    if (result.error) return res.status(401).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('Erro login:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, senha, nome } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha obrigatórios' });
    if (senha.length < 6) return res.status(400).json({ error: 'Senha mínima: 6 caracteres' });
    
    const existe = await buscarUsuarioPorEmail(email);
    if (existe) return res.status(409).json({ error: 'Email já cadastrado' });
    
    const user = await criarUsuario({ email, senha, nome, plano: 'vitalicio' });
    const token = gerarToken({ id: user.id, email: user.email, plano: user.plano });
    
    res.json({
      token,
      user: {
        id: user.id, email: user.email, nome: user.nome,
        plano: user.plano, ativo: user.ativo,
        videos_mes_limite: user.videos_mes_limite,
        videos_mes_usados: user.videos_mes_usados,
      }
    });
  } catch (e) {
    console.error('Erro register:', e.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    // Bypass completo quando auth desativado (dev local sem Postgres)
    if (!AUTH_ENABLED) {
      return res.json({
        id: 'dev-user', email: 'dev@local', nome: 'Dev Local',
        plano: 'vitalicio', ativo: true, is_admin: true,
        videos_mes_limite: 999, videos_mes_usados: 0,
      });
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });
    
    const { verificarToken } = await import('./auth.js');
    const payload = verificarToken(token);
    if (!payload) return res.status(401).json({ error: 'Token inválido' });
    
    const user = await buscarUsuarioPorEmail(payload.email);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    res.json({
      id: user.id, email: user.email, nome: user.nome,
      plano: user.plano, ativo: user.ativo,
      is_admin: user.is_admin || false,
      videos_mes_limite: user.videos_mes_limite,
      videos_mes_usados: user.videos_mes_usados,
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Hotmart webhooks (antes do middleware para não exigir auth)
registrarRotasHotmart(app);

// Admin routes (verificação de admin é interna)
registrarRotasAdmin(app);

// User settings routes (API keys + social per user)
registrarRotasUserSettings(app);

// OAuth social simplificado (click-to-connect per user)
registrarRotasSocialOAuth(app);

// Feedback / Muro de sugestões
registrarRotasFeedback(app);

// Auth middleware (protege rotas /api/* exceto as públicas)
if (AUTH_ENABLED) {
  app.use(authMiddleware);
  console.log('🔐 Auth ativado — rotas protegidas por JWT');
} else {
  console.log('🔓 Auth desativado (AUTH_ENABLED=false)');
}

// Timeline / Editor de vídeos (após auth — rotas protegidas)
registrarRotasTimeline(app);

// Servir frontend estático (quando build existe)
const FRONTEND_DIST = resolve(__dirname, '..', 'frontend', 'dist');
const FRONTEND_DIST_ALT = resolve(__dirname, 'public'); // Para executável empacotado
const frontendPath = existsSync(FRONTEND_DIST) ? FRONTEND_DIST : existsSync(FRONTEND_DIST_ALT) ? FRONTEND_DIST_ALT : null;
if (frontendPath) {
  app.use(express.static(frontendPath));
  console.log(`📦 Frontend servido de: ${frontendPath}`);
}

// Servir arquivos de mídia
app.use('/media', express.static(MEDIA_DIR));

// Armazenamento simples em memória
const videos = new Map();

// Helper: registra etapa com timestamp no log do vídeo
function logStep(video, msg) {
  const ts = new Date().toISOString();
  video.etapa = msg;
  if (!video.logEtapas) video.logEtapas = [];
  video.logEtapas.push({ ts, msg });
  console.log(`  [${video.id}] ${msg}`);
}
const youtubeTokens = new Map();
const socialTokens = new Map(); // Redes sociais conectadas
let youtubeChannels = []; // Canais da conta YouTube
let youtubeSelectedChannel = null; // Canal selecionado

// Persistir tokens YouTube em arquivo para sobreviver a reinicializações
const YOUTUBE_TOKEN_FILE = resolve(MEDIA_DIR, '.youtube_tokens.json');
async function salvarTokensYoutube() {
  try {
    const data = {
      tokens: youtubeTokens.has('default') ? youtubeTokens.get('default') : null,
      channels: youtubeChannels,
      selectedChannel: youtubeSelectedChannel
    };
    await fs.writeFile(YOUTUBE_TOKEN_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) { console.error('Erro ao salvar tokens YouTube:', e.message); }
}
async function carregarTokensYoutube() {
  try {
    const raw = await fs.readFile(YOUTUBE_TOKEN_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (data.tokens) {
      youtubeTokens.set('default', data.tokens);
      oauth2Client.setCredentials(data.tokens);
      console.log('📺 Tokens YouTube restaurados do disco');
    }
    if (data.channels) youtubeChannels = data.channels;
    if (data.selectedChannel) youtubeSelectedChannel = data.selectedChannel;
  } catch (e) { /* arquivo não existe ainda, normal */ }
}
// Carregar tokens ao iniciar (será chamado após oauth2Client estar pronto)
setTimeout(() => carregarTokensYoutube(), 100);

// Redes sociais suportadas
const SOCIAL_NETWORKS = {
  twitter: {
    name: 'Twitter / X',
    icon: '🐦',
    color: '#1DA1F2',
    shareBaseUrl: 'https://twitter.com/intent/tweet',
    configured: () => !!(process.env.TWITTER_CLIENT_ID || process.env.TWITTER_BEARER_TOKEN),
    connected: () => socialTokens.has('twitter') || !!process.env.TWITTER_BEARER_TOKEN
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    shareBaseUrl: 'https://www.facebook.com/sharer/sharer.php',
    configured: () => !!process.env.FACEBOOK_APP_ID,
    connected: () => socialTokens.has('facebook')
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    shareBaseUrl: 'https://www.linkedin.com/sharing/share-offsite/',
    configured: () => !!process.env.LINKEDIN_CLIENT_ID,
    connected: () => socialTokens.has('linkedin')
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#010101',
    shareBaseUrl: null,
    configured: () => !!process.env.TIKTOK_CLIENT_KEY,
    connected: () => socialTokens.has('tiktok')
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: '#E4405F',
    shareBaseUrl: null,
    configured: () => !!process.env.FACEBOOK_APP_ID, // Usa API do Facebook
    connected: () => socialTokens.has('instagram')
  }
};

// CONFIGURAÇÃO YOUTUBE OAUTH
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

// ============================================
// ROTA: Criar novo vídeo (pipeline completo)
// ============================================
// Rota manual — usa roteiro fornecido pelo usuário, pula o Gemini
app.post('/api/videos/manual', async (req, res) => {
  try {
    const { titulo, tipoVideo, publicarYoutube, texto } = req.body;
    if (!titulo?.trim()) return res.status(400).json({ error: 'Título obrigatório' });
    if (!texto?.trim()) return res.status(400).json({ error: 'Roteiro (texto) obrigatório' });

    // Cada parágrafo separado por linha em branco = uma cena
    const paragrafos = texto.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 10);
    if (paragrafos.length < 1) return res.status(400).json({ error: 'Roteiro muito curto. Separe as cenas com linha em branco.' });

    const roteiro = {
      titulo: titulo.trim(),
      descricao: `${titulo.trim()} — vídeo criado com roteiro manual no VideoForge.`,
      tags: ['videoforge', 'animação', tipoVideo],
      thumbnail_prompt: `${titulo.trim()}, eye-catching, dramatic`,
      cenas: paragrafos.map((texto_narracao, i) => ({
        numero: i + 1,
        texto_narracao,
        prompt_visual: `scene ${i + 1}: ${titulo}`,
        duracao_estimada: Math.max(10, Math.round(texto_narracao.split(' ').length / 2.5))
      }))
    };

    const videoId = uuidv4().split('-')[0];
    const video = {
      id: videoId,
      titulo: titulo.trim(),
      nicho: 'geral',
      duracao: Math.round(roteiro.cenas.reduce((s, c) => s + c.duracao_estimada, 0) / 60),
      detalhes: '',
      publicarYoutube: publicarYoutube || false,
      tipoVideo: tipoVideo || 'stickAnimation',
      status: 'iniciando',
      progresso: 0,
      etapa: 'Iniciando com roteiro manual...',
      logEtapas: [{ ts: new Date().toISOString(), msg: 'Iniciando com roteiro manual...' }],
      criado_em: new Date().toISOString(),
      roteiro: null, audioUrl: null, videoUrl: null, youtubeId: null
    };

    videos.set(videoId, video);

    const processarManual = async () => {
      try {
        video.roteiro = roteiro;
        video.status = 'gerando_narracao';
        video.progresso = 25;
        logStep(video, `✅ Roteiro carregado (${roteiro.cenas.length} cenas). Gerando narração...`);

        const audioPaths = await gerarNarracao(videoId, roteiro);
        video.audioUrl = audioPaths.host;
        video.progresso = 45;
        logStep(video, '🎙️ Narração gerada! Iniciando visuais...');

        if (video.tipoVideo === 'stickAnimation') {
          video.status = 'gerando_animacao';
          logStep(video, '🎨 Gerando código de animação com IA...');
          const cenasCodigo = await gerarCodigoAnimacao(videoId, roteiro);
          video.progresso = 65;
          logStep(video, '🎬 Renderizando animações com Remotion...');
          video.status = 'renderizando';
          const videoPaths = await renderizarAnimacaoRemotion(videoId, cenasCodigo, audioPaths);
          video.videoUrl = videoPaths.host;
        } else if (video.tipoVideo === 'darkStickman') {
          video.status = 'gerando_dark';
          logStep(video, '🖤 Criando cenas dark com texto animado...');
          const videoPaths = await gerarVideoDarkStickman(videoId, roteiro, audioPaths);
          video.videoUrl = videoPaths.host;
        } else if (video.tipoVideo === 'geminiVeoGeneration') {
          video.status = 'gerando_gemini_veo';
          logStep(video, '🎬 Gerando vídeo com Gemini Veo...');
          let videoPaths;
          try {
            videoPaths = await gerarVideoGeminiVeo(videoId, roteiro, audioPaths);
          } catch (veoErr) {
            const isUnavailable = veoErr.message.includes('billing') || veoErr.message.includes('FAILED_PRECONDITION') || veoErr.message.includes('Nenhuma cena');
            if (isUnavailable) {
              logStep(video, '⚠️ Gemini Veo indisponível (requer GCP billing). Usando imagens Pexels como alternativa...');
              video.status = 'buscando_visuais';
              const visuais = await buscarVisuais(roteiro.cenas);
              video.progresso = 65;
              video.status = 'renderizando';
              logStep(video, '🎬 Renderizando vídeo com imagens (fallback)...');
              videoPaths = await renderizarVideo(videoId, roteiro, audioPaths, visuais);
            } else {
              throw veoErr;
            }
          }
          video.videoUrl = videoPaths.host;
        } else if (video.tipoVideo === 'veoGeneration') {
          video.status = 'gerando_veo';
          logStep(video, '🎬 Gerando vídeo com Veo 3 (Google Vertex)...');
          const videoPaths = await gerarVideoVeo(videoId, roteiro, audioPaths);
          video.videoUrl = videoPaths.host;
        } else if (video.tipoVideo === 'replicateGeneration') {
          video.status = 'gerando_replicate';
          logStep(video, '🤖 Gerando vídeo com Replicate/Wan 2.1...');
          const videoPaths = await gerarVideoReplicate(videoId, roteiro, audioPaths);
          video.videoUrl = videoPaths.host;
        } else if (video.tipoVideo === 'klingGeneration') {
          video.status = 'gerando_kling';
          logStep(video, '🎥 Gerando vídeo com Kling AI...');
          const videoPaths = await gerarVideoKling(videoId, roteiro, audioPaths);
          video.videoUrl = videoPaths.host;
        } else {
          video.status = 'buscando_visuais';
          logStep(video, '🖼️ Buscando imagens stock...');
          const visuais = await buscarVisuais(roteiro.cenas);
          video.progresso = 65;
          video.status = 'renderizando';
          logStep(video, '🎬 Renderizando vídeo com imagens...');
          const videoPaths = await renderizarVideo(videoId, roteiro, audioPaths, visuais);
          video.videoUrl = videoPaths.host;
        }

        video.progresso = 90;
        video.status = 'finalizando';
        logStep(video, '✨ Finalizando vídeo...');
        video.progresso = 95;

        if (video.publicarYoutube) {
          logStep(video, '📺 Publicando no YouTube...');
          const videoPaths = { host: video.videoUrl };
          const youtubeId = await publicarNoYoutube(videoId, videoPaths, roteiro);
          video.youtubeId = youtubeId;
          logStep(video, `🎉 Publicado no YouTube! ID: ${youtubeId}`);
        }

        video.status = 'pronto';
        video.progresso = 100;
        logStep(video, '✅ Vídeo pronto!');
      } catch (err) {
        video.status = 'erro';
        logStep(video, `❌ Erro: ${err.message}`);
        console.error('Erro no pipeline manual:', err);
      }
    };

    processarManual();
    res.json({ success: true, videoId, message: `Vídeo iniciado com ${roteiro.cenas.length} cenas!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota demo — cria vídeo de exemplo sem chamar o Gemini (para testar qualidade)
app.post('/api/videos/demo', async (req, res) => {
  try {
    const videoId = uuidv4().split('-')[0];
    const video = {
      id: videoId,
      titulo: 'A Jornada do Palitinho Astronauta',
      nicho: 'curiosidades',
      duracao: 5,
      detalhes: '',
      publicarYoutube: false,
      tipoVideo: 'stickAnimation',
      status: 'iniciando',
      progresso: 0,
      etapa: 'Iniciando pipeline demo...',
      logEtapas: [{ ts: new Date().toISOString(), msg: '🎭 Iniciando vídeo demo...' }],
      criado_em: new Date().toISOString(),
      roteiro: null,
      audioUrl: null,
      videoUrl: null,
      youtubeId: null
    };

    const roteiro = {
      titulo: 'A Jornada do Palitinho Astronauta',
      descricao: 'Um palitinho sonha em ir ao espaço e descobre que o maior obstáculo era acreditar em si mesmo.',
      tags: ['palitinho', 'animação', 'espaço', 'motivação', 'stickman'],
      thumbnail_prompt: 'stick figure astronaut floating in space, minimalist, funny',
      cenas: [
        {
          numero: 1,
          texto_narracao: 'Era uma vez um pequeno palitinho chamado João. Ele vivia numa cidade comum, fazia coisas comuns, e sonhava com algo completamente incomum. Todo dia, João olhava para o céu e imaginava: e se eu pudesse chegar até as estrelas? Os outros palitinhos achavam que ele era louco. Mas João não ligava.',
          prompt_visual: 'stick figure looking up at stars in the night sky',
          duracao_estimada: 20
        },
        {
          numero: 2,
          texto_narracao: 'João começou a estudar. Acordava cedo, dormia tarde, e enchia caderno após caderno com fórmulas e desenhos de foguetes. Seus amigos riam e diziam: "Palitinho não vai ao espaço!" Mas ele continuava. Cada risada virava combustível para o seu sonho.',
          prompt_visual: 'stick figure studying at desk with books and papers',
          duracao_estimada: 20
        },
        {
          numero: 3,
          texto_narracao: 'Depois de muitos anos de treino e dedicação, o grande dia chegou. João estava dentro do foguete, coração acelerado, mãos tremendo. A contagem regressiva começou: dez, nove, oito... Os motores rugiam feito trovão. Sete, seis, cinco... O chão vibrava sob o foguete.',
          prompt_visual: 'stick figure inside rocket cockpit ready for launch',
          duracao_estimada: 20
        },
        {
          numero: 4,
          texto_narracao: 'Quatro, três, dois, UM! DECOLAGEM! O foguete cortou o céu como uma flecha de fogo. João foi rasgando a atmosfera, deixando as nuvens para trás, até que tudo ficou silencioso e escuro. Ele estava no espaço. Lágrimas flutuaram pelo capacete.',
          prompt_visual: 'rocket launching into space with fire and smoke trail',
          duracao_estimada: 20
        },
        {
          numero: 5,
          texto_narracao: 'Lá do alto, João podia ver o planeta inteiro. Pequenino, azul, perfeito. E pensou em todos os outros palitinhos que tinham rido. Não com raiva, mas com carinho. Porque agora ele entendia: o espaço não era o destino. A jornada era. E a jornada começava sempre com um único passo.',
          prompt_visual: 'view of Earth from space, blue planet, astronaut floating',
          duracao_estimada: 20
        },
        {
          numero: 6,
          texto_narracao: 'Ao voltar para casa, João virou professor. Ensinou outros palitinhos que sonhos não têm tamanho, mas exigem coragem. E toda vez que um aluno dizia "eu não consigo", João sorria e apontava para o céu. A história do palitinho astronauta provou que o único limite que existe está na nossa cabeça.',
          prompt_visual: 'stick figure teacher with students in classroom, space posters',
          duracao_estimada: 20
        }
      ]
    };

    videos.set(videoId, video);

    // Pular geração de roteiro — usar diretamente o roteiro pré-pronto
    const processarDemo = async () => {
      try {
        video.roteiro = roteiro;
        video.status = 'gerando_narracao';
        video.progresso = 25;
        logStep(video, `✅ Roteiro demo pronto (${roteiro.cenas.length} cenas). Gerando narração...`);

        const audioPaths = await gerarNarracao(videoId, roteiro);
        video.audioUrl = audioPaths.host;
        video.progresso = 45;
        logStep(video, '🎙️ Narração gerada! Gerando animações...');

        video.status = 'gerando_animacao';
        logStep(video, '🎨 Gerando código de animação com IA...');
        const cenasCodigo = await gerarCodigoAnimacao(videoId, roteiro);
        video.progresso = 65;

        logStep(video, '🎬 Renderizando animações com Remotion...');
        video.status = 'renderizando';
        const videoPaths = await renderizarAnimacaoRemotion(videoId, cenasCodigo, audioPaths);
        video.videoUrl = videoPaths.host;
        video.progresso = 90;

        video.status = 'finalizando';
        logStep(video, '✨ Finalizando...');
        video.progresso = 95;

        video.status = 'pronto';
        video.progresso = 100;
        logStep(video, '✅ Vídeo demo pronto!');
      } catch (err) {
        video.status = 'erro';
        logStep(video, `❌ Erro: ${err.message}`);
        console.error('Erro no pipeline demo:', err);
      }
    };

    processarDemo();

    res.json({ success: true, videoId, message: 'Vídeo demo iniciado!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/videos', async (req, res) => {
  try {
    const { titulo, nicho, duracao, detalhes, publicarYoutube, tipoVideo } = req.body;
    
    console.log(`📋 Novo vídeo recebido - tipoVideo: ${tipoVideo || 'NÃO DEFINIDO'}`);
    
    const videoId = uuidv4().split('-')[0];
    
    const video = {
      id: videoId,
      titulo: titulo || 'Sem título',
      nicho: nicho || 'geral',
      duracao: duracao || 10,
      detalhes: detalhes || '',
      publicarYoutube: publicarYoutube || false,
      tipoVideo: tipoVideo || 'stockImages', // 'stockImages' ou 'stickAnimation'
      status: 'iniciando',
      progresso: 0,
      etapa: 'Iniciando pipeline...',
      logEtapas: [{ ts: new Date().toISOString(), msg: '🚀 Pipeline iniciado...' }],
      criado_em: new Date().toISOString(),
      roteiro: null,
      audioUrl: null,
      videoUrl: null,
      youtubeId: null
    };
    
    videos.set(videoId, video);
    
    // Disparar pipeline assíncrono
    processarVideoCompleto(videoId, video).catch(err => {
      console.error(`Erro ao processar vídeo ${videoId}:`, err);
      video.status = 'erro';
      video.etapa = `Erro: ${err.message}`;
    });
    
    res.json({
      success: true,
      videoId,
      message: 'Vídeo criado! Pipeline iniciado.'
    });
    
  } catch (error) {
    console.error('Erro ao criar vídeo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PIPELINE COMPLETO
// ============================================
async function processarVideoCompleto(videoId, video) {
  try {
    // ETAPA 1: Gerar Roteiro
    video.status = 'gerando_roteiro';
    video.progresso = 10;
    
    let roteiro;
    
    // Dark Stickman usa gerador offline (zero tokens, zero API)
    if (video.tipoVideo === 'darkStickman') {
      logStep(video, '📝 Gerando roteiro dark offline (zero APIs)...');
      const temaDetectado = video.titulo.toLowerCase().includes('roanoke') ||
                            video.titulo.toLowerCase().includes('croatoan') ||
                            video.detalhes.toLowerCase().includes('roanoke')
                            ? 'roanoke'
                            : video.titulo;
      roteiro = gerarRoteiroDark(temaDetectado, video.duracao, video.detalhes);
    } else if (video.tipoVideo === 'didAvatar') {
      // D-ID Avatar: NÃO usar Gemini para expandir em cenas múltiplas
      // O áudio deve ser curto (D-ID tem limite de ~10MB / ~2 min de áudio)
      // Usar o texto de `detalhes` diretamente como narração única
      logStep(video, '📝 Preparando roteiro simples para D-ID Avatar...');
      const textoNarracao = video.detalhes?.trim() || video.titulo;
      roteiro = {
        titulo: video.titulo,
        nicho: video.nicho || 'geral',
        duracao_total: video.duracao || 1,
        cenas: [{
          numero: 1,
          texto_narracao: textoNarracao,
          descricao_visual: 'Apresentador falando para câmera',
          prompt_visual: 'person speaking to camera',
          duracao: Math.min(video.duracao || 1, 2) // max 2 min para D-ID
        }]
      };
    } else {
      logStep(video, '🤖 Gerando roteiro com Gemini AI...');
      roteiro = await gerarRoteiro({
        nicho: video.nicho,
        topico: video.titulo,
        duracao: video.duracao,
        detalhes: video.detalhes
      });
    }
    
    video.roteiro = roteiro;
    video.progresso = 25;
    logStep(video, `✅ Roteiro gerado! ${roteiro.cenas.length} cenas • ${roteiro.titulo}`);
    
    // ETAPA 2: Gerar Narração (TTS)
    video.status = 'gerando_narracao';
    const ttsProviderAtivo = process.env.ELEVENLABS_API_KEY ? 'ElevenLabs 🟡'
      : process.env.OPENAI_API_KEY ? 'OpenAI TTS 🟡'
      : 'Edge TTS 🟢';
    logStep(video, `🎙️ Gerando narração (${ttsProviderAtivo})...`);
    const audioPaths = await gerarNarracao(videoId, roteiro);
    video.audioUrl = audioPaths.host;
    video.progresso = 40;
    logStep(video, '🎙️ Narração criada!');

    // ETAPA 2.5: Legendas automáticas com Whisper (GRÁTIS - não bloqueia)
    video.status = 'gerando_legendas';
    logStep(video, '💬 Gerando legendas automáticas (Whisper)...');
    const subtitlePaths = await gerarSubtitulos(videoId, audioPaths);
    video.subtitlePath = subtitlePaths?.host || null;
    if (subtitlePaths) logStep(video, '💬 Legendas geradas!');
    video.progresso = 45;

    // ETAPA 3 e 4: Visuais + Renderização (depende do tipo)
    if (video.tipoVideo === 'didAvatar') {
      video.status = 'gerando_avatar';
      video.progresso = 50;
      logStep(video, '🎭 Gerando vídeo com avatar D-ID (PAGO)...');
      const videoPaths = await gerarVideoAvatar(videoId, roteiro, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;

    } else if (video.tipoVideo === 'veoGeneration') {
      video.status = 'gerando_veo';
      video.progresso = 50;
      logStep(video, '🎬 Gerando vídeo com Veo 3 (Google Vertex)...');
      const videoPaths = await gerarVideoVeo(videoId, roteiro, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'replicateGeneration') {
      video.status = 'gerando_replicate';
      video.progresso = 50;
      logStep(video, '🤖 Gerando vídeo com Replicate/Wan 2.1...');
      const videoPaths = await gerarVideoReplicate(videoId, roteiro, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'klingGeneration') {
      video.status = 'gerando_kling';
      video.progresso = 50;
      logStep(video, '🎥 Gerando vídeo com Kling AI...');
      const videoPaths = await gerarVideoKling(videoId, roteiro, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'huggingfaceGeneration') {
      video.status = 'gerando_huggingface';
      video.progresso = 50;
      logStep(video, '🧠 Gerando vídeo com Hugging Face...');
      const videoPaths = await gerarVideoHuggingFace(videoId, roteiro, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'geminiVeoGeneration') {
      video.status = 'gerando_gemini_veo';
      video.progresso = 50;
      logStep(video, '🎬 Gerando vídeo com Gemini Veo...');
      let videoPaths;
      try {
        videoPaths = await gerarVideoGeminiVeo(videoId, roteiro, audioPaths);
      } catch (veoErr) {
        const isUnavailable = veoErr.message.includes('billing') || veoErr.message.includes('FAILED_PRECONDITION') || veoErr.message.includes('Nenhuma cena');
        if (isUnavailable) {
          logStep(video, '⚠️ Gemini Veo indisponível (requer GCP billing). Usando imagens Pexels como alternativa...');
          video.status = 'buscando_visuais';
          const visuais = await buscarVisuais(roteiro.cenas);
          video.progresso = 65;
          video.status = 'renderizando';
          logStep(video, '🎬 Renderizando vídeo com imagens (fallback)...');
          videoPaths = await renderizarVideo(videoId, roteiro, audioPaths, visuais);
        } else {
          throw veoErr;
        }
      }
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'aiImageGeneration') {
      video.status = 'gerando_imagens_ia';
      video.progresso = 50;
      // Usar Flux.1/DALL-E se disponível, senão Stable Horde/Pollinations
      let visuais;
      if (process.env.OPENAI_API_KEY) {
        logStep(video, '🎨 Gerando imagens com DALL-E 3 (OpenAI 🟡)...');
        visuais = await gerarVisuaisFlux1DALLE(roteiro.cenas, videoId, 'dalle3');
      } else if (process.env.REPLICATE_API_TOKEN) {
        logStep(video, '🎨 Gerando imagens com Flux.1 (Replicate 🟡)...');
        visuais = await gerarVisuaisFlux1DALLE(roteiro.cenas, videoId, 'flux1');
      } else {
        logStep(video, '🎨 Gerando imagens com IA (Stable Horde / Pollinations 🟢)...');
        visuais = await buscarVisuaisAI(roteiro.cenas);
      }
      video.progresso = 65;
      video.status = 'renderizando';
      logStep(video, `🎬 Renderizando vídeo com ${visuais.length} imagens IA...`);
      const videoPaths = await renderizarVideo(videoId, roteiro, audioPaths, visuais, subtitlePaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'localAIGeneration') {
      const AI_MODEL = process.env.LOCAL_AI_MODEL || 'modelscope';
      video.status = 'gerando_local_ai';
      video.progresso = 50;
      logStep(video, `🖥️ Gerando vídeo com IA Local (${AI_MODEL}) — pode levar bastante tempo em CPU...`);
      const videoPaths = await gerarVideoLocal(videoId, roteiro, audioPaths, video);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'darkStickman') {
      video.status = 'gerando_dark';
      video.progresso = 50;
      logStep(video, '🖤 Criando cenas dark com texto animado...');
      const videoPaths = await gerarVideoDarkStickman(videoId, roteiro, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else if (video.tipoVideo === 'stickAnimation') {
      video.status = 'gerando_animacao';
      logStep(video, '🎨 Gerando código de animação com IA...');
      const cenasCodigo = await gerarCodigoAnimacao(videoId, roteiro);
      video.progresso = 65;
      logStep(video, '🎬 Renderizando animações com Remotion...');
      video.status = 'renderizando';
      const videoPaths = await renderizarAnimacaoRemotion(videoId, cenasCodigo, audioPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;
      
    } else {
      // Pipeline padrão: Stock Images (Pexels 🟢)
      video.status = 'buscando_visuais';
      logStep(video, '🖼️ Buscando imagens stock (Pexels 🟢)...');
      const visuais = await buscarVisuais(roteiro.cenas);
      video.progresso = 65;

      // Música de fundo via Pixabay (GRÁTIS, se configurada)
      let musicaPaths = null;
      if (process.env.PIXABAY_API_KEY) {
        logStep(video, '🎵 Buscando música de fundo (Pixabay 🟢)...');
        const duracaoTotal = audioPaths.duracoesCenas?.reduce((a, b) => a + b, 0) || 60;
        musicaPaths = await gerarMusicaFundo(videoId, roteiro.nicho || video.nicho, duracaoTotal);
        if (musicaPaths) logStep(video, '🎵 Música de fundo encontrada!');
      }

      logStep(video, '🎬 Renderizando vídeo...');
      video.status = 'renderizando';
      const videoPaths = await renderizarVideo(videoId, roteiro, audioPaths, visuais, subtitlePaths, musicaPaths);
      video.videoUrl = videoPaths.host;
      video.progresso = 90;

      // Thumbnail automática
      logStep(video, '🖼️ Gerando thumbnail...');
      const thumbPaths = await gerarThumbnail(videoId, roteiro, visuais);
      video.thumbnailPath = thumbPaths?.host || null;
    }

    // ETAPA 5: Upload YouTube (se habilitado)
    if (video.publicarYoutube) {
      video.status = 'publicando';
      logStep(video, '📺 Publicando no YouTube...');
      const videoPaths = { host: video.videoUrl, docker: `/media/videos/${videoId}.mp4` };
      const youtubeId = await publicarNoYoutube(videoId, videoPaths, roteiro);
      video.youtubeId = youtubeId;
      video.progresso = 95;
      logStep(video, `✅ Publicado! ID YouTube: ${youtubeId}`);

      // Upload da thumbnail para YouTube (se gerada)
      if (video.thumbnailPath) {
        try {
          logStep(video, '🖼️ Enviando thumbnail para YouTube...');
          await youtube.thumbnails.set({
            videoId: youtubeId,
            media: { mimeType: 'image/jpeg', body: require('fs').createReadStream(video.thumbnailPath) }
          });
          logStep(video, '🖼️ Thumbnail enviada!');
        } catch (thumbErr) {
          console.warn('⚠️ Thumbnail YouTube falhou (não crítico):', thumbErr.message);
        }
      }
      
      // ETAPA 6: Compartilhar nas redes sociais conectadas
      const youtubeUrl = `https://youtube.com/watch?v=${youtubeId}`;
      const compartilhamentos = await compartilharRedesSociais(video, youtubeUrl);
      video.compartilhamentos = compartilhamentos;
      
      video.progresso = 100;
      video.status = 'publicado';
      const redesOk = compartilhamentos.filter(c => c.sucesso).map(c => c.rede).join(', ');
      logStep(video, redesOk 
        ? `🎉 Publicado no YouTube e compartilhado em: ${redesOk}` 
        : `🎉 Publicado no YouTube! ID: ${youtubeId}`);
    } else {
      video.progresso = 100;
      video.status = 'concluido';
      logStep(video, '✅ Vídeo pronto!');
    }
    
  } catch (error) {
    video.status = 'erro';
    logStep(video, `❌ Erro: ${error.message}`);
    console.error('Erro no pipeline:', error);
    throw error;
  }
}

// ============================================
// HELPER: Chamar Gemini (múltiplos modelos com fallback automático)
// ============================================
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro',
];

async function chamarGemini(prompt, timeout = 60000) {
  const erros = [];

  // PRIORIDADE 1: API Key (GRATUITA) — tenta todos os modelos em sequência
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'sua_chave_aqui') {
    for (const model of GEMINI_MODELS) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          { contents: [{ parts: [{ text: prompt }] }] },
          {
            headers: { 'Content-Type': 'application/json' },
            params: { key: GEMINI_API_KEY },
            timeout
          }
        );
        
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`  ✅ Gemini respondeu via ${model} (API Key gratuita)`);
          return text;
        }
      } catch (apiKeyErr) {
        const status = apiKeyErr.response?.status;
        const msg = status === 429 ? 'cota excedida' : (status || apiKeyErr.message);
        console.warn(`  ⚠️ ${model}: ${msg}`);
        erros.push(`${model}: ${msg}`);
      }
    }
  }
  
  // PRIORIDADE 2: Vertex AI (pago, só se todos os modelos com API Key falharem)
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const accessToken = await auth.getAccessToken();
    const projectId = await auth.getProjectId();
    
    const response = await axios.post(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`,
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        timeout
      }
    );
    
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log('  ✅ Gemini respondeu via Vertex AI (pago)');
      return text;
    }
  } catch (vertexErr) {
    console.warn(`  ⚠️ Vertex AI também falhou (${vertexErr.response?.status || vertexErr.message})`);
    erros.push(`Vertex AI: ${vertexErr.response?.status || vertexErr.message}`);
  }
  
  // PRIORIDADE 3: OpenRouter — modelos gratuitos (requer API key gratuita de https://openrouter.ai/keys)
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && openRouterKey.length > 10) {
    const openRouterModels = [
      'deepseek/deepseek-chat-v3-0324:free',
      'qwen/qwen3-235b-a22b:free',
      'meta-llama/llama-4-maverick:free',
      'google/gemini-2.5-flash-preview:free',
      'deepseek/deepseek-r1:free',
    ];
    
    for (const orModel of openRouterModels) {
      try {
        console.log(`  🔄 Tentando OpenRouter: ${orModel}...`);
        const orResponse = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: orModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openRouterKey}`,
              'HTTP-Referer': 'https://videoforge.app',
              'X-Title': 'VideoForge'
            },
            timeout: timeout + 30000
          }
        );
        
        const orText = orResponse.data?.choices?.[0]?.message?.content;
        if (orText && orText.length > 100) {
          console.log(`  ✅ Respondeu via OpenRouter: ${orModel}`);
          return orText;
        }
      } catch (orErr) {
        const orStatus = orErr.response?.status;
        const orMsg = orStatus === 429 ? 'rate limit' : (orStatus === 402 ? 'sem créditos' : (orStatus || orErr.message));
        console.warn(`  ⚠️ OpenRouter ${orModel}: ${orMsg}`);
        erros.push(`OpenRouter/${orModel.split('/')[1]?.split(':')[0] || orModel}: ${orMsg}`);
      }
    }
  } else {
    console.log('  ⏭️ OpenRouter: sem API key configurada, pulando...');
  }
  
  // Helper para extrair conteúdo real de respostas wrapper OpenAI
  function extrairConteudoOpenAI(obj) {
    if (!obj || typeof obj !== 'object') return null;
    // choices[0].message.content
    if (obj.choices?.[0]?.message?.content) return obj.choices[0].message.content;
    // Direct content field (pode ser null em modelos reasoning)
    if (obj.content && typeof obj.content === 'string' && obj.content.length > 50) return obj.content;
    // tool_calls[0].function.arguments
    if (obj.tool_calls?.[0]?.function?.arguments) return obj.tool_calls[0].function.arguments;
    if (obj.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) return obj.choices[0].message.tool_calls[0].function.arguments;
    
    // Modelos reasoning (o3-mini): content=null, reasoning_content=pensamento
    // O JSON real pode estar DENTRO do reasoning_content
    if (obj.reasoning_content && typeof obj.reasoning_content === 'string' && obj.reasoning_content.length > 200) {
      console.log(`  📦 Analisando reasoning_content [${obj.reasoning_content.length} chars]...`);
      
      // Buscar o JSON mais completo possível dentro do reasoning
      // O modelo geralmente gera o JSON completo como parte do "pensamento"
      const rcText = obj.reasoning_content;
      
      // Procurar um JSON que contenha array cenas/scenes
      const jsonBlockMatch = rcText.match(/\{[\s\S]*?"(?:cenas|scenes)"\s*:\s*\[[\s\S]*?\]\s*[\s\S]*?\}/);
      if (jsonBlockMatch && jsonBlockMatch[0].length > 300) {
        console.log(`  📦 JSON com cenas encontrado no reasoning [${jsonBlockMatch[0].length} chars]`);
        return jsonBlockMatch[0];
      }
      
      // Procurar qualquer JSON grande  
      const anyJson = rcText.match(/\{[\s\S]{500,}\}/);
      if (anyJson) {
        console.log(`  📦 JSON grande encontrado no reasoning [${anyJson[0].length} chars]`);
        return anyJson[0];
      }
    }
    
    return null;
  }
  
  // PRIORIDADE 4: Pollinations.ai Text — 100% gratuito, sem API key
  // NOTA: 'openai' é o único modelo consistentemente respondendo (via o3-mini)
  // O modelo retorna formato reasoning - extraímos via extrairConteudoOpenAI()
  const pollinationsModels = ['openai', 'mistral', 'llama'];
  
  for (const pModel of pollinationsModels) {
    // Tentar POST primeiro
    try {
      console.log(`  🔄 Tentando Pollinations.ai POST (${pModel})...`);
      const pResponse = await axios.post(
        'https://text.pollinations.ai/',
        {
          messages: [
            { role: 'system', content: 'You are a professional scriptwriter. Respond ONLY with valid JSON. No markdown, no code blocks, no explanations. Just raw JSON in your response.' },
            { role: 'user', content: prompt }
          ],
          model: pModel,
          seed: Math.floor(Math.random() * 100000),
        },
        {
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
          timeout: timeout + 90000,
          responseType: 'text'  // Forçar resposta como texto puro
        }
      );
      
      // Com responseType: 'text', pResponse.data é sempre string
      let pText = pResponse.data || '';
      console.log(`  📦 Resposta bruta [${pText.length} chars] primeiros 200: ${pText.substring(0, 200)}`);
      
      // Se a resposta é JSON com wrapper OpenAI ({role, content, tool_calls}), extrair
      if (pText.startsWith('{') && (pText.includes('"role"') || pText.includes('"choices"'))) {
        try {
          const wrapper = JSON.parse(pText);
          const extracted = extrairConteudoOpenAI(wrapper);
          if (extracted && extracted.length > 100) {
            pText = extracted;
            console.log(`  📦 Extraído do wrapper OpenAI [${pText.length} chars]`);
          }
        } catch(e) { /* não é JSON válido, usar como está */ }
      }
      
      if (pText && pText.length > 100) {
        console.log(`  ✅ Respondeu via Pollinations.ai POST (${pModel}) [${pText.length} chars]`);
        return pText;
      }
    } catch (pErr) {
      const pStatus = pErr.response?.status;
      const pMsg = pStatus || pErr.code || pErr.message;
      console.warn(`  ⚠️ Pollinations POST ${pModel}: ${pMsg}`);
      
      // Se POST deu 404/405, tentar GET com prompt condensado
      if (pStatus === 404 || pStatus === 405 || pStatus === 502) {
        try {
          console.log(`  🔄 Tentando Pollinations.ai GET (${pModel})...`);
          // Condensar o prompt para caber na URL (max ~4000 chars encoded)
          const shortPrompt = prompt.length > 1500 
            ? prompt.substring(0, 1500) + '\n\nResponda em JSON válido com campos: titulo, descricao, tags, cenas (array com numero, texto_narracao, prompt_visual, duracao_estimada), thumbnail_prompt.'
            : prompt;
          const encoded = encodeURIComponent(shortPrompt);
          const seed = Math.floor(Math.random() * 100000);
          
          const getResp = await axios.get(
            `https://text.pollinations.ai/${encoded}?model=${pModel}&json=true&seed=${seed}`,
            { timeout: timeout + 90000, responseType: 'text' }
          );
          
          let gText = getResp.data || '';
          // Se é wrapper OpenAI, extrair
          if (typeof gText === 'string' && gText.startsWith('{') && (gText.includes('"role"') || gText.includes('"choices"'))) {
            try {
              const gWrapper = JSON.parse(gText);
              const gExtracted = extrairConteudoOpenAI(gWrapper);
              if (gExtracted && gExtracted.length > 100) gText = gExtracted;
            } catch(e) {}
          } else if (typeof gText !== 'string') {
            const gExtracted = extrairConteudoOpenAI(gText);
            gText = gExtracted || JSON.stringify(gText);
          }
          if (gText && gText.length > 100) {
            console.log(`  ✅ Respondeu via Pollinations.ai GET (${pModel}) [${gText.length} chars]`);
            return gText;
          }
        } catch (gErr) {
          const gMsg = gErr.response?.status || gErr.code || gErr.message;
          console.warn(`  ⚠️ Pollinations GET ${pModel}: ${gMsg}`);
        }
      }
      
      erros.push(`Pollinations/${pModel}: ${pMsg}`);
      // Delay entre tentativas para evitar rate limit
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  throw new Error(`Todos os provedores de IA falharam: ${erros.join('; ')}`);
}

// ============================================
// FUNÇÃO: Gerar Roteiro com Gemini
// ============================================
async function gerarRoteiro({ nicho, topico, duracao, detalhes }) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'sua_chave_aqui') {
    console.warn('⚠️ Gemini API Key não configurada, usando dados mock');
    return gerarRoteiroMock(topico, nicho);
  }
  
  try {
    // Calcular número de cenas baseado na duração alvo
    // Cada cena com narração gera ~20s de áudio em média
    const cenasNecessarias = Math.max(8, Math.ceil((duracao * 60) / 20));
    
    const prompt = `Você é um roteirista profissional de vídeos para YouTube em português brasileiro.

Crie um roteiro completo e DETALHADO para um vídeo sobre: "${topico}"

Informações:
- Nicho: ${nicho}
- Duração alvo: ${duracao} minutos (ou seja, aproximadamente ${duracao * 60} segundos)
- Detalhes: ${detalhes || 'Nenhum'}

REGRAS IMPORTANTES:
1. A narração deve ser envolvente, informativa e natural (como um narrador de documentário)
2. CADA CENA DEVE TER 4-6 FRASES DE NARRAÇÃO (para cada cena durar ~20 segundos)
3. O "prompt_visual" deve ser em INGLÊS e descrever uma FOTO REAL ESPECÍFICA e simples de encontrar em banco de imagens (ex: "family celebrating christmas around dinner table", "children opening presents", "aerial view of fireworks over city"). NÃO use descrições artísticas como "painting depicting" ou "illustration of". Use cenários REAIS e FOTOGRÁFICOS.
4. O "prompt_visual" DEVE estar diretamente relacionado ao que a narração está falando naquele momento. Se a narração fala de "natal", a imagem deve ser de natal. Se fala de "praia", deve ser de praia.
5. CRIE EXATAMENTE ${cenasNecessarias} CENAS para atingir a duração de ${duracao} minutos. Isso é OBRIGATÓRIO.
6. A narração toda deve ser em português brasileiro
7. Distribua o conteúdo de forma equilibrada: introdução (10%), desenvolvimento (80%), conclusão (10%)
8. Varie os ângulos visuais entre as cenas (close-up, aerial, wide shot, etc.)

Retorne APENAS um JSON válido (sem markdown, sem explicações):

{
  "titulo": "Título chamativo para YouTube (máx 60 caracteres)",
  "descricao": "Descrição SEO com keywords e timestamps",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "cenas": [
    {
      "numero": 1,
      "texto_narracao": "Texto da narração em português (4-6 frases por cena para atingir ~20 segundos)",
      "prompt_visual": "specific photographic scene description in English",
      "duracao_estimada": 20
    }
  ],
  "thumbnail_prompt": "Descrição para thumbnail chamativa"
}`;

    let content;
    let roteiro;
    let lastError;
    
    // Tentar até 2 vezes (reduzido para chegar ao fallback template mais rápido)
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        content = await chamarGemini(prompt, 60000);
        
        console.log(`  📝 Resposta bruta [${content.length} chars]: ${content.substring(0, 150)}...`);
        let jsonStr = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];
        
        // Sanitiza JSON comum do Gemini:
        // 1. Remove trailing commas antes de } ou ]
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');
        // 2. Remove caracteres de controle dentro de strings (exceto \n \t \r)
        jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
        // 3. Corrige aspas simples usadas como delimitadores JSON (heurística simples)
        // Não aplicar se já tem aspas duplas válidas
        
        roteiro = JSON.parse(jsonStr);
        
        // Debug: logar as chaves do JSON recebido
        console.log(`  🔍 JSON keys: ${Object.keys(roteiro).join(', ')}`);
        
        // Se o JSON é um wrapper OpenAI (role, tool_calls, content), extrair o conteúdo real
        if (roteiro.role === 'assistant' || roteiro.choices) {
          console.log(`  🔄 Detectado wrapper OpenAI, extraindo conteúdo real...`);
          let innerContent = null;
          
          // Tentar extrair de diferentes locais
          if (roteiro.choices?.[0]?.message?.content) {
            innerContent = roteiro.choices[0].message.content;
          } else if (roteiro.content && typeof roteiro.content === 'string' && roteiro.content.length > 50) {
            innerContent = roteiro.content;
          } else if (roteiro.tool_calls && Array.isArray(roteiro.tool_calls)) {
            for (const tc of roteiro.tool_calls) {
              const args = tc.function?.arguments || tc.args || tc.input;
              if (args && typeof args === 'string' && args.length > 50) {
                innerContent = args;
                break;
              } else if (args && typeof args === 'object') {
                innerContent = JSON.stringify(args);
                break;
              }
            }
          }
          // Tentar extrair de reasoning_content se tem JSON embutido
          if (!innerContent && roteiro.reasoning_content && typeof roteiro.reasoning_content === 'string') {
            const jsonInReasoning = roteiro.reasoning_content.match(/\{[\s\S]*"(?:cenas|scenes|titulo)"[\s\S]*\}/);
            if (jsonInReasoning) {
              innerContent = jsonInReasoning[0];
              console.log(`  📦 Encontrou JSON embutido no reasoning_content`);
            }
          }
          
          if (innerContent) {
            console.log(`  📦 Inner content extraído [${innerContent.length} chars]`);
            const innerMatch = innerContent.match(/\{[\s\S]*\}/);
            if (innerMatch) innerContent = innerMatch[0];
            innerContent = innerContent.replace(/,\s*([\]}])/g, '$1');
            innerContent = innerContent.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
            roteiro = JSON.parse(innerContent);
            console.log(`  🔍 Inner JSON keys: ${Object.keys(roteiro).join(', ')}`);
          } else {
            console.warn(`  ⚠️ Wrapper OpenAI sem conteúdo extraível. tool_calls: ${JSON.stringify(roteiro.tool_calls)?.substring(0, 500)}`);
            throw new Error('Wrapper OpenAI sem conteúdo extraível');
          }
        }
        
        // Validar estrutura do roteiro — buscar cenas em várias propriedades
        if (!roteiro.cenas || !Array.isArray(roteiro.cenas) || roteiro.cenas.length === 0) {
          // Busca ampliada em propriedades alternativas
          const possibleCenas = roteiro.scenes || roteiro.Cenas || roteiro.CENAS 
            || roteiro.script?.cenas || roteiro.script?.scenes
            || roteiro.roteiro?.cenas || roteiro.video?.cenas || roteiro.video?.scenes
            || roteiro.content?.cenas || roteiro.content?.scenes;
          
          // Se não encontrou, buscar qualquer array com objetos que pareçam cenas
          let foundCenas = possibleCenas;
          if (!foundCenas || !Array.isArray(foundCenas) || foundCenas.length === 0) {
            for (const [key, val] of Object.entries(roteiro)) {
              if (Array.isArray(val) && val.length >= 3 && typeof val[0] === 'object') {
                // Verificar se parecem cenas (têm texto/narração/visual)
                const first = val[0];
                const hasText = first.texto_narracao || first.narration || first.text || first.narracao || first.content;
                const hasVisual = first.prompt_visual || first.visual || first.image || first.image_prompt || first.visual_prompt;
                if (hasText || hasVisual) {
                  console.log(`  🔍 Encontrou cenas na propriedade "${key}" (${val.length} items)`);
                  foundCenas = val;
                  break;
                }
              }
            }
          }
          
          if (foundCenas && Array.isArray(foundCenas) && foundCenas.length > 0) {
            roteiro.cenas = foundCenas.map((c, i) => ({
              numero: c.numero || c.number || c.scene_number || i + 1,
              texto_narracao: c.texto_narracao || c.narration || c.text || c.narracao || c.narration_text || c.content || c.dialogue || '',
              prompt_visual: c.prompt_visual || c.visual || c.image || c.visual_prompt || c.image_prompt || c.image_description || '',
              duracao_estimada: c.duracao_estimada || c.duration || c.estimated_duration || 20
            }));
          } else {
            console.warn(`  ⚠️ JSON sem cenas. Keys: ${Object.keys(roteiro).join(', ')}. Primeiro valor: ${JSON.stringify(roteiro).substring(0, 300)}`);
            throw new Error('Roteiro sem campo "cenas" válido');
          }
        }
        
        // Normalizar campos das cenas
        roteiro.cenas = roteiro.cenas.map((c, i) => ({
          numero: c.numero || i + 1,
          texto_narracao: c.texto_narracao || c.narration || c.text || '',
          prompt_visual: c.prompt_visual || c.visual || c.image_prompt || '',
          duracao_estimada: c.duracao_estimada || c.duration || 20
        }));
        
        if (!roteiro.titulo) roteiro.titulo = 'Vídeo VideoForge';
        if (!roteiro.tags) roteiro.tags = ['videoforge'];
        if (!roteiro.descricao) roteiro.descricao = '';
        
        console.log(`  📝 Roteiro parseado: ${roteiro.cenas.length} cenas, título: ${roteiro.titulo}`);
        lastError = null;
        break; // Sucesso, sair do loop
      } catch (parseErr) {
        lastError = parseErr;
        console.warn(`  ⚠️ Tentativa ${tentativa}/2: JSON malformado — ${parseErr.message.substring(0, 100)}`);
        if (tentativa < 2) {
          console.log(`  🔄 Retentando geração de roteiro...`);
        }
      }
    }
    
    if (lastError || !roteiro) {
      console.warn(`  ⚠️ Todos os LLMs falharam. Usando roteiro template para "${topico}"...`);
      return gerarRoteiroTemplate(topico, nicho, duracao, detalhes);
    }
    
    return roteiro;
    
  } catch (error) {
    console.warn(`  ⚠️ Erro geral no gerarRoteiro: ${error.message}. Usando template...`);
    return gerarRoteiroTemplate(topico, nicho, duracao, detalhes);
  }
}

function gerarRoteiroMock(topico, nicho) {
  return gerarRoteiroTemplate(topico, nicho, 3, '');
}

// Gera um roteiro completo por template quando todos os LLMs falham
function gerarRoteiroTemplate(topico, nicho, duracao, detalhes) {
  const cenasNecessarias = Math.max(8, Math.ceil(((duracao || 5) * 60) / 20));
  const titulo = topico.length > 60 ? topico.substring(0, 57) + '...' : topico;
  
  const templates = {
    intro: [
      `Voc\u00ea j\u00e1 ouviu falar sobre ${topico}? Prepare-se, porque essa \u00e9 uma das hist\u00f3rias mais surpreendentes que voc\u00ea vai ouvir hoje. E acredite, a realidade \u00e9 mais bizarra que a fic\u00e7\u00e3o.`,
      `O que estou prestes a contar pode parecer imposs\u00edvel. Mas ${topico} realmente aconteceu, e as consequ\u00eancias foram absolutamente extraordin\u00e1rias.`,
    ],
    desenvolvimento: [
      `Para entender o que aconteceu, precisamos voltar ao contexto da \u00e9poca. O mundo vivia um momento de grandes transforma\u00e7\u00f5es, e ningu\u00e9m poderia prever o que estava por vir.`,
      `Os detalhes dessa hist\u00f3ria s\u00e3o fascinantes. Cada novo fato descoberto revela uma camada ainda mais surpreendente do que realmente aconteceu.`,
      `O mais incr\u00edvel \u00e9 que as pessoas envolvidas n\u00e3o faziam ideia da propor\u00e7\u00e3o que os eventos tomariam. Era apenas o come\u00e7o de algo muito maior.`,
      `Especialistas tentaram explicar o fen\u00f4meno de diversas formas. Algumas teorias eram cient\u00edficas, outras beiravam o absurdo completo.`,
      `Enquanto isso, as consequ\u00eancias se espalhavam como fogo em palha seca. O que come\u00e7ou como um evento local rapidamente ganhou propor\u00e7\u00f5es globais.`,
      `As testemunhas da \u00e9poca descrevem cenas que parecem sa\u00eddas de um filme. Mas tudo isso realmente aconteceu, documentado e registrado para a posteridade.`,
      `Muitos tentaram parar o que estava acontecendo, mas descobriram que era praticamente imposs\u00edvel. A situa\u00e7\u00e3o tinha vida pr\u00f3pria.`,
      `Os registros hist\u00f3ricos mostram que as autoridades ficaram completamente perdidas. Ningu\u00e9m sabia ao certo como lidar com algo t\u00e3o inusitado.`,
      `Com o passar do tempo, novas informa\u00e7\u00f5es vieram \u00e0 tona. E cada descoberta tornava a hist\u00f3ria ainda mais impressionante.`,
      `O impacto desses eventos foi sentido por d\u00e9cadas. At\u00e9 hoje, pesquisadores debatem as verdadeiras causas e consequ\u00eancias do que aconteceu.`,
      `Para as pessoas que viveram aquele momento, a experi\u00eancia foi transformadora. Nada voltou a ser como antes depois daquele dia.`,
      `Historiadores apontam que esse foi um ponto de virada. Um daqueles eventos que dividem a hist\u00f3ria em antes e depois.`,
      `A hist\u00f3ria est\u00e1 repleta de ironias. Justamente o que deveria evitar o problema acabou contribuindo para que ele se tornasse ainda maior.`,
    ],
    conclusao: [
      `E assim termina uma das hist\u00f3rias mais extraordin\u00e1rias j\u00e1 registradas. ${topico} nos lembra que a realidade, muitas vezes, supera qualquer fic\u00e7\u00e3o que possamos imaginar.`,
      `Se essa hist\u00f3ria te surpreendeu, deixe seu like e se inscreva no canal. Toda semana trazemos hist\u00f3rias incr\u00edveis como essa. At\u00e9 a pr\u00f3xima!`,
    ]
  };
  
  const visualPrompts = [
    `Dramatic cinematic establishing shot of 1960s setting, vintage film grain, warm color palette, documentary style`,
    `Historical black and white photographs with dramatic zoom, archival footage style, aged paper texture`,
    `Wide aerial shot of African landscape, dramatic clouds, golden hour lighting, National Geographic style`,
    `Close-up of vintage newspaper headlines, dramatic lighting, shallow depth of field, journalistic photography`,
    `Group of people in 1960s clothing, candid documentary moment, natural lighting, authentic period details`,
    `Dramatic time-lapse of spreading phenomenon, visualization map, scientific documentary style`,
    `Medical professionals in 1960s hospital, concerned expressions, vintage equipment, dramatic shadows`,
    `Crowd scene with emotional expressions, documentary photography, black and white with selective color`,
    `Historical building exterior, colonial architecture, dramatic sky, wide angle lens, cinematic composition`,
    `Library research scene, stack of old books and documents, warm lamp lighting, scholarly atmosphere`,
    `World map with spreading indicators, animated infographic style, vintage cartography aesthetic`,
    `Dramatic sunset over historical location, silhouettes of people, emotional atmospheric lighting`,
    `Close-up of historical artifacts and memorabilia, museum display style, professional macro photography`,
    `Archive footage recreation, dramatic reenactment style, period-accurate costumes and setting`,
    `Final reflective scene, modern view of historical location, then-and-now comparison, emotional`,
  ];
  
  const cenas = [];
  
  cenas.push({
    numero: 1,
    texto_narracao: templates.intro[Math.floor(Math.random() * templates.intro.length)],
    prompt_visual: visualPrompts[0],
    duracao_estimada: 20
  });
  
  const devTemplates = [...templates.desenvolvimento].sort(() => Math.random() - 0.5);
  for (let i = 1; i < cenasNecessarias - 1; i++) {
    cenas.push({
      numero: i + 1,
      texto_narracao: devTemplates[(i - 1) % devTemplates.length],
      prompt_visual: visualPrompts[i % visualPrompts.length],
      duracao_estimada: 20
    });
  }
  
  cenas.push({
    numero: cenasNecessarias,
    texto_narracao: templates.conclusao[0] + ' ' + templates.conclusao[1],
    prompt_visual: visualPrompts[visualPrompts.length - 1],
    duracao_estimada: 25
  });
  
  console.log(`  \ud83d\udcdd Roteiro template gerado: ${cenas.length} cenas para "${topico}"`);
  return {
    titulo,
    descricao: `${topico} - Uma história incrível que você precisa conhecer. #${nicho} #historia #curiosidades`,
    tags: [nicho, 'história', 'curiosidades', 'documentário', topico.split(' ')[0], topico.split(' ').pop()],
    cenas,
    thumbnail_prompt: `${topico}, dramatic cinematic poster style, bold typography, eye-catching, YouTube thumbnail`
  };
}

// ============================================
// FUN\u00c7\u00c3O: Gerar C\u00f3digo de Anima\u00e7\u00e3o Remotion com IA
// ============================================

async function gerarCodigoAnimacao(videoId, roteiro) {
  console.log('🎨 Gerando código de animação com IA...');
  
  const remotionDir = resolve(__dirname, '..', 'remotion-animations');
  const generatedDir = resolve(remotionDir, 'src', 'generated');
  await fs.mkdir(generatedDir, { recursive: true });
  
  const cenasCodigo = [];
  
  for (let i = 0; i < roteiro.cenas.length; i++) {
    const cena = roteiro.cenas[i];
    const fps = 25;
    const durationInFrames = Math.ceil((cena.duracao_estimada || 10) * fps);
    
    const prompt = `Você é um animador profissional criando animações de STICK FIGURE (palitinhos) de ALTA QUALIDADE com React + Remotion, no estilo dos melhores vídeos virais de stick figure da internet.

PADRÃO VISUAL OBRIGATÓRIO:
- Palitinhos com linhas PRETAS limpas, cabeça redonda, proporções consistentes
- Design MINIMALISTA: sem realismo, sem texturas nos personagens, sem cores nos corpos
- Estilo whiteboard / 2D flat com fundo branco limpo
- Alta clareza visual e consistência entre todas as cenas
- MESMO design de personagem em TODAS as cenas

MOVIMENTO E ANIMAÇÃO:
- Movimentos com timing NATURAL e easing (use interpolate com clamp)
- Squash-and-stretch sutil (use as animações built-in dos componentes)
- Poses claras e silhuetas legíveis
- Expressar emoções através da LINGUAGEM CORPORAL (braços, inclinação, postura)
- Movimentos devem parecer DIVERTIDOS, fluidos e intencionais
- EVITE movimentos robóticos ou lineares - use interpolate com keyframes variados

HUMOR E EXPRESSIVIDADE:
- Use gestos EXAGERADOS para humor
- Timing cômico: pausas antes de piadas, reações rápidas (use startFrame/endFrame)
- Piadas visuais usando SÍMBOLOS (?, !, gotas de suor, linhas de velocidade)
- Humor leve e familiar, adequado para conteúdo educacional
- Personagens devem parecer VIVOS: curiosos, surpresos, felizes, confusos

COMPOSIÇÃO:
- Enquadramento simples, ação CENTRALIZADA
- Fundo limpo e mínimo (whiteboard branco)
- Personagens scale 1.3-1.8 para boa visibilidade
- Posicionar personagens com y entre 650-800 (pé no chão)
- Texto legível em telas mobile (fontSize >= 28)

**Cena ${i + 1} de ${roteiro.cenas.length}**
**Narração:** "${cena.texto_narracao}"
**Duração:** ${durationInFrames} frames (${cena.duracao_estimada}s a ${fps}fps)

COMPONENTES DISPONÍVEIS (use APENAS estes 4):

1. **Scene** - Container da cena com fundo limpo
   Props: backgroundColor (string, default "#FFFFFF"), style ('whiteboard'|'blank'|'ground'|'sky'), groundY (number, default 850)
   
2. **StickFigure** - Palitinho animado com linguagem corporal expressiva
   Props: x, y, scale (1-2), facing ('left'|'right'),
   animation: 'idle'|'walk'|'run'|'jump'|'wave'|'dance'|'celebrate'|'think'|'talk'|'sit'|'fall'|'facepalm'|'point'|'shrug'|'kick'
   expression: 'happy'|'sad'|'confused'|'surprised'|'angry'|'neutral'|'excited'|'thinking'|'sleeping'
   symbol: 'questionMark'|'exclamation'|'sweatDrop'|'lightbulb'|'heart'|'star'|'musicNote'|'zzz'|'anger'|'none'
   startFrame, endFrame

3. **Text** - Texto limpo com auto-wrap
   Props: text, x, y, fontSize (>=28), color (default "#000"), fadeIn (bool), fadeOut (bool), totalFrames, bold (bool), align ('left'|'center'|'right'), startFrame, endFrame

4. **Effect** - Efeitos visuais para a cena
   Props: type ('speedLines'|'impactStar'|'dustCloud'|'speechBubble'|'thoughtBubble'|'sweatDrop'|'questionMark'|'exclamation'|'lightbulb'|'heart'|'musicNote'|'star'|'zzz'|'anger'),
   x, y, scale, text (string, para speechBubble/thoughtBubble), direction ('left'|'right', para speedLines), startFrame, endFrame

REGRAS CRÍTICAS:
- NÃO use spring(), NÃO importe spring nem useVideoConfig
- interpolate() SÓ aceita NÚMEROS no outputRange, NUNCA strings de cor
- backgroundColor deve ser string FIXA (ex: "#FFFFFF"), NÃO interpole cores
- Máximo 3 personagens por cena
- NÃO importe TextBanner, Confetti ou Decoration (componentes antigos removidos)
- Combine expressões + animações + símbolos para máxima expressividade
- Use Effect para efeitos visuais como speedLines, impactStar, speechBubble
- Use timing com startFrame/endFrame para criar sequências (personagem entra, reage, etc)
- Retorne APENAS código TypeScript válido, sem explicações

DICAS DE ANIMAÇÃO VIRAL:
- Crie SEQUÊNCIAS: personagem entra andando (walk), para (idle), reage (surprised + exclamation)
- Use interpolate para mover personagens pela cena com easing
- Coloque texto narrativo no topo (y=80-120) e personagens embaixo (y=650-800)
- Use speechBubble/thoughtBubble para diálogos
- speedLines atrás de personagens correndo
- impactStar em momentos de colisão ou surpresa

EXEMPLO:
\`\`\`typescript
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene${i + 1}: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Personagem entra da esquerda
  const charX = interpolate(frame, [0, 40, 80, ${durationInFrames}], [100, 500, 500, 500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  // Segundo personagem já posicionado
  const char2Reaction = frame > 50;
  
  return (
    <Scene style="whiteboard">
      <Text
        text="Título da cena aqui"
        x={960} y={90} fontSize={38} color="#000" bold={true}
        fadeIn={true} totalFrames={${durationInFrames}}
      />
      
      <Text
        text="Subtítulo explicativo"
        x={960} y={150} fontSize={26} color="#555"
        fadeIn={true} startFrame={20} totalFrames={${durationInFrames}}
      />
      
      {/* Speed lines atrás do personagem enquanto anda */}
      {frame < 45 && (
        <Effect type="speedLines" x={charX - 40} y={720} direction="left" startFrame={0} endFrame={45} />
      )}
      
      <StickFigure
        x={charX} y={740} scale={1.5}
        animation={frame < 45 ? 'walk' : 'idle'}
        expression={frame < 45 ? 'happy' : 'neutral'}
        facing="right"
        startFrame={0} endFrame={${durationInFrames}}
      />
      
      <StickFigure
        x={1200} y={740} scale={1.5}
        animation={char2Reaction ? 'wave' : 'idle'}
        expression={char2Reaction ? 'excited' : 'neutral'}
        symbol={char2Reaction ? 'exclamation' : 'none'}
        facing="left"
        startFrame={0} endFrame={${durationInFrames}}
      />
      
      {/* Balão de fala aparece depois */}
      {frame > 80 && (
        <Effect type="speechBubble" text="Olá!" x={1200} y={560} startFrame={80} endFrame={${durationInFrames}} />
      )}
    </Scene>
  );
};
\`\`\`

Agora crie o código para a cena descrita. Seja CRIATIVO com o timing, as animações e a expressividade corporal! Crie uma cena DINÂMICA com personagens que se movem, reagem e contam a história de forma visual e divertida.`;

    try {
      let codigo = await chamarGemini(prompt, 60000);
      
      // Extrair código TypeScript
      const codeMatch = codigo.match(/```(?:typescript|tsx)?\n([\s\S]*?)```/);
      if (codeMatch) {
        codigo = codeMatch[1];
      }
      
      // Corrigir imports para usar o caminho correto
      codigo = codigo.replace(/from ['"]\.\/Scene['"]/g, "from '../components/Scene'");
      codigo = codigo.replace(/from ['"]\.\/StickFigure['"]/g, "from '../components/StickFigure'");
      codigo = codigo.replace(/from ['"]\.\/Text['"]/g, "from '../components/Text'");
      codigo = codigo.replace(/from ['"]\.\/Effect['"]/g, "from '../components/Effect'");
      codigo = codigo.replace(/from ['"]\.\/TextBanner['"]/g, "from '../components/Effect'");
      codigo = codigo.replace(/from ['"]\.\/Confetti['"]/g, "from '../components/Effect'");
      codigo = codigo.replace(/from ['"]\.\/Decoration['"]/g, "from '../components/Effect'");
      codigo = codigo.replace(/from ['"]\.\.\/\.\.\/components/g, "from '../components");
      
      // Remover imports de componentes antigos que não existem mais
      codigo = codigo.replace(/import\s*\{[^}]*TextBanner[^}]*\}\s*from\s*['"][^'"]+['"];?\s*\n?/g, '');
      codigo = codigo.replace(/import\s*\{[^}]*Confetti[^}]*\}\s*from\s*['"][^'"]+['"];?\s*\n?/g, '');
      codigo = codigo.replace(/import\s*\{[^}]*Decoration[^}]*\}\s*from\s*['"][^'"]+['"];?\s*\n?/g, '');
      
      // Remover uso de componentes antigos do JSX (TextBanner, Confetti, Decoration)
      codigo = codigo.replace(/<TextBanner[\s\S]*?\/>/g, '');
      codigo = codigo.replace(/<Confetti[\s\S]*?\/>/g, '');
      codigo = codigo.replace(/<Decoration[\s\S]*?\/>/g, '');
      
      // Remover props antigas do StickFigure (color, accessory, item)
      codigo = codigo.replace(/\s+color=\{?["'][^"']*["']\}?/g, '');
      codigo = codigo.replace(/\s+accessory=\{?["'][^"']*["']\}?/g, '');
      codigo = codigo.replace(/\s+item=\{?["'][^"']*["']\}?/g, '');
      
      // Corrigir animation='play' (antigo) para 'dance', 'static' para 'idle'
      codigo = codigo.replace(/animation=["']play["']/g, "animation='dance'");
      codigo = codigo.replace(/animation=["']static["']/g, "animation='idle'");
      
      // Corrigir style='paper'|'gradient'|'solid' (antigos) para novos estilos
      codigo = codigo.replace(/style=["']paper["']/g, "style='whiteboard'");
      codigo = codigo.replace(/style=["']gradient["']/g, "style='whiteboard'");
      codigo = codigo.replace(/style=["']solid["']/g, "style='blank'");
      
      // Garantir que o nome do componente exportado seja correto
      codigo = codigo.replace(/export const \w+: React\.FC/g, `export const Scene${i + 1}: React.FC`);
      
      // Substituir spring() por interpolate equivalente (spring requer fps e causa erros)
      // Remover import de spring e useVideoConfig
      codigo = codigo.replace(/,\s*spring/g, '');
      codigo = codigo.replace(/spring,\s*/g, '');
      codigo = codigo.replace(/,\s*useVideoConfig/g, '');
      codigo = codigo.replace(/useVideoConfig,\s*/g, '');
      // Se ainda houver chamadas spring(), substituir por valor fixo 1
      codigo = codigo.replace(/spring\s*\([^)]*\{[\s\S]*?\}[^)]*\)/g, '1');
      // Remover const { fps } = useVideoConfig() se existir
      codigo = codigo.replace(/const\s*\{[^}]*\}\s*=\s*useVideoConfig\(\);?/g, '');
      
      // Corrigir interpolate com strings de cor (outputRange deve ser só números)
      // Detecta: interpolate(frame, [...], ['#xxx', '#yyy'], ...) e substitui por primeira cor fixa
      codigo = codigo.replace(/interpolate\s*\([^,]+,\s*\[[^\]]+\],\s*\[\s*['"]([#\w]+)['"]\s*,\s*['"][#\w]+['"]\s*\][^)]*\)/g, "'$1'");
      
      // Remover import de interpolateColors se existir (não temos)
      codigo = codigo.replace(/,\s*interpolateColors/g, '');
      codigo = codigo.replace(/interpolateColors,\s*/g, '');
      
      // Corrigir backslash-escaped quotes dentro de JSX (\" → ')
      // Em JSX, \" não é válido em atributos, usar ' no lugar
      codigo = codigo.replace(/\\"/g, "'");
      
      // Remover import Sequence se usado (não está no nosso setup)
      codigo = codigo.replace(/,\s*Sequence/g, '');
      codigo = codigo.replace(/Sequence,\s*/g, '');
      
      // Garantir que Text com texto muito longo não quebre
      // (Text.tsx já faz auto-wrap, mas aspas quebram o JSX)
      
      const filepath = resolve(generatedDir, `Scene${i + 1}.tsx`);
      await fs.writeFile(filepath, codigo, 'utf-8');
      
      cenasCodigo.push({
        numero: i + 1,
        filepath,
        durationInFrames,
        componentName: `Scene${i + 1}`
      });
      
      console.log(`✅ Cena ${i + 1} código gerado (${durationInFrames} frames)`);
      
    } catch (error) {
      console.error(`❌ Erro ao gerar código cena ${i + 1}:`, error.message);
      throw error;
    }
  }
  
  // Gerar Root.tsx que importa todas as cenas
  const rootContent = `import { Composition, registerRoot } from 'remotion';
import React from 'react';
${cenasCodigo.map(c => `import { ${c.componentName} } from './generated/${c.componentName}';`).join('\n')}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      ${cenasCodigo.map(c => `
      <Composition
        id="${c.componentName}"
        component={${c.componentName}}
        durationInFrames={${c.durationInFrames}}
        fps={25}
        width={1920}
        height={1080}
      />`).join('')}
    </>
  );
};

registerRoot(RemotionRoot);
`;
  
  await fs.writeFile(resolve(remotionDir, 'src', 'Root.tsx'), rootContent, 'utf-8');
  console.log('✅ Root.tsx atualizado com todas as cenas');
  
  return cenasCodigo;
}

// ============================================
// FUNÇÃO: Gerar Narração com TTS (via Docker) - POR CENA
// ============================================
async function gerarNarracao(videoId, roteiro) {
  const dockerAudioPath = `/media/audios/${videoId}.mp3`;
  const hostAudioPath = resolve(MEDIA_DIR, 'audios', `${videoId}.mp3`);

  await fs.mkdir(resolve(MEDIA_DIR, 'audios'), { recursive: true });
  await fs.mkdir(resolve(MEDIA_DIR, 'temp', videoId), { recursive: true });

  // Selecionar provedor TTS: ElevenLabs → OpenAI → Edge TTS (fallback gratuito)
  const ttsProvider = process.env.ELEVENLABS_API_KEY ? 'elevenlabs'
    : process.env.OPENAI_API_KEY ? 'openai'
    : 'edge';
  console.log(`🎙️ TTS provider: ${ttsProvider}`);

  // Salvar textos das cenas em JSON para o script Python
  const cenasTexto = roteiro.cenas.map(c => c.texto_narracao);
  const cenasPath = resolve(MEDIA_DIR, 'temp', `${videoId}_cenas_texto.json`);
  await fs.writeFile(cenasPath, JSON.stringify(cenasTexto), 'utf-8');

  // ── Script ElevenLabs ──────────────────────────────────────────────────────
  const scriptElevenLabs = `
import json, subprocess, os, sys, requests

video_id = sys.argv[1]
output_path = sys.argv[2]
cenas_path = sys.argv[3]

API_KEY = os.environ.get('ELEVENLABS_API_KEY', '')
VOICE_ID = os.environ.get('ELEVENLABS_VOICE_ID', 'pNInz6obpgDQGcFmaJgB')  # Adam (multilingual)
cenas = json.load(open(cenas_path))
temp_dir = f'/media/temp/{video_id}'
os.makedirs(temp_dir, exist_ok=True)

def enhance_audio(raw, out):
    subprocess.run([
        'ffmpeg', '-y', '-i', raw,
        '-filter_complex', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ar', '44100', '-b:a', '192k', out
    ], capture_output=True, timeout=30)

def get_duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(r.stdout.strip())

audio_files = []
duracoes = []

for i, texto in enumerate(cenas):
    raw = f'{temp_dir}/cena_{i+1}_raw.mp3'
    enhanced = f'{temp_dir}/cena_{i+1}_audio.mp3'
    ok = False
    for tentativa in range(3):
        try:
            r = requests.post(
                f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}',
                headers={'xi-api-key': API_KEY, 'Content-Type': 'application/json'},
                json={'text': texto, 'model_id': 'eleven_multilingual_v2',
                      'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75}},
                timeout=60
            )
            r.raise_for_status()
            with open(raw, 'wb') as f: f.write(r.content)
            ok = True
            break
        except Exception as e:
            if tentativa == 2: raise Exception(f'ElevenLabs falhou 3x cena {i+1}: {e}')
            import time; time.sleep(3)
    enhance_audio(raw, enhanced)
    dur = get_duration(enhanced)
    audio_files.append(enhanced)
    duracoes.append(dur)
    print(f'Cena {i+1}: {dur:.1f}s [ElevenLabs]')

concat_list = f'{temp_dir}/audio_list.txt'
with open(concat_list, 'w') as f:
    for af in audio_files: f.write(f"file '{af}'\\n")
subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
    '-c:a', 'libmp3lame', '-b:a', '192k', output_path], capture_output=True, timeout=60)

dur_path = f'/media/temp/{video_id}_duracoes.json'
json.dump(duracoes, open(dur_path, 'w'))
print(f'Total: {sum(duracoes):.1f}s | Cenas: {len(duracoes)}')
print(f'DURACOES:{json.dumps(duracoes)}')
`;

  // ── Script OpenAI TTS ──────────────────────────────────────────────────────
  const scriptOpenAI = `
import json, subprocess, os, sys, requests

video_id = sys.argv[1]
output_path = sys.argv[2]
cenas_path = sys.argv[3]

API_KEY = os.environ.get('OPENAI_API_KEY', '')
cenas = json.load(open(cenas_path))
temp_dir = f'/media/temp/{video_id}'
os.makedirs(temp_dir, exist_ok=True)

def enhance_audio(raw, out):
    subprocess.run([
        'ffmpeg', '-y', '-i', raw,
        '-filter_complex', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ar', '44100', '-b:a', '192k', out
    ], capture_output=True, timeout=30)

def get_duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', path], capture_output=True, text=True)
    return float(r.stdout.strip())

audio_files = []
duracoes = []

for i, texto in enumerate(cenas):
    raw = f'{temp_dir}/cena_{i+1}_raw.mp3'
    enhanced = f'{temp_dir}/cena_{i+1}_audio.mp3'
    for tentativa in range(3):
        try:
            r = requests.post(
                'https://api.openai.com/v1/audio/speech',
                headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
                json={'model': 'tts-1-hd', 'voice': 'onyx', 'input': texto, 'response_format': 'mp3'},
                timeout=60
            )
            r.raise_for_status()
            with open(raw, 'wb') as f: f.write(r.content)
            break
        except Exception as e:
            if tentativa == 2: raise Exception(f'OpenAI TTS falhou 3x cena {i+1}: {e}')
            import time; time.sleep(3)
    enhance_audio(raw, enhanced)
    dur = get_duration(enhanced)
    audio_files.append(enhanced)
    duracoes.append(dur)
    print(f'Cena {i+1}: {dur:.1f}s [OpenAI TTS]')

concat_list = f'{temp_dir}/audio_list.txt'
with open(concat_list, 'w') as f:
    for af in audio_files: f.write(f"file '{af}'\\n")
subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
    '-c:a', 'libmp3lame', '-b:a', '192k', output_path], capture_output=True, timeout=60)

dur_path = f'/media/temp/{video_id}_duracoes.json'
json.dump(duracoes, open(dur_path, 'w'))
print(f'Total: {sum(duracoes):.1f}s | Cenas: {len(duracoes)}')
print(f'DURACOES:{json.dumps(duracoes)}')
`;

  // ── Script Edge TTS (gratuito, fallback) ──────────────────────────────────
  const scriptEdge = `
import json, subprocess, os, sys, asyncio

video_id = sys.argv[1]
output_path = sys.argv[2]
cenas_path = sys.argv[3]

cenas = json.load(open(cenas_path))
temp_dir = f'/media/temp/{video_id}'
os.makedirs(temp_dir, exist_ok=True)

async def gerar_audio_cena(i, texto):
    import edge_tts
    raw_path = f'{temp_dir}/cena_{i+1}_raw.mp3'
    enhanced_path = f'{temp_dir}/cena_{i+1}_audio.mp3'
    for tentativa in range(3):
        try:
            communicate = edge_tts.Communicate(text=texto, voice='pt-BR-AntonioNeural', rate='+8%', pitch='+0Hz')
            await communicate.save(raw_path)
            break
        except Exception as e:
            if tentativa == 2: raise Exception(f'Edge TTS falhou 3x na cena {i+1}: {e}')
            await asyncio.sleep(3)
    subprocess.run([
        'ffmpeg', '-y', '-i', raw_path,
        '-filter_complex',
        'equalizer=f=3000:width_type=o:width=2:g=4,'
        'equalizer=f=5000:width_type=o:width=2:g=2,'
        'equalizer=f=150:width_type=o:width=2:g=-3,'
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ar', '44100', '-b:a', '192k', enhanced_path
    ], capture_output=True, timeout=30)
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', enhanced_path], capture_output=True, text=True)
    dur = float(r.stdout.strip())
    return enhanced_path, dur

async def main():
    audio_files = []
    duracoes = []
    for i, texto in enumerate(cenas):
        path, dur = await gerar_audio_cena(i, texto)
        audio_files.append(path)
        duracoes.append(dur)
        print(f'Cena {i+1}: {dur:.1f}s [Edge TTS]')
    concat_list = f'{temp_dir}/audio_list.txt'
    with open(concat_list, 'w') as f:
        for af in audio_files: f.write(f"file '{af}'\\n")
    subprocess.run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c:a', 'libmp3lame', '-b:a', '192k', output_path], capture_output=True, timeout=60)
    dur_path = f'/media/temp/{video_id}_duracoes.json'
    json.dump(duracoes, open(dur_path, 'w'))
    print(f'Total: {sum(duracoes):.1f}s | Cenas: {len(duracoes)}')
    print(f'DURACOES:{json.dumps(duracoes)}')

asyncio.run(main())
`;

  const scriptContent = ttsProvider === 'elevenlabs' ? scriptElevenLabs
    : ttsProvider === 'openai' ? scriptOpenAI
    : scriptEdge;

  const scriptPath = resolve(MEDIA_DIR, 'temp', `${videoId}_tts.py`);
  await fs.writeFile(scriptPath, scriptContent, 'utf-8');

  const cmd = makeExecCmd(`python /media/temp/${videoId}_tts.py "${videoId}" "${dockerAudioPath}" "/media/temp/${videoId}_cenas_texto.json"`);

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 180000 });
      console.log('🔊 TTS output:', stdout.trim());
      
      // Extrair durações das cenas
      const durMatch = stdout.match(/DURACOES:(\[.*\])/);
      const duracoesCenas = durMatch ? JSON.parse(durMatch[1]) : null;
      
      await fs.access(hostAudioPath);
      console.log('✅ Narração gerada por cena:', hostAudioPath);
      return { docker: dockerAudioPath, host: hostAudioPath, duracoesCenas };
    } catch (error) {
      lastError = error;
      const detail = error.stderr || error.stdout || error.message;
      console.error(`❌ TTS tentativa ${attempt}/3:`, detail.substring(0, 500));
      if (attempt < 3) {
        console.log(`⏳ Aguardando 5s antes da tentativa ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  const detail = lastError.stderr || lastError.stdout || lastError.message;
  throw new Error(`Falha ao gerar narração (3 tentativas): ${detail.substring(0, 300)}`);
}

// ============================================
// FUNÇÃO: Buscar Material Visual (Pexels) - contextual por cena
// ============================================
async function buscarVisuais(cenas) {
  if (!PEXELS_API_KEY || PEXELS_API_KEY === 'sua_chave_aqui') {
    console.warn('⚠️ Pexels API Key não configurada, usando mock');
    return cenas.map(c => ({
      cena: c.numero,
      url: 'https://images.pexels.com/photos/1146134/pexels-photo-1146134.jpeg',
      tipo: 'imagem'
    }));
  }
  
  const visuais = [];
  const usedPhotos = new Set(); // Evitar repetir imagens
  
  for (const cena of cenas) {
    try {
      // Usar Gemini para gerar keywords de busca precisas para Pexels
      // baseadas tanto no prompt_visual quanto na narração
      let queryPexels = '';
      
      try {
        const keywordPrompt = `Baseado nesta cena de vídeo, gere EXATAMENTE 3-4 palavras-chave em INGLÊS para buscar uma foto no Pexels que represente visualmente o que está sendo narrado.

Narração: "${cena.texto_narracao}"
Descrição visual: "${cena.prompt_visual || ''}"

Retorne APENAS as palavras-chave separadas por espaço, sem explicação. Exemplo: "christmas tree family gifts"
Palavras-chave:`;
        
        const kwText = await chamarGemini(keywordPrompt, 10000);
        queryPexels = kwText?.trim()?.replace(/["'\n]/g, '')?.substring(0, 60) || '';
      } catch (kwErr) {
        // Fallback: usar prompt_visual limpo
      }
      
      // Se Gemini não retornou keywords, usar prompt_visual limpo
      if (!queryPexels) {
        const queryOriginal = cena.prompt_visual || cena.texto_narracao;
        queryPexels = queryOriginal
          .replace(/cinematic|high quality|professional|4k|documentary|dramatic|style|related|imagery|detailed|illustration|painting|depicting|photograph|showing/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 60);
      }
      
      // Buscar 5 resultados para ter opções melhores
      const response = await axios.get('https://api.pexels.com/v1/search', {
        params: { 
          query: queryPexels, 
          per_page: 5,
          orientation: 'landscape',
          size: 'large'
        },
        headers: { Authorization: PEXELS_API_KEY }
      });
      
      if (response.data.photos && response.data.photos.length > 0) {
        // Pegar a primeira foto que não foi usada ainda
        const foto = response.data.photos.find(p => !usedPhotos.has(p.id)) || response.data.photos[0];
        usedPhotos.add(foto.id);
        
        visuais.push({
          cena: cena.numero,
          url: foto.src.large2x,
          tipo: 'imagem',
          descricao: foto.alt || queryPexels
        });
        console.log(`✅ Visual cena ${cena.numero}: "${queryPexels}" → ${(foto.alt || 'foto').substring(0, 80)}`);
      } else {
        // Fallback: tentar busca mais genérica com palavras da narração
        const palavrasChave = cena.texto_narracao
          .split(/\s+/)
          .filter(p => p.length > 4)
          .slice(0, 3)
          .join(' ');
        
        const fallbackResp = await axios.get('https://api.pexels.com/v1/search', {
          params: { query: palavrasChave, per_page: 3, orientation: 'landscape' },
          headers: { Authorization: PEXELS_API_KEY }
        });
        
        if (fallbackResp.data.photos && fallbackResp.data.photos[0]) {
          const foto = fallbackResp.data.photos[0];
          usedPhotos.add(foto.id);
          visuais.push({
            cena: cena.numero,
            url: foto.src.large2x,
            tipo: 'imagem',
            descricao: foto.alt || palavrasChave
          });
          console.log(`✅ Visual cena ${cena.numero} (fallback): "${palavrasChave}"`);
        }
      }
      
      // Delay para não exceder rate limit do Pexels
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`❌ Erro ao buscar visual para cena ${cena.numero}:`, error.message);
    }
  }
  
  return visuais.length > 0 ? visuais : cenas.map(c => ({
    cena: c.numero,
    url: 'https://images.pexels.com/photos/1146134/pexels-photo-1146134.jpeg',
    tipo: 'imagem'
  }));
}

// ============================================
// FUNÇÃO: Gerar Imagens com IA (Multi-provider: Stable Horde / Pollinations / Pexels)
// ============================================

// Helper: gerar imagem via Stable Horde (grátis, sem API key)
async function gerarImagemStableHorde(prompt, cenaNum) {
  const HORDE_API = 'https://stablehorde.net/api/v2';
  const HORDE_KEY = '0000000000'; // Anonymous key

  // 1. Enviar request de geração
  const genResp = await axios.post(`${HORDE_API}/generate/async`, {
    prompt: prompt + ' ### badly drawn, blurry, low quality, text, watermark, logo',
    params: {
      width: 1024,
      height: 576, // 16:9 aspect ratio
      steps: 25,
      cfg_scale: 7,
      sampler_name: 'k_euler_a',
      seed: String(Math.floor(Math.random() * 999999999))
    },
    nsfw: false,
    models: ['Deliberate', 'stable_diffusion', 'Anything Diffusion', 'SDXL 1.0'],
    r2: true,
    shared: false
  }, {
    headers: { 'apikey': HORDE_KEY, 'Content-Type': 'application/json' },
    timeout: 30000
  });

  const jobId = genResp.data.id;
  if (!jobId) throw new Error('Stable Horde não retornou job ID');
  console.log(`   🔄 Cena ${cenaNum}: Job ${jobId} enviado ao Stable Horde...`);

  // 2. Polling até completar (máx 5 min)
  const startTime = Date.now();
  const MAX_WAIT = 300000; // 5 min
  while (Date.now() - startTime < MAX_WAIT) {
    await new Promise(r => setTimeout(r, 5000)); // Check every 5s

    const checkResp = await axios.get(`${HORDE_API}/generate/check/${jobId}`, {
      timeout: 10000
    });
    const { done, wait_time, queue_position, processing } = checkResp.data;

    if (done) {
      // 3. Buscar resultado
      const resultResp = await axios.get(`${HORDE_API}/generate/status/${jobId}`, {
        timeout: 30000
      });
      const generations = resultResp.data.generations;
      if (generations && generations.length > 0 && generations[0].img) {
        // A imagem pode ser uma URL (R2) ou base64
        const imgData = generations[0].img;
        if (imgData.startsWith('http')) {
          // Download da URL R2
          const imgResp = await axios.get(imgData, { responseType: 'arraybuffer', timeout: 30000 });
          return Buffer.from(imgResp.data);
        } else {
          // Base64
          return Buffer.from(imgData, 'base64');
        }
      }
      throw new Error('Resultado sem imagem');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    if (queue_position > 0) {
      console.log(`   ⏳ Cena ${cenaNum}: fila=${queue_position}, espera~${wait_time}s (${elapsed}s decorridos)`);
    }
  }
  throw new Error(`Timeout de ${MAX_WAIT/1000}s esperando Stable Horde`);
}

// Helper: gerar imagem via Pollinations (backup)
async function gerarImagemPollinations(prompt, cenaNum) {
  const seed = Math.floor(Math.random() * 999999);
  const encodedPrompt = encodeURIComponent(prompt.substring(0, 200));
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080&nologo=true&seed=${seed}`;
  
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    headers: { 'User-Agent': 'VideoForge/1.0' }
  });
  
  if (resp.status === 200 && resp.data.length > 1000) {
    return Buffer.from(resp.data);
  }
  throw new Error(`Pollinations: status=${resp.status}, size=${resp.data?.length || 0}`);
}

async function buscarVisuaisAI(cenas) {
  console.log(`🎨 [AI Images] Gerando ${cenas.length} imagens com IA...`);
  const visuais = [];
  const imgDir = resolve(MEDIA_DIR, 'temp', 'ai_images');
  await fs.mkdir(imgDir, { recursive: true });

  for (const cena of cenas) {
    try {
      // Gerar prompt visual detalhado com Gemini
      let imagePrompt = '';
      try {
        const promptGen = `You are an expert visual prompt engineer for AI image generation (Stable Diffusion).
Based on this video scene narration, create a SINGLE detailed image prompt in English.

Narration: "${cena.texto_narracao}"
Visual description: "${cena.prompt_visual || ''}"

Rules:
- Write 20-40 words of detailed visual description
- Focus on concrete visual elements, lighting, mood, composition
- Use Stable Diffusion style terms: cinematic lighting, highly detailed, photorealistic, 8k uhd, masterpiece
- Do NOT include any text/words/letters in the image
- Return ONLY the prompt text, nothing else

Prompt:`;
        const geminiResult = await chamarGemini(promptGen, 15000);
        imagePrompt = geminiResult?.trim()?.replace(/^["']|["']$/g, '')?.substring(0, 400) || '';
      } catch (geminiErr) {
        console.warn(`⚠️ Gemini falhou para cena ${cena.numero}, usando prompt_visual direto`);
      }

      if (!imagePrompt) {
        imagePrompt = (cena.prompt_visual || cena.texto_narracao)
          .replace(/[^\w\s.,!?-]/g, ' ').substring(0, 200);
        imagePrompt += ', cinematic lighting, photorealistic, highly detailed, 8k uhd, masterpiece';
      }

      console.log(`🖼️ Cena ${cena.numero}: Gerando imagem IA...`);
      console.log(`   Prompt: "${imagePrompt.substring(0, 80)}..."`);

      // Tentar providers em ordem: Stable Horde → Pollinations → Pexels
      let imageBuffer = null;
      let provider = '';

      // Provider 1: Stable Horde (mais confiável)
      try {
        imageBuffer = await gerarImagemStableHorde(imagePrompt, cena.numero);
        provider = 'StableHorde';
      } catch (shErr) {
        console.warn(`   ⚠️ Stable Horde falhou cena ${cena.numero}: ${shErr.message}`);
        
        // Provider 2: Pollinations
        try {
          imageBuffer = await gerarImagemPollinations(imagePrompt, cena.numero);
          provider = 'Pollinations';
        } catch (pErr) {
          console.warn(`   ⚠️ Pollinations falhou cena ${cena.numero}: ${pErr.message}`);
        }
      }

      if (imageBuffer && imageBuffer.length > 1000) {
        const localImgPath = resolve(imgDir, `cena_${cena.numero}_${Date.now()}.png`);
        await fs.writeFile(localImgPath, imageBuffer);
        const dockerImgPath = `/media/temp/ai_images/${basename(localImgPath)}`;

        visuais.push({
          cena: cena.numero,
          url: 'local',
          localPath: dockerImgPath,
          tipo: 'imagem',
          descricao: imagePrompt.substring(0, 100)
        });
        console.log(`✅ Cena ${cena.numero}: Imagem IA gerada via ${provider} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
      } else {
        throw new Error('Nenhum provider de imagem IA funcionou');
      }

      // Delay entre gerações para não sobrecarregar
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`❌ Erro gerar imagem IA cena ${cena.numero}:`, error.message);
      // Fallback final: Pexels
      try {
        if (PEXELS_API_KEY && PEXELS_API_KEY !== 'sua_chave_aqui') {
          let query = '';
          try {
            const kwText = await chamarGemini(`Generate 3 English keywords for Pexels image search based on: "${cena.texto_narracao.substring(0, 100)}". Return ONLY keywords separated by space.`, 8000);
            query = kwText?.trim()?.replace(/["'\n]/g, '')?.substring(0, 50) || '';
          } catch {}
          if (!query) query = (cena.prompt_visual || cena.texto_narracao).substring(0, 40);
          
          const resp = await axios.get('https://api.pexels.com/v1/search', {
            params: { query, per_page: 3, orientation: 'landscape' },
            headers: { Authorization: PEXELS_API_KEY }
          });
          if (resp.data.photos?.[0]) {
            visuais.push({
              cena: cena.numero,
              url: resp.data.photos[0].src.large2x,
              tipo: 'imagem',
              descricao: 'fallback pexels'
            });
            console.log(`🔄 Cena ${cena.numero}: Fallback Pexels usado`);
          }
        }
      } catch (fbErr) {
        console.error(`❌ Fallback Pexels também falhou para cena ${cena.numero}`);
      }
    }
  }

  if (visuais.length === 0) {
    throw new Error('Nenhuma imagem foi gerada com sucesso');
  }

  console.log(`🎨 [AI Images] ${visuais.length}/${cenas.length} imagens geradas com sucesso`);
  return visuais;
}

// ============================================
// FUNÇÃO: Gerar Imagens com Flux.1 (Replicate) ou DALL-E 3 (OpenAI)
// ============================================
async function gerarVisuaisFlux1DALLE(cenas, videoId, provider) {
  console.log(`🎨 [${provider}] Gerando ${cenas.length} imagens com IA premium...`);
  const visuais = [];
  const imgDir = resolve(MEDIA_DIR, 'temp', 'ai_images');
  await fs.mkdir(imgDir, { recursive: true });

  for (const cena of cenas) {
    try {
      let prompt = cena.prompt_visual || cena.texto_narracao;
      // Enriquecer prompt com Gemini
      try {
        const p = await chamarGemini(
          `Create a concise, vivid image prompt in English (max 60 words) for this scene: "${cena.texto_narracao.substring(0,200)}". Focus on visual elements, lighting, mood. Return ONLY the prompt.`,
          10000
        );
        if (p && p.trim()) prompt = p.trim().replace(/^["']|["']$/g, '');
      } catch {}

      let imageBuffer = null;

      if (provider === 'flux1' && process.env.REPLICATE_API_TOKEN) {
        // Flux.1-schnell via Replicate (~$0.003/imagem)
        const createResp = await axios.post(
          'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
          { input: { prompt, width: 1280, height: 720, num_inference_steps: 4, output_format: 'jpg' } },
          { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        let prediction = createResp.data;
        // Poll até completar (max 90s)
        for (let i = 0; i < 18; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const poll = await axios.get(`https://api.replicate.com/v1/predictions/${prediction.id}`,
            { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } });
          prediction = poll.data;
          if (prediction.status === 'succeeded') break;
          if (prediction.status === 'failed') throw new Error(`Flux.1 falhou: ${prediction.error}`);
        }
        const imgUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        const imgResp = await axios.get(imgUrl, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(imgResp.data);

      } else if (provider === 'dalle3' && process.env.OPENAI_API_KEY) {
        // DALL-E 3 (~$0.04/imagem)
        const resp = await axios.post(
          'https://api.openai.com/v1/images/generations',
          { model: 'dall-e-3', prompt: prompt.substring(0, 1000), size: '1792x1024', quality: 'standard', n: 1 },
          { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' } }
        );
        const imgResp = await axios.get(resp.data.data[0].url, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(imgResp.data);
      }

      if (imageBuffer && imageBuffer.length > 1000) {
        const localImgPath = resolve(imgDir, `cena_${cena.numero}_${Date.now()}.jpg`);
        await fs.writeFile(localImgPath, imageBuffer);
        visuais.push({
          cena: cena.numero,
          url: 'local',
          localPath: `/media/temp/ai_images/${basename(localImgPath)}`,
          tipo: 'imagem',
          descricao: prompt.substring(0, 100)
        });
        console.log(`✅ Cena ${cena.numero}: ${provider} OK (${(imageBuffer.length/1024).toFixed(0)}KB)`);
      } else {
        throw new Error(`${provider}: buffer vazio`);
      }
    } catch (err) {
      console.warn(`⚠️ ${provider} falhou cena ${cena.numero}: ${err.message} — usando Pexels fallback`);
      // Fallback Pexels
      try {
        const kw = (cena.prompt_visual || cena.texto_narracao).substring(0, 40);
        const r = await axios.get('https://api.pexels.com/v1/search',
          { params: { query: kw, per_page: 3, orientation: 'landscape' }, headers: { Authorization: process.env.PEXELS_API_KEY } });
        if (r.data.photos?.[0]) visuais.push({ cena: cena.numero, url: r.data.photos[0].src.large2x, tipo: 'imagem', descricao: 'fallback pexels' });
      } catch {}
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (visuais.length === 0) throw new Error('Nenhuma imagem premium gerada com sucesso');
  console.log(`🎨 [${provider}] ${visuais.length}/${cenas.length} imagens OK`);
  return visuais;
}

// ============================================
// FUNÇÃO: Gerar Legendas Automáticas com Whisper (GRÁTIS - local)
// ============================================
async function gerarSubtitulos(videoId, audioPaths) {
  const hostSrtPath = resolve(MEDIA_DIR, 'temp', `${videoId}.srt`);
  const dockerSrtPath = `/media/temp/${videoId}.srt`;

  const scriptContent = `
import sys, subprocess, os, json

audio_path = sys.argv[1]
srt_path = sys.argv[2]

try:
    from faster_whisper import WhisperModel
    model = WhisperModel('small', device='cpu', compute_type='int8')
    segments, info = model.transcribe(audio_path, language='pt', beam_size=5)
    segments = list(segments)
    print(f'Whisper: {len(segments)} segmentos, idioma={info.language}')

    def fmt(t):
        h = int(t // 3600); m = int((t % 3600) // 60); s = int(t % 60); ms = int((t - int(t)) * 1000)
        return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

    with open(srt_path, 'w', encoding='utf-8') as f:
        for i, seg in enumerate(segments, 1):
            f.write(f'{i}\\n{fmt(seg.start)} --> {fmt(seg.end)}\\n{seg.text.strip()}\\n\\n')

    print(f'SRT gerado: {srt_path} ({len(segments)} legendas)')
except ImportError:
    print('AVISO: faster-whisper não instalado — legendas ignoradas')
except Exception as e:
    print(f'ERRO Whisper: {e}')
`;

  const scriptPath = resolve(MEDIA_DIR, 'temp', `${videoId}_whisper.py`);
  await fs.writeFile(scriptPath, scriptContent, 'utf-8');

  try {
    const cmd = makeExecCmd(`python /media/temp/${videoId}_whisper.py "${audioPaths.docker}" "${dockerSrtPath}"`);
    const { stdout } = await execAsync(cmd, { timeout: 300000 });
    console.log('💬 Whisper:', stdout.trim());
    try { await fs.access(hostSrtPath); return { host: hostSrtPath, docker: dockerSrtPath }; } catch {}
  } catch (err) {
    console.warn('⚠️ Legendas Whisper falharam (não crítico):', err.message.substring(0, 200));
  }
  return null;
}

// ============================================
// FUNÇÃO: Buscar Música de Fundo via Pixabay (GRÁTIS)
// ============================================
async function gerarMusicaFundo(videoId, nicho, duracaoTotalSeg) {
  if (!process.env.PIXABAY_API_KEY) return null;

  const generoMap = {
    curiosidades: 'documentary', tecnologia: 'electronic', historia: 'cinematic',
    ciencia: 'ambient', natureza: 'nature', politica: 'corporate', default: 'background music'
  };
  const q = generoMap[nicho?.toLowerCase()] || generoMap.default;
  const musicHostPath = resolve(MEDIA_DIR, 'temp', `${videoId}_music.mp3`);
  const musicDockerPath = `/media/temp/${videoId}_music.mp3`;

  try {
    const resp = await axios.get('https://pixabay.com/api/videos/', {
      params: { key: process.env.PIXABAY_API_KEY, q, video_type: 'music', per_page: 20 }
    });
    const hits = (resp.data.hits || []).filter(h => h.duration >= Math.min(duracaoTotalSeg, 30));
    if (!hits.length) {
      // Se não achar com duração, pega qualquer resultado
      const all = resp.data.hits || [];
      if (!all.length) return null;
      hits.push(...all.slice(0, 3));
    }
    const track = hits[Math.floor(Math.random() * Math.min(hits.length, 5))];
    const audioUrl = track.videos?.medium?.url || track.pageURL;
    if (!audioUrl) return null;

    const audioResp = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
    await fs.writeFile(musicHostPath, Buffer.from(audioResp.data));
    console.log(`🎵 Música de fundo: "${track.tags}" (${track.duration}s) via Pixabay`);
    return { host: musicHostPath, docker: musicDockerPath };
  } catch (err) {
    console.warn('⚠️ Música Pixabay falhou (não crítico):', err.message.substring(0, 150));
    return null;
  }
}

// ============================================
// FUNÇÃO: Gerar Thumbnail Automática
// ============================================
async function gerarThumbnail(videoId, roteiro, visuais) {
  const thumbHostPath = resolve(MEDIA_DIR, 'temp', `${videoId}_thumb.jpg`);
  const thumbDockerPath = `/media/temp/${videoId}_thumb.jpg`;

  // Tentar gerar com Flux.1/DALL-E se disponível
  if ((process.env.REPLICATE_API_TOKEN || process.env.OPENAI_API_KEY) && roteiro.thumbnail_prompt) {
    try {
      const provider = process.env.OPENAI_API_KEY ? 'dalle3' : 'flux1';
      const thumbVisuais = await gerarVisuaisFlux1DALLE(
        [{ numero: 1, prompt_visual: roteiro.thumbnail_prompt, texto_narracao: roteiro.titulo }],
        `${videoId}_thumb`, provider
      );
      if (thumbVisuais[0]?.localPath) {
        const src = resolve(MEDIA_DIR, 'temp', 'ai_images', basename(thumbVisuais[0].localPath));
        try { await fs.copyFile(src, thumbHostPath); } catch { await fs.rename(src, thumbHostPath); }
        console.log(`🖼️ Thumbnail gerada com ${provider}`);
        return { host: thumbHostPath, docker: thumbDockerPath };
      }
    } catch (err) {
      console.warn('⚠️ Thumbnail AI falhou, usando Pillow template:', err.message.substring(0, 100));
    }
  }

  // Fallback: Pillow template com primeira imagem da cena + título sobreposto
  const primeiraImg = visuais?.[0];
  if (!primeiraImg) return null;

  const scriptContent = `
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont

img_source = sys.argv[1]
title = sys.argv[2][:80]
output = sys.argv[3]

try:
    img = Image.open(img_source).convert('RGB').resize((1280, 720), Image.LANCZOS)
    draw = ImageDraw.Draw(img)

    # Gradiente escuro na parte inferior
    for y in range(360, 720):
        alpha = int(200 * (y - 360) / 360)
        draw.rectangle([(0, y), (1280, y+1)], fill=(0, 0, 0, alpha))

    # Tentar fonte bold, fallback para padrão
    font = None
    for fname in ['/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        try: font = ImageFont.truetype(fname, 64); break
        except: pass
    if not font: font = ImageFont.load_default()

    # Quebrar título em linhas de ~30 chars
    words = title.split()
    lines = []
    line = ''
    for w in words:
        if len(line + ' ' + w) > 30 and line:
            lines.append(line.strip())
            line = w
        else:
            line += ' ' + w
    if line: lines.append(line.strip())

    # Desenhar sombra + texto
    y_start = 580 - len(lines) * 70
    for i, ln in enumerate(lines):
        y = y_start + i * 74
        draw.text((42, y+3), ln, font=font, fill=(0,0,0))  # sombra
        draw.text((40, y), ln, font=font, fill=(255,255,255))

    img.save(output, 'JPEG', quality=92)
    print(f'Thumbnail gerada: {output}')
except Exception as e:
    print(f'ERRO thumbnail Pillow: {e}')
`;

  const scriptPath = resolve(MEDIA_DIR, 'temp', `${videoId}_thumbnail.py`);
  await fs.writeFile(scriptPath, scriptContent, 'utf-8');

  const imgSource = primeiraImg.localPath || '';
  const titulo = (roteiro.titulo || '').replace(/"/g, "'");
  try {
    const cmd = makeExecCmd(`python /media/temp/${videoId}_thumbnail.py "${imgSource}" "${titulo}" "${thumbDockerPath}"`);
    await execAsync(cmd, { timeout: 30000 });
    await fs.access(thumbHostPath);
    console.log(`🖼️ Thumbnail gerada via Pillow`);
    return { host: thumbHostPath, docker: thumbDockerPath };
  } catch (err) {
    console.warn('⚠️ Thumbnail Pillow falhou:', err.message.substring(0, 100));
    return null;
  }
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Avatar D-ID (PAGO)
// ============================================
async function gerarVideoAvatar(videoId, roteiro, audioPaths) {
  if (!process.env.DID_API_KEY) throw new Error('DID_API_KEY não configurada');
  const presenterUrl = process.env.DID_PRESENTER_URL;
  if (!presenterUrl) throw new Error('DID_PRESENTER_URL não configurada');

  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  await fs.mkdir(resolve(MEDIA_DIR, 'videos'), { recursive: true });

  const authHeader = `Basic ${Buffer.from(process.env.DID_API_KEY + ':').toString('base64')}`;

  // 1. Fazer upload do áudio para obter URL acessível pelo D-ID
  // D-ID exige multipart/form-data para o upload de áudio
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('audio', createReadStream(audioPaths.host), {
    filename: `${videoId}.mp3`,
    contentType: 'audio/mpeg'
  });

  const uploadResp = await axios.post('https://api.d-id.com/audios', form, {
    headers: {
      Authorization: authHeader,
      ...form.getHeaders()
    }
  });
  const audioUrl = uploadResp.data.url;
  console.log(`🎧 D-ID audio upload: ${audioUrl}`);

  // 2. Criar o talk
  const talkResp = await axios.post('https://api.d-id.com/talks', {
    source_url: presenterUrl,
    script: { type: 'audio', audio_url: audioUrl },
    config: { stitch: true }
  }, { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } });

  const talkId = talkResp.data.id;
  console.log(`🎭 D-ID talk criado: ${talkId}`);

  // 3. Poll até completar (max 10 min)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const poll = await axios.get(`https://api.d-id.com/talks/${talkId}`,
      { headers: { Authorization: authHeader } });
    const status = poll.data.status;
    if (status === 'done') {
      const videoUrl = poll.data.result_url;
      const videoResp = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      await fs.writeFile(hostVideoPath, Buffer.from(videoResp.data));
      console.log(`✅ D-ID avatar vídeo gerado: ${hostVideoPath}`);
      return { docker: dockerVideoPath, host: hostVideoPath };
    }
    if (status === 'error') throw new Error(`D-ID falhou: ${poll.data.error?.description}`);
    console.log(`⏳ D-ID status: ${status} (${i+1}/60)`);
  }
  throw new Error('D-ID timeout após 10 minutos');
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Veo 3 (Google Vertex AI)
// ============================================
async function gerarVideoVeo(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎬 [Veo 3] Iniciando geração de vídeo para ${videoId}...`);
  
  // 1. Obter autenticação do Google
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const accessToken = await auth.getAccessToken();
  const projectId = await auth.getProjectId();
  
  const VEO_MODEL = 'veo-3.0-generate-001';
  const LOCATION = 'us-central1';
  const BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${VEO_MODEL}`;
  
  // 2. Para cada cena, gerar um clipe de vídeo com Veo
  const clipPaths = [];
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/veo_clips/${videoId}_cena${cenaNum}.mp4`;
    
    // Construir prompt detalhado para Veo baseado no roteiro
    const veoPrompt = `${cena.prompt_visual || cena.descricao_visual || ''}.
Estilo: animação de bonecos palito (stick figure) com fundo colorido.
Movimento fluido e expressivo. ${cena.acao || ''}.
Contexto: ${cena.texto_narrado || cena.narracaoTexto || ''}`.trim();
    
    console.log(`  🎥 [Veo 3] Cena ${cenaNum}: "${veoPrompt.substring(0, 80)}..."`);
    
    try {
      // 2a. Enviar solicitação de geração (long-running operation)
      const generateResponse = await axios.post(
        `${BASE_URL}:predictLongRunning`,
        {
          instances: [{ prompt: veoPrompt }],
          parameters: {
            aspectRatio: '16:9',
            durationSeconds: 8,
            sampleCount: 1,
            personGeneration: 'allow_adult',
            generateAudio: false,
            resolution: '720p'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          timeout: 120000
        }
      );
      
      const operationName = generateResponse.data.name;
      console.log(`  ⏳ [Veo 3] Cena ${cenaNum} - Operação: ${operationName}`);
      
      // 2b. Polling até completar (max 8 minutos por cena)
      let done = false;
      let videoData = null;
      let videoEntry = null;
      const maxAttempts = 96; // 96 x 5s = 8 minutos
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, 5000)); // Esperar 5 segundos
        
        try {
          const statusResponse = await axios.post(
            `${BASE_URL}:fetchPredictOperation`,
            { operationName },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              timeout: 60000
            }
          );
          
          if (statusResponse.data.done) {
            // Extrair dados de vídeo de múltiplos formatos possíveis
            const resp = statusResponse.data.response || statusResponse.data.result || statusResponse.data;
            const videos = resp?.videos || resp?.predictions || [];
            const filtered = resp?.raiMediaFilteredCount || 0;
            
            if (videos.length > 0) {
              const entry = videos[0];
              if (entry.bytesBase64Encoded || entry.gcsUri) {
                done = true;
                videoData = resp;
                videoEntry = entry;
                console.log(`  ✅ [Veo 3] Cena ${cenaNum} - Vídeo gerado! (tentativa ${attempt + 1})`);
                break;
              }
            }
            
            // done=true mas sem vídeo utilizável — pode ser RAI ou dados pendentes
            if (filtered > 0) {
              console.warn(`  ⚠️ [Veo 3] Cena ${cenaNum} - Filtrado pelo RAI (${filtered} vídeos). Pulando...`);
              break;
            }
            
            // done=true mas resposta vazia — esperar mais (pode estar finalizando encoding)
            if (attempt < maxAttempts - 1) {
              console.log(`  ⏳ [Veo 3] Cena ${cenaNum} - done=true mas sem dados de vídeo, aguardando... (${(attempt + 1) * 5}s)`);
              // Não fazer break, continuar polling — às vezes o encoding demora
              continue;
            }
          }
          
          if (attempt % 6 === 0) {
            console.log(`  ⏳ [Veo 3] Cena ${cenaNum} - Aguardando... (${attempt * 5}s)`);
          }
        } catch (pollErr) {
          console.warn(`  ⚠️ [Veo 3] Erro no polling cena ${cenaNum}: ${pollErr.message}`);
        }
      }
      
      if (!done || !videoEntry) {
        console.error(`  ❌ [Veo 3] Cena ${cenaNum} - Timeout/sem vídeo após ${maxAttempts * 5}s de polling`);
        continue;
      }
      const clipHostPath = resolve(MEDIA_DIR, 'veo_clips', `${videoId}_cena${cenaNum}.mp4`);
      
      // Garantir diretório existe
      await fs.mkdir(resolve(MEDIA_DIR, 'veo_clips'), { recursive: true });
      
      if (videoEntry.bytesBase64Encoded) {
        // Vídeo retornado em base64 (sem storageUri)
        const buffer = Buffer.from(videoEntry.bytesBase64Encoded, 'base64');
        await fs.writeFile(clipHostPath, buffer);
        console.log(`  💾 [Veo 3] Cena ${cenaNum} - Salvo (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
      } else if (videoEntry.gcsUri) {
        // Vídeo em Cloud Storage - baixar via gsutil ou API
        console.log(`  ☁️ [Veo 3] Cena ${cenaNum} - Baixando de ${videoEntry.gcsUri}...`);
        const gcsUrl = videoEntry.gcsUri.replace('gs://', 'https://storage.googleapis.com/');
        const downloadResp = await axios.get(gcsUrl, { 
          responseType: 'arraybuffer',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          timeout: 120000
        });
        await fs.writeFile(clipHostPath, downloadResp.data);
        console.log(`  💾 [Veo 3] Cena ${cenaNum} - Baixado (${(downloadResp.data.length / 1024 / 1024).toFixed(1)}MB)`);
      }
      
      clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
      
    } catch (veoErr) {
      console.error(`  ❌ [Veo 3] Cena ${cenaNum} - Erro: ${veoErr.response?.data?.error?.message || veoErr.message}`);
      // Continuar com as próximas cenas
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('Veo 3: Nenhuma cena foi gerada com sucesso. Verifique as credenciais e cotas do Vertex AI.');
  }
  
  console.log(`🎬 [Veo 3] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  // 3. Concatenar todos os clips via FFmpeg (Docker)
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListPath = `/media/veo_clips/${videoId}_concat.txt`;
  const concatListHost = resolve(MEDIA_DIR, 'veo_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatOutputDocker = `/media/veo_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'veo_clips', `${videoId}_concat.mp4`);
  
  // Concatenar clips
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  console.log(`  🔗 [Veo 3] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  // 4. Mesclar áudio + vídeo (loopear vídeo para cobrir duração total do áudio)
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [Veo 3] Mesclando áudio (loop vídeo para cobrir narração completa)...`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  // 5. Limpar clips temporários
  try {
    for (const clip of clipPaths) {
      await fs.unlink(clip.host).catch(() => {});
    }
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
    console.log(`  🧹 [Veo 3] Clips temporários removidos`);
  } catch (cleanErr) {
    console.warn(`  ⚠️ [Veo 3] Erro ao limpar temporários: ${cleanErr.message}`);
  }
  
  console.log(`✅ [Veo 3] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Sora (OpenAI)
// ============================================
async function gerarVideoSora(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎬 [Sora] Iniciando geração de vídeo para ${videoId}...`);
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada no .env');
  }
  
  await fs.mkdir(resolve(MEDIA_DIR, 'sora_clips'), { recursive: true });
  
  const clipPaths = [];
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/sora_clips/${videoId}_cena${cenaNum}.mp4`;
    
    const soraPrompt = `${cena.prompt_visual || ''}.
Context: ${cena.texto_narracao || ''}`.trim().substring(0, 500);
    
    console.log(`  🎥 [Sora] Cena ${cenaNum}: "${soraPrompt.substring(0, 80)}..."`);
    
    try {
      // Enviar solicitação para Sora API
      const generateResponse = await axios.post(
        'https://api.openai.com/v1/videos/generations',
        {
          model: 'sora',
          prompt: soraPrompt,
          size: '1920x1080',
          duration: 8,
          n: 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          timeout: 600000 // 10 minutos
        }
      );
      
      const videoUrl = generateResponse.data?.data?.[0]?.url;
      if (!videoUrl) {
        console.error(`  ❌ [Sora] Cena ${cenaNum} - Nenhum vídeo retornado`);
        continue;
      }
      
      // Baixar vídeo
      const clipHostPath = resolve(MEDIA_DIR, 'sora_clips', `${videoId}_cena${cenaNum}.mp4`);
      const downloadResp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
      await fs.writeFile(clipHostPath, downloadResp.data);
      console.log(`  💾 [Sora] Cena ${cenaNum} - Salvo (${(downloadResp.data.length / 1024 / 1024).toFixed(1)}MB)`);
      
      clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
      
    } catch (soraErr) {
      const errMsg = soraErr.response?.data?.error?.message || soraErr.message;
      console.error(`  ❌ [Sora] Cena ${cenaNum} - Erro: ${errMsg}`);
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('Sora: Nenhuma cena foi gerada. Verifique a API key e cota da OpenAI.');
  }
  
  console.log(`🎬 [Sora] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  // Concatenar clips
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'sora_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/sora_clips/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/sora_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'sora_clips', `${videoId}_concat.mp4`);
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  console.log(`  🔗 [Sora] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  // Mesclar áudio (loop vídeo para cobrir narração completa)
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [Sora] Mesclando áudio (loop vídeo)...`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  // Limpar temporários
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
    console.log(`  🧹 [Sora] Clips temporários removidos`);
  } catch (cleanErr) {
    console.warn(`  ⚠️ [Sora] Erro ao limpar: ${cleanErr.message}`);
  }
  
  console.log(`✅ [Sora] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Replicate API (Wan - requer créditos)
// ============================================
async function gerarVideoReplicate(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎬 [Replicate] Iniciando geração de vídeo para ${videoId}...`);
  
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN não configurada no .env');
  }
  
  await fs.mkdir(resolve(MEDIA_DIR, 'replicate_clips'), { recursive: true });
  
  const MODEL = process.env.REPLICATE_MODEL || 'wan-video/wan2.1-t2v-480p';
  
  const clipPaths = [];
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/replicate_clips/${videoId}_cena${cenaNum}.mp4`;
    
    const prompt = `${cena.prompt_visual || cena.descricao_visual || ''}.
${cena.acao || ''}`.trim().substring(0, 500);
    
    console.log(`  🎥 [Replicate] Cena ${cenaNum}: "${prompt.substring(0, 80)}..."`);
    console.log(`  🔄 [Replicate] Usando modelo: ${MODEL}`);
    
    // Retry em caso de rate limiting
    let createResp;
    for (let retry = 0; retry < 3; retry++) {
      try {
        createResp = await axios.post(
          `https://api.replicate.com/v1/models/${MODEL}/predictions`,
          {
            input: {
              prompt: prompt,
              num_frames: 41,
              aspect_ratio: '16:9',
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json',
              'Prefer': 'wait=120'
            },
            timeout: 600000
          }
        );
        break; // sucesso, sair do retry loop
      } catch (retryErr) {
        const status = retryErr.response?.status;
        if (status === 429) {
          const waitSec = retryErr.response?.data?.retry_after || 15;
          console.log(`  ⏳ [Replicate] Rate limited, aguardando ${waitSec}s...`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
          continue;
        }
        if (status === 402) {
          throw new Error('Créditos insuficientes na conta Replicate. Adicione créditos em https://replicate.com/account/billing');
        }
        throw retryErr;
      }
    }
    
    if (!createResp) {
      throw new Error(`Replicate: Falha ao criar prediction para cena ${cenaNum} após 3 tentativas de rate-limit.`);
    }
    
    let prediction = createResp.data;
    
    // Se não veio com resultado, fazer polling
    if (prediction.status !== 'succeeded' && prediction.urls?.get) {
      const maxAttempts = 120; // 10 minutos (120 x 5s)
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollResp = await axios.get(prediction.urls.get, {
          headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
          timeout: 30000
        });
        prediction = pollResp.data;
        
        if (i % 6 === 0) console.log(`  ⏳ [Replicate] Cena ${cenaNum} - ${prediction.status} (${i * 5}s)`);
        
        if (prediction.status === 'succeeded') break;
        if (prediction.status === 'failed' || prediction.status === 'canceled') {
          throw new Error(`Replicate: Geração da cena ${cenaNum} falhou — ${prediction.error || 'erro desconhecido'}`);
        }
      }
    }
    
    if (prediction.status !== 'succeeded') {
      throw new Error(`Replicate: Timeout na geração da cena ${cenaNum} (aguardou 10 minutos).`);
    }
    
    // Baixar vídeo (output pode ser string ou array)
    const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (!videoUrl) {
      throw new Error(`Replicate: Cena ${cenaNum} gerada mas sem URL de vídeo no retorno.`);
    }
    
    const clipHostPath = resolve(MEDIA_DIR, 'replicate_clips', `${videoId}_cena${cenaNum}.mp4`);
    const downloadResp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
    await fs.writeFile(clipHostPath, downloadResp.data);
    console.log(`  💾 [Replicate] Cena ${cenaNum} - Salvo (${(downloadResp.data.length / 1024 / 1024).toFixed(1)}MB)`);
    
    clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
    
    // Esperar entre cenas para evitar rate limiting
    if (cenaNum < roteiro.cenas.length) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('Replicate: Nenhuma cena foi gerada. Verifique a API token e cota.');
  }
  
  console.log(`🎬 [Replicate] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  // Concatenar + mesclar áudio (mesmo padrão do Sora/Veo)
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'replicate_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/replicate_clips/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/replicate_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'replicate_clips', `${videoId}_concat.mp4`);
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  console.log(`  🔗 [Replicate] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [Replicate] Mesclando áudio...`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  // Limpar temporários
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
  } catch {}
  
  console.log(`✅ [Replicate] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Gerar JWT para Kling AI
// ============================================
function gerarKlingJWT(accessKeyId, accessKeySecret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: accessKeyId, exp: now + 1800, nbf: now - 5 })).toString('base64url');
  const signature = createHmac('sha256', accessKeySecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Kling AI
// Modelos: kling-v1, kling-v1-5, kling-v1-6
// API: https://api.klingai.com
// ============================================
async function gerarVideoKling(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎥 [Kling] Iniciando geração de vídeo para ${videoId}...`);
  
  const KLING_ACCESS_KEY_ID = process.env.KLING_ACCESS_KEY_ID;
  const KLING_ACCESS_KEY_SECRET = process.env.KLING_ACCESS_KEY_SECRET;
  if (!KLING_ACCESS_KEY_ID || !KLING_ACCESS_KEY_SECRET) {
    throw new Error('KLING_ACCESS_KEY_ID e KLING_ACCESS_KEY_SECRET não configuradas no .env. Crie suas chaves em: https://platform.klingai.com/account/developer');
  }
  
  await fs.mkdir(resolve(MEDIA_DIR, 'kling_clips'), { recursive: true });
  
  const KLING_MODEL = process.env.KLING_MODEL || 'kling-v1-6';  // kling-v1, kling-v1-5, kling-v1-6
  const KLING_MODE = process.env.KLING_MODE || 'std';            // std ou pro
  const BASE_URL = 'https://api.klingai.com/v1/videos/text2video';
  
  const clipPaths = [];
  const MAX_RETRIES = 3; // retries por cena em caso de erro de rede
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/kling_clips/${videoId}_cena${cenaNum}.mp4`;
    const clipHostPath = resolve(MEDIA_DIR, 'kling_clips', `${videoId}_cena${cenaNum}.mp4`);
    
    // RETOMADA: Se o clip já existe no disco, pular geração
    try {
      const stat = await fs.stat(clipHostPath);
      if (stat.size > 10000) { // maior que 10KB = válido
        const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
        console.log(`  ⏩ [Kling] Cena ${cenaNum} - Já existe (${sizeMB}MB), pulando!`);
        clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
        continue;
      }
    } catch { /* arquivo não existe, gerar normalmente */ }
    
    const prompt = `${cena.prompt_visual || cena.descricao_visual || ''}. ${cena.acao || ''}`
      .trim().substring(0, 2500);
    
    let cenaGerada = false;
    
    for (let retry = 0; retry <= MAX_RETRIES && !cenaGerada; retry++) {
      if (retry > 0) {
        const waitSec = retry * 15;
        console.log(`  🔄 [Kling] Cena ${cenaNum} - Retry ${retry}/${MAX_RETRIES} (aguardando ${waitSec}s para reconexão...)`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      }
      
      console.log(`  🎥 [Kling] Cena ${cenaNum}: "${prompt.substring(0, 80)}..."`);
      
      try {
        // Gerar novo JWT para cada requisição (expira em 30min)
        const jwt = gerarKlingJWT(KLING_ACCESS_KEY_ID, KLING_ACCESS_KEY_SECRET);
        
        // Criar tarefa de geração
        const createResp = await axios.post(
          BASE_URL,
          {
            model: KLING_MODEL,
            prompt: prompt,
            duration: '5',
            aspect_ratio: '16:9',
            mode: KLING_MODE,
            cfg_scale: 0.5,
          },
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        );
        
        if (createResp.data.code !== 0) {
          throw new Error(`Kling API erro: ${createResp.data.message}`);
        }
        
        const taskId = createResp.data.data?.task_id;
        if (!taskId) throw new Error('Kling: task_id não retornado');
        
        console.log(`  ⏳ [Kling] Cena ${cenaNum} - Task ID: ${taskId}`);
        
        // Polling (max 10 minutos)
        const maxAttempts = 120;
        let done = false;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(r => setTimeout(r, 5000));
          
          try {
            const newJwt = gerarKlingJWT(KLING_ACCESS_KEY_ID, KLING_ACCESS_KEY_SECRET);
            const statusResp = await axios.get(
              `${BASE_URL}/${taskId}`,
              {
                headers: { 'Authorization': `Bearer ${newJwt}` },
                timeout: 30000,
              }
            );
            
            if (statusResp.data.code !== 0) {
              if (attempt % 12 === 0) console.warn(`  ⚠️ [Kling] Cena ${cenaNum} - Polling erro: ${statusResp.data.message}`);
              continue;
            }
            
            const taskData = statusResp.data.data;
            const status = taskData?.task_status;
            
            if (status === 'succeed') {
              const videoUrl = taskData?.task_result?.videos?.[0]?.url;
              if (!videoUrl) throw new Error(`Kling: Cena ${cenaNum} concluída mas sem URL`);
              
              const downloadResp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
              await fs.writeFile(clipHostPath, downloadResp.data);
              const sizeMB = (downloadResp.data.byteLength / 1024 / 1024).toFixed(1);
              console.log(`  ✅ [Kling] Cena ${cenaNum} - Gerado! (${sizeMB}MB, ${attempt * 5}s)`);
              clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
              done = true;
              cenaGerada = true;
              break;
            } else if (status === 'failed') {
              throw new Error(`Kling: Cena ${cenaNum} falhou — ${taskData?.task_status_msg || 'erro desconhecido'}`);
            }
            
            if (attempt % 6 === 0) console.log(`  ⏳ [Kling] Cena ${cenaNum} - ${status} (${attempt * 5}s)`);
          } catch (pollErr) {
            // Erro de rede no polling — espera e tenta de novo
            const isNetworkErr = pollErr.code === 'ENOTFOUND' || pollErr.code === 'ECONNRESET' || pollErr.code === 'ETIMEDOUT' || pollErr.code === 'ECONNREFUSED';
            if (isNetworkErr) {
              if (attempt % 6 === 0) console.warn(`  ⚠️ [Kling] Cena ${cenaNum} - Erro de rede no polling, tentando novamente... (${pollErr.code})`);
              await new Promise(r => setTimeout(r, 10000)); // espera 10s extra
              continue;
            }
            throw pollErr; // erro diferente de rede, propagar
          }
        }
        
        if (!done) {
          console.error(`  ❌ [Kling] Cena ${cenaNum} - Timeout`);
        }
        
      } catch (klingErr) {
        const errMsg = klingErr.response?.data?.message || klingErr.message;
        const isNetworkErr = klingErr.code === 'ENOTFOUND' || klingErr.code === 'ECONNRESET' || klingErr.code === 'ETIMEDOUT' || klingErr.code === 'ECONNREFUSED';
        if (isNetworkErr && retry < MAX_RETRIES) {
          console.warn(`  ⚠️ [Kling] Cena ${cenaNum} - Erro de rede: ${errMsg} — tentando retry...`);
          continue; // vai para o próximo retry
        }
        console.error(`  ❌ [Kling] Cena ${cenaNum} - Erro: ${errMsg}`);
      }
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('Kling AI: Nenhuma cena foi gerada. Verifique KLING_ACCESS_KEY_ID e KLING_ACCESS_KEY_SECRET no .env');
  }
  
  console.log(`🎥 [Kling] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'kling_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/kling_clips/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/kling_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'kling_clips', `${videoId}_concat.mp4`);
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
  } catch {}
  
  console.log(`✅ [Kling] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Hugging Face Inference API (GRATUITO)
// ============================================
async function gerarVideoHuggingFace(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎬 [HuggingFace] Iniciando geração de vídeo para ${videoId}...`);
  
  const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
  if (!HF_TOKEN) {
    throw new Error('HUGGINGFACE_API_TOKEN não configurada no .env');
  }
  
  await fs.mkdir(resolve(MEDIA_DIR, 'hf_clips'), { recursive: true });
  
  const clipPaths = [];
  // Modelos de vídeo via HF Inference Providers (router.huggingface.co)
  // Requer créditos pré-pagos na conta HF - não é mais gratuito
  const PROVIDERS = ['fal-ai', 'novita', 'replicate'];
  const MODEL = 'Wan-AI/Wan2.2-T2V-A14B';
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/hf_clips/${videoId}_cena${cenaNum}.mp4`;
    
    const prompt = `${cena.prompt_visual || cena.descricao_visual || ''}.
${cena.acao || ''}`.trim().substring(0, 300);
    
    console.log(`  🎥 [HuggingFace] Cena ${cenaNum}: "${prompt.substring(0, 80)}..."`);
    
    let generated = false;
    
    for (const provider of PROVIDERS) {
      try {
        console.log(`  🔄 [HuggingFace] Tentando provider: ${provider}...`);
        
        const response = await axios.post(
          `https://router.huggingface.co/${provider}/models/${MODEL}`,
          { inputs: prompt },
          {
            headers: {
              'Authorization': `Bearer ${HF_TOKEN}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 600000, // 10 minutos
            maxContentLength: 500 * 1024 * 1024
          }
        );
        
        // Se veio JSON (erro ou status), tentar parse
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          const jsonStr = Buffer.from(response.data).toString('utf-8');
          const jsonData = JSON.parse(jsonStr);
          
          if (jsonData.error) {
            console.warn(`  ⚠️ [HuggingFace] ${provider}: ${jsonData.error}`);
            if (jsonData.estimated_time) {
              console.log(`  ⏳ Modelo carregando (~${Math.ceil(jsonData.estimated_time)}s)...`);
              await new Promise(r => setTimeout(r, Math.min(jsonData.estimated_time * 1000, 120000)));
              const retry = await axios.post(
                `https://router.huggingface.co/${provider}/models/${MODEL}`,
                { inputs: prompt },
                {
                  headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
                  responseType: 'arraybuffer',
                  timeout: 600000
                }
              );
              if (!(retry.headers['content-type'] || '').includes('json') && retry.data.length > 10000) {
                const clipHostPath = resolve(MEDIA_DIR, 'hf_clips', `${videoId}_cena${cenaNum}.mp4`);
                await fs.writeFile(clipHostPath, retry.data);
                console.log(`  💾 [HuggingFace] Cena ${cenaNum} - Salvo (${(retry.data.length / 1024 / 1024).toFixed(1)}MB)`);
                clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
                generated = true;
                break;
              }
            }
            continue;
          }
        }
        
        // Vídeo binário retornado
        if (response.data.length > 10000) {
          const clipHostPath = resolve(MEDIA_DIR, 'hf_clips', `${videoId}_cena${cenaNum}.mp4`);
          await fs.writeFile(clipHostPath, response.data);
          console.log(`  💾 [HuggingFace] Cena ${cenaNum} - Salvo (${(response.data.length / 1024 / 1024).toFixed(1)}MB)`);
          clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
          generated = true;
          break;
        }
        
      } catch (hfErr) {
        const status = hfErr.response?.status;
        let errMsg = hfErr.message;
        
        // Tentar parsear erro JSON do response
        if (hfErr.response?.data) {
          try {
            const errData = JSON.parse(Buffer.from(hfErr.response.data).toString('utf-8'));
            errMsg = errData.error || errMsg;
          } catch {}
        }
        
        if (status === 402) errMsg = 'Créditos pré-pagos necessários';
        else if (status === 503) errMsg = 'Modelo carregando...';
        else if (status === 429) errMsg = 'Rate limit atingido';
        else if (status === 410) errMsg = 'Modelo removido/indisponível';
        else if (status === 400) errMsg = 'Provider não suporta este modelo';
        
        console.warn(`  ⚠️ [HuggingFace] ${provider}: ${errMsg} (HTTP ${status || 'N/A'})`);
        continue;
      }
    }
    
    if (!generated) {
      console.error(`  ❌ [HuggingFace] Cena ${cenaNum} - Nenhum provider conseguiu gerar`);
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('HuggingFace: Nenhuma cena foi gerada. Verifique o token e tente novamente mais tarde (modelos gratuitos podem ter fila).');
  }
  
  console.log(`🎬 [HuggingFace] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'hf_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/hf_clips/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/hf_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'hf_clips', `${videoId}_concat.mp4`);
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  console.log(`  🔗 [HuggingFace] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [HuggingFace] Mesclando áudio...`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
  } catch {}
  
  console.log(`✅ [HuggingFace] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Gerar Vídeo com Google AI Studio / Gemini Veo (GRATUITO free tier)
// ============================================
async function gerarVideoGeminiVeo(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎬 [Gemini Veo] Iniciando geração de vídeo para ${videoId}...`);
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no .env');
  }
  
  await fs.mkdir(resolve(MEDIA_DIR, 'gemini_clips'), { recursive: true });
  
  const clipPaths = [];
  // Usar veo-2.0 que está disponível no free tier do AI Studio
  const MODEL = 'veo-2.0-generate-001';
  const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/gemini_clips/${videoId}_cena${cenaNum}.mp4`;
    
    const prompt = `${cena.prompt_visual || cena.descricao_visual || ''}.
${cena.acao || ''}. ${cena.texto_narracao || ''}`.trim().substring(0, 480);
    
    console.log(`  🎥 [Gemini Veo] Cena ${cenaNum}: "${prompt.substring(0, 80)}..."`);
    
    try {
      // Enviar request de geração
      const genResp = await axios.post(
        `${BASE_URL}:predictLongRunning?key=${apiKey}`,
        {
          instances: [{ prompt: prompt }],
          parameters: {
            aspectRatio: '16:9',
            durationSeconds: 8,
            sampleCount: 1,
            personGeneration: 'allow_adult',
            generateAudio: false
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000
        }
      );
      
      const operationName = genResp.data.name;
      if (!operationName) {
        // Resposta direta (sem LRO) — tentar extrair vídeo imediatamente
        const videos = genResp.data?.videos || genResp.data?.predictions || [];
        if (videos.length > 0 && videos[0].bytesBase64Encoded) {
          const clipHostPath = resolve(MEDIA_DIR, 'gemini_clips', `${videoId}_cena${cenaNum}.mp4`);
          await fs.writeFile(clipHostPath, Buffer.from(videos[0].bytesBase64Encoded, 'base64'));
          clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
          console.log(`  ✅ [Gemini Veo] Cena ${cenaNum} - Gerado!`);
          continue;
        }
        console.error(`  ❌ [Gemini Veo] Cena ${cenaNum} - Sem operação e sem vídeo`);
        continue;
      }
      
      console.log(`  ⏳ [Gemini Veo] Cena ${cenaNum} - Operação: ${operationName}`);
      
      // Polling (max 8 minutos)
      const maxAttempts = 96;
      let done = false;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        
        try {
          // Usar fetchPredictOperation ou polling direto
          const statusResp = await axios.post(
            `${BASE_URL}:fetchPredictOperation?key=${apiKey}`,
            { operationName },
            { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
          );
          
          if (statusResp.data.done) {
            const resp = statusResp.data.response || statusResp.data.result || statusResp.data;
            const videos = resp?.videos || resp?.predictions || [];
            const filtered = resp?.raiMediaFilteredCount || 0;
            
            if (videos.length > 0) {
              const entry = videos[0];
              if (entry.bytesBase64Encoded) {
                const clipHostPath = resolve(MEDIA_DIR, 'gemini_clips', `${videoId}_cena${cenaNum}.mp4`);
                await fs.writeFile(clipHostPath, Buffer.from(entry.bytesBase64Encoded, 'base64'));
                const sizeMB = (Buffer.from(entry.bytesBase64Encoded, 'base64').length / 1024 / 1024).toFixed(1);
                console.log(`  ✅ [Gemini Veo] Cena ${cenaNum} - Gerado! (${sizeMB}MB, tentativa ${attempt + 1})`);
                clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
                done = true;
                break;
              }
              if (entry.gcsUri) {
                // Baixar do GCS
                const downloadResp = await axios.get(entry.gcsUri, { responseType: 'arraybuffer', timeout: 120000 });
                const clipHostPath = resolve(MEDIA_DIR, 'gemini_clips', `${videoId}_cena${cenaNum}.mp4`);
                await fs.writeFile(clipHostPath, downloadResp.data);
                console.log(`  ✅ [Gemini Veo] Cena ${cenaNum} - Baixado GCS (${(downloadResp.data.length / 1024 / 1024).toFixed(1)}MB)`);
                clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
                done = true;
                break;
              }
            }
            
            if (filtered > 0) {
              console.warn(`  ⚠️ [Gemini Veo] Cena ${cenaNum} - Filtrado pelo RAI`);
            }
            break; // done==true mas sem vídeo
          }
          
          if (attempt % 6 === 0) console.log(`  ⏳ [Gemini Veo] Cena ${cenaNum} - Aguardando... (${attempt * 5}s)`);
          
        } catch (pollErr) {
          if (attempt % 12 === 0) console.warn(`  ⚠️ [Gemini Veo] Polling erro: ${pollErr.message}`);
        }
      }
      
      if (!done) {
        console.error(`  ❌ [Gemini Veo] Cena ${cenaNum} - Timeout/sem vídeo`);
      }
      
    } catch (veoErr) {
      const errMsg = veoErr.response?.data?.error?.message || veoErr.message;
      console.error(`  ❌ [Gemini Veo] Cena ${cenaNum} - Erro: ${errMsg}`);
      // Se for erro de billing, propagar imediatamente
      if (errMsg.includes('billing') || errMsg.includes('FAILED_PRECONDITION') || errMsg.includes('exclusively available')) {
        throw new Error(`Gemini Veo requer GCP billing ativado: ${errMsg}`);
      }
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('Gemini Veo: Nenhuma cena foi gerada. O modelo veo-2.0 requer GCP billing ativado na sua conta Google Cloud. Use outro tipo de vídeo (ex: Pexels/imagens).');
  }
  
  console.log(`🎬 [Gemini Veo] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'gemini_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/gemini_clips/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/gemini_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'gemini_clips', `${videoId}_concat.mp4`);
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  console.log(`  🔗 [Gemini Veo] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [Gemini Veo] Mesclando áudio...`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
  } catch {}
  
  console.log(`✅ [Gemini Veo] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Gerar Vídeo com IA Local / Open Source (Docker AI Worker - CPU)
// Modelos: ModelScope T2V, ZeroScope v2, CogVideoX-2b
// Com monitoramento de progresso em tempo real
// ============================================

// Helper: executa docker exec com spawn e parsing de progresso em tempo real
// Aceita um array de argumentos do docker (sem shell intermediário = sem problemas de aspas)
// Em modo NO_DOCKER: dockerArgs = ['exec', 'videoforge-python-worker', 'python3', ...] → roda python3 ... diretamente
function spawnDockerAI(dockerArgs, video, cenaNum, totalCenas, timeoutMs = 7200000) {
  return new Promise((resolve, reject) => {
    let cmd, args;
    if (NO_DOCKER) {
      // Pular 'exec' e 'videoforge-python-worker' — rodar o restante direto
      const directArgs = dockerArgs[0] === 'exec' ? dockerArgs.slice(2) : dockerArgs;
      [cmd, ...args] = directArgs;
    } else {
      cmd = DOCKER_CMD;
      args = dockerArgs;
    }
    const proc = spawn(cmd, args, {
      timeout: timeoutMs,
      env: { ...process.env },
      windowsHide: true
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // Parsear marcadores de progresso: __PROGRESS__{json}__END_PROGRESS__
      const progressMatches = chunk.match(/__PROGRESS__(.+?)__END_PROGRESS__/g);
      if (progressMatches && video) {
        for (const match of progressMatches) {
          try {
            const jsonStr = match.replace('__PROGRESS__', '').replace('__END_PROGRESS__', '');
            const prog = JSON.parse(jsonStr);
            
            // Calcular progresso geral: base 50% + (cena_progress / totalCenas) * 35%
            const cenaProgress = prog.percent / 100;
            const overallBase = 50;
            const overallRange = 35; // 50% a 85%
            const cenaWeight = 1 / totalCenas;
            const completedCenas = (cenaNum - 1) / totalCenas;
            const currentProgress = overallBase + (completedCenas + cenaWeight * cenaProgress) * overallRange;
            
            video.progresso = Math.round(Math.min(currentProgress, 85));
            
            if (prog.phase === 'download') {
              video.etapa = `⬇️ Baixando modelo ${prog.model} (primeira vez)...`;
            } else {
              video.etapa = `🤖 Cena ${cenaNum}/${totalCenas} — Step ${prog.step}/${prog.total_steps} (${prog.percent}%) — ETA: ${prog.eta_fmt}`;
            }
          } catch (e) {
            // Ignorar erro de parse
          }
        }
      }
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `Processo terminou com código ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
    
    // Timeout manual
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Timeout: geração excedeu ${timeoutMs/60000} minutos`));
    }, timeoutMs);
    
    proc.on('close', () => clearTimeout(timer));
  });
}

// ============================================
// FUNÇÃO: Gerar Vídeo Dark Stickman
// Estilo canais dark: texto animado + efeitos + narração grave + música dark
// ============================================
async function gerarVideoDarkStickman(videoId, roteiro, audioPaths) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🎬 [Dark Stickman] Iniciando geração para ${videoId}...`);
  
  await fs.mkdir(resolve(MEDIA_DIR, 'dark_scenes'), { recursive: true });
  
  const clipPaths = [];
  
  // Mapear keywords para tipos de cena
  const detectSceneType = (cena) => {
    const text = (cena.texto_narracao + ' ' + cena.descricao_visual + ' ' + (cena.prompt_visual || '')).toLowerCase();
    
    if (text.includes('croatoan') || text.includes('palavra') || text.includes('gravada')) return 'mystery';
    if (text.includes('navio') || text.includes('ship') || text.includes('colonos chegando')) return 'ship';
    if (text.includes('vila') || text.includes('casas') || text.includes('abandonada') || text.includes('colonial')) return 'village';
    if (text.includes('floresta') || text.includes('árvore') || text.includes('mata')) return 'forest';
    if (text.includes('117') || text.includes('pessoas') || text.includes('colonos') || text.includes('grupo')) return 'grupo';
    if (text.includes('sozinho') || text.includes('solitário') || text.includes('vazio') || text.includes('desapareceram')) return 'sozinho';
    
    return 'sozinho'; // Default
  };
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/dark_scenes/${videoId}_cena${cenaNum}.mp4`;
    const clipHost = resolve(MEDIA_DIR, 'dark_scenes', `${videoId}_cena${cenaNum}.mp4`);
    
    // Texto da narração (o que será falado)
    const text = cena.texto_narracao || cena.descricao_visual || 'Cena';
    const sceneType = detectSceneType(cena);
    const duration = cena.duracao || 3.0;
    
    console.log(`  🎥 [Dark Stickman] Cena ${cenaNum}: "${text.substring(0, 50)}..." (tipo: ${sceneType}, ${duration}s)`);
    
    // Criar cena com stickman figures animados
    const cmd = makeExecCmd(`python3 /app/draw_stickman_scene.py "${text.replace(/"/g, '\\"')}" "${sceneType}" "${clipDocker}" ${duration}`);
    
    try {
      await execAsync(cmd, { timeout: 180000, maxBuffer: 50 * 1024 * 1024 }); // 3 min timeout para renderizar frames
      clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHost });
      console.log(`  ✅ [Dark Stickman] Cena ${cenaNum} criada`);
    } catch (err) {
      console.error(`  ❌ [Dark Stickman] Erro na cena ${cenaNum}: ${err.message}`);
      throw new Error(`Falha ao criar cena ${cenaNum}: ${err.message}`);
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('Dark Stickman: Nenhuma cena foi criada.');
  }
  
  console.log(`🎬 [Dark Stickman] ${clipPaths.length}/${roteiro.cenas.length} cenas criadas. Concatenando...`);
  
  // Concatenar cenas
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'dark_scenes', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/dark_scenes/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/dark_scenes/${videoId}_concat.mp4`;
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c copy "${concatOutputDocker}"`);
  console.log(`  🔗 [Dark Stickman] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 });
  
  // Mesclar com áudio (narração)
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [Dark Stickman] Mesclando áudio...`);
  await execAsync(mergeCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  // Limpar temporários
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(resolve(MEDIA_DIR, 'dark_scenes', `${videoId}_concat.mp4`)).catch(() => {});
  } catch {}
  
  console.log(`✅ [Dark Stickman] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

async function gerarVideoLocal(videoId, roteiro, audioPaths, video) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  console.log(`🤖 [Local AI] Iniciando geração de vídeo local para ${videoId}...`);
  console.log(`⚠️  [Local AI] Geração em CPU é LENTA (10-60min por cena). Aguarde...`);
  
  // Modelo configurável via .env (padrão: modelscope - mais rápido)
  const AI_MODEL = process.env.LOCAL_AI_MODEL || 'modelscope';
  const AI_STEPS = parseInt(process.env.LOCAL_AI_STEPS || '5'); // Menos steps = mais rápido (CPU: 5 recomendado)
  const AI_GUIDANCE = parseFloat(process.env.LOCAL_AI_GUIDANCE || '9.0');
  
  console.log(`  📋 Modelo: ${AI_MODEL}, Steps: ${AI_STEPS}, Guidance: ${AI_GUIDANCE}`);
  
  await fs.mkdir(resolve(MEDIA_DIR, 'local_clips'), { recursive: true });
  
  const clipPaths = [];
  
  for (const cena of roteiro.cenas) {
    const cenaNum = cena.numero;
    const clipDocker = `/media/local_clips/${videoId}_cena${cenaNum}.mp4`;
    const clipHostPath = resolve(MEDIA_DIR, 'local_clips', `${videoId}_cena${cenaNum}.mp4`);
    
    const prompt = `${cena.prompt_visual || cena.descricao_visual || ''}.
${cena.acao || ''}. ${cena.texto_narracao || ''}`.trim().substring(0, 500);
    
    console.log(`  🎥 [Local AI] Cena ${cenaNum}/${roteiro.cenas.length}: "${prompt.substring(0, 80)}..."`);
    
    if (video) {
      video.etapa = `🤖 Cena ${cenaNum}/${roteiro.cenas.length} — Preparando modelo...`;
    }
    
    try {
      // Limpar o prompt para passar como argumento direto (sem shell)
      const safePrompt = prompt.replace(/\n/g, ' ').trim();
      
      // Array de args para docker exec (sem shell intermediário = sem problemas de aspas no Windows)
      const dockerArgs = [
        'exec', 'videoforge-ai-worker',
        'python', '/app/generate_video.py',
        '--prompt', safePrompt,
        '--output', clipDocker,
        '--model', AI_MODEL,
        '--steps', String(AI_STEPS),
        '--guidance', String(AI_GUIDANCE)
      ];
      
      const startTime = Date.now();
      const { stdout, stderr } = await spawnDockerAI(dockerArgs, video, cenaNum, roteiro.cenas.length, 7200000);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Verificar resultado via JSON no stdout
      const jsonMatch = stdout.match(/__RESULT_JSON__(.+?)__END_JSON__/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[1]);
        if (result.status === 'error') {
          throw new Error(result.error);
        }
      }
      
      // Verificar se arquivo foi criado
      try {
        await fs.access(clipHostPath);
        const stats = await fs.stat(clipHostPath);
        console.log(`  💾 [Local AI] Cena ${cenaNum} - OK (${(stats.size / 1024 / 1024).toFixed(1)}MB, ${elapsed}s)`);
        clipPaths.push({ cena: cenaNum, docker: clipDocker, host: clipHostPath });
      } catch {
        console.error(`  ❌ [Local AI] Cena ${cenaNum} - Arquivo não foi criado`);
      }
      
    } catch (genErr) {
      const errMsg = genErr.message?.substring(0, 200) || 'Erro desconhecido';
      console.error(`  ❌ [Local AI] Cena ${cenaNum} - Erro: ${errMsg}`);
    }
  }
  
  if (clipPaths.length === 0) {
    throw new Error('IA Local: Nenhuma cena foi gerada. Verifique se o container ai-worker está rodando (docker compose up ai-worker).');
  }
  
  console.log(`🎬 [Local AI] ${clipPaths.length}/${roteiro.cenas.length} cenas geradas. Concatenando...`);
  
  if (video) {
    video.etapa = `🔗 Concatenando ${clipPaths.length} cenas e mesclando áudio...`;
    video.progresso = 86;
  }
  
  // Concatenar clips + mesclar áudio (mesmo padrão Replicate/Sora)
  const concatListContent = clipPaths.map(c => `file '${c.docker}'`).join('\n');
  const concatListHost = resolve(MEDIA_DIR, 'local_clips', `${videoId}_concat.txt`);
  await fs.writeFile(concatListHost, concatListContent);
  
  const concatListDocker = `/media/local_clips/${videoId}_concat.txt`;
  const concatOutputDocker = `/media/local_clips/${videoId}_concat.mp4`;
  const concatOutputHost = resolve(MEDIA_DIR, 'local_clips', `${videoId}_concat.mp4`);
  
  const concatCmd = makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${concatListDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${concatOutputDocker}"`);
  console.log(`  🔗 [Local AI] Concatenando ${clipPaths.length} clips...`);
  await execAsync(concatCmd, { timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
  
  const audioDocker = audioPaths.docker;
  const mergeCmd = makeExecCmd(`ffmpeg -y -stream_loop -1 -i "${concatOutputDocker}" -i "${audioDocker}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`);
  console.log(`  🔊 [Local AI] Mesclando áudio...`);
  await execAsync(mergeCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 });
  
  // Limpar temporários
  try {
    for (const clip of clipPaths) await fs.unlink(clip.host).catch(() => {});
    await fs.unlink(concatListHost).catch(() => {});
    await fs.unlink(concatOutputHost).catch(() => {});
  } catch {}
  
  console.log(`✅ [Local AI] Vídeo final: ${hostVideoPath}`);
  return { docker: dockerVideoPath, host: hostVideoPath };
}

// ============================================
// FUNÇÃO: Renderizar Vídeo com FFmpeg (via Docker) - sincronizado por cena
// ============================================
async function renderizarVideo(videoId, roteiro, audioPaths, visuais, subtitlePaths = null, musicaPaths = null) {
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const hostVideoPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
  
  await fs.mkdir(resolve(MEDIA_DIR, 'videos'), { recursive: true });
  await fs.mkdir(resolve(MEDIA_DIR, 'temp', videoId), { recursive: true });
  
  // Salvar visuais como JSON
  const visuaisPath = resolve(MEDIA_DIR, 'temp', `${videoId}_visuais.json`);
  await fs.writeFile(visuaisPath, JSON.stringify(visuais), 'utf-8');

  const dockerSrtPath = subtitlePaths?.docker || '';
  const dockerMusicPath = musicaPaths?.docker || '';
  
  // Durações já foram salvas pelo TTS. Se não existirem, usar durações padrão.
  const duracoesPath = resolve(MEDIA_DIR, 'temp', `${videoId}_duracoes.json`);
  try {
    await fs.access(duracoesPath);
    console.log('✅ Usando durações do TTS');
  } catch {
    // Fallback: criar arquivo com durações padrão se o TTS não gerou
    const duracoes = audioPaths.duracoesCenas || roteiro.cenas.map(() => 8);
    await fs.writeFile(duracoesPath, JSON.stringify(duracoes), 'utf-8');
    console.log('⚠️ Usando durações padrão (8s por cena)');
  }

  const scriptContent = `
import json, subprocess, os, requests, sys, math

video_id = sys.argv[1]
audio_path = sys.argv[2]
visuais_path = sys.argv[3]
output_path = sys.argv[4]
duracoes_path = sys.argv[5]

visuais = json.load(open(visuais_path))
duracoes = json.load(open(duracoes_path))

temp_dir = f'/media/temp/{video_id}'
os.makedirs(temp_dir, exist_ok=True)

# Baixar imagens e PRE-REDIMENSIONAR para 1920x1080
imagens = []
for i, v in enumerate(visuais):
    raw_path = f'{temp_dir}/cena_{i+1}_raw.jpg'
    img_path = f'{temp_dir}/cena_{i+1}.jpg'
    try:
        # Se tem localPath (imagem IA já salva), usar direto
        if v.get('localPath') and os.path.exists(v['localPath']):
            import shutil
            shutil.copy2(v['localPath'], raw_path)
            print(f'Imagem {i+1} copiada de arquivo local: {v.get("descricao", "")[:50]}')
        else:
            r = requests.get(v['url'], timeout=60)
            r.raise_for_status()
            with open(raw_path, 'wb') as f:
                f.write(r.content)
            print(f'Imagem {i+1} baixada: {v.get("descricao", "")[:50]}')
        
        # Pre-redimensionar para 1920x1080 (zoompan fica MUITO mais rapido)
        resize = subprocess.run([
            'ffmpeg', '-y', '-i', raw_path,
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
            '-q:v', '2', img_path
        ], capture_output=True, timeout=30)
        
        if resize.returncode == 0:
            os.remove(raw_path)
            imagens.append(img_path)
            print(f'Imagem {i+1} redimensionada OK: {v.get("descricao", "")[:50]}')
        else:
            # Se redimensionar falhar, usar a original
            os.rename(raw_path, img_path)
            imagens.append(img_path)
            print(f'Imagem {i+1} baixada (sem resize): {v.get("descricao", "")[:50]}')
    except Exception as e:
        print(f'Erro imagem {i+1}: {e}')

if not imagens:
    print('ERRO: Nenhuma imagem baixada')
    sys.exit(1)

# Garantir que temos durações para cada imagem
while len(duracoes) < len(imagens):
    duracoes.append(8.0)

import random

# Renderizar cada cena com efeito Ken Burns (zoom/pan alternado) + fade in/out
clips = []
effects = ['zoom_in', 'zoom_out', 'zoom_in_left', 'zoom_out_right']
total_cenas = len(imagens)
print(f'Renderizando {total_cenas} cenas com Ken Burns...')

for i, img in enumerate(imagens):
    dur = max(duracoes[i] + 0.5, 3.0)
    frames = int(dur * 25)
    clip_path = f'{temp_dir}/clip_{i+1}.mp4'
    fade_out_start = max(dur - 0.6, 0.5)
    
    effect = effects[i % len(effects)]
    zoom_speed = 0.12 / frames  # zoom suave de 12%
    
    # Ken Burns com efeitos seguros (zoom + centro/canto) - sem pan puro
    if effect == 'zoom_in':
        zp = f"zoompan=z='min(zoom+{zoom_speed:.6f},1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps=25"
    elif effect == 'zoom_out':
        zp = f"zoompan=z='if(lte(on,1),1.12,max(zoom-{zoom_speed:.6f},1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps=25"
    elif effect == 'zoom_in_left':
        # Zoom in partindo do canto superior esquerdo
        zp = f"zoompan=z='min(zoom+{zoom_speed:.6f},1.12)':x='iw*0.15-(iw*0.15/zoom)':y='ih*0.15-(ih*0.15/zoom)':d={frames}:s=1920x1080:fps=25"
    else:  # zoom_out_right
        # Zoom out revelando a partir do canto inferior direito
        zp = f"zoompan=z='if(lte(on,1),1.12,max(zoom-{zoom_speed:.6f},1.0))':x='iw*0.85-(iw/zoom/2)':y='ih*0.85-(ih/zoom/2)':d={frames}:s=1920x1080:fps=25"
    
    # Pre-scale para dar margem ao zoompan + fade suave
    vf = f"scale=2208:1242,{zp},fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out_start}:d=0.6"
    
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-t', str(dur), '-i', img,
        '-vf', vf,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
        '-pix_fmt', 'yuv420p', '-r', '25', '-t', str(dur),
        clip_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode == 0:
        # Verificar se o clip tem tamanho razoavel (>10KB)
        clip_size = os.path.getsize(clip_path)
        if clip_size > 10000:
            clips.append(clip_path)
            print(f'Clip {i+1}/{total_cenas}: {dur:.1f}s OK ({effect}) [{clip_size//1024}KB]')
        else:
            print(f'Clip {i+1} muito pequeno ({clip_size}B), usando fallback...')
            result = type('', (), {'returncode': 1})()  # forcar fallback
    
    if result.returncode != 0:
        # Fallback: escala simples + fade (sem zoompan)
        print(f'Zoompan falhou cena {i+1}, usando fallback simples...')
        cmd_simple = [
            'ffmpeg', '-y',
            '-loop', '1', '-t', str(dur), '-i', img,
            '-vf',
            f'scale=1920:1080:force_original_aspect_ratio=increase,'
            f'crop=1920:1080,setsar=1:1,'
            f'fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out_start}:d=0.5',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
            '-pix_fmt', 'yuv420p', '-r', '25', '-t', str(dur),
            clip_path
        ]
        result2 = subprocess.run(cmd_simple, capture_output=True, text=True, timeout=120)
        if result2.returncode == 0 and os.path.getsize(clip_path) > 10000:
            clips.append(clip_path)
            print(f'Clip {i+1}/{total_cenas}: {dur:.1f}s OK (fallback)')
        else:
            print(f'ERRO clip {i+1}: pulando cena')

if not clips:
    print('ERRO: Nenhum clip renderizado')
    sys.exit(1)

print(f'{len(clips)}/{total_cenas} clips prontos. Concatenando...')

# Concatenar com concat demuxer (rapido e confiavel, fade ja esta nos clips)
if len(clips) == 1:
    concat_video = clips[0]
else:
    concat_list = f'{temp_dir}/clips_list.txt'
    with open(concat_list, 'w') as f:
        for c in clips:
            f.write(f"file '{c}'\\n")
    concat_video = f'{temp_dir}/video_concat.mp4'
    concat_result = subprocess.run([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c', 'copy', '-movflags', '+faststart',
        concat_video
    ], capture_output=True, text=True, timeout=300)
    if concat_result.returncode != 0:
        print(f'Concat stderr: {concat_result.stderr[-500:]}')
        sys.exit(1)
    print(f'Concat OK: {os.path.getsize(concat_video)//1024//1024}MB')

# Mesclar com áudio final (+ música de fundo e legendas opcionais)
srt_path = sys.argv[6] if len(sys.argv) > 6 else ''
music_path = sys.argv[7] if len(sys.argv) > 7 else ''

has_srt = bool(srt_path and os.path.exists(srt_path))
has_music = bool(music_path and os.path.exists(music_path))

if has_music:
    # Dois áudios: narração (100%) + música de fundo (25%) com loop se necessário
    filter_audio = '[1:a]volume=1.0[narracao];[2:a]volume=0.25,aloop=loop=-1:size=2*44100[musica];[narracao][musica]amix=inputs=2:duration=first[audio]'
    cmd_final = [
        'ffmpeg', '-y',
        '-i', concat_video, '-i', audio_path, '-i', music_path,
        '-filter_complex', filter_audio,
        '-map', '0:v', '-map', '[audio]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-shortest', '-movflags', '+faststart',
        output_path
    ]
elif has_srt:
    cmd_final = [
        'ffmpeg', '-y',
        '-i', concat_video, '-i', audio_path,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-shortest', '-movflags', '+faststart',
        output_path
    ]
else:
    cmd_final = [
        'ffmpeg', '-y',
        '-i', concat_video, '-i', audio_path,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-shortest', '-movflags', '+faststart',
        output_path
    ]

result = subprocess.run(cmd_final, capture_output=True, text=True, timeout=600)
if result.returncode != 0:
    print(f'FFmpeg final stderr:')
    print(result.stderr[-1500:])
    sys.exit(1)

# Burn-in de legendas se disponíveis (pós-processo separado para maior compatibilidade)
if has_srt:
    output_final = output_path.replace('.mp4', '_leg.mp4')
    srt_escaped = srt_path.replace('\\\\', '/').replace(':', '\\\\:')
    cmd_srt = [
        'ffmpeg', '-y', '-i', output_path,
        '-vf', f"subtitles={srt_path}:force_style='FontSize=20,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Bold=1,Alignment=2'",
        '-c:a', 'copy', '-movflags', '+faststart',
        output_final
    ]
    result2 = subprocess.run(cmd_srt, capture_output=True, text=True, timeout=600)
    if result2.returncode == 0 and os.path.getsize(output_final) > 100000:
        os.replace(output_final, output_path)
        print('Legendas aplicadas com sucesso')
    else:
        print(f'Aviso: burn-in de legendas falhou, usando vídeo sem legendas: {result2.stderr[-300:]}')
        try: os.remove(output_final)
        except: pass

size = os.path.getsize(output_path)
print(f'Video pronto: {output_path} ({size // 1024 // 1024}MB)')
`;

  const scriptPath = resolve(MEDIA_DIR, 'temp', `${videoId}_render.py`);
  await fs.writeFile(scriptPath, scriptContent, 'utf-8');
  
  const dockerScriptPath = `/media/temp/${videoId}_render.py`;
  const dockerVisuaisPath = `/media/temp/${videoId}_visuais.json`;
  const dockerDuracoesPath = `/media/temp/${videoId}_duracoes.json`;
  const dockerAudioPath = audioPaths.docker;

  const cmd = makeExecCmd(`python ${dockerScriptPath} "${videoId}" "${dockerAudioPath}" "${dockerVisuaisPath}" "${dockerVideoPath}" "${dockerDuracoesPath}" "${dockerSrtPath}" "${dockerMusicPath}"`);

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 1800000, maxBuffer: 50 * 1024 * 1024 });
    console.log('🎬 Render output:', stdout.trim());
    
    // Verificar que o vídeo existe no host
    await fs.access(hostVideoPath);
    const stats = await fs.stat(hostVideoPath);
    console.log(`✅ Vídeo renderizado: ${hostVideoPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
    return { docker: dockerVideoPath, host: hostVideoPath };
  } catch (error) {
    console.error('❌ Erro ao renderizar:', error.message);
    throw new Error(`Falha ao renderizar vídeo: ${error.message}`);
  }
}

// ============================================
// FUNÇÃO: Renderizar Animação Remotion
// ============================================
async function renderizarAnimacaoRemotion(videoId, cenasCodigo, audioPaths) {
  console.log('🎬 Renderizando animações com Remotion...');
  
  const remotionDir = resolve(__dirname, '..', 'remotion-animations');
  const outputDir = resolve(MEDIA_DIR, 'videos');
  const tempDir = resolve(MEDIA_DIR, 'temp', videoId);
  
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
  
  // Instalar dependências se necessário
  try {
    await fs.access(resolve(remotionDir, 'node_modules'));
  } catch {
    console.log('📦 Instalando dependências Remotion...');
    await execAsync('npm install', { cwd: remotionDir, timeout: 120000 });
  }
  
  const clipsRendered = [];
  
  // Renderizar cada cena individualmente
  for (const cena of cenasCodigo) {
    const clipPath = resolve(tempDir, `clip_${cena.numero}.mp4`);
    
    console.log(`🎨 Renderizando cena ${cena.numero}...`);
    
    const renderCmd = `npx remotion render src/Root.tsx ${cena.componentName} "${clipPath}" --overwrite`;
    
    try {
      const { stdout, stderr } = await execAsync(renderCmd, { 
        cwd: remotionDir,
        timeout: 300000 // 5 minutos por cena (componentes ricos demoram mais)
      });
      
      // Verificar se o arquivo foi criado
      await fs.access(clipPath);
      clipsRendered.push(clipPath);
      console.log(`✅ Cena ${cena.numero} renderizada`);
      
    } catch (error) {
      console.error(`⚠️ Cena ${cena.numero} falhou (pulando): ${error.message.split('\n')[0]}`);
      // Continuar com as cenas restantes em vez de parar
    }
  }
  
  if (clipsRendered.length === 0) {
    throw new Error('Nenhuma cena foi renderizada com sucesso');
  }
  
  console.log(`📊 ${clipsRendered.length}/${cenasCodigo.length} cenas renderizadas com sucesso`);
  
  // Concatenar clips - usar Docker FFmpeg pois o host pode não ter FFmpeg
  // Converter paths do host para paths dentro do container Docker
  const videoId_temp = tempDir.split('/').pop(); // pegar nome do dir
  const dockerTempDir = `/media/temp/${videoId}`;
  
  // Gerar arquivo de lista com paths Docker
  const concatListPath = resolve(tempDir, 'clips_list.txt');
  const concatContent = clipsRendered.map(c => {
    const filename = c.split('/').pop();
    return `file '${dockerTempDir}/${filename}'`;
  }).join('\n');
  await fs.writeFile(concatListPath, concatContent, 'utf-8');
  
  const dockerConcatListPath = `${dockerTempDir}/clips_list.txt`;
  const dockerConcatVideoPath = `${dockerTempDir}/video_concat.mp4`;
  const videoNoAudioPath = resolve(tempDir, 'video_concat.mp4');
  
  console.log('🔗 Concatenando clips via Docker FFmpeg...');
  await execAsync(
    makeExecCmd(`ffmpeg -y -f concat -safe 0 -i "${dockerConcatListPath}" -c copy "${dockerConcatVideoPath}"`),
    { timeout: 180000 }
  );
  
  // Mesclar com áudio via Docker
  const finalVideoPath = resolve(outputDir, `${videoId}.mp4`);
  const dockerVideoPath = `/media/videos/${videoId}.mp4`;
  const dockerAudioPath = audioPaths.docker;
  
  console.log('🎵 Adicionando áudio via Docker FFmpeg...');
  await execAsync(
    makeExecCmd(`ffmpeg -y -i "${dockerConcatVideoPath}" -i "${dockerAudioPath}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${dockerVideoPath}"`),
    { timeout: 180000 }
  );
  
  const stats = await fs.stat(finalVideoPath);
  console.log(`✅ Vídeo final: ${finalVideoPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
  
  return { docker: dockerVideoPath, host: finalVideoPath };
}

// ============================================
// FUNÇÃO: Publicar no YouTube
// ============================================
async function publicarNoYoutube(videoId, videoPaths, roteiro) {
  try {
    const token = youtubeTokens.get('default');
    if (!token) {
      throw new Error('YouTube não autenticado. Configure em Configurações.');
    }
    
    oauth2Client.setCredentials(token);
    
    const filePath = videoPaths.host;
    await fs.access(filePath);
    
    const fileStream = createReadStream(filePath);
    
    // Usar canal selecionado se disponível
    const channelId = youtubeSelectedChannel?.id;
    const tituloYT = (roteiro.titulo || videos.get(videoId)?.titulo || 'Vídeo VideoForge').substring(0, 100).trim() || 'Vídeo VideoForge';
    const descricaoYT = (roteiro.descricao || '').substring(0, 5000).trim();
    const tagsYT = Array.isArray(roteiro.tags) && roteiro.tags.length > 0 ? roteiro.tags : ['videoforge'];
    const snippet = {
      title: tituloYT,
      description: descricaoYT,
      tags: tagsYT,
      categoryId: '22',
      defaultLanguage: 'pt-BR'
    };
    if (channelId) {
      snippet.channelId = channelId;
    }
    
    console.log(`📺 Publicando no canal: ${youtubeSelectedChannel?.title || 'padrão'} (${channelId || 'auto'})`);
    
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet,
        status: {
          privacyStatus: 'private',
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fileStream
      }
    });
    
    console.log(`✅ Vídeo publicado no YouTube: ${response.data.id}`);
    return response.data.id;
    
  } catch (error) {
    console.error('❌ Erro ao publicar no YouTube:', error.message);
    throw error;
  }
}

// Injetar função de upload no módulo de notícias
setPublicarYoutubeFn(publicarNoYoutube);

// ============================================
// ROTAS YOUTUBE OAUTH
// ============================================
app.get('/api/youtube/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly'
    ]
  });
  res.json({ authUrl });
});

app.get('/api/youtube/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    
    youtubeTokens.set('default', tokens);
    oauth2Client.setCredentials(tokens);
    console.log('✅ YouTube autenticado com sucesso');
    
    // Buscar canais da conta autenticada
    try {
      const channelsResp = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        mine: true,
        maxResults: 50
      });
      youtubeChannels = (channelsResp.data.items || []).map(ch => ({
        id: ch.id,
        title: ch.snippet.title,
        description: ch.snippet.description?.substring(0, 100) || '',
        thumbnail: ch.snippet.thumbnails?.default?.url || '',
        subscriberCount: ch.statistics?.subscriberCount || '0',
        videoCount: ch.statistics?.videoCount || '0',
        customUrl: ch.snippet.customUrl || ''
      }));
      
      // Selecionar primeiro canal por padrão
      if (youtubeChannels.length > 0 && !youtubeSelectedChannel) {
        youtubeSelectedChannel = youtubeChannels[0];
      }
      console.log(`📺 ${youtubeChannels.length} canal(is) encontrado(s):`, youtubeChannels.map(c => c.title).join(', '));
    } catch (chErr) {
      console.warn('⚠️ Não foi possível listar canais:', chErr.message);
    }
    
    await salvarTokensYoutube();
    
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>✅ YouTube conectado com sucesso!</h1>
          <p>${youtubeChannels.length} canal(is) encontrado(s). Selecione o canal desejado no painel.</p>
          <script>setTimeout(() => window.close(), 3000)</script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Erro ao autenticar: ' + error.message);
  }
});

app.get('/api/youtube/status', (req, res) => {
  const hasToken = youtubeTokens.has('default');
  res.json({ 
    connected: hasToken,
    channels: youtubeChannels,
    selectedChannel: youtubeSelectedChannel
  });
});

// Listar canais da conta YouTube
app.get('/api/youtube/channels', async (req, res) => {
  try {
    const token = youtubeTokens.get('default');
    if (!token) {
      return res.status(401).json({ error: 'YouTube não autenticado' });
    }
    oauth2Client.setCredentials(token);
    
    const channelsResp = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      mine: true,
      maxResults: 50
    });
    
    youtubeChannels = (channelsResp.data.items || []).map(ch => ({
      id: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description?.substring(0, 100) || '',
      thumbnail: ch.snippet.thumbnails?.default?.url || '',
      subscriberCount: ch.statistics?.subscriberCount || '0',
      videoCount: ch.statistics?.videoCount || '0',
      customUrl: ch.snippet.customUrl || ''
    }));
    
    res.json({ channels: youtubeChannels, selectedChannel: youtubeSelectedChannel });
  } catch (error) {
    console.error('❌ Erro ao listar canais:', error.message);
    res.status(500).json({ error: 'Erro ao listar canais: ' + error.message });
  }
});

// Selecionar canal YouTube
app.post('/api/youtube/select-channel', (req, res) => {
  const { channelId } = req.body;
  const channel = youtubeChannels.find(c => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Canal não encontrado' });
  }
  youtubeSelectedChannel = channel;
  salvarTokensYoutube();
  console.log(`📺 Canal selecionado: ${channel.title} (${channel.id})`);
  res.json({ selectedChannel: channel });
});

// Desconectar YouTube
app.post('/api/youtube/disconnect', (req, res) => {
  youtubeTokens.delete('default');
  youtubeChannels = [];
  youtubeSelectedChannel = null;
  salvarTokensYoutube();
  console.log('🔌 YouTube desconectado');
  res.json({ disconnected: true });
});

// Publicar manualmente um vídeo no YouTube (para vídeos que falharam no pipeline)
app.post('/api/youtube/publish', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId é obrigatório' });
    }

    // Verificar se há token YouTube
    const token = youtubeTokens.get('default');
    if (!token) {
      return res.status(401).json({ error: 'YouTube não autenticado. Configure em Configurações.' });
    }

    // Buscar vídeo na memória
    const video = videos.get(videoId);
    
    // Montar paths do vídeo
    const hostPath = resolve(MEDIA_DIR, 'videos', `${videoId}.mp4`);
    const dockerPath = `/media/videos/${videoId}.mp4`;
    
    // Verificar se o arquivo existe
    try {
      await fs.access(hostPath);
    } catch {
      return res.status(404).json({ error: `Arquivo não encontrado: ${videoId}.mp4` });
    }

    const videoPaths = { host: hostPath, docker: dockerPath };
    const roteiro = video?.roteiro || {
      titulo: video?.titulo || `Vídeo ${videoId}`,
      descricao: video?.descricao || '',
      tags: video?.tags || ['videoforge']
    };

    console.log(`📺 Publicação manual solicitada para ${videoId}...`);
    const youtubeId = await publicarNoYoutube(videoId, videoPaths, roteiro);
    
    // Atualizar status do vídeo
    if (video) {
      video.youtube = `https://youtube.com/watch?v=${youtubeId}`;
      video.youtubeId = youtubeId;
    }

    res.json({ 
      success: true, 
      youtubeId, 
      url: `https://youtube.com/watch?v=${youtubeId}` 
    });
  } catch (error) {
    console.error('❌ Erro publicação manual YouTube:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FUNÇÃO: Compartilhar nas Redes Sociais
// ============================================
async function compartilharRedesSociais(video, youtubeUrl) {
  const resultados = [];
  const texto = `🎬 Novo vídeo: ${video.roteiro?.titulo || video.titulo}\n\n${video.roteiro?.descricao?.substring(0, 200) || ''}\n\n▶️ Assista agora:`;
  const tags = (video.roteiro?.tags || []).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
  
  // Twitter/X - Postar via API
  if (socialTokens.has('twitter') || process.env.TWITTER_BEARER_TOKEN) {
    try {
      const tweetText = `${texto}\n${youtubeUrl}\n\n${tags}`.substring(0, 280);
      let authHeader;
      
      if (socialTokens.has('twitter')) {
        const token = socialTokens.get('twitter');
        authHeader = `Bearer ${token.access_token}`;
      } else {
        authHeader = `Bearer ${decodeURIComponent(process.env.TWITTER_BEARER_TOKEN)}`;
      }
      
      await axios.post('https://api.twitter.com/2/tweets', 
        { text: tweetText },
        { headers: { Authorization: authHeader } }
      );
      resultados.push({ rede: 'Twitter/X', sucesso: true });
      console.log('✅ Compartilhado no Twitter/X');
    } catch (err) {
      console.error('❌ Erro Twitter:', err.response?.data || err.message);
      resultados.push({ rede: 'Twitter/X', sucesso: false, erro: err.message });
    }
  }

  // Facebook - Postar via Graph API
  if (socialTokens.has('facebook')) {
    try {
      const token = socialTokens.get('facebook');
      await axios.post(`https://graph.facebook.com/me/feed`, {
        message: `${texto}\n${youtubeUrl}\n\n${tags}`,
        link: youtubeUrl,
        access_token: token.access_token
      });
      resultados.push({ rede: 'Facebook', sucesso: true });
      console.log('✅ Compartilhado no Facebook');
    } catch (err) {
      console.error('❌ Erro Facebook:', err.message);
      resultados.push({ rede: 'Facebook', sucesso: false, erro: err.message });
    }
  }

  // LinkedIn - Postar via API
  if (socialTokens.has('linkedin')) {
    try {
      const token = socialTokens.get('linkedin');
      const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const personId = profileResponse.data.sub;
      
      await axios.post('https://api.linkedin.com/v2/ugcPosts', {
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: `${texto}\n${youtubeUrl}\n\n${tags}` },
            shareMediaCategory: 'ARTICLE',
            media: [{
              status: 'READY',
              originalUrl: youtubeUrl,
              title: { text: video.roteiro?.titulo || video.titulo }
            }]
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      }, {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      resultados.push({ rede: 'LinkedIn', sucesso: true });
      console.log('✅ Compartilhado no LinkedIn');
    } catch (err) {
      console.error('❌ Erro LinkedIn:', err.message);
      resultados.push({ rede: 'LinkedIn', sucesso: false, erro: err.message });
    }
  }

  return resultados;
}

// ============================================
// ROTAS REDES SOCIAIS
// ============================================

// Listar status de todas as redes
app.get('/api/social/status', (req, res) => {
  const status = {};
  for (const [key, network] of Object.entries(SOCIAL_NETWORKS)) {
    status[key] = {
      name: network.name,
      icon: network.icon,
      color: network.color,
      configured: network.configured(),
      connected: network.connected()
    };
  }
  res.json(status);
});

// Twitter/X OAuth 2.0
app.get('/api/social/twitter/auth', (req, res) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) return res.status(400).json({ error: 'Twitter Client ID não configurado' });
  
  const state = uuidv4();
  const codeChallenge = uuidv4().replace(/-/g, ''); // simplificado
  socialTokens.set('twitter_state', state);
  socialTokens.set('twitter_verifier', codeChallenge);
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(process.env.TWITTER_REDIRECT_URI || 'http://localhost:3001/api/social/twitter/callback')}` +
    `&scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}` +
    `&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=plain`;
  
  res.json({ authUrl });
});

app.get('/api/social/twitter/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const response = await axios.post('https://api.twitter.com/2/oauth2/token', 
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID,
        redirect_uri: process.env.TWITTER_REDIRECT_URI || 'http://localhost:3001/api/social/twitter/callback',
        code_verifier: socialTokens.get('twitter_verifier')
      }).toString(),
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: process.env.TWITTER_CLIENT_ID, password: process.env.TWITTER_CLIENT_SECRET }
      }
    );
    
    socialTokens.set('twitter', response.data);
    console.log('✅ Twitter/X conectado com sucesso');
    res.send(socialCallbackHtml('Twitter/X', '🐦'));
  } catch (error) {
    console.error('❌ Erro Twitter callback:', error.response?.data || error.message);
    res.status(500).send('Erro ao autenticar Twitter: ' + error.message);
  }
});

// Facebook OAuth
app.get('/api/social/facebook/auth', (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return res.status(400).json({ error: 'Facebook App ID não configurado' });
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/social/facebook/callback')}` +
    `&scope=${encodeURIComponent('public_profile,publish_video')}` +
    `&response_type=code`;
  
  res.json({ authUrl });
});

app.get('/api/social/facebook/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/social/facebook/callback',
        code
      }
    });
    
    // Obter token de longa duração
    const longLivedResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: response.data.access_token
      }
    });
    
    socialTokens.set('facebook', longLivedResponse.data);
    console.log('✅ Facebook conectado com sucesso');
    res.send(socialCallbackHtml('Facebook', '📘'));
  } catch (error) {
    console.error('❌ Erro Facebook callback:', error.response?.data || error.message);
    res.status(500).send('Erro ao autenticar Facebook: ' + error.message);
  }
});

// LinkedIn OAuth 2.0
app.get('/api/social/linkedin/auth', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) return res.status(400).json({ error: 'LinkedIn Client ID não configurado' });
  
  const state = uuidv4();
  socialTokens.set('linkedin_state', state);
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/social/linkedin/callback')}` +
    `&state=${state}` +
    `&scope=${encodeURIComponent('openid profile w_member_social')}`;
  
  res.json({ authUrl });
});

app.get('/api/social/linkedin/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/social/linkedin/callback'
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    socialTokens.set('linkedin', response.data);
    console.log('✅ LinkedIn conectado com sucesso');
    res.send(socialCallbackHtml('LinkedIn', '💼'));
  } catch (error) {
    console.error('❌ Erro LinkedIn callback:', error.response?.data || error.message);
    res.status(500).send('Erro ao autenticar LinkedIn: ' + error.message);
  }
});

// TikTok OAuth 2.0 + Video Upload (com PKCE obrigatório)
app.get('/api/social/tiktok/auth', (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return res.status(400).json({ error: 'TIKTOK_CLIENT_KEY não configurado' });

  // Gerar PKCE code_verifier e code_challenge (obrigatório pela TikTok API v2)
  const codeVerifier = require('crypto').randomBytes(48).toString('base64url');
  const codeChallenge = require('crypto').createHash('sha256').update(codeVerifier).digest('base64url');
  const state = uuidv4();

  socialTokens.set('tiktok_state', state);
  socialTokens.set('tiktok_code_verifier', codeVerifier);

  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3001/api/social/tiktok/callback';
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
    `client_key=${encodeURIComponent(clientKey)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('user.info.basic,video.publish,video.upload')}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`;

  res.json({ authUrl });
});

app.get('/api/social/tiktok/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('❌ TikTok recusou autorização:', error, error_description);
      return res.status(400).send(`TikTok negou acesso: ${error_description || error}`);
    }

    if (state !== socialTokens.get('tiktok_state')) return res.status(400).send('State inválido');

    const codeVerifier = socialTokens.get('tiktok_code_verifier');
    const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3001/api/social/tiktok/callback';

    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier   // PKCE verifier enviado na troca de token
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    socialTokens.set('tiktok', response.data);
    socialTokens.delete('tiktok_code_verifier');
    console.log('✅ TikTok conectado com sucesso');
    res.send(socialCallbackHtml('TikTok', '🎵'));
  } catch (err) {
    console.error('❌ Erro TikTok callback:', err.response?.data || err.message);
    res.status(500).send(`Erro ao autenticar TikTok: ${JSON.stringify(err.response?.data || err.message)}`);
  }
});

app.get('/api/social/tiktok/status', (req, res) => {
  res.json({ connected: socialTokens.has('tiktok') });
});

// Desconectar uma rede social
app.post('/api/social/:network/disconnect', (req, res) => {
  const { network } = req.params;
  if (socialTokens.has(network)) {
    socialTokens.delete(network);
    console.log(`🔌 ${network} desconectado`);
    res.json({ success: true, message: `${network} desconectado` });
  } else {
    res.json({ success: true, message: `${network} já estava desconectado` });
  }
});

// Compartilhar manualmente um vídeo já publicado em todas as redes conectadas
app.post('/api/videos/:id/share', async (req, res) => {
  const video = videos.get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });
  if (!video.youtubeId) return res.status(400).json({ error: 'Vídeo ainda não foi publicado no YouTube' });
  
  const youtubeUrl = `https://youtube.com/watch?v=${video.youtubeId}`;
  const resultados = await compartilharRedesSociais(video, youtubeUrl);
  video.compartilhamentos = resultados;
  
  res.json({ success: true, compartilhamentos: resultados });
});

// Gerar links de compartilhamento manual (sem API)
app.get('/api/videos/:id/share-links', (req, res) => {
  const video = videos.get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });
  
  const youtubeUrl = video.youtubeId 
    ? `https://youtube.com/watch?v=${video.youtubeId}`
    : null;
  
  const titulo = encodeURIComponent(video.roteiro?.titulo || video.titulo);
  const url = encodeURIComponent(youtubeUrl || '');
  
  const links = {
    twitter: `https://twitter.com/intent/tweet?text=${titulo}&url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    whatsapp: `https://api.whatsapp.com/send?text=${titulo}%20${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${titulo}`,
    reddit: `https://reddit.com/submit?url=${url}&title=${titulo}`,
  };
  
  res.json({ youtubeUrl, links });
});

// Template HTML para callback de redes sociais
function socialCallbackHtml(networkName, emoji) {
  return `
    <html>
      <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh;">
        <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; color: #333;">
          <div style="font-size: 48px; margin-bottom: 20px;">${emoji}</div>
          <h1 style="font-size: 24px; margin-bottom: 10px;">✅ ${networkName} conectado!</h1>
          <p style="color: #666;">Seus vídeos serão compartilhados automaticamente.</p>
          <p style="color: #999; font-size: 14px; margin-top: 20px;">Esta janela fechará em 3 segundos...</p>
        </div>
        <script>setTimeout(() => window.close(), 3000)</script>
      </body>
    </html>
  `;
}

// ============================================
// OUTRAS ROTAS
// ============================================
app.get('/api/videos', (req, res) => {
  const todosVideos = Array.from(videos.values()).sort((a, b) => 
    new Date(b.criado_em) - new Date(a.criado_em)
  );
  res.json(todosVideos);
});

app.get('/api/videos/:id', (req, res) => {
  const video = videos.get(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Vídeo não encontrado' });
  }
  res.json(video);
});

// Publicar vídeo individual no YouTube (pós-render)
app.post('/api/videos/:id/publish-youtube', async (req, res) => {
  try {
    const video = videos.get(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }
    if (!video.videoUrl) {
      return res.status(400).json({ error: 'Vídeo ainda não foi renderizado' });
    }
    if (video.youtubeId) {
      return res.status(400).json({ error: 'Vídeo já foi publicado no YouTube', youtubeId: video.youtubeId });
    }
    
    const videoPaths = { host: video.videoUrl, docker: `/media/videos/${video.id}.mp4` };
    const roteiro = video.roteiro || { titulo: video.titulo, descricao: '', tags: [] };
    
    const youtubeId = await publicarNoYoutube(video.id, videoPaths, roteiro);
    video.youtubeId = youtubeId;
    video.status = 'publicado';
    video.etapa = `Publicado no YouTube! ID: ${youtubeId}`;
    
    console.log(`✅ Vídeo ${video.id} publicado manualmente no YouTube: ${youtubeId}`);
    res.json({ youtubeId, message: 'Publicado com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao publicar no YouTube:', error.message);
    res.status(500).json({ error: 'Erro ao publicar: ' + error.message });
  }
});

app.get('/api/config', (req, res) => {
  const socialStatus = {};
  for (const [key, network] of Object.entries(SOCIAL_NETWORKS)) {
    socialStatus[key] = {
      name: network.name,
      icon: network.icon,
      color: network.color,
      configured: network.configured(),
      connected: network.connected()
    };
  }
  
  res.json({
    gemini_configured: !!GEMINI_API_KEY && GEMINI_API_KEY !== 'sua_chave_aqui',
    pexels_configured: !!PEXELS_API_KEY && PEXELS_API_KEY !== 'sua_chave_aqui',
    youtube_configured: !!process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_ID !== 'seu_client_id_aqui',
    youtube_connected: youtubeTokens.has('default'),
    social: socialStatus
  });
});

// ============================================
// ROTAS: Gerenciar chaves de API (.env)
// ============================================
// Em produção (NO_DOCKER/cloud) o filesystem /app é read-only.
// Escrevemos em /tmp/videoforge.env (sempre gravável) e process.env.
const ENV_PATH = (NO_DOCKER || process.env.NODE_ENV === 'production')
  ? '/tmp/videoforge.env'
  : envFilePath;

// Definição de todas as chaves editáveis
const API_KEY_DEFINITIONS = [
  // ── APIs obrigatórias ──────────────────────────────────────────────────────
  { key: 'GEMINI_API_KEY', label: 'Google Gemini', group: 'apis', required: true, free: true, freeLabel: 'GRÁTIS' },
  { key: 'PEXELS_API_KEY', label: 'Pexels (Imagens Stock)', group: 'apis', required: true, free: true, freeLabel: 'GRÁTIS' },

  // ── TTS — Vozes naturais ───────────────────────────────────────────────────
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs — TTS voz natural', group: 'apis', free: false, freeLabel: 'PAGO', hint: 'https://elevenlabs.io' },
  { key: 'ELEVENLABS_VOICE_ID', label: 'ElevenLabs — Voice ID (opcional)', group: 'apis', free: false, freeLabel: 'PAGO' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI — TTS + DALL-E 3 + Whisper', group: 'apis', free: false, freeLabel: 'PAGO', hint: 'https://platform.openai.com/api-keys' },

  // ── Imagens por IA ─────────────────────────────────────────────────────────
  { key: 'REPLICATE_API_TOKEN', label: 'Replicate — Wan 2.1 + Flux.1 (vídeo/imagem)', group: 'apis', free: false, freeLabel: 'PAGO' },
  { key: 'KLING_ACCESS_KEY_ID', label: 'Kling AI — Access Key ID', group: 'apis', free: false, freeLabel: 'PAGO' },
  { key: 'KLING_ACCESS_KEY_SECRET', label: 'Kling AI — Access Key Secret', group: 'apis', free: false, freeLabel: 'PAGO' },
  { key: 'HUGGINGFACE_API_TOKEN', label: 'Hugging Face', group: 'apis', free: false, freeLabel: 'PAGO' },
  { key: 'LOCAL_AI_MODEL', label: 'Modelo IA Local (modelscope/zeroscope/cogvideox)', group: 'apis', free: true, freeLabel: 'GRÁTIS' },
  { key: 'LOCAL_AI_STEPS', label: 'IA Local — Steps de Inferência (padrão: 20)', group: 'apis', free: true, freeLabel: 'GRÁTIS' },

  // ── Música de fundo ────────────────────────────────────────────────────────
  { key: 'PIXABAY_API_KEY', label: 'Pixabay — Música de fundo', group: 'apis', free: true, freeLabel: 'GRÁTIS', hint: 'https://pixabay.com/api/docs/' },

  // ── Avatar apresentador ────────────────────────────────────────────────────
  { key: 'DID_API_KEY', label: 'D-ID — Avatar apresentador', group: 'apis', free: false, freeLabel: 'PAGO', hint: 'https://studio.d-id.com' },
  { key: 'DID_PRESENTER_URL', label: 'D-ID — URL da foto do apresentador', group: 'apis', free: false, freeLabel: 'PAGO' },

  // ── YouTube ────────────────────────────────────────────────────────────────
  { key: 'YOUTUBE_CLIENT_ID', label: 'YouTube Client ID', group: 'youtube' },
  { key: 'YOUTUBE_CLIENT_SECRET', label: 'YouTube Client Secret', group: 'youtube' },
  { key: 'YOUTUBE_REDIRECT_URI', label: 'YouTube Redirect URI', group: 'youtube' },

  // ── Redes sociais ──────────────────────────────────────────────────────────
  { key: 'TWITTER_CLIENT_ID', label: 'Twitter Client ID', group: 'social' },
  { key: 'TWITTER_CLIENT_SECRET', label: 'Twitter Client Secret', group: 'social' },
  { key: 'TWITTER_BEARER_TOKEN', label: 'Twitter Bearer Token', group: 'social' },
  { key: 'FACEBOOK_APP_ID', label: 'Facebook App ID', group: 'social' },
  { key: 'FACEBOOK_APP_SECRET', label: 'Facebook App Secret', group: 'social' },
  { key: 'LINKEDIN_CLIENT_ID', label: 'LinkedIn Client ID', group: 'social' },
  { key: 'LINKEDIN_CLIENT_SECRET', label: 'LinkedIn Client Secret', group: 'social' },
  { key: 'TIKTOK_CLIENT_KEY', label: 'TikTok Client Key', group: 'social' },
  { key: 'TIKTOK_CLIENT_SECRET', label: 'TikTok Client Secret', group: 'social' },
];

function maskValue(val) {
  if (!val || val.length < 8) return val ? '••••' : '';
  return val.slice(0, 4) + '••••••••' + val.slice(-4);
}

// Listar todas as chaves com valores mascarados
app.get('/api/config/keys', async (req, res) => {
  try {
    // Em produção, ler do process.env diretamente (Railway injeta as vars no ambiente)
    // Em desktop, ler do arquivo .env
    const envVars = {};
    try {
      const envContent = await fs.readFile(ENV_PATH, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
        if (match) envVars[match[1]] = match[2].trim();
      }
    } catch {
      // Arquivo não existe ainda — usar process.env como fonte de verdade
    }
    // Mesclar com process.env (process.env tem prioridade em produção)
    for (const def of API_KEY_DEFINITIONS) {
      if (process.env[def.key]) envVars[def.key] = process.env[def.key];
    }

    const keys = API_KEY_DEFINITIONS.map(def => ({
      ...def,
      value: envVars[def.key] || '',
      maskedValue: maskValue(envVars[def.key] || ''),
      configured: !!(envVars[def.key] && envVars[def.key] !== 'sua_chave_aqui' && envVars[def.key] !== 'seu_client_id_aqui')
    }));

    res.json(keys);
  } catch (err) {
    console.error('Erro ao ler chaves:', err);
    res.status(500).json({ error: err.message });
  }
});

// Atualizar uma chave de API
app.put('/api/config/keys', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Chave obrigatória' });

    const def = API_KEY_DEFINITIONS.find(d => d.key === key);
    if (!def) return res.status(400).json({ error: 'Chave desconhecida' });

    let envContent = '';
    try { envContent = await fs.readFile(ENV_PATH, 'utf-8'); } catch { /* arquivo não existe ainda */ }

    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value || ''}`);
    } else {
      envContent += `\n${key}=${value || ''}`;
    }

    await fs.writeFile(ENV_PATH, envContent, 'utf-8');

    // Atualizar process.env em tempo real
    process.env[key] = value || '';

    console.log(`✅ Chave ${key} atualizada`);
    res.json({ success: true, message: `${def.label} atualizado com sucesso` });
  } catch (err) {
    console.error('Erro ao atualizar chave:', err);
    res.status(500).json({ error: err.message });
  }
});

// Apagar (limpar) uma chave de API
app.delete('/api/config/keys/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const def = API_KEY_DEFINITIONS.find(d => d.key === key);
    if (!def) return res.status(400).json({ error: 'Chave desconhecida' });
    
    let envContent = '';
    try { envContent = await fs.readFile(ENV_PATH, 'utf-8'); } catch { /* arquivo não existe ainda */ }
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=`);
    }

    await fs.writeFile(ENV_PATH, envContent, 'utf-8');
    
    // Limpar process.env
    process.env[key] = '';
    
    console.log(`🗑️ Chave ${key} removida`);
    res.json({ success: true, message: `${def.label} removido com sucesso` });
  } catch (err) {
    console.error('Erro ao apagar chave:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!GEMINI_API_KEY && GEMINI_API_KEY !== 'sua_chave_aqui',
    pexels: !!PEXELS_API_KEY && PEXELS_API_KEY !== 'sua_chave_aqui',
    youtube: youtubeTokens.has('default'),
    videos: videos.size
  });
});

// ============================================
// ROTAS PÚBLICAS (Landing Page)
// ============================================

// Estatísticas públicas para landing page
app.get('/api/public/stats', async (req, res) => {
  try {
    const videoCount = await pool.query('SELECT COUNT(*) FROM videos');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    res.json({
      totalVideos: parseInt(videoCount.rows[0].count) || 0,
      totalUsers: parseInt(userCount.rows[0].count) || 0
    });
  } catch {
    // Fallback se não tiver tabelas
    res.json({ totalVideos: videos.size || 100, totalUsers: 50 });
  }
});

// Preços públicos
app.get('/api/public/precos', (req, res) => {
  res.json({
    preco_vitalicio: process.env.PRECO_VITALICIO || '59',
    hotmart_checkout_vitalicio: process.env.HOTMART_CHECKOUT_URL || null,
    aviso_tokens: 'Os tokens de IA são consumidos das suas próprias contas nos provedores.'
  });
});

// Captura de leads (e-mail)
app.post('/api/public/lead', async (req, res) => {
  const { email, source } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  try {
    // Salvar lead no banco
    await pool.query(
      `INSERT INTO leads (email, source, created_at) VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET source = $2, updated_at = NOW()`,
      [email.toLowerCase().trim(), source || 'landing']
    );
    console.log(`📧 Lead capturado: ${email} (${source})`);
    res.json({ ok: true });
  } catch (err) {
    // Se tabela não existe, criar e tentar de novo
    if (err.code === '42P01') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          source VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP
        )
      `);
      await pool.query(
        `INSERT INTO leads (email, source) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [email.toLowerCase().trim(), source || 'landing']
      );
    }
    console.log(`📧 Lead capturado: ${email} (${source})`);
    res.json({ ok: true });
  }
});

// Reiniciar backend (admin only) — Docker restart policy traz de volta
app.post('/api/admin/restart', (req, res) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso negado — somente administradores' });
  }
  console.log('🔄 Reinício solicitado por:', req.user.email);
  res.json({ ok: true, message: 'Reiniciando backend em 1 segundo...' });
  setTimeout(() => {
    console.log('🔄 Reiniciando processo...');
    process.exit(0); // Docker restart policy traz de volta
  }, 1000);
});

// ============================================
// TIPOS DE VÍDEO (gratuitos vs pagos)
// ============================================
const PAID_VIDEO_TYPES = {
  replicateGeneration: { label: 'Replicate / Wan 2.1', cost: '~$0.005-0.02/geração', warning: 'O Replicate requer créditos. Adicione forma de pagamento em replicate.com/account/billing.' },
  klingGeneration: { label: 'Kling AI', cost: '~$0.01-0.04/cena', warning: 'Kling AI requer KLING_ACCESS_KEY_ID e KLING_ACCESS_KEY_SECRET no .env. Crie chaves em: https://platform.klingai.com/account/developer' },
  huggingfaceGeneration: { label: 'Hugging Face', cost: 'Créditos pré-pagos HF', warning: 'A API de vídeo do Hugging Face agora requer créditos pré-pagos na sua conta.' },
  veoGeneration: { label: 'Veo 3 (Google Vertex)', cost: '~$0.35/segundo de vídeo', warning: 'Este serviço usa Google Cloud billing e cobra por segundo de vídeo gerado.' },
  soraGeneration: { label: 'Sora (OpenAI)', cost: 'Requer assinatura ChatGPT Plus/Pro', warning: 'Este serviço requer assinatura ativa da OpenAI.' },
};

app.get('/api/video-types', (req, res) => {
  res.json({
    free: ['stockImages', 'stickAnimation', 'aiImageGeneration', 'geminiVeoGeneration', 'localAIGeneration'],
    paid: PAID_VIDEO_TYPES
  });
});

// ============================================
// ROTAS DE NOTÍCIAS
// ============================================

// --- Fontes RSS ---
app.get('/api/news/sources', async (req, res) => {
  try {
    const fontes = await listarFontes();
    res.json(fontes);
  } catch (err) {
    console.error('Erro listar fontes:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/news/sources', async (req, res) => {
  try {
    const { nome, url, categoria } = req.body;
    if (!nome || !url) return res.status(400).json({ error: 'Nome e URL são obrigatórios' });
    const fonte = await criarFonte(nome, url, categoria);
    res.status(201).json(fonte);
  } catch (err) {
    console.error('Erro criar fonte:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/news/sources/:id', async (req, res) => {
  try {
    const fonte = await atualizarFonte(req.params.id, req.body);
    res.json(fonte);
  } catch (err) {
    console.error('Erro atualizar fonte:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/news/sources/:id', async (req, res) => {
  try {
    await deletarFonte(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro deletar fonte:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Notícias coletadas ---
app.get('/api/news/items', async (req, res) => {
  try {
    const noticias = await listarNoticias(req.query);
    res.json(noticias);
  } catch (err) {
    console.error('Erro listar notícias:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Coletar agora (manual) ---
app.post('/api/news/collect', async (req, res) => {
  try {
    const resultado = await coletarNoticias();
    res.json(resultado);
  } catch (err) {
    console.error('Erro coletar notícias:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Gerar vídeo de notícias ---
app.post('/api/news/videos', async (req, res) => {
  try {
    const resultado = await executarPipelineNoticias(req.body);
    res.json(resultado);
  } catch (err) {
    console.error('Erro gerar vídeo de notícias:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/news/videos', async (req, res) => {
  try {
    const videos = await listarNewsVideos();
    res.json(videos);
  } catch (err) {
    console.error('Erro listar vídeos news:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/news/videos/:id', async (req, res) => {
  try {
    const video = await getNewsVideo(req.params.id);
    if (!video) return res.status(404).json({ error: 'Vídeo de notícias não encontrado' });
    res.json(video);
  } catch (err) {
    console.error('Erro buscar vídeo news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Retry: retomar pipeline de vídeo que parou no meio
app.post('/api/news/videos/:id/retry', async (req, res) => {
  try {
    const resultado = await retryNewsVideo(req.params.id);
    res.json(resultado);
  } catch (err) {
    console.error('Erro retry vídeo news:', err);
    res.status(500).json({ error: err.message });
  }
});

// Publicar vídeo de notícias no YouTube (manual, para vídeos já renderizados)
app.post('/api/news/videos/:id/publish', async (req, res) => {
  try {
    const video = await getNewsVideo(req.params.id);
    if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });
    if (!video.video_url) return res.status(400).json({ error: 'Vídeo ainda não foi renderizado' });
    if (video.youtube_id) return res.json({ success: true, youtube_id: video.youtube_id, message: 'Já publicado!' });

    const roteiro = typeof video.roteiro === 'string' ? JSON.parse(video.roteiro) : video.roteiro;
    const videoPaths = { host: video.video_url };
    const youtubeId = await publicarNoYoutube(req.params.id, videoPaths, roteiro || { titulo: video.titulo, descricao: '', tags: [] });

    await newsPool.query(
      "UPDATE news_videos SET youtube_id = $2, status = 'PUBLICADO' WHERE id = $1",
      [req.params.id, youtubeId]
    );

    res.json({ success: true, youtube_id: youtubeId });
  } catch (err) {
    console.error('Erro publicar vídeo news:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Configuração de notícias ---
app.get('/api/news/config', async (req, res) => {
  try {
    const config = await getNewsConfig();
    res.json(config);
  } catch (err) {
    console.error('Erro buscar config news:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/news/config', async (req, res) => {
  try {
    const config = await updateNewsConfig(req.body);
    // Reatualizar cron se horário mudou
    if (req.body.horario_agendamento) {
      agendarCronNoticias(config);
    }
    res.json(config);
  } catch (err) {
    console.error('Erro atualizar config news:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CORTES — Corte e Republicação de Vídeos YouTube
// ============================================
const corteJobs = new Map(); // jobId → { id, status, etapa, logEtapas, segments, clips, youtubeUrl }

function logCorte(job, msg) {
  const ts = new Date().toISOString();
  job.etapa = msg;
  if (!job.logEtapas) job.logEtapas = [];
  job.logEtapas.push({ ts, msg });
  console.log(`  [corte:${job.id}] ${msg}`);
}

// Extrai o video ID do YouTube a partir de uma URL
function extractYoutubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Formata segundos em HH:MM:SS para exibição
function formatarTempo(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// POST /api/cortes/analyze — Baixa vídeo, identifica segmentos de destaque
app.post('/api/cortes/analyze', async (req, res) => {
  const { youtubeUrl } = req.body;
  let isOwnChannel = !!req.body.isOwnChannel;
  if (!youtubeUrl) return res.status(400).json({ error: 'youtubeUrl obrigatório' });

  const jobId = uuidv4();
  const job = {
    id: jobId, status: 'iniciando', etapa: 'Iniciando...', logEtapas: [],
    youtubeUrl, isOwnChannel: !!isOwnChannel, segments: null, clips: []
  };
  corteJobs.set(jobId, job);
  res.json({ jobId });

  // Pipeline assíncrono
  (async () => {
    try {
      const hostCorteDir = resolve(MEDIA_DIR, 'cortes', jobId);
      await fs.mkdir(hostCorteDir, { recursive: true });

      // 1. Download com yt-dlp
      logCorte(job, '⬇️ Baixando vídeo com yt-dlp...');
      job.status = 'baixando';

      const downloadScript = `
import yt_dlp, json, sys, os

url = sys.argv[1]
out_dir = sys.argv[2]
result_path = sys.argv[3]
os.makedirs(out_dir, exist_ok=True)

# Cookies file (se existir)
cookies_file = '/media/cookies.txt'
has_cookies = os.path.isfile(cookies_file)

ydl_opts = {
    'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]',
    'outtmpl': os.path.join(out_dir, 'original.%(ext)s'),
    'merge_output_format': 'mp4',
    'quiet': True,
    'no_warnings': True,
    'noprogress': True,
    'logtostderr': True,
    'extractor_args': {'youtube': {'player_client': ['web', 'mweb']}},
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    },
}
if has_cookies:
    ydl_opts['cookiefile'] = cookies_file

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=True)
    result = {
        'title': info.get('title', ''),
        'duration': info.get('duration', 0),
        'view_count': info.get('view_count', 0),
        'id': info.get('id', ''),
        'heatmap': info.get('heatmap') or []   # dados do "Mais Reproduzido" da barra do YouTube
    }
    json.dump(result, open(result_path, 'w', encoding='utf-8'), ensure_ascii=False)
    print('OK')
`;
      const downloadScriptPath = resolve(hostCorteDir, 'download.py');
      await fs.writeFile(downloadScriptPath, downloadScript, 'utf-8');

      const dockerCorteDir = NO_DOCKER ? hostCorteDir.replace(/\\/g, '/') : `/media/cortes/${jobId}`;
      const resultJsonPath = resolve(hostCorteDir, 'info.json');
      const downloadCmd = makeExecCmd(`python "${dockerCorteDir}/download.py" "${youtubeUrl}" "${dockerCorteDir}" "${dockerCorteDir}/info.json"`);
      await execAsync(downloadCmd, { timeout: 300000 });
      const videoInfo = JSON.parse(await fs.readFile(resultJsonPath, 'utf-8'));
      job.videoInfo = videoInfo;
      logCorte(job, `✅ Vídeo baixado: "${videoInfo.title}" (${formatarTempo(videoInfo.duration)})`);

      // 2. Análise: Analytics para canal próprio, Whisper+Gemini para terceiros
      job.status = 'analisando';

      let segments = [];

      // ── FONTE 1: Heatmap do YouTube ("Mais Reproduzido") ──────────────────────
      // Disponível para qualquer vídeo público — são os mesmos dados da barra de reprodução
      const heatmap = videoInfo.heatmap || [];

      if (heatmap.length > 0) {
        logCorte(job, `📊 Heatmap encontrado (${heatmap.length} pontos) — usando dados reais da barra do YouTube...`);

        // Normalizar para média = 1.0
        const values = heatmap.map(p => p.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const normalized = heatmap.map(p => ({ ...p, norm: p.value / (mean || 1) }));

        // Encontrar picos: janelas onde norm > threshold durante >= minDur segundos
        const threshold = 1.25; // 25% acima da média
        const minDur = 20;      // mínimo 20s por segmento
        const maxDur = 90;      // máximo 90s por segmento

        let inPeak = false;
        let peakStart = 0;
        let peakMaxVal = 0;
        const peaks = [];

        for (const point of normalized) {
          if (point.norm >= threshold && !inPeak) {
            inPeak = true;
            peakStart = point.start_time;
            peakMaxVal = point.norm;
          } else if (inPeak) {
            peakMaxVal = Math.max(peakMaxVal, point.norm);
            const dur = point.end_time - peakStart;
            if (point.norm < threshold || dur >= maxDur) {
              inPeak = false;
              if (dur >= minDur) {
                peaks.push({ start: Math.round(peakStart), end: Math.min(Math.round(point.end_time), Math.round(peakStart + maxDur)), intensity: peakMaxVal });
              }
              if (point.norm < threshold) { inPeak = false; } else {
                inPeak = true; peakStart = point.end_time; peakMaxVal = point.norm;
              }
            }
          }
        }

        // Ordenar por intensidade e pegar os top 5
        peaks.sort((a, b) => b.intensity - a.intensity);
        const topPeaks = peaks.slice(0, 5);
        // Reordenar por tempo para exibição cronológica
        topPeaks.sort((a, b) => a.start - b.start);

        if (topPeaks.length > 0) {
          logCorte(job, `🔥 ${topPeaks.length} picos do "Mais Reproduzido" identificados — gerando títulos com IA...`);

          // Usar Gemini só para gerar títulos/descrições (muito mais rápido que transcrever)
          const peaksInfo = topPeaks.map((p, i) => `Pico ${i+1}: ${formatarTempo(p.start)} até ${formatarTempo(p.end)} (intensidade ${(p.intensity).toFixed(2)}x acima da média)`).join('\n');
          const tituloVideo = videoInfo.title;

          const geminiPrompt = `Você é especialista em conteúdo viral para YouTube, TikTok e Instagram.

Vídeo: "${tituloVideo}"

Os seguintes trechos foram os MAIS REPRODUZIDOS pelos espectadores (dados reais da barra do YouTube):
${peaksInfo}

Para cada trecho, gere um título chamativo e uma legenda otimizada para redes sociais.

Responda SOMENTE com JSON válido, sem markdown, com exatamente ${topPeaks.length} objetos na mesma ordem:
[
  {
    "titulo": "Título chamativo com gancho emocional (máx 80 caracteres)",
    "motivo": "Por que esse trecho foi o mais reproduzido",
    "descricao": "Legenda impactante com call-to-action...\\n\\n#hashtag1 #hashtag2 #hashtag3",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
  }
]`;

          try {
            const geminiResponse = await chamarGemini(geminiPrompt, 30000);
            const jsonMatch = geminiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const metadados = JSON.parse(jsonMatch[0]);
              segments = topPeaks.map((p, i) => ({
                start: p.start,
                end: p.end,
                titulo: metadados[i]?.titulo || `Momento viral ${formatarTempo(p.start)}`,
                motivo: metadados[i]?.motivo || `${(p.intensity).toFixed(1)}x mais reproduzido que a média`,
                descricao: metadados[i]?.descricao || '',
                hashtags: metadados[i]?.hashtags || [],
                fonte: 'heatmap'
              }));
              logCorte(job, `✅ ${segments.length} segmentos identificados pelos dados da barra do YouTube`);
            }
          } catch (err) {
            // Se Gemini falhar, usar segmentos com títulos básicos
            segments = topPeaks.map(p => ({
              start: p.start, end: p.end,
              titulo: `Momento viral: ${formatarTempo(p.start)} → ${formatarTempo(p.end)}`,
              motivo: `${(p.intensity).toFixed(1)}x mais reproduzido que a média`,
              descricao: '', hashtags: [], fonte: 'heatmap'
            }));
            logCorte(job, `⚠️ Gemini indisponível, usando segmentos sem títulos gerados por IA`);
          }
        }
      }

      // ── FONTE 2: Canal próprio — YouTube Analytics ─────────────────────────────
      if (segments.length === 0 && isOwnChannel) {
        logCorte(job, '📊 Heatmap não disponível — buscando dados do YouTube Analytics...');
        const videoYtId = extractYoutubeId(youtubeUrl) || videoInfo.id;
        try {
          const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });
          const hoje = new Date().toISOString().split('T')[0];
          const ret = await youtubeAnalytics.reports.query({
            ids: 'channel==MINE',
            startDate: '2020-01-01',
            endDate: hoje,
            metrics: 'audienceWatchRatio',
            dimensions: 'elapsedVideoTimeRatio',
            filters: `video==${videoYtId}`
          });

          if (ret.data?.rows?.length > 0) {
            const totalDuration = videoInfo.duration;
            const rows = ret.data.rows;
            let inSegment = false, segStart = 0;
            for (const [timeRatio, watchRatio] of rows) {
              const timeSec = timeRatio * totalDuration;
              if (watchRatio > 0.6 && !inSegment) { inSegment = true; segStart = timeSec; }
              else if (watchRatio <= 0.6 && inSegment) {
                inSegment = false;
                if (timeSec - segStart >= 15)
                  segments.push({ start: Math.round(segStart), end: Math.round(timeSec),
                    titulo: `Segmento ${formatarTempo(segStart)} → ${formatarTempo(timeSec)}`,
                    motivo: `Retenção ${Math.round(watchRatio * 100)}%`, descricao: '', hashtags: [], fonte: 'analytics' });
              }
            }
            logCorte(job, `📈 ${segments.length} segmentos de alta retenção (Analytics)`);
          } else {
            logCorte(job, '⚠️ Dados de Analytics insuficientes, usando Whisper + Gemini...');
          }
        } catch (err) {
          logCorte(job, `⚠️ Erro no Analytics: ${err.message}`);
        }
      }

      // ── FONTE 3: Fallback — Whisper transcrição + Gemini ──────────────────────
      if (segments.length === 0) {
        logCorte(job, '🔊 Heatmap não disponível — extraindo áudio para transcrição...');
        const extractAudioCmd = makeExecCmd(`ffmpeg -y -i "${dockerCorteDir}/original.mp4" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${dockerCorteDir}/audio.wav"`);
        await execAsync(extractAudioCmd, { timeout: 120000 });
        logCorte(job, '🎤 Transcrevendo com Whisper (pode demorar alguns minutos)...');

        const hfToken = process.env.HUGGINGFACE_API_TOKEN || '';
        const whisperScript = `
import sys, json, os
os.environ.setdefault('HF_TOKEN', sys.argv[3])
from faster_whisper import WhisperModel
audio_path = sys.argv[1]
out_path = sys.argv[2]
model = WhisperModel("tiny", device="cpu", compute_type="int8")
segments_iter, info = model.transcribe(audio_path, language="pt", beam_size=1, vad_filter=True)
transcript = [{'start': round(s.start, 2), 'end': round(s.end, 2), 'text': s.text.strip()} for s in segments_iter]
json.dump(transcript, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False)
print(f'Segmentos: {len(transcript)}, Duracao: {info.duration:.1f}s')
`;
        const whisperScriptPath = resolve(hostCorteDir, 'whisper.py');
        await fs.writeFile(whisperScriptPath, whisperScript, 'utf-8');

        const audioDurationMin = Math.ceil((videoInfo.duration || 600) / 60);
        const whisperTimeout = Math.max(900000, audioDurationMin * 60000);
        const whisperCmd = makeExecCmd(`python "${dockerCorteDir}/whisper.py" "${dockerCorteDir}/audio.wav" "${dockerCorteDir}/transcricao.json" "${hfToken}"`);
        await execAsync(whisperCmd, { timeout: whisperTimeout });
        logCorte(job, '✅ Transcrição concluída');

        const transcriptRaw = await fs.readFile(resolve(hostCorteDir, 'transcricao.json'), 'utf-8');
        const transcript = JSON.parse(transcriptRaw);
        logCorte(job, `📝 Transcrição: ${transcript.length} segmentos, duração total ${formatarTempo(videoInfo.duration)}`);

        // Fallback imediato: se transcrição vazia, divide o vídeo em partes iguais
        if (transcript.length === 0) {
          logCorte(job, '⚠️ Transcrição vazia (vídeo sem fala) — dividindo em partes iguais...');
          const dur = videoInfo.duration || 300;
          const n = Math.min(5, Math.max(3, Math.floor(dur / 60)));
          const segSize = Math.round(dur / n);
          segments = Array.from({ length: n }, (_, i) => ({
            start: i * segSize, end: Math.min((i + 1) * segSize, dur),
            titulo: `Parte ${i + 1} — ${formatarTempo(i * segSize)}`,
            motivo: 'Divisão automática (sem fala detectada)',
            descricao: '', hashtags: [], fonte: 'divisao-automatica'
          }));
        } else {
          logCorte(job, '🤖 Identificando melhores momentos com Gemini AI...');
          const transcriptTruncated = transcript.slice(0, 400);

          const geminiPrompt = `Você é especialista em criação de conteúdo para YouTube, TikTok e Instagram.

Vídeo: "${videoInfo.title}"
Duração total: ${Math.round(videoInfo.duration)}s

Transcrição (JSON com start/end em segundos):
${JSON.stringify(transcriptTruncated)}

Selecione OBRIGATORIAMENTE entre 3 e 5 trechos para recortar como clipes. Critérios em ordem de prioridade:
1. Momentos engraçados, surpreendentes, reações fortes ou revelações
2. Trechos com boa narrativa ou que fazem sentido sozinhos
3. Se não houver nada especial, escolha as partes mais animadas ou com mais movimento na fala

REGRAS:
- Cada clipe DEVE ter entre 25 e 90 segundos
- NUNCA retorne array vazio — sempre escolha pelo menos 3 trechos
- Os timestamps devem existir na transcrição

Para cada clipe gere:
- "titulo": título chamativo (máx 80 chars)
- "motivo": por que vale a pena recortar
- "descricao": legenda completa com 2-4 frases + call-to-action + mínimo 15 hashtags PT/EN
- "hashtags": array das hashtags sem #

Responda SOMENTE JSON válido:
[{"start":10.5,"end":72.3,"titulo":"...","motivo":"...","descricao":"...","hashtags":["..."]}]`;

          try {
            const geminiResponse = await chamarGemini(geminiPrompt, 45000);
            const jsonMatch = geminiResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              // Gemini às vezes retorna array vazio — fallback para partes iguais
              if (parsed.length === 0) {
                logCorte(job, '⚠️ Gemini retornou 0 segmentos — usando divisão automática...');
                throw new Error('empty');
              }
              segments = parsed.map(s => ({ ...s, fonte: 'whisper+gemini' }));
              logCorte(job, `✅ ${segments.length} momentos identificados por Whisper + Gemini`);
            } else {
              throw new Error('no-json');
            }
          } catch {
            // Fallback: divide o vídeo uniformemente usando timestamps da transcrição
            logCorte(job, '⚠️ Usando seleção automática por partes do vídeo...');
            const dur = videoInfo.duration || transcript[transcript.length - 1]?.end || 300;
            const n = Math.min(5, Math.max(3, Math.floor(dur / 60)));
            const segSize = Math.round(dur / n);
            segments = Array.from({ length: n }, (_, i) => ({
              start: i * segSize,
              end: Math.min((i + 1) * segSize, dur),
              titulo: `Momento ${i + 1} — ${formatarTempo(i * segSize)}`,
              motivo: 'Seleção automática por intervalo',
              descricao: '', hashtags: [], fonte: 'divisao-automatica'
            }));
            logCorte(job, `✅ ${segments.length} segmentos gerados automaticamente`);
          }
        }
      }

      // Salvar segments.json
      await fs.writeFile(resolve(hostCorteDir, 'segments.json'), JSON.stringify(segments), 'utf-8');
      job.segments = segments;
      job.status = 'analisado';
      logCorte(job, `🎬 Análise concluída! ${segments.length} segmentos prontos para corte.`);

    } catch (err) {
      job.status = 'erro';
      logCorte(job, `❌ Erro: ${err.message}`);
      console.error('Erro corte analyze:', err);
    }
  })();
});

// GET /api/cortes/jobs — lista todos os jobs
app.get('/api/cortes/jobs', (req, res) => {
  res.json([...corteJobs.values()].map(j => ({
    id: j.id, status: j.status, etapa: j.etapa, youtubeUrl: j.youtubeUrl,
    videoInfo: j.videoInfo, segmentsCount: j.segments ? j.segments.length : 0
  })));
});

// GET /api/cortes/jobs/:id — detalhes + progresso
app.get('/api/cortes/jobs/:id', (req, res) => {
  const job = corteJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job não encontrado' });
  res.json(job);
});

// POST /api/cortes/jobs/:id/cut — corta os segmentos selecionados
app.post('/api/cortes/jobs/:id/cut', async (req, res) => {
  const job = corteJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job não encontrado' });
  if (!job.segments) return res.status(400).json({ error: 'Análise ainda não concluída' });

  const { segmentIndexes = [], formats = ['short', 'horizontal'] } = req.body;
  if (segmentIndexes.length === 0) return res.status(400).json({ error: 'Selecione pelo menos um segmento' });

  res.json({ ok: true });
  job.status = 'cortando';

  (async () => {
    try {
      const hostCorteDir = resolve(MEDIA_DIR, 'cortes', job.id);
      const selectedSegments = segmentIndexes.map(i => job.segments[i]).filter(Boolean);

      logCorte(job, `✂️ Cortando ${selectedSegments.length} segmento(s) nos formatos: ${formats.join(', ')}...`);

      const cutScript = `
import subprocess, json, sys, os

job_dir = sys.argv[1]
segments = json.loads(sys.argv[2])
formats = json.loads(sys.argv[3])
input_file = os.path.join(job_dir, 'original.mp4')
results = []

for idx, seg in enumerate(segments):
    start = seg['start']
    end = seg['end']
    duration = end - start

    if 'horizontal' in formats:
        out = os.path.join(job_dir, f'clip_{idx:03d}_horizontal.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-ss', str(start), '-i', input_file,
            '-t', str(duration), '-c:v', 'libx264', '-c:a', 'aac', '-b:a', '192k',
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
            '-movflags', '+faststart', out
        ], capture_output=True, timeout=300)
        if os.path.exists(out):
            results.append({'file': f'clip_{idx:03d}_horizontal.mp4', 'format': 'horizontal',
                            'titulo': seg.get('titulo', f'Clipe {idx+1}'), 'segIndex': idx,
                            'start': start, 'end': end})

    if 'short' in formats:
        short_dur = min(duration, 59)
        out = os.path.join(job_dir, f'clip_{idx:03d}_short.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-ss', str(start), '-i', input_file,
            '-t', str(short_dur),
            '-vf', 'crop=min(iw\\,ih*9/16):ih,scale=1080:1920',
            '-c:v', 'libx264', '-c:a', 'aac', '-b:a', '192k',
            '-movflags', '+faststart', out
        ], capture_output=True, timeout=300)
        if os.path.exists(out):
            results.append({'file': f'clip_{idx:03d}_short.mp4', 'format': 'short',
                            'titulo': seg.get('titulo', f'Short {idx+1}') + ' #Shorts', 'segIndex': idx,
                            'start': start, 'end': end})

# Compilação: concatena todos os horizontais na ordem
if 'compilation' in formats and len(segments) > 1:
    horiz_files = [r for r in results if r['format'] == 'horizontal']
    if horiz_files:
        list_path = os.path.join(job_dir, 'concat_list.txt')
        with open(list_path, 'w') as f:
            for r in horiz_files:
                f.write(f"file '{os.path.join(job_dir, r['file'])}'\\n")
        out = os.path.join(job_dir, 'compilation.mp4')
        subprocess.run([
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', list_path,
            '-c', 'copy', '-movflags', '+faststart', out
        ], capture_output=True, timeout=600)
        if os.path.exists(out):
            results.append({'file': 'compilation.mp4', 'format': 'compilation',
                            'titulo': 'Compilação dos melhores momentos', 'segIndex': -1})

print(json.dumps(results))
`;
      const cutScriptPath = resolve(hostCorteDir, 'cut.py');
      await fs.writeFile(cutScriptPath, cutScript, 'utf-8');

      const dockerCorteDirCut = NO_DOCKER ? hostCorteDir.replace(/\\/g, '/') : `/media/cortes/${job.id}`;
      const segmentsArg = JSON.stringify(selectedSegments).replace(/"/g, '\\"');
      const formatsArg = JSON.stringify(formats).replace(/"/g, '\\"');
      const cutCmd = makeExecCmd(`python "${dockerCorteDirCut}/cut.py" "${dockerCorteDirCut}" "${segmentsArg}" "${formatsArg}"`);
      const { stdout: cutOut } = await execAsync(cutCmd, { timeout: 1200000 });

      const clipsRaw = cutOut.trim().split('\n').pop();
      const clips = JSON.parse(clipsRaw);
      job.clips = clips.map(c => ({
        ...c,
        url: `/media/cortes/${job.id}/${c.file}`
      }));

      job.status = 'pronto';
      logCorte(job, `✅ ${clips.length} clipe(s) gerado(s) com sucesso!`);
    } catch (err) {
      job.status = 'erro_corte';
      logCorte(job, `❌ Erro no corte: ${err.message}`);
      console.error('Erro corte cut:', err);
    }
  })();
});

// POST /api/cortes/jobs/:id/publish — publica um clip no YouTube e/ou TikTok
app.post('/api/cortes/jobs/:id/publish', async (req, res) => {
  const job = corteJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job não encontrado' });

  const { clipFile, titulo, descricao = '', isShort = false, platforms = ['youtube'] } = req.body;
  if (!clipFile) return res.status(400).json({ error: 'clipFile obrigatório' });

  const hostClipPath = resolve(MEDIA_DIR, 'cortes', job.id, clipFile);
  if (!existsSync(hostClipPath)) return res.status(404).json({ error: 'Arquivo de clipe não encontrado' });

  const resultados = {};

  try {
    // ── YouTube ──────────────────────────────────────────────
    if (platforms.includes('youtube')) {
      if (!youtubeTokens.has('default')) {
        resultados.youtube = { erro: 'YouTube não autenticado' };
      } else {
        oauth2Client.setCredentials(youtubeTokens.get('default'));
        const tags = ['corte', 'highlights'];
        if (isShort) tags.push('Shorts');

        const uploadResp = await youtube.videos.insert({
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: titulo || 'Clipe',
              description: descricao || `Clipe extraído automaticamente pelo VideoForge.\n\nFonte: ${job.youtubeUrl}`,
              tags,
              categoryId: '22',
              defaultLanguage: 'pt-BR'
            },
            status: { privacyStatus: 'private', selfDeclaredMadeForKids: false }
          },
          media: { body: createReadStream(hostClipPath) }
        });

        const ytVideoId = uploadResp.data.id;
        resultados.youtube = { ok: true, id: ytVideoId, url: `https://youtu.be/${ytVideoId}` };
        logCorte(job, `📺 YouTube: "${titulo}" → https://youtu.be/${ytVideoId}`);
      }
    }

    // ── TikTok ───────────────────────────────────────────────
    if (platforms.includes('tiktok')) {
      if (!socialTokens.has('tiktok')) {
        resultados.tiktok = { erro: 'TikTok não autenticado' };
      } else {
        const tiktokToken = socialTokens.get('tiktok');
        const accessToken = tiktokToken.access_token;

        // 1. Inicializar upload
        const fileStats = await fs.stat(hostClipPath);
        const initResp = await axios.post('https://open.tiktokapis.com/v2/post/publish/video/init/',
          {
            post_info: {
              title: titulo || 'Clipe',
              description: descricao || '',
              privacy_level: 'SELF_ONLY', // privado por padrão (mude para PUBLIC_TO_EVERYONE)
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false
            },
            source_info: {
              source: 'FILE_UPLOAD',
              video_size: fileStats.size,
              chunk_size: fileStats.size,
              total_chunk_count: 1
            }
          },
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' } }
        );

        const { publish_id, upload_url } = initResp.data.data;

        // 2. Upload do arquivo
        const fileBuffer = await fs.readFile(hostClipPath);
        await axios.put(upload_url, fileBuffer, {
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Range': `bytes 0-${fileStats.size - 1}/${fileStats.size}`,
            'Content-Length': fileStats.size
          }
        });

        resultados.tiktok = { ok: true, publishId: publish_id };
        logCorte(job, `🎵 TikTok: "${titulo}" enviado (ID: ${publish_id})`);
      }
    }

    res.json({ ok: true, ...resultados });
  } catch (err) {
    console.error('Erro publicar corte:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message, resultados });
  }
});

// GET /api/cortes/analytics/:videoId — retenção do YouTube Analytics (canal próprio)
app.get('/api/cortes/analytics/:videoId', async (req, res) => {
  try {
    if (!youtubeTokens.has('default')) return res.status(401).json({ error: 'YouTube não autenticado' });
    oauth2Client.setCredentials(youtubeTokens.get('default'));

    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });
    const hoje = new Date().toISOString().split('T')[0];
    const ret = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: '2020-01-01',
      endDate: hoje,
      metrics: 'audienceWatchRatio',
      dimensions: 'elapsedVideoTimeRatio',
      filters: `video==${req.params.videoId}`
    });

    res.json(ret.data);
  } catch (err) {
    console.error('Erro analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// AGENDAMENTO AUTOMÁTICO (node-cron)
// ============================================
let cronTask = null;

function agendarCronNoticias(config) {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }

  if (!config || !config.ativo) {
    console.log('⏰ Agendamento de notícias: DESATIVADO');
    return;
  }

  const horario = config.horario_agendamento || '07:00';
  const [hora, minuto] = horario.split(':').map(Number);
  const cronExpr = `${minuto} ${hora} * * *`;

  cronTask = cron.schedule(cronExpr, async () => {
    console.log(`\n📰 ===== AGENDAMENTO AUTOMÁTICO: ${new Date().toLocaleString('pt-BR')} =====`);
    try {
      await executarPipelineNoticias({ publicarYoutube: config.publicar_youtube || false });
    } catch (err) {
      console.error('❌ Erro no pipeline agendado:', err);
    }
  });

  console.log(`⏰ Agendamento de notícias: ${horario} (cron: ${cronExpr})`);
}

// Inicializar agendamento ao boot
(async () => {
  try {
    const config = await getNewsConfig();
    agendarCronNoticias(config);
  } catch (err) {
    console.log('⚠️ Agendamento news não iniciado (banco indisponível):', err.message);
  }
})();

// SPA fallback - serve index.html para rotas não-API
if (frontendPath) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(resolve(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Rota não encontrada' });
    }
  });
}

app.listen(PORT, () => {
  console.log('');
  console.log('🎬 ==========================================');
  console.log('   VideoForge API');
  console.log('============================================');
  console.log(`🚀 Servidor: http://localhost:${PORT}`);
  console.log(`📡 n8n: ${N8N_URL}`);
  console.log('');
  console.log('📊 Status das integrações:');
  console.log(`  🤖 Gemini: ${GEMINI_API_KEY && GEMINI_API_KEY !== 'sua_chave_aqui' ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`  🖼️  Pexels: ${PEXELS_API_KEY && PEXELS_API_KEY !== 'sua_chave_aqui' ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`  📺 YouTube: ${process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_ID !== 'seu_client_id_aqui' ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log('');
  console.log('💡 Configure as APIs em backend/.env');
  console.log('============================================');
  console.log('');
});