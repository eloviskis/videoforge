// backend/user-settings.js — Rotas de configuração por usuário (API keys + Social)
import pool from './news/db.js';
import { verificarToken, buscarUsuarioPorEmail } from './auth.js';

// ========================================
// MIDDLEWARE: extrair usuário do token
// ========================================
async function userMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  const payload = verificarToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido' });

  const user = await buscarUsuarioPorEmail(payload.email);
  if (!user || !user.ativo) return res.status(403).json({ error: 'Conta inativa' });

  req.user = user;
  next();
}

// ========================================
// Definições de keys que o usuário pode configurar
// ========================================
const USER_KEY_DEFS = [
  // IA obrigatórias
  { key: 'GEMINI_API_KEY',          grupo: 'ia',    label: 'Google Gemini',             icon: '🧠', required: true, free: true,  hint: 'https://aistudio.google.com/apikey', desc: 'Gera roteiros, legendas e análise de conteúdo' },
  { key: 'PEXELS_API_KEY',          grupo: 'ia',    label: 'Pexels (Imagens)',          icon: '🖼️', required: true, free: true,  hint: 'https://www.pexels.com/api/', desc: 'Imagens de fundo para seus vídeos' },
  // IA opcionais
  { key: 'OPENAI_API_KEY',          grupo: 'ia',    label: 'OpenAI (GPT + DALL-E + TTS)', icon: '🤖', free: false, hint: 'https://platform.openai.com/api-keys', desc: 'Vozes naturais, imagens por IA e texto avançado' },
  { key: 'OPENROUTER_API_KEY',      grupo: 'ia',    label: 'OpenRouter',                icon: '🔀', free: false, hint: 'https://openrouter.ai/keys', desc: 'Acesso a múltiplos modelos de IA' },
  // Vídeo por IA
  { key: 'REPLICATE_API_TOKEN',     grupo: 'video', label: 'Replicate (Wan 2.1)',       icon: '🎬', free: false, hint: 'https://replicate.com/account/api-tokens', desc: 'Gera vídeos realistas com IA' },
  { key: 'KLING_ACCESS_KEY_ID',     grupo: 'video', label: 'Kling AI — Key ID',        icon: '🎥', free: false, hint: 'https://platform.klingai.com', desc: 'Vídeos cinematográficos com IA' },
  { key: 'KLING_ACCESS_KEY_SECRET', grupo: 'video', label: 'Kling AI — Key Secret',    icon: '🔐', free: false, hint: '' },
  { key: 'HUGGINGFACE_API_TOKEN',   grupo: 'video', label: 'Hugging Face',             icon: '🤗', free: false, hint: 'https://huggingface.co/settings/tokens', desc: 'Modelos open-source de vídeo' },
  { key: 'DID_API_KEY',             grupo: 'video', label: 'D-ID (Avatar)',            icon: '👤', free: false, hint: 'https://studio.d-id.com/', desc: 'Avatar apresentador no vídeo' },
  { key: 'DID_PRESENTER_URL',       grupo: 'video', label: 'D-ID — URL do Apresentador', icon: '📸', free: false, hint: '' },
  { key: 'HEYGEN_API_KEY',          grupo: 'video', label: 'HeyGen (Avatar IA)',         icon: '🎭', free: false, hint: 'https://app.heygen.com/api-key', desc: 'Avatar IA realista lendo a narração com sincronismo labial' },
  { key: 'HEYGEN_AVATAR_ID',        grupo: 'video', label: 'HeyGen — Avatar ID',         icon: '🧑', free: false, hint: 'https://app.heygen.com/avatars' },
  { key: 'HEYGEN_VOICE_ID',         grupo: 'video', label: 'HeyGen — Voice ID (opcional)', icon: '🎙️', free: false, hint: 'https://app.heygen.com/voices' },
  // TTS
  { key: 'ELEVENLABS_API_KEY',      grupo: 'tts',   label: 'ElevenLabs',               icon: '🗣️', free: false, hint: 'https://elevenlabs.io/subscription', desc: 'Vozes ultra-realistas para narração' },
  { key: 'ELEVENLABS_VOICE_ID',     grupo: 'tts',   label: 'ElevenLabs — Voice ID',    icon: '🎙️', free: false, hint: '' },
  // ComfyUI — Motor de IA local/remoto
  { key: 'COMFYUI_URL',              grupo: 'comfyui', label: 'ComfyUI — URL do Servidor',       icon: '🖥️', free: true,  hint: 'Ex: http://192.168.1.100:8188', desc: 'URL do seu servidor ComfyUI (local ou cloud GPU como RunPod)' },
  { key: 'COMFYUI_CHECKPOINT',       grupo: 'comfyui', label: 'ComfyUI — Modelo/Checkpoint',     icon: '🧠', free: true,  hint: 'Nome do .safetensors em models/checkpoints', desc: 'Ex: dreamshaper_8.safetensors, juggernautXL.safetensors, flux1-dev.safetensors' },
  { key: 'COMFYUI_STEPS',            grupo: 'comfyui', label: 'ComfyUI — Steps de Inferência',   icon: '⚙️', free: true,  hint: 'Padrão: 25', desc: 'Mais steps = mais qualidade, mais lento. Recomendado: 20-30' },
  { key: 'COMFYUI_CFG',              grupo: 'comfyui', label: 'ComfyUI — CFG Scale',             icon: '🎛️', free: true,  hint: 'Padrão: 7.0', desc: 'Quanto o modelo segue o prompt (1-15). Recomendado: 5-8' },
  { key: 'COMFYUI_WORKFLOW_JSON',    grupo: 'comfyui', label: 'ComfyUI — Workflow JSON (avançado)', icon: '📋', free: true,  hint: 'Cole o JSON exportado do ComfyUI', desc: 'Workflow personalizado. Exporte via Save (API Format) no ComfyUI e cole aqui.' },
  // Mídia
  { key: 'PIXABAY_API_KEY',         grupo: 'media', label: 'Pixabay (Música)',          icon: '🎵', free: true,  hint: 'https://pixabay.com/api/docs/', desc: 'Músicas de fundo gratuitas para vídeos' },
];

// NOTA: Social connections foram movidas para social-oauth.js (fluxo OAuth simplificado)

function maskValue(val) {
  if (!val || val.length < 8) return val ? '••••' : '';
  return val.slice(0, 4) + '····' + val.slice(-4);
}

// ========================================
// REGISTRAR ROTAS
// ========================================
export function registrarRotasUserSettings(app) {

  // ══════════════════════════════════════
  // API KEYS DO USUÁRIO
  // ══════════════════════════════════════

  // GET: listar keys do usuário (com status)
  app.get('/api/user/apikeys', userMiddleware, async (req, res) => {
    try {
      const { rows: savedKeys } = await pool.query(
        'SELECT key_name, key_value FROM user_api_keys WHERE user_id = $1',
        [req.user.id]
      );
      const savedMap = {};
      savedKeys.forEach(r => savedMap[r.key_name] = r.key_value);

      const keys = USER_KEY_DEFS.map(def => {
        const userVal = savedMap[def.key] || '';
        const globalVal = process.env[def.key] || '';
        const activeVal = userVal || globalVal;
        return {
          ...def,
          configurada: !!userVal,
          globalDisponivel: !!globalVal && !userVal,
          preview: userVal ? maskValue(userVal) : '',
          fonte: userVal ? 'pessoal' : globalVal ? 'global' : 'nenhuma',
        };
      });

      // Agrupar
      const grupos = {
        ia:    { label: '🧠 Inteligência Artificial', keys: [] },
        video: { label: '🎬 Geração de Vídeo por IA', keys: [] },
        tts:   { label: '🗣️ Text-to-Speech (Narração)', keys: [] },
        media: { label: '🎵 Banco de Mídia', keys: [] },
      };
      keys.forEach(k => {
        if (grupos[k.grupo]) grupos[k.grupo].keys.push(k);
      });

      res.json({ keys, grupos });
    } catch (e) {
      console.error('User apikeys GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // PUT: salvar keys do usuário
  app.put('/api/user/apikeys', userMiddleware, async (req, res) => {
    try {
      const { keys } = req.body; // { GEMINI_API_KEY: 'xxx', ... }
      if (!keys || typeof keys !== 'object') return res.status(400).json({ error: 'Envie { keys: { KEY: "valor" } }' });

      const validKeys = new Set(USER_KEY_DEFS.map(d => d.key));
      let updated = 0;

      for (const [keyName, valor] of Object.entries(keys)) {
        if (!validKeys.has(keyName)) continue;

        if (valor && valor.trim()) {
          await pool.query(
            `INSERT INTO user_api_keys (user_id, key_name, key_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, key_name) DO UPDATE SET key_value = $3, updated_at = NOW()`,
            [req.user.id, keyName, valor.trim()]
          );
          updated++;
        } else {
          await pool.query(
            'DELETE FROM user_api_keys WHERE user_id = $1 AND key_name = $2',
            [req.user.id, keyName]
          );
        }
      }

      res.json({ ok: true, updated, message: `${updated} chave(s) salva(s)!` });
    } catch (e) {
      console.error('User apikeys PUT:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE: remover uma key
  app.delete('/api/user/apikeys/:keyName', userMiddleware, async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM user_api_keys WHERE user_id = $1 AND key_name = $2',
        [req.user.id, req.params.keyName]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════
  // SOCIAL CONNECTIONS → Movido para social-oauth.js
  // ══════════════════════════════════════

  // ══════════════════════════════════════
  // PERFIL DO USUÁRIO
  // ══════════════════════════════════════

  // GET: resumo da conta
  app.get('/api/user/profile', userMiddleware, async (req, res) => {
    try {
      const { rows: keyCount } = await pool.query(
        'SELECT COUNT(*) as total FROM user_api_keys WHERE user_id = $1', [req.user.id]
      );
      const { rows: socialCount } = await pool.query(
        "SELECT COUNT(*) as total FROM user_social_tokens WHERE user_id = $1 AND connected = true", [req.user.id]
      );

      res.json({
        id: req.user.id,
        email: req.user.email,
        nome: req.user.nome,
        plano: req.user.plano,
        ativo: req.user.ativo,
        videos_mes_limite: req.user.videos_mes_limite,
        videos_mes_usados: req.user.videos_mes_usados,
        api_keys_configuradas: parseInt(keyCount[0].total),
        redes_conectadas: parseInt(socialCount[0].total),
        created_at: req.user.created_at,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log('👤 Rotas de configuração do usuário registradas');
}

// ========================================
// HELPER: obter key do usuário ou global
// ========================================
export async function getUserApiKey(userId, keyName) {
  try {
    const { rows } = await pool.query(
      'SELECT key_value FROM user_api_keys WHERE user_id = $1 AND key_name = $2',
      [userId, keyName]
    );
    if (rows.length > 0 && rows[0].key_value) return rows[0].key_value;
  } catch { /* fallback to global */ }
  return process.env[keyName] || '';
}
