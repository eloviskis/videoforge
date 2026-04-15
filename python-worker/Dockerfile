FROM python:3.11-slim

# Instalar FFmpeg e dependências do sistema
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório de trabalho
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar scripts Python
COPY *.py .

# Criar diretórios
RUN mkdir -p /app/scripts /media

# Garantir que arquivos criados tenham permissão aberta (evita EACCES no host)
ENV UMASK=0000
CMD ["bash", "-c", "umask 0000 && tail -f /dev/null"]
