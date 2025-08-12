import { Readable } from 'stream'

export class RandomChunkStream extends Readable {

  remainingString: string

  constructor(text: string) {
    super()
    this.remainingString = text
  }

  _read() {
    if (this.remainingString.length === 0) {
      this.push('<DONE>')
      this.push(null)
    } else {
      const chunkSize = Math.ceil(4 + Math.random() * 4)
      const chunk = this.remainingString.substring(0, chunkSize)
      this.remainingString = this.remainingString.substring(chunkSize)
      this.push(chunk)
    }
  }

  [Symbol.iterator]() {
    return this
  }
}

export class InfiniteStream extends Readable {

  async _read() {
    setTimeout(() => this.push('infinite'), 100)
  }

  [Symbol.iterator]() {
    return this
  }
}

