# 🔧 Como Habilitar Virtualização na BIOS

## ❌ Problema Atual

Docker Desktop não consegue iniciar porque a **virtualização não está habilitada** na BIOS/UEFI.

---

## 🎯 Solução: Habilitar na BIOS

### Passo 1: Acessar a BIOS

1. **Salve todo seu trabalho e feche programas abertos**
2. **Reinicie o computador**
3. **Pressione a tecla da BIOS** repetidamente durante a inicialização:

| Fabricante | Tecla Comum |
|------------|-------------|
| **Dell** | F2 ou F12 |
| **HP** | F10 ou Esc |
| **Lenovo** | F1 ou F2 |
| **Asus** | F2 ou Del |
| **Acer** | F2 ou Del |
| **MSI** | Del |
| **Gigabyte** | Del |

**💡 Dica:** Pressione a tecla **várias vezes** logo após ligar o PC, antes do logo do Windows aparecer.

---

### Passo 2: Encontrar a Opção de Virtualização

A opção pode ter diferentes nomes dependendo do fabricante:

#### **Intel (VT-x):**
- Intel Virtualization Technology
- Intel VT-x
- VT-x
- Virtualization Technology
- Vanderpool

#### **AMD (AMD-V):**
- SVM Mode
- AMD-V
- Secure Virtual Machine

**📍 Onde encontrar:**
- Aba **Advanced** → CPU Configuration
- Aba **Configuration** → Intel Virtualization
- Aba **Security** → Virtualization
- Aba **System Configuration** → Virtualization Technology

---

### Passo 3: Habilitar

1. Navegue usando as **setas do teclado** ⬆️⬇️⬅️➡️
2. Encontre a opção de virtualização
3. Pressione **Enter** para editar
4. Mude de **Disabled** para **Enabled**
5. Pressione **F10** para salvar e sair
6. Confirme com **Yes** ou **Enter**

---

### Passo 4: Após Reiniciar

Quando o Windows iniciar novamente:

```powershell
# Abra PowerShell e execute:
cd C:\Users\elovi\Downloads\VideoForge

# Verificar se virtualizacao foi habilitada
systeminfo | Select-String "Virtualization"

# Deve aparecer: "Sim" ou "Enabled"
```

Se aparecer **"Não"** ou **"Disabled"**, a virtualização ainda não está ativa na BIOS.

---

## 🚀 Depois de Habilitar

1. **Reinicie o computador** mais uma vez
2. **Abra Docker Desktop**
3. Execute:

```powershell
cd C:\Users\elovi\Downloads\VideoForge
.\instalar.ps1
```

---

## 🆘 Problemas Comuns

### "Não encontro a opção na BIOS"

Algumas possibilidades:
- Seu PC pode não suportar virtualização (muito antigo)
- A opção pode estar em um local diferente
- Pode estar "travada" por segurança corporativa

**Solução:** Procure no Google por:
```
habilitar virtualização [MARCA DO SEU PC] [MODELO]
```
Exemplo: "habilitar virtualização Dell Inspiron 15"

### "Não consigo acessar a BIOS"

Se pressionar a tecla não funciona:

**Windows 11:**
1. Configurações → Sistema → Recuperação
2. "Inicialização avançada" → Reiniciar agora
3. Solução de problemas → Opções avançadas
4. Configurações de firmware UEFI → Reiniciar

**Windows 10:**
1. Configurações → Atualização e Segurança
2. Recuperação → Inicialização avançada → Reiniciar agora
3. Solução de problemas → Opções avançadas
4. Configurações de firmware UEFI → Reiniciar

---

## ✅ Checklist

- [ ] Acessei a BIOS
- [ ] Encontrei a opção de virtualização (VT-x ou AMD-V)
- [ ] Habilitei a virtualização (Enabled)
- [ ] Salvei as alterações (F10)
- [ ] Reiniciei o computador
- [ ] Verifiquei com `systeminfo`
- [ ] Docker Desktop agora inicia sem erros

---

## 📞 Ainda com problemas?

Se após seguir todos os passos o Docker ainda não funcionar, pode ser:

1. **Hardware não suporta** (PCs muito antigos)
2. **Bloqueio corporativo** (PCs de empresa)
3. **Windows Home sem Hyper-V** (nesse caso use WSL2)

Entre em contato mostrando:
- Modelo do seu PC
- Resultado de `systeminfo | Select-String "Virtualization"`
- Print do erro do Docker Desktop
