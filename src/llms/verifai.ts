import { WitsyEngineCreateOpts } from '../types/config'
import { ChatModel, LlmCompletionOpts, LLmCompletionPayload, ModelOllama, Ollama } from 'multi-llm-ts'
import { ChatRequest, } from 'ollama/dist/browser.cjs'

const getChatModels = (): ChatModel[] => {
  
  const ollama = new Ollama({});
  const models = [
    { id: 'deepseek-r1:latest', name: 'DeepSeek Reasoner' },
    { id: 'gemma3n:latest', name: 'Gemma 3n' },
    { id: 'qwen3:latest', name: 'Qwen 3' },
    { id: 'qwen2.5vl:latest', name: 'Qwen 2.5 Vision' },
    { id: 'llama3.2:latest', name: 'Llama 3.2' }
  ].map((model) => ({
    id: model.id,
    name: model.name,
    capabilities: ollama.getModelCapabilities({ name: model.id } as ModelOllama)
  }))
  return models

}

const getEmbeddingModels = () => [
  { id: 'all-minilm', name: 'all-minilm' },
  { id: 'nomic-embed-text', name: 'nomic-embed-text' },
  { id: 'mxbai-embed-large', name: 'mxbai-embed-large' },
]

export { getChatModels, getEmbeddingModels }

export default class VerifaiEngine extends Ollama {

  declare config: WitsyEngineCreateOpts

  buildChatOptions({ model, messages, opts }: { model: string, messages: LLmCompletionPayload[], opts: LlmCompletionOpts|null }): ChatRequest {
    const options = super.buildChatOptions({ model, messages, opts })
    
    const keepAlive = (() => {
      const value = this.config.keepAlive;
      if (!value?.length) {
        return undefined
      }
      if (typeof value === 'string') {
        const num = Number(value);
        return !isNaN(num) ? num : value;
      }
      return value;
    })();

    return {
      ...{ keep_alive: keepAlive },
      ...options
    }
  }

} 