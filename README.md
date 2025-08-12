# VerifAI Desktop

Versão customizada do Witsy Desktop - uma aplicação desktop para IA conversacional desenvolvida pela VerifAI.

## 🚀 Sobre o Projeto

O VerifAI Desktop é uma aplicação Electron que serve como um assistente de IA conversacional universal, integrando múltiplos provedores de LLM (Large Language Models) e oferecendo recursos avançados como:

- 💬 **Chat conversacional** com múltiplos provedores de IA
- 🎨 **Geração de imagens** com diferentes modelos
- 🎤 **Síntese de voz** (text-to-speech)
- 🎧 **Reconhecimento de voz** (speech-to-text)
- 📄 **Busca em documentos** (RAG - Retrieval Augmented Generation)
- 🤖 **Automação** com "Prompt Anywhere" e comandos de IA
- 🔌 **Sistema de plugins** extensível
- 🌐 **Suporte a MCP** (Model Context Protocol)

## 🛠️ Tecnologias

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Electron + Node.js
- **Build**: Electron Forge
- **Testes**: Vitest + Playwright
- **Estilização**: CSS customizado com variáveis

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Desenvolvimento
```bash
# Clone o repositório
git clone https://github.com/silvaleo1979/verifai-desktop.git
cd verifai-desktop

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm start
```

### Build para Produção
```bash
# Build para Windows
npm run build:verifai:win

# Build para macOS
npm run build:verifai:mac

# Build para Linux
npm run build:verifai:linux
```

## 🎯 Executáveis Disponíveis

Os executáveis compilados estão disponíveis na pasta `out/make/`:

- **Instalador Windows**: `out/make/squirrel.windows/x64/VerifAI Assistant-1.0.0 Setup.exe`
- **Versão Portátil**: `out/make/zip/win32/x64/VerifAI Assistant-win32-x64-1.0.0.zip`

## 🔧 Configuração

O aplicativo suporta múltiplos provedores de IA:

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Mistral AI
- Groq
- Ollama (local)
- E muitos outros...

Configure suas chaves de API nas configurações do aplicativo.

## 🧪 Testes

```bash
# Testes unitários
npm test

# Testes com cobertura
npm run test-ci

# Interface de testes
npm run testui
```

## 📁 Estrutura do Projeto

```
src/
├── main/           # Processo principal do Electron
├── screens/        # Telas da aplicação
├── components/     # Componentes Vue reutilizáveis
├── services/       # Serviços e lógica de negócio
├── llms/          # Integração com provedores de LLM
├── plugins/       # Sistema de plugins
├── automations/   # Automações e comandos
└── types/         # Definições TypeScript
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença Apache 2.0 - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Autores

- **VerifAI** - [contato@verifai.com](mailto:contato@verifai.com)

## 🙏 Agradecimentos

- Baseado no projeto [Witsy](https://github.com/nbonamy/witsy) por Nicolas Bonamy
- Comunidade open source que contribuiu para este projeto

---

**VerifAI Desktop** - Transformando a forma como você interage com IA
