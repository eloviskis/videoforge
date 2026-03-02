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
