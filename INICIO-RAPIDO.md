# ⚡ VideoForge - Início Rápido

**Tempo estimado: 15-20 minutos**

---

## ✅ Checklist Pré-Instalação

Antes de começar, certifique-se de ter:

- [ ] Windows 10/11 com Docker Desktop instalado
- [ ] Pelo menos 8GB de RAM livre
- [ ] 100GB de espaço em disco
- [ ] Conexão à internet estável

---

## 🎯 Passo a Passo

### 1️⃣ Obter API Keys (5 minutos)

#### Google Gemini API (OBRIGATÓRIO - Grátis)

1. Acesse: https://aistudio.google.com/apikey
2. Faça login com conta Google
3. Clique em "Get API Key" → "Create API Key"
4. Copie a chave gerada
5. **Guarde em local seguro!**

#### Pexels API (OBRIGATÓRIO - Grátis)

1. Acesse: https://www.pexels.com/api/
2. Clique em "Get Started"
3. Preencha o cadastro
4. Copie a API Key do dashboard
5. **Guarde com a chave do Gemini!**

---

### 2️⃣ Configurar o Projeto (5 minutos)

```powershell
# Abra o PowerShell no diretório VideoForge
cd C:\Users\elovi\Downloads\VideoForge

# Crie o arquivo .env com suas chaves
Copy-Item .env.example .env

# Edite o .env (abrirá no Notepad)
notepad .env
```

**No .env, substitua estas linhas:**
```
GEMINI_API_KEY=sua_chave_gemini_aqui
PEXELS_API_KEY=sua_chave_pexels_aqui
```

Salve e feche o arquivo.

---

### 3️⃣ Iniciar o Sistema (5 minutos)

```powershell
# Criar diretórios necessários
New-Item -ItemType Directory -Force -Path media, workflows, python-scripts

# Iniciar os containers Docker
docker-compose up -d

# Aguardar containers iniciarem (2-3 minutos)
Write-Host "⏳ Aguardando containers iniciarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 120

# Verificar status
docker-compose ps
```

**Você deve ver algo assim:**
```
NAME                        STATUS
videoforge-n8n              Up
videoforge-postgres         Up
videoforge-python-worker    Up
videoforge-redis            Up
videoforge-pgadmin          Up
```

---

### 4️⃣ Verificar Instalação (2 minutos)

Abra seu navegador e acesse:

1. **n8n:** http://localhost:5678
   - Usuário: `admin`
   - Senha: `videoforge2026`
   - ✅ Se abriu = Funcionando!

2. **pgAdmin:** http://localhost:5050
   - Email: `admin@videoforge.local`
   - Senha: `admin123`
   - ✅ Se abriu = Funcionando!

---

### 5️⃣ Configurar Credenciais no n8n (3 minutos)

1. No n8n (http://localhost:5678), clique em **Settings** (engrenagem)
2. Vá em **Credentials**
3. Clique em **+ Add Credential**

#### Adicionar Gemini API:

- Tipo: Procure por "Google" ou "HTTP Request"
- Como não há credencial nativa do Gemini, use **HTTP Request**
- Nome: `Gemini API`
- Authentication: `Generic Credential Type`
- Credential Type: `Header Auth`
- Name: `x-goog-api-key`
- Value: `sua_chave_gemini_aqui`
- Salve

#### Adicionar Pexels API:

- Tipo: **HTTP Request**
- Nome: `Pexels API`
- Authentication: `Generic Credential Type`
- Credential Type: `Header Auth`
- Name: `Authorization`
- Value: `sua_chave_pexels_aqui`
- Salve

---

## 🎉 Pronto! Sistema Instalado

Agora você pode:

### Próximo Passo: Criar o Primeiro Workflow

Volte ao PowerShell e execute:

```powershell
# Navegar para o diretório de scripts
cd python-scripts

# Criar script de teste
@"
print('✅ Python Worker funcionando!')
print('🐍 Versão Python:', __import__('sys').version)
"@ | Out-File -FilePath test.py -Encoding UTF8

# Testar o Python worker
docker exec videoforge-python-worker python /app/scripts/test.py
```

**Resultado esperado:**
```
✅ Python Worker funcionando!
🐍 Versão Python: 3.11.x
```

---

## 🚀 Próxima Fase

Agora que o sistema está rodando, siga o guia completo em:

📖 **[VideoForge-Plano-Implementacao.md](VideoForge-Plano-Implementacao.md)**

**Próximos passos:**
1. Criar workflow de geração de roteiro
2. Testar geração de roteiro com IA
3. Implementar TTS (narração)
4. Renderizar primeiro vídeo

---

## ❌ Problemas Comuns

### Docker não inicia

```powershell
# Verificar se Docker Desktop está rodando
Get-Process "Docker Desktop"

# Se não estiver, abra o Docker Desktop manualmente
```

### Erro "port is already allocated"

```powershell
# Parar containers conflitantes
docker-compose down

# Reiniciar
docker-compose up -d
```

### containers param mas n8n não abre

```powershell
# Ver logs do n8n
docker-compose logs n8n

# Aguardar mais 1-2 minutos e tentar novamente
Start-Sleep -Seconds 60
```

---

## 📞 Precisa de Ajuda?

1. Verifique os logs: `docker-compose logs -f`
2. Consulte: [README.md](README.md)
3. Revise a documentação completa

---

**🎬 VideoForge está pronto para produzir vídeos!**
