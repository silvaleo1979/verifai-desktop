
import { vi, test, expect, beforeEach } from 'vitest'
import type { McpServer } from '../../src/types/mcp'
import { app } from 'electron'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import mcpConfig from '../fixtures/mcp.json'
import Mcp from '../../src/main/mcp'

vi.mock('electron', async() => {
  return {
    app: {
      getPath: () => './tests/fixtures',
    },
  }
})

// mess with default / execSync so hack
let command = null
vi.mock('child_process', async () => {
  return { default: {
    exec: vi.fn((cmd) => { command = cmd; return {
      on: vi.fn(),
      stdout: { on: vi.fn((signal, callback) => {
        console.log('stdout', signal, callback)
        if (signal === 'data') {
          callback('successfully installed')
        }
      }) },
      stderr: { on: vi.fn() },
    } })
  }}
})

let config = mcpConfig

vi.mock('../../src/main/config', async () => {
  return {
    settingsFilePath: vi.fn(() => './tests/fixtures/config1.json'),
    saveSettings: vi.fn((_, cfg) => config = cfg),
    loadSettings: vi.fn(() => config)
  }
})

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', async () => {
  const StdioClientTransport = vi.fn()
  StdioClientTransport.prototype.start = vi.fn()
  StdioClientTransport.prototype.close = vi.fn()
  StdioClientTransport.prototype.send = vi.fn()
  return { StdioClientTransport, getDefaultEnvironment: vi.fn(() => ({
    PATH: '/tmp'
  })) }
})

vi.mock('@modelcontextprotocol/sdk/client/sse.js', async () => {
  const SSEClientTransport = vi.fn()
  SSEClientTransport.prototype.start = vi.fn()
  SSEClientTransport.prototype.close = vi.fn()
  SSEClientTransport.prototype.send = vi.fn()
  return { SSEClientTransport }
})

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', async () => {
  const StreamableHTTPClientTransport = vi.fn()
  StreamableHTTPClientTransport.prototype.start = vi.fn()
  StreamableHTTPClientTransport.prototype.close = vi.fn()
  StreamableHTTPClientTransport.prototype.send = vi.fn()
  return { StreamableHTTPClientTransport }
})

let count = 1
vi.mock('@modelcontextprotocol/sdk/client/index.js', async () => {
  const Client = vi.fn(function() {
    this.id = count++
  })
  Client.prototype.connect = vi.fn(function(transport) { this.transport = transport })
  Client.prototype.close = vi.fn()
  Client.prototype.listTools = vi.fn(async () => ({
    tools: [
      { name: 'tool1', description: 'tool1 description', inputSchema: { type: 'object', properties: { arg: { type: 'string' }}, required: [] } },
      { name: 'tool2', inputSchema: { type: 'object', properties: { arg: { type: 'number', description: 'desc' }}, required: [] } },
      { name: 'tool3', description: 'tool3 description' },
    ]
  }))
  Client.prototype.callTool = vi.fn(function(params) {
    if (this.id == 1) return { toolResult: `${this.id}-${params.name}-${params.arguments.arg}-result` }
    else return { content: [ { type: 'text', text: `${this.id}-${params.name}-${params.arguments.arg}-result` }]}
  })
  return { Client }
})

beforeEach(() => {
  count = 1
  config = JSON.parse(JSON.stringify(mcpConfig))
  vi.clearAllMocks()
})
  
test('Initialization', async () => {
  const mcp = new Mcp(app)
  expect(mcp).toBeDefined()
  expect(mcp.clients).toBeDefined()
  expect(Client.prototype.connect).toHaveBeenCalledTimes(0)
  expect(await mcp.getStatus()).toEqual({ servers: [], logs: {} })
  expect(mcp.getServers()).toStrictEqual([
    { uuid: '1234-5678-90ab', registryId: '1234-5678-90ab', state: 'enabled', type: 'stdio', command: 'node', url: 'script.js', cwd: 'cwd1', env: { KEY: 'value' } },
    { uuid: '2345-6789-0abc', registryId: '2345-6789-0abc', state: 'enabled', type: 'sse', url: 'http://localhost:3000' },
    { uuid: '3456-7890-abcd', registryId: '3456-7890-abcd', state: 'disabled', type: 'stdio', command: 'python3', url: 'script.py' },
    { uuid: '4567-890a-bcde', registryId: '4567-890a-bcde', state: 'enabled', type: 'http', url: 'http://localhost:3002' },
    { uuid: 's1', registryId: 's1', state: 'enabled', type: 'stdio', label: undefined, command: 'npx', url: '-y run s1.js', cwd: 'cwd2', env: { KEY: 'value' } },
    { uuid: 'mcp2', registryId: 'mcp2', state: 'disabled', type: 'stdio', label: undefined, command: 'npx', url: '-y run mcp2.js', cwd: undefined, env: undefined }
  ])
})

test('Create server - Stdio', async () => {

  const mcp = new Mcp(app)
  expect(await mcp.editServer({ uuid: null, registryId: null, state: 'enabled', type: 'stdio', command: 'node', url: 'script.js', cwd: 'cwd1', env: { KEY: 'value' } })).toBe(true)
  expect(mcp.getServers()).toHaveLength(7)

  expect(getDefaultEnvironment).toHaveBeenCalledTimes(1)
  expect(SSEClientTransport).not.toHaveBeenCalled()
  expect(StreamableHTTPClientTransport).not.toHaveBeenCalled()
  expect(StdioClientTransport).toHaveBeenLastCalledWith({
    command: 'node',
    args: ['script.js'],
    cwd: 'cwd1',
    env: { KEY: 'value', PATH: '/tmp' },
    stderr: 'pipe'
  })

  expect(mcp.getServers().find(s => s.url === 'script.js')).toBeDefined()
  expect(config.mcp.servers.find(s => s.url === 'script.js')).toStrictEqual({
    uuid: expect.any(String),
    registryId: expect.any(String),
    state: 'enabled',
    type: 'stdio',
    command: 'node',
    url: 'script.js',
    cwd: 'cwd1',
    env: { KEY: 'value' },
  })
})

test('Create server - SSE', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.editServer({ uuid: null, registryId: null, state: 'enabled', type: 'sse', url: 'http://localhost:3001'})).toBe(true)
  expect(mcp.getServers()).toHaveLength(7)
  
  expect(getDefaultEnvironment).not.toHaveBeenCalled()
  expect(StdioClientTransport).not.toHaveBeenCalled()
  expect(StreamableHTTPClientTransport).not.toHaveBeenCalled()
  expect(SSEClientTransport).toHaveBeenLastCalledWith(new URL('http://localhost:3001/'))
  expect(Client.prototype.connect).toHaveBeenLastCalledWith({
    onerror: expect.any(Function),
    onmessage: expect.any(Function),
  })
  
  expect(mcp.getServers().find(s => s.url === 'http://localhost:3001')).toBeDefined()
  expect(config.mcp.servers.find(s => s.url === 'http://localhost:3001')).toStrictEqual({
    uuid: expect.any(String),
    registryId: expect.any(String),
    state: 'enabled',
    type: 'sse',
    command: undefined,
    url: 'http://localhost:3001',
    cwd: undefined,
    env: undefined,
    headers: undefined,
  })
})

test('Create server - HTTP', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.editServer({ uuid: null, registryId: null, state: 'enabled', type: 'http', url: 'http://localhost:3001', headers: { key: 'value' }})).toBe(true)
  expect(mcp.getServers()).toHaveLength(7)
  
  expect(getDefaultEnvironment).not.toHaveBeenCalled()
  expect(StdioClientTransport).not.toHaveBeenCalled()
  expect(SSEClientTransport).not.toHaveBeenCalled()
  expect(StreamableHTTPClientTransport).toHaveBeenLastCalledWith(new URL('http://localhost:3001/'), {
    requestInit: {
      headers: { key: 'value' },
    }
  })
  expect(Client.prototype.connect).toHaveBeenLastCalledWith({
    onerror: expect.any(Function),
    onmessage: expect.any(Function),
  })
  
  expect(mcp.getServers().find(s => s.url === 'http://localhost:3001')).toBeDefined()
  expect(config.mcp.servers.find(s => s.url === 'http://localhost:3001')).toStrictEqual({
    uuid: expect.any(String),
    registryId: expect.any(String),
    state: 'enabled',
    type: 'http',
    command: undefined,
    url: 'http://localhost:3001',
    cwd: undefined,
    env: undefined,
    headers: { key: 'value' },
  })
})

test('Edit normal server', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.editServer({ uuid: '2345-6789-0abc', registryId: '2345-6789-0abc', state: 'disabled', type: 'sse', url: 'http://localhost:3001'})).toBe(true)
  expect(mcp.getServers()[1]).toMatchObject({
    uuid: '2345-6789-0abc',
    registryId: '2345-6789-0abc',
    state: 'disabled',
    type: 'sse',
    url: 'http://localhost:3001',
  })
  expect(config.mcp.servers[1]).toMatchObject({
    uuid: '2345-6789-0abc',
    registryId: '2345-6789-0abc',
    state: 'disabled',
    type: 'sse',
    url: 'http://localhost:3001',
  })
})

test('Edit server label', async () => {
  const mcp = new Mcp(app)
  // set a non-empty label (trimmed)
  expect(await mcp.editServer({
    uuid: '2345-6789-0abc', registryId: '2345-6789-0abc', state: 'enabled', type: 'sse',
    url: 'http://localhost:3001', label: '  My Title  '
  })).toBe(true)
  const withLabel = mcp.getServers().find(s => s.uuid === '2345-6789-0abc') as McpServer | undefined
  expect(withLabel?.label).toBe('My Title')
  const cfgWithLabel = config.mcp.servers.find(s => s.uuid === '2345-6789-0abc') as McpServer | undefined
  expect(cfgWithLabel?.label).toBe('My Title')

  // clear the label by providing an empty string
  expect(await mcp.editServer({
    uuid: '2345-6789-0abc', registryId: '2345-6789-0abc', state: 'enabled', type: 'sse',
    url: 'http://localhost:3001', label: ''
  })).toBe(true)
  const noTitle = mcp.getServers().find(s => s.uuid === '2345-6789-0abc') as McpServer | undefined
  expect(noTitle?.label).toBeUndefined()
  const cfgNoTitle = config.mcp.servers.find(s => s.uuid === '2345-6789-0abc') as McpServer | undefined
  expect(cfgNoTitle?.label).toBeUndefined()
})

test('Edit mcp server', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.editServer({ uuid: 's1', registryId: 's1', state: 'enabled', type: 'stdio', command: 'node', url: '-f exec s1.js'})).toBe(true)
  
  expect(getDefaultEnvironment).toHaveBeenCalledTimes(1)
  expect(StdioClientTransport).toHaveBeenLastCalledWith({
    command: 'node',
    args: ['-f', 'exec', 's1.js'],
    env: { PATH: '/tmp' },
    stderr: 'pipe'
  })
  expect(StdioClientTransport.prototype.start).toHaveBeenLastCalledWith()
  expect(Client.prototype.connect).toHaveBeenLastCalledWith({ start: expect.any(Function) })
  expect(SSEClientTransport.prototype.start).toHaveBeenCalledTimes(0)
  
  expect(mcp.getServers()[4]).toMatchObject({
    uuid: 's1',
    registryId: 's1',
    state: 'enabled',
    type: 'stdio',
    command: 'node',
    url: '-f exec s1.js',
  })
  expect(config.mcp.mcpServersExtra['mcp2'].state).toEqual('disabled')
  expect(config.mcpServers['s1']).toMatchObject({
    command: 'node',
    args: ['-f', 'exec', 's1.js'],
  })
  expect(await mcp.editServer({ uuid: 'mcp2', registryId: 'mcp2', state: 'disabled', type: 'stdio', command: 'npx', url: '-y run mcp2.js'})).toBe(true)
  expect(config.mcp.mcpServersExtra['mcp2'].state).toEqual('disabled')
  expect(await mcp.editServer({ uuid: 'mcp2', registryId: 'mcp2', state: 'enabled', type: 'stdio', command: 'npx', url: '-y run mcp2.js'})).toBe(true)
  expect(config.mcp.mcpServersExtra['mcp2'].state).toEqual('enabled')
  expect(await mcp.editServer({ uuid: 'mcp2', registryId: 'mcp2', state: 'disabled', type: 'stdio', command: 'npx', url: '-y run mcp2.js'})).toBe(true)
  expect(config.mcp.mcpServersExtra['mcp2'].state).toEqual('disabled')
  expect(await mcp.editServer({ uuid: 's1', registryId: 's1', state: 'disabled', type: 'stdio', command: 'node', url: '-f exec s1.js'})).toBe(true)
  expect(config.mcp.mcpServersExtra['mcp2'].state).toEqual('disabled')
  expect(config.mcp.mcpServersExtra['s1'].state).toEqual('disabled')
})

test('Delete server', async () => {
  const mcp = new Mcp(app)
  expect(mcp.getServers().length).toBe(6)
  expect(mcp.deleteServer('1234-5678-90ab')).toBe(true)
  expect(mcp.getServers().length).toBe(5)
  expect(mcp.getServers().find(s => s.uuid === '1234-5678-90ab')).toBeUndefined()
  expect(config.mcp.servers.find(s => s.uuid === '1234-5678-90ab')).toBeUndefined()
  expect(mcp.deleteServer('s1')).toBe(true)
  expect(mcp.getServers().length).toBe(4)
  expect(mcp.getServers().find(s => s.uuid === 's1')).toBeUndefined()
  expect(config.mcpServers['s1']).toBeUndefined()
  expect(mcp.deleteServer('4')).toBe(false)
  expect(mcp.getServers().length).toBe(4)
  expect(mcp.deleteServer('@mcp2')).toBe(false)
})

test('Connect', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.connect())
  expect(mcp.clients).toHaveLength(4)
  expect(await mcp.getStatus()).toStrictEqual({
    servers: [
      { uuid: '1234-5678-90ab', registryId: '1234-5678-90ab', state: 'enabled', type: 'stdio', command: 'node', url: 'script.js', cwd: 'cwd1', env: { KEY: 'value' }, tools: ['tool1___90ab', 'tool2___90ab', 'tool3___90ab'] },
      { uuid: '2345-6789-0abc', registryId: '2345-6789-0abc', state: 'enabled', type: 'sse', url: 'http://localhost:3000', tools: ['tool1___0abc', 'tool2___0abc', 'tool3___0abc'] },
      { uuid: '4567-890a-bcde', registryId: '4567-890a-bcde', state: 'enabled', type: 'http', url: 'http://localhost:3002', tools: ['tool1___bcde', 'tool2___bcde', 'tool3___bcde'] },
      { uuid: 's1', registryId: 's1', state: 'enabled', type: 'stdio', label: undefined, command: 'npx', url: '-y run s1.js', cwd: 'cwd2', env: { KEY: 'value' }, tools: ['tool1_____s1', 'tool2_____s1', 'tool3_____s1'] },
    ],
    logs: {
      '1234-5678-90ab': [],
      '2345-6789-0abc': [],
      '3456-7890-abcd': [],
      '4567-890a-bcde': [],
      's1': [],
      'mcp2': [],
    }
  })
  expect(await mcp.getTools()).toStrictEqual([
    {
      type: 'function',
      function: { name: 'tool1___90ab', description: 'tool1 description', parameters: { type: 'object', properties: { arg: { type: 'string', description: 'arg' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool2___90ab', description: 'tool2', parameters: { type: 'object', properties: { arg: { type: 'number', description: 'desc' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool3___90ab', description: 'tool3 description', parameters: { type: 'object', properties: {}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool1___0abc', description: 'tool1 description', parameters: { type: 'object', properties: { arg: { type: 'string', description: 'arg' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool2___0abc', description: 'tool2', parameters: { type: 'object', properties: { arg: { type: 'number', description: 'desc' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool3___0abc', description: 'tool3 description', parameters: { type: 'object', properties: {}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool1___bcde', description: 'tool1 description', parameters: { type: 'object', properties: { arg: { type: 'string', description: 'arg' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool2___bcde', description: 'tool2', parameters: { type: 'object', properties: { arg: { type: 'number', description: 'desc' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool3___bcde', description: 'tool3 description', parameters: { type: 'object', properties: {}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool1_____s1', description: 'tool1 description', parameters: { type: 'object', properties: { arg: { type: 'string', description: 'arg' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool2_____s1', description: 'tool2', parameters: { type: 'object', properties: { arg: { type: 'number', description: 'desc' }}, required: [] } }
    },
    {
      type: 'function',
      function: { name: 'tool3_____s1', description: 'tool3 description', parameters: { type: 'object', properties: {}, required: [] } }
    },
  ])
})

test('Does not connect twice', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.connect())
  expect(await mcp.connect())
  expect(mcp.clients).toHaveLength(4)
})

test('Name conversion', async () => {
  const mcp = new Mcp(app)
  expect(mcp.originalToolName('tool1___90ab')).toBe('tool1')
  expect(mcp.originalToolName('tool3_____s1')).toBe('tool3')
})

test('Call tool', async () => {
  const mcp = new Mcp(app)
  await mcp.connect()
  expect(await mcp.callTool('tool1___90ab', { arg: 'arg1' })).toStrictEqual({ toolResult: '1-tool1-arg1-result' })
  expect(await mcp.callTool('tool2___90ab', { arg: 'arg2' })).toStrictEqual({ toolResult: '1-tool2-arg2-result' })
  expect(await mcp.callTool('tool1___0abc', { arg: 'arg3' })).toStrictEqual({ content: [{ type: 'text', text: '2-tool1-arg3-result' }] })
  expect(await mcp.callTool('tool2___0abc', { arg: 'arg4' })).toStrictEqual({ content: [{ type: 'text', text: '2-tool2-arg4-result' }] })
  await expect(() => mcp.callTool('tool3___1', { arg: 'modern' })).rejects.toThrowError(/not found/)
})

test('Disconnect', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.connect())
  expect(mcp.clients).toHaveLength(4)
  expect(mcp.deleteServer('1234-5678-90ab')).toBe(true)
  expect(Client.prototype.close).toHaveBeenCalledTimes(1)
  expect(mcp.clients).toHaveLength(3)
})

test('Reload', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.connect())
  expect(mcp.clients).toHaveLength(4)
  expect(Client.prototype.close).toHaveBeenCalledTimes(0)
  expect(await mcp.reload())
  expect(mcp.clients).toHaveLength(4)
  expect(Client.prototype.close).toHaveBeenCalledTimes(4)
})

test('Install smithery', async () => {
  const mcp = new Mcp(app)
  expect(await mcp.getInstallCommand('smithery', 'server', 'key')).toBe('npx -y @smithery/cli@latest install server --client witsy --key key')
  expect(await mcp.installServer('smithery', 'server', 'key')).toBe('success')
  expect(command).toBe('npx -y @smithery/cli@latest install server --client witsy --key key')
})
