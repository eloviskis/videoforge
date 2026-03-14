import pool from './news/db.js';
import { verificarToken, buscarUsuarioPorEmail } from './auth.js';
import { getUserApiKey } from './user-settings.js';
import axios from 'axios';
import { resolve } from 'path';
import { promises as fs, createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

const MEDIA_DIR = process.env.MEDIA_DIR
  || (process.env.NO_DOCKER === '1' ? resolve(process.cwd(), 'media') : '/media');
const TALKING_DIR = resolve(MEDIA_DIR, 'talking-photos');

// ── Auth middleware ──
async function tpAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' });
    const decoded = verificarToken(auth.split(' ')[1]);
    if (!decoded?.email) return res.status(401).json({ error: 'Token inválido' });
    const user = await buscarUsuarioPorEmail(decoded.email);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    req.tpUser = user;
    next();
  } catch { res.status(401).json({ error: 'Não autorizado' }); }
}

// ── Tabela ──
async function ensureTalkingTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS talking_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        photo_url VARCHAR(500),
        text TEXT NOT NULL,
        voice VARCHAR(100) DEFAULT 'alloy',
        audio_url VARCHAR(500),
        video_url VARCHAR(500),
        status VARCHAR(30) DEFAULT 'pending',
        error_msg TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_talking_user ON talking_photos(user_id)`);
    console.log('🗣️ Tabela talking_photos pronta');
  } catch (err) {
    console.warn('⚠️ Talking photos table check:', err.message);
  }
}

// ── Upload config ──
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(TALKING_DIR, { recursive: true });
    cb(null, TALKING_DIR);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext)) return cb(new Error('Formato não suportado. Use JPG, PNG ou WebP.'));
    cb(null, `photo-${uuidv4()}.${ext}`);
  }
});
const photoUpload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ── Gerar áudio TTS via OpenAI ──
async function generateTTS(text, voice, apiKey) {
  const resp = await axios.post('https://api.openai.com/v1/audio/speech', {
    model: 'tts-1',
    input: text,
    voice: voice || 'alloy',
    response_format: 'mp3'
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    responseType: 'arraybuffer',
    timeout: 60000
  });
  return Buffer.from(resp.data);
}

// ── Upload áudio para D-ID ──
async function uploadAudioDID(audioPath, didApiKey) {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('audio', createReadStream(audioPath), {
    filename: 'narration.mp3',
    contentType: 'audio/mpeg'
  });
  const authHeader = `Basic ${Buffer.from(didApiKey + ':').toString('base64')}`;
  const resp = await axios.post('https://api.d-id.com/audios', form, {
    headers: { Authorization: authHeader, ...form.getHeaders() }
  });
  return resp.data.url;
}

// ── Criar talk D-ID ──
async function createTalk(photoUrl, audioUrl, didApiKey) {
  const authHeader = `Basic ${Buffer.from(didApiKey + ':').toString('base64')}`;
  const resp = await axios.post('https://api.d-id.com/talks', {
    source_url: photoUrl,
    script: { type: 'audio', audio_url: audioUrl },
    config: { stitch: true }
  }, {
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
  });
  return resp.data.id;
}

// ── Poll talk D-ID ──
async function pollTalk(talkId, didApiKey) {
  const authHeader = `Basic ${Buffer.from(didApiKey + ':').toString('base64')}`;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await axios.get(`https://api.d-id.com/talks/${talkId}`, {
      headers: { Authorization: authHeader }
    });
    if (resp.data.status === 'done') return resp.data.result_url;
    if (resp.data.status === 'error') throw new Error(resp.data.error?.description || 'D-ID falhou');
  }
  throw new Error('D-ID timeout (5 min)');
}

// ── Registrar rotas ──
export function registrarRotasTalkingPhoto(app) {
  ensureTalkingTable();

  // POST /api/talking-photo/generate — upload foto + texto → vídeo
  app.post('/api/talking-photo/generate', tpAuth, photoUpload.single('photo'), async (req, res) => {
    const userId = req.tpUser.id;
    const { text, voice } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: 'Texto é obrigatório' });
    if (text.length > 2000) return res.status(400).json({ error: 'Texto máximo: 2000 caracteres' });
    if (!req.file) return res.status(400).json({ error: 'Foto é obrigatória' });

    // Verificar chaves
    const didKey = await getUserApiKey(userId, 'DID_API_KEY');
    const openaiKey = await getUserApiKey(userId, 'OPENAI_API_KEY');
    if (!didKey) return res.status(400).json({ error: 'Configure sua chave D-ID nas Configurações (aba APIs)' });
    if (!openaiKey) return res.status(400).json({ error: 'Configure sua chave OpenAI nas Configurações (aba APIs)' });

    // Criar registro
    const photoRelPath = `/media/talking-photos/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO talking_photos (user_id, photo_url, text, voice, status) VALUES ($1, $2, $3, $4, 'processing') RETURNING id`,
      [userId, photoRelPath, text.trim(), voice || 'alloy']
    );
    const jobId = rows[0].id;

    res.json({ id: jobId, status: 'processing' });

    // Processar em background
    (async () => {
      try {
        console.log(`🗣️ [TalkingPhoto ${jobId}] Iniciando...`);

        // 1. Gerar TTS
        console.log(`🗣️ [TalkingPhoto ${jobId}] Gerando áudio TTS...`);
        const audioBuffer = await generateTTS(text.trim(), voice || 'alloy', openaiKey);
        const audioFilename = `audio-${jobId}.mp3`;
        const audioPath = resolve(TALKING_DIR, audioFilename);
        await fs.writeFile(audioPath, audioBuffer);
        const audioRelPath = `/media/talking-photos/${audioFilename}`;

        await pool.query(`UPDATE talking_photos SET audio_url = $1, status = 'uploading' WHERE id = $2`, [audioRelPath, jobId]);

        // 2. Upload áudio para D-ID
        console.log(`🗣️ [TalkingPhoto ${jobId}] Upload áudio para D-ID...`);
        const didAudioUrl = await uploadAudioDID(audioPath, didKey);

        // 3. Servir a foto via URL pública (D-ID precisa acessar)
        // Usar URL pública do servidor
        const photoPublicUrl = `${process.env.PUBLIC_URL || 'https://videoforge.tech'}${photoRelPath}`;

        // 4. Criar talk
        console.log(`🗣️ [TalkingPhoto ${jobId}] Criando talk D-ID...`);
        await pool.query(`UPDATE talking_photos SET status = 'generating' WHERE id = $1`, [jobId]);
        const talkId = await createTalk(photoPublicUrl, didAudioUrl, didKey);

        // 5. Poll resultado
        console.log(`🗣️ [TalkingPhoto ${jobId}] Aguardando D-ID...`);
        const videoUrl = await pollTalk(talkId, didKey);

        // 6. Baixar vídeo
        console.log(`🗣️ [TalkingPhoto ${jobId}] Baixando vídeo...`);
        const videoFilename = `video-${jobId}.mp4`;
        const videoPath = resolve(TALKING_DIR, videoFilename);
        const videoResp = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
        await fs.writeFile(videoPath, Buffer.from(videoResp.data));
        const videoRelPath = `/media/talking-photos/${videoFilename}`;

        await pool.query(`UPDATE talking_photos SET video_url = $1, status = 'ready' WHERE id = $2`, [videoRelPath, jobId]);
        console.log(`✅ [TalkingPhoto ${jobId}] Pronto!`);

      } catch (err) {
        console.error(`❌ [TalkingPhoto ${jobId}] Erro:`, err.message);
        await pool.query(`UPDATE talking_photos SET status = 'error', error_msg = $1 WHERE id = $2`, [err.message, jobId]);
      }
    })();
  });

  // GET /api/talking-photo/:id/status
  app.get('/api/talking-photo/:id/status', tpAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, status, video_url, error_msg, created_at FROM talking_photos WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.tpUser.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Não encontrado' });
      res.json(rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/talking-photo/history
  app.get('/api/talking-photo/history', tpAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, photo_url, text, voice, video_url, status, error_msg, created_at 
         FROM talking_photos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [req.tpUser.id]
      );
      res.json({ items: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/talking-photo/:id
  app.delete('/api/talking-photo/:id', tpAuth, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `DELETE FROM talking_photos WHERE id = $1 AND user_id = $2 RETURNING photo_url, audio_url, video_url`,
        [req.params.id, req.tpUser.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Não encontrado' });

      // Limpar arquivos
      for (const url of [rows[0].photo_url, rows[0].audio_url, rows[0].video_url]) {
        if (url) {
          const filepath = resolve(MEDIA_DIR, url.replace('/media/', ''));
          await fs.unlink(filepath).catch(() => {});
        }
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log('🗣️ Rotas de Talking Photo registradas');
}
