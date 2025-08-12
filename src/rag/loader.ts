
import { Configuration } from 'types/config'
import { SourceType } from 'types/rag'
import { extensionToMimeType } from 'multi-llm-ts'
import { getPDFRawTextContent, getOfficeRawTextContent } from '../main/text'
import fs from 'fs'

export default class {

  config: Configuration

  constructor(config: Configuration) {
    this.config = config
  }

  isParseable(type: SourceType, origin: string): boolean {

    // easy one
    if (['url', 'text'].includes(type)) {
      return true
    }

    // files
    if (type === 'file') {

      // needed
      const extension = origin.split('.').pop()
      const mimeType = extensionToMimeType(extension)

      // text files
      if (mimeType.startsWith('text/')) {
        return true
      }

      // others
      return [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
        'application/json',
        'application/javascript',
      ].includes(mimeType)

    }

    // too bad
    return false

  }


  load(type: SourceType, origin: string): Promise<string> {
  
    switch (type) {
      case 'file':
        return this.loadFile(origin)
      case 'url':
        return this.loadUrl(origin)
      case 'text':
        return Promise.resolve(origin)
    }

  }

  async loadUrl(url: string): Promise<string> {
    const response = await fetch(url)
    return response.text()
  }

  async loadFile(filepath: string): Promise<string> {

    try {

      const extension = filepath.split('.').pop()
      const mimeType = extensionToMimeType(extension)
      //console.log('Loading file:', url, extension, mimeType)

      if ([
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ].includes(mimeType)) {
          return await getOfficeRawTextContent(fs.readFileSync(filepath))
      }
        
      if (mimeType === 'application/pdf') {
        return await getPDFRawTextContent(fs.readFileSync(filepath))
      }

      if (mimeType.startsWith('text/') || [
        'application/json',
        'application/javascript'
      ].includes(mimeType)) {
        return fs.readFileSync(filepath, 'utf8')
      }

      // too bad
      return null


    } catch (error) {
      console.error('Error loading file:', error)
    }
  }

}