# 🎬 VideoForge

**Plataforma SaaS de Automação de Vídeos para YouTube e Redes Sociais**

Produção automatizada de vídeos "dark/faceless", notícias, cortes e mais — usando IA generativa, FFmpeg, e múltiplos provedores de vídeo.

🌐 **Acesse:** [https://videoforge.tech](https://videoforge.tech)

---

## ✨ Funcionalidades

- 🎬 **Geração de vídeos** — Roteiros automáticos via Gemini/OpenAI, narração (Edge TTS / ElevenLabs / OpenAI), imagens de fundo (Pexels/Pixabay/HuggingFace)
- 🎥 **Múltiplos modos de vídeo** — Stock Images (grátis), Stick Animation, Replicate (Wan 2.1), Kling AI, HuggingFace, D-ID Avatar
- 📰 **Slideshow de notícias** — Coleta automática de notícias por nicho e gera vídeos no formato slideshow
- ✂️ **Gerador de cortes** — Corta vídeos longos em clipes para shorts/reels
- 📱 **Publicação em redes sociais** — YouTube, Twitter/X, Facebook, LinkedIn, TikTok, Instagram
- 🔑 **API keys por usuário** — Cada assinante configura suas próprias chaves de API
- 🛡️ **Painel Admin** — Dashboard, gestão de usuários, API keys globais, Hotmart facilitator
- 💳 **Monetização via Hotmart** — Webhooks automáticos para assinatura, cancelamento e reembolso
- 📥 **App Desktop** — Versão Windows (.exe) com backend integrado
- 🔒 **HTTPS + SSL** — Certificado Let's Encrypt com renovação automática

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
# Instale o certbot (se não tiver)
apt install certbot -y

# Crie os diretórios
mkdir -p /var/www/certbot

# Gere o certificado (após DNS apontar para o VPS)
certbot certonly --webroot -w /var/www/certbot \
  -d seudominio.com -d www.seudominio.com \
  --agree-tos -m seu@email.com

# Reinicie o nginx para carregar o certificado
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
| **python-worker** | Renderização FFmpeg | interna |
| **n8n** | Automação de workflows | 5678 (interna) |

---

## 📂 Estrutura do Projeto

```
VideoForge/
├── backend/
│   ├── server.js              # API principal (~5900 linhas)
│   ├── auth.js                # Autenticação JWT + middleware
│   ├── admin.js               # Painel admin (users, settings, API keys)
│   ├── hotmart.js             # Webhook Hotmart (assinaturas)
│   ├── user-settings.js       # API keys e redes sociais por usuário
│   └── news/                  # Módulo de notícias (coleta + renderização)
│
├── frontend/src/
│   ├── App.jsx                # App principal (vídeos, notícias, cortes, tutoriais)
│   ├── AuthWrapper.jsx        # Auth flow (landing → login → app/admin/settings)
│   ├── LoginPage.jsx          # Login/registro com glassmorphism
│   ├── LandingPage.jsx        # Landing page com preços dinâmicos
│   ├── AdminPanel.jsx         # Painel admin (dashboard, users, config, keys, Hotmart)
│   ├── MinhaConta.jsx         # Painel do usuário (API keys pessoais, redes sociais)
│   └── DocsTab.jsx            # Tutoriais de configuração de APIs
│
├── database/init/
│   ├── 01-create-n8n-db.sql
│   ├── 02-create-videoforge-schema.sql
│   ├── 03-create-news-schema.sql
│   ├── 04-create-users-schema.sql
│   ├── 05-create-settings-schema.sql
│   ├── 06-create-webhook-logs.sql
│   └── 07-create-user-apikeys.sql
│
├── nginx/
│   └── nginx.vps.conf         # Nginx config (HTTP→HTTPS, proxy, SSL)
│
├── python-worker/             # FFmpeg + scripts de renderização
├── media/                     # Vídeos, áudios, imagens gerados
├── docker-compose.yml         # Desenvolvimento local
└── docker-compose.vps.yml     # Produção (VPS)
```

---

## 🔑 APIs Suportadas

### Gratuitas (obrigatórias para começar)
| API | Uso | Link |
|-----|-----|------|
| **Google Gemini** | Roteiros, legendas, análise | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **Pexels** | Imagens de fundo | [pexels.com/api](https://www.pexels.com/api/) |
| **Edge TTS** | Narração (padrão) | Automático, sem chave |

### Opcionais (melhoram o resultado)
| API | Uso | Custo |
|-----|-----|-------|
| **OpenAI** | Roteiros avançados + DALL-E | Pago |
| **ElevenLabs** | Vozes ultra-realistas | Freemium |
| **Replicate** | Vídeos IA (Wan 2.1) | Pay-per-use |
| **Kling AI** | Vídeos cinematográficos | Pago |
| **HuggingFace** | Modelos open-source | Freemium |
| **D-ID** | Avatar apresentador | Pago |
| **Pixabay** | Músicas de fundo | Grátis |

> 💡 Cada usuário configura suas próprias chaves em **⚙️ Minha Conta → Minhas API Keys**

---

## 👤 Fluxo do Usuário

1. **Landing page** → Vê preços e funcionalidades
2. **Assina via Hotmart** → Webhook cria a conta automaticamente
3. **Login** → Acessa o painel principal
4. **⚙️ Minha Conta** → Configura suas API keys e conecta redes sociais
5. **Cria vídeos** → Escolhe modo, tema, e gera
6. **Publica** → Envia para YouTube, Twitter, etc.

---

## 🛡️ Painel Admin

Acesse clicando em **🛡️ Admin** na barra superior (apenas `is_admin=true`).

- **📊 Dashboard** — Estatísticas de usuários, vídeos, API keys configuradas
- **👥 Usuários** — CRUD completo, alterar plano, ativar/desativar
- **⚙️ Configurações** — Settings globais da plataforma
- **🔑 API Keys** — Chaves globais (fallback para todos os usuários)
- **🔥 Hotmart** — Setup wizard, webhook logs, teste de webhook, checkout URLs

---

## 🛠️ Comandos Úteis

```bash
# Ver logs
docker logs videoforge-backend --tail 50
docker logs videoforge-nginx --tail 20

# Reiniciar um container
docker restart videoforge-backend

# Rebuild e redeploy
docker compose -f docker-compose.vps.yml up -d --build backend frontend
docker restart videoforge-nginx

# Executar migração SQL
docker exec -i videoforge-postgres psql -U videoforge -d videoforge < database/init/07-create-user-apikeys.sql

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
