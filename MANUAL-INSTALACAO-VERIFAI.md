# 📋 Manual de Instalação - VerifAI Desktop

<div align="center">

<img src="assets/logoverifai.svg" width="128" alt="VerifAI Logo">

**VerifAI Desktop**  
*Assistente de IA Personalizado*

**Versão:** 1.0.1  
**Data:** Janeiro 2025

</div>

---

## 📑 Índice

1. [Visão Geral](#-visão-geral)
2. [Requisitos do Sistema](#️-requisitos-do-sistema)
3. [Pré-requisitos de Rede](#-pré-requisitos-de-rede)
4. [Procedimento de Instalação](#-procedimento-de-instalação)
5. [Configuração Inicial](#-configuração-inicial)
6. [Licença de Uso](#-licença-de-uso)
7. [Solução de Problemas](#️-solução-de-problemas)


---

## 🎯 Visão Geral

O **VerifAI Desktop** é um assistente de IA conversacional avançado desenvolvido especificamente para atender às necessidades corporativas da VerifAI. O aplicativo oferece:

- 💬 **Chat inteligente** com múltiplos provedores de IA
- 🔍 **Busca na web** integrada
- 📁 **Chat com documentos** (RAG)
- 🛠️ **Plugins extensíveis** para funcionalidades adicionais

---

## ⚙️ Requisitos do Sistema

### **Requisitos Mínimos**

| Componente | Especificação |
|------------|---------------|
| **Sistema Operacional** | Windows 10 (64-bit) ou superior |
| **Processador** | Intel/AMD 1.8 GHz ou superior |
| **Memória RAM** | 4 GB |
| **Espaço em Disco** | 500 MB livres |
| **Rede** | Conexão com internet para atualizações |
| **Resolução** | 1024x768 ou superior |

### **Requisitos Recomendados**

| Componente | Especificação |
|------------|---------------|
| **Sistema Operacional** | Windows 11 |
| **Processador** | Intel/AMD 2.5 GHz ou superior |
| **Memória RAM** | 8 GB ou mais |
| **Espaço em Disco** | 1 GB livres |
| **Rede** | Conexão estável com internet (banda larga) |
| **Resolução** | 1920x1080 ou superior |

### **Dependências do Sistema**

- **Visual C++ Redistributable** (instalado automaticamente)
- **Windows Defender** ou antivírus compatível
- **Permissões de administrador** (apenas para instalação)

---

## 🌐 Pré-requisitos de Rede

### **Conexões de Internet Obrigatórias**

O VerifAI Desktop requer acesso à internet para as seguintes funcionalidades:



#### **1. APIs de Provedores de IA**

| Provedor | URL Base | Porta | Descrição |
|----------|----------|-------|-----------|
| **OpenAI** | `https://api.openai.com` | 443 | GPT-4 
| **Anthropic** | `https://api.anthropic.com` | 443 | Claude |
| **Google** | `https://generativelanguage.googleapis.com` | 443 | Gemini |
| **Groq** | `https://api.groq.com` | 443 | Modelos rápidos |
| **DeepSeek** | `https://api.deepseek.com` | 443 | DeepSeek |


#### **2. Serviços Opcionais**

| Serviço | URL | Porta | Descrição |
|---------|-----|-------|-----------|
| **Ollama** | `http://localhost:11434` | 11434 | Modelos locais (opcional) |

### **Configurações de Firewall**

Para funcionamento completo, libere as seguintes portas:

- **Porta 443 (HTTPS)**: Para todas as APIs de IA
- **Porta 80 (HTTP)**: Para redirecionamentos

### **Proxy Corporativo**

Se sua organização utiliza proxy corporativo:

1. Configure as variáveis de ambiente:
   ```
   HTTP_PROXY=http://proxy.empresa.com:8080
   HTTPS_PROXY=http://proxy.empresa.com:8080
   ```

---

## 🚀 Procedimento de Instalação

### **Método 1: Instalação Manual (Recomendado)**

#### **Passo 1: Download**
1. Baixe o arquivo: `VerifAI.Assistant-1.0.1.Setup.exe`

#### **Passo 2: Execução**
1. **Clique com botão direito** no arquivo baixado
2. Selecione **"Executar como administrador"**
3. Clique em **"Sim"** quando solicitado pelo UAC

#### **Passo 3: Instalação**
1. Siga o assistente de instalação
2. Aceite os termos de licença
3. Escolha o diretório de instalação (padrão: `C:\Program Files\VerifAI Desktop`)
4. Aguarde a conclusão da instalação

#### **Passo 4: Verificação**
1. O aplicativo será iniciado automaticamente
2. Verifique se o ícone aparece na área de trabalho
3. Confirme a presença no menu Iniciar

### **Método 2: Instalação Automática (Script)**

#### **Opção A: PowerShell**
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

#### **Opção B: Batch**
```batch
# Baixar e executar
curl -o install-verifai.bat https://raw.githubusercontent.com/silvaleo1979/verifai-desktop/main/install-verifai.bat
install-verifai.bat
```

### **Método 3: Versão Portátil**

Para instalação sem privilégios administrativos:

1. Baixe: `VerifAI.Assistant-win32-x64-1.0.1.zip`
2. Extraia para uma pasta de sua escolha
3. Execute `VerifAI.exe` diretamente

**Nota**: A versão portátil não possui atualizações automáticas.

---

## ⚙️ Configuração Inicial

### **1. Primeira Execução**

1. **Execute** o VerifAI Desktop
2. **Aceite** os termos de uso
3. **Configure** suas preferências básicas

### **2. Configuração de APIs**

#### **Acessar Configurações**
- Vá em **Settings** → **Engines**
- Ou use o atalho: `Ctrl + ,`

#### **Provedores Principais**

| Provedor | Chave de API | Onde Obter |
|----------|--------------|------------|
| **OpenAI** | `sk-...` | https://platform.openai.com/api-keys |
| **Anthropic** | `sk-ant-...` | https://console.anthropic.com/ |
| **Google** | `AIza...` | https://makersuite.google.com/app/apikey |
| **Groq** | `gsk_...` | https://console.groq.com/keys |
| **Mistral AI** | `...` | https://console.mistral.ai/ |

#### **Configuração de Chaves**
1. Clique no provedor desejado
2. Cole sua chave de API
3. Clique em **"Test Connection"**
4. Aguarde a confirmação de sucesso

### **3. Configuração de Plugins**

#### **Plugins Essenciais**
- **Search**: Para busca na web
- **Filesystem**: Para acesso a arquivos locais
- **Memory**: Para memória de longo prazo

#### **Ativação**
1. Vá em **Settings** → **Plugins**
2. Ative os plugins necessários
3. Configure as opções específicas

### **4. Personalização**

#### **Temas e Aparência**
- Vá em **Settings** → **Appearance**
- Escolha entre tema claro/escuro
- Personalize cores e fontes

#### **Atalhos de Teclado**
- Vá em **Settings** → **Shortcuts**
- Configure atalhos personalizados

---

## 📄 Licença de Uso

### **Licença Proprietária T2C Group**

O **VerifAI Desktop** é propriedade da **T2C Group** e é distribuído sob uma licença proprietária. Este software foi desenvolvido com base no projeto original licenciado sob Apache 2.0, mas as modificações e customizações são de propriedade exclusiva da T2C Group.

#### **⚠️ Restrições Importantes**
- ❌ **Uso não autorizado** é expressamente proibido
- ❌ **Distribuição** sem autorização da T2C Group é proibida
- ❌ **Modificação** do código fonte é proibida
- ❌ **Engenharia reversa** é proibida
- ❌ **Uso comercial** sem licença específica é proibido

#### **✅ Uso Autorizado**
- ✅ **Uso interno** da T2C Group e suas subsidiárias
- ✅ **Uso por clientes** com contrato de licenciamento válido
- ✅ **Uso em demonstrações** com autorização prévia
- ✅ **Uso para desenvolvimento** com licença de desenvolvedor

### **Menções Obrigatórias da Licença Apache Original**

Conforme exigido pela Licença Apache 2.0 do projeto original:

#### **Aviso de Copyright Original**
```
Copyright 2024, Nicolas Bonamy

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

#### **Aviso de Copyright T2C Group**
```
Copyright 2025, T2C Group

This software contains modifications and customizations that are proprietary
to T2C Group. All rights reserved.

The original software was licensed under the Apache License, Version 2.0.
This modified version is distributed under a proprietary license by T2C Group.
```

### **Compliance e Auditoria**

Para ambientes corporativos que requerem compliance:

1. **Auditoria de Código**: Código fonte disponível apenas para licenciados
2. **Dependências**: Lista completa em `package.json` (conforme Apache 2.0)
3. **Licenças**: Todas as dependências listadas em `CREDITS.md`
4. **Segurança**: Sem telemetria ou coleta de dados não autorizada
5. **Licenciamento**: Contrato de licença específico com T2C Group


### **Violação de Licença**

O uso não autorizado do VerifAI Desktop constitui violação de direitos autorais e propriedade intelectual da T2C Group, sujeito às penalidades legais aplicáveis.

---

## 🛠️ Solução de Problemas

### **Problemas de Instalação**

#### **Erro: "Acesso Negado"**
```powershell
# Solução: Execute como administrador
# Clique com botão direito → "Executar como administrador"
```

#### **Erro: "Antivírus Bloqueou"**
1. Adicione exceção no antivírus para:
   - `C:\Program Files\VerifAI Desktop\`
   - `%APPDATA%\VerifAI Desktop\`
2. Desative temporariamente o antivírus durante a instalação

#### **Erro: "Espaço Insuficiente"**
```powershell
# Verificar espaço disponível
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}
```

### **Problemas de Rede**

#### **Erro: "Falha na Conexão"**
```powershell
# Testar conectividade
Test-NetConnection api.openai.com -Port 443
Test-NetConnection github.com -Port 443
```

#### **Erro: "Proxy Required"**
1. Configure proxy nas configurações do Windows
2. Ou configure no aplicativo: **Settings** → **Network**

#### **Erro: "Firewall Bloqueou"**
```powershell
# Liberar porta no firewall
New-NetFirewallRule -DisplayName "VerifAI Desktop" -Direction Outbound -Protocol TCP -LocalPort 443 -Action Allow
```

### **Problemas de API**

#### **Erro: "API Key Inválida"**
1. Verifique se a chave está correta
2. Confirme se a chave tem créditos/permissões
3. Teste a chave no site do provedor

#### **Erro: "Rate Limit Exceeded"**
1. Aguarde alguns minutos
2. Verifique limites da sua conta
3. Considere upgrade do plano

#### **Erro: "Modelo Não Disponível"**
1. Verifique se o modelo está disponível
2. Tente um modelo alternativo
3. Confirme permissões da API

### **Problemas de Performance**

#### **Aplicativo Lento**
1. Feche outros aplicativos
2. Verifique uso de RAM
3. Reinicie o aplicativo

#### **Respostas Lentas**
1. Verifique conexão com internet
2. Tente um provedor diferente
3. Use modelos mais rápidos

### **Logs e Diagnóstico**

#### **Localização dos Logs**
```
%APPDATA%\VerifAI Desktop\logs\
```

#### **Comandos de Diagnóstico**
```powershell
# Verificar instalação
Get-ChildItem "C:\Program Files\VerifAI Desktop" -ErrorAction SilentlyContinue

# Verificar logs
Get-ChildItem "$env:APPDATA\VerifAI Desktop\logs" -ErrorAction SilentlyContinue

# Testar atualizações
Invoke-WebRequest "https://github.com/silvaleo1979/verifai-desktop/releases/latest"
```

<div align="center">

**VerifAI Desktop v1.0.1**  
*Desenvolvido pela T2C Group*

**© 2025 T2C Group. Todos os direitos reservados.**

</div>
