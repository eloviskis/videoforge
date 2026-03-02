-- Schema de Feedback / Muro de Sugestões para VideoForge
\c videoforge;

-- Tabela de feedbacks (muro de sugestões)
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  user_nome VARCHAR(100),
  
  -- Conteúdo
  tipo VARCHAR(20) NOT NULL DEFAULT 'sugestao', -- sugestao, bug, elogio, outro
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  
  -- Resposta do admin
  resposta_admin TEXT,
  respondido_em TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, visto, respondido, implementado, rejeitado
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_tipo ON feedbacks(tipo);

-- Trigger para updated_at
CREATE TRIGGER update_feedbacks_updated_at BEFORE UPDATE ON feedbacks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  RAISE NOTICE '✅ Schema Feedback/Sugestões criado com sucesso!';
END $$;
