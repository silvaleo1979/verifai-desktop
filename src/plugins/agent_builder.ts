
import { anyDict } from '../types/index'
import { PluginExecutionContext, MultiToolPlugin, LlmTool, PluginParameter } from 'multi-llm-ts'
import { PluginConfig } from './plugin'
import { store } from '../services/store'
import Agent from '../models/agent'
import Runner from '../services/runner'
import { z } from 'zod'

export default class AgentBuilderPlugin extends MultiToolPlugin {

  config: PluginConfig

  constructor(config: PluginConfig) {
    super()
    this.config = config
  }

  isEnabled(): boolean {
    // Agent builder is enabled via plugin settings
    return this.config?.enabled === true
  }

  getName(): string {
    return 'agent_builder'
  }

  getPreparationDescription(name: string): string {
    if (name === 'create_agent') {
      return 'Preparing to create agent...'
    } else if (name === 'list_agents') {
      return 'Loading agents list...'
    } else if (name === 'run_agent') {
      return 'Preparing to run agent...'
    } else if (name === 'list_agent_runs') {
      return 'Loading agent execution history...'
    } else if (name === 'export_agent') {
      return 'Preparing to export agent...'
    } else if (name === 'import_agent') {
      return 'Preparing to import agent...'
    }
    return 'Processing...'
  }

  getRunningDescription(name: string, args: any): string {
    if (name === 'create_agent') {
      return 'Creating agent with specified configuration...'
    } else if (name === 'list_agents') {
      return 'Retrieving available agents...'
    } else if (name === 'run_agent') {
      return `Running agent: ${args?.agent_id || 'unknown'}...`
    } else if (name === 'list_agent_runs') {
      return `Retrieving execution history for agent: ${args?.agent_id || 'unknown'}...`
    } else if (name === 'export_agent') {
      return `Exporting agent: ${args?.agent_id || 'unknown'}...`
    } else if (name === 'import_agent') {
      return 'Importing agent from file...'
    }
    return 'Running...'
  }

  async getTools(): Promise<LlmTool[]> {
    return [
      {
        type: 'function',
        function: {
          name: 'create_agent',
          description: `Creates a new AI agent with specified capabilities and workflow steps. An agent is an automated workflow that can execute tasks using AI models and tools. Use this when the user asks to create an agent, automation, or workflow that should be saved and reused.

Key concepts:
- Each agent has one or more steps that execute sequentially
- Steps can use tools (web search, file operations, etc.) to accomplish tasks
- Steps can call other agents for complex workflows
- The agent prompt should include clear instructions and can use variables like {input} for dynamic values

Example use cases:
- "Create an agent to research a topic and write a summary"
- "Build a workflow to extract data from websites"
- "Make an agent that processes files and saves results"

When creating an agent:
1. Choose an appropriate engine and model (use the user's current selection if not specified)
2. Write clear, detailed prompts for each step
3. Select only the tools needed for the task
4. Break complex tasks into multiple steps if needed`,
          parameters: {
            type: 'object',
            properties: {
              name: { name: 'name', type: 'string', description: 'Short, descriptive name for the agent (e.g., "Web Research Assistant")' },
              description: { name: 'description', type: 'string', description: 'Detailed description of what the agent does and when to use it' },
              engine: { name: 'engine', type: 'string', description: 'LLM engine to use (openai, anthropic, google, ollama). Leave empty to use current user selection. Do NOT use "default".' },
              model: { name: 'model', type: 'string', description: 'Model name to use (e.g., "gpt-4o", "claude-3-5-sonnet-20241022"). Leave empty to use current user selection. Do NOT use "default".' },
              instructions: { name: 'instructions', type: 'string', description: 'System-level instructions that apply to all steps. Optional.' },
              locale: { name: 'locale', type: 'string', description: 'Language locale (e.g., "en", "pt", "fr"). Optional, uses user default if not specified.' },
              steps: {
                name: 'steps',
                type: 'array',
                description: 'Array of steps to execute. Each step runs sequentially and can access outputs from previous steps.',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Optional name for this step' },
                    prompt: {  type: 'string', description: 'REQUIRED: The prompt/instructions for this step. Must clearly describe what the AI should do and what output is expected. Can reference previous step outputs with {output.1}, {output.2}, etc.' },
                    tools: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Array of tool names this step can use. Available: search_internet, extract_webpage_content, browse_webpage, youtube_transcript, read_file, write_file, list_directory, execute_python_code, generate_image, generate_video, create_memory, query_memory, and MCP tools. If empty, all tools available.'
                    },
                    agents: { type: 'array', items: { type: 'string' }, description: 'Array of agent IDs this step can call. Optional.' },
                    docrepo: { type: 'string', description: 'Document repository ID to use for RAG. Optional.' }
                  },
                  required: ['prompt']
                }
              }
            },
            required: ['name', 'description', 'steps']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_agents',
          description: 'Returns a list of all available agents that have been created. Use this to see what agents exist, their names, descriptions, and capabilities. Helpful when the user asks "what agents do I have?", "show me my agents", or before suggesting to create a new agent.',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_agent',
          description: 'Executes an existing agent with the provided input. Use this when the user wants to run an agent they created, or when you need to use an agent to accomplish a task. The agent will execute its workflow and return the results.',
          parameters: {
            type: 'object',
            properties: {
              agent_id: {
                name: 'agent_id',
                type: 'string',
                description: 'The ID of the agent to run. Use list_agents to get available agent IDs.'
              },
              input: {
                name: 'input',
                type: 'string',
                description: 'The input text/prompt to provide to the agent. This will be available to the agent steps as {input}.'
              }
            },
            required: ['agent_id', 'input']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_agent_runs',
          description: 'Returns the execution history (runs) of a specific agent. Each run includes the status, input, output, timestamps, and any errors. Use this when the user asks about an agent\'s history, past executions, or wants to see what an agent has done previously.',
          parameters: {
            type: 'object',
            properties: {
              agent_id: {
                name: 'agent_id',
                type: 'string',
                description: 'The ID of the agent to get runs for. Use list_agents to get available agent IDs.'
              }
            },
            required: ['agent_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'export_agent',
          description: 'Exports an agent to a JSON file. The user will be prompted to select a save location. Use this when the user asks to export, save, or backup an agent to a file.',
          parameters: {
            type: 'object',
            properties: {
              agent_id: {
                name: 'agent_id',
                type: 'string',
                description: 'The ID of the agent to export. Use list_agents to get available agent IDs.'
              }
            },
            required: ['agent_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'import_agent',
          description: 'Imports an agent from a JSON file. The user will be prompted to select a file. Use this when the user asks to import, load, or restore an agent from a file.',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      }
    ]
  }

  handlesTool(name: string): boolean {
    return ['create_agent', 'list_agents', 'run_agent', 'list_agent_runs', 'export_agent', 'import_agent'].includes(name)
  }

  getParameters(): PluginParameter[] {
    return [{
      name: 'agent',
      description: 'The agent configuration to create',
      required: true,
      schema: z.object({
        name: z.string().describe('Short, descriptive name for the agent (e.g., "Web Research Assistant")'),
        description: z.string().describe('Detailed description of what the agent does and when to use it'),
        engine: z.string().optional().describe('LLM engine to use (openai, anthropic, google, ollama). Leave empty or omit to use current user selection. Do NOT use "default".'),
        model: z.string().optional().describe('Model name to use (e.g., "gpt-4o", "claude-3-5-sonnet-20241022"). Leave empty or omit to use current user selection. Do NOT use "default".'),
        instructions: z.string().optional().describe('System-level instructions that apply to all steps. Optional.'),
        locale: z.string().optional().describe('Language locale (e.g., "en", "pt", "fr"). Optional, uses user default if not specified.'),
        steps: z.array(z.object({
          name: z.string().optional().describe('Optional name for this step'),
          prompt: z.string().describe('REQUIRED: The prompt/instructions for this step. Must clearly describe what the AI should do and what output is expected. If using tools, describe how to use them and what to look for. Can reference previous step outputs with {output.1}, {output.2}, etc.'),
          tools: z.array(z.string()).optional().describe(`Array of tool names this step can use. Available tools include:
            
Built-in tools:
- search_internet: Search the web for information
- extract_webpage_content: Extract content from a webpage
- browse_webpage: Browse and interact with webpages
- youtube_transcript: Get transcripts from YouTube videos
- read_file: Read files from the filesystem
- write_file: Write files to the filesystem
- list_directory: List directory contents
- execute_python_code: Execute Python code
- generate_image: Generate images using AI
- generate_video: Generate videos using AI
- create_memory: Store information in long-term memory
- query_memory: Retrieve information from long-term memory

MCP Tools:
- Any tools from connected MCP servers (check available MCP tools in settings)
- MCP tool names are prefixed with the server name (e.g., "filesystem__read_file", "github__search_repos")

If not specified or empty, all available tools can be used.`),
          agents: z.array(z.string()).optional().describe('Array of agent IDs this step can call. Optional.'),
          docrepo: z.string().optional().describe('Document repository ID to use for RAG. Optional.')
        })).min(1).describe('Array of steps to execute. Each step runs sequentially and can access outputs from previous steps.')
      })
    }]
  }

  async execute(context: PluginExecutionContext, parameters: anyDict): Promise<anyDict> {
    const toolName = parameters.tool
    
    // Verify this plugin handles the tool
    if (!this.handlesTool(toolName)) {
      return {
        success: false,
        error: `Tool ${toolName} is not handled by this plugin`
      }
    }
    
    if (toolName === 'list_agents') {
      return this.executeListAgents()
    } else if (toolName === 'create_agent') {
      return this.executeCreateAgent(parameters.parameters)
    } else if (toolName === 'run_agent') {
      return this.executeRunAgent(parameters.parameters)
    } else if (toolName === 'list_agent_runs') {
      return this.executeListAgentRuns(parameters.parameters)
    } else if (toolName === 'export_agent') {
      return this.executeExportAgent(parameters.parameters)
    } else if (toolName === 'import_agent') {
      return this.executeImportAgent()
    } else {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      }
    }
  }

  private async executeListAgents(): Promise<anyDict> {
    try {
      const agents = store.agents || []
      
      if (agents.length === 0) {
        return {
          success: true,
          count: 0,
          agents: [],
          message: 'No agents have been created yet.'
        }
      }

      const agentList = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        engine: agent.engine || 'default',
        model: agent.model || 'default',
        steps: agent.steps?.length || 0,
        type: agent.type || 'runnable',
        source: agent.source || 'user'
      }))

      return {
        success: true,
        count: agentList.length,
        agents: agentList,
        message: `Found ${agentList.length} agent(s).`
      }
    } catch (error) {
      console.error('List agents error:', error)
      return {
        success: false,
        error: `Failed to list agents: ${error.message}`
      }
    }
  }

  private async executeListAgentRuns(parameters: anyDict): Promise<anyDict> {
    try {
      const { agent_id } = parameters

      // Validate parameters
      if (!agent_id) {
        return {
          success: false,
          error: 'agent_id is required'
        }
      }

      // Find the agent first to get its name
      const agent = store.agents?.find(a => a.id === agent_id)
      if (!agent) {
        return {
          success: false,
          error: `Agent with ID "${agent_id}" not found. Use list_agents to see available agents.`
        }
      }

      // Get runs from the API
      const runs = window.api.agents.getRuns(agent_id) || []

      if (runs.length === 0) {
        return {
          success: true,
          agent_id: agent_id,
          agent_name: agent.name,
          count: 0,
          runs: [],
          message: `No runs found for agent "${agent.name}".`
        }
      }

      // Format runs for output
      const runList = runs.map(run => ({
        id: run.id,
        status: run.status,
        createdAt: run.createdAt,
        createdAtFormatted: new Date(run.createdAt).toLocaleString(),
        input: run.input || '',
        output: run.messages?.length > 0 ? run.messages[run.messages.length - 1]?.content?.substring(0, 500) : '',
        error: run.error || null,
        messageCount: run.messages?.length || 0
      }))

      return {
        success: true,
        agent_id: agent_id,
        agent_name: agent.name,
        count: runList.length,
        runs: runList,
        message: `Found ${runList.length} run(s) for agent "${agent.name}".`
      }
    } catch (error) {
      console.error('List agent runs error:', error)
      return {
        success: false,
        error: `Failed to list agent runs: ${error.message}`
      }
    }
  }

  private async executeRunAgent(parameters: anyDict): Promise<anyDict> {
    try {
      const { agent_id, input } = parameters

      // Validate parameters
      if (!agent_id) {
        return {
          success: false,
          error: 'agent_id is required'
        }
      }

      if (!input) {
        return {
          success: false,
          error: 'input is required'
        }
      }

      // Find the agent
      const agent = store.agents?.find(a => a.id === agent_id)
      if (!agent) {
        return {
          success: false,
          error: `Agent with ID "${agent_id}" not found. Use list_agents to see available agents.`
        }
      }

      // Create and run the agent
      const runner = new Runner(store.config, agent)
      const run = await runner.run('workflow', input, { ephemeral: true })

      if (run.status === 'success') {
        const result = run.messages[run.messages.length - 1]?.content || ''
        return {
          success: true,
          status: 'completed',
          result: result,
          runId: run.id,
          agent_name: agent.name,
          message: `Agent "${agent.name}" completed successfully.`
        }
      } else if (run.status === 'error') {
        return {
          success: false,
          status: 'error',
          error: run.error || 'Unknown error occurred',
          runId: run.id,
          agent_name: agent.name
        }
      } else {
        return {
          success: false,
          status: run.status,
          error: `Agent execution ended with status: ${run.status}`,
          runId: run.id,
          agent_name: agent.name
        }
      }
    } catch (error) {
      console.error('Run agent error:', error)
      return {
        success: false,
        error: `Failed to run agent: ${error.message}`
      }
    }
  }

  private async executeCreateAgent(parameters: anyDict): Promise<anyDict> {
    try {
      console.log('Agent builder received parameters:', parameters, JSON.stringify(parameters))
      
      // For create_agent, parameters come directly (not nested in 'agent' property)
      const agentConfig = parameters
      
      console.log('Agent config keys:', Object.keys(agentConfig))
      console.log('Agent config name:', agentConfig.name)
      console.log('Agent config steps:', agentConfig.steps)

      // Validate required fields
      if (!agentConfig.name || !agentConfig.description) {
        return {
          success: false,
          error: 'Agent name and description are required'
        }
      }

      if (!agentConfig.steps || agentConfig.steps.length === 0) {
        return {
          success: false,
          error: 'Agent must have at least one step'
        }
      }

      // Create the agent object
      const agent = new Agent()
      agent.name = agentConfig.name
      agent.description = agentConfig.description
      
      // Handle 'default' engine/model as empty (use current selection)
      const engine = agentConfig.engine === 'default' ? '' : agentConfig.engine
      const model = agentConfig.model === 'default' ? '' : agentConfig.model
      
      agent.engine = engine || store.config?.llm?.engine || ''
      agent.model = model || ''
      agent.instructions = agentConfig.instructions || ''
      agent.locale = agentConfig.locale || store.config?.llm?.locale || ''
      agent.type = 'runnable'
      agent.source = 'verifai'
      
      // Process steps - handle various formats the LLM might send
      agent.steps = agentConfig.steps.map((stepConfig: any) => {
        // Handle tools: can be array, single string in 'tool' field, or 'tools' field
        let tools = null
        if (stepConfig.tools) {
          tools = Array.isArray(stepConfig.tools) ? stepConfig.tools : [stepConfig.tools]
        } else if (stepConfig.tool) {
          // Handle 'none' as no specific tools (null = all tools available)
          if (stepConfig.tool.toLowerCase() === 'none') {
            tools = null
          } else {
            tools = [stepConfig.tool]
          }
        }

        // Clean up tool names - remove namespace prefixes like "functions."
        if (tools && Array.isArray(tools)) {
          tools = tools
            .filter(t => t && t.toLowerCase() !== 'none') // Remove 'none' entries
            .map(t => {
              // Remove common prefixes
              const cleaned = t.replace(/^(functions\.|tools\.)/, '')
              return cleaned
            })
          // If array is empty after cleaning, set to null
          if (tools.length === 0) {
            tools = null
          }
        }

        return {
          name: stepConfig.name || undefined,
          prompt: stepConfig.prompt || null, // Use null if no prompt
          tools: tools, // null means all tools available, array means specific tools
          agents: stepConfig.agents || [],
          docrepo: stepConfig.docrepo || null
        }
      })

      console.log('Created agent object:', JSON.stringify(agent, null, 2))

      // Validate agent object before saving
      if (!agent || !agent.name || !agent.id) {
        console.error('Invalid agent object:', agent)
        return {
          success: false,
          error: 'Agent validation failed: missing required properties'
        }
      }

      // Save the agent
      let saved = false
      try {
        saved = window.api.agents.save(agent)
      } catch (saveError) {
        console.error('Error saving agent:', saveError)
        return {
          success: false,
          error: `Failed to save agent: ${saveError.message}`
        }
      }

      if (saved) {
        // Reload agents in store
        // Note: The store will be reloaded via file-modified event

        return {
          success: true,
          agent_id: agent.id,
          agent_name: agent.name,
          message: `Agent "${agent.name}" created successfully! The agent is now available in the Agent Forge and can be used from chat or run on a schedule.`,
          details: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            steps: agent.steps.length,
            engine: agent.engine,
            model: agent.model
          }
        }
      } else {
        return {
          success: false,
          error: 'Failed to save agent. Please check permissions and try again.'
        }
      }

    } catch (error) {
      console.error('Agent builder error:', error)
      return {
        success: false,
        error: `Failed to create agent: ${error.message}`
      }
    }
  }

  private async executeExportAgent(parameters: anyDict): Promise<anyDict> {
    try {
      const { agent_id } = parameters

      // Validate parameters
      if (!agent_id) {
        return {
          success: false,
          error: 'agent_id is required'
        }
      }

      // Find the agent
      const agent = store.agents?.find(a => a.id === agent_id)
      if (!agent) {
        return {
          success: false,
          error: `Agent with ID "${agent_id}" not found. Use list_agents to see available agents.`
        }
      }

      // Create export data (exclude functions that can't be serialized)
      const exportData = {
        id: agent.id,
        remoteId: agent.remoteId || null,
        source: agent.source || 'verifai',
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        engine: agent.engine,
        model: agent.model,
        locale: agent.locale,
        modelOpts: agent.modelOpts,
        disableStreaming: agent.disableStreaming,
        instructions: agent.instructions,
        parameters: agent.parameters,
        steps: agent.steps,
        schedule: agent.schedule,
        invocationValues: agent.invocationValues
      }

      // Prompt user to select save location and save file
      const filePath = window.api.file.save({
        contents: window.api.base64.encode(JSON.stringify(exportData, null, 2)),
        url: `${agent.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`,
        properties: {
          directory: 'documents',
          prompt: true
        }
      })

      if (!filePath) {
        return {
          success: false,
          error: 'Export cancelled by user'
        }
      }

      return {
        success: true,
        message: `Agent "${agent.name}" exported successfully to ${filePath}`,
        agent_id: agent.id,
        agent_name: agent.name,
        file_path: filePath
      }
    } catch (error) {
      console.error('Export agent error:', error)
      return {
        success: false,
        error: `Failed to export agent: ${(error as Error).message}`
      }
    }
  }

  private async executeImportAgent(): Promise<anyDict> {
    try {
      // Prompt user to select file
      const filePath = window.api.file.pickFile({
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })

      if (!filePath) {
        return {
          success: false,
          error: 'Import cancelled by user'
        }
      }

      // Read file content - returns FileContents object
      const fileContents = window.api.file.read(filePath as string)
      if (!fileContents || !fileContents.contents) {
        return {
          success: false,
          error: 'Failed to read file or file is empty'
        }
      }

      // Decode base64 content
      const content = window.api.base64.decode(fileContents.contents)

      // Parse JSON
      let importData: anyDict
      try {
        importData = JSON.parse(content)
      } catch {
        return {
          success: false,
          error: 'Invalid JSON file format'
        }
      }

      // Validate required fields
      if (!importData.name || !importData.steps || !Array.isArray(importData.steps)) {
        return {
          success: false,
          error: 'Invalid agent file: missing required fields (name, steps)'
        }
      }

      // Create new agent from imported data
      const agent = new Agent()
      agent.id = crypto.randomUUID() // Always generate new ID on import
      agent.remoteId = null // Clear remoteId on import
      agent.source = 'verifai'
      agent.createdAt = Date.now()
      agent.updatedAt = Date.now()
      agent.name = importData.name
      agent.description = importData.description || ''
      agent.type = importData.type || 'runnable'
      agent.engine = importData.engine || ''
      agent.model = importData.model || ''
      agent.locale = importData.locale || ''
      agent.modelOpts = importData.modelOpts || null
      agent.disableStreaming = importData.disableStreaming || false
      agent.instructions = importData.instructions || ''
      agent.parameters = importData.parameters || []
      agent.steps = importData.steps
      agent.schedule = importData.schedule || null
      agent.invocationValues = importData.invocationValues || {}

      // Save the agent
      const saved = window.api.agents.save(agent)

      if (saved) {
        return {
          success: true,
          message: `Agent "${agent.name}" imported successfully! The agent is now available in the Agent Forge.`,
          agent_id: agent.id,
          agent_name: agent.name,
          details: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            steps: agent.steps.length
          }
        }
      } else {
        return {
          success: false,
          error: 'Failed to save imported agent. Please check permissions and try again.'
        }
      }
    } catch (error) {
      console.error('Import agent error:', error)
      return {
        success: false,
        error: `Failed to import agent: ${(error as Error).message}`
      }
    }
  }

}
