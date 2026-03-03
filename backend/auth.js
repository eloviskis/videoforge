import crypto from 'crypto';
import pool from './news/db.js';

// ========================================
// JWT SIMPLES (sem dependência externa)
// ========================================
const JWT_SECRET = process.env.JWT_SECRET || 'videoforge-secret-change-me-in-production';
const JWT_EXPIRY = 7 * 24 * 60 * 60; // 7 dias em segundos

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

export function gerarToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
  }));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verificarToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ========================================
// HASH DE SENHA (bcrypt-like com crypto)
// ========================================
export function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verificarSenha(senha, hashSalvo) {
  const [salt, hash] = hashSalvo.split(':');
  const testHash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return hash === testHash;
}

// ========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ========================================
export function authMiddleware(req, res, next) {
  // Rotas públicas — não exigem auth
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/hotmart/webhook',
    '/api/youtube/callback',
    '/api/social/',
    '/api/user/social/',
    '/api/health',
    '/api/public/',
    '/api/download/info',
  ];
  
  // Se a rota não começa com /api, libera (frontend, media, etc.)
  if (!req.path.startsWith('/api/')) return next();
  
  // Verifica se é rota pública
  if (publicRoutes.some(r => req.path.startsWith(r))) return next();
  
  // Extrair token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido. Faça login.' });
  }
  
  const payload = verificarToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
  
  req.userId = payload.id;
  req.userEmail = payload.email;
  req.userPlano = payload.plano;
  next();
}

// ========================================
// QUERIES DE USUÁRIO
// ========================================
export async function criarUsuario({ email, senha, nome, plano = 'vitalicio', hotmart_transaction, hotmart_subscription }) {
  const senhaHash = hashSenha(senha);
  const mesRef = new Date().toISOString().slice(0, 7);
  
  const limites = {
    vitalicio: 9999,
    mensal: 50,
    anual: 100,
    trial: 5,
  };
  
  const { rows } = await pool.query(
    `INSERT INTO users (email, senha_hash, nome, plano, hotmart_transaction, hotmart_subscription, hotmart_status, videos_mes_limite, mes_referencia)
     VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, $8)
     ON CONFLICT (email) DO UPDATE SET
       plano = EXCLUDED.plano,
       ativo = true,
       hotmart_transaction = COALESCE(EXCLUDED.hotmart_transaction, users.hotmart_transaction),
       hotmart_subscription = COALESCE(EXCLUDED.hotmart_subscription, users.hotmart_subscription),
       hotmart_status = 'approved',
       videos_mes_limite = EXCLUDED.videos_mes_limite,
       updated_at = NOW()
     RETURNING id, email, nome, plano, ativo, videos_mes_limite, videos_mes_usados, created_at`,
    [email, senhaHash, nome || email.split('@')[0], plano, hotmart_transaction || null, hotmart_subscription || null, limites[plano] || 50, mesRef]
  );
  return rows[0];
}

export async function buscarUsuarioPorEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function atualizarUsuario(email, campos) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [key, val] of Object.entries(campos)) {
    sets.push(`${key} = $${i}`);
    vals.push(val);
    i++;
  }
  vals.push(email);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE email = $${i} RETURNING *`,
    vals
  );
  return rows[0];
}

export async function loginUsuario(email, senha) {
  const user = await buscarUsuarioPorEmail(email);
  if (!user) return { error: 'Usuário não encontrado' };
  if (!user.ativo) return { error: 'Conta desativada. Entre em contato com o suporte.' };
  if (!verificarSenha(senha, user.senha_hash)) return { error: 'Senha incorreta' };
  
  // Atualizar último login
  await pool.query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [user.id]);
  
  // Resetar contador mensal se mudou o mês
  const mesAtual = new Date().toISOString().slice(0, 7);
  if (user.mes_referencia !== mesAtual) {
    await pool.query(
      'UPDATE users SET videos_mes_usados = 0, mes_referencia = $1 WHERE id = $2',
      [mesAtual, user.id]
    );
    user.videos_mes_usados = 0;
  }
  
  const token = gerarToken({
    id: user.id,
    email: user.email,
    plano: user.plano,
  });
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nome: user.nome,
      plano: user.plano,
      ativo: user.ativo,
      is_admin: user.is_admin || false,
      videos_mes_limite: user.videos_mes_limite,
      videos_mes_usados: user.videos_mes_usados,
    },
  };
}
