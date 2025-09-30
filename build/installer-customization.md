# Personalização do Instalador VerifAI Desktop

## Alterações Realizadas

### 1. Configuração do Squirrel (forge.config.ts)
- **Ícone**: `verifai-icon.ico` da pasta assets
- **Nome**: "VerifAI Desktop"
- **Descrição**: "Assistente de IA Personalizado"
- **Autor**: "VerifAI"
- **URL de Atualizações**: GitHub releases

### 2. Cores da Marca VerifAI
- **Primária**: #0066CC (Azul VerifAI)
- **Secundária**: #FFFFFF (Branco)
- **Acento**: #003366 (Azul escuro)
- **Texto**: #333333 (Cinza escuro)
- **Fundo**: #FFFFFF (Branco)

### 3. Arquivos de Configuração
- `build/squirrel-config.json` - Configuração personalizada
- `assets/verifai-icon.ico` - Ícone do instalador

## Resultado Esperado

A tela do instalador Windows agora terá:
- Logo VerifAI no cabeçalho
- Cores azul e branco da marca
- Nome "VerifAI Desktop" em vez de "Witsy"
- Descrição personalizada
- Barra de progresso com cores da marca

## Próximos Passos

Para aplicar as alterações:
1. Executar `npm run build:verifai:win`
2. Verificar o instalador gerado em `out/make/squirrel.windows/x64/`
3. Testar a instalação






