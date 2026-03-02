-- Tabela de configurações do sistema (preços, limites, etc.)
\c videoforge;

CREATE TABLE IF NOT EXISTS app_settings (
  chave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir valores padrão de preços e limites
INSERT INTO app_settings (chave, valor, descricao) VALUES
  ('preco_mensal', '47', 'Preço do plano mensal em R$'),
  ('preco_anual', '397', 'Preço do plano anual em R$'),
  ('preco_vitalicio', '997', 'Preço do plano vitalício em R$'),
  ('limite_trial', '5', 'Limite de vídeos/mês no plano trial'),
  ('limite_mensal', '50', 'Limite de vídeos/mês no plano mensal'),
  ('limite_anual', '100', 'Limite de vídeos/mês no plano anual'),
  ('limite_vitalicio', '9999', 'Limite de vídeos/mês no plano vitalício'),
  ('versao_app', '1.1.0', 'Versão atual do instalador Windows'),
  ('download_url', '', 'URL direta do instalador .exe (ou vazia para servir local)'),
  ('aviso_tokens', 'Alguns modos de geração de vídeo (Replicate, Kling, Veo, Sora) consomem tokens de IA pagos. O custo depende da duração e do provedor escolhido. Modos gratuitos: Stock Images e Stick Animation (usam apenas APIs gratuitas como Gemini e Pexels).', 'Aviso sobre tokens pagos exibido na landing e no app')
ON CONFLICT (chave) DO NOTHING;

-- Adicionar coluna is_admin na tabela users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;
