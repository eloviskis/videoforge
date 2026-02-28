FROM python:3.11-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar PyTorch CPU primeiro (camada separada para cache)
RUN pip install --no-cache-dir \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copiar e instalar demais dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar scripts
COPY generate_video.py .

# Criar diretórios
RUN mkdir -p /media /models

# Volume para cache de modelos (evitar re-download)
ENV HF_HOME=/models
ENV TRANSFORMERS_CACHE=/models
ENV DIFFUSERS_CACHE=/models

# Permissões
ENV UMASK=0000
CMD ["bash", "-c", "umask 0000 && tail -f /dev/null"]
