// backend/social-oauth.js — OAuth simplificado por usuário
// Admin configura CLIENT_ID/SECRET uma vez → usuário só clica "Conectar"
import { randomBytes, createHash } from 'crypto';
import pool from './news/db.js';
import { verificarToken, buscarUsuarioPorEmail } from './auth.js';
import axios from 'axios';
import { google } from 'googleapis';

// ========================================
// Estado temporário das autorizações (TTL 10min)
// ========================================
const pendingOAuth = new Map(); // state → { userId, platform, codeVerifier, ts }

// Limpar estados expirados a cada 5min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingOAuth) {
    if (now - val.ts > 10 * 60 * 1000) pendingOAuth.delete(key);
  }
}, 5 * 60 * 1000);

// ========================================
// Helper: detectar URL base
// ========================================
function getBaseUrl(req) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// ========================================
// Helper: HTML bonito de callback
// ========================================
function callbackHtml(platform, emoji, success, message) {
  const color = success ? '#22c55e' : '#ef4444';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>VideoForge - ${platform}</title></head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:50px;
background:linear-gradient(135deg,#1a1025,#2d1b4e);color:white;min-height:100vh;margin:0;">
<div style="max-width:400px;margin:60px auto;background:rgba(255,255,255,0.06);
border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(20px);
border-radius:24px;padding:40px;">
<div style="font-size:56px;margin-bottom:16px;">${emoji}</div>
<div style="font-size:38px;margin-bottom:12px;">${success ? '✅' : '❌'}</div>
<h2 style="font-size:22px;margin:0 0 8px;color:#e2e8f0;">${success ? `${platform} conectado!` : 'Erro na conexão'}</h2>
<p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">${message}</p>
<div style="width:60px;height:4px;background:${color};border-radius:2px;margin:0 auto;"></div>
<p style="color:#64748b;font-size:12px;margin-top:20px;">Fechando automaticamente...</p>
</div>
<script>setTimeout(()=>window.close(),2500)</script>
</body></html>`;
}

// ========================================
// Middleware: extrair userId do token
// ========================================
async function requireUser(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: 'Não autenticado' }); return null; }
  const payload = verificarToken(token);
  if (!payload) { res.status(401).json({ error: 'Token inválido' }); return null; }
  const user = await buscarUsuarioPorEmail(payload.email);
  if (!user?.ativo) { res.status(403).json({ error: 'Conta inativa' }); return null; }
  return user;
}

// ========================================
// Definições das plataformas
// ========================================
const PLATFORMS = {
  youtube: {
    label: 'YouTube', emoji: '▶️', color: '#FF0000',
    desc: 'Publique vídeos direto no seu canal',
    configured: () => !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
  },
  twitter: {
    label: 'Twitter/X', emoji: '𝕏', color: '#000000',
    desc: 'Compartilhe clipes e links automaticamente',
    configured: () => !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    scopes: 'tweet.read tweet.write users.read offline.access',
  },
  facebook: {
    label: 'Facebook', emoji: '📘', color: '#1877F2',
    desc: 'Publique vídeos na sua página',
    configured: () => !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    scopes: 'public_profile,publish_video,pages_manage_posts,pages_read_engagement',
  },
  instagram: {
    label: 'Instagram', emoji: '📷', color: '#E4405F',
    desc: 'Publique reels e stories',
    configured: () => !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    scopes: 'instagram_basic,instagram_content_publish',
  },
  linkedin: {
    label: 'LinkedIn', emoji: '💼', color: '#0A66C2',
    desc: 'Compartilhe conteúdo profissional',
    configured: () => !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    scopes: 'openid profile w_member_social',
  },
  tiktok: {
    label: 'TikTok', emoji: '🎵', color: '#010101',
    desc: 'Suba shorts e vídeos curtos',
    configured: () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    scopes: 'user.info.basic,video.publish,video.upload',
  },
};

// ========================================
// REGISTRAR ROTAS OAUTH POR USUÁRIO
// ========================================
export function registrarRotasSocialOAuth(app) {

  // ────────────────────────────────────
  // GET /api/user/social/platforms
  // Lista todas as redes e status de conexão do usuário
  // ────────────────────────────────────
  app.get('/api/user/social/platforms', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    try {
      const { rows } = await pool.query(
        `SELECT platform, profile_name, profile_id, profile_image, connected, metadata, updated_at
         FROM user_social_tokens WHERE user_id = $1`,
        [user.id]
      );
      const connMap = {};
      rows.forEach(r => { connMap[r.platform] = r; });

      const platforms = Object.entries(PLATFORMS).map(([key, def]) => {
        const conn = connMap[key];
        return {
          platform: key,
          label: def.label,
          emoji: def.emoji,
          color: def.color,
          desc: def.desc,
          available: def.configured(), // admin configurou as credenciais?
          connected: !!conn?.connected,
          profile: conn ? {
            name: conn.profile_name,
            id: conn.profile_id,
            image: conn.profile_image,
          } : null,
          connectedAt: conn?.updated_at,
        };
      });

      res.json(platforms);
    } catch (e) {
      console.error('Social platforms GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ────────────────────────────────────
  // GET /api/user/social/:platform/auth
  // Inicia o fluxo OAuth — retorna { authUrl }
  // ────────────────────────────────────
  app.get('/api/user/social/:platform/auth', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const { platform } = req.params;
    const def = PLATFORMS[platform];
    if (!def) return res.status(400).json({ error: 'Plataforma não suportada' });
    if (!def.configured()) return res.status(400).json({ error: `Para conectar ${def.label}, o administrador precisa configurar as credenciais OAuth na aba 🔑 API Keys do Painel Admin.` });

    const state = randomBytes(24).toString('hex');
    const codeVerifier = randomBytes(48).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/user/social/${platform}/callback`;

    pendingOAuth.set(state, { userId: user.id, platform, codeVerifier, redirectUri, ts: Date.now() });

    let authUrl;
    switch (platform) {
      case 'youtube': {
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(process.env.YOUTUBE_CLIENT_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(def.scopes.join(' '))}` +
          `&access_type=offline&prompt=consent` +
          `&state=${state}`;
        break;
      }
      case 'twitter': {
        authUrl = `https://twitter.com/i/oauth2/authorize?` +
          `response_type=code&client_id=${encodeURIComponent(process.env.TWITTER_CLIENT_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(def.scopes)}` +
          `&state=${state}` +
          `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        break;
      }
      case 'facebook': {
        authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
          `client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(def.scopes)}` +
          `&response_type=code` +
          `&state=${state}`;
        break;
      }
      case 'instagram': {
        // Instagram usa Facebook Login
        authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
          `client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(def.scopes)}` +
          `&response_type=code` +
          `&state=${state}`;
        break;
      }
      case 'linkedin': {
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
          `response_type=code&client_id=${encodeURIComponent(process.env.LINKEDIN_CLIENT_ID)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent(def.scopes)}` +
          `&state=${state}`;
        break;
      }
      case 'tiktok': {
        authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
          `client_key=${encodeURIComponent(process.env.TIKTOK_CLIENT_KEY)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(def.scopes)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&state=${state}` +
          `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        break;
      }
    }

    res.json({ authUrl });
  });

  // ────────────────────────────────────
  // CALLBACKS — rotas públicas (sem auth header)
  // ────────────────────────────────────

  // YouTube callback
  app.get('/api/user/social/youtube/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) return res.send(callbackHtml('YouTube', '▶️', false, `Google recusou: ${error}`));

    const pending = pendingOAuth.get(state);
    if (!pending) return res.send(callbackHtml('YouTube', '▶️', false, 'Sessão expirada. Tente novamente.'));
    pendingOAuth.delete(state);

    try {
      const oauth2 = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        pending.redirectUri
      );
      const { tokens } = await oauth2.getToken(code);
      oauth2.setCredentials(tokens);

      // Buscar info do canal
      const yt = google.youtube({ version: 'v3', auth: oauth2 });
      let profileName = '', profileId = '', profileImage = '', metadata = {};
      try {
        const ch = await yt.channels.list({ part: ['snippet', 'statistics'], mine: true });
        const channel = ch.data.items?.[0];
        if (channel) {
          profileName = channel.snippet.title;
          profileId = channel.id;
          profileImage = channel.snippet.thumbnails?.default?.url || '';
          metadata = {
            subscribers: channel.statistics?.subscriberCount,
            videoCount: channel.statistics?.videoCount,
            customUrl: channel.snippet.customUrl,
          };
        }
      } catch (e) { console.warn('YouTube channel info:', e.message); }

      await saveToken(pending.userId, 'youtube', tokens.access_token, tokens.refresh_token,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        profileName, profileId, profileImage, metadata);

      res.send(callbackHtml('YouTube', '▶️', true, profileName ? `Canal: ${profileName}` : 'Conta conectada com sucesso!'));
    } catch (e) {
      console.error('YouTube OAuth error:', e.message);
      res.send(callbackHtml('YouTube', '▶️', false, e.message));
    }
  });

  // Twitter/X callback
  app.get('/api/user/social/twitter/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) return res.send(callbackHtml('Twitter/X', '𝕏', false, `Twitter recusou: ${error}`));

    const pending = pendingOAuth.get(state);
    if (!pending) return res.send(callbackHtml('Twitter/X', '𝕏', false, 'Sessão expirada. Tente novamente.'));
    pendingOAuth.delete(state);

    try {
      const tokenResp = await axios.post('https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: process.env.TWITTER_CLIENT_ID,
          redirect_uri: pending.redirectUri,
          code_verifier: pending.codeVerifier,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: process.env.TWITTER_CLIENT_ID, password: process.env.TWITTER_CLIENT_SECRET },
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResp.data;
      let profileName = '', profileId = '', profileImage = '';
      try {
        const me = await axios.get('https://api.twitter.com/2/users/me', {
          headers: { Authorization: `Bearer ${access_token}` },
          params: { 'user.fields': 'name,username,profile_image_url' },
        });
        profileName = `@${me.data.data.username}`;
        profileId = me.data.data.id;
        profileImage = me.data.data.profile_image_url || '';
      } catch (e) { console.warn('Twitter profile:', e.message); }

      const expiry = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
      await saveToken(pending.userId, 'twitter', access_token, refresh_token, expiry, profileName, profileId, profileImage, {});

      res.send(callbackHtml('Twitter/X', '𝕏', true, profileName || 'Conta conectada!'));
    } catch (e) {
      console.error('Twitter OAuth error:', e.response?.data || e.message);
      res.send(callbackHtml('Twitter/X', '𝕏', false, e.response?.data?.error_description || e.message));
    }
  });

  // Facebook callback
  app.get('/api/user/social/facebook/callback', async (req, res) => {
    const { code, state, error_description } = req.query;
    if (error_description) return res.send(callbackHtml('Facebook', '📘', false, error_description));

    const pending = pendingOAuth.get(state);
    if (!pending) return res.send(callbackHtml('Facebook', '📘', false, 'Sessão expirada.'));
    pendingOAuth.delete(state);

    try {
      // Trocar code por token
      const tokenResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: pending.redirectUri,
          code,
        },
      });

      // Token de longa duração
      const longResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: tokenResp.data.access_token,
        },
      });

      const access_token = longResp.data.access_token;
      const expires_in = longResp.data.expires_in;
      let profileName = '', profileId = '', profileImage = '';
      try {
        const me = await axios.get('https://graph.facebook.com/me', {
          params: { access_token, fields: 'id,name,picture' },
        });
        profileName = me.data.name;
        profileId = me.data.id;
        profileImage = me.data.picture?.data?.url || '';
      } catch (e) { console.warn('Facebook profile:', e.message); }

      const expiry = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
      await saveToken(pending.userId, 'facebook', access_token, null, expiry, profileName, profileId, profileImage, {});

      res.send(callbackHtml('Facebook', '📘', true, profileName || 'Conta conectada!'));
    } catch (e) {
      console.error('Facebook OAuth error:', e.response?.data || e.message);
      res.send(callbackHtml('Facebook', '📘', false, e.message));
    }
  });

  // Instagram callback (via Facebook Login)
  app.get('/api/user/social/instagram/callback', async (req, res) => {
    const { code, state, error_description } = req.query;
    if (error_description) return res.send(callbackHtml('Instagram', '📷', false, error_description));

    const pending = pendingOAuth.get(state);
    if (!pending) return res.send(callbackHtml('Instagram', '📷', false, 'Sessão expirada.'));
    pendingOAuth.delete(state);

    try {
      const tokenResp = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: pending.redirectUri,
          code,
        },
      });

      const access_token = tokenResp.data.access_token;
      let profileName = '', profileId = '', profileImage = '';
      try {
        // Buscar Instagram Business Account via Facebook Pages
        const pages = await axios.get('https://graph.facebook.com/me/accounts', {
          params: { access_token, fields: 'instagram_business_account,name' },
        });
        const page = pages.data.data?.find(p => p.instagram_business_account);
        if (page) {
          const igId = page.instagram_business_account.id;
          const ig = await axios.get(`https://graph.facebook.com/${igId}`, {
            params: { access_token, fields: 'username,profile_picture_url,followers_count' },
          });
          profileName = `@${ig.data.username}`;
          profileId = igId;
          profileImage = ig.data.profile_picture_url || '';
        }
      } catch (e) { console.warn('Instagram profile:', e.message); }

      await saveToken(pending.userId, 'instagram', access_token, null, null, profileName, profileId, profileImage, {});

      res.send(callbackHtml('Instagram', '📷', true, profileName || 'Conta conectada!'));
    } catch (e) {
      console.error('Instagram OAuth error:', e.response?.data || e.message);
      res.send(callbackHtml('Instagram', '📷', false, e.message));
    }
  });

  // LinkedIn callback
  app.get('/api/user/social/linkedin/callback', async (req, res) => {
    const { code, state, error_description } = req.query;
    if (error_description) return res.send(callbackHtml('LinkedIn', '💼', false, error_description));

    const pending = pendingOAuth.get(state);
    if (!pending) return res.send(callbackHtml('LinkedIn', '💼', false, 'Sessão expirada.'));
    pendingOAuth.delete(state);

    try {
      const tokenResp = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: pending.redirectUri,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, expires_in } = tokenResp.data;
      let profileName = '', profileId = '', profileImage = '';
      try {
        const me = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        profileName = me.data.name || me.data.given_name || '';
        profileId = me.data.sub || '';
        profileImage = me.data.picture || '';
      } catch (e) { console.warn('LinkedIn profile:', e.message); }

      const expiry = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
      await saveToken(pending.userId, 'linkedin', access_token, null, expiry, profileName, profileId, profileImage, {});

      res.send(callbackHtml('LinkedIn', '💼', true, profileName || 'Conta conectada!'));
    } catch (e) {
      console.error('LinkedIn OAuth error:', e.response?.data || e.message);
      res.send(callbackHtml('LinkedIn', '💼', false, e.message));
    }
  });

  // TikTok callback
  app.get('/api/user/social/tiktok/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    if (error) return res.send(callbackHtml('TikTok', '🎵', false, error_description || error));

    const pending = pendingOAuth.get(state);
    if (!pending) return res.send(callbackHtml('TikTok', '🎵', false, 'Sessão expirada.'));
    pendingOAuth.delete(state);

    try {
      const tokenResp = await axios.post('https://open.tiktokapis.com/v2/oauth/token/',
        new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: pending.redirectUri,
          code_verifier: pending.codeVerifier,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token, expires_in, open_id } = tokenResp.data;
      let profileName = '', profileImage = '';
      try {
        const me = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
          headers: { Authorization: `Bearer ${access_token}` },
          params: { fields: 'display_name,avatar_url' },
        });
        profileName = me.data.data?.user?.display_name || '';
        profileImage = me.data.data?.user?.avatar_url || '';
      } catch (e) { console.warn('TikTok profile:', e.message); }

      const expiry = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
      await saveToken(pending.userId, 'tiktok', access_token, refresh_token, expiry, profileName, open_id || '', profileImage, {});

      res.send(callbackHtml('TikTok', '🎵', true, profileName || 'Conta conectada!'));
    } catch (e) {
      console.error('TikTok OAuth error:', e.response?.data || e.message);
      res.send(callbackHtml('TikTok', '🎵', false, JSON.stringify(e.response?.data || e.message)));
    }
  });

  // ────────────────────────────────────
  // POST /api/user/social/:platform/disconnect
  // ────────────────────────────────────
  app.post('/api/user/social/:platform/disconnect', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      await pool.query(
        `UPDATE user_social_tokens SET connected = false, access_token = NULL, refresh_token = NULL, updated_at = NOW()
         WHERE user_id = $1 AND platform = $2`,
        [user.id, req.params.platform]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log('🔗 Rotas OAuth social por usuário registradas');
}

// ========================================
// Salvar token no banco
// ========================================
async function saveToken(userId, platform, access_token, refresh_token, expiry, profileName, profileId, profileImage, metadata) {
  await pool.query(
    `INSERT INTO user_social_tokens (user_id, platform, access_token, refresh_token, token_expiry, profile_name, profile_id, profile_image, metadata, connected)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
     ON CONFLICT (user_id, platform) DO UPDATE SET
       access_token = $3, refresh_token = $4, token_expiry = $5,
       profile_name = $6, profile_id = $7, profile_image = $8,
       metadata = $9, connected = true, updated_at = NOW()`,
    [userId, platform, access_token, refresh_token, expiry, profileName, profileId, profileImage, JSON.stringify(metadata || {})]
  );
  console.log(`✅ ${platform} conectado para user ${userId.slice(0, 8)}...`);
}
