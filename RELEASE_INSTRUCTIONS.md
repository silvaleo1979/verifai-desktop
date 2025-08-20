# Instruções para Criar Release no GitHub

## 📦 Arquivos de Build Gerados

Os seguintes arquivos foram gerados na pasta `out/make/`:

### Windows (x64)
- **Instalador**: `out/make/squirrel.windows/x64/VerifAI Assistant-1.0.0 Setup.exe`
- **Package**: `out/make/squirrel.windows/x64/witsy_verifai-1.0.0-full.nupkg`
- **RELEASES**: `out/make/squirrel.windows/x64/RELEASES`
- **Portátil**: `out/make/zip/win32/x64/VerifAI Assistant-win32-x64-1.0.0.zip`

## 🚀 Como Criar o Release

### 1. Acesse o GitHub
- Vá para: https://github.com/silvaleo1979/verifai-desktop
- Clique em "Releases" no menu lateral

### 2. Criar Novo Release
- Clique em "Create a new release"
- **Tag version**: `v1.0.0`
- **Release title**: `VerifAI Desktop v1.0.0`
- **Description**: 
```
## VerifAI Desktop v1.0.0

### ✨ Novidades
- Sistema de atualização automática configurado
- Interface personalizada da VerifAI
- Suporte completo a múltiplos provedores de IA

### 🔧 Melhorias
- Configuração de repositório corrigida
- Menu de atualizações habilitado
- Sistema de notificações funcionando

### 📥 Downloads
- **Windows**: Instalador e versão portátil disponíveis
- **macOS**: Em breve
- **Linux**: Em breve
```

### 3. Fazer Upload dos Arquivos
**IMPORTANTE**: Faça upload dos seguintes arquivos:

#### Para Windows:
1. `out/make/squirrel.windows/x64/VerifAI Assistant-1.0.0 Setup.exe`
2. `out/make/squirrel.windows/x64/witsy_verifai-1.0.0-full.nupkg`
3. `out/make/zip/win32/x64/VerifAI Assistant-win32-x64-1.0.0.zip`

### 4. Publicar Release
- Marque como "Latest release"
- Clique em "Publish release"

## 🔄 Sistema de Atualização

Após criar o release, o sistema de atualização funcionará automaticamente:

1. **URL de consulta**: `https://update.electronjs.org/silvaleo1979/verifai-desktop/win32-x64/1.0.0`
2. **Detecção automática**: O update.electronjs.org detectará o novo release
3. **Download automático**: Usuários receberão notificação de atualização
4. **Instalação**: Atualização será baixada e instalada automaticamente

## 📋 Checklist

- [ ] Criar release no GitHub
- [ ] Fazer upload dos arquivos de build
- [ ] Marcar como "Latest release"
- [ ] Testar sistema de atualização
- [ ] Verificar se o update.electronjs.org detecta o release

## 🧪 Teste do Sistema

Para testar se o sistema está funcionando:

1. Instale a versão atual (1.0.0)
2. Crie um release com versão 1.0.1
3. O app deve detectar a nova versão automaticamente
4. Usuário deve receber notificação de atualização disponível

## 📝 Notas Importantes

- Os arquivos de build são grandes (>300MB) e devem ser enviados via GitHub Releases
- O update.electronjs.org funciona automaticamente, sem necessidade de configuração
- O sistema verifica atualizações a cada hora
- Usuários podem verificar manualmente via menu "Check for Updates"
