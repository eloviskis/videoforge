#!/usr/bin/env pwsh
# ============================================
# VideoForge - Comparar Producao com Git
# ============================================
# Uso: .\compare-production.ps1 [-SshKey <caminho>] [-Output <dir>]
#
# Este script:
# 1. Copia os arquivos de producao do VPS via scp/rsync
# 2. Compara com os arquivos do repositorio git local
# 3. Gera um relatorio de diferencas
# ============================================

param(
    [string]$SshKey = "$env:USERPROFILE\.ssh\id_ed25519",
    [string]$Output = "$env:TEMP\videoforge-production-snapshot",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$VPS         = if ($env:VIDEOFORGE_VPS)        { $env:VIDEOFORGE_VPS }        else { "root@31.97.64.250" }
$RemoteDir   = if ($env:VIDEOFORGE_REMOTE_DIR) { $env:VIDEOFORGE_REMOTE_DIR } else { "/root/videoforge" }
$SnapshotDir = $Output
$ReportFile  = "$env:TEMP\videoforge-diff-report.txt"

if ($Help) {
    Write-Host "Uso: .\compare-production.ps1 [-SshKey <caminho>] [-Output <dir>]"
    Write-Host ""
    Write-Host "  -SshKey   Caminho para a chave SSH (padrao: %USERPROFILE%\.ssh\id_ed25519)"
    Write-Host "  -Output   Diretorio para salvar o snapshot (padrao: %TEMP%\videoforge-production-snapshot)"
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VideoForge - Comparar Producao x Git" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  VPS:      $VPS" -ForegroundColor Blue
Write-Host "  Remoto:   $RemoteDir" -ForegroundColor Blue
Write-Host "  Chave SSH: $SshKey" -ForegroundColor Blue
Write-Host "  Snapshot: $SnapshotDir" -ForegroundColor Blue
Write-Host ""

# ============================================
# 1. Verificar pre-requisitos
# ============================================
Write-Host "[1/5] Verificando pre-requisitos..." -ForegroundColor Yellow

if (-not (Test-Path $SshKey)) {
    Write-Host "ERRO: Chave SSH nao encontrada: $SshKey" -ForegroundColor Red
    Write-Host "  Use -SshKey para especificar outro caminho."
    exit 1
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: ssh nao encontrado. Instale o OpenSSH." -ForegroundColor Red
    exit 1
}

# Verificar se estamos num repositorio git
try {
    $null = git rev-parse --is-inside-work-tree 2>&1
} catch {
    Write-Host "ERRO: Este script deve ser executado dentro do repositorio git do VideoForge." -ForegroundColor Red
    exit 1
}

$HasRsync = [bool](Get-Command rsync -ErrorAction SilentlyContinue)
Write-Host "       Pre-requisitos OK" -ForegroundColor Green

# ============================================
# 2. Testar conexao SSH
# ============================================
Write-Host ""
Write-Host "[2/5] Testando conexao SSH com o VPS..." -ForegroundColor Yellow

$sshTest = ssh -i $SshKey -o ConnectTimeout=10 -o BatchMode=yes $VPS "echo OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Nao foi possivel conectar ao VPS $VPS" -ForegroundColor Red
    Write-Host "  Verifique:"
    Write-Host "  - Se o servidor esta acessivel"
    Write-Host "  - Se a chave SSH esta correta: $SshKey"
    exit 1
}

Write-Host "       Conexao SSH OK" -ForegroundColor Green

# ============================================
# 3. Obter versao em producao
# ============================================
Write-Host ""
Write-Host "[3/5] Obtendo informacoes da versao em producao..." -ForegroundColor Yellow

$ProdGitHash   = (ssh -i $SshKey $VPS "cd $RemoteDir && git rev-parse HEAD 2>/dev/null || echo N/A").Trim()
$ProdGitBranch = (ssh -i $SshKey $VPS "cd $RemoteDir && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo N/A").Trim()
$ProdGitDate   = (ssh -i $SshKey $VPS "cd $RemoteDir && git log -1 --format='%ci' 2>/dev/null || echo N/A").Trim()
$LocalGitHash   = (git rev-parse HEAD).Trim()
$LocalGitBranch = (git rev-parse --abbrev-ref HEAD).Trim()
$LocalGitDate   = (git log -1 --format="%ci").Trim()

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  Versao em Producao (VPS)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  Branch: $ProdGitBranch" -ForegroundColor Yellow
Write-Host "  Commit: $ProdGitHash" -ForegroundColor Yellow
Write-Host "  Data:   $ProdGitDate" -ForegroundColor Yellow
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  Versao Local (Git)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  Branch: $LocalGitBranch" -ForegroundColor Green
Write-Host "  Commit: $LocalGitHash" -ForegroundColor Green
Write-Host "  Data:   $LocalGitDate" -ForegroundColor Green
Write-Host ""

if ($ProdGitHash -eq $LocalGitHash) {
    Write-Host "INFO: Producao e Git estao no mesmo commit!" -ForegroundColor Green
    $answer = Read-Host "Deseja comparar os arquivos mesmo assim? (s/N)"
    if ($answer -notmatch "^[sS]$") {
        exit 0
    }
}

# ============================================
# 4. Copiar arquivos de producao
# ============================================
Write-Host ""
Write-Host "[4/5] Copiando arquivos de producao do VPS..." -ForegroundColor Yellow
Write-Host "      (arquivos de media, logs e .env serao ignorados)"

if (Test-Path $SnapshotDir) {
    Remove-Item $SnapshotDir -Recurse -Force
}
New-Item -ItemType Directory -Path "$SnapshotDir\production" -Force | Out-Null

$ExcludePatterns = @(
    ".git",
    "node_modules",
    "media",
    "*.log",
    ".env",
    ".env.*",
    "certbot",
    "dist",
    "dist-desktop",
    "build",
    "__pycache__",
    "*.pyc"
)

if ($HasRsync) {
    $ExcludeArgs = $ExcludePatterns | ForEach-Object { "--exclude=$_" }
    $rsyncCmd = "rsync -az --no-owner --no-group -e `"ssh -i '$SshKey'`" " + ($ExcludeArgs -join " ") + " `"${VPS}:${RemoteDir}/`" `"$SnapshotDir\production\`""
    Invoke-Expression $rsyncCmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao sincronizar via rsync" -ForegroundColor Red
        exit 1
    }
} else {
    # Usar scp como fallback
    Write-Host "      rsync nao encontrado, usando scp..." -ForegroundColor DarkGray

    # Criar tar no servidor, excluindo pastas grandes
    $tarExcludes = ($ExcludePatterns | ForEach-Object { "--exclude='./$_'" }) -join " "
    $tarCmd = "cd $RemoteDir && tar czf /tmp/videoforge-snapshot.tar.gz $tarExcludes ."
    ssh -i $SshKey $VPS $tarCmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao criar arquivo tar no servidor" -ForegroundColor Red
        exit 1
    }

    # Baixar o tar
    $localTar = "$env:TEMP\videoforge-snapshot.tar.gz"
    scp -i $SshKey "${VPS}:/tmp/videoforge-snapshot.tar.gz" $localTar

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao baixar arquivo tar" -ForegroundColor Red
        exit 1
    }

    # Extrair
    tar xzf $localTar -C "$SnapshotDir\production"
    Remove-Item $localTar -Force

    # Limpar tar no servidor
    ssh -i $SshKey $VPS "rm -f /tmp/videoforge-snapshot.tar.gz"
}

Write-Host "       Snapshot baixado para: $SnapshotDir\production\" -ForegroundColor Green

# ============================================
# 5. Comparar com o repositorio git local
# ============================================
Write-Host ""
Write-Host "[5/5] Comparando producao com repositorio git local..." -ForegroundColor Yellow

$LocalRepo = (git rev-parse --show-toplevel).Trim()

$ChangedFiles  = [System.Collections.Generic.List[string]]::new()
$OnlyProd      = [System.Collections.Generic.List[string]]::new()
$OnlyGit       = [System.Collections.Generic.List[string]]::new()

# Funcao para verificar se um caminho deve ser excluido
function ShouldExclude($relativePath) {
    $excludeDirs = @("node_modules", ".git", "media", "dist", "dist-desktop", "build", "certbot", "__pycache__")
    foreach ($dir in $excludeDirs) {
        if ($relativePath -like "*$dir*") { return $true }
    }
    $excludeExt = @("*.log", "*.pyc", ".env", ".env.*")
    $name = Split-Path $relativePath -Leaf
    foreach ($pattern in $excludeExt) {
        if ($name -like $pattern) { return $true }
    }
    return $false
}

# Arquivos em producao
Get-ChildItem -Path "$SnapshotDir\production" -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring("$SnapshotDir\production\".Length).Replace("\", "/")
    if (-not (ShouldExclude $rel)) {
        $localFile = Join-Path $LocalRepo ($rel.Replace("/", "\"))
        if (-not (Test-Path $localFile)) {
            $OnlyProd.Add($rel)
        } else {
            $prodHash  = (Get-FileHash $_.FullName -Algorithm MD5).Hash
            $localHash = (Get-FileHash $localFile -Algorithm MD5).Hash
            if ($prodHash -ne $localHash) {
                $ChangedFiles.Add($rel)
            }
        }
    }
}

# Arquivos somente no git local
Get-ChildItem -Path $LocalRepo -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring("$LocalRepo\".Length).Replace("\", "/")
    if (-not (ShouldExclude $rel)) {
        $prodFile = Join-Path "$SnapshotDir\production" ($rel.Replace("/", "\"))
        if (-not (Test-Path $prodFile)) {
            $OnlyGit.Add($rel)
        }
    }
}

# Gerar relatorio
$report = @()
$report += "=================================="
$report += "  VideoForge - Relatorio de Diff"
$report += "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += "=================================="
$report += ""
$report += "Producao (VPS ${VPS}):"
$report += "  Branch: $ProdGitBranch"
$report += "  Commit: $ProdGitHash"
$report += "  Data:   $ProdGitDate"
$report += ""
$report += "Git Local:"
$report += "  Branch: $LocalGitBranch"
$report += "  Commit: $LocalGitHash"
$report += "  Data:   $LocalGitDate"
$report += ""
$report += "=================================="
$report += "  Diferencas de Arquivos"
$report += "=================================="
$report += ""

if ($ChangedFiles.Count -gt 0) {
    $report += "ARQUIVOS MODIFICADOS ($($ChangedFiles.Count)):"
    foreach ($f in $ChangedFiles) { $report += "  ~ $f" }
    $report += ""
}

if ($OnlyProd.Count -gt 0) {
    $report += "SOMENTE EM PRODUCAO ($($OnlyProd.Count)):"
    foreach ($f in $OnlyProd) { $report += "  + $f" }
    $report += ""
}

if ($OnlyGit.Count -gt 0) {
    $report += "SOMENTE NO GIT LOCAL ($($OnlyGit.Count)):"
    foreach ($f in $OnlyGit) { $report += "  - $f" }
    $report += ""
}

if ($ChangedFiles.Count -eq 0 -and $OnlyProd.Count -eq 0 -and $OnlyGit.Count -eq 0) {
    $report += "Nenhuma diferenca encontrada!"
    $report += ""
}

$report += "=================================="
$report += "  Diff Detalhado"
$report += "=================================="
$report += ""

foreach ($f in $ChangedFiles) {
    $prodFile  = Join-Path "$SnapshotDir\production" ($f.Replace("/", "\"))
    $localFile = Join-Path $LocalRepo ($f.Replace("/", "\"))
    $report += "--- Producao: $f"
    $report += "+++ Git local: $f"
    try {
        $diffOutput = & diff -u $prodFile $localFile 2>&1
        $report += $diffOutput
    } catch {
        $report += "(diff nao disponivel)"
    }
    $report += ""
}

$report | Set-Content $ReportFile -Encoding UTF8

# ============================================
# Exibir resumo
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumo das Diferencas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($ChangedFiles.Count -gt 0) {
    Write-Host "Arquivos modificados ($($ChangedFiles.Count)):" -ForegroundColor Yellow
    foreach ($f in $ChangedFiles) {
        Write-Host "  ~ $f" -ForegroundColor Yellow
    }
    Write-Host ""
}

if ($OnlyProd.Count -gt 0) {
    Write-Host "Somente em producao ($($OnlyProd.Count)):" -ForegroundColor Red
    foreach ($f in $OnlyProd) {
        Write-Host "  + $f" -ForegroundColor Red
    }
    Write-Host ""
}

if ($OnlyGit.Count -gt 0) {
    Write-Host "Somente no git local ($($OnlyGit.Count)):" -ForegroundColor Green
    foreach ($f in $OnlyGit) {
        Write-Host "  - $f" -ForegroundColor Green
    }
    Write-Host ""
}

if ($ChangedFiles.Count -eq 0 -and $OnlyProd.Count -eq 0 -and $OnlyGit.Count -eq 0) {
    Write-Host "Producao e repositorio git estao sincronizados!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Relatorio salvo em:"
Write-Host "  $ReportFile" -ForegroundColor Blue
Write-Host ""
Write-Host "  Snapshot da producao em:"
Write-Host "  $SnapshotDir\production\" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
