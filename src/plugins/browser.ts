import { BrowserActionRequest } from '../types/browser'
import { anyDict } from '../types/index'
import { MultiToolPlugin, LlmTool, PluginExecutionContext } from 'multi-llm-ts'
import { PluginConfig } from './plugin'
import { t } from '../services/i18n'

export interface BrowserPluginConfig extends PluginConfig {
  enabled: boolean
  allowedDomains?: string[]
  headless?: boolean
  actionTimeoutMs?: number
  captureScreenshots?: boolean
  maxTextLength?: number
}

export default class BrowserPlugin extends MultiToolPlugin {

  config: BrowserPluginConfig
  tools: LlmTool[]
  sessionId: string|null

  constructor(config: BrowserPluginConfig) {
    super()
    this.config = config
    this.sessionId = null
    this.tools = [
      {
        type: 'function',
        function: {
          name: 'browser_open',
          description: 'Open a URL in the headful browser.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'The URL to open' },
              waitFor: { type: 'string', description: 'CSS/ARIA selector to wait for after load' },
              delayMs: { type: 'number', description: 'Extra delay in milliseconds after navigation' },
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_click',
          description: 'Click an element by selector or visible text.',
          parameters: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to click' },
              text: { type: 'string', description: 'Visible text to click if selector is not provided' },
              waitFor: { type: 'string', description: 'Selector to wait for after clicking' },
              delayMs: { type: 'number', description: 'Extra delay after click' },
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_type',
          description: 'Type text into an input located by selector.',
          parameters: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of the input field' },
              text: { type: 'string', description: 'Text to type' },
              clear: { type: 'boolean', description: 'Clear the field before typing (default true)' },
              delayMs: { type: 'number', description: 'Delay after typing' },
            },
            required: ['selector', 'text']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_press_enter',
          description: 'Press Enter in the current page.',
          parameters: {
            type: 'object',
            properties: {
              delayMs: { type: 'number', description: 'Delay after pressing Enter' },
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_wait_selector',
          description: 'Wait for a selector to be present.',
          parameters: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'Selector to wait for' },
              delayMs: { type: 'number', description: 'Extra delay after waiting' },
            },
            required: ['selector']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_extract_text',
          description: 'Extract visible text from a selector or the whole page.',
          parameters: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'Selector to extract text from (optional)' },
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_screenshot',
          description: 'Take a screenshot (base64). Defaults to viewport JPEG, optional fullPage.',
          parameters: {
            type: 'object',
            properties: {
              fullPage: { type: 'boolean', description: 'Capture full page (default: false/viewport only)' },
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browser_observe',
          description: 'Observe current page: title, url, visible text (trimmed), optional screenshot.',
          parameters: {
            type: 'object',
            properties: {
              includeScreenshot: { type: 'boolean', description: 'Include base64 screenshot' },
            },
            required: []
          }
        }
      },
    ]
  }

  isEnabled(): boolean {
    return this.config?.enabled === true
  }

  getName(): string {
    return 'Web Browser'
  }

  getPreparationDescription(name: string): string {
    return t('plugins.browse.running') + ` (${name})`
  }

  getRunningDescription(name: string): string {
    return t('plugins.browse.running') + ` (${name})`
  }

  getCompletedDescription(name: string, _args: any, results: any): string | undefined {
    if (results?.error) return t('plugins.browse.error') + ` (${name})`
    return t('plugins.browse.completed', { title: results?.title || results?.url || name })
  }

  async getTools(): Promise<LlmTool[]> {
    if (this.toolsEnabled) {
      return this.tools.filter((tool: LlmTool) => this.toolsEnabled.includes(tool.function.name))
    }
    return this.tools
  }

  handlesTool(name: string): boolean {
    const handled = this.tools.find((tool: LlmTool) => tool.function.name === name) !== undefined
    return handled && (!this.toolsEnabled || this.toolsEnabled.includes(name))
  }

  async execute(_context: PluginExecutionContext, parameters: anyDict): Promise<anyDict> {
    if (!this.isEnabled()) return { error: 'Browser tool disabled' }
    if (!this.handlesTool(parameters.tool)) {
      return { error: `Tool ${parameters.tool} is not handled by this plugin or has been disabled` }
    }

    await this.ensureSession()

    const action = this.mapToolToAction(parameters.tool, parameters.parameters)
    if (!action) {
      return { error: `Unknown action mapping for ${parameters.tool}` }
    }

    const result = await window.api.browser.runAction(this.sessionId, action)
    if (result?.success === false && result?.error?.includes('Session not found')) {
      this.sessionId = null
      window.api.store.set('browser.lastSessionId', null)
    }
    if (result?.success && this.sessionId) {
      window.api.store.set('browser.lastSessionId', this.sessionId)
    }
    return result
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionId) return
    // try reuse persisted session
    const persisted = window.api.store.get('browser.lastSessionId', null)
    if (persisted) {
      const ping = await window.api.browser.runAction(persisted, { type: 'screenshot', includeScreenshot: false }).catch(() => null)
      if (ping?.success) {
        this.sessionId = persisted
        return
      }
      window.api.store.set('browser.lastSessionId', null)
    }
    const session = await window.api.browser.createSession({
      headless: this.config?.headless ?? false,
    })
    this.sessionId = session?.id || null
    if (this.sessionId) {
      window.api.store.set('browser.lastSessionId', this.sessionId)
    }
  }

  private mapToolToAction(tool: string, parameters: anyDict): BrowserActionRequest|null {
    switch (tool) {
      case 'browser_open':
        return { type: 'open', url: parameters.url, waitFor: parameters.waitFor, delayMs: parameters.delayMs }
      case 'browser_click':
        return { type: 'click', selector: parameters.selector, text: parameters.text, waitFor: parameters.waitFor, delayMs: parameters.delayMs }
      case 'browser_type':
        return { type: 'type', selector: parameters.selector, text: parameters.text, clear: parameters.clear, delayMs: parameters.delayMs }
      case 'browser_press_enter':
        return { type: 'press_enter', delayMs: parameters.delayMs }
      case 'browser_wait_selector':
        return { type: 'wait_for_selector', selector: parameters.selector, delayMs: parameters.delayMs }
      case 'browser_extract_text':
        return { type: 'extract_text', selector: parameters.selector }
      case 'browser_screenshot':
        return { type: 'screenshot', fullPage: parameters.fullPage }
      case 'browser_observe':
        return { type: 'observe', includeScreenshot: parameters.includeScreenshot }
      default:
        return null
    }
  }
}

