# 🎬 VideoForge

**Plataforma SaaS de Automação de Vídeos para YouTube e Redes Sociais**

Produção automatizada de vídeos "dark/faceless", notícias, cortes, resenhas, séries e mais — usando IA generativa, FFmpeg, e múltiplos provedores de vídeo/imagem.

🌐 **Acesse:** [https://videoforge.tech](https://videoforge.tech)

---

## ✨ Funcionalidades

### 🎬 Geração de Vídeos (20+ tipos)

**Gratuitos:**
- 📸 **Imagens Stock** — Pexels (grátis, ilimitado)
- 🎬 **Vídeos Stock** — Pexels + Pixabay (grátis)
- 🖼️ **Imagens IA Grátis** — Stable Horde / Pollinations (grátis, sem API key)
- 🎨 **Animação de Palitinho** — Remotion + Gemini (código gerado por IA)
- 🖤 **Dark Stickman** — Texto animado estilo "dark" (100% local, sem API)
- 🎬 **Gemini Veo** — Google Veo gratuito com limites diários

**Open Source / Local:**
- 🤖 **IA Local** — Modelos open-source (CPU/GPU)
- 🖥️ **ComfyUI** — Seu próprio servidor de IA (Stable Diffusion, Flux, SDXL, etc.)

**Pagos — IA Generativa:**
- 🤖 **Replicate / Wan 2.1** — Vídeos IA (~$0.005-0.02/cena)
- 🎥 **Kling AI** — Vídeos cinematográficos (~$0.01-0.04/cena)
- 🧠 **Hugging Face** — Modelos de vídeo open-source
- 🎬 **Veo 3** — Google Vertex AI (~$0.35/segundo)
- 🌟 **Sora** — OpenAI (requer assinatura)
- 🎭 **D-ID Avatar** — Apresentador animado (~$5.9/mês)
- 🎭 **HeyGen Avatar** — Avatar IA ultra-realista

**Pagos — Bancos Premium:**
- 🎞️ **Shutterstock** — Vídeos profissionais (assinatura)
- 🎥 **Storyblocks** — Vídeos e música ilimitados (assinatura)

### 📋 Modos de Criação
- 🤖 **Modo IA** — Digite um tema e a IA cria tudo (roteiro, narração, visuais)
- ✍️ **Modo Manual** — Envie seu próprio roteiro (com ou sem mídia)
- 📖 **Modo Livro/Série** — Crie séries de vídeos capítulo por capítulo
- ⭐ **Modo Resenha** — Análises de produtos com template otimizado

### 🔍 Preview de Cenas
- 👀 Revise cada cena antes de renderizar
- 🔄 Regenere visuais individuais com um clique
- 🖼️ Troque a mídia de qualquer cena manualmente
- ✅ Confirme e renderize só quando estiver satisfeito

### 🎙️ Narração e Vozes
- 🗣️ **Edge TTS** — 200+ vozes neurais gratuitas em 50+ idiomas
- 🎤 **ElevenLabs** — Vozes ultra-realistas + clonagem de voz
- 🤖 **OpenAI TTS** — Vozes naturais da OpenAI
- 🎙️ **Gravação** — Grave sua própria narração pelo microfone
- 🧬 **Clonagem de Voz** — Clone qualquer voz com amostra de 30s

### 📱 Publicação Multi-Rede
- 📺 **YouTube** — Upload direto com SEO automático (título, descrição, tags)
- 🐦 **Twitter/X** — Publicação automática
- 📘 **Facebook** — Publicação em páginas
- 💼 **LinkedIn** — Compartilhamento profissional
- 🎵 **TikTok** — Publicação direta

### ✂️ Gerador de Cortes (Shorts Maker)
- Análise inteligente de vídeos longos
- Detecção de melhores momentos com IA
- Corte automático para Shorts/Reels (9:16)
- Publicação direta em TikTok, Instagram, YouTube Shorts

### 📰 Pipeline de Notícias
- Coleta RSS automática de múltiplas fontes
- Seleção de notícias relevantes por nicho
- Tom configurável (formal, casual, dramático)
- Renderização e publicação automática

### 📱 Social AI (Automação de Conteúdo)
- Geração automática de posts para redes sociais
- Calendário de conteúdo com IA
- Publicação agendada

### 🧙 Setup Wizard
- Guia passo-a-passo para cada integração paga
- Teste de conexão integrado (ex: ComfyUI)
- Configuração simplificada com dicas visuais

### 🛡️ Painel Admin
- Dashboard com estatísticas (usuários, vídeos, API keys)
- Gestão de usuários (ativar, desativar, alterar plano)
- API Keys globais (fallback para todos os usuários)
- Hotmart webhook manager

### 💳 Monetização
- Integração Hotmart (webhooks automáticos para assinatura/cancelamento/reembolso)
- Sistema de afiliados integrado
- API Keys por usuário (cada assinante configura as suas)

---

## 🚀 Quick Start (VPS / Produção)

### Pré-requisitos

- VPS Linux com Docker e Docker Compose
- Domínio apontando para o IP do servidor (DNS A record)
- Pelo menos 4GB de RAM e 50GB de disco

### Deploy

```bash
# Clone o repositório
git clone https://github.com/eloviskis/videoforge.git
cd videoforge

# Configure as variáveis de ambiente
cp .env.example .env.production
nano .env.production
# → Mínimo: GEMINI_API_KEY, PEXELS_API_KEY, JWT_SECRET

# Inicie os containers
docker compose -f docker-compose.vps.yml up -d

# Verifique se está tudo rodando
docker compose -f docker-compose.vps.yml ps
```

### SSL (HTTPS)

```bash
# Instale o certbot
apt install certbot -y

# Gere o certificado (após DNS apontar para o VPS)
certbot certonly --webroot -w /var/www/certbot \
  -d seudominio.com -d www.seudominio.com \
  --agree-tos -m seu@email.com

# Reinicie o nginx
docker restart videoforge-nginx
```

---

## 🖥️ Desenvolvimento Local

```bash
# Backend
cd backend
npm install
node server.js
# → Roda em http://localhost:3001

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
# → Roda em http://localhost:3000
```

---

## 🏗️ Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│    Nginx     │────▶│   Backend    │
│  React/Vite  │     │  (SSL/Proxy) │     │  Node.js     │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                    ┌──────────────┐     ┌──────┴───────┐
                    │ Python Worker│     │  PostgreSQL   │
                    │ (FFmpeg/IA)  │     │  (Dados)      │
                    └──────────────┘     └──────────────┘
```

### Containers Docker

| Container | Descrição | Porta |
|-----------|-----------|-------|
| **nginx** | Proxy reverso + SSL | 80, 443 |
| **frontend** | React SPA (Vite build) | interna |
| **backend** | API Node.js + Express | 3001 (interna) |
| **postgres** | Banco de dados | 5432 (interna) |
| **python-worker** | Renderização FFmpeg + Animações | interna |

---

## 📂 Estrutura do Projeto

```
VideoForge/
├── backend/
│   ├── server.js              # API principal (~8000+ linhas)
│   ├── auth.js                # Autenticação JWT + middleware
│   ├── admin.js               # Painel admin (users, settings, API keys)
│   ├── hotmart.js             # Webhook Hotmart (assinaturas)
│   ├── user-settings.js       # API keys por usuário (ComfyUI, Kling, etc.)
│   ├── voice-library.js       # Clonagem de voz (ElevenLabs)
│   ├── social-ai.js           # Automação de conteúdo social
│   ├── social-oauth.js        # OAuth (YouTube, Twitter, Facebook, etc.)
│   ├── talking-photo.js       # Avatar/foto falante (D-ID, HeyGen)
│   ├── avatar.js              # Geração de avatares
│   ├── timeline.js            # Editor de clipes/timeline
│   ├── feedback.js            # Sistema de feedback
│   ├── roteiro-offline-dark.js# Gerador dark stories (100% offline)
│   └── news/                  # Pipeline de notícias (RSS + render)
│       ├── collector.js       # Coletor RSS
│       ├── pipeline.js        # Pipeline de geração
│       ├── renderer.js        # Renderizador de vídeos notícia
│       └── db.js              # Queries do banco (news)
│
├── frontend/src/
│   ├── App.jsx                # App principal (criação, monitoramento, publicação)
│   ├── SetupWizard.jsx        # Wizard de configuração de integrações pagas
│   ├── AdminPanel.jsx         # Painel admin
│   ├── MinhaConta.jsx         # Conta do usuário (API keys, redes sociais)
│   ├── AuthWrapper.jsx        # Auth flow (landing → login → app)
│   ├── SocialAI.jsx           # Automação de redes sociais
│   ├── AvatarStudio.jsx       # Criador de avatares
│   ├── TalkingPhoto.jsx       # Foto falante
│   ├── TimelineEditor.jsx     # Editor de clipes
│   ├── DocsTab.jsx            # Tutoriais interativos
│   └── FeedbackWall.jsx       # Parede de feedback
│
├── database/init/
│   ├── 02-create-videoforge-schema.sql    # Schema principal
│   ├── 03-create-news-schema.sql          # Pipeline de notícias
│   ├── 04-create-users-schema.sql         # Usuários
│   ├── 05-create-settings-schema.sql      # Configurações
│   ├── 06-create-webhook-logs.sql         # Logs Hotmart
│   ├── 07-create-user-apikeys.sql         # Chaves por usuário
│   └── 09-create-social-ai-schema.sql     # Social AI
│
├── python-worker/             # FFmpeg + animações + IA local
│   ├── animate_image.py       # Animações de imagens
│   ├── create_dark_scene.py   # Cenas dark (texto animado)
│   ├── draw_stickman_scene.py # Animações de palitinho
│   └── generate_stickman_image.py
│
├── remotion-animations/       # Animações React (Remotion)
├── ai-worker/                 # Worker IA (generate_video.py)
├── nginx/                     # Configs Nginx (proxy, SSL)
├── landing/                   # Landing page (Next.js)
├── desktop/                   # App Desktop (Electron)
├── docker-compose.yml         # Dev local
└── docker-compose.vps.yml     # Produção (VPS)
```

---

## 🔑 APIs e Integrações

### Gratuitas (obrigatórias para começar)
| API | Uso | Link |
|-----|-----|------|
| **Google Gemini** | Roteiros, legendas, análise, geração de código | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **Pexels** | Imagens e vídeos de fundo | [pexels.com/api](https://www.pexels.com/api/) |
| **Edge TTS** | Narração (200+ vozes, 50+ idiomas) | Automático, sem chave |

### Opcionais — IA e Mídia
| API | Uso | Custo |
|-----|-----|-------|
| **OpenAI** | Roteiros + DALL-E 3 + TTS + Whisper | Pago |
| **ElevenLabs** | Vozes ultra-realistas + clonagem | Freemium |
| **Replicate** | Vídeos IA (Wan 2.1 / Flux.1) | Pay-per-use |
| **Kling AI** | Vídeos cinematográficos | Pago |
| **HuggingFace** | Modelos open-source | Freemium |
| **D-ID** | Avatar apresentador | Pago |
| **HeyGen** | Avatar IA ultra-realista | Pago |
| **ComfyUI** | Seu próprio servidor IA | Seu hardware |
| **Pixabay** | Músicas e vídeos de fundo | Grátis |
| **Shutterstock** | Vídeos profissionais | Assinatura |
| **Storyblocks** | Vídeos e música ilimitados | Assinatura |
| **OpenRouter** | Gateway multi-modelo IA | Pay-per-use |

### Redes Sociais (OAuth)
| Rede | Funcionalidade |
|------|---------------|
| **YouTube** | Upload, SEO automático, análise de canal |
| **Twitter/X** | Publicação automática |
| **Facebook** | Publicação em páginas |
| **LinkedIn** | Compartilhamento profissional |
| **TikTok** | Publicação direta |

> 💡 Cada usuário configura suas próprias chaves em **⚙️ Minha Conta → Minhas API Keys**. O Setup Wizard guia passo a passo.

---

## 👤 Fluxo do Usuário

1. **Landing page** → Vê preços e funcionalidades
2. **Assina via Hotmart** → Webhook cria a conta automaticamente
3. **Login** → Acessa o painel principal
4. **🧙 Setup Wizard** → Guia passo a passo para configurar integrações
5. **⚙️ Minha Conta** → API keys pessoais + conectar redes sociais
6. **Cria vídeos** → Escolhe modo (IA/Manual/Livro/Resenha) + tipo de visual
7. **👀 Revisa cenas** → Preview de visuais antes de renderizar (opcional)
8. **Publica** → Envia para YouTube, Twitter, TikTok, etc.

---

## 🛡️ Painel Admin

Acesse clicando em **🛡️ Admin** na barra superior (apenas `is_admin=true`).

- **📊 Dashboard** — Estatísticas de usuários, vídeos, API keys configuradas
- **👥 Usuários** — CRUD completo, alterar plano, ativar/desativar
- **⚙️ Configurações** — Settings globais da plataforma
- **🔑 API Keys** — Chaves globais (fallback para todos os usuários)
- **🔥 Hotmart** — Setup wizard, webhook logs, teste de webhook

---

## 🛠️ Comandos Úteis

```bash
# Ver logs
docker logs videoforge-backend --tail 50
docker logs videoforge-nginx --tail 20

# Reiniciar um container
docker restart videoforge-backend

# Rebuild e redeploy (backend + frontend)
docker compose -f docker-compose.vps.yml build --no-cache backend frontend
docker compose -f docker-compose.vps.yml up -d --force-recreate backend frontend

# Executar migração SQL
docker exec -i videoforge-postgres psql -U videoforge -d videoforge < database/init/09-create-social-ai-schema.sql

# Backup do banco
docker exec videoforge-postgres pg_dump -U videoforge videoforge > backup_$(date +%Y%m%d).sql

# Shell no container
docker exec -it videoforge-backend sh
docker exec -it videoforge-postgres psql -U videoforge -d videoforge
```

---

## 🔧 Variáveis de Ambiente

```env
# ── Obrigatórias ──
GEMINI_API_KEY=           # Google Gemini (grátis)
PEXELS_API_KEY=           # Pexels imagens (grátis)
JWT_SECRET=               # Segredo para tokens JWT

# ── Banco de dados ──
POSTGRES_USER=videoforge
POSTGRES_PASSWORD=videoforge
POSTGRES_DB=videoforge

# ── Opcionais (IA) ──
OPENAI_API_KEY=           # GPT + DALL-E + TTS
OPENROUTER_API_KEY=       # Gateway multi-modelo
ELEVENLABS_API_KEY=       # TTS premium + clonagem
HUGGINGFACE_API_TOKEN=    # Modelos open-source
REPLICATE_API_TOKEN=      # Replicate (Wan 2.1 / Flux.1)
KLING_ACCESS_KEY_ID=      # Kling AI
KLING_ACCESS_KEY_SECRET=
DID_API_KEY=              # D-ID Avatar
HEYGEN_API_KEY=           # HeyGen Avatar

# ── ComfyUI (por usuário) ──
# Configurado individualmente em Minha Conta → API Keys

# ── YouTube ──
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# ── Redes Sociais ──
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# ── Hotmart (monetização) ──
HOTMART_HOTTOK=           # Token do webhook
```

---

## 📈 Roadmap

- [x] Infraestrutura Docker + PostgreSQL
- [x] Backend API completo (Node.js)
- [x] Frontend React (Vite)
- [x] 20+ tipos de geração de vídeo
- [x] Pipeline de notícias (RSS → vídeo)
- [x] Cortes/Shorts Maker
- [x] Sistema de autenticação (JWT)
- [x] Integração Hotmart (SaaS)
- [x] Painel Admin completo
- [x] API Keys por usuário
- [x] Redes sociais (YouTube, Twitter, Facebook, LinkedIn, TikTok)
- [x] HTTPS + domínio (videoforge.tech)
- [x] App Desktop (Electron)
- [x] Clonagem de voz (ElevenLabs)
- [x] Preview de cenas antes de renderizar
- [x] ComfyUI (servidor IA do usuário)
- [x] Setup Wizard guiado
- [x] Social AI (automação de conteúdo)
- [x] Avatar/Foto falante (D-ID + HeyGen)
- [x] Modo manual (roteiro próprio)
- [x] Modo livro/série (capítulos)
- [x] Modo resenha (produtos)
- [ ] Publicação automática agendada
- [ ] App mobile (React Native)

---

**VideoForge v2.0** — [videoforge.tech](https://videoforge.tech) — Abril 2026

---

## 🔧 Variáveis de Ambiente

```env
# ── Obrigatórias ──
GEMINI_API_KEY=           # Google Gemini (grátis)
PEXELS_API_KEY=           # Pexels imagens (grátis)
JWT_SECRET=               # Segredo para tokens JWT

# ── Banco de dados ──
POSTGRES_USER=videoforge
POSTGRES_PASSWORD=videoforge
POSTGRES_DB=videoforge

# ── Opcionais (IA) ──
OPENAI_API_KEY=           # GPT + DALL-E + TTS
OPENROUTER_API_KEY=       # Gateway multi-modelo
ELEVENLABS_API_KEY=       # TTS premium
HUGGINGFACE_API_TOKEN=    # Modelos open-source
REPLICATE_API_TOKEN=      # Replicate (Wan 2.1)
KLING_ACCESS_KEY_ID=      # Kling AI
KLING_ACCESS_KEY_SECRET=
DID_API_KEY=              # D-ID Avatar

# ── YouTube ──
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# ── Redes Sociais ──
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# ── Hotmart (monetização) ──
HOTMART_HOTTOK=           # Token de segurança do webhook
```

---

## 📈 Roadmap

- [x] Infraestrutura Docker + PostgreSQL
- [x] Backend API completo (Node.js)
- [x] Frontend React (Vite)
- [x] Geração de vídeos (múltiplos modos)
- [x] Slideshow de notícias
- [x] Sistema de autenticação (JWT)
- [x] Integração Hotmart (SaaS)
- [x] Painel Admin completo
- [x] API Keys por usuário (Minha Conta)
- [x] Redes sociais por usuário
- [x] HTTPS + domínio (videoforge.tech)
- [x] App Desktop (Electron)
- [ ] Publicação automática agendada
- [ ] Analytics de desempenho dos vídeos
- [ ] App mobile (React Native)

---

**VideoForge v1.1** — [videoforge.tech](https://videoforge.tech) — Março 2026
