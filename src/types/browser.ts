import { anyDict } from './index'

export type BrowserActionType =
  | 'open'
  | 'click'
  | 'type'
  | 'press_enter'
  | 'wait_for_selector'
  | 'extract_text'
  | 'screenshot'
  | 'observe'

export type BrowserActionRequest = {
  type: BrowserActionType
  url?: string
  selector?: string
  text?: string
  waitFor?: string
  delayMs?: number
  includeScreenshot?: boolean
  fullPage?: boolean
  clear?: boolean
}

export type BrowserActionResult = {
  success: boolean
  url?: string
  title?: string
  text?: string
  html?: string
  screenshot?: string
  error?: string
  meta?: anyDict
}

export type BrowserSession = {
  id: string
  createdAt: number
  lastActionAt: number
  currentUrl?: string
}

