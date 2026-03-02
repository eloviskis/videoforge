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
  // TTS
  { key: 'ELEVENLABS_API_KEY',      grupo: 'tts',   label: 'ElevenLabs',               icon: '🗣️', free: false, hint: 'https://elevenlabs.io/subscription', desc: 'Vozes ultra-realistas para narração' },
  { key: 'ELEVENLABS_VOICE_ID',     grupo: 'tts',   label: 'ElevenLabs — Voice ID',    icon: '🎙️', free: false, hint: '' },
  // Mídia
  { key: 'PIXABAY_API_KEY',         grupo: 'media', label: 'Pixabay (Música)',          icon: '🎵', free: true,  hint: 'https://pixabay.com/api/docs/', desc: 'Músicas de fundo gratuitas para vídeos' },
];

const SOCIAL_DEFS = [
  { platform: 'youtube',   label: 'YouTube',   icon: '▶️',  color: '#FF0000', desc: 'Publique vídeos direto no seu canal', scopes: 'youtube.upload youtube.readonly' },
  { platform: 'twitter',   label: 'Twitter/X', icon: '𝕏',   color: '#000000', desc: 'Compartilhe clipes e links automaticamente' },
  { platform: 'facebook',  label: 'Facebook',  icon: '📘',  color: '#1877F2', desc: 'Publique vídeos na sua página' },
  { platform: 'linkedin',  label: 'LinkedIn',  icon: '💼',  color: '#0A66C2', desc: 'Compartilhe conteúdo profissional' },
  { platform: 'tiktok',    label: 'TikTok',    icon: '🎵',  color: '#000000', desc: 'Suba shorts e vídeos curtos' },
  { platform: 'instagram', label: 'Instagram',  icon: '📷',  color: '#E4405F', desc: 'Publique reels e stories' },
];

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
  // SOCIAL CONNECTIONS DO USUÁRIO
  // ══════════════════════════════════════

  // GET: status de todas as redes sociais do usuário
  app.get('/api/user/social', userMiddleware, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT platform, profile_name, profile_id, profile_image, connected, metadata, updated_at FROM user_social_tokens WHERE user_id = $1',
        [req.user.id]
      );
      const connMap = {};
      rows.forEach(r => connMap[r.platform] = r);

      // Verificar quais redes têm credenciais (global ou do usuário)
      const { rows: userKeys } = await pool.query(
        "SELECT key_name FROM user_api_keys WHERE user_id = $1 AND key_name LIKE '%CLIENT%' OR key_name LIKE '%APP_%'",
        [req.user.id]
      );
      const userKeySet = new Set(userKeys.map(r => r.key_name));

      const socials = SOCIAL_DEFS.map(def => {
        const conn = connMap[def.platform] || null;
        let configured = false;

        // Verificar se as credenciais da rede existem (global ou usuário)
        switch (def.platform) {
          case 'youtube':
            configured = !!(process.env.YOUTUBE_CLIENT_ID || userKeySet.has('YOUTUBE_CLIENT_ID'));
            break;
          case 'twitter':
            configured = !!(process.env.TWITTER_CLIENT_ID || process.env.TWITTER_BEARER_TOKEN || userKeySet.has('TWITTER_CLIENT_ID'));
            break;
          case 'facebook':
          case 'instagram':
            configured = !!(process.env.FACEBOOK_APP_ID || userKeySet.has('FACEBOOK_APP_ID'));
            break;
          case 'linkedin':
            configured = !!(process.env.LINKEDIN_CLIENT_ID || userKeySet.has('LINKEDIN_CLIENT_ID'));
            break;
          case 'tiktok':
            configured = !!(process.env.TIKTOK_CLIENT_KEY || userKeySet.has('TIKTOK_CLIENT_KEY'));
            break;
        }

        return {
          ...def,
          configured,
          connected: !!conn?.connected,
          profile: conn ? {
            name: conn.profile_name,
            id: conn.profile_id,
            image: conn.profile_image,
            metadata: conn.metadata,
          } : null,
          lastUpdate: conn?.updated_at,
        };
      });

      res.json(socials);
    } catch (e) {
      console.error('User social GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST: salvar token social (chamado após OAuth callback)
  app.post('/api/user/social/:platform/connect', userMiddleware, async (req, res) => {
    try {
      const { platform } = req.params;
      const { access_token, refresh_token, token_expiry, profile_name, profile_id, profile_image, metadata } = req.body;

      await pool.query(
        `INSERT INTO user_social_tokens (user_id, platform, access_token, refresh_token, token_expiry, profile_name, profile_id, profile_image, metadata, connected)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT (user_id, platform) DO UPDATE SET
           access_token = $3, refresh_token = $4, token_expiry = $5,
           profile_name = $6, profile_id = $7, profile_image = $8,
           metadata = $9, connected = true, updated_at = NOW()`,
        [req.user.id, platform, access_token, refresh_token, token_expiry, profile_name, profile_id, profile_image, JSON.stringify(metadata || {})]
      );

      res.json({ ok: true, message: `${platform} conectado!` });
    } catch (e) {
      console.error('User social connect:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST: desconectar rede social
  app.post('/api/user/social/:platform/disconnect', userMiddleware, async (req, res) => {
    try {
      await pool.query(
        'UPDATE user_social_tokens SET connected = false, access_token = NULL, refresh_token = NULL, updated_at = NOW() WHERE user_id = $1 AND platform = $2',
        [req.user.id, req.params.platform]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE: remover conexão completamente
  app.delete('/api/user/social/:platform', userMiddleware, async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM user_social_tokens WHERE user_id = $1 AND platform = $2',
        [req.user.id, req.params.platform]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

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
