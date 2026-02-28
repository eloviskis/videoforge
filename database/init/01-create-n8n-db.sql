-- Criar database para n8n (se não existir)
SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Criar usuário para n8n
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'n8n') THEN

      CREATE ROLE n8n LOGIN PASSWORD 'n8n123';
   END IF;
END
$do$;

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;
