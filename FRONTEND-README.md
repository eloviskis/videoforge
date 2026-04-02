# 🎬 VideoForge - Frontend

## 🚀 Como Usar

### Iniciar (Desenvolvimento):

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Iniciar (Docker):
```bash
docker compose -f docker-compose.vps.yml up -d frontend
```

### Acessar:
- **Dashboard**: http://localhost (produção) ou http://localhost:3000 (dev)
- **API**: http://localhost:3001/api/health

---

## 📊 Abas do Dashboard

| Aba | Descrição |
|-----|-----------|
| 🎥 **Criar Vídeos** | Modo IA, Manual, Livro/Série, Resenha |
| 📰 **Notícias** | Pipeline RSS → vídeo automático |
| ✂️ **Cortes** | Análise + corte de vídeos longos para Shorts |
| ⭐ **Reviews** | Gerador de resenhas de produtos |
| 📸 **Timeline** | Editor de clipes com múltiplos clips |
| 🧠 **Inteligência** | Vozes, análise de canais, clonagem de voz, gravação |
| 📱 **Social AI** | Automação de conteúdo para redes sociais |
| 📚 **Docs** | Tutoriais interativos de configuração |

---

## 🎬 Tipos de Vídeo Disponíveis

### Gratuitos
- 📸 Imagens Stock (Pexels)
- 🎬 Vídeos Stock (Pexels + Pixabay)
- 🖼️ Imagens IA Grátis (Stable Horde/Pollinations)
- 🎨 Animação de Palitinho (Remotion + Gemini)
- 🖤 Dark Stickman (texto animado, 100% local)
- 🎬 Gemini Veo (Google, grátis com limites)

### Open Source / Local
- 🤖 IA Local (CPU/GPU)
- 🖥️ ComfyUI (seu servidor — Stable Diffusion, Flux, SDXL)

### Pagos — IA Generativa
- 🤖 Replicate / Wan 2.1
- 🎥 Kling AI
- 🧠 Hugging Face
- 🎬 Veo 3 (Google Vertex)
- 🌟 Sora (OpenAI)
- 🎭 D-ID Avatar
- 🎭 HeyGen Avatar

### Pagos — Bancos Premium
- 🎞️ Shutterstock
- 🎥 Storyblocks

---

## 📋 Modos de Criação

### 🤖 Modo IA (Automático)
1. Preencha título, nicho, duração
2. Escolha tipo de vídeo
3. Opcionalmente: ative Preview de Cenas
4. Clique em **"🚀 Criar Vídeo"**

### ✍️ Modo Manual
1. Aba "Roteiro Manual"
2. Cole/escreva seu roteiro (livre ou JSON)
3. Escolha voz e tipo de visual
4. Pode subir mídia customizada por cena

### 📖 Modo Livro/Série
1. Aba "Livro / Série"
2. Nome do livro, autor, capítulo, texto
3. Ideal para séries episódicas

### ⭐ Modo Resenha
1. Aba "Resenha"
2. Produto, categoria, prós/contras, nota
3. Template otimizado para reviews

---

## 👀 Preview de Cenas

1. Marque **"Modo Preview"** antes de criar
2. Após geração: clique em **"Revisar Cenas"**
3. Para cada cena: veja visual, regenere ou troque mídia
4. **"✅ Confirmar e Renderizar"** quando satisfeito

---

## 🎙️ Vozes e Narração

- **Edge TTS**: 200+ vozes neurais em 50+ idiomas (grátis)
- **ElevenLabs**: Vozes premium + clonagem de voz
- **OpenAI TTS**: Vozes naturais
- **Gravação**: Grave pelo microfone do navegador
- **Voz Clonada**: Upload de amostra → voz personalizada

---

## 🧙 Setup Wizard

Botão **"🧙 Configurar"** no dashboard. Guia passo a passo para:
- Kling AI, Replicate, Veo 2, ComfyUI, HeyGen, D-ID, YouTube

---

## 📱 Componentes Principais

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| App | `App.jsx` | App principal (criação, monitoramento) |
| SetupWizard | `SetupWizard.jsx` | Wizard de configuração |
| AdminPanel | `AdminPanel.jsx` | Painel admin |
| MinhaConta | `MinhaConta.jsx` | Conta do usuário |
| SocialAI | `SocialAI.jsx` | Automação social |
| TimelineEditor | `TimelineEditor.jsx` | Editor de clipes |
| AvatarStudio | `AvatarStudio.jsx` | Criador de avatares |
| FeedbackWall | `FeedbackWall.jsx` | Parede de feedback |
| DocsTab | `DocsTab.jsx` | Tutoriais interativos |

---

## 🛠️ Build para Produção

```bash
cd frontend
npm run build
# → Gera dist/ para servir via Nginx
```

O Dockerfile do frontend faz build + serve via Nginx automaticamente.

---

**VideoForge v2.0** 🎬
