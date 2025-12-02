
import { AgentRun } from '../types/index'

export function buildLogSummary(run: AgentRun, agentName: string): string {
  
  // Calcular duração
  const duration = run.updatedAt - run.createdAt
  const durationSeconds = (duration / 1000).toFixed(2)
  
  // Emoji de status
  const statusEmoji = run.status === 'success' ? '✅' : 
                      run.status === 'error' ? '❌' : 
                      run.status === 'running' ? '⏳' : '⚠️'
  
  // Traduzir trigger
  const triggerMap: Record<string, string> = {
    'manual': 'Manual',
    'schedule': 'Agendamento',
    'webhook': 'Webhook',
    'workflow': 'Workflow'
  }
  
  // Construir resumo
  let summary = `## 📊 Log de Execução do Agente

**Agente:** ${agentName}
**Status:** ${statusEmoji} ${run.status}
**Data/Hora:** ${new Date(run.createdAt).toLocaleString('pt-BR')}
**Duração:** ${durationSeconds}s
**Acionamento:** ${triggerMap[run.trigger] || run.trigger}

`

  // Prompt usado
  if (run.prompt) {
    summary += `### 📝 Prompt de Execução\n\n`
    summary += `\`\`\`\n${run.prompt}\n\`\`\`\n\n`
  }

  // Tools chamadas
  if (run.toolCalls && run.toolCalls.length > 0) {
    summary += `### 🔧 Ferramentas Utilizadas (${run.toolCalls.length})\n\n`
    run.toolCalls.forEach((tool, idx) => {
      summary += `**${idx + 1}. ${tool.name}**\n`
      summary += `   - Status: ${tool.done ? '✅ Completo' : '⏳ Pendente'}\n`
      
      // Parâmetros (resumido)
      if (tool.params && Object.keys(tool.params).length > 0) {
        const paramsStr = JSON.stringify(tool.params, null, 2)
        summary += `   - Parâmetros:\n\`\`\`json\n${paramsStr.substring(0, 200)}${paramsStr.length > 200 ? '...' : ''}\n\`\`\`\n`
      }
      
      // Resultado (resumido)
      if (tool.result) {
        const resultStr = typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)
        const truncated = resultStr.substring(0, 300)
        summary += `   - Resultado: \`${truncated}${resultStr.length > 300 ? '...' : ''}\`\n`
      }
      
      summary += `\n`
    })
  } else {
    summary += `### 🔧 Ferramentas\n\nNenhuma ferramenta foi chamada nesta execução.\n\n`
  }

  // Mensagens da conversa
  const userMessages = run.messages.filter(m => m.role === 'user')
  const assistantMessages = run.messages.filter(m => m.role === 'assistant')
  
  if (assistantMessages.length > 0) {
    summary += `### 💬 Resposta do Agente\n\n`
    assistantMessages.forEach((msg, idx) => {
      if (msg.content) {
        const content = msg.content.substring(0, 500)
        summary += `${content}${msg.content.length > 500 ? '...' : ''}\n\n`
      }
    })
  }

  // Informações técnicas
  summary += `### ⚙️ Detalhes Técnicos\n\n`
  summary += `- **Engine:** ${run.messages.find(m => m.engine)?.engine || 'N/A'}\n`
  summary += `- **Model:** ${run.messages.find(m => m.model)?.model || 'N/A'}\n`
  summary += `- **Total de mensagens:** ${run.messages.length}\n`
  
  // Usage (se disponível)
  const lastMessage = assistantMessages[assistantMessages.length - 1]
  if (lastMessage?.usage) {
    summary += `- **Tokens usados:** ${lastMessage.usage.prompt_tokens || 0} prompt + ${lastMessage.usage.completion_tokens || 0} completion\n`
  }

  summary += `\n---\n\n`
  summary += `*ID da Execução: \`${run.id}\`*\n`

  return summary
}

