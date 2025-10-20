# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-01-20

### Added
- ✨ Sistema completo de Widgets MCP-UI interativos
- 🎨 Visualização em tela cheia (Fullscreen modal) para widgets
- 📥 Download de widgets como HTML standalone
- 🔄 Interatividade total com callbacks (send_message, call_tool, etc)
- 📱 Botões de fullscreen e download sempre visíveis em widgets
- 🎯 Comunicação bidirecional via postMessage
- 🔒 Sandbox de segurança para iframes
- 📐 Dimensionamento dinâmico de widgets via metadados

### Changed
- 🔧 Melhorias no processamento de recursos MCP
- 📦 Atualização de dependências do sistema
- 🎨 Aprimoramentos na renderização de conteúdo

### Fixed
- 🐛 Correção de botões não aparecendo em widgets sem título
- 🔒 Melhorias de segurança em iframes sandboxed
- 🎨 Correções de UI em modo dark/light
- ⚙️ Ajustes em scripts de build para nomenclatura correta

### Documentation
- 📚 Documentação completa de MCP-UI (IMPLEMENTACAO-MCP-UI.md)
- 📖 Guias de interatividade (MCP-UI-INTERACTIVITY.md)
- 🎯 Guia de fullscreen e download (MCP-UI-FULLSCREEN-DOWNLOAD.md)
- 🔧 Documentação de correções (MCP-UI-BUTTONS-FIX.md)

## [2.12.3] - 2025-07-28

### Added
- N/A

### Changed
- N/A

### Fixed
- N/A

### Removed
- Soniox STT support (https://github.com/nbonamy/witsy/issues/355)


## [2.12.2] - 2025-07-27

### Added
- Tooltips (https://github.com/nbonamy/witsy/discussions/344)
- OpenAI responses API integration (https://github.com/nbonamy/witsy/issues/338)
- Allow specifying allowed providers for OpenRouter (https://github.com/nbonamy/witsy/issues/350)
- Soniox STT (https://github.com/nbonamy/witsy/pull/353) 

### Changed
- Specific models to create chat title
- Allow empty prompts with attachments (https://github.com/nbonamy/witsy/pull/351)

### Fixed
- Create / edit commands : cannot create new line (https://github.com/nbonamy/witsy/issues/348)

### Removed
- N/A


## [2.12.1] - 2025-07-23

### Added
- Google video creation
- Mistral Voxtral STT models support (@ljbred08)
- Support for New Gemini Embedding model (https://github.com/nbonamy/witsy/issues/322)

### Changed
- N/A

### Fixed
- xAI image generation
- STT/Whisper: "language" parameter should not be sent (https://github.com/nbonamy/witsy/issues/340)
- Gladia STT: Maximum Call stack size exceeded (https://github.com/nbonamy/witsy/issues/341)

### Removed
- N/A


## [2.12.0] - 2025-07-20

### Added
- Add, Edit & Delete System Prompts (https://github.com/nbonamy/witsy/issues/308)
- Backup/Restore of data and settings
- Onboarding experience
- Japanese localization (https://github.com/nbonamy/witsy/pull/326)
- Design Studio image drop and image paste
- Design Studio prompt library

### Changed
- Document Repository UI update 

### Fixed
- Design Studio History label overflow fix
- Duplicated models (https://github.com/nbonamy/witsy/issues/331)
- Ctrl+Shift+C does not copy transcript and close transcript window (https://github.com/nbonamy/witsy/issues/336)
- Error when using Eleven Labs for Transcription (https://github.com/nbonamy/witsy/issues/335)
- Wrong position of delete shortcut buttons at shortcut settings (https://github.com/nbonamy/witsy/issues/334)
- Mermaid chart fixes and improvements (https://github.com/nbonamy/witsy/issues/333)
- Google image generation

### Removed
- Google image edit ([not supported by Google API](https://github.com/googleapis/js-genai/blob/36a14e4e05e8808ba65ed392b869be7d9840220b/src/models.ts#L985))


## [2.11.2] - 2025-07-14

### Added
- N/A

### Changed
- N/A 

### Fixed
- xAI function calling (https://github.com/nbonamy/witsy/issues/317)
- Settings Commands and Experts display issue

### Removed
- N/A


## [2.11.1] - 2025-07-14

### Added
- Support for Elevenlabs custom voices (https://github.com/nbonamy/witsy/issues/313)
- MCP Server label (https://github.com/nbonamy/witsy/pull/303)
- Exa native search engine (https://github.com/nbonamy/witsy/issues/310)

### Changed
- N/A 

### Fixed
- MCP Server start when using Nushell (https://github.com/nbonamy/witsy/issues/315) 

### Removed
- N/A


## [2.11.0] - 2025-07-07

### Added
- Custom HTTP Headers for MCP Streamable
- File upload for transcriptions (with dropzone)
- Summarize/Translate/Run AI command for transcription
- Drag and drop to attach files

### Changed
- N/A 

### Fixed
- N/A 

### Removed
- N/A


## [2.10.0] - 2025-07-03

### Added
- DeepResearch
- Fileystem plugin to read/write local files

### Changed
- Text headings font size and spacing 

### Fixed
- PDF export when tools displayed
- Fullscreen exit requiring multiple clicks
- YouTube transcript download
- Duplicate MCP servers sent to model ([#302](https://github.com/nbonamy/witsy/issues/302))

### Removed
- N/A
