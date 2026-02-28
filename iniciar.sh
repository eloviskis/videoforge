#!/bin/bash

# Script de inicialização do VideoForge
echo "🎬 Iniciando VideoForge..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # Sem cor

# Diretório base
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# 1. Verificar Docker
echo -e "${BLUE}📦 Verificando containers Docker...${NC}"
docker compose ps | grep -q "Up"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Containers não estão rodando. Iniciando...${NC}"
    docker compose up -d
    sleep 5
else
    echo -e "${GREEN}✅ Containers já estão rodando${NC}"
fi

# 2. Iniciar Backend
echo -e "\n${BLUE}🚀 Iniciando Backend...${NC}"
pkill -f "node server.js" 2>/dev/null
cd backend
node server.js > /tmp/videoforge-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# Verificar se backend iniciou
curl -s http://localhost:3001/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend rodando em http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Erro ao iniciar backend. Verifique /tmp/videoforge-backend.log${NC}"
    exit 1
fi

# 3. Iniciar Frontend
echo -e "\n${BLUE}🎨 Iniciando Frontend...${NC}"
pkill -f "vite" 2>/dev/null
cd ../frontend
npm run dev > /tmp/videoforge-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# Detectar porta do frontend
FRONTEND_PORT=$(grep -oP "http://localhost:\K\d+" /tmp/videoforge-frontend.log | tail -1)
if [ -z "$FRONTEND_PORT" ]; then
    FRONTEND_PORT=3000
fi

echo -e "${GREEN}✅ Frontend rodando em http://localhost:${FRONTEND_PORT}${NC}"

# 4. Resumo
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ VideoForge está pronto!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "🎨 Frontend:  ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "🚀 Backend:   ${BLUE}http://localhost:3001/api${NC}"
echo -e "🔧 n8n:       ${BLUE}http://localhost:5678${NC}"
echo -e "🗄️  pgAdmin:   ${BLUE}http://localhost:5050${NC}"
echo ""
echo -e "📋 Logs:"
echo "   Backend:  tail -f /tmp/videoforge-backend.log"
echo "   Frontend: tail -f /tmp/videoforge-frontend.log"
echo ""
echo -e "${BLUE}💡 Acesse o frontend para começar a criar vídeos!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
