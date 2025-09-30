import * as llm from 'multi-llm-ts'
import { type ModelsList } from 'multi-llm-ts'

export type BayerEngineConfig = {
  apiKey?: string
  baseURL?: string
  model?: { chat?: string }
  models?: ModelsList
} & Record<string, any>

export default class BayerEngine extends llm.OpenAI {

  declare config: BayerEngineConfig

  constructor(config: BayerEngineConfig) {
    super({ apiKey: config.apiKey, baseURL: config.baseURL } as any)
    this.config = config as any
  }

  getId(): string { return 'bayer' }

  static isConfigured = (opts: BayerEngineConfig) => {
    return !!opts?.apiKey
  }

  static isReady = (opts: BayerEngineConfig, models: ModelsList) => {
    return BayerEngine.isConfigured(opts) && (models?.chat?.length || 0) > 0
  }
}


