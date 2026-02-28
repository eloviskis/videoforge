-- Conectar ao database videoforge
\c videoforge;

-- Criar tipos ENUM
CREATE TYPE status_video AS ENUM (
  'RASCUNHO',
  'ROTEIRO_GERADO',
  'NARRACAO_PRONTA',
  'VISUAIS_PRONTOS',
  'RENDERIZANDO',
  'RENDERIZADO',
  'UPLOAD_PENDENTE',
  'PUBLICADO',
  'ERRO'
);

CREATE TYPE etapa_pipeline AS ENUM (
  'ROTEIRO',
  'NARRACAO',
  'VISUAL',
  'RENDERIZACAO',
  'UPLOAD',
  'THUMBNAIL'
);

CREATE TYPE status_etapa AS ENUM (
  'INICIADO',
  'EM_PROGRESSO',
  'SUCESSO',
  'ERRO'
);

-- Tabela principal de vídeos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  tags TEXT[], -- Array de strings
  nicho VARCHAR(50),
  topico TEXT,
  status status_video DEFAULT 'RASCUNHO',
  
  -- Dados do roteiro (JSON)
  roteiro JSONB,
  
  -- URLs dos arquivos gerados
  audio_url VARCHAR(500),
  video_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  
  -- YouTube
  youtube_id VARCHAR(50),
  youtube_url VARCHAR(200),
  categoria_youtube VARCHAR(10) DEFAULT '22',
  
  -- Agendamento
  publish_at TIMESTAMP,
  published_at TIMESTAMP,
  
  -- Metadados
  duracao_segundos INTEGER,
  voz_tts VARCHAR(100) DEFAULT 'pt-BR-AntonioNeural',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de logs do pipeline
CREATE TABLE pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  etapa etapa_pipeline NOT NULL,
  status status_etapa NOT NULL,
  mensagem TEXT,
  dados_extras JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Tabela de templates de prompts
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  nicho VARCHAR(50) NOT NULL,
  descricao TEXT,
  
  -- Prompts
  prompt_roteiro TEXT NOT NULL,
  prompt_visual_base TEXT,
  
  -- Configurações padrão
  duracao_alvo_segundos INTEGER DEFAULT 480, -- 8 minutos
  voz_tts VARCHAR(100) DEFAULT 'pt-BR-AntonioNeural',
  categoria_youtube VARCHAR(10) DEFAULT '22',
  
  -- Metadados
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de analytics (futura)
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Métricas YouTube
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  watch_time_minutos INTEGER DEFAULT 0,
  
  -- CTR e engajamento
  impressions INTEGER DEFAULT 0,
  ctr_percent DECIMAL(5,2),
  avg_view_duration_segundos INTEGER,
  
  -- Timestamp da coleta
  collected_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(video_id, collected_at)
);

-- Índices para performance
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created ON videos(created_at DESC);
CREATE INDEX idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX idx_videos_nicho ON videos(nicho);

CREATE INDEX idx_logs_video ON pipeline_logs(video_id);
CREATE INDEX idx_logs_etapa ON pipeline_logs(etapa);
CREATE INDEX idx_logs_timestamp ON pipeline_logs(timestamp DESC);

CREATE INDEX idx_templates_nicho ON templates(nicho);
CREATE INDEX idx_templates_ativo ON templates(ativo);

CREATE INDEX idx_analytics_video ON analytics(video_id);
CREATE INDEX idx_analytics_collected ON analytics(collected_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir template padrão
INSERT INTO templates (nome, nicho, descricao, prompt_roteiro, prompt_visual_base)
VALUES (
  'Curiosidades Gerais',
  'curiosidades',
  'Template padrão para vídeos de curiosidades e fatos interessantes',
  'Você é um roteirista especializado em vídeos para YouTube no nicho de curiosidades.

Crie um roteiro envolvente e educativo sobre o seguinte tópico: {{TOPICO}}

REQUISITOS:
- Duração alvo: {{DURACAO}} minutos (~{{DURACAO_SEGUNDOS}} segundos)
- Tom: educativo, envolvente e acessível
- Público: brasileiro, 18-45 anos
- Estilo: faceless (narração + imagens/vídeos)
- Dividir em 8-12 cenas curtas (10-20 segundos cada)
- Cada cena deve ter um gancho ou informação interessante
- Use linguagem simples mas inteligente

FORMATO DE SAÍDA (JSON):
{
  "titulo": "Título chamativo e otimizado para cliques (máx 60 caracteres)",
  "descricao": "Descrição completa para YouTube com palavras-chave (3-4 parágrafos)",
  "tags": ["tag1", "tag2", "tag3"], // 10-15 tags relevantes
  "cenas": [
    {
      "numero": 1,
      "texto_narracao": "Texto que será narrado (2-3 frases, natural e conversacional)",
      "prompt_visual": "Detailed description for stock image/video search in English",
      "duracao_estimada": 15
    }
  ],
  "thumbnail_prompt": "Detailed prompt for thumbnail image generation in English",
  "categoria_youtube": "27"
}

Retorne APENAS o JSON válido, sem markdown ou explicações.',
  'cinematic, high quality, 4k, professional stock footage'
);

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Schema VideoForge criado com sucesso!';
  RAISE NOTICE '📊 Tabelas: videos, pipeline_logs, templates, analytics';
  RAISE NOTICE '📝 Template padrão inserido: Curiosidades Gerais';
END $$;
