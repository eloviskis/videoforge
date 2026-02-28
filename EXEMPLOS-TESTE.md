# 🧪 Exemplos de Teste - VideoForge

## Testar Sistema de Animações

### 1. Teste Rápido do Remotion (Standalone)

```bash
./testar-animacoes.sh
```

Este script vai:
- Verificar instalação do Remotion
- Criar uma cena de teste simples (3 segundos)
- Renderizar e salvar em `/tmp/videoforge-test-animation.mp4`

---

## Testar via API (Pipeline Completo)

### 2. Vídeo com Imagens Stock (Pexels)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "5 Curiosidades sobre o Espaço",
    "nicho": "curiosidades",
    "duracao": 5,
    "detalhes": "Fatos científicos interessantes",
    "publicarYoutube": false,
    "tipoVideo": "stockImages"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "videoId": "a1b2c3d4",
  "message": "Vídeo criado! Pipeline iniciado."
}
```

### 3. Vídeo com Animação de Palitinho (IA)

```bash
curl -X POST http://localhost:3001/api/videos \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Como Nasceu a Internet",
    "nicho": "tecnologia",
    "duracao": 5,
    "detalhes": "História da criação da internet de forma simples",
    "publicarYoutube": false,
    "tipoVideo": "stickAnimation"
  }'
```

**Pipeline de Animação:**
1. ✅ Gemini gera roteiro (6+ cenas)
2. ✅ gTTS + FFmpeg cria narração por cena
3. ✅ Gemini gera código TypeScript/Remotion para cada cena
4. ✅ Remotion renderiza cada cena (1080p, 25fps)
5. ✅ FFmpeg concatena clips + adiciona áudio

---

## Monitorar Progresso

### Listar Vídeos

```bash
curl -s http://localhost:3001/api/videos | python3 -m json.tool
```

### Ver Detalhes de um Vídeo

```bash
VIDEO_ID="a1b2c3d4"  # Substitua pelo ID do seu vídeo
curl -s http://localhost:3001/api/videos/$VIDEO_ID | python3 -m json.tool
```

**Campos importantes:**
- `status`: iniciando, gerando_roteiro, gerando_narracao, gerando_animacao, renderizando, concluido, erro
- `progresso`: 0-100
- `etapa`: Descrição do que está acontecendo
- `videoUrl`: Path do vídeo final (quando concluído)

### Ver Logs em Tempo Real

```bash
tail -f /tmp/videoforge-backend.log
```

---

## Estrutura de Resposta Completa

```json
{
  "id": "a1b2c3d4",
  "titulo": "Como Nasceu a Internet",
  "nicho": "tecnologia",
  "duracao": 5,
  "detalhes": "História da criação da internet de forma simples",
  "publicarYoutube": false,
  "tipoVideo": "stickAnimation",
  "status": "concluido",
  "progresso": 100,
  "etapa": "Vídeo pronto!",
  "criado_em": "2026-02-10T18:30:45.123Z",
  "roteiro": {
    "titulo": "Como Nasceu a Internet: A Revolução Digital",
    "descricao": "Descubra a história fascinante...",
    "tags": ["tecnologia", "internet", "história", "inovação"],
    "cenas": [
      {
        "numero": 1,
        "texto_narracao": "No início dos anos 60...",
        "prompt_visual": "scientists working with early computers in 1960s lab",
        "duracao_estimada": 12
      }
    ]
  },
  "audioUrl": "/home/eloi/.../media/audios/a1b2c3d4.mp3",
  "videoUrl": "/home/eloi/.../media/videos/a1b2c3d4.mp4"
}
```

---

## Troubleshooting

### Vídeo travado em "gerando_animacao"

**Causa:** Gemini pode demorar para gerar código complexo

**Solução:**
```bash
# Ver logs
tail -50 /tmp/videoforge-backend.log | grep "Cena"
```

### Erro: "Remotion not found"

**Solução:**
```bash
cd remotion-animations
npm install
```

### Timeout ao renderizar

**Causa:** Cenas muito longas (>30s) podem exceder timeout

**Solução:** Modificar timeout em `server.js`:
```js
// Linha ~905 em renderizarAnimacaoRemotion
timeout: 300000 // 5 minutos
```

### Animação ficou estranha

**Causa:** IA gerou código inesperado

**Soluções:**
1. Reprocesse o vídeo
2. Mude o prompt para ser mais específico
3. Use detalhes mais descritivos

**Exemplo de bom detalhamento:**
```json
{
  "titulo": "Como Funciona a Fotossíntese",
  "detalhes": "Explique de forma simples, passo a passo. Use analogias. Mostre o processo visualmente com personagens representando moléculas."
}
```

---

## Performance Esperada

### Stock Images (Pexels)

| Duração | Tempo Total |
|---------|-------------|
| 5 min   | ~2-3 min    |
| 10 min  | ~4-6 min    |
| 15 min  | ~7-10 min   |

### Animações (Remotion)

| Duração | Cenas | Tempo Total |
|---------|-------|-------------|
| 5 min   | 6     | ~8-12 min   |
| 10 min  | 10    | ~15-20 min  |
| 15 min  | 15    | ~25-35 min  |

**Nota:** Animações demoram mais porque:
1. Gemini precisa gerar código para cada cena
2. Remotion renderiza frame-by-frame em alta qualidade
3. FFmpeg faz duas passagens (clips individuais + concatenação)

---

## Assistir Vídeo Gerado

### Linux (VLC)

```bash
vlc /home/eloi/Área\ de\ trabalho/VideoForge/media/videos/a1b2c3d4.mp4
```

### Pelo Frontend

1. Acesse http://localhost:3000
2. Clique no vídeo na lista
3. Player embarcado irá carregar

---

## Próximos Passos

Após confirmar que o sistema funciona:

1. ✅ Testar vídeo de animação curto (5 minutos)
2. ✅ Comparar qualidade: Stock Images vs Animações
3. ✅ Deploy para VPS (quando pronto)
4. ✅ Configurar YouTube OAuth para publicação automática

**Comandos úteis:**
```bash
# Limpar vídeos antigos
rm -rf /home/eloi/Área\ de\ trabalho/VideoForge/media/temp/*
rm -rf /home/eloi/Área\ de\ trabalho/VideoForge/media/videos/*

# Reiniciar backend
pkill -f "node.*server.js"
cd backend && node server.js

# Ver todos os processos VideoForge
ps aux | grep -E "(node|remotion|ffmpeg)" | grep -v grep
```

---

**VideoForge 2.0** 🎨  
*Agora com animações geradas por IA!*
