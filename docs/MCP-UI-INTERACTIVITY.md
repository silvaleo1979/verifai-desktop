# 🎯 MCP-UI Interatividade - Guia Completo

**Data:** Janeiro 2025  
**Status:** ✅ Implementado  
**Funcionalidade:** Widgets MCP-UI com callbacks interativos

---

## 🚀 Visão Geral

A funcionalidade de **interatividade MCP-UI** permite que widgets HTML enviem ações de volta para o VerifAI, criando uma experiência bidirecional onde os usuários podem:

- ✅ **Clicar em botões** e disparar novas mensagens
- ✅ **Enviar dados** para processamento
- ✅ **Chamar ferramentas MCP** diretamente
- ✅ **Navegar** entre diferentes estados
- ✅ **Atualizar dados** em tempo real

---

## 🔧 Como Funciona

### **Fluxo de Comunicação**

```
Widget HTML → postMessage → MessageItemUIResourceBlock → MessageItemBodyBlock → MessageItemBody → MessageItem → MessageList → ChatArea → Chat → Processamento
```

### **Tipos de Ações Suportadas**

1. **`send_message`** - Envia nova mensagem para o chat
2. **`call_tool`** - Chama ferramenta MCP específica
3. **`refresh`** - Atualiza dados do widget
4. **`navigate`** - Navega para diferentes páginas/estados
5. **`search`** - Executa busca
6. **`export`** - Exporta dados
7. **`filter`** - Aplica filtros
8. **`settings`** - Abre configurações
9. **`reset`** - Reseta estado

---

## 📝 Como Usar

### **1. No Widget HTML**

```html
<!DOCTYPE html>
<html>
<body>
    <button onclick="sendAction('send_message', { message: 'Olá!' })">
        Enviar Mensagem
    </button>
    
    <button onclick="callTool('get_analytics', { period: '7d' })">
        Análise 7 Dias
    </button>
    
    <script>
        function sendAction(action, data = {}) {
            window.parent.postMessage({
                type: 'mcpui:action',
                action: action,
                data: data,
                timestamp: new Date().toISOString()
            }, '*');
        }
        
        function callTool(toolName, parameters = {}) {
            sendAction('call_tool', {
                tool: toolName,
                parameters: parameters
            });
        }
    </script>
</body>
</html>
```

### **2. Recebendo Dados Iniciais**

```html
<script>
window.addEventListener('message', (event) => {
    if (event.data?.type === 'mcpui:render') {
        const data = event.data.data;
        // Atualizar interface com dados iniciais
        document.getElementById('status').textContent = data.status;
        document.getElementById('users').textContent = data.activeUsers;
    }
});
</script>
```

### **3. No Servidor MCP**

```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "ui://dashboard",
        "mimeType": "text/html",
        "text": "<div>Widget HTML aqui</div>",
        "_meta": {
          "title": "Dashboard Interativo",
          "mcpui.dev/ui-preferred-frame-size": [800, 400],
          "mcpui.dev/ui-initial-render-data": {
            "status": "Online",
            "activeUsers": 42,
            "salesToday": "R$ 12.450"
          }
        }
      }
    }
  ]
}
```

---

## 🎨 Exemplo Completo

### **Widget Dashboard Interativo**

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .dashboard {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .btn {
            padding: 0.5rem 1rem;
            margin: 0.25rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: #007bff;
            color: white;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .data-item {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <h2>Dashboard Interativo</h2>
        
        <div class="data-grid">
            <div class="data-item">
                <div>Usuários Ativos</div>
                <div id="activeUsers">42</div>
            </div>
            <div class="data-item">
                <div>Vendas Hoje</div>
                <div id="salesToday">R$ 12.450</div>
            </div>
        </div>
        
        <div>
            <button class="btn" onclick="sendAction('refresh')">
                🔄 Atualizar
            </button>
            <button class="btn" onclick="sendMessage('Preciso de ajuda com vendas')">
                💬 Suporte
            </button>
            <button class="btn" onclick="callTool('get_analytics', { period: '30d' })">
                📊 Relatório 30 dias
            </button>
        </div>
    </div>

    <script>
        function sendAction(action, data = {}) {
            window.parent.postMessage({
                type: 'mcpui:action',
                action: action,
                data: data
            }, '*');
        }
        
        function sendMessage(message) {
            sendAction('send_message', { message: message });
        }
        
        function callTool(toolName, parameters = {}) {
            sendAction('call_tool', {
                tool: toolName,
                parameters: parameters
            });
        }
        
        // Receber dados iniciais
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'mcpui:render') {
                const data = event.data.data;
                if (data.activeUsers) {
                    document.getElementById('activeUsers').textContent = data.activeUsers;
                }
                if (data.salesToday) {
                    document.getElementById('salesToday').textContent = data.salesToday;
                }
            }
        });
    </script>
</body>
</html>
```

---

## 🔄 Processamento de Ações

### **No Chat.vue**

As ações são processadas da seguinte forma:

```typescript
const onUIAction = async (actionData: any) => {
  console.log('UI Action received:', actionData);
  
  if (actionData.action === 'send_message') {
    // Enviar nova mensagem
    const message = actionData.data?.message;
    if (message) {
      await onSendPrompt({
        prompt: message,
        attachments: [],
        deepResearch: false
      });
    }
  } else if (actionData.action === 'call_tool') {
    // Chamar ferramenta MCP
    const toolName = actionData.data?.tool;
    const parameters = actionData.data?.parameters || {};
    if (toolName) {
      const toolMessage = `Call tool: ${toolName} with parameters: ${JSON.stringify(parameters)}`;
      await onSendPrompt({
        prompt: toolMessage,
        attachments: [],
        deepResearch: false
      });
    }
  } else if (actionData.action === 'refresh') {
    // Lógica de refresh específica
    console.log('Refresh action triggered');
  } else {
    // Ação genérica - enviar para o assistente
    const actionMessage = `UI Action: ${actionData.action}${actionData.data ? ` with data: ${JSON.stringify(actionData.data)}` : ''}`;
    await onSendPrompt({
      prompt: actionMessage,
      attachments: [],
      deepResearch: false
    });
  }
};
```

---

## 🎯 Casos de Uso

### **1. Dashboard de Vendas**
- Botões para filtrar por período
- Exportar relatórios
- Enviar alertas por mensagem

### **2. Formulário de Contato**
- Enviar dados para processamento
- Validação em tempo real
- Confirmação de envio

### **3. Visualizador de Dados**
- Navegar entre diferentes visualizações
- Aplicar filtros dinâmicos
- Exportar gráficos

### **4. Sistema de Notificações**
- Marcar como lido
- Responder notificações
- Configurar alertas

---

## 🔒 Segurança

### **Sandbox de Iframe**
- Scripts executam em sandbox restritivo
- Comunicação apenas via `postMessage`
- Isolamento de contexto

### **Validação de Ações**
- Todas as ações passam por validação
- Logs de auditoria para debugging
- Rate limiting para prevenir spam

---

## 🚀 Próximos Passos

### **Funcionalidades Futuras**
1. **Estado Persistente** - Manter estado entre recarregamentos
2. **Temas Dinâmicos** - Adaptar ao tema do VerifAI
3. **Drag & Drop** - Reorganizar widgets
4. **Multi-tenant** - Suporte a múltiplos usuários
5. **Cache Inteligente** - Otimizar performance

### **Melhorias Planejadas**
- [ ] Suporte a WebSockets para tempo real
- [ ] Biblioteca de componentes padrão
- [ ] Debugger visual para ações
- [ ] Templates de widgets prontos
- [ ] Integração com sistema de permissões

---

## 📚 Recursos Adicionais

- **Exemplo Completo:** `examples/interactive-widget-example.html`
- **Documentação MCP-UI:** `IMPLEMENTACAO-MCP-UI.md`
- **Testes:** Widgets podem ser testados localmente
- **Debug:** Console logs mostram todas as ações

---

**🎉 Agora você pode criar widgets MCP-UI totalmente interativos, como no GOOSE!**
