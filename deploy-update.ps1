#!/usr/bin/env pwsh
# ============================================
# VideoForge - Deploy de Atualização Desktop
# ============================================
# Uso: .\deploy-update.ps1 [-SkipBuild] [-Version "1.3.0"]
#
# Este script:
# 1. Atualiza a versão no package.json (opcional)
# 2. Roda o prebuild (Vite + esbuild)
# 3. Gera o EXE com electron-builder
# 4. Sobe EXE + latest.yml + blockmap para o VPS
# 5. Usuários com app instalado recebem a atualização automaticamente

param(
    [string]$Version,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$VPS = "root@31.97.64.250"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519"
$REMOTE_DIR = "/root/videoforge/downloads"
$DIST_DIR = "dist-desktop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VideoForge - Deploy de Atualizacao" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Atualizar versão se fornecida
if ($Version) {
    Write-Host "[1/5] Atualizando versao para $Version..." -ForegroundColor Yellow
    $pkgPath = "desktop\package.json"
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $oldVersion = $pkg.version
    $pkg.version = $Version
    $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath -Encoding UTF8
    Write-Host "       $oldVersion -> $Version" -ForegroundColor Green
} else {
    $pkg = Get-Content "desktop\package.json" -Raw | ConvertFrom-Json
    $Version = $pkg.version
    Write-Host "[1/5] Versao atual: $Version" -ForegroundColor Yellow
}

if (-not $SkipBuild) {
    # 2. Prebuild (frontend + backend bundle)
    Write-Host ""
    Write-Host "[2/5] Executando prebuild..." -ForegroundColor Yellow
    node desktop/prebuild.mjs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Prebuild falhou!" -ForegroundColor Red
        exit 1
    }
    Write-Host "       Prebuild concluido!" -ForegroundColor Green

    # 3. Build do EXE
    Write-Host ""
    Write-Host "[3/5] Gerando instalador Windows..." -ForegroundColor Yellow
    Push-Location desktop
    npx electron-builder --win --publish never
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: electron-builder falhou!" -ForegroundColor Red
        exit 1
    }
    Write-Host "       Instalador gerado!" -ForegroundColor Green
} else {
    Write-Host "[2/5] Build pulado (--SkipBuild)" -ForegroundColor DarkGray
    Write-Host "[3/5] Build pulado (--SkipBuild)" -ForegroundColor DarkGray
}

# 4. Verificar arquivos gerados
Write-Host ""
Write-Host "[4/5] Verificando arquivos..." -ForegroundColor Yellow

$latestYml = "$DIST_DIR\latest.yml"
if (-not (Test-Path $latestYml)) {
    Write-Host "ERRO: latest.yml nao encontrado em $DIST_DIR" -ForegroundColor Red
    exit 1
}

# Ler o nome do EXE do latest.yml
$ymlContent = Get-Content $latestYml -Raw
$exeMatch = [regex]::Match($ymlContent, 'url:\s*(.+\.exe)')
if (-not $exeMatch.Success) {
    Write-Host "ERRO: Nao encontrou URL do EXE no latest.yml" -ForegroundColor Red
    exit 1
}
$exeFileName = $exeMatch.Groups[1].Value.Trim()

# electron-builder pode usar hifens no yml mas espaços no arquivo real
$exeFilePath = "$DIST_DIR\$exeFileName"
if (-not (Test-Path $exeFilePath)) {
    # Tentar com espaços ao invés de hifens
    $exeFileNameSpaces = $exeFileName -replace '-', ' '
    $exeFilePath = "$DIST_DIR\$exeFileNameSpaces"
}
if (-not (Test-Path $exeFilePath)) {
    # Listar arquivos .exe disponíveis
    Write-Host "ERRO: EXE nao encontrado. Arquivos .exe em ${DIST_DIR}:" -ForegroundColor Red
    Get-ChildItem "$DIST_DIR\*.exe" | ForEach-Object { Write-Host "  $_" }
    exit 1
}

$blockmapFile = "${exeFilePath}.blockmap"
$exeSize = [math]::Round((Get-Item $exeFilePath).Length / 1MB, 1)

Write-Host "       EXE: $exeFilePath ($exeSize MB)" -ForegroundColor Green
Write-Host "       YML: $latestYml" -ForegroundColor Green
if (Test-Path $blockmapFile) {
    Write-Host "       Blockmap: $blockmapFile" -ForegroundColor Green
}

# 5. Upload para VPS
Write-Host ""
Write-Host "[5/5] Enviando para VPS..." -ForegroundColor Yellow

# Criar diretório remoto
ssh -i $SSH_KEY $VPS "mkdir -p $REMOTE_DIR"

# Upload EXE (mais demorado)
Write-Host "       Enviando EXE ($exeSize MB)..." -ForegroundColor DarkGray
scp -i $SSH_KEY "$exeFilePath" "${VPS}:${REMOTE_DIR}/${exeFileName}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha no upload do EXE" -ForegroundColor Red
    exit 1
}

# Upload latest.yml
Write-Host "       Enviando latest.yml..." -ForegroundColor DarkGray
scp -i $SSH_KEY "$latestYml" "${VPS}:${REMOTE_DIR}/latest.yml"

# Upload blockmap (para atualizações diferenciais)
if (Test-Path $blockmapFile) {
    Write-Host "       Enviando blockmap..." -ForegroundColor DarkGray
    scp -i $SSH_KEY "$blockmapFile" "${VPS}:${REMOTE_DIR}/${exeFileName}.blockmap"
}

# Atualizar versão no banco de dados
Write-Host "       Atualizando banco de dados..." -ForegroundColor DarkGray
$downloadUrl = "https://videoforge.tech/downloads/$([uri]::EscapeDataString($exeFileName))"
ssh -i $SSH_KEY $VPS "cd /root/videoforge && docker compose -f docker-compose.vps.yml exec -T postgres psql -U videoforge -d videoforge -c `"UPDATE configuracoes SET valor = '$Version' WHERE chave = 'versao_app'; UPDATE configuracoes SET valor = '$downloadUrl' WHERE chave = 'download_url';`""

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy concluido! v$Version" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  EXE: https://videoforge.tech/downloads/$exeFileName" -ForegroundColor Cyan
Write-Host "  YML: https://videoforge.tech/downloads/latest.yml" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Usuarios com o app instalado receberao" -ForegroundColor White
Write-Host "  a atualizacao automaticamente!" -ForegroundColor White
Write-Host ""
