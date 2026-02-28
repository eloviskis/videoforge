#!/bin/bash

# Script para iniciar o VideoForge completo

echo "🎬 Iniciando VideoForge..."
echo ""

# Verificar se o Docker está rodando
echo "📦 Verificando containers..."
cd "/home/eloi/Área de trabalho/VideoForge"
docker compose ps | grep -q "Up" || {
    echo "⚠️  Containers não estão rodando. Iniciando..."
    docker compose up -d
    sleep 5
}

# Instalar dependências do backend
echo ""
echo "🔧 Instalando dependências do backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Instalar dependências do frontend
echo ""
echo "🎨 Instalando dependências do frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "✅ Tudo pronto!"
echo ""
echo "🚀 Iniciando serviços..."
echo ""

# Iniciar backend em background
cd ../backend
node server.js &
BACKEND_PID=$!

# Iniciar frontend
cd ../frontend
npm run dev

# Cleanup ao sair
trap "kill $BACKEND_PID 2>/dev/null" EXIT
