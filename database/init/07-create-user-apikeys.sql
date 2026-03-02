-- 07: Tabela de API keys por usuário + social tokens
\c videoforge;

-- Cada usuário pode ter suas próprias API keys
CREATE TABLE IF NOT EXISTS user_api_keys (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_name VARCHAR(100) NOT NULL,        -- ex: GEMINI_API_KEY, PEXELS_API_KEY
  key_value TEXT NOT NULL,               -- valor encriptado/raw
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, key_name)
);

CREATE INDEX IF NOT EXISTS idx_user_apikeys_user ON user_api_keys(user_id);

-- Social tokens por usuário (YouTube, Twitter, etc.)
CREATE TABLE IF NOT EXISTS user_social_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,         -- youtube, twitter, facebook, linkedin, tiktok, instagram
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  profile_name VARCHAR(255),
  profile_id VARCHAR(255),
  profile_image TEXT,
  metadata JSONB DEFAULT '{}',           -- dados extras (channels, selected_channel, etc.)
  connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_user_social_user ON user_social_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_social_platform ON user_social_tokens(user_id, platform);
