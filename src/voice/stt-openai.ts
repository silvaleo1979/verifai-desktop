
import { Configuration } from 'types/config'
import { STTEngine, ProgressCallback, TranscribeResponse } from './stt'
import OpenAI from 'openai'

export default class STTOpenAI implements STTEngine {

  config: Configuration
  client: OpenAI

  static readonly models = [
    { id: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe (online)' },
    { id: 'gpt-4o-mini-transcribe', label: 'GPT-4o Mini Transcribe (online)' },
    { id: 'whisper-1', label: 'OpenAI Whisper V2 (online)' },
  ]

    constructor(config: Configuration, baseURL?: string) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.engines.openai.apiKey,
      baseURL: baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  get name(): string {
    return 'openai'
  }

  isReady(): boolean {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isStreamingModel(model: string): boolean {
    return false
  }

  static requiresDownload(): boolean {
    return false
  }

  requiresDownload(): boolean {
    return STTOpenAI.requiresDownload()
  }

  async initialize(callback?: ProgressCallback): Promise<void> {
    callback?.({ status: 'ready', task: 'openai', model: this.config.stt.model })
  }

  async transcribe(audioBlob: Blob, opts?: object): Promise<TranscribeResponse> {
    return this.transcribeFile(new File([audioBlob], 'audio.webm', { type: audioBlob.type }), opts)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transcribeFile(file: File, opts?: object): Promise<TranscribeResponse> {

    // call
    const response = await this.client.audio.transcriptions.create({
      file: file,
      model: this.config.stt.model,
      ...(this.config.stt.locale ? { language: this.config.stt.locale.substring(0, 2) } : {}),
    });

    // return
    return response
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isModelDownloaded(model: string): Promise<boolean> {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteModel(model: string): Promise<void> {
    return
  }

  deleteAllModels(): Promise<void> {
    return
  }

}
