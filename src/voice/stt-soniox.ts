
import { Configuration } from 'types/config'
import { STTEngine, ProgressCallback, TranscribeResponse, StreamingCallback, } from './stt'

/**
 * Soniox speech‑to‑text engine (Async + Realtime).
 *
 * Async:
 *   - POST /v1/files
 *   - POST /v1/transcriptions
 *   - GET  /v1/transcriptions/{id}                          (status: queued|processing|completed|error)
 *   - GET  /v1/transcriptions/{id}/transcript               (text)
 *   - DELETE /v1/transcriptions/{id} + /v1/files/{id}       (optional cleanup)
 *
 * Realtime:
 *   - WebSocket wss://stt-rt.soniox.com/transcribe-websocket
 *   - Konfig: model, api_key, audio_format, language_hints, endpoint detection, ...
 *   - Tokens: { text: string, is_final: boolean }
 *   - EOS: leerer Binary-Frame (nicht leerer String!)
 *   - Optionale Temporary API Keys: POST /v1/auth/temporary-api-key
 */
export default class STTSoniox implements STTEngine {

  /** Default-Modelle (können via Settings überschrieben werden) */
  static readonly models = [
    { id: 'stt-async-preview', label: 'Soniox Async Preview' },
    { id: 'stt-rt-preview', label: 'Soniox Realtime Preview' },
  ]

  private config: Configuration
  private ws: WebSocket | null
  private finalTranscript = ''
  private pendingError: string | null = null

  constructor(config: Configuration) {
    this.config = config
    this.ws = null
  }

  get name(): string {
    return 'soniox'
  }

  isReady(): boolean {
    return true
  }

  isStreamingModel(model: string): boolean {
    return model?.startsWith('stt-rt')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requiresPcm16bits(model: string): boolean {
    return false
  }
  
  static requiresDownload(): boolean {
    return false
  }
  
  requiresDownload(): boolean {
    return STTSoniox.requiresDownload()
  }

  async initialize(callback?: ProgressCallback): Promise<void> {
    callback?.({ status: 'ready', task: 'soniox', model: this.config.stt.model })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transcribe(audioBlob: Blob, opts?: Record<string, any>): Promise<TranscribeResponse> {
    
    const apiKey = this.config.engines?.soniox?.apiKey
    if (!apiKey) throw new Error('Missing Soniox API key in settings')

    const asyncModel =  this.config.stt.model || 'stt-async-preview'
    const languageHints: string[] | undefined = this.config.stt?.soniox?.languageHints
    const audioFormat: string = this.config.stt?.soniox?.audioFormat || 'auto'
    const cleanup = this.config.stt?.soniox?.cleanup ?? false

    // 1) Upload
    const fd = new FormData()
    fd.append('file', audioBlob, 'audio')
    const up = await fetch('https://api.soniox.com/v1/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    })
    if (!up.ok) throw new Error(`Soniox file upload failed: ${up.status} ${up.statusText}`)
    const { id: fileId } = await up.json()
    if (!fileId) throw new Error('Soniox file upload response missing id')

    // 2) Create transcription
    const body: any = { file_id: fileId, model: asyncModel, audio_format: audioFormat }
    if (languageHints?.length) body.language_hints = languageHints
    const create = await fetch('https://api.soniox.com/v1/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!create.ok) throw new Error(`Soniox transcription creation failed: ${create.status} ${create.statusText}`)
    const { id: transcriptionId } = await create.json()
    if (!transcriptionId) throw new Error('Soniox transcription creation response missing id')

    // 3) Poll status
    let status = 'queued'
    let errorMessage: string | undefined
    for (let i = 0; i < 60 && status !== 'completed' && status !== 'error'; i++) {
      const st = await fetch(`https://api.soniox.com/v1/transcriptions/${transcriptionId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!st.ok) throw new Error(`Soniox transcription status failed: ${st.status} ${st.statusText}`)
      const json = await st.json() as { status: string; error_message?: string }
      status = json.status
      errorMessage = json.error_message
      if (status === 'completed' || status === 'error') break
      await new Promise(r => setTimeout(r, 1000))
    }
    if (status === 'error') throw new Error(`Soniox transcription error: ${errorMessage || 'unknown error'}`)
    if (status !== 'completed') throw new Error('Soniox transcription timed out before completion')

    // 4) Get transcript
    const tr = await fetch(`https://api.soniox.com/v1/transcriptions/${transcriptionId}/transcript`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!tr.ok) throw new Error(`Soniox get transcript failed: ${tr.status} ${tr.statusText}`)
    const { text = '' } = await tr.json()

    // 5) Cleanup
    if (cleanup) {
      
      try {
        await fetch(`https://api.soniox.com/v1/transcriptions/${transcriptionId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        })
      } catch (e) {
        console.error('Soniox transcription DELETE failed:', e)
      }
      
      try {
        await fetch(`https://api.soniox.com/v1/files/${fileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        })
      } catch (e) {
        console.error('Soniox file DELETE failed:', e)
      }
    }
    return { text }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startStreaming(model: string, callback: StreamingCallback, opts?: Record<string, any>): Promise<void> {
    
    if (this.ws) return

    const apiKey = this.config.engines?.soniox?.apiKey
    if (!apiKey) {
      callback({ type: 'error', status: 'not_authorized', error: 'Missing Soniox API key. Please check your Soniox configuration.' })
      return
    }

    const rtModel = model || 'stt-rt-preview'
    const languageHints: string[] | undefined = this.config.stt?.soniox?.languageHints
    const audioFormat: string = this.config.stt?.soniox?.audioFormat || 'auto'
    const endpointDetection: boolean = this.config.stt?.soniox?.endpointDetection ?? false
    const speakerDiarization: boolean = this.config.stt?.soniox?.speakerDiarization ?? false
    const proxyMode: string = this.config.stt?.soniox?.proxy || 'temporary_key'
    const tempKeyExpiry: number = this.config.stt?.soniox?.tempKeyExpiry || 600

    // Temporary API Key
    let wsApiKey = apiKey
    if (proxyMode === 'temporary_key') {
      try {
        const r = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ usage_type: 'transcribe_websocket', expires_in_seconds: tempKeyExpiry }),
        })
        if (r.ok) {
          const { api_key } = await r.json() as { api_key: string }
          if (api_key) wsApiKey = api_key
        }
      } catch (e) {
        console.error('Soniox temporary API key request failed:', e)
      }
    }

    this.finalTranscript = ''
    this.pendingError = null
    const url = 'wss://stt-rt.soniox.com/transcribe-websocket'
    try {
      this.ws = new WebSocket(url)
    } catch (err) {
      callback({ type: 'error', status: 'error', error: (err as Error).message })
      return
    }

    this.ws.onopen = () => {
      const configMsg: any = {
        api_key: wsApiKey,
        model: rtModel,
        audio_format: audioFormat,
        enable_endpoint_detection: endpointDetection,
        enable_non_final_tokens: true,
      }
      if (languageHints?.length) configMsg.language_hints = languageHints
      if (speakerDiarization) configMsg.enable_speaker_diarization = true
      this.ws?.send(JSON.stringify(configMsg))
      callback({ type: 'status', status: 'connected' })
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : null
        if (data && Array.isArray(data.tokens)) {
          let partial = ''
          for (const token of data.tokens) {
            if (token.is_final) this.finalTranscript += token.text
            else partial += token.text
          }
          const content = (this.finalTranscript + partial).trim()
          if (content) callback({ type: 'text', content })
        }
      } catch (e) {
        console.error('Soniox WebSocket message handling failed:', e)
      }
    }

    this.ws.onerror = (event: Event) => {
      this.pendingError = (event as ErrorEvent)?.message || 'Soniox WebSocket error'
    }
    this.ws.onclose = () => {
      if (this.pendingError) callback({ type: 'error', status: 'error', error: this.pendingError })
      else callback({ type: 'status', status: 'done' })
      this.ws = null
    }
  }

  async sendAudioChunk(chunk: Blob): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const buf = await chunk.arrayBuffer()
      this.ws.send(buf)
    }
  }

  async endStreaming(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Leerer BINARY Frame (nicht leerer string!)
      this.ws.send(new Uint8Array())
    }
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
