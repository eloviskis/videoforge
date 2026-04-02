# ⚡ VideoForge - Início Rápido

**Tempo estimado: 10-15 minutos**

---

## ✅ Checklist Pré-Instalação

- [ ] Docker e Docker Compose instalados
- [ ] Pelo menos 4GB de RAM livre
- [ ] 50GB de espaço em disco
- [ ] Conexão à internet estável

> 💡 **Windows?** Use o Docker Desktop. Veja [INSTALAR-DOCKER.md](INSTALAR-DOCKER.md) e [HABILITAR-VIRTUALIZACAO.md](HABILITAR-VIRTUALIZACAO.md).

---

## 🎯 3 Passos Para Começar

### 1️⃣ Obter API Keys Gratuitas (5 minutos)

#### Google Gemini API (OBRIGATÓRIO — Grátis)
1. Acesse: https://aistudio.google.com/apikey
2. Faça login com conta Google
3. "Get API Key" → "Create API Key"
4. **Copie e guarde a chave!**

#### Pexels API (RECOMENDADO — Grátis)
1. Acesse: https://www.pexels.com/api/
2. "Get Started" → cadastro gratuito
3. Copie a API Key do dashboard

> 🎉 Com essas duas chaves, você já pode criar vídeos com imagens stock, animações de palitinho, dark stickman e Gemini Veo!

---

### 2️⃣ Configurar e Iniciar (5 minutos)

#### Opção A: VPS / Linux (Produção)

```bash
# Clone o repositório
git clone https://github.com/eloviskis/videoforge.git
cd videoforge

# Crie o .env com suas chaves
cat > .env << EOF
GEMINI_API_KEY=sua_chave_gemini_aqui
PEXELS_API_KEY=sua_chave_pexels_aqui
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_USER=videoforge
POSTGRES_PASSWORD=videoforge
POSTGRES_DB=videoforge
EOF

# Inicie os containers
docker compose -f docker-compose.vps.yml up -d

# Verifique se está tudo rodando (aguarde 1-2 minutos)
docker compose -f docker-compose.vps.yml ps
```

#### Opção B: Windows (Desenvolvimento)

```powershell
# Clone o repositório
git clone https://github.com/eloviskis/videoforge.git
cd videoforge

# Crie o .env
Copy-Item .env.example .env
notepad .env
# → Preencha: GEMINI_API_KEY e PEXELS_API_KEY

# Inicie com Docker
docker compose up -d

# Ou manualmente (sem Docker):
cd backend; npm install; node server.js
# Em outro terminal:
cd frontend; npm install; npm run dev
```

**Você deve ver estes containers rodando:**
```
NAME                     STATUS
videoforge-frontend      Up
videoforge-backend       Up
videoforge-postgres      Up (healthy)
videoforge-python-worker Up
videoforge-nginx         Up
```

---

### 3️⃣ Criar Seu Primeiro Vídeo (2 minutos)

1. Acesse o dashboard: **http://localhost** (ou seu domínio)
2. Faça login (ou registre-se)
3. No formulário principal:
   - **Título**: "5 Curiosidades sobre o Espaço"
   - **Nicho**: Curiosidades
   - **Duração**: 5 minutos
   - **Tipo**: 📸 Imagens Stock (Pexels) — gratuito!
4. Clique em **"🚀 Criar Vídeo"**
5. Acompanhe o progresso em tempo real! 🎉

---

## 🚀 Próximos Passos

### Configurar mais integrações
Use o **🧙 Setup Wizard** (botão no dashboard) para configurar:
- 🎥 **Kling AI** — Vídeos cinematográficos
- 🤖 **Replicate** — Wan 2.1 / Flux.1
- 🖥️ **ComfyUI** — Seu próprio servidor IA (com teste de conexão integrado!)
- 🎭 **HeyGen/D-ID** — Avatar apresentador

### Conectar redes sociais
- ⚙️ **Minha Conta → Redes Sociais** → Conectar YouTube, Twitter, etc.

### Experimentar todos os modos
- ✍️ **Roteiro Manual** — Use seu próprio texto
- 📖 **Livro/Série** — Crie séries de vídeos por capítulos
- ⭐ **Resenha** — Reviews de produtos
- 👀 **Preview de Cenas** — Revise antes de renderizar

### Ler o guia completo
📖 **[GUIA-COMPLETO.md](GUIA-COMPLETO.md)** — Configuração detalhada de todas as APIs e funcionalidades

---

## ❌ Problemas Comuns

### Docker não inicia
```bash
# Verificar se Docker está rodando
docker info

# Windows: Abra o Docker Desktop manualmente
```

### Erro "port is already allocated"
```bash
docker compose down
docker compose up -d
```

### Backend não inicia / erro de conexão
```bash
# Ver logs
docker logs videoforge-backend --tail 50

# Reiniciar
docker restart videoforge-backend
```

### Erro "Gemini API Key não configurada"
- Verifique seu `.env` — a chave deve estar sem espaços ou aspas
- Ou configure em: ⚙️ Minha Conta → Minhas API Keys

---

## 📱 URLs do Sistema

| Serviço | URL |
|---------|-----|
| **Dashboard** | http://localhost (ou seu domínio) |
| **API Health** | http://localhost:3001/api/health |

---

**🎬 VideoForge v2.0 — Seu sistema de automação de vídeos está pronto!**
