import fs, { FSWatcher } from 'fs'
import path from 'path'
import crypto from 'crypto'

export default class {

  filepath: string
  fileDigest: string
  callback: CallableFunction
  timeout: NodeJS.Timeout
  watcher: FSWatcher
  isDirectory: boolean
  
  constructor(callback: CallableFunction) {
    this.callback = callback
  }

  start(filepath: string): void {

    // same?
    if (this.filepath === filepath) {
      return
    }

    // does it exist
    if (!fs.existsSync(filepath)) {
      console.warn('Asked to monitor non-existing file', filepath)
      return
    }

    // clear
    this.stop()
    
    // init
    this.timeout = null
    this.filepath = filepath
    this.isDirectory = fs.statSync(filepath).isDirectory()
    this.fileDigest = this.calculateDigest()

    // start - use recursive option for directories
    this.watcher = fs.watch(filepath, { recursive: this.isDirectory }, async () => {
      const digest = this.calculateDigest()
      if (digest !== this.fileDigest) {
        this.fileDigest = digest
        clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
          this.notify(filepath)
        }, 200)
      }
    })
  }

  stop(): void {
    this.watcher?.close()
    this.watcher = null
    this.filepath = null
  }

  calculateDigest(): string {
    try {
      if (this.isDirectory) {
        // For directories, calculate digest based on file listing and their mtimes
        const files = fs.readdirSync(this.filepath)
          .filter(f => f.endsWith('.json'))
          .sort()
        const dirContent = files.map(f => {
          try {
            const stat = fs.statSync(path.join(this.filepath, f))
            return `${f}:${stat.mtimeMs}`
          } catch {
            return f
          }
        }).join('|')
        return crypto.createHash('md5').update(dirContent).digest('hex')
      } else {
        const fileContent = fs.readFileSync(this.filepath, 'utf8')
        return crypto.createHash('md5').update(fileContent).digest('hex')
      }
    } catch {
      return ''
    }
  }

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notify(filepath: string): void {

    // log
    // console.log(`File ${filepath} modified. Notifying`)

    // callback
    this.callback()

  }

}
