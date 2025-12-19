import crypto from 'node:crypto'
import { Browser, BrowserContext, chromium, Page } from 'playwright'
import log from 'electron-log/main'

import { BrowserActionRequest, BrowserActionResult, BrowserSession } from '../types/browser'

type SessionContext = BrowserSession & {
  browser: Browser
  context: BrowserContext
  page: Page
}

export type BrowserManagerConfig = {
  allowedDomains?: string[]
  actionTimeoutMs?: number
  headless?: boolean
  captureScreenshots?: boolean
  maxTextLength?: number
}

export default class BrowserManager {

  private sessions: Map<string, SessionContext> = new Map()

  async createSession(config?: BrowserManagerConfig): Promise<BrowserSession> {
    const browser = await chromium.launch({
      headless: config?.headless ?? false,
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    })

    const page = await context.newPage()

    const session: SessionContext = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      lastActionAt: Date.now(),
      browser,
      context,
      page,
      currentUrl: undefined,
    }

    this.sessions.set(session.id, session)
    log.info(`[browser] session created ${session.id}`)
    return {
      id: session.id,
      createdAt: session.createdAt,
      lastActionAt: session.lastActionAt,
      currentUrl: session.currentUrl,
    }
  }

  async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    try {
      await session.browser.close()
    } catch (error) {
      log.warn(`[browser] error closing session ${sessionId}`, error)
    }

    this.sessions.delete(sessionId)
    log.info(`[browser] session closed ${sessionId}`)
    return true
  }

  async closeAll(): Promise<void> {
    for (const id of Array.from(this.sessions.keys())) {
      await this.closeSession(id)
    }
  }

  async runAction(
    sessionId: string,
    action: BrowserActionRequest,
    config?: BrowserManagerConfig,
  ): Promise<BrowserActionResult> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: `Session not found: ${sessionId}` }
    }

    const timeout = config?.actionTimeoutMs ?? 15000
    const maxTextLength = config?.maxTextLength ?? 6000

    try {
      log.info(`[browser] action ${action.type}`, { sessionId, target: action.url || action.selector || action.text })
      switch (action.type) {
        case 'open':
          if (!action.url) return { success: false, error: 'Missing url' }
          if (!this.isAllowed(action.url, config?.allowedDomains)) {
            return { success: false, error: 'Domain not allowed' }
          }
          await session.page.goto(action.url, { timeout, waitUntil: 'domcontentloaded' })
          session.currentUrl = session.page.url()
          break

        case 'click':
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          if (action.selector) {
            await session.page.click(action.selector, { timeout })
          } else if (action.text) {
            await session.page.getByText(action.text, { exact: false }).first().click({ timeout })
          } else {
            return { success: false, error: 'Missing selector or text for click' }
          }
          break

        case 'type':
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          if (!action.selector) return { success: false, error: 'Missing selector for type' }
          if (action.clear ?? true) {
            await session.page.fill(action.selector, action.text || '', { timeout })
          } else {
            await session.page.click(action.selector, { timeout })
            if (action.text) await session.page.keyboard.type(action.text, { delay: 30 })
          }
          break

        case 'press_enter':
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          await session.page.keyboard.press('Enter', { delay: 20 })
          break

        case 'wait_for_selector':
          if (!action.selector) return { success: false, error: 'Missing selector for wait' }
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          await session.page.waitForSelector(action.selector, { timeout })
          break

        case 'extract_text': {
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          const textContent = action.selector
            ? await session.page.textContent(action.selector, { timeout })
            : await session.page.textContent('body')
          const text = this.truncate((textContent || '').trim(), maxTextLength)
          return {
            success: true,
            url: session.page.url(),
            title: await session.page.title(),
            text,
            screenshot: action.includeScreenshot
              ? await this.maybeScreenshot(
                session.page,
                timeout,
                config?.captureScreenshots !== false,
              )
              : undefined,
          }
        }

        case 'screenshot': {
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          if (config?.captureScreenshots === false) {
            return { success: false, error: 'Screenshots disabled by policy' }
          }
          const buffer = await session.page.screenshot({
            fullPage: action.fullPage === true ? true : false, // default viewport to keep payload small
            type: 'jpeg',
            quality: 60,
            timeout,
          })
          return {
            success: true,
            url: session.page.url(),
            title: await session.page.title(),
            screenshot: buffer.toString('base64'),
          }
        }

        case 'observe': {
          await this.ensureAllowed(session.page.url(), config?.allowedDomains)
          const bodyText = await session.page.textContent('body')
          const text = this.truncate((bodyText || '').trim(), maxTextLength)
          const screenshot = action.includeScreenshot
            ? await this.maybeScreenshot(
              session.page,
              timeout,
              config?.captureScreenshots !== false,
            )
            : undefined
          return {
            success: true,
            url: session.page.url(),
            title: await session.page.title(),
            text,
            screenshot,
          }
        }

        default:
          return { success: false, error: `Unknown action: ${action.type}` }
      }

      if (action.waitFor) {
        await session.page.waitForSelector(action.waitFor, { timeout })
      }
      if (action.delayMs) {
        await session.page.waitForTimeout(action.delayMs)
      }

      session.lastActionAt = Date.now()
      return {
        success: true,
        url: session.page.url(),
        title: await session.page.title(),
        screenshot: action?.includeScreenshot
          ? await this.maybeScreenshot(
            session.page,
            timeout,
            config?.captureScreenshots !== false,
          )
          : undefined,
      }
    } catch (error: any) {
      log.warn(`[browser] action error ${action.type}`, error)
      return { success: false, error: error.message }
    }
  }

  private isAllowed(url: string, allowedDomains?: string[]): boolean {
    if (!allowedDomains || allowedDomains.length === 0) return true
    try {
      const hostname = new URL(url).hostname
      return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
    } catch (error) {
      log.warn('[browser] could not parse url', url, error)
      return false
    }
  }

  private async ensureAllowed(url: string, allowedDomains?: string[]): Promise<void> {
    if (!this.isAllowed(url, allowedDomains)) {
      throw new Error('Domain not allowed')
    }
  }

  private async maybeScreenshot(page: Page, timeout: number, captureScreenshots?: boolean): Promise<string|undefined> {
    if (captureScreenshots === false) return undefined
    try {
      const buffer = await page.screenshot({ fullPage: true, timeout })
      return buffer.toString('base64')
    } catch (error) {
      log.warn('[browser] screenshot failed', error)
      return undefined
    }
  }

  private truncate(text: string, maxLength: number): string {
    if (!text) return ''
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }
}

