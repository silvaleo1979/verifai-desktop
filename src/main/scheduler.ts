
import { Agent, AgentRun } from '../types/index'
import { App } from 'electron'
import { CronExpressionParser } from 'cron-parser'
import { loadSettings } from './config'
import { loadAgents, saveAgentRun } from './agents'
import { runPython } from './interpreter'
import Runner from '../services/runner'
import Mcp from './mcp'
import LocalSearch from './search'
import BrowserManager from './browser'

export default class Scheduler {

  app: App
  mcp: Mcp
  timeout: NodeJS.Timeout|null = null

  constructor(app: App, mcp: Mcp) {
    this.app = app
    this.mcp = mcp
    this.mock()
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  start() {

    // clear previous
    this.stop()

    // we want to on next minute
    const now = new Date()
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    console.log('[scheduler] start, first check in', delay, 'ms')
    this.timeout = setTimeout(() => this.check(), delay)

  }

  check() {

    const now: number = Date.now()
    console.log('[scheduler] tick at', new Date(now).toISOString())

    // we need to check is we where 30 seconds before to make sure we don't miss
    const tolerance = 70 * 1000

    // we need a config
    const config = loadSettings(this.app)

    // load agents
    const agents: Agent[] = loadAgents(this.app)

    // iterate over all agents
    for (const agent of agents) {

      try {

        // check if agent has a schedule
        if (!agent.schedule) {
          continue
        }

        // check if schedule is due
        const interval = CronExpressionParser.parse(agent.schedule, { currentDate: now })
        const next = interval.next().getTime()
        const diffNext = Math.abs(next - now)

        console.log(`[scheduler] ${agent.name} cron=${agent.schedule} next=${new Date(next).toISOString()} diffNext=${diffNext}`)

        if (diffNext < tolerance) {

          console.log(`Agent ${agent.name} is due to run`)

          try {
            const runner = new Runner(config, agent)
            runner.run('schedule')
          } catch (error) {
            console.log(`Error running agent ${agent.name}`, error)
            continue
          }

        }

      } catch (error) {
        console.log(`Error checking schedule for ${agent.name}`, error)
        continue
      }

    }

    // schedule next
    this.start()

  }

  mock() {

    // plugins were designed to be run in renderer process
    // and therefore are accessing main process via ipc calls
    // we need to mock this

    const browserManager = new BrowserManager()
    const store = new Map<string, any>()

    global.window = {
      api: {
        // @ts-expect-error partial mock
        agents: {
          load: (): Agent[] => {
            try {
              return loadAgents(this.app)
            } catch (error) {
              console.log('Error loading agents', error)
              return []
            }
          },
          saveRun: (run: AgentRun): boolean =>  {
            try {
              return saveAgentRun(this.app, run)
            } catch (error) {
              console.log('Error saving agent run', error)
              return false
            }
          },
        },
        interpreter: {
          python: async (script: string) => {
            try {
              const result = await runPython(script);
              return {
                result: result
              }
            } catch (error) {
              console.log('Error while running python', error);
              return {
                error: error || 'Unknown error'
              }
            }
          },
        },
        search: {
          query: (payload: any) => {
            const { query, num } = payload
            const localSearch = new LocalSearch()
            const results = localSearch.search(query, num)
            return results
          },
        },
        store: {
          get: (key: string, def: any) => store.get(key) ?? def,
          set: (key: string, value: any) => { store.set(key, value); },
          delete: (key: string) => { store.delete(key); },
        },
        browser: {
          createSession: (opts: any) => browserManager.createSession(opts),
          closeSession: (sessionId: string) => browserManager.closeSession(sessionId),
          runAction: (sessionId: string, action: any) => {
            const settings = loadSettings(this.app)
            const pluginCfg = settings.plugins?.browser || {}
            return browserManager.runAction(sessionId, action, {
              allowedDomains: pluginCfg.allowedDomains || [],
              actionTimeoutMs: pluginCfg.actionTimeoutMs ?? 15000,
              headless: pluginCfg.headless ?? false,
              captureScreenshots: pluginCfg.captureScreenshots ?? true,
              maxTextLength: pluginCfg.maxTextLength ?? 6000,
            })
          },
        },
        // @ts-expect-error partial mock
        mcp: {
          isAvailable: () => true,
          getTools: this.mcp.getTools,
          callTool: this.mcp.callTool,
          originalToolName: (name: string) => (this.mcp as any).originalToolName ? (this.mcp as any).originalToolName(name) : name,
        },
      }
    }

  }

}
