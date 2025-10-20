# 🚀 Como Criar uma Release - VerifAI Desktop

## ⚠️ PROBLEMAS ENCONTRADOS E CORRIGIDOS

Os scripts de build estavam usando nomes antigos "Witsy". **JÁ FORAM CORRIGIDOS!**

**✅ Correções aplicadas:**
- `build/build.ps1` - Nomes atualizados para VerifAI
- `build/publish.ps1` - Nomes atualizados para VerifAI

---

## 🎯 Processo Manual de Release

### **Pré-requisitos (instalar uma vez):**

```powershell
# Instalar GitHub CLI
winget install --id GitHub.cli

# Autenticar
gh auth login
```

---

### **Passo a Passo:**

#### **1. Atualizar versão no `package.json`**

```json
{
  "version": "1.0.2"  👈 Mudar aqui (era 1.0.1)
}
```

#### **2. Atualizar `CHANGELOG.md`**

Adicione no topo:

```markdown
## [1.0.2] - 2025-01-20

### Added
- Nova funcionalidade X

### Fixed
- Bug Y corrigido
```

#### **3. Commit e push**

```powershell
git add package.json CHANGELOG.md
git commit -m "chore: Release v1.0.2"
git push origin master
```

#### **4. Criar tag**

```powershell
git tag -a v1.0.2 -m "Release v1.0.2"
git push origin v1.0.2
```

#### **5. Build**

```powershell
.\build\build.ps1
```

**Arquivos gerados em `out/make/squirrel.windows/x64/`:**
- ✅ `VerifAI-1.0.2-win32-x64.Setup.exe`
- ✅ `verifai-1.0.2-win32-x64-full.nupkg`
- ✅ `RELEASES`

**E em `out/make/zip/win32/x64/`:**
- ✅ `VerifAI-1.0.2-win32-x64.zip`

#### **6. Criar release no GitHub**

**Opção A - Via GitHub CLI (recomendado):**

```powershell
gh release create v1.0.2 `
  --title "VerifAI Desktop v1.0.2" `
  --notes "Veja CHANGELOG.md para detalhes" `
  out\make\squirrel.windows\x64\VerifAI-1.0.2-win32-x64.Setup.exe `
  out\make\squirrel.windows\x64\verifai-1.0.2-win32-x64-full.nupkg `
  out\make\squirrel.windows\x64\RELEASES `
  out\make\zip\win32\x64\VerifAI-1.0.2-win32-x64.zip
```

**Opção B - Via navegador:**

1. Acesse: https://github.com/silvaleo1979/verifai-desktop/releases/new
2. Tag: `v1.0.2`
3. Title: `VerifAI Desktop v1.0.2`
4. Faça upload dos 4 arquivos acima
5. Clique em "Publish release"

---

## ✅ Atualização Automática - Status

### **Configuração (forge.config.ts):**

```typescript
new MakerSquirrel({
  name: 'VerifAI-Desktop',  ✅ Correto
  exe: 'VerifAI.exe',       ✅ Correto
  setupExe: 'VerifAI Desktop Setup.exe',  ✅ Correto
  remoteReleases: 'https://github.com/silvaleo1979/verifai-desktop/releases/latest/download',  ✅ Correto
})
```

### **Verificação do Sistema:**

```typescript
// src/main/autoupdate.ts
const feed = `${server}/silvaleo1979/verifai-desktop/${process.platform}-${process.arch}/${this.app.getVersion()}`
```

**✅ URL de atualização:** https://update.electronjs.org/silvaleo1979/verifai-desktop/win32-x64/1.0.1

### **Arquivos Obrigatórios na Release:**

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `RELEASES` | ✅ Obrigatório | Metadados do Squirrel |
| `verifai-*-full.nupkg` | ✅ Obrigatório | Pacote de atualização |
| `VerifAI-*.Setup.exe` | 📦 Opcional | Instalador completo |
| `VerifAI-*.zip` | 📦 Opcional | Versão portátil |

### **Como Funciona:**

1. **Verificação:** A cada 1 hora + ao iniciar
2. **Download:** Automático em background
3. **Notificação:** Ícone no tray + menu
4. **Instalação:** Usuário clica em "Instalar Atualização"

---

## 🔍 Testar Atualização

1. Instale versão 1.0.1
2. Publique release 1.0.2
3. Aguarde ou force: **Menu > Ajuda > Verificar Atualizações**
4. Deve aparecer notificação de atualização

---

## ⚠️ IMPORTANTE - Nomenclatura dos Arquivos

**O arquivo `.nupkg` DEVE seguir o padrão do Squirrel:**

```
verifai-1.0.2-win32-x64-full.nupkg
^nome  ^versão ^plat  ^arq ^tipo
```

**Nome base:** Deve corresponder ao `name` em `forge.config.ts` (em minúsculas):
- ✅ `VerifAI-Desktop` → `verifai-desktop-...`
- ✅ Ou simplificado: `verifai-...`

**Scripts corrigidos usam:** `verifai-$version-win32-$architecture-full.nupkg` ✅

---

## 📝 Checklist de Release

- [ ] Versão atualizada em `package.json`
- [ ] `CHANGELOG.md` atualizado
- [ ] Commit e push feitos
- [ ] Tag criada e enviada
- [ ] Build executado com sucesso
- [ ] 4 arquivos gerados corretamente
- [ ] Release criada no GitHub
- [ ] Arquivos enviados para a release
- [ ] Release marcada como "Latest"
- [ ] Testar atualização em versão anterior

---

## 🐛 Problemas Corrigidos

### **Problema 1: Nomes de arquivos errados**
❌ **Antes:** `Witsy-1.0.2-win32-x64.Setup.exe`  
✅ **Depois:** `VerifAI-1.0.2-win32-x64.Setup.exe`

❌ **Antes:** `witsy-1.0.2-win32-x64-full.nupkg`  
✅ **Depois:** `verifai-1.0.2-win32-x64-full.nupkg`

### **Problema 2: Scripts de publicação**
✅ `build/build.ps1` - Corrigido
✅ `build/publish.ps1` - Corrigido

---

## 🎯 Exemplo Completo - v1.1.0

```powershell
# 1. Editar package.json
# "version": "1.1.0"

# 2. Atualizar CHANGELOG.md

# 3. Commit
git add package.json CHANGELOG.md
git commit -m "chore: Release v1.1.0 - MCP-UI completo"
git push

# 4. Tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# 5. Build
.\build\build.ps1

# 6. Release
gh release create v1.1.0 `
  --title "VerifAI Desktop v1.1.0 - MCP-UI Completo" `
  --notes "## Novidades
- Sistema completo de Widgets MCP-UI
- Visualização fullscreen
- Download de widgets
- Interatividade total" `
  out\make\squirrel.windows\x64\VerifAI-1.1.0-win32-x64.Setup.exe `
  out\make\squirrel.windows\x64\verifai-1.1.0-win32-x64-full.nupkg `
  out\make\squirrel.windows\x64\RELEASES `
  out\make\zip\win32\x64\VerifAI-1.1.0-win32-x64.zip
```

---

## ✅ Resumo

**Sistema de atualização automática:** ✅ FUNCIONANDO  
**Scripts corrigidos:** ✅ SIM  
**Nomenclatura:** ✅ CORRETA  
**Pronto para criar releases:** ✅ SIM

---

**Última verificação:** Janeiro 2025

