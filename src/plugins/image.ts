
import { anyDict } from '../types/index'
import { store } from '../services/store'
import { i18nInstructions, t } from '../services/i18n'
import { PluginExecutionContext, PluginParameter } from 'multi-llm-ts'
import Plugin, { PluginConfig } from './plugin'
import ImageCreator from '../services/image'

export default class extends Plugin {

  creator: ImageCreator
  
  constructor(config: PluginConfig) {
    super(config)
    this.creator = new ImageCreator()
  }

  isEnabled(): boolean {
    if (!this.config?.enabled) return false
    const engines = store.config?.engines || {}

    switch (this.config.engine) {
      case 'openai':
        return !!engines.openai?.apiKey?.trim()
      case 'google':
        return !!engines.google?.apiKey?.trim()
      case 'xai':
        return !!engines.xai?.apiKey?.trim()
      case 'replicate':
        return !!engines.replicate?.apiKey?.trim()
      case 'falai':
        return !!engines.falai?.apiKey?.trim()
      case 'huggingface':
        return !!engines.huggingface?.apiKey?.trim()
      case 'sdwebui':
        return true
      default:
        return false
    }
  }

  getName(): string {
    return 'image_generation'
  }

  getDescription(): string {
    return i18nInstructions({ plugins: { image: this.config } }, 'plugins.image.description')
  }

  getPreparationDescription(): string {
    return this.getRunningDescription()
  }
      
  getRunningDescription(): string {
    return t('plugins.image.running')
  }

  getCompletedDescription(tool: string, args: any, results: any): string | undefined {
    if (results.error) {
      return t('plugins.image.error')
    } else {
      return t('plugins.image.completed', { engine: this.config.engine, model: this.config.model, prompt: args.prompt })
    }
  }

  getParameters(): PluginParameter[] {

    // every one has this
    const parameters: PluginParameter[] = [
      {
        name: 'prompt',
        type: 'string',
        description: 'The description of the image',
        required: true
      }
    ]

    // openai parameters
    if (this.config.engine == 'openai') {

      // rest depends on model
      if (this.config.model === 'dall-e-2') {

        parameters.push({
          name: 'size',
          type: 'string',
          enum: [ '256x256', '512x512', '1024x1024' ],
          description: 'The size of the image',
          required: false
        })

      } else if (this.config.model === 'dall-e-3') {

        parameters.push({
          name: 'quality',
          type: 'string',
          enum: [ 'standard', 'hd' ],
          description: 'The quality of the image',
          required: false
        })

        parameters.push({
          name: 'size',
          type: 'string',
          enum: [ '1024x1024', '1792x1024', '1024x1792' ],
          description: 'The size of the image',
          required: false
        })

        parameters.push({
          name: 'style',
          type: 'string',
          enum: ['vivid', 'natural'],
          description: 'The style of the image',
          required: false
        })

      }

    }

    // huggingface parameters
    if (this.config.engine == 'huggingface') {

      // parameters.push({
      //   name: 'negative_prompt',
      //   type: 'string',
      //   description: 'Stuff to avoid in the generated image',
      //   required: false
      // })

      // parameters.push({
      //   name: 'width',
      //   type: 'number',
      //   description: 'The width of the image',
      //   required: false
      // })

      // parameters.push({
      //   name: 'height',
      //   type: 'number',
      //   description: 'The height of the image',
      //   required: false
      // })

    }

    // done
    return parameters
  
  }

  execute(context: PluginExecutionContext, parameters: anyDict): Promise<any> {
    try {
      return this.creator.execute(this.config.engine, this.config.model, parameters)
    } catch (error) {
      return Promise.resolve({ error: error })
    }
  }

}
