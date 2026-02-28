# VideoForge - Script de Instalação Automática
# Execute este script no PowerShell como Administrador

Write-Host "🎬 VideoForge - Instalação Automática" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker está instalado
Write-Host "1️⃣ Verificando Docker..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "   ✅ Docker encontrado!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Docker não encontrado!" -ForegroundColor Red
    Write-Host "   📥 Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Verificar se Docker está rodando
Write-Host "2️⃣ Verificando se Docker está rodando..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   ✅ Docker está rodando!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker não está rodando!" -ForegroundColor Red
    Write-Host "   🔄 Inicie o Docker Desktop e execute este script novamente." -ForegroundColor Yellow
    exit 1
}

# Criar diretórios necessários
Write-Host "3️⃣ Criando diretórios..." -ForegroundColor Yellow
$dirs = @("media", "workflows", "python-scripts")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "   ✅ Criado: $dir" -ForegroundColor Green
    } else {
        Write-Host "   ✔️  Existe: $dir" -ForegroundColor Gray
    }
}

# Criar arquivo .env se não existir
Write-Host "4️⃣ Configurando variáveis de ambiente..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "   ✅ Arquivo .env criado!" -ForegroundColor Green
    Write-Host "   ⚠️  IMPORTANTE: Edite o arquivo .env e adicione suas API Keys!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   📝 API Keys necessárias:" -ForegroundColor Cyan
    Write-Host "      • Google Gemini: https://aistudio.google.com/apikey" -ForegroundColor White
    Write-Host "      • Pexels: https://www.pexels.com/api/" -ForegroundColor White
    Write-Host ""
    
    # Perguntar se quer editar agora
    $editar = Read-Host "   Deseja editar o .env agora? (s/n)"
    if ($editar -eq "s") {
        notepad .env
        Write-Host "   ⏸️  Pressione ENTER após salvar e fechar o .env..." -ForegroundColor Yellow
        Read-Host
    } else {
        Write-Host "   ⚠️  Não esqueça de editar o .env antes de continuar!" -ForegroundColor Yellow
        Write-Host "   Execute: notepad .env" -ForegroundColor Cyan
        exit 0
    }
} else {
    Write-Host "   ✔️  Arquivo .env já existe" -ForegroundColor Gray
}

# Verificar se API keys foram configuradas
Write-Host "5️⃣ Verificando API Keys no .env..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -Raw
if ($envContent -match "your_gemini_api_key_here" -or $envContent -match "your_pexels_api_key_here") {
    Write-Host "   ⚠️  API Keys ainda não configuradas!" -ForegroundColor Yellow
    Write-Host "   📝 Edite o arquivo .env e substitua:" -ForegroundColor Cyan
    Write-Host "      GEMINI_API_KEY=your_gemini_api_key_here" -ForegroundColor White
    Write-Host "      PEXELS_API_KEY=your_pexels_api_key_here" -ForegroundColor White
    Write-Host ""
    $continuar = Read-Host "   Deseja continuar mesmo assim? (s/n)"
    if ($continuar -ne "s") {
        notepad .env
        Write-Host "   ⏸️  Execute este script novamente após configurar as keys." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "   ✅ API Keys configuradas!" -ForegroundColor Green
}

# Iniciar containers Docker
Write-Host "6️⃣ Iniciando containers Docker..." -ForegroundColor Yellow
Write-Host "   ⏳ Isso pode demorar 2-5 minutos na primeira vez..." -ForegroundColor Gray
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Containers iniciados!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao iniciar containers!" -ForegroundColor Red
    Write-Host "   📋 Execute: docker-compose logs" -ForegroundColor Cyan
    exit 1
}

# Aguardar containers iniciarem
Write-Host "7️⃣ Aguardando containers iniciarem..." -ForegroundColor Yellow
Write-Host "   ⏳ Aguarde 60 segundos..." -ForegroundColor Gray
Start-Sleep -Seconds 60

# Verificar status dos containers
Write-Host "8️⃣ Verificando status dos containers..." -ForegroundColor Yellow
docker-compose ps

# Verificar se todos estão rodando
$running = docker-compose ps --services --filter "status=running"
$total = docker-compose ps --services

if ($running.Count -eq $total.Count) {
    Write-Host "   ✅ Todos os containers estão rodando!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Alguns containers podem ainda estar iniciando..." -ForegroundColor Yellow
    Write-Host "   🔍 Execute: docker-compose ps" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🎉 Instalação Concluída!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Acesse os serviços:" -ForegroundColor Cyan
Write-Host "   • n8n:     http://localhost:5678" -ForegroundColor White
Write-Host "             Usuário: admin / Senha: videoforge2026" -ForegroundColor Gray
Write-Host ""
Write-Host "   • pgAdmin: http://localhost:5050" -ForegroundColor White
Write-Host "             Email: admin@videoforge.local / Senha: admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Abra http://localhost:5678 no navegador" -ForegroundColor White
Write-Host "   2. Leia o arquivo INICIO-RAPIDO.md" -ForegroundColor White
Write-Host "   3. Siga o VideoForge-Plano-Implementacao.md" -ForegroundColor White
Write-Host ""
Write-Host "🛠️  Comandos úteis:" -ForegroundColor Cyan
Write-Host "   • Ver logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "   • Parar:           docker-compose down" -ForegroundColor White
Write-Host "   • Reiniciar:       docker-compose restart" -ForegroundColor White
Write-Host "   • Status:          docker-compose ps" -ForegroundColor White
Write-Host ""

# Perguntar se quer abrir o navegador
$abrir = Read-Host "Deseja abrir o n8n no navegador agora? (s/n)"
if ($abrir -eq "s") {
    Start-Process "http://localhost:5678"
}

Write-Host ""
Write-Host "✨ Boa sorte com seu canal no YouTube! ✨" -ForegroundColor Green
Write-Host ""
