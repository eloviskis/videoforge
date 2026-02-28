#!/bin/bash

# Script de teste dos workflows do VideoForge

echo "🎬 VideoForge - Teste de Workflows"
echo "=================================="
echo ""

# Teste 1: Gerar Roteiro
echo "1️⃣ Gerando roteiro..."
curl -X POST http://localhost:5678/webhook/gerar-roteiro \
  -H "Content-Type: application/json" \
  -d '{
    "nicho": "curiosidades",
    "topico": "5 fatos incríveis sobre o oceano",
    "duracao": 8
  }' | jq '.'

echo ""
echo "✅ Roteiro gerado! Confira em: media/roteiros/"
