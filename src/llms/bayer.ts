import { LlmEngine, type ChatModel, type LlmCompletionOpts, type LlmStreamingResponse, type LlmResponse, Message, defaultCapabilities, type Model, type ModelsList } from 'multi-llm-ts'
import { fromIni } from '@aws-sdk/credential-providers'
import { BedrockRuntimeClient, ConverseCommand, ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime'
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock'

export type BayerEngineConfig = {
  region?: string
  profile?: string
  roleArn?: string
  endpointUrl?: string
} & Record<string, any>

export default class BayerEngine extends LlmEngine {

  declare config: BayerEngineConfig

  getId(): string { return 'bayer' }

  static isConfigured = (opts: BayerEngineConfig) => {
    return !!opts?.region
  }

  static isReady = (opts: BayerEngineConfig, models: ModelsList) => {
    return BayerEngine.isConfigured(opts) && (models?.chat?.length || 0) > 0
  }

  private client(): BedrockRuntimeClient {
    const creds = this.config.profile ? fromIni({ profile: this.config.profile }) : undefined
    return new BedrockRuntimeClient({ region: this.config.region || 'us-east-1', credentials: creds, endpoint: this.config.endpointUrl })
  }

  async getModels(): Promise<any[]> {
    // Fallback to dynamic listing; UI will cache in config
    const creds = this.config.profile ? fromIni({ profile: this.config.profile }) : undefined
    const client = new BedrockClient({ region: this.config.region || 'us-east-1', credentials: creds })
    const resp = await client.send(new ListFoundationModelsCommand({ byInferenceType: 'ON_DEMAND' }))
    return (resp?.modelSummaries || []).filter(m => (m?.inputModalities || []).includes('TEXT'))
  }

  getModelCapabilities(_model: any) {
    return { tools: true, vision: false, reasoning: false, caching: false }
  }

  private buildConverseInput(model: string, thread: Message[], opts?: LlmCompletionOpts): ConverseCommandInput {
    const messages = thread.map(m => ({ role: m.role === 'system' ? 'system' : m.role, content: [{ text: m.content }] as any }))
    const maxTokens = opts?.maxTokens || 1024
    const temperature = typeof opts?.temperature === 'number' ? opts.temperature : 0.2
    return { modelId: model, messages, inferenceConfig: { maxTokens, temperature } }
  }

  protected async chat(model: Model | ChatModel, thread: any[], opts?: LlmCompletionOpts): Promise<LlmResponse> {
    const chatModel = this.toModel(model)
    const input = this.buildConverseInput(chatModel.id, thread as Message[], opts)
    const resp = await this.client().send(new ConverseCommand(input))
    const text = resp?.output?.message?.content?.map((c: any) => c?.text || '').join('') || ''
    return { type: 'text', content: text.trim() }
  }

  protected async stream(): Promise<LlmStreamingResponse> {
    // Streaming desabilitado inicialmente
    throw Object.assign(new Error("'stream' does not support true"), { status: 400 })
  }

  async stop(): Promise<void> {
    // no-op
  }

  protected async nativeChunkToLlmChunk(): Promise<AsyncGenerator<any, void, void>> {
    throw new Error('Streaming not implemented')
  }
}


