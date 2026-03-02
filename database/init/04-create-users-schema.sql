-- Tabela de usuários para SaaS (Hotmart + auth JWT)
\c videoforge;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  plano VARCHAR(50) DEFAULT 'trial',  -- trial, mensal, anual, vitalicio
  ativo BOOLEAN DEFAULT true,
  
  -- Hotmart
  hotmart_transaction VARCHAR(255),
  hotmart_subscription VARCHAR(255),
  hotmart_status VARCHAR(50) DEFAULT 'pending', -- approved, canceled, refunded, expired
  
  -- Limites do plano
  videos_mes_limite INT DEFAULT 5,       -- quantos vídeos pode gerar por mês
  videos_mes_usados INT DEFAULT 0,       -- contador mensal
  mes_referencia VARCHAR(7),             -- '2026-03' para resetar contador
  
  -- Controle
  ultimo_login TIMESTAMP,
  data_expiracao TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_hotmart_sub ON users(hotmart_subscription);
CREATE INDEX IF NOT EXISTS idx_users_ativo ON users(ativo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_timestamp();
