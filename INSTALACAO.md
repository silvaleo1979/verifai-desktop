# 🚀 Instalação do VerifAI Desktop

## 📋 Métodos de Instalação

### **1. Download Manual (Mais Simples)**

#### **Para Usuários Finais:**
1. **Acesse**: https://github.com/silvaleo1979/verifai-desktop/releases
2. **Clique** no release mais recente (ex: `v1.0.0`)
3. **Baixe** um dos arquivos:
   - **Instalador**: `VerifAI.Assistant-1.0.0.Setup.exe` (recomendado)
   - **Portátil**: `VerifAI.Assistant-win32-x64-1.0.0.zip`

#### **Vantagens:**
- ✅ Sempre a versão mais recente
- ✅ Download direto e seguro
- ✅ Sistema de atualização automática
- ✅ Instalação simples

---

### **2. Instalação Automática (Script)**

#### **Opção A: Script PowerShell**
```powershell
# Baixar o script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/silvaleo1979/verifai-desktop/main/install-verifai.ps1" -OutFile "install-verifai.ps1"

# Executar instalação completa
.\install-verifai.ps1

# Ou instalação portátil
.\install-verifai.ps1 -Portable

# Instalação silenciosa
.\install-verifai.ps1 -Silent
```

#### **Opção B: Script Batch**
```batch
# Baixar e executar
curl -o install-verifai.bat https://raw.githubusercontent.com/silvaleo1979/verifai-desktop/main/install-verifai.bat
install-verifai.bat
```

---

### **3. Instalação via Chocolatey (Para Desenvolvedores)**

```powershell
# Instalar Chocolatey (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar VerifAI Desktop
choco install verifai-desktop
```

---

## 🔧 Tipos de Instalação

### **Versão Completa (Instalador)**
- ✅ Instala no sistema
- ✅ Cria atalhos no menu iniciar
- ✅ Registra no painel de controle
- ✅ Atualizações automáticas
- ✅ **Recomendado para uso regular**

### **Versão Portátil (ZIP)**
- ✅ Não requer instalação
- ✅ Pode ser executada de qualquer lugar
- ✅ Ideal para pendrives
- ✅ Não modifica o sistema
- ✅ **Recomendado para uso temporário**

---

## 📥 URLs Diretas de Download

### **Versão 1.0.0:**
- **Instalador**: https://github.com/silvaleo1979/verifai-desktop/releases/download/v1.0.0/VerifAI.Assistant-1.0.0.Setup.exe
- **Portátil**: https://github.com/silvaleo1979/verifai-desktop/releases/download/v1.0.0/VerifAI.Assistant-win32-x64-1.0.0.zip

### **Sempre a versão mais recente:**
- **GitHub Releases**: https://github.com/silvaleo1979/verifai-desktop/releases/latest

---

## ⚙️ Requisitos do Sistema

### **Mínimos:**
- **Sistema Operacional**: Windows 10 (64-bit) ou superior
- **Processador**: Intel/AMD 1.8 GHz ou superior
- **Memória RAM**: 4 GB
- **Espaço em Disco**: 500 MB livres
- **Rede**: Conexão com internet para atualizações

### **Recomendados:**
- **Sistema Operacional**: Windows 11
- **Processador**: Intel/AMD 2.5 GHz ou superior
- **Memória RAM**: 8 GB ou mais
- **Espaço em Disco**: 1 GB livres
- **Rede**: Conexão estável com internet

---

## 🚀 Primeiros Passos

### **1. Após a Instalação:**
1. **Execute** o VerifAI Desktop
2. **Configure** suas chaves de API (OpenAI, Anthropic, etc.)
3. **Teste** o sistema de atualização automática

### **2. Configuração de APIs:**
- Vá em **Settings** → **Engines**
- Adicione suas chaves de API
- Teste a conexão

### **3. Verificar Atualizações:**
- Menu → **Check for Updates**
- Ou aguarde a verificação automática (a cada hora)

---

## 🔄 Sistema de Atualização

### **Automático:**
- ✅ Verificação a cada hora
- ✅ Download automático
- ✅ Notificações para o usuário
- ✅ Instalação automática

### **Manual:**
- Menu → **Check for Updates**
- Tray → **Check for Updates**

---

## 🛠️ Solução de Problemas

### **Erro de Download:**
```powershell
# Verificar conectividade
Test-NetConnection github.com -Port 443

# Baixar manualmente
Start-Process "https://github.com/silvaleo1979/verifai-desktop/releases"
```

### **Erro de Instalação:**
- Execute como **Administrador**
- Desative temporariamente o **Antivírus**
- Verifique o **espaço em disco**

### **Erro de Execução:**
- Instale o **Visual C++ Redistributable**
- Verifique se o **Windows Defender** não bloqueou

---

## 📞 Suporte

### **Links Úteis:**
- **GitHub**: https://github.com/silvaleo1979/verifai-desktop
- **Issues**: https://github.com/silvaleo1979/verifai-desktop/issues
- **Releases**: https://github.com/silvaleo1979/verifai-desktop/releases

### **Comandos de Diagnóstico:**
```powershell
# Verificar versão instalada
Get-ChildItem "C:\Program Files\VerifAI Desktop" -ErrorAction SilentlyContinue

# Verificar logs
Get-ChildItem "$env:APPDATA\VerifAI Desktop\logs" -ErrorAction SilentlyContinue

# Testar atualizações
Invoke-WebRequest "https://update.electronjs.org/silvaleo1979/verifai-desktop/win32-x64/1.0.0"
```

---

## 🎯 Resumo Rápido

1. **Acesse**: https://github.com/silvaleo1979/verifai-desktop/releases
2. **Baixe**: `VerifAI.Assistant-1.0.0.Setup.exe`
3. **Execute**: O instalador
4. **Configure**: Suas APIs
5. **Use**: O sistema de atualização automática

**Pronto! O VerifAI Desktop está instalado e pronto para uso!** 🎉
