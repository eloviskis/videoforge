# 🎬 VideoForge

**Plataforma de Automação de Vídeos para YouTube**

Produção automatizada de vídeos "dark/faceless" usando n8n, IA generativa, e FFmpeg.

---

## 🚀 Quick Start

### 1. Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- Git
- Pelo menos 8GB de RAM livre
- 100GB de espaço em disco

### 2. Configuração Inicial

```bash
# Clone ou navegue até o diretório
cd VideoForge

# Copie o arquivo de ambiente
cp .env.example .env

# Edite .env e adicione suas API keys
# Mínimo necessário: GEMINI_API_KEY e PEXELS_API_KEY
notepad .env

# Crie diretórios necessários
mkdir media workflows python-scripts

# Inicie os containers
docker-compose up -d
```

### 3. Aguarde os serviços iniciarem (~2 minutos)

```bash
# Verifique o status
docker-compose ps

# Deve mostrar todos os serviços como "running"
```

### 4. Acesse as interfaces

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **n8n** | http://localhost:5678 | admin / videoforge2026 |
| **pgAdmin** | http://localhost:5050 | admin@videoforge.local / admin123 |

---

## 📋 Próximos Passos

### Fase 1: Primeiro Workflow (Semana 1-2)

1. **Obter API Keys:**
   - Google Gemini: https://aistudio.google.com/apikey
   - Pexels: https://www.pexels.com/api/

2. **Configurar n8n:**
   - Acesse http://localhost:5678
   - Vá em Settings → Credentials
   - Adicione suas credenciais Gemini e Pexels

3. **Criar Workflow de Roteiro:**
   - Importe o workflow em `workflows/01-gerar-roteiro.json`
   - Ou crie manualmente seguindo o plano

4. **Testar:**
```bash
# Teste o webhook de geração de roteiro
curl -X POST http://localhost:5678/webhook/gerar-roteiro \
  -H "Content-Type: application/json" \
  -d "{\"nicho\": \"curiosidades\", \"topico\": \"10 fatos sobre o oceano\", \"duracao\": 8}"
```

### Fase 2: TTS e Renderização (Semana 3)

Ver documentação em: [VideoForge-Plano-Implementacao.md](VideoForge-Plano-Implementacao.md)

---

## 🛠️ Comandos Úteis

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f n8n

# Parar todos os serviços
docker-compose down

# Reiniciar um serviço
docker-compose restart n8n

# Acessar shell do Python worker
docker exec -it videoforge-python-worker bash

# Backup do banco de dados
docker exec videoforge-postgres pg_dump -U videoforge videoforge > backup.sql
```

---

## 📊 Estrutura do Projeto

```
VideoForge/
├── docker-compose.yml          # Configuração dos containers
├── .env                        # Variáveis de ambiente (criar do .env.example)
├── README.md                   # Este arquivo
│
├── database/
│   └── init/                   # Scripts SQL de inicialização
│       ├── 01-create-n8n-db.sql
│       └── 02-create-videoforge-schema.sql
│
├── python-worker/
│   ├── Dockerfile
│   └── requirements.txt
│
├── python-scripts/             # Scripts Python (TTS, render, upload)
│   ├── gerar_narracao.py       # (criar na Fase 2)
│   ├── renderizar_video.py     # (criar na Fase 3)
│   └── upload_youtube.py       # (criar na Fase 4)
│
├── workflows/                  # Workflows n8n (JSON exports)
│   ├── 01-gerar-roteiro.json   # (criar na Fase 1)
│   ├── 02-gerar-narracao.json  # (criar na Fase 2)
│   └── 99-pipeline-completo.json # (criar na Fase 6)
│
├── media/                      # Arquivos gerados (áudios, vídeos)
│   └── {video_id}/
│       ├── audio/
│       ├── visuals/
│       └── video_final.mp4
│
└── frontend/                   # Dashboard React (criar na Fase 5)
    └── (será criado depois)
```

---

## 🔧 Troubleshooting

### n8n não inicia

```bash
# Verificar logs
docker-compose logs n8n

# Se erro de permissão em volume:
docker-compose down -v
docker-compose up -d
```

### PostgreSQL não conecta

```bash
# Verificar se está rodando
docker exec videoforge-postgres pg_isready

# Testar conexão
docker exec -it videoforge-postgres psql -U videoforge -d videoforge
```

### Python worker com erro

```bash
# Rebuild da imagem
docker-compose build python-worker
docker-compose up -d python-worker

# Ver logs
docker-compose logs python-worker
```

---

## 📚 Documentação Completa

- **Plano de Implementação:** [VideoForge-Plano-Implementacao.md](VideoForge-Plano-Implementacao.md)
- **Arquitetura:** [VideoForge-Arquitetura.md](VideoForge-Arquitetura.md)

---

## 📈 Roadmap

- [x] Fase 1: Setup infraestrutura
- [ ] Fase 2: Workflow de roteiro
- [ ] Fase 3: TTS (narração)
- [ ] Fase 4: Renderização FFmpeg
- [ ] Fase 5: Upload YouTube
- [ ] Fase 6: Dashboard React
- [ ] Fase 7: Produção em lote
- [ ] Fase 8: Analytics

---

## 🆘 Suporte

- Documentação n8n: https://docs.n8n.io/
- Comunidade: r/n8n
- Issues: Use o sistema de issues do projeto

---

**VideoForge v1.0** — Criado em fevereiro de 2026
