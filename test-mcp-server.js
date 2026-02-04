#!/usr/bin/env node

/**
 * Servidor MCP de Teste para MCP Apps
 * 
 * Este servidor demonstra o suporte a MCP Apps com UI interativa.
 * Para usar:
 * 1. Adicionar ao MCP settings:
 *    {
 *      "mcpServers": {
 *        "test-ui-server": {
 *          "command": "node",
 *          "args": ["test-mcp-server.js"]
 *        }
 *      }
 *    }
 * 2. Reiniciar o VerifAI Desktop
 * 3. A ferramenta "calculator" estará disponível com UI
 */

const { Server } = require('@modelcontextprotocol/sdk/server')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio')

const server = new Server({
  name: 'test-ui-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
})

// Tool com suporte a UI (MCP App)
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'calculator',
      description: 'Calculadora interativa com UI',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'Operação matemática (opcional)',
            enum: ['add', 'subtract', 'multiply', 'divide']
          },
          a: {
            type: 'number',
            description: 'Primeiro número (opcional)'
          },
          b: {
            type: 'number',
            description: 'Segundo número (opcional)'
          }
        }
      },
      // Meta com suporte a UI - MCP Apps
      _meta: {
        ui: {
          resourceUri: 'ui://test-ui-server/calculator'
        },
        title: 'Calculadora MCP App'
      }
    },
    {
      name: 'widget_demo',
      description: 'Widget de demonstração com gráfico',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      _meta: {
        ui: {
          resourceUri: 'ui://test-ui-server/demo'
        },
        title: 'Demo Widget'
      }
    }
  ]
}))

// Handler para execução de ferramentas
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params

  if (name === 'calculator') {
    const { operation, a, b } = args || {}
    let result = null
    let message = 'Calculadora interativa iniciada'

    if (operation && a !== undefined && b !== undefined) {
      switch (operation) {
        case 'add':
          result = a + b
          message = `${a} + ${b} = ${result}`
          break
        case 'subtract':
          result = a - b
          message = `${a} - ${b} = ${result}`
          break
        case 'multiply':
          result = a * b
          message = `${a} × ${b} = ${result}`
          break
        case 'divide':
          result = b !== 0 ? a / b : 'Erro: divisão por zero'
          message = `${a} ÷ ${b} = ${result}`
          break
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: message
        },
        {
          type: 'resource',
          resource: {
            uri: 'ui://test-ui-server/calculator',
            mimeType: 'text/html',
            text: getCalculatorHTML(result),
            _meta: {
              title: 'Calculadora Interativa',
              'mcpui.dev/ui-preferred-frame-size': [400, 500],
              'mcpui.dev/ui-initial-render-data': {
                result,
                operation,
                a,
                b
              }
            }
          }
        }
      ]
    }
  }

  if (name === 'widget_demo') {
    return {
      content: [
        {
          type: 'text',
          text: 'Widget de demonstração renderizado'
        },
        {
          type: 'resource',
          resource: {
            uri: 'ui://test-ui-server/demo',
            mimeType: 'text/html',
            text: getDemoWidgetHTML(),
            _meta: {
              title: 'Demo: Gráfico de Vendas',
              'mcpui.dev/ui-preferred-frame-size': [600, 400]
            }
          }
        }
      ]
    }
  }

  throw new Error(`Unknown tool: ${name}`)
})

// Handler para leitura de recursos UI
server.setRequestHandler('resources/read', async (request) => {
  const { uri } = request.params

  if (uri === 'ui://test-ui-server/calculator') {
    return {
      contents: [{
        uri: 'ui://test-ui-server/calculator',
        mimeType: 'text/html',
        text: getCalculatorHTML()
      }]
    }
  }

  if (uri === 'ui://test-ui-server/demo') {
    return {
      contents: [{
        uri: 'ui://test-ui-server/demo',
        mimeType: 'text/html',
        text: getDemoWidgetHTML()
      }]
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// HTML da calculadora
function getCalculatorHTML(initialResult = null) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculadora MCP App</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
    }
    .calculator {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 350px;
      width: 100%;
    }
    .display {
      background: #f7f7f7;
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      text-align: right;
      font-size: 2rem;
      font-weight: 600;
      color: #333;
      min-height: 60px;
      word-break: break-all;
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    button {
      padding: 1.2rem;
      border: none;
      border-radius: 10px;
      font-size: 1.2rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: #f0f0f0;
      color: #333;
    }
    button:hover {
      background: #e0e0e0;
      transform: translateY(-2px);
    }
    button:active {
      transform: translateY(0);
    }
    .operator {
      background: #667eea;
      color: white;
    }
    .operator:hover {
      background: #5568d3;
    }
    .equals {
      background: #764ba2;
      color: white;
      grid-column: span 2;
    }
    .equals:hover {
      background: #653a8b;
    }
    .clear {
      background: #ff6b6b;
      color: white;
    }
    .clear:hover {
      background: #ee5a52;
    }
    .zero {
      grid-column: span 2;
    }
    h1 {
      text-align: center;
      color: #667eea;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }
    .badge {
      background: #667eea;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      display: inline-block;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="calculator">
    <h1>🧮 Calculadora</h1>
    <div class="badge">MCP Apps SDK</div>
    <div class="display" id="display">${initialResult !== null ? initialResult : '0'}</div>
    <div class="buttons">
      <button onclick="appendNumber('7')">7</button>
      <button onclick="appendNumber('8')">8</button>
      <button onclick="appendNumber('9')">9</button>
      <button class="operator" onclick="setOperator('÷')">÷</button>
      
      <button onclick="appendNumber('4')">4</button>
      <button onclick="appendNumber('5')">5</button>
      <button onclick="appendNumber('6')">6</button>
      <button class="operator" onclick="setOperator('×')">×</button>
      
      <button onclick="appendNumber('1')">1</button>
      <button onclick="appendNumber('2')">2</button>
      <button onclick="appendNumber('3')">3</button>
      <button class="operator" onclick="setOperator('-')">-</button>
      
      <button class="zero" onclick="appendNumber('0')">0</button>
      <button onclick="appendNumber('.')">.</button>
      <button class="operator" onclick="setOperator('+')">+</button>
      
      <button class="clear" onclick="clearDisplay()">C</button>
      <button class="equals" onclick="calculate()">=</button>
    </div>
  </div>

  <script>
    let currentValue = '${initialResult !== null ? initialResult : '0'}';
    let operator = null;
    let previousValue = null;

    function appendNumber(num) {
      if (currentValue === '0' || currentValue === 'Error') {
        currentValue = num;
      } else {
        currentValue += num;
      }
      updateDisplay();
    }

    function setOperator(op) {
      if (operator && previousValue !== null) {
        calculate();
      }
      operator = op;
      previousValue = parseFloat(currentValue);
      currentValue = '0';
    }

    function calculate() {
      if (operator && previousValue !== null) {
        const current = parseFloat(currentValue);
        let result;
        
        switch (operator) {
          case '+':
            result = previousValue + current;
            break;
          case '-':
            result = previousValue - current;
            break;
          case '×':
            result = previousValue * current;
            break;
          case '÷':
            result = current !== 0 ? previousValue / current : 'Error';
            break;
        }
        
        currentValue = result.toString();
        operator = null;
        previousValue = null;
        updateDisplay();
      }
    }

    function clearDisplay() {
      currentValue = '0';
      operator = null;
      previousValue = null;
      updateDisplay();
    }

    function updateDisplay() {
      document.getElementById('display').textContent = currentValue;
    }

    // Escutar mensagens do host (MCP Apps protocol)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'mcpui:render') {
        console.log('Received initial data:', event.data.data);
        // Processar dados iniciais se necessário
      }
    });
  </script>
</body>
</html>`
}

// HTML do widget de demonstração
function getDemoWidgetHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Widget</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 2rem;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      margin: 0;
    }
    .container {
      background: white;
      border-radius: 15px;
      padding: 2rem;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 {
      color: #333;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    .badge {
      background: #f5576c;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      display: inline-block;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Gráfico de Vendas</h1>
    <div class="badge">MCP Apps Demo</div>
    <canvas id="chart"></canvas>
  </div>

  <script>
    const ctx = document.getElementById('chart');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
        datasets: [{
          label: 'Vendas 2026',
          data: [12, 19, 8, 15, 25, 22],
          backgroundColor: 'rgba(245, 87, 108, 0.7)',
          borderColor: 'rgba(245, 87, 108, 1)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  </script>
</body>
</html>`
}

// Iniciar servidor
const transport = new StdioServerTransport()
server.connect(transport)

console.error('🎨 Test MCP Server with UI Apps started')
