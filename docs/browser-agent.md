# Browser Agent (headful)

Este recurso adiciona um navegador controlável via Playwright para agentes e uso manual.

## O que foi adicionado
- Tool `browser` (multi-tool) com ações: `browser_open`, `browser_click`, `browser_type`, `browser_press_enter`, `browser_wait_selector`, `browser_extract_text`, `browser_screenshot`.
- Nova ação `browser_observe` para snapshot rápido (título, URL, texto visível truncado; screenshot opcional, desativado por padrão).
- Serviço Playwright headful gerencia sessões, limpeza ao fechar e limites de domínio/timeout.
- UI no Agent Forge: iniciar/encerrar sessão web (janela Chromium visível para interação manual ou pelo agente).
- Configurações em `Configurações > Plugins > Web Browser`.

## Configuração
- Domínios permitidos: lista de domínios autorizados (vazio = todos).
- Timeout por ação (ms): padrão 15000.
- Capturas de tela: pode ser desabilitado.
- Headless: opcional (por padrão abre janela visível).
- Tamanho máximo do texto extraído: padrão 6000, texto é normalizado/trimado antes de ser truncado.

## Como usar na Forja de Agentes
1) Ative o plugin “Web Browser” em Configurações.
2) Na Forja, crie/edite um agente e inclua as ferramentas desejadas (ex.: `browser_open`, `browser_click`, `browser_type`, `browser_wait_selector`, `browser_extract_text`, `browser_screenshot`).
3) Rode o agente. A primeira chamada cria uma sessão Playwright. A janela headful pode ser usada manualmente; o agente compartilha a mesma sessão.
4) No topo da Forja há um bloco “Sessão web (beta)” para iniciar/encerrar manualmente a sessão compartilhada (útil para testes ou uso manual).

### Exemplo de roteiro (Amazon)
1. `browser_open` com url `https://www.amazon.com/`.
2. `browser_click` com texto/selector “Livros”.
3. `browser_type` no campo de busca com “Agatha Christie”.
4. `browser_press_enter` ou `browser_click` no botão de busca.
5. `browser_extract_text` na lista de resultados e geração de HTML no passo seguinte do agente.

## Observabilidade e guardrails
- Logs: criação/fechamento de sessão e cada ação são registrados via `electron-log`.
- Guardrails: whitelist de domínios, timeout por ação, limite de texto extraído, política de screenshots.
- Sessão: contexto isolado por sessão; ao encerrar, cookies/storage são descartados.
- Extra: `includeScreenshot` pode ser passado na action para anexar screenshot ao resultado (respeita política de screenshots). `browser_screenshot` agora permite `fullPage: true`, mas por padrão captura só o viewport (JPEG, qualidade 60) para reduzir payload.
- Persistência: a sessão do navegador tenta ser reutilizada por chat/run (salva `lastSessionId` localmente).

## Validação rápida (Amazon, headless)
- Script de fumaça (ts-node) abriu `amazon.com`, navegou para a categoria de livros, buscou “Agatha Christie” e extraiu texto com screenshot base64 (headless).
- Uma tentativa de clicar “Books” por texto simples falhou por elemento não visível; navegar direto para a URL de livros funcionou. Recomenda-se usar seletores/URLs diretas ou waits específicos.


