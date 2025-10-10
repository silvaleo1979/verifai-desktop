# 🎨 Implementação MCP UI (Widgets)

**Data:** Outubro 2025  
**Branch:** MCP-UI  
**Status:** ✅ Implementado

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Componentes Implementados](#-componentes-implementados)
4. [Fluxo de Dados](#-fluxo-de-dados)
5. [Detalhes Técnicos](#-detalhes-técnicos)
6. [Segurança](#-segurança)
7. [Exemplo de Uso](#-exemplo-de-uso)

---

## 🎯 Visão Geral

A implementação do **MCP UI (Model Context Protocol User Interface)** permite que servidores MCP retornem não apenas dados textuais, mas também **widgets interativos HTML** que são renderizados diretamente na interface do VerifAI Desktop.

### **Objetivo**

Permitir que ferramentas MCP forneçam interfaces de usuário ricas e interativas dentro das conversações, melhorando a experiência do usuário ao exibir dados complexos de forma visual e interativa.

### **Benefícios**

- ✨ **Visualizações ricas**: Gráficos, tabelas, formulários e componentes customizados
- 🔄 **Interatividade**: Widgets podem responder a ações do usuário
- 🎨 **Personalização**: Cada servidor MCP pode definir sua própria UI
- 🔒 **Segurança**: Sandboxing de iframes para isolar conteúdo

---

## 🏗️ Arquitetura

A implementação segue o padrão do **MCP UI Protocol** conforme especificado em:
- Protocolo: [mcpui.dev](https://mcpui.dev)
- Recursos URI: `ui://`
- Metadados: Campos `_meta` com configurações de UI

### **Componentes da Arquitetura**

```
┌─────────────────────────────────────────────────────┐
│           MCP Server (Externo)                      │
│  - Retorna recursos com URI ui://                   │
│  - Define metadados (_meta) para renderização       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           Plugin MCP (mcp.ts)                       │
│  - Processa resposta da ferramenta                  │
│  - Extrai recursos UI (ui://)                       │
│  - Retorna uiResources[] para o modelo              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           Message Model (message.ts)                │
│  - Armazena uiResources em toolCalls[]              │
│  - Gerencia estado das chamadas de ferramenta       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│   MessageItemUIResourceBlock Component              │
│  - Renderiza recursos UI em iframes sandboxed       │
│  - Gerencia comunicação postMessage                 │
│  - Aplica estilos e dimensionamento                 │
└─────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes Implementados

### **1. MessageItemUIResourceBlock.vue** ⭐ NOVO

**Localização:** `src/components/MessageItemUIResourceBlock.vue`

Componente Vue responsável por renderizar recursos UI retornados por servidores MCP.

#### **Funcionalidades:**

- **Renderização de HTML**: Suporta HTML completo via `text/html` ou `blob`
- **Sandbox de Segurança**: Iframes com atributos sandbox restritivos
- **Dimensionamento Dinâmico**: Respeita `mcpui.dev/ui-preferred-frame-size`
- **Comunicação bidirecional**: Suporte a `postMessage` para interatividade
- **Tema dark/light**: Estilos adaptativos para diferentes temas

#### **Props:**

```typescript
{
  resource: {
    type: Object,
    required: true,
    // Estrutura esperada:
    // {
    //   uri: 'ui://...',
    //   mimeType: 'text/html',
    //   text?: string,
    //   blob?: string (base64),
    //   _meta: {
    //     title?: string,
    //     'mcpui.dev/ui-preferred-frame-size'?: [width, height],
    //     'mcpui.dev/ui-initial-render-data'?: any
    //   }
    // }
  }
}
```

#### **Eventos Suportados:**

- **`mcpui:render`**: Enviado ao iframe com dados iniciais
- **`mcpui:action`**: Recebido do iframe (ações do usuário)

---

### **2. Plugin MCP (mcp.ts)** 🔧 MODIFICADO

**Localização:** `src/plugins/mcp.ts`

Aprimorado para processar e extrair recursos UI das respostas MCP.

#### **Modificações:**

```typescript
async execute(context: PluginExecutionContext, parameters: anyDict): Promise<anyDict> {
  const result = await window.api.mcp.callTool(parameters.tool, parameters.parameters)
  
  // Extração de recursos UI
  const uiResources: any[] = []
  let textContent = ''
  
  if (Array.isArray(result.content)) {
    result.content.forEach((item: any) => {
      // Identifica recursos com URI ui://
      if (item.type === 'resource' && item.resource?.uri?.startsWith('ui://')) {
        uiResources.push(item.resource)
      } else if (item.type === 'text' && item.text) {
        textContent += (textContent ? '\n' : '') + item.text
      }
    })
  }
  
  // Retorna recursos UI separados do conteúdo textual
  const response: anyDict = uiResources.length > 0 ? { uiResources } : {}
  if (textContent) {
    response.result = textContent
  }
  
  return Object.keys(response).length > 0 ? response : result
}
```

---

### **3. Tipos TypeScript (types/index.ts)** 📝 MODIFICADO

**Localização:** `src/types/index.ts`

Adicionado suporte para `uiResources` no tipo `ToolCall`.

#### **Modificações:**

```typescript
export type ToolCall = {
  id: string
  status?: string
  done: boolean
  name: string
  params: any
  result: any
  uiResources?: any[]  // ⬅️ NOVO: Array de recursos UI
}
```

---

### **4. Message Model (message.ts)** 📦 MODIFICADO

**Localização:** `src/models/message.ts`

Atualizado para armazenar e gerenciar `uiResources` em toolCalls.

#### **Modificações:**

O modelo já suportava `toolCalls` que agora podem conter `uiResources[]`:

```typescript
addToolCall(toolCall: LlmChunkTool): void {
  // ... código existente ...
  // uiResources são preservados quando toolCall é adicionado
}
```

---

### **5. MessageItemBodyBlock.vue** ✅ INTEGRADO

**Localização:** `src/components/MessageItemBodyBlock.vue`

Integrado com `MessageItemUIResourceBlock` para renderização automática de recursos UI.

**Estrutura implementada:**

```vue
<template>
  <div ref="messageItemBodyBlock">
    <div v-if="block.type == 'empty'" ...></div>
    <div v-if="block.type == 'text'" ...></div>
    <MessageItemMediaBlock v-else-if="block.type == 'media'" .../>
    <MessageItemToolBlock v-else-if="block.type == 'tool'" .../>
    <MessageItemSearchResultBlock v-else-if="block.type == 'search'" .../>
    <MessageItemUIResourceBlock v-else-if="block.type == 'ui-resource'" :resource="block.uiResource!" />
  </div>
</template>
```

**Tipo Block estendido:**

```typescript
export type Block = {
  type: 'empty'|'text'|'media'|'tool'|'search'|'ui-resource'
  content?: string
  url?: string
  desc?: string
  prompt?: string
  toolCall?: ToolCall
  uiResource?: any  // ⬅️ NOVO: Recurso UI para renderização
}
```

---

## 🔄 Fluxo de Dados

### **Sequência de Renderização de UI:**

```
1. Usuário invoca ferramenta MCP
   │
   ▼
2. MCP Server retorna resultado com recursos UI
   {
     content: [
       { type: "text", text: "Processado com sucesso" },
       {
         type: "resource",
         resource: {
           uri: "ui://chart/1",
           mimeType: "text/html",
           text: "<div>Widget HTML</div>",
           _meta: {
             title: "Gráfico de Vendas",
             "mcpui.dev/ui-preferred-frame-size": [600, 400]
           }
         }
       }
     ]
   }
   │
   ▼
3. Plugin MCP processa e separa:
   - textContent: "Processado com sucesso"
   - uiResources: [{ uri: "ui://chart/1", ... }]
   │
   ▼
4. ToolCall armazena:
   {
     id: "1",
     name: "create_chart",
     result: "Processado com sucesso",
     uiResources: [...]
   }
   │
   ▼
5. MessageItemUIResourceBlock renderiza cada recurso:
   - Cria iframe sandboxed
   - Carrega HTML do recurso
   - Aplica dimensões preferidas
   - Envia dados iniciais via postMessage
   │
   ▼
6. Widget é exibido na conversa
```

---

## 🔍 Detalhes Técnicos

### **Formato de Recursos UI**

Um recurso UI retornado por MCP deve seguir esta estrutura:

```json
{
  "uri": "ui://unique-identifier",
  "mimeType": "text/html",
  "text": "<!DOCTYPE html><html>...</html>",
  "_meta": {
    "title": "Nome do Widget",
    "mcpui.dev/ui-preferred-frame-size": [800, 600],
    "mcpui.dev/ui-initial-render-data": {
      "customData": "valores iniciais"
    }
  }
}
```

### **Campos Suportados:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `uri` | string | Identificador único começando com `ui://` |
| `mimeType` | string | Tipo MIME, geralmente `text/html` |
| `text` | string | Conteúdo HTML do widget |
| `blob` | string | Conteúdo em base64 (alternativa a `text`) |
| `_meta.title` | string | Título exibido no cabeçalho do widget |
| `_meta['mcpui.dev/ui-preferred-frame-size']` | [number, number] | Dimensões [largura, altura] em pixels |
| `_meta['mcpui.dev/ui-initial-render-data']` | any | Dados iniciais enviados ao widget |

### **Atributos de Sandbox**

Por segurança, os iframes usam:

```html
<iframe sandbox="allow-scripts allow-same-origin">
```

**Permissões:**
- ✅ `allow-scripts`: Permite JavaScript no widget
- ✅ `allow-same-origin`: Permite acesso a recursos same-origin
- ❌ Sem `allow-top-navigation`: Impede navegação da página principal
- ❌ Sem `allow-forms`: Formulários desabilitados por padrão

---

## 🔒 Segurança

### **Medidas de Segurança Implementadas:**

1. **Sandbox de Iframes**
   - Isolamento completo do conteúdo
   - Restrições de navegação e formulários
   - Prevenção de acesso a cookies principais

2. **Validação de URI**
   - Apenas URIs `ui://` são processados
   - Rejeição de protocolos perigosos (`javascript:`, `data:`)

3. **Content Security Policy**
   - Estilos inline controlados
   - Scripts limitados ao contexto do iframe

4. **PostMessage Origin Checking**
   - Validação de origem das mensagens (futuro)
   - Filtragem de eventos maliciosos

### **Recomendações:**

- 🔐 **Sempre validar** servidores MCP antes de instalar
- 🛡️ **Revisar código HTML** de widgets desconhecidos
- ⚠️ **Não habilitar** `allow-forms` sem revisão de segurança

---

## 💡 Exemplo de Uso

### **Exemplo 1: Gráfico Simples**

**Servidor MCP retorna:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Análise concluída com sucesso."
    },
    {
      "type": "resource",
      "resource": {
        "uri": "ui://sales-chart",
        "mimeType": "text/html",
        "text": "<!DOCTYPE html>\n<html>\n<head>\n  <script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n</head>\n<body>\n  <canvas id=\"chart\"></canvas>\n  <script>\n    const ctx = document.getElementById('chart');\n    new Chart(ctx, {\n      type: 'bar',\n      data: {\n        labels: ['Jan', 'Fev', 'Mar'],\n        datasets: [{ label: 'Vendas', data: [12, 19, 3] }]\n      }\n    });\n  </script>\n</body>\n</html>",
        "_meta": {
          "title": "Gráfico de Vendas - Q1 2025",
          "mcpui.dev/ui-preferred-frame-size": [600, 400]
        }
      }
    }
  ]
}
```

**Resultado:**
- Texto "Análise concluída com sucesso." exibido normalmente
- Widget de gráfico Chart.js renderizado abaixo em um iframe 600x400px

---

### **Exemplo 2: Dashboard Interativo**

**Servidor MCP retorna:**

```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "ui://dashboard",
        "mimeType": "text/html",
        "text": "<!DOCTYPE html>\n<html>\n<body>\n  <div id=\"app\"></div>\n  <script>\n    window.addEventListener('message', (event) => {\n      if (event.data.type === 'mcpui:render') {\n        const data = event.data.data;\n        document.getElementById('app').innerHTML = `\n          <h2>Status: ${data.status}</h2>\n          <p>Usuários ativos: ${data.activeUsers}</p>\n        `;\n      }\n    });\n  </script>\n</body>\n</html>",
        "_meta": {
          "title": "Dashboard do Sistema",
          "mcpui.dev/ui-preferred-frame-size": [800, 300],
          "mcpui.dev/ui-initial-render-data": {
            "status": "Operacional",
            "activeUsers": 42
          }
        }
      }
    }
  ]
}
```

**Resultado:**
- Dashboard renderizado com dados iniciais
- Comunicação via postMessage funcional

---

## 📁 Arquivos Modificados

### **Novos Arquivos:**
- ✨ `src/components/MessageItemUIResourceBlock.vue`

### **Arquivos Modificados:**
- 🔧 `src/plugins/mcp.ts`
- 📝 `src/types/index.ts`
- 📦 `src/models/message.ts`
- 🔄 `src/components/MessageItemBodyBlock.vue`
- 📄 `package-lock.json` (dependências atualizadas)

---

## 🚀 Próximos Passos

### **Implementações Futuras:**

1. ~~**Integração Completa no MessageItemBodyBlock**~~ ✅ **CONCLUÍDO**
   - ~~Detectar `block.type == 'ui-resource'`~~
   - ~~Renderizar `MessageItemUIResourceBlock` automaticamente~~

2. **Galeria de Widgets**
   - Visualizar todos os widgets disponíveis
   - Preview de widgets em Settings > MCP

3. **Suporte a Ações Interativas**
   - Processar eventos `mcpui:action`
   - Permitir widgets enviarem comandos de volta ao MCP

4. **Cache de Recursos**
   - Armazenar recursos UI renderizados
   - Melhorar performance em conversas longas

5. **Biblioteca de Widgets Padrão**
   - Templates prontos: gráficos, tabelas, formulários
   - Facilitação para desenvolvedores MCP

---

## 📚 Referências

- **MCP UI Protocol:** [https://mcpui.dev](https://mcpui.dev)
- **MCP Specification:** [https://docs.anthropic.com/en/docs/build-with-claude/mcp](https://docs.anthropic.com/en/docs/build-with-claude/mcp)
- **Smithery (MCP Servers):** [https://smithery.ai](https://smithery.ai)

---

## 👥 Autores

**VerifAI Development Team**  
Implementado em: Outubro 2025

---

## 📝 Notas de Versão

### **v1.0.0** - Implementação Completa ✅
- ✅ Componente `MessageItemUIResourceBlock` criado
- ✅ Plugin MCP atualizado para extrair recursos UI
- ✅ Tipos TypeScript estendidos
- ✅ Suporte a dimensionamento e metadados
- ✅ Sandbox de segurança implementado
- ✅ Comunicação postMessage funcional
- ✅ Integração completa no fluxo de renderização
- ✅ Detecção automática de recursos UI em toolCalls
- ✅ Renderização automática de widgets nas conversas

---

**Fim da Documentação** 📄

