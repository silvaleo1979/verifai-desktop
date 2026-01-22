
import { anyDict } from 'types/index'
import { PluginConfig } from './plugin'
import { MultiToolPlugin, LlmTool, PluginExecutionContext } from 'multi-llm-ts'
import { t } from '../services/i18n'

export default class extends MultiToolPlugin {

  config: PluginConfig
  tools: LlmTool[]
  
  constructor(config: PluginConfig) {
    super()
    this.config = config
    this.tools = []
  }

  isEnabled(): boolean {
    return /*this.config?.enabled && */window.api.mcp.isAvailable()
  }

  getName(): string {
    return 'Model Context Protocol'
  }

  getPreparationDescription(name: string): string {
    if (name.startsWith('prompt_')) {
      const prompt = this.extractPromptName(name)
      return t('plugins.mcp.starting_prompt', { prompt: prompt }) || `Starting MCP prompt: ${prompt}`
    } else if (name.startsWith('read_resource_')) {
      const resource = this.extractResourceName(name)
      return t('plugins.mcp.starting_resource', { resource: resource }) || `Reading MCP resource: ${resource}`
    }
    const tool = window.api.mcp.originalToolName(name)
    return t('plugins.mcp.starting', { tool: tool })
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRunningDescription(name: string, args: any): string {
    if (name.startsWith('prompt_')) {
      const prompt = this.extractPromptName(name)
      return t('plugins.mcp.running_prompt', { prompt: prompt }) || `Running MCP prompt: ${prompt}`
    } else if (name.startsWith('read_resource_')) {
      const resource = this.extractResourceName(name)
      return t('plugins.mcp.running_resource', { resource: resource }) || `Reading MCP resource: ${resource}`
    }
    const tool = window.api.mcp.originalToolName(name)
    return t('plugins.mcp.running', { tool: tool })
  }

  getCompletedDescription(name: string, args: any, results: any): string | undefined {
    if (name.startsWith('prompt_')) {
      const prompt = this.extractPromptName(name)
      if (results.error) {
        return t('plugins.mcp.error_prompt', { prompt: prompt, error: results.error }) || `Error in prompt ${prompt}: ${results.error}`
      } else {
        return t('plugins.mcp.completed_prompt', { prompt: prompt }) || `Completed MCP prompt: ${prompt}`
      }
    } else if (name.startsWith('read_resource_')) {
      const resource = this.extractResourceName(name)
      if (results.error) {
        return t('plugins.mcp.error_resource', { resource: resource, error: results.error }) || `Error reading resource ${resource}: ${results.error}`
      } else {
        return t('plugins.mcp.completed_resource', { resource: resource }) || `Completed reading MCP resource: ${resource}`
      }
    }
    const tool = window.api.mcp.originalToolName(name)
    if (results.error) {
      return t('plugins.mcp.error', { tool: tool, error: results.error })
    } else {
      return t('plugins.mcp.completed', { tool: tool, args, results })
    }
  }

  private extractPromptName(toolName: string): string {
    // Remove prefixo "prompt_" e sufixo único
    return toolName.replace(/^prompt_/, '').replace(/___....$/, '')
  }

  private extractResourceName(toolName: string): string {
    // Remove prefixo "read_resource_" e sufixo único, depois tenta obter URI
    const cleanName = toolName.replace(/^read_resource_/, '').replace(/___....$/, '')
    // Tentar obter URI do mapeamento
    const uri = window.api.mcp.getResourceUriByToolName?.(toolName)
    return uri || cleanName
  }

  async getTools(): Promise<any> {
    try {
      // Verificar se há um servidor MCP ativo
      // Primeiro tentar obter da configuração do plugin (mais confiável)
      let activeServerUuid: string | null = null
      
      if (this.config && (this.config as any).activeMcpServer) {
        activeServerUuid = (this.config as any).activeMcpServer
      } else {
        // Fallback: tentar obter do chat atual (para compatibilidade)
        try {
          const currentChat = (window as any).__currentChat
          if (currentChat?.mcpServer) {
            activeServerUuid = currentChat.mcpServer
          }
        } catch (e) {
          // Ignorar erro
        }
      }
      
      if (activeServerUuid) {
        // Retornar APENAS tools do servidor ativo específico
        // Isso garante que mesmo com outros MCPs conectados, apenas as tools deste servidor são retornadas
        this.tools = await window.api.mcp.getToolsByServer(activeServerUuid)
        console.log(`[MCP Plugin] Servidor ativo: ${activeServerUuid}, Tools retornadas: ${this.tools.length}`)
        
        // Log das tools para debug
        if (this.tools.length > 0) {
          console.log(`[MCP Plugin] Tools disponíveis:`, this.tools.map((t: any) => t.function.name))
        } else {
          console.log(`[MCP Plugin] AVISO: Nenhuma tool disponível para o servidor ${activeServerUuid}`)
        }
      } else {
        // Retornar todas as tools (comportamento padrão quando nenhum servidor está selecionado)
        this.tools = await window.api.mcp.getTools()
      }
      
      if (this.toolsEnabled) {
        return this.tools.filter((tool: any) => {
          return this.toolsEnabled.includes(tool.function.name)
        })
      } else {
        return this.tools
      }
    } catch (error) {
      console.error('[MCP Plugin] Erro ao obter tools:', error)
      this.tools = []
      return []
    }
  }

  handlesTool(name: string): boolean {
    const handled = this.tools.find((tool: any) => tool.function.name === name) !== undefined
    return handled && (!this.toolsEnabled || this.toolsEnabled.includes(name))
  }

  async execute(context: PluginExecutionContext, parameters: anyDict): Promise<anyDict> {
    const toolName = parameters.tool

    // Verificar se é um prompt
    if (toolName.startsWith('prompt_')) {
      if (!this.handlesTool(toolName)) {
        return { error: `Prompt ${toolName} is not handled by this plugin or has been disabled` }
      }

      try {
        const result = await window.api.mcp.callPrompt(toolName, parameters.parameters || {})
        
        // Processar resultado do prompt
        if (result.messages && Array.isArray(result.messages)) {
          const textContent = result.messages
            .map((msg: any) => {
              if (typeof msg.content === 'string') {
                return msg.content
              } else if (msg.content?.text) {
                return msg.content.text
              } else if (Array.isArray(msg.content)) {
                return msg.content
                  .map((c: any) => c.text || c)
                  .filter(Boolean)
                  .join('\n')
              }
              return ''
            })
            .filter(Boolean)
            .join('\n\n')
          
          if (textContent) {
            return { result: textContent }
          }
        }
        
        // Fallback: retornar JSON se não houver mensagens
        return { result: JSON.stringify(result, null, 2) }
      } catch (error: any) {
        console.error('Error calling MCP prompt:', error)
        return { error: error.message }
      }
    }

    // Verificar se é um resource
    if (toolName.startsWith('read_resource_')) {
      if (!this.handlesTool(toolName)) {
        return { error: `Resource ${toolName} is not handled by this plugin or has been disabled` }
      }

      try {
        // Obter URI do resource
        const uri = window.api.mcp.getResourceUriByToolName?.(toolName)
        if (!uri) {
          return { error: `Resource URI not found for tool: ${toolName}` }
        }

        const result = await window.api.mcp.getResource(uri)
        
        // Processar conteúdo do resource
        if (result.contents && Array.isArray(result.contents)) {
          const textContent = result.contents
            .map((content: any) => {
              if (content.text) {
                return content.text
              } else if (content.uri) {
                return `Resource URI: ${content.uri}`
              } else if (typeof content === 'string') {
                return content
              }
              return JSON.stringify(content)
            })
            .filter(Boolean)
            .join('\n\n')
          
          if (textContent) {
            return { result: textContent }
          }
        }
        
        // Fallback: retornar JSON se não houver contents
        return { result: JSON.stringify(result, null, 2) }
      } catch (error: any) {
        console.error('Error getting MCP resource:', error)
        return { error: error.message }
      }
    }

    // Tool normal (código existente)
    if (!this.handlesTool(toolName)) {
      return { error: `Tool ${toolName} is not handled by this plugin or has been disabled` }
    }

    try {
      const result = await window.api.mcp.callTool(toolName, parameters.parameters)
      
      // Check for UI resources in the content array
      const uiResources: any[] = []
      let textContent = ''
      
      if (Array.isArray(result.content)) {
        result.content.forEach((item: any) => {
          if (item.type === 'resource' && item.resource?.uri?.startsWith('ui://')) {
            uiResources.push(item.resource)
          } else if (item.type === 'text' && item.text) {
            textContent += (textContent ? '\n' : '') + item.text
          }
        })
      }
      
      // Return simplified result for single text content
      if (Array.isArray(result.content) && result.content.length == 1 && result.content[0].text && uiResources.length === 0) {
        return { result: result.content[0].text }
      }
      
      // Return enhanced result with UI resources
      const response: anyDict = uiResources.length > 0 ? { uiResources } : {}
      if (textContent) {
        response.result = textContent
      }
      
      return Object.keys(response).length > 0 ? response : result
    } catch (error: any) {
      console.error(error)
      return { error: error.message }
    }
  }

}
