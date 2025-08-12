# VerifAI Assistant

<div align="center">

  <img src="assets/logoverifai.svg" width="128" alt="VerifAI Logo">
  <div><b>VerifAI Assistant</b></div>
  <div>Assistente de IA Personalizado<br/>Baseado no Witsy</div>

</div>

## Sobre

O **VerifAI Assistant** é uma versão personalizada do Witsy, um assistente de IA desktop desenvolvido especificamente para atender às necessidades da VerifAI. 

### Características Principais

- **Interface personalizada** com as cores e identidade visual da VerifAI
- **Configurações pré-definidas** otimizadas para o ambiente corporativo
- **Instruções customizadas** alinhadas com os valores da VerifAI
- **Suporte completo** a múltiplos provedores de IA
- **Funcionalidades avançadas** como chat, geração de imagens, transcrição e mais

### Funcionalidades

- 💬 **Chat Inteligente** com múltiplos provedores de IA
- 🎨 **Geração de Imagens** com DALL-E, Google Imagen e outros
- 🎥 **Geração de Vídeos** com Replicate e fal.ai
- 🎤 **Transcrição de Áudio** com Whisper e outros modelos
- 🔊 **Text-to-Speech** com ElevenLabs e outros
- 🔍 **Busca na Web** integrada
- 📁 **Chat com Documentos** (RAG)
- 🛠️ **Plugins Extensíveis** para funcionalidades adicionais

## Instalação

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Chaves de API dos provedores de IA desejados

### Desenvolvimento

```bash
# Clonar o repositório
git clone [URL_DO_REPOSITORIO]

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm start
```

### Build para Produção

```bash
# Build para Windows
npm run make

# Build para macOS
npm run make -- --platform=darwin

# Build para Linux
npm run make -- --platform=linux
```

## Configuração

### 1. Configurar Provedores de IA

Acesse as configurações do aplicativo e adicione suas chaves de API:

- **OpenAI**: Para GPT-4, DALL-E, Whisper
- **Anthropic**: Para Claude
- **Google**: Para Gemini
- **Ollama**: Para modelos locais
- **Outros**: Conforme necessário

### 2. Personalizar Instruções

O assistente vem pré-configurado com instruções personalizadas para a VerifAI. Você pode modificar essas instruções em:

```
defaults/settings-verifai.json
```

### 3. Configurar Plugins

Habilite e configure os plugins necessários:

- **Search**: Para busca na web
- **Filesystem**: Para acesso a arquivos locais
- **Memory**: Para memória de longo prazo
- **MCP**: Para servidores MCP personalizados

## Personalização

### Cores e Temas

As cores da VerifAI estão definidas em:

```
css/themes/verifai.css
```

Para modificar as cores, edite as variáveis CSS:

```css
:root {
  --verifai-primary: #007bff;      /* Cor principal */
  --verifai-secondary: #424242;    /* Cor secundária */
  --verifai-accent: #e3f2fd;       /* Cor de destaque */
  /* ... outras cores */
}
```

### Logo e Ícones

O logo da VerifAI já está configurado em:

```
assets/logoverifai.svg
```

O logo está pronto para uso e não precisa de modificações.

### Configurações Padrão

Modifique as configurações padrão em:

```
defaults/settings-verifai.json
```

## Suporte

Para suporte técnico, entre em contato:

- **Email**: suporte@verifai.com
- **Telefone**: [Número de telefone]
- **Documentação**: [Link para documentação]

## Licença

Este software é baseado no Witsy (Apache 2.0) e foi personalizado para VerifAI.

## Changelog

### v1.0.0
- Versão inicial personalizada para VerifAI
- Interface customizada com cores da VerifAI
- Configurações pré-definidas otimizadas
- Instruções personalizadas do assistente

---

**Desenvolvido para VerifAI** 🚀 