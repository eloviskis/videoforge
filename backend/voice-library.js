import pool from './news/db.js';
import multer from 'multer';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Diretório de mídia (mesmo do server.js)
const MEDIA_DIR = process.env.MEDIA_DIR
  || (process.env.NO_DOCKER === '1' ? resolve(__dirname, '..', 'media') : '/media');

// ========================================
// MULTER: upload de áudio (máx 25MB)
// ========================================
const voiceUploadDir = resolve(MEDIA_DIR, 'voices');
const upload = multer({
  dest: voiceUploadDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de áudio não suportado. Use MP3, WAV, OGG, WEBM ou M4A.'));
    }
  }
});

// ========================================
// AUTO-CREATE TABLE
// ========================================
async function ensureVoiceLibraryTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voice_library (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        nome VARCHAR(100) NOT NULL,
        descricao VARCHAR(255),
        provider VARCHAR(20) NOT NULL DEFAULT 'elevenlabs',
        provider_voice_id VARCHAR(100),
        sample_file VARCHAR(500),
        status VARCHAR(20) DEFAULT 'processing',
        idioma VARCHAR(10) DEFAULT 'pt-BR',
        genero VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_lib_user ON voice_library(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_lib_status ON voice_library(status)`);
    await fs.mkdir(voiceUploadDir, { recursive: true });
    console.log('🎤 Tabela voice_library pronta');
  } catch (err) {
    console.warn('⚠️ Voice library table check:', err.message);
  }
}

// ========================================
// HELPER: chamar ElevenLabs para clonar voz
// ========================================
async function clonarVozElevenLabs(nome, descricao, filePath) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY não configurada. Configure no painel de API Keys.');

  const FormData = (await import('form-data')).default;
  const { createReadStream } = await import('fs');

  const form = new FormData();
  form.append('name', nome.substring(0, 100));
  form.append('description', (descricao || `Voz clonada: ${nome}`).substring(0, 500));
  form.append('files', createReadStream(filePath));

  const resp = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
    headers: {
      ...form.getHeaders(),
      'xi-api-key': apiKey
    },
    timeout: 120000
  });

  return resp.data; // { voice_id: "xxx" }
}

// ========================================
// HELPER: gerar preview TTS com ElevenLabs
// ========================================
async function gerarPreviewElevenLabs(voiceId, texto) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY não configurada');

  const resp = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      text: texto.substring(0, 500),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    },
    {
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 60000
    }
  );

  return Buffer.from(resp.data);
}

// ========================================
// HELPER: deletar voz do ElevenLabs
// ========================================
async function deletarVozElevenLabs(voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return;

  try {
    await axios.delete(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
      headers: { 'xi-api-key': apiKey },
      timeout: 30000
    });
  } catch (err) {
    console.warn('⚠️ Erro ao deletar voz do ElevenLabs:', err.message);
  }
}

// ========================================
// REGISTRAR ROTAS
// ========================================
export function registrarRotasVoiceLibrary(app) {
  ensureVoiceLibraryTable();

  // ── Listar vozes do usuário ──
  app.get('/api/voices/library', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, nome, descricao, provider, provider_voice_id, sample_file, status, idioma, genero, created_at
         FROM voice_library WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.userId]
      );
      res.json({ voices: rows, total: rows.length });
    } catch (e) {
      console.error('Voice library GET:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Upload + clonar voz ──
  app.post('/api/voices/clone', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de áudio (MP3, WAV, OGG, etc.)' });

      const { nome, descricao, idioma, genero } = req.body;
      if (!nome || nome.trim().length < 2) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Nome da voz é obrigatório (mín. 2 caracteres)' });
      }

      // Verificar se ELEVENLABS_API_KEY está configurada
      if (!process.env.ELEVENLABS_API_KEY) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          error: 'Para usar clonagem de voz, configure sua ElevenLabs API Key no painel de Configurações > API Keys.',
          needsApiKey: true
        });
      }

      // Verificar limite por usuário (máx 20 vozes)
      const { rows: countRows } = await pool.query(
        'SELECT COUNT(*) as total FROM voice_library WHERE user_id = $1', [req.userId]
      );
      if (parseInt(countRows[0].total) >= 20) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Limite de 20 vozes atingido. Delete uma voz existente para adicionar nova.' });
      }

      // Renomear arquivo para manter extensão
      const ext = req.file.originalname.match(/\.(mp3|wav|ogg|webm|m4a)$/i)?.[0] || '.mp3';
      const finalPath = req.file.path + ext;
      await fs.rename(req.file.path, finalPath);

      // Salvar registro no DB com status "processing"
      const { rows } = await pool.query(
        `INSERT INTO voice_library (user_id, nome, descricao, provider, sample_file, status, idioma, genero)
         VALUES ($1, $2, $3, 'elevenlabs', $4, 'processing', $5, $6)
         RETURNING id`,
        [req.userId, nome.trim().substring(0, 100), (descricao || '').substring(0, 255),
         `/media/voices/${req.file.filename}${ext}`, idioma || 'pt-BR', genero || null]
      );
      const voiceDbId = rows[0].id;

      // Clonar no ElevenLabs (async — responde imediatamente ao frontend)
      res.json({ success: true, voiceId: voiceDbId, message: 'Upload recebido! Clonagem em andamento...' });

      // Processar clonagem em background
      try {
        console.log(`🎤 Clonando voz "${nome}" para usuário ${req.userId}...`);
        const result = await clonarVozElevenLabs(nome.trim(), descricao, finalPath);

        await pool.query(
          `UPDATE voice_library SET provider_voice_id = $1, status = 'ready', updated_at = NOW() WHERE id = $2`,
          [result.voice_id, voiceDbId]
        );
        console.log(`✅ Voz "${nome}" clonada! ElevenLabs ID: ${result.voice_id}`);
      } catch (cloneErr) {
        console.error(`❌ Erro na clonagem de voz "${nome}":`, cloneErr.response?.data || cloneErr.message);
        const errorMsg = cloneErr.response?.data?.detail?.message || cloneErr.message || 'Erro desconhecido';
        await pool.query(
          `UPDATE voice_library SET status = 'error', descricao = $1, updated_at = NOW() WHERE id = $2`,
          [`ERRO: ${errorMsg.substring(0, 200)}`, voiceDbId]
        );
      }
    } catch (e) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      console.error('Voice clone POST:', e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  // ── Deletar voz ──
  app.delete('/api/voices/library/:id', async (req, res) => {
    try {
      const voiceId = req.params.id;
      // Verificar propriedade
      const { rows } = await pool.query(
        'SELECT * FROM voice_library WHERE id = $1 AND user_id = $2', [voiceId, req.userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Voz não encontrada' });

      const voice = rows[0];

      // Deletar do ElevenLabs
      if (voice.provider_voice_id) {
        await deletarVozElevenLabs(voice.provider_voice_id);
      }

      // Deletar arquivo local
      if (voice.sample_file) {
        const localPath = resolve(MEDIA_DIR, voice.sample_file.replace('/media/', ''));
        await fs.unlink(localPath).catch(() => {});
      }

      // Deletar do DB
      await pool.query('DELETE FROM voice_library WHERE id = $1', [voiceId]);

      res.json({ success: true, message: 'Voz deletada com sucesso' });
    } catch (e) {
      console.error('Voice DELETE:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Preview: gerar áudio de teste com a voz clonada ──
  app.post('/api/voices/preview/:id', async (req, res) => {
    try {
      const voiceId = req.params.id;
      const { texto } = req.body;

      // Verificar propriedade e que está pronta
      const { rows } = await pool.query(
        'SELECT * FROM voice_library WHERE id = $1 AND user_id = $2', [voiceId, req.userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Voz não encontrada' });

      const voice = rows[0];
      if (voice.status !== 'ready') {
        return res.status(400).json({ error: `Voz ainda não está pronta (status: ${voice.status})` });
      }
      if (!voice.provider_voice_id) {
        return res.status(400).json({ error: 'Voice ID do provedor não encontrado' });
      }

      const sampleText = (texto || 'Olá! Esta é uma demonstração da minha voz clonada. Como você pode ver, a entonação e o ritmo são muito naturais.').substring(0, 500);

      const audioBuffer = await gerarPreviewElevenLabs(voice.provider_voice_id, sampleText);

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length
      });
      res.send(audioBuffer);
    } catch (e) {
      console.error('Voice preview POST:', e.message);
      res.status(500).json({ error: 'Erro ao gerar preview: ' + e.message });
    }
  });

  // ── Status de uma voz (polling) ──
  app.get('/api/voices/library/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, nome, descricao, provider, provider_voice_id, status, idioma, genero, created_at FROM voice_library WHERE id = $1 AND user_id = $2',
        [req.params.id, req.userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Voz não encontrada' });
      res.json(rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ========================================
// EXPORT: buscar voice_id do ElevenLabs pelo ID interno
// ========================================
export async function buscarVozClonada(voiceDbId, userId) {
  const { rows } = await pool.query(
    'SELECT provider_voice_id, nome, status FROM voice_library WHERE id = $1 AND user_id = $2',
    [voiceDbId, userId]
  );
  if (rows.length === 0) return null;
  if (rows[0].status !== 'ready') return null;
  return rows[0];
}
