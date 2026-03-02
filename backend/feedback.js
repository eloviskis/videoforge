import pool from './news/db.js';
import { verificarToken, buscarUsuarioPorEmail } from './auth.js';

// ========================================
// MIDDLEWARE: extrair usuário do token
// ========================================
async function feedbackAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  const payload = verificarToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido' });

  const user = await buscarUsuarioPorEmail(payload.email);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

  req.feedbackUser = user;
  next();
}

// ========================================
// MIDDLEWARE: verificar se é admin
// ========================================
async function adminOnly(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });

  const payload = verificarToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido' });

  const user = await buscarUsuarioPorEmail(payload.email);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'Acesso negado' });

  req.feedbackUser = user;
  next();
}

// ========================================
// AUTO-CREATE TABLE (idempotente)
// ========================================
async function ensureFeedbackTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_nome VARCHAR(100),
        tipo VARCHAR(20) NOT NULL DEFAULT 'sugestao',
        titulo VARCHAR(200) NOT NULL,
        mensagem TEXT NOT NULL,
        resposta_admin TEXT,
        respondido_em TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC)`);
    console.log('💬 Tabela feedbacks pronta');
  } catch (err) {
    console.warn('⚠️ Feedback table check:', err.message);
  }
}

// ========================================
// REGISTRAR ROTAS
// ========================================
export function registrarRotasFeedback(app) {
  // Auto-create table on startup
  ensureFeedbackTable();

  // ── USUÁRIO: listar SEUS feedbacks ──
  app.get('/api/feedback', feedbackAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM feedbacks WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.feedbackUser.id]
      );
      res.json(rows);
    } catch (e) {
      console.error('Feedback GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── USUÁRIO: criar feedback ──
  app.post('/api/feedback', feedbackAuth, async (req, res) => {
    try {
      const { tipo, titulo, mensagem } = req.body;
      if (!titulo || !mensagem) return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });

      const tiposValidos = ['sugestao', 'bug', 'elogio', 'outro'];
      const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'sugestao';

      const { rows } = await pool.query(
        `INSERT INTO feedbacks (user_id, user_email, user_nome, tipo, titulo, mensagem)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.feedbackUser.id, req.feedbackUser.email, req.feedbackUser.nome || '', tipoFinal, titulo, mensagem]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error('Feedback POST:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── USUÁRIO: deletar próprio feedback (somente se pendente) ──
  app.delete('/api/feedback/:id', feedbackAuth, async (req, res) => {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM feedbacks WHERE id = $1 AND user_id = $2 AND status = 'pendente'`,
        [req.params.id, req.feedbackUser.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Feedback não encontrado ou já processado' });
      res.json({ ok: true });
    } catch (e) {
      console.error('Feedback DELETE:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── ADMIN: listar TODOS feedbacks ──
  app.get('/api/admin/feedback', adminOnly, async (req, res) => {
    try {
      const { status, tipo } = req.query;
      let sql = 'SELECT * FROM feedbacks';
      const params = [];
      const conds = [];

      if (status) { conds.push(`status = $${params.length + 1}`); params.push(status); }
      if (tipo) { conds.push(`tipo = $${params.length + 1}`); params.push(tipo); }

      if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY created_at DESC';

      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (e) {
      console.error('Admin Feedback GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── ADMIN: responder feedback ──
  app.patch('/api/admin/feedback/:id', adminOnly, async (req, res) => {
    try {
      const { resposta, status } = req.body;
      const updates = [];
      const params = [];

      if (resposta !== undefined) {
        params.push(resposta);
        updates.push(`resposta_admin = $${params.length}`);
        updates.push(`respondido_em = NOW()`);
      }
      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }
      if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

      updates.push('updated_at = NOW()');
      params.push(req.params.id);

      const { rows } = await pool.query(
        `UPDATE feedbacks SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Feedback não encontrado' });
      res.json(rows[0]);
    } catch (e) {
      console.error('Admin Feedback PATCH:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── ADMIN: deletar feedback ──
  app.delete('/api/admin/feedback/:id', adminOnly, async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM feedbacks WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Feedback não encontrado' });
      res.json({ ok: true });
    } catch (e) {
      console.error('Admin Feedback DELETE:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── ADMIN: stats de feedback ──
  app.get('/api/admin/feedback/stats', adminOnly, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'respondido') as respondidos,
          COUNT(*) FILTER (WHERE status = 'implementado') as implementados,
          COUNT(*) FILTER (WHERE tipo = 'sugestao') as sugestoes,
          COUNT(*) FILTER (WHERE tipo = 'bug') as bugs,
          COUNT(*) FILTER (WHERE tipo = 'elogio') as elogios
        FROM feedbacks
      `);
      res.json(rows[0]);
    } catch (e) {
      console.error('Admin Feedback Stats:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  console.log('💬 Rotas de feedback registradas');
}
