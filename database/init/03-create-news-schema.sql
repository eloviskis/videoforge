-- Schema de Notícias para VideoForge
-- Executar via: docker exec -i videoforge-postgres psql -U videoforge -d videoforge < database/init/03-create-news-schema.sql

\c videoforge;

-- Tipo ENUM para status
CREATE TYPE news_video_status AS ENUM (
  'COLETANDO',
  'ROTEIRO_GERADO',
  'NARRACAO_PRONTA',
  'RENDERIZANDO',
  'RENDERIZADO',
  'UPLOAD_PENDENTE',
  'PUBLICADO',
  'ERRO',
  'SEM_NOTICIAS'
);

-- Fontes RSS
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  categoria VARCHAR(50) DEFAULT 'geral',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notícias coletadas
CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(500) NOT NULL,
  resumo TEXT,
  conteudo TEXT,
  url VARCHAR(1000) UNIQUE NOT NULL,
  imagem_url VARCHAR(1000),
  fonte VARCHAR(100) NOT NULL,
  source_id UUID REFERENCES news_sources(id) ON DELETE SET NULL,
  categoria VARCHAR(50),
  publicado_em TIMESTAMP,
  coletado_em TIMESTAMP DEFAULT NOW(),
  usado_em_video BOOLEAN DEFAULT false
);

-- Vídeos de notícias
CREATE TABLE IF NOT EXISTS news_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(200) NOT NULL,
  status news_video_status DEFAULT 'COLETANDO',
  roteiro JSONB,
  audio_url VARCHAR(500),
  video_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  youtube_id VARCHAR(50),
  publish_at TIMESTAMP,
  total_noticias INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Relação N:N entre vídeo e notícias usadas
CREATE TABLE IF NOT EXISTS news_video_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_video_id UUID REFERENCES news_videos(id) ON DELETE CASCADE,
  news_item_id UUID REFERENCES news_items(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL
);

-- Configurações globais de notícias
CREATE TABLE IF NOT EXISTS news_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  tom VARCHAR(30) DEFAULT 'casual',
  horario_agendamento VARCHAR(10) DEFAULT '07:00',
  threshold_minimo INTEGER DEFAULT 3,
  max_noticias INTEGER DEFAULT 8,
  categorias_filtro TEXT[] DEFAULT '{}',
  palavras_chave TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (id = 1)
);

-- Inserir config padrão
INSERT INTO news_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_news_items_url ON news_items(url);
CREATE INDEX IF NOT EXISTS idx_news_items_coletado ON news_items(coletado_em DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_usado ON news_items(usado_em_video);
CREATE INDEX IF NOT EXISTS idx_news_items_fonte ON news_items(fonte);
CREATE INDEX IF NOT EXISTS idx_news_videos_status ON news_videos(status);
CREATE INDEX IF NOT EXISTS idx_news_videos_created ON news_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sources_ativo ON news_sources(ativo);

-- Trigger para updated_at
CREATE TRIGGER update_news_videos_updated_at BEFORE UPDATE ON news_videos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_config_updated_at BEFORE UPDATE ON news_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir fontes RSS padrão
INSERT INTO news_sources (nome, url, categoria) VALUES
  ('G1 - Tecnologia', 'https://g1.globo.com/rss/g1/tecnologia/', 'tecnologia'),
  ('G1 - Economia', 'https://g1.globo.com/rss/g1/economia/', 'economia'),
  ('G1 - Mundo', 'https://g1.globo.com/rss/g1/mundo/', 'mundo'),
  ('G1 - Ciência', 'https://g1.globo.com/rss/g1/ciencia-e-saude/', 'ciencia'),
  ('UOL - Notícias', 'https://rss.uol.com.br/feed/noticias.xml', 'geral'),
  ('Folha - Mundo', 'https://feeds.folha.uol.com.br/mundo/rss091.xml', 'mundo'),
  ('BBC Brasil', 'https://feeds.bbci.co.uk/portuguese/rss.xml', 'geral'),
  ('TechCrunch', 'https://techcrunch.com/feed/', 'tecnologia')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Schema de Notícias criado com sucesso!';
  RAISE NOTICE '📊 Tabelas: news_sources, news_items, news_videos, news_video_items, news_config';
  RAISE NOTICE '📰 8 fontes RSS padrão inseridas';
END $$;
