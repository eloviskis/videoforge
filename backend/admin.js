import pool from './news/db.js';
import { buscarUsuarioPorEmail, verificarToken, atualizarUsuario, hashSenha } from './auth.js';
import { existsSync, createReadStream, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ========================================
// MIDDLEWARE: verificar se é admin
// ========================================
async function adminMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  const payload = verificarToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido' });

  const user = await buscarUsuarioPorEmail(payload.email);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Acesso negado. Somente admins.' });

  req.adminUser = user;
  next();
}

// ========================================
// REGISTRAR ROTAS ADMIN
// ========================================
export function registrarRotasAdmin(app) {

  // ── Sincronizar API keys entre process.env ↔ DB ──
  (async () => {
    try {
      // Lista de env vars conhecidas para auto-seed
      const KNOWN_KEYS = [
        'GEMINI_API_KEY','OPENAI_API_KEY','OPENROUTER_API_KEY','REPLICATE_API_TOKEN','HUGGINGFACE_API_TOKEN',
        'KLING_ACCESS_KEY_ID','KLING_ACCESS_KEY_SECRET','DID_API_KEY','DID_PRESENTER_URL',
        'ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID',
        'PEXELS_API_KEY','PIXABAY_API_KEY',
        'YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET','YOUTUBE_REDIRECT_URI',
        'TWITTER_CLIENT_ID','TWITTER_CLIENT_SECRET','TWITTER_BEARER_TOKEN','TWITTER_REDIRECT_URI',
        'FACEBOOK_APP_ID','FACEBOOK_APP_SECRET','FACEBOOK_REDIRECT_URI',
        'LINKEDIN_CLIENT_ID','LINKEDIN_CLIENT_SECRET','LINKEDIN_REDIRECT_URI',
        'TIKTOK_CLIENT_KEY','TIKTOK_CLIENT_SECRET','TIKTOK_REDIRECT_URI',
        'HOTMART_TOKEN','JWT_SECRET','N8N_URL',
      ];

      const { rows } = await pool.query("SELECT chave, valor FROM app_settings WHERE chave LIKE 'apikey_%'");
      const dbMap = {};
      for (const r of rows) dbMap[r.chave] = r.valor;

      // 1) DB → process.env (fallback — manter comportamento existente)
      let loaded = 0;
      for (const r of rows) {
        const envName = r.chave.replace('apikey_', '');
        if (!process.env[envName] && r.valor) {
          process.env[envName] = r.valor;
          loaded++;
        }
      }
      if (loaded > 0) console.log(`🔑 ${loaded} API key(s) carregadas do banco → env`);

      // 2) process.env → DB (auto-seed: grava keys do env que ainda não estão no DB)
      let seeded = 0;
      for (const envName of KNOWN_KEYS) {
        const val = process.env[envName];
        const dbKey = `apikey_${envName}`;
        if (val && !dbMap[dbKey]) {
          await pool.query(
            `INSERT INTO app_settings (chave, valor, descricao) VALUES ($1, $2, $3)
             ON CONFLICT (chave) DO UPDATE SET valor = $2, updated_at = NOW()`,
            [dbKey, val, `Auto-seed from env: ${envName}`]
          );
          seeded++;
        }
      }
      if (seeded > 0) console.log(`🔑 ${seeded} API key(s) importadas do env → banco`);
    } catch (err) { console.warn('⚠️ Sync API keys:', err.message); }
  })();

  // ── SETTINGS: listar ──
  app.get('/api/admin/settings', adminMiddleware, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM app_settings ORDER BY chave');
      res.json(rows);
    } catch (e) {
      console.error('Admin settings GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SETTINGS: atualizar ──
  app.put('/api/admin/settings', adminMiddleware, async (req, res) => {
    try {
      const { settings } = req.body; // [{ chave, valor }]
      if (!Array.isArray(settings)) return res.status(400).json({ error: 'Envie { settings: [{ chave, valor }] }' });

      for (const { chave, valor } of settings) {
        await pool.query(
          'INSERT INTO app_settings (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2, updated_at = NOW()',
          [chave, String(valor)]
        );
      }

      // Se atualizou limites, atualizar usuários ativos com o plano correspondente
      const limiteMap = { limite_trial: 'trial', limite_mensal: 'mensal', limite_anual: 'anual', limite_vitalicio: 'vitalicio' };
      for (const { chave, valor } of settings) {
        if (limiteMap[chave]) {
          await pool.query(
            'UPDATE users SET videos_mes_limite = $1 WHERE plano = $2 AND ativo = true',
            [parseInt(valor), limiteMap[chave]]
          );
        }
      }

      const { rows } = await pool.query('SELECT * FROM app_settings ORDER BY chave');
      res.json({ ok: true, settings: rows });
    } catch (e) {
      console.error('Admin settings PUT:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── USERS: listar ──
  app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, nome, plano, ativo, is_admin, 
                videos_mes_limite, videos_mes_usados, mes_referencia,
                hotmart_status, hotmart_subscription,
                ultimo_login, created_at, updated_at
         FROM users ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (e) {
      console.error('Admin users GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── USERS: atualizar ──
  app.put('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const allowed = ['plano', 'ativo', 'is_admin', 'videos_mes_limite', 'videos_mes_usados', 'nome'];
      const sets = [];
      const vals = [];
      let i = 1;

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          sets.push(`${key} = $${i}`);
          vals.push(req.body[key]);
          i++;
        }
      }

      if (sets.length === 0) return res.status(400).json({ error: 'Nenhum campo válido' });
      vals.push(id);

      const { rows } = await pool.query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING 
          id, email, nome, plano, ativo, is_admin, videos_mes_limite, videos_mes_usados`,
        vals
      );

      if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
      res.json(rows[0]);
    } catch (e) {
      console.error('Admin user PUT:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── USERS: deletar ──
  app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      // Não deixar deletar a si mesmo
      if (id === req.adminUser.id) return res.status(400).json({ error: 'Não pode deletar a si mesmo' });
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ ok: true });
    } catch (e) {
      console.error('Admin user DELETE:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── USERS: resetar senha ──
  app.post('/api/admin/users/:id/reset-password', adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { novaSenha } = req.body;
      if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Senha mínima: 6 caracteres' });
      const hash = hashSenha(novaSenha);
      await pool.query('UPDATE users SET senha_hash = $1, updated_at = NOW() WHERE id = $2', [hash, id]);
      res.json({ ok: true });
    } catch (e) {
      console.error('Admin reset pw:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── STATS: dashboard admin ──
  app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
      const [total, ativos, planos, recentes] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM users'),
        pool.query('SELECT COUNT(*) as total FROM users WHERE ativo = true'),
        pool.query('SELECT plano, COUNT(*) as total FROM users WHERE ativo = true GROUP BY plano ORDER BY plano'),
        pool.query('SELECT id, email, plano, created_at FROM users ORDER BY created_at DESC LIMIT 10'),
      ]);
      res.json({
        totalUsuarios: parseInt(total.rows[0].total),
        usuariosAtivos: parseInt(ativos.rows[0].total),
        porPlano: planos.rows,
        recentes: recentes.rows,
      });
    } catch (e) {
      console.error('Admin stats:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── DOWNLOAD: servir o instalador .exe ──
  app.get('/api/download/installer', async (req, res) => {
    try {
      // Verificar auth (precisa estar logado)
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Faça login para baixar' });
      const payload = verificarToken(token);
      if (!payload) return res.status(401).json({ error: 'Token inválido' });

      // Verificar se tem URL de download customizada
      const { rows } = await pool.query("SELECT valor FROM app_settings WHERE chave = 'download_url'");
      const customUrl = rows[0]?.valor;
      if (customUrl) {
        return res.redirect(customUrl);
      }

      // Servir arquivo local
      const distDir = resolve(__dirname, '..', 'dist-desktop');
      // Procurar o .exe mais recente
      const fs = await import('fs');
      const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe') && !f.endsWith('.blockmap'));
      if (!files.length) return res.status(404).json({ error: 'Instalador não disponível no momento' });

      // Pegar a versão mais recente (último no sort)
      files.sort();
      const exeFile = files[files.length - 1];
      const exePath = resolve(distDir, exeFile);
      const stat = statSync(exePath);

      res.setHeader('Content-Disposition', `attachment; filename="${exeFile}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      createReadStream(exePath).pipe(res);
    } catch (e) {
      console.error('Download installer:', e.message);
      res.status(500).json({ error: 'Erro ao baixar instalador' });
    }
  });

  // ── DOWNLOAD: info da versão ──
  app.get('/api/download/info', async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT chave, valor FROM app_settings WHERE chave IN ('versao_app', 'download_url', 'aviso_tokens')"
      );
      const map = {};
      rows.forEach(r => map[r.chave] = r.valor);
      res.json(map);
    } catch (e) {
      res.json({ versao_app: '1.1.0', aviso_tokens: '' });
    }
  });

  // ── SETTINGS: públicas (preços para landing) ──
  app.get('/api/public/precos', async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT chave, valor FROM app_settings WHERE chave LIKE 'preco_%' OR chave LIKE 'limite_%' OR chave = 'aviso_tokens' OR chave LIKE 'hotmart_checkout_%'"
      );
      const map = {};
      rows.forEach(r => map[r.chave] = r.valor);
      res.json(map);
    } catch (e) {
      res.json({});
    }
  });

  // ══════════════════════════════════════════
  // API KEYS MANAGEMENT
  // ══════════════════════════════════════════

  const API_KEY_DEFS = [
    // IA / LLM
    { env: 'GEMINI_API_KEY',          grupo: 'ia',     label: 'Gemini API Key',          link: 'https://aistudio.google.com/apikey' },
    { env: 'OPENAI_API_KEY',          grupo: 'ia',     label: 'OpenAI API Key',          link: 'https://platform.openai.com/api-keys' },
    { env: 'OPENROUTER_API_KEY',      grupo: 'ia',     label: 'OpenRouter API Key',      link: 'https://openrouter.ai/keys' },
    { env: 'REPLICATE_API_TOKEN',     grupo: 'ia',     label: 'Replicate API Token',     link: 'https://replicate.com/account/api-tokens' },
    { env: 'HUGGINGFACE_API_TOKEN',   grupo: 'ia',     label: 'HuggingFace Token',       link: 'https://huggingface.co/settings/tokens' },
    // Vídeo
    { env: 'KLING_ACCESS_KEY_ID',     grupo: 'video',  label: 'Kling Access Key ID',     link: 'https://platform.klingai.com' },
    { env: 'KLING_ACCESS_KEY_SECRET', grupo: 'video',  label: 'Kling Access Key Secret', link: 'https://platform.klingai.com' },
    { env: 'DID_API_KEY',             grupo: 'video',  label: 'D-ID API Key',            link: 'https://studio.d-id.com/' },
    { env: 'DID_PRESENTER_URL',       grupo: 'video',  label: 'D-ID Presenter URL',      link: '' },
    // TTS
    { env: 'ELEVENLABS_API_KEY',      grupo: 'tts',    label: 'ElevenLabs API Key',      link: 'https://elevenlabs.io/subscription' },
    { env: 'ELEVENLABS_VOICE_ID',     grupo: 'tts',    label: 'ElevenLabs Voice ID',     link: '' },
    // Mídia
    { env: 'PEXELS_API_KEY',          grupo: 'media',  label: 'Pexels API Key',          link: 'https://www.pexels.com/api/' },
    { env: 'PIXABAY_API_KEY',         grupo: 'media',  label: 'Pixabay API Key',         link: 'https://pixabay.com/api/docs/' },
    // Social / YouTube
    { env: 'YOUTUBE_CLIENT_ID',       grupo: 'social', label: 'YouTube Client ID',       link: 'https://console.cloud.google.com/apis/credentials' },
    { env: 'YOUTUBE_CLIENT_SECRET',   grupo: 'social', label: 'YouTube Client Secret',   link: '' },
    { env: 'YOUTUBE_REDIRECT_URI',    grupo: 'social', label: 'YouTube Redirect URI',    link: '' },
    { env: 'TWITTER_CLIENT_ID',       grupo: 'social', label: 'Twitter Client ID',       link: 'https://developer.twitter.com/en/portal/dashboard' },
    { env: 'TWITTER_CLIENT_SECRET',   grupo: 'social', label: 'Twitter Client Secret',   link: '' },
    { env: 'TWITTER_BEARER_TOKEN',    grupo: 'social', label: 'Twitter Bearer Token',    link: '' },
    { env: 'TWITTER_REDIRECT_URI',    grupo: 'social', label: 'Twitter Redirect URI',    link: '' },
    { env: 'FACEBOOK_APP_ID',         grupo: 'social', label: 'Facebook App ID',         link: 'https://developers.facebook.com/apps/' },
    { env: 'FACEBOOK_APP_SECRET',     grupo: 'social', label: 'Facebook App Secret',     link: '' },
    { env: 'FACEBOOK_REDIRECT_URI',   grupo: 'social', label: 'Facebook Redirect URI',   link: '' },
    { env: 'LINKEDIN_CLIENT_ID',      grupo: 'social', label: 'LinkedIn Client ID',      link: 'https://www.linkedin.com/developers/apps' },
    { env: 'LINKEDIN_CLIENT_SECRET',  grupo: 'social', label: 'LinkedIn Client Secret',  link: '' },
    { env: 'LINKEDIN_REDIRECT_URI',   grupo: 'social', label: 'LinkedIn Redirect URI',   link: '' },
    { env: 'TIKTOK_CLIENT_KEY',       grupo: 'social', label: 'TikTok Client Key',       link: 'https://developers.tiktok.com/' },
    { env: 'TIKTOK_CLIENT_SECRET',    grupo: 'social', label: 'TikTok Client Secret',    link: '' },
    { env: 'TIKTOK_REDIRECT_URI',     grupo: 'social', label: 'TikTok Redirect URI',     link: '' },
    // Sistema
    { env: 'HOTMART_TOKEN',           grupo: 'system', label: 'Hotmart Hottok',           link: '' },
    { env: 'JWT_SECRET',              grupo: 'system', label: 'JWT Secret',               link: '' },
    { env: 'N8N_URL',                 grupo: 'system', label: 'N8N URL',                  link: '' },
  ];

  // GET: retorna status de todas as API keys (configurada ou não, preview)
  app.get('/api/admin/apikeys', adminMiddleware, async (req, res) => {
    try {
      // Buscar valores salvos no app_settings
      const { rows: savedRows } = await pool.query(
        "SELECT chave, valor FROM app_settings WHERE chave LIKE 'apikey_%'"
      );
      const savedMap = {};
      savedRows.forEach(r => savedMap[r.chave] = r.valor);

      const keys = API_KEY_DEFS.map(def => {
        const savedKey = `apikey_${def.env}`;
        const envVal = process.env[def.env] || '';
        const dbVal = savedMap[savedKey] || '';
        const activeVal = envVal || dbVal;
        return {
          env: def.env,
          grupo: def.grupo,
          label: def.label,
          link: def.link,
          configurada: !!activeVal,
          preview: activeVal ? activeVal.slice(0, 6) + '···' + activeVal.slice(-4) : '',
          fonte: envVal ? 'env' : dbVal ? 'db' : 'nenhuma',
        };
      });

      const grupos = {};
      keys.forEach(k => {
        if (!grupos[k.grupo]) grupos[k.grupo] = [];
        grupos[k.grupo].push(k);
      });

      res.json({ keys, grupos });
    } catch (e) {
      console.error('Admin apikeys GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // PUT: salvar API keys (salva no app_settings + aplica em runtime)
  app.put('/api/admin/apikeys', adminMiddleware, async (req, res) => {
    try {
      const { keys } = req.body; // { GEMINI_API_KEY: 'xxx', OPENAI_API_KEY: 'yyy', ... }
      if (!keys || typeof keys !== 'object') return res.status(400).json({ error: 'Envie { keys: { ENV_NAME: "valor" } }' });

      const validEnvs = new Set(API_KEY_DEFS.map(d => d.env));
      let updated = 0;

      for (const [envName, valor] of Object.entries(keys)) {
        if (!validEnvs.has(envName)) continue;
        const dbKey = `apikey_${envName}`;

        if (valor && valor.trim()) {
          // Salvar no DB
          await pool.query(
            "INSERT INTO app_settings (chave, valor, descricao) VALUES ($1, $2, $3) ON CONFLICT (chave) DO UPDATE SET valor = $2, updated_at = NOW()",
            [dbKey, valor.trim(), `API Key: ${envName}`]
          );
          // Aplicar em runtime
          process.env[envName] = valor.trim();
          updated++;
        } else {
          // Limpar
          await pool.query("DELETE FROM app_settings WHERE chave = $1", [dbKey]);
          // Não limpa process.env pois pode ter vindo do .env file
        }
      }

      res.json({ ok: true, updated, message: `${updated} chave(s) atualizada(s) em runtime.` });
    } catch (e) {
      console.error('Admin apikeys PUT:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════
  // HOTMART ADMIN ROUTES
  // ══════════════════════════════════════════

  // ── Hotmart: status da integração ──
  app.get('/api/admin/hotmart/status', adminMiddleware, async (req, res) => {
    try {
      const hottok = process.env.HOTMART_TOKEN || process.env.HOTMART_HOTTOK || '';
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/hotmart/webhook`;

      // Buscar settings do Hotmart
      const { rows: settingsRows } = await pool.query(
        "SELECT chave, valor FROM app_settings WHERE chave LIKE 'hotmart_%'"
      );
      const hotmartSettings = {};
      settingsRows.forEach(r => hotmartSettings[r.chave] = r.valor);

      // Contar eventos recentes
      let eventStats = [];
      try {
        const { rows } = await pool.query(
          `SELECT evento, status, COUNT(*) as total 
           FROM hotmart_webhook_logs 
           WHERE created_at > NOW() - INTERVAL '30 days'
           GROUP BY evento, status ORDER BY total DESC`
        );
        eventStats = rows;
      } catch { /* tabela pode não existir ainda */ }

      // Último evento
      let ultimoEvento = null;
      try {
        const { rows } = await pool.query(
          'SELECT * FROM hotmart_webhook_logs ORDER BY created_at DESC LIMIT 1'
        );
        ultimoEvento = rows[0] || null;
      } catch { /* */ }

      res.json({
        hottok_configurado: !!hottok,
        hottok_preview: hottok ? hottok.slice(0, 6) + '...' + hottok.slice(-4) : '',
        webhook_url: webhookUrl,
        settings: hotmartSettings,
        event_stats_30d: eventStats,
        ultimo_evento: ultimoEvento,
        checklist: {
          hottok: !!hottok,
          webhook_url: true,
          checkout_mensal: !!hotmartSettings.hotmart_checkout_mensal,
          checkout_anual: !!hotmartSettings.hotmart_checkout_anual,
          checkout_vitalicio: !!hotmartSettings.hotmart_checkout_vitalicio,
          produto_id: !!hotmartSettings.hotmart_produto_id,
        }
      });
    } catch (e) {
      console.error('Admin hotmart status:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Hotmart: logs de webhooks ──
  app.get('/api/admin/hotmart/logs', adminMiddleware, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;
      const evento = req.query.evento || null;

      let where = '';
      const params = [];
      if (evento) {
        where = 'WHERE evento = $1';
        params.push(evento);
      }

      const { rows } = await pool.query(
        `SELECT id, evento, email, plano, transaction_id, subscription_id, status, ip_origem, created_at
         FROM hotmart_webhook_logs ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*) as total FROM hotmart_webhook_logs ${where}`,
        params
      );

      res.json({ logs: rows, total: parseInt(countRows[0].total) });
    } catch (e) {
      // Tabela pode não existir ainda
      res.json({ logs: [], total: 0 });
    }
  });

  // ── Hotmart: testar webhook ──
  app.post('/api/admin/hotmart/test-webhook', adminMiddleware, async (req, res) => {
    try {
      const hottok = process.env.HOTMART_TOKEN || process.env.HOTMART_HOTTOK || '';
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/hotmart/webhook`;

      // Simular payload Hotmart
      const testPayload = {
        hottok,
        event: 'PURCHASE_APPROVED',
        data: {
          buyer: {
            email: `teste-${Date.now()}@videoforge-test.com`,
            name: 'Teste Webhook VideoForge',
          },
          purchase: {
            transaction: `TEST-${Date.now()}`,
            offer: { code: 'mensal' },
          },
          product: { name: 'VideoForge Mensal (TESTE)' },
        }
      };

      // Chamar o próprio webhook internamente
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const result = await response.json();

      // Limpar o usuário de teste criado
      try {
        await pool.query("DELETE FROM users WHERE email LIKE 'teste-%@videoforge-test.com'");
      } catch { /* */ }

      res.json({
        ok: response.ok,
        status: response.status,
        response: result,
        message: response.ok
          ? '✅ Webhook funcionando! Usuário de teste criado e removido com sucesso.'
          : '❌ Erro no webhook.',
      });
    } catch (e) {
      console.error('Admin hotmart test:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Hotmart: atualizar hottok via env (salva no app_settings como backup) ──
  app.put('/api/admin/hotmart/token', adminMiddleware, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Token não informado' });

      // Salvar no app_settings como referência
      await pool.query(
        "INSERT INTO app_settings (chave, valor, descricao) VALUES ('hotmart_token_backup', $1, 'Backup do Hottok (o real é no .env)') ON CONFLICT (chave) DO UPDATE SET valor = $1, updated_at = NOW()",
        [token]
      );

      // Atualizar em runtime (process.env)
      process.env.HOTMART_TOKEN = token;

      res.json({
        ok: true,
        message: 'Token atualizado em runtime. Para persistir, atualize HOTMART_TOKEN no .env.production da VPS.',
        preview: token.slice(0, 6) + '...' + token.slice(-4),
      });
    } catch (e) {
      console.error('Admin hotmart token:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  console.log('🛡️  Rotas admin registradas');
}
