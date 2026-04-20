#!/bin/bash
# ============================================
# 🎬 VideoForge - Comparar Produção com Git
# ============================================
# Uso: bash compare-production.sh [--ssh-key <caminho>] [--output <dir>]
#
# Este script:
# 1. Copia os arquivos de produção do VPS via rsync/scp
# 2. Compara com os arquivos do repositório git local
# 3. Gera um relatório de diferenças
# ============================================

set -e

VPS="${VIDEOFORGE_VPS:-root@31.97.64.250}"
REMOTE_DIR="${VIDEOFORGE_REMOTE_DIR:-/root/videoforge}"
SSH_KEY="${VIDEOFORGE_SSH_KEY:-${HOME}/.ssh/id_ed25519}"
SNAPSHOT_DIR="/tmp/videoforge-production-snapshot"
REPORT_FILE="/tmp/videoforge-diff-report.txt"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --ssh-key)
            SSH_KEY="$2"
            shift 2
            ;;
        --output)
            SNAPSHOT_DIR="$2"
            shift 2
            ;;
        --help|-h)
            echo "Uso: bash compare-production.sh [--ssh-key <caminho>] [--output <dir>]"
            echo ""
            echo "  --ssh-key  Caminho para a chave SSH (padrão: ~/.ssh/id_ed25519)"
            echo "  --output   Diretório para salvar o snapshot (padrão: /tmp/videoforge-production-snapshot)"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Argumento desconhecido: $1${NC}"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${CYAN}🎬 =====================================${NC}"
echo -e "${CYAN}   VideoForge - Comparar Produção x Git${NC}"
echo -e "${CYAN}=====================================${NC}"
echo ""
echo -e "  ${BLUE}🖥️  VPS:${NC}       ${VPS}"
echo -e "  ${BLUE}📁 Remoto:${NC}    ${REMOTE_DIR}"
echo -e "  ${BLUE}🔑 Chave SSH:${NC} ${SSH_KEY}"
echo -e "  ${BLUE}💾 Snapshot:${NC}  ${SNAPSHOT_DIR}"
echo ""

# ============================================
# 1. Verificar pré-requisitos
# ============================================
echo -e "${YELLOW}📋 Verificando pré-requisitos...${NC}"

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Chave SSH não encontrada: ${SSH_KEY}${NC}"
    echo "  Use --ssh-key para especificar outro caminho."
    exit 1
fi

if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ ssh não encontrado. Instale openssh-client.${NC}"
    exit 1
fi

if ! command -v rsync &> /dev/null; then
    echo -e "${YELLOW}⚠️  rsync não encontrado. Usando scp como alternativa.${NC}"
    USE_SCP=true
fi

if ! git rev-parse --is-inside-work-tree &> /dev/null 2>&1; then
    echo -e "${RED}❌ Este script deve ser executado dentro do repositório git do VideoForge.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pré-requisitos OK${NC}"

# ============================================
# 2. Testar conexão SSH
# ============================================
echo ""
echo -e "${YELLOW}🔌 Testando conexão SSH com o VPS...${NC}"

if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$VPS" "echo 'OK'" &> /dev/null; then
    echo -e "${RED}❌ Não foi possível conectar ao VPS ${VPS}${NC}"
    echo "  Verifique:"
    echo "  - Se o servidor está acessível (ping ${VPS#*@})"
    echo "  - Se a chave SSH está correta: ${SSH_KEY}"
    echo "  - Se o usuário '${VPS%@*}' tem acesso"
    exit 1
fi

echo -e "${GREEN}✅ Conexão SSH OK${NC}"

# ============================================
# 3. Obter versão em produção
# ============================================
echo ""
echo -e "${YELLOW}📊 Obtendo informações da versão em produção...${NC}"

PROD_GIT_HASH=$(ssh -i "$SSH_KEY" "$VPS" "cd ${REMOTE_DIR} && git rev-parse HEAD 2>/dev/null || echo 'N/A'")
PROD_GIT_BRANCH=$(ssh -i "$SSH_KEY" "$VPS" "cd ${REMOTE_DIR} && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A'")
PROD_GIT_DATE=$(ssh -i "$SSH_KEY" "$VPS" "cd ${REMOTE_DIR} && git log -1 --format='%ci' 2>/dev/null || echo 'N/A'")
LOCAL_GIT_HASH=$(git rev-parse HEAD)
LOCAL_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
LOCAL_GIT_DATE=$(git log -1 --format='%ci')

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Versão em Produção (VPS)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Branch: ${YELLOW}${PROD_GIT_BRANCH}${NC}"
echo -e "  Commit: ${YELLOW}${PROD_GIT_HASH}${NC}"
echo -e "  Data:   ${YELLOW}${PROD_GIT_DATE}${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Versão Local (Git)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Branch: ${GREEN}${LOCAL_GIT_BRANCH}${NC}"
echo -e "  Commit: ${GREEN}${LOCAL_GIT_HASH}${NC}"
echo -e "  Data:   ${GREEN}${LOCAL_GIT_DATE}${NC}"
echo ""

if [ "$PROD_GIT_HASH" = "$LOCAL_GIT_HASH" ]; then
    echo -e "${GREEN}✅ Produção e Git estão no mesmo commit!${NC}"
    echo ""
    read -r -p "Deseja comparar os arquivos mesmo assim? (s/N) " answer
    if [[ ! "$answer" =~ ^[Ss]$ ]]; then
        exit 0
    fi
fi

# ============================================
# 4. Copiar arquivos de produção
# ============================================
echo ""
echo -e "${YELLOW}📥 Copiando arquivos de produção do VPS...${NC}"
echo -e "   (arquivos de media, logs e .env serão ignorados)"

rm -rf "$SNAPSHOT_DIR"
mkdir -p "$SNAPSHOT_DIR"

# Arquivos e diretórios a excluir (dados e segredos)
EXCLUDES=(
    ".git"
    "node_modules"
    "media/"
    "*.log"
    "*.env"
    ".env.*"
    "certbot/"
    "dist/"
    "dist-desktop/"
    "build/"
    "__pycache__/"
    "*.pyc"
    ".DS_Store"
)

if [ "$USE_SCP" = true ]; then
    echo -e "${YELLOW}  Usando scp...${NC}"
    scp -i "$SSH_KEY" -r "$VPS:${REMOTE_DIR}" "$SNAPSHOT_DIR/production" 2>/dev/null || {
        echo -e "${RED}❌ Erro ao copiar arquivos via scp${NC}"
        exit 1
    }
else
    EXCLUDE_ARGS=""
    for excl in "${EXCLUDES[@]}"; do
        EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude='$excl'"
    done

    eval rsync -az --no-owner --no-group \
        -e \"ssh -i '$SSH_KEY'\" \
        $EXCLUDE_ARGS \
        "${VPS}:${REMOTE_DIR}/" \
        "${SNAPSHOT_DIR}/production/" 2>&1 | grep -v "^$" || {
        echo -e "${RED}❌ Erro ao sincronizar arquivos via rsync${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Snapshot baixado para: ${SNAPSHOT_DIR}/production/${NC}"

# ============================================
# 5. Comparar com o repositório git local
# ============================================
echo ""
echo -e "${YELLOW}🔍 Comparando produção com repositório git local...${NC}"

LOCAL_REPO=$(git rev-parse --show-toplevel)

# Gerar relatório
{
    echo "=================================="
    echo "  VideoForge - Relatório de Diff"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=================================="
    echo ""
    echo "Produção (VPS ${VPS}):"
    echo "  Branch: ${PROD_GIT_BRANCH}"
    echo "  Commit: ${PROD_GIT_HASH}"
    echo "  Data:   ${PROD_GIT_DATE}"
    echo ""
    echo "Git Local:"
    echo "  Branch: ${LOCAL_GIT_BRANCH}"
    echo "  Commit: ${LOCAL_GIT_HASH}"
    echo "  Data:   ${LOCAL_GIT_DATE}"
    echo ""
    echo "=================================="
    echo "  Diferenças de Arquivos"
    echo "=================================="
    echo ""
} > "$REPORT_FILE"

# Comparar arquivos (excluindo binários e arquivos gerados)
DIFF_EXCLUDES=(
    ".git"
    "node_modules"
    "media"
    "*.log"
    ".env"
    ".env.*"
    "certbot"
    "dist"
    "dist-desktop"
    "build"
    "__pycache__"
    "*.pyc"
)

DIFF_EXCLUDE_ARGS=""
for excl in "${DIFF_EXCLUDES[@]}"; do
    DIFF_EXCLUDE_ARGS="$DIFF_EXCLUDE_ARGS -x '$excl'"
done

# Arquivos que existem apenas na produção ou apenas no git
ONLY_PROD=()
ONLY_GIT=()
CHANGED=()

# Listar arquivos em produção
while IFS= read -r -d '' file; do
    rel="${file#${SNAPSHOT_DIR}/production/}"
    local_file="${LOCAL_REPO}/${rel}"

    if [ ! -e "$local_file" ]; then
        ONLY_PROD+=("$rel")
    elif ! diff -q "$file" "$local_file" &> /dev/null; then
        CHANGED+=("$rel")
    fi
done < <(find "${SNAPSHOT_DIR}/production" -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/media/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/certbot/*" \
    ! -name "*.log" \
    ! -name ".env" \
    ! -name ".env.*" \
    -print0 2>/dev/null)

# Listar arquivos no git local que não existem em produção
while IFS= read -r -d '' file; do
    rel="${file#${LOCAL_REPO}/}"
    prod_file="${SNAPSHOT_DIR}/production/${rel}"

    if [ ! -e "$prod_file" ]; then
        ONLY_GIT+=("$rel")
    fi
done < <(find "$LOCAL_REPO" -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/media/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/certbot/*" \
    ! -name "*.log" \
    ! -name ".env" \
    ! -name ".env.*" \
    -print0 2>/dev/null)

# Escrever relatório
{
    if [ ${#CHANGED[@]} -gt 0 ]; then
        echo "📝 ARQUIVOS MODIFICADOS (${#CHANGED[@]}):"
        for f in "${CHANGED[@]}"; do
            echo "  ~ $f"
        done
        echo ""
    fi

    if [ ${#ONLY_PROD[@]} -gt 0 ]; then
        echo "➕ SOMENTE EM PRODUÇÃO (${#ONLY_PROD[@]}):"
        for f in "${ONLY_PROD[@]}"; do
            echo "  + $f"
        done
        echo ""
    fi

    if [ ${#ONLY_GIT[@]} -gt 0 ]; then
        echo "➖ SOMENTE NO GIT LOCAL (${#ONLY_GIT[@]}):"
        for f in "${ONLY_GIT[@]}"; do
            echo "  - $f"
        done
        echo ""
    fi

    if [ ${#CHANGED[@]} -eq 0 ] && [ ${#ONLY_PROD[@]} -eq 0 ] && [ ${#ONLY_GIT[@]} -eq 0 ]; then
        echo "✅ Nenhuma diferença encontrada!"
    fi

    echo ""
    echo "=================================="
    echo "  Diff Detalhado"
    echo "=================================="
    echo ""
} >> "$REPORT_FILE"

# Diff detalhado dos arquivos modificados
for f in "${CHANGED[@]}"; do
    {
        echo "--- Produção: $f"
        echo "+++ Git local: $f"
        diff -u "${SNAPSHOT_DIR}/production/${f}" "${LOCAL_REPO}/${f}" 2>/dev/null || true
        echo ""
    } >> "$REPORT_FILE"
done

# ============================================
# 6. Exibir resumo
# ============================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Resumo das Diferenças${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ${#CHANGED[@]} -gt 0 ]; then
    echo -e "${YELLOW}📝 Arquivos modificados (${#CHANGED[@]}):${NC}"
    for f in "${CHANGED[@]}"; do
        echo -e "   ${YELLOW}~${NC} $f"
    done
    echo ""
fi

if [ ${#ONLY_PROD[@]} -gt 0 ]; then
    echo -e "${RED}➕ Somente em produção (${#ONLY_PROD[@]}):${NC}"
    for f in "${ONLY_PROD[@]}"; do
        echo -e "   ${RED}+${NC} $f"
    done
    echo ""
fi

if [ ${#ONLY_GIT[@]} -gt 0 ]; then
    echo -e "${GREEN}➖ Somente no git local (${#ONLY_GIT[@]}):${NC}"
    for f in "${ONLY_GIT[@]}"; do
        echo -e "   ${GREEN}-${NC} $f"
    done
    echo ""
fi

if [ ${#CHANGED[@]} -eq 0 ] && [ ${#ONLY_PROD[@]} -eq 0 ] && [ ${#ONLY_GIT[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Produção e repositório git estão sincronizados!${NC}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  📄 Relatório completo salvo em:"
echo -e "     ${BLUE}${REPORT_FILE}${NC}"
echo -e "  💾 Snapshot da produção em:"
echo -e "     ${BLUE}${SNAPSHOT_DIR}/production/${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
