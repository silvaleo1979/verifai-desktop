
import { App } from 'electron'
import { Configuration } from '../types/config'
import { SourceType, DocRepoQueryResponseItem } from '../types/rag'
import defaultSettings from '../../defaults/settings.json'
import DocumentSourceImpl from './docsource'
import { loadSettings } from '../main/config'
import VectorDB from './vectordb'
import Embedder from './embedder'
import Loader from './loader'
import Splitter from './splitter'
import { databasePath } from './utils'
import * as file from '../main/file'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

const ADD_COMMIT_EVERY = 5
const DELETE_COMMIT_EVERY = 10
const EMBED_BATCH_SIZE = 20

export default class DocumentBaseImpl {

  app: App
  db: VectorDB

  uuid: string
  name: string
  embeddingEngine: string
  embeddingModel: string
  documents: DocumentSourceImpl[]

  constructor(app: App, uuid: string, name: string, embeddingEngine: string, embeddingModel: string) {
    this.app = app
    this.uuid = uuid
    this.name = name
    this.embeddingEngine = embeddingEngine
    this.embeddingModel = embeddingModel
    this.documents = []
  }

  async create() {
    const dbPath = databasePath(this.app, this.uuid)
    fs.mkdirSync(dbPath, { recursive: true })
    await VectorDB.create(dbPath)
  }

  async connect(): Promise<void> {
    if (!this.db) {
      this.db = await VectorDB.connect(databasePath(this.app, this.uuid))
      console.log('[rag] Connected to database', this.name)
    }
  }

  async destroy(): Promise<void> {
    try {
      const dbPath = databasePath(this.app, this.uuid)
      fs.rmSync(dbPath, { recursive: true, force: true })
    } catch (err) {
      console.warn('[rag] Error deleting database', this.name, err)
    }
  }

  async add(uuid: string, type: SourceType, url: string, callback: VoidFunction): Promise<string> {

    // check existing
    let source = this.documents.find(d => d.uuid === uuid)
    if (source) {
      await this.delete(uuid)
    } else {
      source = new DocumentSourceImpl(uuid, type, url)
    }

    // add if
    if (type === 'folder') {

      // we add first so container is visible
      this.documents.push(source)
      callback?.()
      await this.addFolder(source, callback)

    } else {

      // we add only when it's done
      await this.addDocument(source, callback)
      this.documents.push(source)

    }

    // now store
    console.log(`[rag] Added document "${source.url}" to database "${this.name}"`)

    // done
    return source.uuid

  }

  async addDocument(source: DocumentSourceImpl, callback?: VoidFunction): Promise<void> {

    // make sure we are connected
    await this.connect()

    // needed
    const config: Configuration = loadSettings(this.app)
    const loader = new Loader(config)
    if (!loader.isParseable(source.type, source.origin)) {
      throw new Error('[rag] Unsupported document type')
    }

    // log
    console.log(`[rag] Extracting text from [${source.type}] ${source.origin}`)

    // load the content
    const text = await loader.load(source.type, source.origin)
    if (!text) {
      console.log('[rag] Unable to load document', source.origin)
      throw new Error('Unable to load document')
    }

    // check the size
    const maxDocumentSizeMB = config.rag?.maxDocumentSizeMB ?? defaultSettings.rag.maxDocumentSizeMB
    if (text.length > maxDocumentSizeMB * 1024 * 1024) {
      console.log(`[rag] Document is too large (max ${maxDocumentSizeMB}MB)`, source.origin)
      throw new Error(`Document is too large (max ${maxDocumentSizeMB}MB)`)
    }

    // set title if web page
    if (source.type === 'url') {
      const titleMatch = text.match(/<title>(.*?)<\/title>/i)
      if (titleMatch && titleMatch[1]) {
        source.title = titleMatch[1].trim()
      }
    }

    // now split
    console.log(`[rag] Splitting document into chunks`)
    const splitter = new Splitter(config)
    const chunks = await splitter.split(text)

    // loose estimate of the batch size based on:
    // 1 token = 4 bytes
    // max tokens = 8192 (apply a 75% contingency)
    const batchSize = Math.min(EMBED_BATCH_SIZE, Math.floor(8192.0 * .75 / (splitter.chunkSize / 4.0)))
    const batchCount = Math.ceil(chunks.length / batchSize)
    const logInterval = Math.max(1, Math.floor(batchCount / 10))
    console.log(`[rag] Embedding ${chunks.length} chunks into ${batchCount} batches`)

    // we manage transactions for performance
    let transactionSize = 0
    await this.db.beginTransaction()

    // now embed and store
    let batchIndex = 0
    const embedder = await Embedder.init(this.app, config, this.embeddingEngine, this.embeddingModel)
    while (chunks.length > 0) {
      
      // log
      if (++batchIndex % logInterval === 0) {
        console.log(`[rag] Embedding batch ${batchIndex} of ${batchCount} (${chunks.length} chunks left)`)
      }

      // embed
      const batch = chunks.splice(0, batchSize)
      const embeddings = await embedder.embed(batch)
      //console.log('Embeddings', JSON.stringify(embeddings, null, 2))

      // store each embedding as a document
      for (let i = 0; i < batch.length; i++) {
        await this.db.insert(source.uuid, batch[i], embeddings[i], {
          uuid: source.uuid,
          type: source.type,
          title: source.getTitle(),
          url: source.url
        })
        if (++transactionSize === 1000) {
          await this.db.commitTransaction()
          await this.db.beginTransaction()
          transactionSize = 0
        }
      }
    }

    // finalize
    await this.db.commitTransaction()

    // done
    callback?.()

  }

  async addFolder(source: DocumentSourceImpl, callback: VoidFunction): Promise<void> {

    // list files in folder recursively
    const files = file.listFilesRecursively(source.origin)

    // add to the database using transaction
    await this.connect()
    // await this.db.beginTransaction()

    // iterate
    let added = 0
    for (const file of files) {
      try {

        // do it
        const doc = new DocumentSourceImpl(uuidv4(), 'file', file)
        await this.addDocument(doc)
        source.items.push(doc)

        // commit?
        if ((++added) % ADD_COMMIT_EVERY === 0) {
          // await this.db.commitTransaction()
          callback?.()
          // await this.db.beginTransaction()
        }

      } catch {
        //console.error('Error adding file', file, error)
      }
    }

    // done
    // await this.db.commitTransaction()
    callback?.()

  }

  async delete(docId: string, callback?: VoidFunction): Promise<void> {

    // find the document
    const index = this.documents.findIndex(d => d.uuid == docId)
    if (index === -1) {
      throw new Error('Document not found')
    }

    // list the database documents
    let docIds = [docId]
    const document = this.documents[index]
    if (document.items.length > 0) {
      docIds = document.items.map((item) => item.uuid)
    }

    // delete from the database using transaction
    await this.connect()
    await this.db.beginTransaction()

    // iterate
    let deleted = 0
    for (const docId of docIds) {

      // delete
      await this.db.delete(docId)

      // remove from doc list
      if (document.items.length > 0) {
        const index2 = document.items.findIndex(d => d.uuid == docId)
        if (index2 !== -1) {
          document.items.splice(index2, 1)

          // commit?
          if ((++deleted) % DELETE_COMMIT_EVERY === 0) {
            await this.db.commitTransaction()
            callback?.()
            await this.db.beginTransaction()
          }
        }
      }
    }

    // remove the main document
    this.documents.splice(index, 1)

    // done
    await this.db.commitTransaction()
    callback?.()

  }

  async query(text: string): Promise<DocRepoQueryResponseItem[]> {

    // needed
    const config: Configuration = loadSettings(this.app)
    const searchResultCount = config.rag?.searchResultCount ?? defaultSettings.rag.searchResultCount
    const relevanceCutOff = config.rag?.relevanceCutOff ?? defaultSettings.rag.relevanceCutOff

    // now embed
    const embedder = await Embedder.init(this.app, config, this.embeddingEngine, this.embeddingModel)
    const query = await embedder.embed([text])
    //console.log('query', query)

    // now query
    await this.connect()
    const results = await this.db.query(text, query[0], searchResultCount + 10)

    // filter and transform
    const filtered = results
      .filter((result) => result.score > relevanceCutOff)
      .map((result) => {
        return {
          content: result.item.metadata.content as string,
          score: result.score,
          metadata: result.item.metadata.metadata as any,
        }
      })
      //.sort((a, b) => b.score - a.score)
      .slice(0, searchResultCount)

    // log
    //console.log('results', JSON.stringify(filtered, null, 2))

    // done
    return filtered

  }

}
