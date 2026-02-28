import RSSParser from 'rss-parser';
import * as cheerio from 'cheerio';
import axios from 'axios';
import pool from './db.js';

const parser = new RSSParser({
  timeout: 15000,
  headers: { 'User-Agent': 'VideoForge/1.0 RSS Reader' },
});

// ========================================
// Coletar notícias de todas as fontes ativas
// ========================================
export async function coletarNoticias() {
  console.log('📰 Iniciando coleta de notícias...');

  const { rows: fontes } = await pool.query(
    'SELECT * FROM news_sources WHERE ativo = true ORDER BY nome'
  );

  if (fontes.length === 0) {
    console.warn('⚠️ Nenhuma fonte RSS ativa');
    return { coletadas: 0, fontes: 0 };
  }

  let totalColetadas = 0;

  for (const fonte of fontes) {
    try {
      const items = await coletarFonte(fonte);
      totalColetadas += items;
    } catch (err) {
      console.error(`❌ Erro ao coletar ${fonte.nome}:`, err.message);
    }
  }

  // Deduplicar notícias similares
  const removidas = await deduplicarNoticias();

  console.log(`✅ Coleta finalizada: ${totalColetadas} novas notícias de ${fontes.length} fontes (${removidas} duplicatas removidas)`);
  return { coletadas: totalColetadas, fontes: fontes.length, duplicatasRemovidas: removidas };
}

// ========================================
// Coletar uma fonte RSS individual
// ========================================
async function coletarFonte(fonte) {
  let feed;
  try {
    feed = await parser.parseURL(fonte.url);
  } catch (err) {
    console.warn(`  ⚠️ RSS falhou para ${fonte.nome}: ${err.message}`);
    return 0;
  }

  let novas = 0;
  const items = (feed.items || []).slice(0, 20); // Máximo 20 por fonte

  for (const item of items) {
    const url = item.link;
    if (!url) continue;

    // Verificar se já existe
    const { rows } = await pool.query('SELECT id FROM news_items WHERE url = $1', [url]);
    if (rows.length > 0) continue;

    // Extrair resumo (do RSS ou scraping)
    let resumo = item.contentSnippet || item.summary || item.description || '';
    // Limpar HTML
    if (resumo.includes('<')) {
      const $ = cheerio.load(resumo);
      resumo = $.text().trim();
    }
    resumo = resumo.substring(0, 500);

    // Extrair imagem
    let imagemUrl = null;
    if (item.enclosure?.url) {
      imagemUrl = item.enclosure.url;
    } else if (item['media:content']?.$.url) {
      imagemUrl = item['media:content'].$.url;
    } else if (item.content) {
      const $c = cheerio.load(item.content);
      imagemUrl = $c('img').first().attr('src') || null;
    }

    // Se resumo muito curto OU sem imagem, tentar scraping
    if (resumo.length < 80 || !imagemUrl) {
      try {
        const scraped = await scrapeArticle(url);
        if (scraped.resumo && resumo.length < 80) resumo = scraped.resumo;
        if (scraped.imagemUrl && !imagemUrl) imagemUrl = scraped.imagemUrl;
      } catch {
        // Ignore - resumo curto é melhor que nada
      }
    }

    const publicadoEm = item.pubDate ? new Date(item.pubDate) : null;

    try {
      await pool.query(
        `INSERT INTO news_items (titulo, resumo, url, imagem_url, fonte, source_id, categoria, publicado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (url) DO NOTHING`,
        [
          (item.title || 'Sem título').substring(0, 500),
          resumo,
          url,
          imagemUrl,
          fonte.nome,
          fonte.id,
          fonte.categoria,
          publicadoEm,
        ]
      );
      novas++;
    } catch (err) {
      // URL duplicada ou outro erro do banco
    }
  }

  if (novas > 0) {
    console.log(`  📥 ${fonte.nome}: ${novas} novas notícias`);
  }
  return novas;
}

// ========================================
// Scraping complementar de artigo
// ========================================
async function scrapeArticle(url) {
  const result = { resumo: null, imagemUrl: null };

  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForge/1.0)' },
      maxRedirects: 3,
    });

    const $ = cheerio.load(data);

    // Extrair meta description
    result.resumo =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      null;

    // Extrair imagem OG
    result.imagemUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      null;

    // Se resumo ainda curto, pegar primeiro parágrafo do artigo
    if (!result.resumo || result.resumo.length < 50) {
      const paragraphs = $('article p, .content p, .post-content p, .materia-conteudo p')
        .toArray()
        .map((el) => $(el).text().trim())
        .filter((t) => t.length > 40);
      if (paragraphs.length > 0) {
        result.resumo = paragraphs.slice(0, 2).join(' ').substring(0, 500);
      }
    }
  } catch {
    // Timeout ou bloqueio - retornar vazio
  }

  return result;
}

// ========================================
// Deduplicar notícias similares
// ========================================
async function deduplicarNoticias() {
  // Buscar notícias das últimas 48h não usadas
  const { rows } = await pool.query(`
    SELECT id, titulo FROM news_items
    WHERE coletado_em > NOW() - INTERVAL '48 hours'
      AND usado_em_video = false
    ORDER BY coletado_em DESC
  `);

  const toRemove = new Set();

  for (let i = 0; i < rows.length; i++) {
    if (toRemove.has(rows[i].id)) continue;
    for (let j = i + 1; j < rows.length; j++) {
      if (toRemove.has(rows[j].id)) continue;
      if (similaridade(rows[i].titulo, rows[j].titulo) > 0.6) {
        toRemove.add(rows[j].id); // Manter o mais recente (i), remover o duplicado (j)
      }
    }
  }

  if (toRemove.size > 0) {
    const ids = Array.from(toRemove);
    await pool.query(
      `DELETE FROM news_items WHERE id = ANY($1::uuid[])`,
      [ids]
    );
  }

  return toRemove.size;
}

// Similaridade Jaccard por palavras
function similaridade(a, b) {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}

// ========================================
// Selecionar top notícias para vídeo
// ========================================
export async function selecionarTopNoticias(limite = 8, categorias = []) {
  let query = `
    SELECT * FROM news_items
    WHERE usado_em_video = false
      AND coletado_em > NOW() - INTERVAL '48 hours'
  `;
  const params = [];

  if (categorias.length > 0) {
    params.push(categorias);
    query += ` AND categoria = ANY($${params.length}::text[])`;
  }

  query += ` ORDER BY publicado_em DESC NULLS LAST, coletado_em DESC LIMIT $${params.length + 1}`;
  params.push(limite);

  const { rows } = await pool.query(query, params);
  return rows;
}

// ========================================
// Listar fontes
// ========================================
export async function listarFontes() {
  const { rows } = await pool.query('SELECT * FROM news_sources ORDER BY categoria, nome');
  return rows;
}

export async function criarFonte(nome, url, categoria) {
  const { rows } = await pool.query(
    'INSERT INTO news_sources (nome, url, categoria) VALUES ($1, $2, $3) RETURNING *',
    [nome, url, categoria || 'geral']
  );
  return rows[0];
}

export async function atualizarFonte(id, dados) {
  const sets = [];
  const params = [];
  let idx = 1;
  for (const [k, v] of Object.entries(dados)) {
    if (['nome', 'url', 'categoria', 'ativo'].includes(k)) {
      sets.push(`${k} = $${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (sets.length === 0) return null;
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE news_sources SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0];
}

export async function deletarFonte(id) {
  await pool.query('DELETE FROM news_sources WHERE id = $1', [id]);
}

// ========================================
// Listar notícias com filtros
// ========================================
export async function listarNoticias({ categoria, usado, limite = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM news_items WHERE 1=1';
  const params = [];
  let idx = 1;

  if (categoria) {
    query += ` AND categoria = $${idx}`;
    params.push(categoria);
    idx++;
  }
  if (usado !== undefined) {
    query += ` AND usado_em_video = $${idx}`;
    params.push(usado);
    idx++;
  }

  query += ` ORDER BY coletado_em DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limite, offset);

  const { rows } = await pool.query(query, params);
  return rows;
}

// ========================================
// Config
// ========================================
export async function getConfig() {
  const { rows } = await pool.query('SELECT * FROM news_config WHERE id = 1');
  return rows[0];
}

export async function updateConfig(dados) {
  const sets = [];
  const params = [];
  let idx = 1;
  const allowed = ['tom', 'horario_agendamento', 'threshold_minimo', 'max_noticias', 'categorias_filtro', 'palavras_chave', 'ativo'];
  for (const [k, v] of Object.entries(dados)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = $${idx}`);
      params.push(v);
      idx++;
    }
  }
  if (sets.length === 0) return null;
  const { rows } = await pool.query(
    `UPDATE news_config SET ${sets.join(', ')} WHERE id = 1 RETURNING *`,
    params
  );
  return rows[0];
}
