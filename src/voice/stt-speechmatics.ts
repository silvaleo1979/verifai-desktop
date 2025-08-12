import { Configuration } from 'types/config'
import { STTEngine, ProgressCallback, TranscribeResponse, StreamingCallback } from './stt'
import { OperatingPoint, RealtimeClient } from '@speechmatics/real-time-client';
import { createSpeechmaticsJWT } from '@speechmatics/auth';

export default class STTSpeechmatics implements STTEngine {

  config: Configuration
  client: RealtimeClient|null

  static readonly models = [
    { id: 'realtime', label: 'Standard (realtime)' },
    { id: 'enhanced', label: 'Enhanced (realtime)' },
  ]

  constructor(config: Configuration) {
    this.config = config
    this.client = null
  }

  get name(): string {
    return 'speechmatics'
  }

  isReady(): boolean {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isStreamingModel(model: string): boolean {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requiresPcm16bits?(model: string): boolean {
    return false
  }

  static requiresDownload(): boolean {
    return false
  }

  requiresDownload(): boolean {
    return STTSpeechmatics.requiresDownload()
  }

  async initialize(callback?: ProgressCallback): Promise<void> {
    callback?.({ status: 'ready', task: 'speechmatics', model: this.config.stt.model })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transcribe(audioBlob: Blob, opts?: object): Promise<TranscribeResponse> {
    throw new Error('Transcription not supported in Speechmatics STT engine')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startStreaming(model: string, callback: StreamingCallback, opts?: Record<string, string>): Promise<void> {

    // check for API key before attempting connection
    if (!this.config.engines.speechmatics?.apiKey) {
      callback({ 
        type: 'error', 
        status: 'not_authorized', 
        error: 'Missing API key. Please check your Speechmatics AI configuration.' 
      })
      return
    }

    // get a jwt token for the WebSocket connection
    const jwt = await createSpeechmaticsJWT({
      type: 'rt',
      apiKey: this.config.engines.speechmatics?.apiKey,
      ttl: 60, // 1 minute
    })

    // configure the client
    let transcription = ''
    this.client = new RealtimeClient()
    this.client.addEventListener('receiveMessage', ({ data }) => {

      // based on
      // https://github.com/speechmatics/speechmatics-js-sdk/blob/main/examples/nodejs/real-time-file-example.ts
      
      if (data.message === 'AddPartialTranscript') {
      
        const partialText = data.results
          .map((r) => r.alternatives?.[0].content)
          .join(' ');
        //console.log(`[speechmatics] partial transcript "${partialText}"`)
        callback({ type: 'text', content: `${transcription} ${partialText}` })
      
      } else if (data.message === 'AddTranscript') {
      
        const text = data.results.map((r) => r.alternatives?.[0].content).join(' ');
        //console.log(`[speechmatics] add transcript "${text}"`)
        
        // append and fix spacing
        transcription += ` ${text}`
        transcription = transcription.replaceAll(/ ,/g, ',')
        transcription = transcription.replaceAll(/ \./g, '.').trim()
        if (!this.config.stt.locale.startsWith('fr')) {
          transcription = transcription.replaceAll(/ \?/g, '?')
          transcription = transcription.replaceAll(/ !/g, '!')
          transcription = transcription.replaceAll(/ :/g, ':')
        }
        
        // done
        callback({ type: 'text', content: transcription })
      
      } else if (data.message === 'EndOfTranscript') {
      
        console.log('[speechmatics] end of transcript')
        callback({ type: 'status', status: 'done' })
      
      }
    });

    // we can start
    await this.client.start(jwt, {
      transcription_config: {
        operating_point: model === 'enhanced' ? OperatingPoint.Enhanced : OperatingPoint.Standard,
        language: this.config.stt.locale?.substring(0, 2) || 'en',
        additional_vocab: this.config.stt.vocabulary?.map(v => v.text) || [],
        enable_partials: true,
      },
    });

  }

  async sendAudioChunk(chunk: Blob): Promise<void> {
    if (this.client?.socketState === 'open') {
      this.client?.sendAudio(chunk)
    }
  }

  async endStreaming(): Promise<void> {
    await this.client?.stopRecognition({ noTimeout: true})
    this.client = null
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