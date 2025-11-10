
import { LlmModelOpts, PluginParameter } from 'multi-llm-ts'
import { AgentType, AgentStep, anyDict, type Agent as AgentBase } from '../types/index'
import { extractPromptInputs, replacePromptInputs } from '../services/prompt'
import { ZodType } from 'zod'

export default class Agent implements AgentBase {

  id: string
  source: 'verifai' | 'a2a'
  createdAt: number
  updatedAt: number
  name: string
  description: string
  type: AgentType
  engine: string
  model: string
  locale: string
  modelOpts: LlmModelOpts|null
  structuredOutput?: {
    name: string
    structure: ZodType
  }
  disableStreaming: boolean
  instructions: string
  parameters: PluginParameter[]
  steps: AgentStep[]
  schedule: string|null
  invocationValues: Record<string, string>

  constructor() {
    this.id = crypto.randomUUID()
    this.source = 'verifai'
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
    this.name = ''
    this.description = ''
    this.type = 'runnable'
    this.engine = ''
    this.model = ''
    this.modelOpts = {}
    this.disableStreaming = true
    this.locale = ''
    this.instructions = ''
    this.parameters = []
    this.steps = [{
      prompt: null,
      tools: null,
      agents: [],
      docrepo: null
    }]
    this.schedule = null
    this.invocationValues = {}
  }

  static fromJson(
    obj: any,
    preparationDescription?: () => string,
    runningDescription?: (args: any) => string,
    completedDescription?: (args: any, results: any) => string,
    errorDescription?: (args: any, results: any) => string
  ): Agent {
    const agent = new Agent()
    agent.id = obj.id || crypto.randomUUID()
    agent.source = obj.source ?? 'verifai'
    agent.createdAt = obj.createdAt ?? Date.now()
    agent.updatedAt = obj.updatedAt ?? Date.now()
    agent.name = obj.name
    agent.description = obj.description
    agent.type = obj.type ?? 'runnable'
    agent.engine = obj.engine ?? ''
    agent.model = obj.model ?? ''
    agent.modelOpts = obj.modelOpts ?? null
    agent.disableStreaming = obj.disableStreaming ?? true
    agent.locale = obj.locale ?? ''
    agent.instructions = obj.instructions ?? ''
    agent.parameters = obj.parameters ?? []
    // Migração: converter prompt antigo para steps
    agent.steps = obj.steps ?? [{
      prompt: obj.prompt ?? null,
      tools: obj.tools ?? null,
      agents: obj.agents ?? [],
      docrepo: obj.docrepo ?? null
    }]
    agent.schedule = obj.schedule ?? null
    agent.invocationValues = obj.invocationValues ?? {}
    agent.getPreparationDescription = preparationDescription
    agent.getRunningDescription = runningDescription
    agent.getCompletedDescription = completedDescription
    agent.getErrorDescription = errorDescription
    return agent
  }

  buildPrompt(step: number, parameters: anyDict): string|null {
    
    // Verificar se o step existe e tem prompt
    if (!this.steps[step] || !this.steps[step].prompt) return null

    // Extrair variáveis do prompt
    const promptInputs = extractPromptInputs(this.steps[step].prompt)
    
    // Garantir que temos valor para cada variável
    for (const promptInput of promptInputs) {
      if (!parameters[promptInput.name]) {
        parameters[promptInput.name] = promptInput.defaultValue ?? ''
      }
    }

    // Substituir variáveis no prompt
    return replacePromptInputs(this.steps[step].prompt, parameters)
  }
  
  getPreparationDescription?: () => string
  getRunningDescription?: (args: any) => string
  getCompletedDescription?: (args: any, results: any) => string
  getErrorDescription?: (args: any, results: any) => string

}
