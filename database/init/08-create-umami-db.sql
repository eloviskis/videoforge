-- Criar database para Umami Analytics (se não existir)
SELECT 'CREATE DATABASE umami'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'umami')\gexec

-- Criar usuário para umami
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'umami') THEN

      CREATE ROLE umami LOGIN PASSWORD 'umami123';
   END IF;
END
$do$;

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE umami TO umami;
