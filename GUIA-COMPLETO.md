# 🎬 VideoForge - Guia Completo de Configuração

## 🚀 Sistema 100% Funcional!

Agora o VideoForge está completamente integrado e pronto para:
- ✅ Gerar roteiros com Gemini AI
- ✅ Criar narração com Edge TTS  
- ✅ Buscar imagens com Pexels
- ✅ Renderizar vídeos com FFmpeg
- ✅ **Publicar automaticamente no YouTube**

---

## 📝 Configuração Passo a Passo

### 1️⃣ Obter API Keys (5-10 minutos)

#### **Google Gemini API** (Obrigatório)
1. Acesse: https://aistudio.google.com/apikey
2. Faça login com sua conta Google
3. Clique em "Get API Key" → "Create API Key"
4. Copie a chave gerada

#### **Pexels API** (Opcional mas recomendado)
1. Acesse: https://www.pexels.com/api/
2. Clique em "Get Started"
3. Preencha o cadastro gratuito
4. Copie a API Key do dashboard

#### **YouTube API** (Para publicação automática)

##### Passo 1: Criar Projeto no Google Cloud
1. Acesse: https://console.cloud.google.com/
2. Clique em "Select a project" → "New Project"
3. Nome: `VideoForge`
4. Clique em "Create"

##### Passo 2: Ativar YouTube Data API v3
1. No menu lateral, vá em "APIs & Services" → "Library"
2. Busque por "YouTube Data API v3"
3. Clique em "Enable"

##### Passo 3: Criar Credenciais OAuth 2.0
1. Vá em "APIs & Services" → "Credentials"
2. Clique em "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Se pedir, configure a "OAuth consent screen":
   - User Type: **External**
   - App name: `VideoForge`
   - User support email: seu email
   - Developer contact: seu email
   - Clique em "Save and Continue" até o final
   - Em "Test users", adicione seu email
4. Volte para "Credentials" → "Create OAuth client ID"
5. Application type: **Web application**
6. Name: `VideoForge Web Client`
7. Authorized redirect URIs: `http://localhost:3001/api/youtube/callback`
8. Clique em "Create"
9. **Copie o Client ID e Client Secret**

---

### 2️⃣ Configurar o Backend

1. Copie o arquivo de exemplo:
```bash
cd backend
cp .env.example .env
```

2. Edite o arquivo `.env`:
```bash
nano .env
# ou
code .env
```

3. Cole suas chaves:
```env
# Google Gemini API (obrigatório)
GEMINI_API_KEY=AIzaSy... (sua chave aqui)

# Pexels API (opcional)
PEXELS_API_KEY=sua_chave_pexels

# YouTube API (para publicação automática)
YOUTUBE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-abc123
YOUTUBE_REDIRECT_URI=http://localhost:3001/api/youtube/callback

# Configurações gerais
PORT=3001
N8N_URL=http://localhost:5678
```

4. Instale as novas dependências:
```bash
cd backend
npm install
```

---

### 3️⃣ Iniciar o Sistema

#### Opção 1: Usar o script automático
```bash
cd /home/eloi/Área\ de\ trabalho/VideoForge
./start.sh
```

#### Opção 2: Manual

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

### 4️⃣ Conectar o YouTube (só precisa fazer 1 vez)

1. Acesse http://localhost:3000
2. Clique em **"⚙️ Configurações"**
3. Se o YouTube estiver configurado, aparecerá o botão **"Conectar YouTube"**
4. Clique nele - abrirá uma janela de autenticação do Google
5. Escolha sua conta do YouTube
6. Aceite as permissões solicitadas
7. Pronto! Agora pode publicar automaticamente

---

## 🎬 Como Usar

### Criar um Vídeo Simples (sem publicação)

1. Acesse http://localhost:3000
2. Preencha:
   - **O que criar**: "10 curiosidades sobre o espaço"
   - **Nicho**: Curiosidades
   - **Duração**: 10 minutos
3. Clique em **"🚀 Criar Vídeo Automaticamente"**
4. Acompanhe o progresso em tempo real!

### Criar e Publicar no YouTube

1. Siga os mesmos passos acima
2. **Marque** a opção: ☑️ Publicar automaticamente no YouTube
3. Clique em **"🚀 Criar Vídeo Automaticamente"**
4. O vídeo será criado E publicado no seu canal!

---

## 📊 O que o Sistema Faz Automaticamente

```
1. 🤖 Gera roteiro completo com Gemini
   ├─ Título otimizado para YouTube
   ├─ Descrição com keywords
   ├─ Tags relevantes
   └─ Divisão em cenas com timing

2. 🎙️ Cria narração profissional
   └─ Edge TTS com voz natural em PT-BR

3. 🖼️ Busca material visual
   ├─ Imagens HD do Pexels
   └─ Baseado nas descrições do roteiro

4. 🎬 Renderiza vídeo completo
   ├─ Efeito Ken Burns (zoom suave)
   ├─ Transições profissionais
   └─ Sincronização perfeita com áudio

5. 📺 Publica no YouTube (se habilitado)
   ├─ Upload do vídeo
   ├─ Define metadados
   └─ Configura como privado/público
```

---

## ⚙️ Status do Sistema

Após configurar, você verá no dashboard:

- ✅ **Gemini**: Configurado e pronto!
- ✅ **Pexels**: Configurado e pronto!
- ✅ **YouTube**: Conectado e pronto para publicar!

---

## 🔧 Resolução de Problemas

### "Gemini API Key não configurada"
- Verifique se a chave está no arquivo `backend/.env`
- Certifique-se de que não tem espaços ou aspas extras
- Reinicie o backend

### "YouTube não autenticado"
- Clique em "Configurações" → "Conectar YouTube"
- Certifique-se de que adicionou seu email como "Test user" no Google Cloud Console
- Verifique se a URL de redirect está correta

### Erro ao renderizar vídeo
- Certifique-se de que o Docker está rodando
- Verifique se o python-worker está ativo: `docker compose ps`
- Reinicie o container: `docker compose restart python-worker`

---

## 🎯 Próximos Passos

Agora que está tudo funcionando:

1. **Teste com um vídeo simples** primeiro
2. **Ajuste os prompts** no código se quiser resultados diferentes
3. **Configure thumbnails** personalizadas (futuro)
4. **Adicione músicas de fundo** (futuro)
5. **Agende publicações** para horários específicos (futuro)

---

## 📱 URLs Úteis

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001/api/health
- **n8n**: http://localhost:5678
- **pgAdmin**: http://localhost:5050

---

## 💡 Dicas

- Use descrições detalhadas no campo "Detalhes adicionais" para melhores resultados
- O Gemini gera roteiros criativos e otimizados para YouTube
- Vídeos são salvos em `/media/videos/`
- Os roteiros ficam em `/media/roteiros/`

---

**🎉 Parabéns! Você tem um sistema completo de automação de vídeos para YouTube!**
