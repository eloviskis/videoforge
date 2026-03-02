-- Tabela de logs de webhook Hotmart + settings adicionais
\c videoforge;

CREATE TABLE IF NOT EXISTS hotmart_webhook_logs (
  id SERIAL PRIMARY KEY,
  evento VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  plano VARCHAR(50),
  transaction_id VARCHAR(255),
  subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'processed',
  payload JSONB,
  ip_origem VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON hotmart_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_email ON hotmart_webhook_logs(email);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_evento ON hotmart_webhook_logs(evento);

-- Settings adicionais para Hotmart
INSERT INTO app_settings (chave, valor, descricao) VALUES
  ('hotmart_checkout_mensal', '', 'URL de checkout Hotmart — plano Mensal'),
  ('hotmart_checkout_anual', '', 'URL de checkout Hotmart — plano Anual'),
  ('hotmart_checkout_vitalicio', '', 'URL de checkout Hotmart — plano Vitalício'),
  ('hotmart_produto_id', '', 'ID do produto na Hotmart (para referência)'),
  ('hotmart_email_boas_vindas', 'Obrigado por assinar o VideoForge! Acesse {URL} e faça login com o email {EMAIL} e a senha {SENHA} que foi gerada automaticamente.', 'Template do texto de boas-vindas (variáveis: {URL}, {EMAIL}, {SENHA})')
ON CONFLICT (chave) DO NOTHING;
