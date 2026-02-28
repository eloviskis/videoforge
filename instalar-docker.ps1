# Script de Instalação Automatizada do Docker Desktop
# VideoForge - 2026

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🐳 INSTALAÇÃO AUTOMÁTICA DO DOCKER DESKTOP              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar se está sendo executado como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host ""
    Write-Host "➡️  Clique com botão direito no PowerShell e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Executando como Administrador" -ForegroundColor Green
Write-Host ""

# Verificar se Docker já está instalado
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "✅ Docker já está instalado!" -ForegroundColor Green
    docker --version
    Write-Host ""
    Write-Host "➡️  Execute: .\instalar.ps1 para continuar a instalação do VideoForge" -ForegroundColor Cyan
    Read-Host "Pressione Enter para sair"
    exit 0
}

# Etapa 1: Habilitar WSL 2
Write-Host "1️⃣ Habilitando WSL 2..." -ForegroundColor Yellow
try {
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
    wsl --set-default-version 2
    Write-Host "   ✅ WSL 2 configurado" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Aviso: Algumas configurações do WSL podem requerer reinicialização" -ForegroundColor Yellow
}
Write-Host ""

# Etapa 2: Download do Docker Desktop
Write-Host "2️⃣ Baixando Docker Desktop..." -ForegroundColor Yellow
$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$installerPath = "$env:TEMP\DockerDesktopInstaller.exe"

try {
    Write-Host "   📥 Iniciando download (~500MB, pode demorar alguns minutos)..." -ForegroundColor Cyan
    
    # Download com progress bar
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
    $ProgressPreference = 'Continue'
    
    Write-Host "   ✅ Download concluído!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao baixar: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "   ➡️  Baixe manualmente em: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host ""

# Etapa 3: Instalação
Write-Host "3️⃣ Instalando Docker Desktop..." -ForegroundColor Yellow
Write-Host "   ⏳ Isso pode levar 5-10 minutos. Aguarde..." -ForegroundColor Cyan

try {
    # Instalar com parâmetros silenciosos
    Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait -NoNewWindow
    Write-Host "   ✅ Instalação concluída!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro na instalação: $_" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host ""

# Etapa 4: Limpeza
Write-Host "4️⃣ Limpando arquivos temporários..." -ForegroundColor Yellow
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ Limpeza concluída" -ForegroundColor Green
Write-Host ""

# Instruções finais
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. O computador precisa ser REINICIADO para finalizar a configuração" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Após reiniciar:" -ForegroundColor White
Write-Host "   • Docker Desktop abrirá automaticamente" -ForegroundColor White
Write-Host "   • Aceite os termos de serviço" -ForegroundColor White
Write-Host "   • Aguarde até ver 'Docker Desktop is running'" -ForegroundColor White
Write-Host ""
Write-Host "3. Abra um NOVO PowerShell e execute:" -ForegroundColor White
Write-Host "   cd C:\Users\elovi\Downloads\VideoForge" -ForegroundColor Cyan
Write-Host "   .\instalar.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$restart = Read-Host "Deseja reiniciar o computador AGORA? (S/N)"
if ($restart -eq "S" -or $restart -eq "s") {
    Write-Host ""
    Write-Host "🔄 Reiniciando em 10 segundos..." -ForegroundColor Yellow
    Write-Host "   Salve todos os trabalhos abertos!" -ForegroundColor Red
    Start-Sleep -Seconds 10
    Restart-Computer -Force
} else {
    Write-Host ""
    Write-Host "⚠️  Lembre-se de REINICIAR o computador antes de usar o Docker!" -ForegroundColor Yellow
    Write-Host ""
}
