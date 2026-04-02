# 🧪 Exemplos de Teste - VideoForge

> ⚠️ Todos os endpoints requerem autenticação JWT. Obtenha um token via login primeiro.

## 🔑 Obter Token de Autenticação

```bash
# Login para obter token JWT
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suasenha"}' | jq -r '.token')

echo "Token: $TOKEN"
```

---

## 🎬 Testar Criação de Vídeos

### 1. Vídeo com Imagens Stock (Pexels) — Gratuito

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "5 Curiosidades sobre o Espaço",
    "nicho": "curiosidades",
    "duracao": 5,
    "detalhes": "Fatos científicos interessantes",
    "publicarYoutube": false,
    "tipoVideo": "stockImages"
  }'
```

### 2. Vídeo com Vídeos Stock (Pexels + Pixabay) — Gratuito

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "10 Lugares Incríveis para Visitar",
    "nicho": "viagens",
    "duracao": 8,
    "tipoVideo": "stockVideos"
  }'
```

### 3. Vídeo com Animação de Palitinho — Gratuito

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Como Nasceu a Internet",
    "nicho": "tecnologia",
    "duracao": 5,
    "detalhes": "História da criação da internet de forma simples",
    "tipoVideo": "stickAnimation"
  }'
```

### 4. Vídeo Dark Stickman (100% local) — Gratuito

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "A Casa Abandonada",
    "nicho": "terror",
    "duracao": 5,
    "tipoVideo": "darkStickman"
  }'
```

### 5. Vídeo com Imagens IA Grátis (Stable Horde/Pollinations)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Futuro da Tecnologia em 2050",
    "nicho": "tecnologia",
    "duracao": 5,
    "tipoVideo": "aiImageGeneration"
  }'
```

### 6. Vídeo com Gemini Veo (Google — Gratuito com limites)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "A Beleza do Oceano",
    "nicho": "natureza",
    "duracao": 3,
    "tipoVideo": "geminiVeoGeneration"
  }'
```

### 7. Vídeo com ComfyUI (seu servidor IA)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Paisagens Fantásticas de Ficção Científica",
    "nicho": "arte",
    "duracao": 5,
    "tipoVideo": "comfyuiGeneration"
  }'
```

### 8. Vídeo com Replicate / Wan 2.1 (pago)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Receitas Japonesas Tradicionais",
    "nicho": "culinária",
    "duracao": 5,
    "tipoVideo": "replicateGeneration"
  }'
```

### 9. Vídeo com Kling AI (pago)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Vida Selvagem na Savana",
    "nicho": "natureza",
    "duracao": 5,
    "tipoVideo": "klingGeneration"
  }'
```

### 10. Vídeo com Preview de Cenas (qualquer tipo)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Os Maiores Mistérios do Universo",
    "nicho": "ciência",
    "duracao": 5,
    "tipoVideo": "stockImages",
    "previewMode": true
  }'
```

---

## ✍️ Testar Roteiro Manual

```bash
curl -X POST http://localhost:3001/api/videos/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "titulo": "Meu Vídeo Personalizado",
    "roteiro": "Cena 1: Introdução ao tema. A tecnologia está mudando o mundo.\nCena 2: A inteligência artificial está revolucionando tudo.\nCena 3: O futuro é agora. Conclusão motivacional.",
    "tipoVideo": "stockImages",
    "voz": "pt-BR-FranciscaNeural"
  }'
```

---

## ⭐ Testar Vídeo Resenha

```bash
curl -X POST http://localhost:3001/api/videos/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nomeProduto": "iPhone 16 Pro",
    "categoria": "smartphones",
    "pontosPositivos": "Câmera incrível, performance excelente, bateria duradoura",
    "pontosNegativos": "Preço alto, sem USB-C completo",
    "notaGeral": 9,
    "faixaPreco": "R$ 7.000 - R$ 10.000",
    "tipoVideo": "stockImages"
  }'
```

---

## 🔌 Testar Conexão ComfyUI

```bash
curl -s "http://localhost:3001/api/comfyui/test?url=http://seu-ip:8188" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Resposta esperada (sucesso):**
```json
{
  "ok": true,
  "gpu": "NVIDIA GeForce RTX 4090",
  "vram": "24GB",
  "models": ["dreamshaper_8.safetensors", "sdxl_base.safetensors"],
  "version": "0.3.6"
}
```

---

## 📊 Monitorar Progresso

### Listar Vídeos

```bash
curl -s http://localhost:3001/api/videos \
  -H "Authorization: Bearer $TOKEN" | jq '.[0:3]'
```

### Ver Detalhes de um Vídeo

```bash
VIDEO_ID="seu-video-id"
curl -s http://localhost:3001/api/videos/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN" | jq '{status, progresso, etapa}'
```

### Listar Cenas (após preview)

```bash
curl -s http://localhost:3001/api/videos/$VIDEO_ID/cenas \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Confirmar Visuais e Renderizar

```bash
curl -X POST http://localhost:3001/api/videos/$VIDEO_ID/confirmar-visuais \
  -H "Authorization: Bearer $TOKEN"
```

**Status possíveis:** `iniciando` → `gerando_roteiro` → `gerando_narracao` → `buscando_imagens` / `gerando_visuais` → `aguardando_revisao` (preview) → `renderizando` → `concluido` / `erro`

---

## 🎙️ Testar Vozes

### Listar Vozes TTS Disponíveis

```bash
curl -s http://localhost:3001/api/tts/voices \
  -H "Authorization: Bearer $TOKEN" | jq '.total'
```

### Preview de Voz

```bash
curl -X POST http://localhost:3001/api/tts/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"voice":"pt-BR-FranciscaNeural","text":"Olá, esta é uma demonstração de voz."}' \
  --output preview.mp3
```

---

## 📺 Testar YouTube SEO

```bash
curl -X POST http://localhost:3001/api/youtube/generate-seo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"titulo":"5 Curiosidades sobre o Espaço","nicho":"ciência"}'
```

---

## 🏥 Health Check

```bash
curl -s http://localhost:3001/api/health | jq
```

---

## ⏱️ Performance Esperada

### Gratuitos (Stock / Dark Stickman)

| Tipo | Duração 5min | Duração 10min |
|------|-------------|---------------|
| Stock Images | ~2-3 min | ~4-6 min |
| Stock Vídeos | ~3-5 min | ~6-10 min |
| Dark Stickman | ~2-4 min | ~5-8 min |

### Animações (Remotion)

| Duração | Cenas | Tempo Total |
|---------|-------|-------------|
| 5 min | 6 | ~8-12 min |
| 10 min | 10 | ~15-20 min |

### IA Generativa (Pago)

| Tipo | Tempo/Cena | Nota |
|------|-----------|------|
| ComfyUI | ~15-60s | Depende do modelo/hardware |
| Replicate | ~30s-2min | Wan 2.1 / Flux.1 |
| Kling | ~1-5min | Alta qualidade |
| Veo | ~30s-2min | Google Vertex |

---

## 🛠️ Comandos Úteis

```bash
# Ver logs em tempo real
docker logs videoforge-backend -f --tail 50

# Reiniciar backend
docker restart videoforge-backend

# Limpar vídeos antigos
docker exec videoforge-backend rm -rf /app/media/temp/*

# Shell no container
docker exec -it videoforge-backend sh
```

---

**VideoForge v2.0** 🧪
