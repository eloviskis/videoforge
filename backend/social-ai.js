// backend/social-ai.js — Social AI: Automação de Instagram
import pool from './news/db.js';
import { verificarToken, buscarUsuarioPorEmail } from './auth.js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { resolve } from 'path';

const MEDIA_DIR = process.env.MEDIA_DIR || resolve(import.meta.dirname || '.', '..', 'media');
const SOCIAL_DIR = resolve(MEDIA_DIR, 'social_ai');

// Helper: extrair user do req (auth já feito pelo middleware)
async function getUser(req, res) {
  if (!req.userId) { res.status(401).json({ error: 'Não autenticado' }); return null; }
  return { id: req.userId, email: req.userEmail };
}

// Helper: buscar token Instagram do usuário
async function getInstagramToken(userId) {
  const { rows } = await pool.query(
    `SELECT access_token, profile_id, profile_name, profile_image, metadata
     FROM user_social_tokens WHERE user_id = $1 AND platform = 'instagram' AND connected = true`,
    [userId]
  );
  return rows[0] || null;
}

// Helper: chamar Gemini para gerar conteúdo
async function callGemini(prompt, maxTokens = 2048) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');
  const resp = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
    },
    { timeout: 60000 }
  );
  return resp.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function registrarRotasSocialAI(app) {
  // Garantir diretório
  fs.mkdir(SOCIAL_DIR, { recursive: true }).catch(() => {});
  console.log('📱 Social AI module loaded');

  // ═══════════════════════════════════════
  // STATUS DA CONEXÃO INSTAGRAM
  // ═══════════════════════════════════════
  app.get('/api/social-ai/instagram/status', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const token = await getInstagramToken(user.id);
      if (!token) return res.json({ connected: false });

      // Testar se token ainda funciona
      try {
        const igResp = await axios.get(`https://graph.facebook.com/${token.profile_id}`, {
          params: { access_token: token.access_token, fields: 'username,followers_count,media_count,profile_picture_url' }
        });
        res.json({
          connected: true,
          profile: {
            name: token.profile_name,
            id: token.profile_id,
            image: token.profile_image,
            username: igResp.data.username,
            followers: igResp.data.followers_count,
            mediaCount: igResp.data.media_count,
            profilePicture: igResp.data.profile_picture_url
          }
        });
      } catch (apiErr) {
        // Token expirado ou inválido
        if (apiErr.response?.status === 400 || apiErr.response?.status === 190) {
          await pool.query('UPDATE user_social_tokens SET connected = false WHERE user_id = $1 AND platform = $2', [user.id, 'instagram']);
          return res.json({ connected: false, expired: true });
        }
        res.json({ connected: true, profile: { name: token.profile_name, id: token.profile_id, image: token.profile_image } });
      }
    } catch (e) {
      console.error('Social AI status error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // ANÁLISE DE PERFIL
  // ═══════════════════════════════════════
  app.post('/api/social-ai/analyze', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const igToken = await getInstagramToken(user.id);
      if (!igToken) return res.status(400).json({ error: 'Instagram não conectado' });

      // Buscar últimos posts
      const mediaResp = await axios.get(`https://graph.facebook.com/${igToken.profile_id}/media`, {
        params: {
          access_token: igToken.access_token,
          fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
          limit: 30
        }
      });

      const posts = mediaResp.data.data || [];

      // Buscar insights de cada post (quando disponível)
      const postsWithInsights = await Promise.all(posts.map(async (post) => {
        let reach = 0, impressions = 0;
        try {
          if (post.media_type !== 'VIDEO') {
            const insights = await axios.get(`https://graph.facebook.com/${post.id}/insights`, {
              params: { access_token: igToken.access_token, metric: 'reach,impressions' }
            });
            insights.data.data?.forEach(m => {
              if (m.name === 'reach') reach = m.values?.[0]?.value || 0;
              if (m.name === 'impressions') impressions = m.values?.[0]?.value || 0;
            });
          } else {
            const insights = await axios.get(`https://graph.facebook.com/${post.id}/insights`, {
              params: { access_token: igToken.access_token, metric: 'reach,plays' }
            });
            insights.data.data?.forEach(m => {
              if (m.name === 'reach') reach = m.values?.[0]?.value || 0;
              if (m.name === 'plays') impressions = m.values?.[0]?.value || 0;
            });
          }
        } catch (e) { /* insights podem não estar disponíveis */ }

        // Extrair hashtags da legenda
        const hashtags = (post.caption || '').match(/#[\w\u00C0-\u024F]+/g) || [];

        return {
          id: post.id,
          caption: post.caption,
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          thumbnailUrl: post.thumbnail_url,
          timestamp: post.timestamp,
          likes: post.like_count || 0,
          comments: post.comments_count || 0,
          reach,
          impressions,
          engagement: (post.like_count || 0) + (post.comments_count || 0),
          hashtags,
          permalink: post.permalink
        };
      }));

      // Análise via IA
      const sortedByEngagement = [...postsWithInsights].sort((a, b) => b.engagement - a.engagement);
      const top10 = sortedByEngagement.slice(0, 10);

      // Agregar hashtags
      const hashtagCount = {};
      postsWithInsights.forEach(p => p.hashtags.forEach(h => {
        hashtagCount[h] = (hashtagCount[h] || 0) + 1;
      }));
      const bestHashtags = Object.entries(hashtagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));

      // Melhor horário
      const hourEngagement = {};
      postsWithInsights.forEach(p => {
        const hour = new Date(p.timestamp).getHours();
        if (!hourEngagement[hour]) hourEngagement[hour] = { total: 0, count: 0 };
        hourEngagement[hour].total += p.engagement;
        hourEngagement[hour].count++;
      });
      const bestTimes = Object.entries(hourEngagement)
        .map(([hour, data]) => ({ hour: parseInt(hour), avgEngagement: Math.round(data.total / data.count) }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 5);

      // Melhor formato
      const formatEngagement = {};
      postsWithInsights.forEach(p => {
        const type = p.mediaType;
        if (!formatEngagement[type]) formatEngagement[type] = { total: 0, count: 0 };
        formatEngagement[type].total += p.engagement;
        formatEngagement[type].count++;
      });
      const bestFormats = Object.fromEntries(
        Object.entries(formatEngagement).map(([type, data]) => [type, {
          avgEngagement: Math.round(data.total / data.count),
          count: data.count
        }])
      );

      // Gerar sugestões com IA
      let suggestions = [];
      try {
        const analysisPrompt = `Analise os dados de um perfil Instagram e gere 5 sugestões práticas em português brasileiro.

Top 10 posts por engajamento:
${top10.map((p, i) => `${i + 1}. Tipo: ${p.mediaType}, Curtidas: ${p.likes}, Comentários: ${p.comments}, Hashtags: ${p.hashtags.join(' ')}`).join('\n')}

Melhores hashtags: ${bestHashtags.slice(0, 10).map(h => h.tag).join(', ')}
Melhores horários: ${bestTimes.map(t => `${t.hour}h (média ${t.avgEngagement} engajamento)`).join(', ')}
Formatos: ${Object.entries(bestFormats).map(([t, d]) => `${t}: ${d.count} posts, média ${d.avgEngagement}`).join(', ')}

Retorne um JSON array com 5 objetos: { "titulo": "...", "descricao": "..." }
Retorne APENAS o JSON, sem markdown.`;

        const aiResp = await callGemini(analysisPrompt, 1024);
        const jsonMatch = aiResp.match(/\[[\s\S]*\]/);
        if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('AI suggestions error:', e.message);
        suggestions = [{ titulo: 'Continue postando', descricao: 'Mantenha a consistência de publições.' }];
      }

      const analysis = {
        profile_data: { postsAnalyzed: postsWithInsights.length },
        top_posts: top10,
        best_hashtags: bestHashtags,
        best_times: bestTimes,
        best_formats: bestFormats,
        suggestions
      };

      // Salvar no banco
      await pool.query(
        `INSERT INTO social_ai_profile_analysis (user_id, platform, profile_data, top_posts, best_hashtags, best_times, best_formats, suggestions, analyzed_at)
         VALUES ($1, 'instagram', $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, platform) DO UPDATE SET
           profile_data = $2, top_posts = $3, best_hashtags = $4, best_times = $5, best_formats = $6, suggestions = $7, analyzed_at = NOW()`,
        [user.id, JSON.stringify(analysis.profile_data), JSON.stringify(analysis.top_posts),
         JSON.stringify(analysis.best_hashtags), JSON.stringify(analysis.best_times),
         JSON.stringify(analysis.best_formats), JSON.stringify(analysis.suggestions)]
      );

      res.json(analysis);
    } catch (e) {
      console.error('Social AI analyze error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Buscar análise salva
  app.get('/api/social-ai/analysis', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { rows } = await pool.query(
        'SELECT * FROM social_ai_profile_analysis WHERE user_id = $1 AND platform = $2',
        [user.id, 'instagram']
      );
      if (!rows[0]) return res.json(null);
      res.json({
        profile_data: rows[0].profile_data,
        top_posts: rows[0].top_posts,
        best_hashtags: rows[0].best_hashtags,
        best_times: rows[0].best_times,
        best_formats: rows[0].best_formats,
        suggestions: rows[0].suggestions,
        analyzed_at: rows[0].analyzed_at
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // GERAR CONTEÚDO COM IA
  // ═══════════════════════════════════════
  app.post('/api/social-ai/generate-content', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { prompt, tipo = 'post', nicho } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt obrigatório' });

      const contentPrompt = `Você é um social media manager expert em Instagram. Crie conteúdo para um ${tipo} de Instagram.

Pedido do usuário: "${prompt}"
${nicho ? `Nicho: ${nicho}` : ''}
Tipo: ${tipo}

Gere um JSON com:
{
  "legenda": "texto da legenda do post (engajante, com emojis, call to action)",
  "hashtags": ["hashtag1", "hashtag2", ...] (30 hashtags relevantes),
  "slides": ["texto slide 1", "texto slide 2", ...] (se for carrossel, 5-10 slides com texto curto),
  "ideiaVisual": "descrição da imagem/vídeo ideal para acompanhar",
  "melhorHorario": "horário sugerido para postar",
  "dica": "dica extra para maximizar engajamento"
}

Retorne APENAS o JSON válido, sem markdown.`;

      const aiResp = await callGemini(contentPrompt, 2048);
      const jsonMatch = aiResp.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta da IA inválida');

      const content = JSON.parse(jsonMatch[0]);
      res.json(content);
    } catch (e) {
      console.error('Generate content error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // CRIAR / SALVAR POST
  // ═══════════════════════════════════════
  app.post('/api/social-ai/posts', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { tipo = 'post', legenda, hashtags = [], mediaUrls = [], videoId, scheduledAt, aiPrompt } = req.body;

      const { rows } = await pool.query(
        `INSERT INTO social_ai_posts (user_id, tipo, legenda, hashtags, media_urls, video_id, scheduled_at, ai_prompt, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [user.id, tipo, legenda, hashtags, mediaUrls, videoId || null,
         scheduledAt || null, aiPrompt || null, scheduledAt ? 'agendado' : 'rascunho']
      );
      res.json(rows[0]);
    } catch (e) {
      console.error('Create post error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Listar posts do usuário
  app.get('/api/social-ai/posts', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { rows } = await pool.query(
        'SELECT * FROM social_ai_posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
        [user.id]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Atualizar post
  app.put('/api/social-ai/posts/:id', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { legenda, hashtags, mediaUrls, scheduledAt, status, tipo } = req.body;
      const { rows } = await pool.query(
        `UPDATE social_ai_posts SET
          legenda = COALESCE($3, legenda),
          hashtags = COALESCE($4, hashtags),
          media_urls = COALESCE($5, media_urls),
          scheduled_at = $6,
          status = COALESCE($7, status),
          tipo = COALESCE($8, tipo)
        WHERE id = $2 AND user_id = $1 RETURNING *`,
        [user.id, req.params.id, legenda, hashtags, mediaUrls, scheduledAt || null, status, tipo]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Post não encontrado' });
      res.json(rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Deletar post
  app.delete('/api/social-ai/posts/:id', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      await pool.query('DELETE FROM social_ai_posts WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // PUBLICAR NO INSTAGRAM
  // ═══════════════════════════════════════
  app.post('/api/social-ai/posts/:id/publish', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;

      const { rows: postRows } = await pool.query(
        'SELECT * FROM social_ai_posts WHERE id = $1 AND user_id = $2', [req.params.id, user.id]
      );
      const post = postRows[0];
      if (!post) return res.status(404).json({ error: 'Post não encontrado' });

      const igToken = await getInstagramToken(user.id);
      if (!igToken) return res.status(400).json({ error: 'Instagram não conectado' });

      await pool.query('UPDATE social_ai_posts SET status = $1 WHERE id = $2', ['publicando', post.id]);

      const fullCaption = `${post.legenda || ''}\n\n${(post.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`.trim();

      try {
        let igContainerId;

        if (post.tipo === 'reels' && post.media_urls?.[0]) {
          // Publicar Reels (vídeo)
          const containerResp = await axios.post(
            `https://graph.facebook.com/${igToken.profile_id}/media`,
            {
              media_type: 'REELS',
              video_url: post.media_urls[0],
              caption: fullCaption,
              access_token: igToken.access_token
            }
          );
          igContainerId = containerResp.data.id;
        } else if (post.tipo === 'carrossel' && post.media_urls?.length > 1) {
          // Carrossel: criar containers individuais primeiro
          const childIds = [];
          for (const url of post.media_urls) {
            const isVideo = /\.(mp4|mov|webm)$/i.test(url);
            const childResp = await axios.post(
              `https://graph.facebook.com/${igToken.profile_id}/media`,
              {
                [isVideo ? 'video_url' : 'image_url']: url,
                is_carousel_item: true,
                access_token: igToken.access_token
              }
            );
            childIds.push(childResp.data.id);
          }
          // Container do carrossel
          const carouselResp = await axios.post(
            `https://graph.facebook.com/${igToken.profile_id}/media`,
            {
              media_type: 'CAROUSEL',
              children: childIds.join(','),
              caption: fullCaption,
              access_token: igToken.access_token
            }
          );
          igContainerId = carouselResp.data.id;
        } else if (post.media_urls?.[0]) {
          // Post simples (imagem)
          const containerResp = await axios.post(
            `https://graph.facebook.com/${igToken.profile_id}/media`,
            {
              image_url: post.media_urls[0],
              caption: fullCaption,
              access_token: igToken.access_token
            }
          );
          igContainerId = containerResp.data.id;
        } else {
          throw new Error('Nenhuma mídia fornecida para publicação');
        }

        // Aguardar processamento do container (especialmente vídeos)
        if (post.tipo === 'reels') {
          let status = 'IN_PROGRESS';
          let attempts = 0;
          while (status === 'IN_PROGRESS' && attempts < 60) {
            await new Promise(r => setTimeout(r, 5000));
            const check = await axios.get(`https://graph.facebook.com/${igContainerId}`, {
              params: { access_token: igToken.access_token, fields: 'status_code' }
            });
            status = check.data.status_code;
            attempts++;
          }
          if (status !== 'FINISHED') throw new Error(`Processamento do vídeo falhou: ${status}`);
        }

        // Publicar
        const publishResp = await axios.post(
          `https://graph.facebook.com/${igToken.profile_id}/media_publish`,
          { creation_id: igContainerId, access_token: igToken.access_token }
        );

        await pool.query(
          'UPDATE social_ai_posts SET status = $1, ig_post_id = $2, published_at = NOW() WHERE id = $3',
          ['publicado', publishResp.data.id, post.id]
        );

        res.json({ ok: true, igPostId: publishResp.data.id });
      } catch (publishErr) {
        await pool.query(
          'UPDATE social_ai_posts SET status = $1, error_message = $2 WHERE id = $3',
          ['erro', publishErr.response?.data?.error?.message || publishErr.message, post.id]
        );
        throw publishErr;
      }
    } catch (e) {
      console.error('Publish error:', e.response?.data || e.message);
      res.status(500).json({ error: e.response?.data?.error?.message || e.message });
    }
  });

  // ═══════════════════════════════════════
  // CALENDÁRIO EDITORIAL COM IA
  // ═══════════════════════════════════════
  app.post('/api/social-ai/calendar/generate', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { dias = 30, nicho, instrucoes } = req.body;

      // Buscar análise existente para contexto
      const { rows: analysisRows } = await pool.query(
        'SELECT * FROM social_ai_profile_analysis WHERE user_id = $1 AND platform = $2',
        [user.id, 'instagram']
      );
      const analysis = analysisRows[0];

      const calPrompt = `Você é um social media strategist expert. Crie um calendário editorial de ${dias} dias para Instagram.

${nicho ? `Nicho: ${nicho}` : ''}
${instrucoes ? `Instruções extras: ${instrucoes}` : ''}
${analysis ? `
Dados do perfil:
- Melhores formatos: ${JSON.stringify(analysis.best_formats)}
- Melhores horários: ${JSON.stringify(analysis.best_times)}
- Melhores hashtags: ${JSON.stringify(analysis.best_hashtags?.slice(0, 10))}
` : ''}

Gere um JSON array com ${dias} objetos, um por dia:
[
  {
    "dia": 1,
    "data": "2026-03-17",
    "tipo": "reels|carrossel|post|stories",
    "tema": "tema curto",
    "descricao": "descrição do conteúdo",
    "horario": "19:00",
    "hashtags": ["hashtag1", "hashtag2"]
  }
]

Comece a partir de amanhã. Varie os formatos. Retorne APENAS o JSON válido, sem markdown.`;

      const aiResp = await callGemini(calPrompt, 4096);
      const jsonMatch = aiResp.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Resposta da IA inválida');

      const plan = JSON.parse(jsonMatch[0]);

      // Salvar
      await pool.query(
        `INSERT INTO social_ai_calendar (user_id, platform, plan_data, generated_at)
         VALUES ($1, 'instagram', $2, NOW())
         ON CONFLICT (user_id, platform) DO UPDATE SET plan_data = $2, generated_at = NOW()`,
        [user.id, JSON.stringify(plan)]
      );

      res.json({ plan });
    } catch (e) {
      console.error('Calendar generate error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Buscar calendário
  app.get('/api/social-ai/calendar', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { rows } = await pool.query(
        'SELECT * FROM social_ai_calendar WHERE user_id = $1 AND platform = $2',
        [user.id, 'instagram']
      );
      res.json(rows[0] ? { plan: rows[0].plan_data, generatedAt: rows[0].generated_at } : null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // GERAR LEGENDA + HASHTAGS (rápido)
  // ═══════════════════════════════════════
  app.post('/api/social-ai/generate-caption', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { tema, tom = 'engajante', nicho } = req.body;
      if (!tema) return res.status(400).json({ error: 'Tema obrigatório' });

      const prompt = `Crie uma legenda de Instagram sobre "${tema}" no tom ${tom}.
${nicho ? `Nicho: ${nicho}` : ''}

Retorne JSON: { "legenda": "...", "hashtags": ["...", "..."] }
A legenda deve ter emojis, call to action, e no máximo 2200 caracteres.
Inclua 20-30 hashtags relevantes.
Retorne APENAS o JSON, sem markdown.`;

      const aiResp = await callGemini(prompt, 1024);
      const jsonMatch = aiResp.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida');
      res.json(JSON.parse(jsonMatch[0]));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // USAR VÍDEO DO VIDEOFORGE COMO REELS
  // ═══════════════════════════════════════
  app.post('/api/social-ai/from-video/:videoId', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const { rows: videoRows } = await pool.query(
        'SELECT * FROM videos WHERE id = $1', [req.params.videoId]
      );
      const video = videoRows[0];
      if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });
      if (!video.video_url) return res.status(400).json({ error: 'Vídeo ainda não está pronto' });

      // Gerar legenda automática
      const prompt = `Crie uma legenda de Instagram Reels para este vídeo:
Título: ${video.titulo}
Descrição: ${video.descricao || 'N/A'}
Tags: ${(video.tags || []).join(', ')}

Retorne JSON: { "legenda": "...", "hashtags": ["...", "..."] }
Retorne APENAS o JSON.`;

      let legenda = video.descricao || video.titulo;
      let hashtags = video.tags || [];
      try {
        const aiResp = await callGemini(prompt, 512);
        const jsonMatch = aiResp.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          legenda = parsed.legenda || legenda;
          hashtags = parsed.hashtags || hashtags;
        }
      } catch (e) { /* usar fallback */ }

      // Montar URL pública do vídeo
      const baseUrl = process.env.APP_BASE_URL || 'https://videoforge.tech';
      const videoUrl = video.video_url.startsWith('http') ? video.video_url : `${baseUrl}${video.video_url}`;

      // Criar post como rascunho
      const { rows } = await pool.query(
        `INSERT INTO social_ai_posts (user_id, tipo, legenda, hashtags, media_urls, video_id, ai_prompt, status)
         VALUES ($1, 'reels', $2, $3, $4, $5, $6, 'rascunho') RETURNING *`,
        [user.id, legenda, hashtags, [videoUrl], video.id, `Reels do vídeo: ${video.titulo}`]
      );

      res.json(rows[0]);
    } catch (e) {
      console.error('From video error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // MEDIA KIT AUTOMÁTICO
  // ═══════════════════════════════════════
  app.get('/api/social-ai/media-kit', async (req, res) => {
    try {
      const user = await getUser(req, res);
      if (!user) return;
      const igToken = await getInstagramToken(user.id);
      if (!igToken) return res.status(400).json({ error: 'Instagram não conectado' });

      // Buscar dados do perfil
      let profile = {};
      try {
        const igResp = await axios.get(`https://graph.facebook.com/${igToken.profile_id}`, {
          params: {
            access_token: igToken.access_token,
            fields: 'username,followers_count,follows_count,media_count,biography,profile_picture_url'
          }
        });
        profile = igResp.data;
      } catch (e) {
        profile = { username: igToken.profile_name, followers_count: 0 };
      }

      // Buscar análise
      const { rows: analysisRows } = await pool.query(
        'SELECT * FROM social_ai_profile_analysis WHERE user_id = $1 AND platform = $2', [user.id, 'instagram']
      );
      const analysis = analysisRows[0];

      // Calcular engajamento médio
      const topPosts = analysis?.top_posts || [];
      const avgEngagement = topPosts.length > 0
        ? Math.round(topPosts.reduce((s, p) => s + (p.engagement || 0), 0) / topPosts.length)
        : 0;
      const engagementRate = profile.followers_count > 0
        ? ((avgEngagement / profile.followers_count) * 100).toFixed(2)
        : '0';

      res.json({
        username: profile.username,
        profilePicture: profile.profile_picture_url || igToken.profile_image,
        bio: profile.biography,
        followers: profile.followers_count,
        following: profile.follows_count,
        posts: profile.media_count,
        avgEngagement,
        engagementRate: `${engagementRate}%`,
        bestFormats: analysis?.best_formats || {},
        bestHashtags: (analysis?.best_hashtags || []).slice(0, 10),
        bestTimes: analysis?.best_times || [],
        topPosts: topPosts.slice(0, 5)
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════
  // AGENDAMENTO (polling para publicar)
  // ═══════════════════════════════════════
  // Checar posts agendados a cada minuto
  setInterval(async () => {
    try {
      const { rows } = await pool.query(
        `SELECT p.*, t.access_token, t.profile_id
         FROM social_ai_posts p
         JOIN user_social_tokens t ON t.user_id = p.user_id AND t.platform = 'instagram' AND t.connected = true
         WHERE p.status = 'agendado' AND p.scheduled_at <= NOW()`
      );

      for (const post of rows) {
        try {
          console.log(`📱 Publicando post agendado ${post.id}...`);
          await pool.query('UPDATE social_ai_posts SET status = $1 WHERE id = $2', ['publicando', post.id]);

          const fullCaption = `${post.legenda || ''}\n\n${(post.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`.trim();

          let igContainerId;
          if (post.tipo === 'reels' && post.media_urls?.[0]) {
            const resp = await axios.post(`https://graph.facebook.com/${post.profile_id}/media`, {
              media_type: 'REELS', video_url: post.media_urls[0], caption: fullCaption, access_token: post.access_token
            });
            igContainerId = resp.data.id;
            // Aguardar processamento
            let status = 'IN_PROGRESS', attempts = 0;
            while (status === 'IN_PROGRESS' && attempts < 60) {
              await new Promise(r => setTimeout(r, 5000));
              const check = await axios.get(`https://graph.facebook.com/${igContainerId}`, {
                params: { access_token: post.access_token, fields: 'status_code' }
              });
              status = check.data.status_code;
              attempts++;
            }
          } else if (post.media_urls?.[0]) {
            const resp = await axios.post(`https://graph.facebook.com/${post.profile_id}/media`, {
              image_url: post.media_urls[0], caption: fullCaption, access_token: post.access_token
            });
            igContainerId = resp.data.id;
          }

          if (igContainerId) {
            const pub = await axios.post(`https://graph.facebook.com/${post.profile_id}/media_publish`, {
              creation_id: igContainerId, access_token: post.access_token
            });
            await pool.query('UPDATE social_ai_posts SET status=$1, ig_post_id=$2, published_at=NOW() WHERE id=$3',
              ['publicado', pub.data.id, post.id]);
            console.log(`✅ Post ${post.id} publicado no Instagram!`);
          }
        } catch (e) {
          await pool.query('UPDATE social_ai_posts SET status=$1, error_message=$2 WHERE id=$3',
            ['erro', e.response?.data?.error?.message || e.message, post.id]);
          console.error(`❌ Erro ao publicar post ${post.id}:`, e.message);
        }
      }
    } catch (e) { /* silencioso no polling */ }
  }, 60 * 1000);
}
