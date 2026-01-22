
import { anyDict } from '../types/index'
import { App } from 'electron'
import { McpInstallStatus, McpServer, McpClient, McpStatus, McpTool, McpPrompt, McpResource } from '../types/mcp'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types'
import { loadSettings, saveSettings, settingsFilePath } from './config'
import { exec } from 'child_process'
import { LlmTool } from 'multi-llm-ts'
import Monitor from './monitor'

export default class {

  app: App
  monitor: Monitor|null
  currentConfig: string|null
  clients: McpClient[]
  logs: { [key: string]: string[] }
  resourceUriMap: Map<string, string>
  
  constructor(app: App) {
    this.app = app
    this.clients = []
    this.monitor = null
    this.currentConfig = null
    this.logs = {}
    this.resourceUriMap = new Map()
  }

  getStatus = (): McpStatus => {
    return {
      servers: this.clients.map(client => ({
        ...client.server,
        tools: client.tools,
        prompts: client.prompts,
        resources: client.resources
      })),
      logs: this.logs
    }
  }

  getServers = (): McpServer[] => {

    // load
    const config = loadSettings(this.app)

    // backwards compatibility
    // @ts-expect-error backwards compatibility
    if (config.mcp.disabledMcpServers) {

      // @ts-expect-error backwards compatibility
      for (const server of config.mcp.disabledMcpServers) {
        // create extra entry
        if (!config.mcp.mcpServersExtra[server]) {
          config.mcp.mcpServersExtra[server] = {}
        }
        config.mcp.mcpServersExtra[server].state = 'disabled'
      }

      // delete
      // @ts-expect-error backwards compatibility
      delete config.mcp.disabledMcpServers
      saveSettings(this.app, config)

    }

    // now we can do it
    return [
      ...config.mcp.servers,
      ...Object.keys(config.mcpServers).reduce((arr: McpServer[], key: string) => {
        arr.push({
          uuid: key.replace('@', ''),
          registryId: key,
          label: config.mcp.mcpServersExtra[key]?.label || undefined,
          state: config.mcp.mcpServersExtra[key]?.state || 'enabled',
          type: 'stdio',
          command: config.mcpServers[key].command,
          url: config.mcpServers[key].args.join(' '),
          cwd: config.mcpServers[key].cwd,
          env: config.mcpServers[key].env
        })
        return arr
      }, [])
    ]
  }

  deleteServer = (uuid: string): boolean => {

    // we need a config
    let deleted = false
    const config = loadSettings(this.app)

    // first shutdown the client
    const client = this.clients.find((c: McpClient) => c.server.uuid === uuid)
    if (client) {
      this.disconnect(client)
    }

    // is it a normal server
    if (config.mcp.servers.find((s: McpServer) => s.uuid === uuid)) {
      config.mcp.servers = config.mcp.servers.filter((s: McpServer) => s.uuid !== uuid)
      deleted = true
    } else if (config.mcpServers[uuid]) {
      delete config.mcpServers[uuid]
      deleted = true
    } else if (config.mcpServers[`@${uuid}`]) {
      delete config.mcpServers[`@${uuid}`]
      deleted = true
    }

    // found
    if (deleted) {
      this.monitor?.stop()
      saveSettings(this.app, config)
      this.startConfigMonitor()
      return true
    }

    // not found
    return false

  }

  installServer = async (registry: string, server: string, apiKey: string): Promise<McpInstallStatus> => {

    const command = this.getInstallCommand(registry, server, apiKey)
    if (!command) return 'error'

    try {

      const before = this.getServers()

      this.monitor?.stop()
      this.logs[server] = this.logs[server] || []

      await new Promise<McpInstallStatus>((resolve, reject) => {

        let failTimeout: NodeJS.Timeout
        const childProcess = exec(command)

        childProcess.on('error', (error) => {
          console.error(`Error installing MCP server ${server}:`, error)
          this.logs[server].push(`Error installing MCP server ${server}: ${error.message}`)
          reject('error')
        })

        childProcess.stderr.on('data', (data: Buffer) => {
          const stderr = data.toString()
          console.error(`MCP install ${server} stderr:`, stderr)
          this.logs[server].push(`MCP install ${server} stderr: ${stderr}`)

          if (stderr.includes('Failed to install')) {
            failTimeout = setTimeout(() => {
              childProcess.kill()
              reject('error')
            }, 250)
          }

          if (stderr.includes('Server not found')) {
            clearTimeout(failTimeout)
            childProcess.kill()
            reject('not_found')
          }
        
        })

        childProcess.stdout.on('data', (data: Buffer) => {
          const stdout = data.toString()
          console.log(`MCP install ${server} stdout:`, stdout)
          this.logs[server].push(`MCP install ${server} stdout: ${stdout}`)

          if (stdout.includes('successfully installed')) {
            resolve('success')
          }

          if (stdout.includes('Please enter your Smithery API key')) {
            childProcess.kill()
            reject('api_key_missing')
          }

        })
    
      
      })

      // now we should be able to connect
      const after = this.getServers()
      const servers = after.filter(s => !before.find(b => b.uuid === s.uuid))
      if (servers.length === 1) {
        await this.connectToServer(servers[0])
      }

      // done
      return 'success'

    } catch (e) {
      return e
    } finally {
      this.startConfigMonitor()
    }
    
  }

  getInstallCommand = (registry: string, server: string, apiKey: string): string|null => {  
    if (registry === 'smithery') {
      let command = `npx -y @smithery/cli@latest install ${server} --client verifai`
      if (apiKey) {
        command += ` --key ${apiKey}`
      }
      return command
    }
    return null
  }

  editServer = async (server: McpServer): Promise<boolean> => {

    // we need a config
    let edited = false
    const config = loadSettings(this.app)

    // create?
    if (server.uuid === null) {
      server.uuid = crypto.randomUUID()
      server.registryId = server.uuid
      config.mcp.servers.push(server)
      edited = true
    }

    // disconnect before editing
    const client = this.clients.find((c: McpClient) => c.server.uuid === server.uuid)
    if (client) {
      this.disconnect(client)
    }

    // search for server in normal server
    const original = config.mcp.servers.find((s: McpServer) => s.uuid === server.uuid)
    if (original) {
      original.type = server.type
      original.state = server.state
      if (server.label !== undefined) {
        if (server.label.trim().length) {
          original.label = server.label.trim()
        } else {
          delete original.label
        }
      }
      original.command = server.command
      original.url = server.url
      original.cwd = server.cwd
      original.env = server.env
      original.headers = server.headers
      edited = true
    }

    // and in mcp servers
    const originalMcp = config.mcpServers[server.registryId]
    if (originalMcp) {

      // extra information
      if (!config.mcp.mcpServersExtra[server.registryId]) {
        config.mcp.mcpServersExtra[server.registryId] = {}
      }

      // state
      config.mcp.mcpServersExtra[server.registryId].state = server.state
      
      // label
      if (server.label !== undefined) {
        if (server.label.trim().length) {
          config.mcp.mcpServersExtra[server.registryId].label = server.label.trim()
        } else {
          delete config.mcp.mcpServersExtra[server.registryId].label
        }
      }

      // rest is normal
      originalMcp.command = server.command
      originalMcp.args = server.url.split(' ')
      originalMcp.cwd = server.cwd
      originalMcp.env = server.env
      originalMcp.headers = server.headers
      edited = true
    }

    // if added
    if (edited) {
      this.monitor?.stop()
      saveSettings(this.app, config)
      await this.connectToServer(server)
      this.startConfigMonitor()
      return true
    }
    
    // too bad
    return false

  }

  shutdown = async (): Promise<void> => {
    for (const client of this.clients) {
      await client.client.close()
    }
    this.clients = []
  }

  reload = async (): Promise<void> => {
    await this.shutdown()
    await this.connect()
  }

  connect = async (): Promise<void> => {

    // now connect to servers
    const servers = this.getServers()
    for (const server of servers) {
      await this.connectToServer(server)
    }

    // save
    this.currentConfig = JSON.stringify(servers)
    this.startConfigMonitor()

    // done
    console.log('MCP servers connected', this.clients.map(client => client.server.uuid))

  }

  private startConfigMonitor = (): void => {
    if (!this.monitor) {
      this.monitor = new Monitor(() => {
        const servers = this.getServers()
        if (JSON.stringify(servers) !== this.currentConfig) {
          console.log('MCP servers changed, reloading')
          this.reload()
        }
      })
    }
    this.monitor.start(settingsFilePath(this.app))
  }

  private connectToServer = async(server: McpServer): Promise<boolean> => {

    // first check if we already have a client for this server
    const existingClient = this.clients.find(client => client.server.uuid === server.uuid)
    if (existingClient) {
      try {
        await existingClient.client.close()
      } catch { /* empty */}
      this.clients = this.clients.filter(client => client !== existingClient)
    }

    // clear logs
    this.logs[server.uuid] = []

    // enabled
    if (server.state !== 'enabled') {
      return false
    }
    
    // now connect
    let client: Client = null
    if (server.type === 'stdio') {
      client = await this.connectToStdioServer(server)
    } else if (server.type === 'sse') {
      client = await this.connectToSseServer(server)
    } else if (server.type === 'http') {
      client = await this.connectToStreamableHttpServer(server)
    }

    if (!client) {
      console.error(`Failed to connect to MCP server ${server.url}`)
      return false
    }

    // // reload on change
    // client.setNotificationHandler({ method: 'notifications/tools/list_changed' }, async () => {
    //   await this.reload()
    // })

    // get tools
    const tools = await client.listTools()
    const toolNames = tools.tools.map(tool => this.uniqueToolName(server, tool.name))

    // get prompts
    let promptNames: string[] = []
    try {
      const prompts = await client.listPrompts()
      promptNames = prompts.prompts.map(prompt => this.uniquePromptName(server, prompt.name))
      this.logs[server.uuid].push(`Registered ${prompts.prompts.length} prompt(s)\n`)
    } catch (e: any) {
      // Prompts podem não estar disponíveis em todos os servidores
      console.log(`MCP server ${server.uuid} does not support prompts:`, e.message)
    }

    // get resources
    let resourceUris: string[] = []
    try {
      const resources = await client.listResources()
      resourceUris = resources.resources.map(resource => resource.uri)
      this.logs[server.uuid].push(`Registered ${resources.resources.length} resource(s)\n`)
    } catch (e: any) {
      // Resources podem não estar disponíveis em todos os servidores
      console.log(`MCP server ${server.uuid} does not support resources:`, e.message)
    }

    // store
    this.clients.push({
      client,
      server,
      tools: toolNames,
      prompts: promptNames,
      resources: resourceUris
    })

    // done
    return true

  }

  private connectToStdioServer = async(server: McpServer): Promise<Client> => {

    try {

      // build command and args
      const command = process.platform === 'win32' ? 'cmd' : server.command
      const args = process.platform === 'win32' ? ['/C', `"${server.command}" ${server.url}`] : server.url.split(' ')
      let env = {
        ...getDefaultEnvironment(),
        ...server.env,
      }

      // clean up double cmd /c with smithery on windows
      if (command === 'cmd' && args.length > 0 && args[1].toLowerCase().startsWith('"cmd" /c')) {
        args[1] = args[1].slice(9)
      }

      // if env is empty, remove it
      if (Object.keys(env).length === 0) {
        env = undefined
      }

      // working directory
      const cwd = server.cwd || undefined

      // console.log('MCP Stdio command', process.platform, command, args, env)

      const transport = new StdioClientTransport({
        command, args, env, stderr: 'pipe', cwd
      })

      // start transport to get errors
      await transport.start()
      transport.stderr?.on('data', async (data: Buffer) => {
        const error = data.toString()
        this.logs[server.uuid].push(error)
      })

      // build the client
      const client = new Client({
        name: 'verifai-mcp-client',
        version: '1.0.0'
      }, {
        capabilities: { 
          tools: {},
          prompts: {},
          resources: {}
        }
      })

      client.onerror = (e) => {
        this.logs[server.uuid].push(e.message)
      }

      // disable start and connect
      transport.start = async () => {}
      await client.connect(transport)

      // done
      return client

    } catch (e) {
      console.error(`Failed to connect to MCP server ${server.command} ${server.url}:`, e)
      this.logs[server.uuid].push(`Failed to connect to MCP server "${server.command} ${server.url}"\n`)
      this.logs[server.uuid].push(`Error: ${e.message}\n`)
      if (e.message.startsWith('spawn')) {
        const words = e.message.split(' ')
        if (words.length >= 2) {
          const cmd = e.message.split(' ')[1]
          this.logs[server.uuid].push(`Command not found: ${cmd}. Please install it and/or add it to your PATH.\n`)
          this.logs[server.uuid].push('Check https://verifai.com.br/docs/mcp-server-troubleshooting for more information.')
        } else {
          this.logs[server.uuid].push('Command not found. Please install it and/or add it to your PATH.\n')
          this.logs[server.uuid].push('Check https://verifai.com.br/docs/mcp-server-troubleshooting for more information.')
        }
      }
    }

  }

  private connectToSseServer = async(server: McpServer): Promise<Client> => {

    try {

      // get transport
      const transport = new SSEClientTransport(
        new URL(server.url)
      )
      transport.onerror = (e) => {
        this.logs[server.uuid].push(e.message)
      }
      transport.onmessage = (message: any) => {
        console.log('MCP SSE message', message)
      }

      // build the client
      const client = new Client({
        name: 'verifai-mcp-client',
        version: '1.0.0'
      }, {
        capabilities: { 
          tools: {},
          prompts: {},
          resources: {}
        }
      })

      client.onerror = (e) => {
        this.logs[server.uuid].push(e.message)
      }

      // connect
      await client.connect(transport)

      // done
      return client


    } catch (e) {
      console.error(`Failed to connect to MCP server ${server.url}:`, e)
      this.logs[server.uuid].push(e.message)
    }

  }

  private connectToStreamableHttpServer = async(server: McpServer): Promise<Client> => {

    try {

      // get transport
      const transport = new StreamableHTTPClientTransport(new URL(server.url), {
        requestInit: {
          headers: server.headers || {},
        }
      })
      transport.onerror = (e) => {
        this.logs[server.uuid].push(e.message)
      }
      transport.onmessage = (message: any) => {
        console.log('MCP HTTP message', message)
      }

      // build the client
      const client = new Client({
        name: 'verifai-mcp-client',
        version: '1.0.0'
      }, {
        capabilities: { 
          tools: {},
          prompts: {},
          resources: {}
        }
      })

      client.onerror = (e) => {
        this.logs[server.uuid].push(e.message)
      }

      // connect
      await client.connect(transport)

      // done
      return client


    } catch (e) {
      console.error(`Failed to connect to MCP server ${server.url}:`, e)
      this.logs[server.uuid].push(e.message)
    }

  }  
  
  private disconnect = (client: McpClient): void => {
    client.client.close()
    this.clients = this.clients.filter(c => c !== client)
  }

  getServerTools = async (uuid: string): Promise<McpTool[]> => {

    const client = this.clients.find(client => client.server.uuid === uuid)
    if (!client) return []

    const tools = await client.client.listTools()
    return tools.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description    
    }))

  }

  getServerPrompts = async (uuid: string): Promise<McpPrompt[]> => {
    const client = this.clients.find(client => client.server.uuid === uuid)
    if (!client) return []

    try {
      const prompts = await client.client.listPrompts()
      return prompts.prompts.map((prompt: any) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments
      }))
    } catch (e: any) {
      return []
    }
  }

  getServerResources = async (uuid: string): Promise<McpResource[]> => {
    const client = this.clients.find(client => client.server.uuid === uuid)
    if (!client) return []

    try {
      const resources = await client.client.listResources()
      return resources.resources.map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
      }))
    } catch (e: any) {
      return []
    }
  }

  getTools = async (): Promise<LlmTool[]> => {
    const allTools: LlmTool[] = []
    
    // Adicionar tools normais
    for (const client of this.clients) {
      try {
        const tools = await client.client.listTools()
        for (const tool of tools.tools) {
          try {
            const functionTool = this.mcpToOpenAI(client.server, tool)
            allTools.push(functionTool)
          } catch (e) {
            console.error(`Failed to convert MCP tool ${tool.name} from MCP server ${client.server.url} to OpenAI tool:`, e)
          }
        }
      } catch (e) {
        console.error(`Failed to get tools from MCP server ${client.server.url}:`, e)
      }
    }
    
    // NÃO adicionar prompts como tools - LLM não deve chamar prompts
    // Prompts são apenas para uso manual via "/" no chat
    
    // Adicionar resources como tools
    const resourceTools = await this.getResourcesAsTools()
    allTools.push(...resourceTools)
    
    return allTools
  }

  getToolsByServer = async (serverUuid: string): Promise<LlmTool[]> => {
    const allTools: LlmTool[] = []
    
    // Encontrar o cliente do servidor
    const client = this.clients.find(c => c.server.uuid === serverUuid)
    if (!client) {
      return []
    }
    
    // Limpar mapeamento anterior
    this.resourceUriMap.clear()
    
    // Adicionar tools do servidor
    try {
      const tools = await client.client.listTools()
      for (const tool of tools.tools) {
        try {
          const functionTool = this.mcpToOpenAI(client.server, tool)
          allTools.push(functionTool)
        } catch (e) {
          console.error(`Failed to convert MCP tool ${tool.name} from MCP server ${client.server.url} to OpenAI tool:`, e)
        }
      }
    } catch (e) {
      console.error(`Failed to get tools from MCP server ${client.server.url}:`, e)
    }
    
    // Adicionar resources do servidor
    try {
      const resources = await client.client.listResources()
      for (const resource of resources.resources) {
        try {
          const toolName = this.uniqueResourceName(client.server, resource.uri)
          const fullToolName = `read_resource_${toolName}`
          
          // Mapear nome da tool para URI
          this.resourceUriMap.set(fullToolName, resource.uri)
          
          const resourceTool = this.mcpResourceToOpenAI(client.server, resource)
          allTools.push(resourceTool)
        } catch (e) {
          console.error(`Failed to convert MCP resource ${resource.uri} to OpenAI tool:`, e)
        }
      }
    } catch (e) {
      // Resources podem não estar disponíveis
    }
    
    return allTools
  }

  getPromptsAsTools = async (): Promise<LlmTool[]> => {
    const allTools: LlmTool[] = []
    for (const client of this.clients) {
      try {
        const prompts = await client.client.listPrompts()
        for (const prompt of prompts.prompts) {
          try {
            const promptTool = this.mcpPromptToOpenAI(client.server, prompt)
            allTools.push(promptTool)
          } catch (e) {
            console.error(`Failed to convert MCP prompt ${prompt.name} to OpenAI tool:`, e)
          }
        }
      } catch (e) {
        // Prompts podem não estar disponíveis em todos os servidores
      }
    }
    return allTools
  }

  getResourcesAsTools = async (): Promise<LlmTool[]> => {
    const allTools: LlmTool[] = []
    this.resourceUriMap.clear() // Limpar mapeamento anterior
    
    for (const client of this.clients) {
      try {
        const resources = await client.client.listResources()
        for (const resource of resources.resources) {
          try {
            const toolName = this.uniqueResourceName(client.server, resource.uri)
            const fullToolName = `read_resource_${toolName}`
            
            // Mapear nome da tool para URI
            this.resourceUriMap.set(fullToolName, resource.uri)
            
            const resourceTool = this.mcpResourceToOpenAI(client.server, resource)
            allTools.push(resourceTool)
          } catch (e) {
            console.error(`Failed to convert MCP resource ${resource.uri} to OpenAI tool:`, e)
          }
        }
      } catch (e) {
        // Resources podem não estar disponíveis em todos os servidores
      }
    }
    return allTools
  }

  getResourceUriByToolName(toolName: string): string | null {
    return this.resourceUriMap.get(toolName) || null
  }

  callTool = async (name: string, args: anyDict): Promise<any> => {

    const client = this.clients.find(client => client.tools.includes(name))
    if (!client) {
      throw new Error(`Tool ${name} not found`)
    }

    // remove unique suffix
    const tool = this.originalToolName(name)
    console.log('Calling MCP tool', tool, args)

    return await client.client.callTool({
      name: tool,
      arguments: args
    }, CompatibilityCallToolResultSchema)

  }

  callPrompt = async (name: string, args: anyDict): Promise<any> => {
    const client = this.clients.find(client => client.prompts.includes(name))
    if (!client) {
      throw new Error(`Prompt ${name} not found`)
    }

    // remove unique suffix
    const prompt = this.originalPromptName(name)
    console.log('Calling MCP prompt', prompt, args)
    this.logs[client.server.uuid].push(`[${new Date().toISOString()}] Calling prompt: ${prompt}\n`)
    this.logs[client.server.uuid].push(`Arguments: ${JSON.stringify(args)}\n`)

    try {
      const result = await client.client.getPrompt({
        name: prompt,
        arguments: args
      })
      
      this.logs[client.server.uuid].push(`[${new Date().toISOString()}] Prompt result received\n`)
      return result
    } catch (error: any) {
      this.logs[client.server.uuid].push(`[${new Date().toISOString()}] Prompt error: ${error.message}\n`)
      throw error
    }
  }

  getResource = async (uri: string): Promise<any> => {
    const client = this.clients.find(client => client.resources.includes(uri))
    if (!client) {
      throw new Error(`Resource ${uri} not found`)
    }

    console.log('Getting MCP resource', uri)
    this.logs[client.server.uuid].push(`[${new Date().toISOString()}] Getting resource: ${uri}\n`)

    try {
      const result = await client.client.readResource({
        uri: uri
      })
      
      this.logs[client.server.uuid].push(`[${new Date().toISOString()}] Resource retrieved\n`)
      return result
    } catch (error: any) {
      this.logs[client.server.uuid].push(`[${new Date().toISOString()}] Resource error: ${error.message}\n`)
      throw error
    }
  }

  originalToolName(name: string): string {
    return name.replace(/___....$/, '')
  }

  protected uniqueToolName(server: McpServer, name: string): string {
    return `${name}___${server.uuid.padStart(4, '_').slice(-4)}`
  }

  protected uniquePromptName(server: McpServer, name: string): string {
    return `prompt_${name}___${server.uuid.padStart(4, '_').slice(-4)}`
  }

  originalPromptName(name: string): string {
    return name.replace(/^prompt_/, '').replace(/___....$/, '')
  }

  protected mcpToOpenAI = (server: McpServer, tool: any): LlmTool => {
    return {
      type: 'function',
      function: {
        name: this.uniqueToolName(server, tool.name),
        description: tool.description ? tool.description : tool.name,
        parameters: {
          type: 'object',
          properties: tool.inputSchema?.properties ? Object.keys(tool.inputSchema.properties).reduce((obj: anyDict, key: string) => {
            const prop = tool.inputSchema.properties[key]
            obj[key] = {
              type: prop.type || 'string',
              description: (prop.description || key),
              ...(prop.type === 'array' ? { items: prop.items || 'string' } : {}),
            }
            return obj
          }, {}) : {},
          required: tool.inputSchema?.required ?? []
        }
      }
    }
  }

  protected mcpPromptToOpenAI = (server: McpServer, prompt: any): LlmTool => {
    // Construir schema de parâmetros baseado nos argumentos do prompt
    const properties: anyDict = {}
    const required: string[] = []
    
    if (prompt.arguments && Array.isArray(prompt.arguments)) {
      for (const arg of prompt.arguments) {
        properties[arg.name] = {
          type: arg.type || 'string',
          description: arg.description || arg.name
        }
        if (arg.required) {
          required.push(arg.name)
        }
      }
    }

    return {
      type: 'function',
      function: {
        name: this.uniquePromptName(server, prompt.name),
        description: prompt.description || `Execute MCP prompt: ${prompt.name}. This prompt will be executed and its result will be included in the conversation.`,
        parameters: {
          type: 'object',
          properties,
          required
        }
      }
    }
  }

  protected mcpResourceToOpenAI = (server: McpServer, resource: any): LlmTool => {
    const toolName = this.uniqueResourceName(server, resource.uri)
    return {
      type: 'function',
      function: {
        name: `read_resource_${toolName}`,
        description: resource.description || `Read MCP resource: ${resource.uri}. This will retrieve the content of the resource for analysis.`,
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }
  }

  protected uniqueResourceName(server: McpServer, uri: string): string {
    // Criar um nome único baseado no URI
    const uriHash = uri.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
    return `${uriHash}___${server.uuid.padStart(4, '_').slice(-4)}`
  }

}
