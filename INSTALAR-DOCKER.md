# 🐳 Instalação do Docker Desktop - VideoForge

## ❌ Problema Detectado

O Docker Desktop não está instalado no seu sistema. Ele é **essencial** para rodar o VideoForge.

---

## 📥 Como Instalar o Docker Desktop

### Passo 1: Download

1. Acesse: **https://www.docker.com/products/docker-desktop/**
2. Clique em **"Download for Windows"**
3. Aguarde o download terminar (~500MB)

### Passo 2: Instalação

1. Execute o instalador `Docker Desktop Installer.exe`
2. Aceite os termos de uso
3. Mantenha as opções padrão marcadas:
   - ✅ Use WSL 2 instead of Hyper-V (recomendado)
   - ✅ Add shortcut to desktop
4. Clique em **Install**
5. Aguarde a instalação (3-5 minutos)
6. Clique em **Close and restart** quando solicitado

### Passo 3: Primeiro Início

1. Após reiniciar, o Docker Desktop abrirá automaticamente
2. Aceite os termos de serviço
3. Você pode pular o tutorial (Skip tutorial)
4. Aguarde até ver "Docker Desktop is running" no ícone da bandeja

---

## ✅ Verificar Instalação

Abra um **novo PowerShell** (importante: novo terminal!) e execute:

```powershell
docker --version
```

**Resultado esperado:**
```
Docker version 24.0.x, build xxxxx
```

Se aparecer a versão, está tudo certo! ✅

---

## 🚀 Próximo Passo: Voltar ao VideoForge

Após instalar o Docker Desktop:

1. **Feche e reabra o PowerShell** (para atualizar o PATH)
2. Navegue para o diretório do VideoForge:
   ```powershell
   cd C:\Users\elovi\Downloads\VideoForge
   ```
3. Execute o script de instalação:
   ```powershell
   .\instalar.ps1
   ```

**OU** execute manualmente:

```powershell
# Iniciar containers
docker compose up -d

# Aguardar 2 minutos
Start-Sleep -Seconds 120

# Verificar status
docker compose ps

# Abrir n8n no navegador
Start-Process "http://localhost:5678"
```

---

## 🆘 Problemas Comuns

### "WSL 2 installation is incomplete"

1. Abra PowerShell como Administrador
2. Execute:
   ```powershell
   wsl --install
   ```
3. Reinicie o computador
4. Abra o Docker Desktop novamente

### Docker Desktop não inicia

1. Verifique se a virtualização está habilitada na BIOS
2. Reinicie o computador
3. Tente iniciar o Docker Desktop manualmente

### "Hardware assisted virtualization and data execution protection must be enabled in the BIOS"

Você precisa habilitar a virtualização na BIOS:
1. Reinicie o PC e entre na BIOS (geralmente F2, F10 ou DEL)
2. Procure por "Virtualization Technology" ou "VT-x/AMD-V"
3. Habilite a opção
4. Salve e reinicie

---

## 📋 Requisitos do Sistema

- Windows 10 64-bit: Pro, Enterprise ou Education (Build 19041+)
- OU Windows 11 64-bit
- Habilitar WSL 2
- 4GB de RAM (8GB recomendado)
- Virtualização habilitada na BIOS

---

## 📞 Precisa de Ajuda?

- Documentação oficial: https://docs.docker.com/desktop/install/windows-install/
- Troubleshooting: https://docs.docker.com/desktop/troubleshoot/overview/

---

**Depois de instalar o Docker, volte aqui e continue a instalação do VideoForge!** 🎬
