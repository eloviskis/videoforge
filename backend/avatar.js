import pool from './news/db.js';
import { verificarToken, buscarUsuarioPorEmail } from './auth.js';
import axios from 'axios';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const MEDIA_DIR = process.env.MEDIA_DIR
  || (process.env.NO_DOCKER === '1' ? resolve(process.cwd(), 'media') : '/media');
const AVATAR_DIR = resolve(MEDIA_DIR, 'avatars');

// ── Auth middleware (reutiliza token JWT) ──
async function avatarAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
    const decoded = verificarToken(auth.split(' ')[1]);
    if (!decoded?.email) return res.status(401).json({ error: 'Token inválido' });
    const user = await buscarUsuarioPorEmail(decoded.email);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    req.avatarUser = user;
    next();
  } catch { res.status(401).json({ error: 'Não autorizado' }); }
}

// ── Tabela ──
async function ensureAvatarTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS avatars (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        prompt TEXT NOT NULL,
        enhanced_prompt TEXT,
        style VARCHAR(20) NOT NULL DEFAULT 'cartoon',
        image_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'generating',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_avatars_user ON avatars(user_id)`);
    console.log('🎭 Tabela avatars pronta');
  } catch (err) {
    console.warn('⚠️ Avatar table check:', err.message);
  }
}

// ── Prompt enrichment ──
function buildAvatarPrompt(userPrompt, style) {
  const base = {
    cartoon: `Portrait illustration, face centered, neutral expression, mouth closed, eyes open looking forward, plain white background, consistent lighting, ${userPrompt}, style: clean vector illustration, suitable for facial animation, high quality digital art`,
    realistic: `Photorealistic portrait, face centered, neutral expression, mouth closed, eyes open looking at camera, plain gray background, professional studio lighting, high resolution, ${userPrompt}`,
    '3d': `3D character portrait, face centered, neutral expression, stylized humanoid, plain background, ${userPrompt}, suitable for real-time facial animation, Pixar style`
  };
  return base[style] || base.cartoon;
}

// ── Gerar imagem via DALL-E 3 ──
async function generateAvatarImage(prompt, userSettings) {
  const apiKey = userSettings?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const resp = await axios.post('https://api.openai.com/v1/images/generations', {
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'url'
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 60000
  });

  const imageUrl = resp.data?.data?.[0]?.url;
  if (!imageUrl) throw new Error('DALL-E não retornou imagem');
  return imageUrl;
}

// ── Baixar e salvar imagem localmente ──
async function downloadAndSave(url, filename) {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
  const filepath = resolve(AVATAR_DIR, filename);
  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  await fs.writeFile(filepath, resp.data);
  return `/media/avatars/${filename}`;
}

// ── Buscar settings do usuário ──
async function getUserSettings(userId) {
  try {
    const { rows } = await pool.query(
      `SELECT settings FROM user_settings WHERE user_id = $1`, [userId]
    );
    return rows[0]?.settings || {};
  } catch { return {}; }
}

// ========================================
// REGISTRAR ROTAS
// ========================================
export function registrarRotasAvatar(app) {
  ensureAvatarTable();
  fs.mkdir(AVATAR_DIR, { recursive: true }).catch(() => {});

  // ── Enriquecer prompt ──
  app.post('/api/avatar/enhance-prompt', avatarAuth, async (req, res) => {
    try {
      const { rawPrompt, style } = req.body;
      if (!rawPrompt) return res.status(400).json({ error: 'Prompt obrigatório' });
      const enhanced = buildAvatarPrompt(rawPrompt, style || 'cartoon');
      res.json({ enhancedPrompt: enhanced });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Gerar avatar ──
  app.post('/api/avatar/generate', avatarAuth, async (req, res) => {
    try {
      const { prompt, style = 'cartoon' } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt obrigatório' });

      const validStyles = ['cartoon', '3d', 'realistic'];
      const finalStyle = validStyles.includes(style) ? style : 'cartoon';

      // Limitar avatares por usuário (free: 5)
      const { rows: existing } = await pool.query(
        `SELECT COUNT(*) as total FROM avatars WHERE user_id = $1`, [req.avatarUser.id]
      );
      const plano = req.avatarUser.plano || 'free';
      const limite = plano === 'free' ? 5 : 50;
      if (parseInt(existing[0].total) >= limite) {
        return res.status(429).json({ error: `Limite de ${limite} avatares atingido. Delete algum ou faça upgrade.` });
      }

      // Criar registro
      const avatarId = uuidv4();
      await pool.query(
        `INSERT INTO avatars (id, user_id, prompt, style, status) VALUES ($1, $2, $3, $4, 'generating')`,
        [avatarId, req.avatarUser.id, prompt, finalStyle]
      );

      // Responder imediatamente
      res.status(202).json({ avatarId, status: 'generating' });

      // Gerar em background
      (async () => {
        try {
          const settings = await getUserSettings(req.avatarUser.id);
          const enhancedPrompt = buildAvatarPrompt(prompt, finalStyle);
          const tempUrl = await generateAvatarImage(enhancedPrompt, settings);
          const filename = `${avatarId}.png`;
          const localUrl = await downloadAndSave(tempUrl, filename);

          await pool.query(
            `UPDATE avatars SET image_url = $1, enhanced_prompt = $2, status = 'ready' WHERE id = $3`,
            [localUrl, enhancedPrompt, avatarId]
          );
          console.log(`🎭 Avatar ${avatarId} gerado com sucesso`);
        } catch (err) {
          console.error(`🎭 Avatar ${avatarId} erro:`, err.message);
          await pool.query(
            `UPDATE avatars SET status = 'error' WHERE id = $1`, [avatarId]
          );
        }
      })();

    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Status de um avatar ──
  app.get('/api/avatar/:id/status', avatarAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, status, image_url, style, prompt FROM avatars WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.avatarUser.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Avatar não encontrado' });
      res.json(rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Biblioteca de avatares do usuário ──
  app.get('/api/avatar/library', avatarAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM avatars WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.avatarUser.id]
      );
      res.json({ avatars: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Deletar avatar ──
  app.delete('/api/avatar/:id', avatarAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `DELETE FROM avatars WHERE id = $1 AND user_id = $2 RETURNING image_url`,
        [req.params.id, req.avatarUser.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Avatar não encontrado' });

      // Apagar arquivo
      if (rows[0].image_url) {
        const filepath = resolve(MEDIA_DIR, rows[0].image_url.replace('/media/', ''));
        await fs.unlink(filepath).catch(() => {});
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Presets (avatares pré-configurados) ──
  app.get('/api/avatar/presets', avatarAuth, (req, res) => {
    res.json({ presets: [
      { id: 'preset-1', name: '🧑‍💼 Apresentador Profissional', prompt: 'professional male news anchor in suit, clean shaven, confident look', style: 'cartoon' },
      { id: 'preset-2', name: '👩‍🎤 Streamer Gamer', prompt: 'young female gamer with colorful hair, headset, neon lights', style: 'cartoon' },
      { id: 'preset-3', name: '🧙‍♂️ Mago Fantasy', prompt: 'wise wizard with long beard, pointy hat, magical aura', style: 'cartoon' },
      { id: 'preset-4', name: '🤖 Robô Futurista', prompt: 'friendly humanoid robot with glowing blue eyes, metallic skin', style: '3d' },
      { id: 'preset-5', name: '👩‍🏫 Professora Simpática', prompt: 'friendly female teacher with glasses, warm smile, casual outfit', style: 'cartoon' },
    ]});
  });

  console.log('🎭 Rotas de Avatar Studio registradas');
}
