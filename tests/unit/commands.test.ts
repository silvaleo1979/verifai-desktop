
import { vi, beforeAll, expect, test } from 'vitest'
import { useWindowMock } from '../mocks/window'
import { store } from '../../src/services/store'
import * as main from '../../src/main/commands'
import * as service from '../../src/services/commands'
import { app } from 'electron'

vi.mock('electron', async() => {
  return {
    app: {
      getPath: vi.fn(() => '')
    },
  }
})

vi.mock('fs', async (importOriginal) => {
  const mod: any = await importOriginal()
  return { default: {
    ...mod,
    writeFileSync: vi.fn(),
  }}
})

beforeAll(() => {
  useWindowMock()
})

test('New command', () => {
  const command = service.newCommand()
  expect(command).toStrictEqual({
    id: null,
    type: 'user',
    icon: null,
    label: 'New Command',
    action: 'chat_window',
    template: null,
    shortcut: '',
    engine: '',
    model: '',
    state: 'enabled'
  })
})

test('Load default commands', () => {
  const commands = main.loadCommands(app)
  expect(commands).toHaveLength(41)
  commands.forEach((command) => {
    expect(command).toHaveProperty('id')
    expect(command.type).toEqual('system')
    expect(command.state).toEqual('enabled')
  })
})

test('Load custom commands', () => {
  const commands = main.loadCommands('./tests/fixtures/commands1.json')
  expect(commands).toHaveLength(42)
  expect(commands.filter(c => c.type === 'user')).toHaveLength(1)
  expect(commands.filter(c => c.type === 'system')).toHaveLength(41)
  expect(commands.filter(c => c.state === 'deleted')).toHaveLength(1)
  expect(commands.filter(c => c.state === 'disabled')).toHaveLength(1)
})

test('Service Install commands', () => {
  service.loadCommands()
  expect(window.api.commands.load).toHaveBeenCalled()
  expect(store.commands).toHaveLength(5)
})

test('Service Save commands', () => {
  service.saveCommands()
  expect(window.api.commands.save).toHaveBeenCalled()
})
