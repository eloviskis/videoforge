# 🎬 VideoForge - Guia Completo de Configuração

## 🚀 Sistema 100% Funcional!

O VideoForge é uma plataforma completa de automação de vídeos com 20+ tipos de geração:
- ✅ Gerar roteiros com Gemini AI (ou roteiro manual/livro/resenha)
- ✅ Criar narração com Edge TTS (200+ vozes), ElevenLabs, OpenAI ou voz clonada
- ✅ Buscar visuais: Pexels, Pixabay, Shutterstock, Storyblocks, IA generativa
- ✅ Gerar imagens/vídeos com IA: ComfyUI, Replicate, Kling, Veo, Sora, DALL-E
- ✅ Preview de cenas antes de renderizar
- ✅ Renderizar vídeos com FFmpeg
- ✅ Publicar em YouTube, Twitter/X, Facebook, LinkedIn, TikTok
- ✅ Pipeline de notícias (RSS automático)
- ✅ Gerador de cortes (Shorts/Reels)
- ✅ Avatar/Foto falante (D-ID, HeyGen)

---

## 📝 Configuração Passo a Passo

### 1️⃣ APIs Gratuitas (OBRIGATÓRIAS — 5 minutos)

#### **Google Gemini API** (Obrigatório — Grátis)
1. Acesse: https://aistudio.google.com/apikey
2. Faça login com sua conta Google
3. Clique em "Get API Key" → "Create API Key"
4. Copie a chave gerada

#### **Pexels API** (Recomendado — Grátis)
1. Acesse: https://www.pexels.com/api/
2. Clique em "Get Started"
3. Preencha o cadastro gratuito
4. Copie a API Key do dashboard

> 💡 Com apenas essas duas chaves você já pode criar vídeos com imagens stock, stickman e dark stickman!

---

### 2️⃣ APIs Opcionais (melhoram o resultado)

#### **ElevenLabs** (Vozes premium + Clonagem — Freemium)
1. Acesse: https://elevenlabs.io
2. Crie sua conta
3. Vá em Profile → API Key
4. Copie a API Key
5. No VideoForge: ⚙️ Minha Conta → Minhas API Keys → ELEVENLABS_API_KEY

#### **OpenAI** (GPT + DALL-E 3 + TTS — Pago)
1. Acesse: https://platform.openai.com/api-keys
2. Crie uma API Key
3. Configure créditos de uso
4. No VideoForge: ⚙️ Minha Conta → Minhas API Keys → OPENAI_API_KEY

#### **Replicate** (Wan 2.1 / Flux.1 — Pay-per-use)
1. Acesse: https://replicate.com
2. Crie conta → Settings → API Tokens
3. Copie o token
4. No VideoForge: ⚙️ Minha Conta → Minhas API Keys → REPLICATE_API_TOKEN
5. Ou use o **🧙 Setup Wizard** para configuração guiada!

#### **Kling AI** (Vídeos cinematográficos — Pago)
1. Acesse: https://klingai.com
2. Crie conta → API Settings
3. Copie Access Key ID e Secret
4. No VideoForge: ⚙️ Minha Conta → Minhas API Keys → KLING_ACCESS_KEY_ID + SECRET
5. Ou use o **🧙 Setup Wizard**!

#### **ComfyUI** (Seu próprio servidor IA — Seu hardware)
1. Instale ComfyUI no seu PC/servidor com GPU: https://github.com/comfyanonymous/ComfyUI
2. Baixe um modelo (ex: DreamShaper, SDXL, Flux)
3. Inicie com `--listen 0.0.0.0` para acesso remoto
4. No VideoForge: use o **🧙 Setup Wizard → ComfyUI** (5 passos guiados com teste de conexão)
5. Configure a URL (ex: `http://seu-ip:8188`)

#### **D-ID** (Avatar apresentador — Pago)
1. Acesse: https://studio.d-id.com
2. Crie conta → Settings → API Key
3. No VideoForge: ⚙️ Minha Conta → Minhas API Keys → DID_API_KEY

#### **HeyGen** (Avatar IA realista — Pago)
1. Acesse: https://heygen.com
2. Crie conta → API Settings
3. Copie API Key + Avatar ID
4. No VideoForge: ⚙️ Minha Conta → Minhas API Keys

#### **Pixabay** (Músicas de fundo — Grátis)
1. Acesse: https://pixabay.com/api/docs/
2. Cadastre-se e obtenha a key
3. No VideoForge: ⚙️ Minha Conta → Minhas API Keys → PIXABAY_API_KEY

---

### 3️⃣ YouTube e Redes Sociais

#### **YouTube API** (Para publicação automática)

##### Criar Projeto no Google Cloud
1. Acesse: https://console.cloud.google.com/
2. Clique em "Select a project" → "New Project" → Nome: `VideoForge`
3. No menu lateral: "APIs & Services" → "Library"
4. Busque "YouTube Data API v3" → "Enable"

##### Criar Credenciais OAuth 2.0
1. Vá em "APIs & Services" → "Credentials"
2. "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Configure a "OAuth consent screen" (External, adicione seu email como test user)
4. Application type: **Web application**
5. Authorized redirect URIs: `https://seudominio.com/api/youtube/callback`
6. Copie **Client ID** e **Client Secret**

##### Conectar no VideoForge
1. No app: ⚙️ Minha Conta → Redes Sociais → YouTube → Conectar
2. Autorize pelo Google OAuth
3. Pronto! Pode publicar no YouTube direto do VideoForge

#### **Outras Redes (Twitter, Facebook, LinkedIn, TikTok)**
1. No app: ⚙️ Minha Conta → Redes Sociais
2. Clique "Conectar" na rede desejada
3. Autorize pelo OAuth

> ⚠️ Para cada rede, é necessário ter os Client ID/Secret configurados como variáveis de ambiente no backend.

---

### 4️⃣ Configurar o Backend

```bash
# Clone e configure
cd videoforge/backend
cp .env.example .env
nano .env
```

```env
# Mínimo para funcionar:
GEMINI_API_KEY=AIzaSy...
PEXELS_API_KEY=sua_chave_pexels
JWT_SECRET=um_segredo_forte_aqui

# YouTube (se quiser publicar):
YOUTUBE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-abc123
YOUTUBE_REDIRECT_URI=https://seudominio.com/api/youtube/callback
```

---

### 5️⃣ Iniciar o Sistema

#### Docker (Produção)
```bash
docker compose -f docker-compose.vps.yml up -d
```

#### Manual (Desenvolvimento)
```bash
# Terminal 1 - Backend
cd backend && npm install && node server.js

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

---

## 🎬 Como Usar

### Modo IA (Automático)
1. Acesse o dashboard
2. Preencha: título, nicho, duração
3. Escolha o tipo de vídeo (Stock, Animação, Replicate, Kling, ComfyUI, etc.)
4. Opcionalmente: marque **"Preview de Cenas"** para revisar antes de renderizar
5. Clique em **"🚀 Criar Vídeo"**

### Modo Manual (Roteiro Próprio)
1. Clique na aba **"✍️ Roteiro Manual"**
2. Cole ou escreva seu roteiro
3. Escolha voz, tipo de visual
4. Cada cena pode ter mídia customizada
5. Clique em **"Gerar com Roteiro Manual"**

### Modo Livro/Série
1. Clique na aba **"📖 Livro / Série"**
2. Preencha: nome do livro, autor, capítulo, texto
3. Ideal para criar séries de vídeos episódicos

### Modo Resenha
1. Clique na aba **"⭐ Resenha"**
2. Preencha: produto, categoria, pontos positivos/negativos, nota
3. Template otimizado para reviews de produtos

### Preview de Cenas
1. Marque **"👀 Modo Preview"** antes de criar o vídeo
2. Quando as cenas forem geradas, clique em **"Revisar Cenas"**
3. Para cada cena: veja o visual, regenere ou troque a mídia
4. Quando satisfeito: **"✅ Confirmar e Renderizar"**

### Publicação Multi-Rede
1. Após o vídeo ficar pronto, clique em **"📺 Publicar"**
2. Escolha as redes: YouTube, Twitter, Facebook, LinkedIn, TikTok
3. O SEO (título, descrição, tags) é gerado automaticamente para YouTube

---

## 📊 Pipeline Automático

```
1. 🤖 Gera roteiro completo com Gemini
   ├─ Título otimizado para YouTube
   ├─ Descrição com keywords  
   ├─ Tags relevantes
   └─ Divisão em cenas com timing e prompts visuais

2. 🎙️ Cria narração profissional
   ├─ Edge TTS (200+ vozes gratuitas em 50+ idiomas)
   ├─ ElevenLabs (vozes premium/clonadas)
   ├─ OpenAI TTS (vozes naturais)
   └─ Ou sua gravação pelo microfone

3. 🖼️ Busca/gera material visual
   ├─ Pexels/Pixabay (stock grátis)
   ├─ ComfyUI (seu servidor IA)
   ├─ Replicate/Kling/Veo (IA generativa paga)
   ├─ DALL-E / Flux.1 (imagens IA)
   └─ Animações de palitinho (Remotion)

4. 👀 Preview de cenas (opcional)
   ├─ Revisão visual antes de renderizar
   ├─ Regenerar/trocar cenas individualmente
   └─ Confirmar quando satisfeito

5. 🎬 Renderiza vídeo completo
   ├─ Efeito Ken Burns (zoom suave)
   ├─ Transições profissionais
   ├─ Legendas sincronizadas
   └─ Sincronização perfeita com áudio

6. 📺 Publica nas redes sociais
   ├─ YouTube (com SEO automático)
   ├─ Twitter/X, Facebook, LinkedIn, TikTok
   └─ Ou download local
```

---

## 🧙 Setup Wizard

O Setup Wizard (acessível pelo botão **"🧙 Configurar"**) guia o usuário passo a passo para configurar integrações pagas:

| Integração | Passos | Destaque |
|-----------|--------|----------|
| **Kling AI** | Criar conta → Gerar keys → Colar no VideoForge | Vídeos cinematográficos |
| **Replicate** | Criar conta → Copiar token → Colar | Wan 2.1 / Flux.1 |
| **Veo 2** | Google Cloud → Ativar Vertex AI → OAuth | Vídeos Google |
| **ComfyUI** | Instalar → Baixar modelo → Configurar URL → Testar conexão | Seu servidor, sem custo |
| **HeyGen** | Criar conta → API Key → Avatar ID | Avatar realista |
| **D-ID** | Criar conta → API Key → URL do avatar | Apresentador animado |
| **YouTube** | Google Cloud Console → OAuth → Conectar canal | Publicação automática |

---

## 🔧 Resolução de Problemas

### "Gemini API Key não configurada"
- Verifique se a chave está no `.env` ou em Minha Conta → API Keys
- Sem espaços ou aspas extras
- Reinicie o backend

### "YouTube não autenticado"
- Minha Conta → Redes Sociais → Conectar YouTube
- Certifique-se de ter adicionado seu email como "Test user" no Google Cloud Console
- URL de redirect deve corresponder ao seu domínio

### Erro ao renderizar vídeo
- Verifique se o Docker está rodando: `docker compose ps`
- Veja os logs: `docker logs videoforge-backend --tail 50`
- Reinicie: `docker restart videoforge-backend`

### ComfyUI não conecta
- Confirme que o ComfyUI está rodando com `--listen 0.0.0.0`
- Teste a URL manualmente: `curl http://seu-ip:8188/system_stats`
- Use o botão "🔌 Testar" no Setup Wizard

### Vídeo travado em "gerando visuais"
- APIs externas podem demorar (Replicate: até 5min, Kling: até 10min)
- Verifique saldo/créditos da API
- Veja logs: `docker logs videoforge-backend --tail 100`

---

## 💡 Dicas

- Use o **🧙 Setup Wizard** para configurar integrações — é mais fácil que editar .env
- Ative o **Preview de Cenas** para vídeos importantes — permite corrigir antes de renderizar
- **ComfyUI** é a opção mais econômica para geração IA — use seu próprio hardware
- Vídeos são salvos em `/media/videos/`, roteiros em `/media/roteiros/`
- Use descrições detalhadas no campo "Detalhes adicionais" para melhores resultados
- O Gemini gera roteiros criativos e otimizados para YouTube automaticamente

---

**🎉 VideoForge v2.0 — Plataforma completa de automação de vídeos com 20+ tipos de geração!**
