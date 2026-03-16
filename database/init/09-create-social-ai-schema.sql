-- 09: Social AI — Instagram Automation
\c videoforge;

-- Status dos posts social
CREATE TYPE social_post_status AS ENUM (
  'rascunho', 'agendado', 'publicando', 'publicado', 'erro'
);

CREATE TYPE social_post_type AS ENUM (
  'post', 'carrossel', 'reels', 'stories'
);

-- Posts criados/agendados
CREATE TABLE IF NOT EXISTS social_ai_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
  tipo social_post_type NOT NULL DEFAULT 'post',
  status social_post_status NOT NULL DEFAULT 'rascunho',
  legenda TEXT,
  hashtags TEXT[],
  media_urls TEXT[],
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  ig_post_id VARCHAR(255),
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  error_message TEXT,
  ai_prompt TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_ai_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_ai_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_ai_posts(scheduled_at) WHERE status = 'agendado';

-- Análise de perfil (cache)
CREATE TABLE IF NOT EXISTS social_ai_profile_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
  profile_data JSONB DEFAULT '{}',
  top_posts JSONB DEFAULT '[]',
  best_hashtags JSONB DEFAULT '[]',
  best_times JSONB DEFAULT '[]',
  best_formats JSONB DEFAULT '{}',
  suggestions JSONB DEFAULT '[]',
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Calendário editorial
CREATE TABLE IF NOT EXISTS social_ai_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL DEFAULT 'instagram',
  plan_data JSONB DEFAULT '[]',
  generated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_social_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_social_posts_updated
    BEFORE UPDATE ON social_ai_posts
    FOR EACH ROW EXECUTE FUNCTION update_social_ai_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
