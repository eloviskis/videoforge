#!/bin/bash
set -e

# ============================================
# 🎬 VideoForge - Deploy para VPS
# ============================================
# Uso: bash deploy.sh seudominio.com.br email@exemplo.com
# ============================================

DOMAIN=${1:-""}
EMAIL=${2:-""}

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🎬 =============================${NC}"
echo -e "${BLUE}   VideoForge - Deploy VPS${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""

# Verificar parâmetros
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Uso: bash deploy.sh seudominio.com.br email@exemplo.com${NC}"
    echo ""
    echo "  Exemplo:"
    echo "  bash deploy.sh videoforge.meusite.com.br meuemail@gmail.com"
    echo ""
    exit 1
fi

echo -e "${BLUE}🌐 Domínio: ${DOMAIN}${NC}"
echo -e "${BLUE}📧 Email: ${EMAIL}${NC}"
echo ""

# ============================================
# 1. Verificar requisitos
# ============================================
echo -e "${YELLOW}📋 Verificando requisitos...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}🐳 Instalando Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker instalado${NC}"
fi

if ! command -v docker compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose não encontrado${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Docker e Docker Compose OK${NC}"

# ============================================
# 2. Criar diretórios
# ============================================
echo -e "${YELLOW}📁 Criando diretórios...${NC}"
mkdir -p media/{videos,audios,roteiros,temp}
mkdir -p nginx/ssl
mkdir -p certbot/{www,conf}

# ============================================
# 3. Configurar .env de produção
# ============================================
echo -e "${YELLOW}⚙️  Configurando ambiente...${NC}"

if [ ! -f backend/.env.production ]; then
    cp backend/.env.production.example backend/.env.production
    
    # Substituir domínio
    sed -i "s|seudominio.com.br|${DOMAIN}|g" backend/.env.production
    
    # Gerar senhas aleatórias
    DB_PASS=$(openssl rand -hex 16)
    N8N_PASS=$(openssl rand -hex 16)
    REDIS_PASS=$(openssl rand -hex 16)
    N8N_ADMIN_PASS=$(openssl rand -hex 12)
    
    sed -i "s|forge_TROQUE_ESTA_SENHA_123|${DB_PASS}|g" backend/.env.production
    sed -i "s|n8n_TROQUE_ESTA_SENHA_456|${N8N_PASS}|g" backend/.env.production
    sed -i "s|redis_TROQUE_ESTA_SENHA_789|${REDIS_PASS}|g" backend/.env.production
    sed -i "s|TROQUE_ESTA_SENHA_n8n|${N8N_ADMIN_PASS}|g" backend/.env.production
    
    echo -e "${GREEN}✅ Arquivo .env.production criado com senhas seguras${NC}"
    echo -e "${YELLOW}⚠️  EDITE backend/.env.production para adicionar suas API keys!${NC}"
else
    echo -e "${GREEN}✅ .env.production já existe${NC}"
fi

# Exportar variáveis para docker-compose
export DOMAIN="${DOMAIN}"
source backend/.env.production 2>/dev/null || true

# ============================================
# 4. Configurar Nginx (sem SSL inicialmente)
# ============================================
echo -e "${YELLOW}🔧 Configurando Nginx...${NC}"

cat > nginx/nginx.conf << NGINXEOF
worker_processes auto;
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    sendfile on;
    client_max_body_size 500M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # HTTP - para obter certificado SSL
    server {
        listen 80;
        server_name ${DOMAIN} www.${DOMAIN};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }

        # API
        location /api/ {
            proxy_pass http://backend:3001;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_read_timeout 300s;
        }

        # n8n
        location /n8n/ {
            proxy_pass http://n8n:5678/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_buffering off;
        }
    }
}
NGINXEOF

echo -e "${GREEN}✅ Nginx configurado${NC}"

# ============================================
# 5. Configurar frontend para produção
# ============================================
echo -e "${YELLOW}🎨 Configurando frontend para produção...${NC}"

# Atualizar API_URL no frontend
sed -i "s|http://localhost:3001/api|/api|g" frontend/src/App.jsx 2>/dev/null || true

echo -e "${GREEN}✅ Frontend configurado${NC}"

# ============================================
# 6. Subir containers
# ============================================
echo -e "${YELLOW}🚀 Iniciando containers...${NC}"

docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}✅ Containers iniciados${NC}"

# ============================================
# 7. Obter certificado SSL
# ============================================
echo -e "${YELLOW}🔒 Obtendo certificado SSL...${NC}"

sleep 5

docker run --rm \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificado SSL obtido!${NC}"
    
    # Atualizar Nginx com HTTPS
    cat > nginx/nginx.conf << NGINXEOF2
worker_processes auto;
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    sendfile on;
    client_max_body_size 500M;

    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name ${DOMAIN} www.${DOMAIN};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl;
        server_name ${DOMAIN} www.${DOMAIN};

        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # Backend API
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend:3001;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_read_timeout 300s;
        }

        # n8n
        location /n8n/ {
            proxy_pass http://n8n:5678/;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_buffering off;
        }
    }
}
NGINXEOF2

    # Recarregar Nginx
    docker compose -f docker-compose.prod.yml restart nginx
    echo -e "${GREEN}✅ HTTPS ativado!${NC}"
else
    echo -e "${YELLOW}⚠️  SSL falhou - site funcionará em HTTP${NC}"
    echo "  Verifique se o domínio aponta para este servidor"
    echo "  Depois rode: bash deploy.sh ${DOMAIN} ${EMAIL}"
fi

# ============================================
# 8. Status final
# ============================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✨ VideoForge está ONLINE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🎬 Frontend:  ${BLUE}https://${DOMAIN}${NC}"
echo -e "  🚀 API:       ${BLUE}https://${DOMAIN}/api${NC}"
echo -e "  🔧 n8n:       ${BLUE}https://${DOMAIN}/n8n/${NC}"
echo ""
echo -e "  📋 Comandos úteis:"
echo "    docker compose -f docker-compose.prod.yml logs -f     # Ver logs"
echo "    docker compose -f docker-compose.prod.yml restart      # Reiniciar"
echo "    docker compose -f docker-compose.prod.yml down          # Parar"
echo ""
echo -e "  ⚠️  ${YELLOW}Não esqueça de editar backend/.env.production com suas API keys!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
