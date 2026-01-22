<template>
  <div class="prompt" :class="{ 'drag-over': isDragOver }" @drop="onDrop" @dragover="onDragOver" @dragenter="onDragEnter" @dragleave="onDragLeave">
    <slot name="before" />
    <div class="attachments" v-if="attachments.length > 0">
      <div class="attachment" v-for="(attachment, index) in attachments" :key="index">
        <AttachmentView :attachment="attachment" />
        <div class="title" v-if="!attachment.isImage()">{{ attachment.filenameShort }}</div>
        <BIconXLg class="delete" @click="onDetach(attachment)" />
      </div>
    </div>
    <div class="input" @paste="onPaste">
      <div class="textarea-wrapper">
        <div class="icon left processing loader-wrapper" v-if="isProcessing"><Loader /><Loader /><Loader /></div>
        <div v-if="expert" class="icon left expert" @click="onClickActiveExpert"><BIconMortarboard /></div>
        <div v-if="command" class="icon left command" @click="onClickActiveCommand"><BIconCommand /></div>
        <div v-if="activeMcpServer" 
             class="mcp-server-badge" 
             :class="{ 'mcp-active': isMcpServerActive }"
             @click="onClickActiveMcpServer"
             v-tooltip="{ text: `Servidor MCP ativo: ${activeMcpServerName}\nClique para desativar`, position: 'top' }">
          <BIconBox class="mcp-icon" />
          <span class="mcp-name">{{ activeMcpServerName }}</span>
          <span v-if="mcpServerStatus" class="mcp-status-indicator" :class="mcpServerStatus"></span>
        </div>
        <textarea v-model="prompt" :placeholder="placeholder" @keydown="onKeyDown" @keyup="onKeyUp" ref="input" autofocus="true" :disabled="conversationMode?.length > 0" />
        <BIconMagic class="icon command right" @click="onCommands(true)" v-if="enableCommands && prompt" />
        <BIconStopCircleFill class="icon stop" @click="onStopPrompting" v-if="isPrompting" />
        <BIconSendFill class="icon send" @click="onSendPrompt" v-else />
      </div>
    </div>
    <div class="actions">
      <BIconTerminal
        v-if="enableInstructions"
        v-tooltip="{ text: t('prompt.instructions.title'), position: 'top-right' }"
        :class="{ icon: true, instructions: true }"
        @click="onClickInstructions"
      />
      <BIconDatabase
        v-if="enableDocRepo"
        v-tooltip="{ text: t('prompt.docRepos.tooltip'), position: 'top-right' }"
        :class="{ icon: true, docrepo: true, active: docRepoActive }"
        @click="onDocRepo"
      />
      <BIconMortarboard
        v-if="enableExperts"
        v-tooltip="{ text: t('prompt.experts.tooltip'), position: 'top' }"
        class="icon experts"
        @click="onClickExperts"
      />
      <BIconPaperclip
        v-if="enableAttachments"
        v-tooltip="{ text: t('prompt.attachment.tooltip'), position: 'top' }"
        class="icon attach"
        @click="onAttach"
      />
      <BIconMic
        v-if="hasDictation"
        v-tooltip="{ text: t('prompt.conversation.tooltip'), position: 'top' }"
        :class="{ icon: true, dictate: true, active: dictating }"
        @click="onDictate"
        @contextmenu="onConversationMenu"
      />
      <Waveform v-if="enableWaveform && dictating" :width="64" :height="16" foreground-color-inactive="var(--background-color)" foreground-color-active="red" :audio-recorder="audioRecorder" :is-recording="true"/>
      <BIconBinoculars
        v-if="enableDeepResearch"
        v-tooltip="{ text: t('common.deepResearch'), position: 'top' }"
        class="icon research" :class="{ active: deepResearchActive }"
        @click="onDeepResearch"
      />
      <LogoA2A v-if="store.config.features?.a2a"
        v-tooltip="{ text: 'A2A Integration', position: 'top' }"
        class="icon research" :class="{ active: a2aActive }"
        @click="onA2A"
      />
      <BIconBox
        v-if="isMcpAvailable"
        v-tooltip="{ text: activeMcpServer ? `MCP: ${activeMcpServerName}` : 'Selecionar servidor MCP', position: 'top' }"
        :class="{ icon: true, mcp: true, active: activeMcpServer }"
        @click="onMcpServers"
      />
      <BIconBox
        v-if="activeMcpPrompt"
        v-tooltip="{ text: `Prompt MCP: ${activeMcpPromptName}\nClique para desativar`, position: 'top' }"
        :class="{ icon: true, 'mcp-prompt': true, active: true }"
        @click="onClickActiveMcpPrompt"
      />
      <slot name="actions" />
    </div>
    <slot name="between" />
    <slot name="after" />
    <ContextMenu v-if="showInstructions" @close="closeContextMenu" :actions="instructionsMenuItems" @action-clicked="setInstructions" :selected="chatInstructions" :x="menuX" :y="menuY" :position="menusPosition" />
    <ContextMenu v-if="showDocRepo" @close="closeContextMenu" :actions="docReposMenuItems" @action-clicked="handleDocRepoClick" :x="menuX" :y="menuY" :position="menusPosition" />
    <ContextMenu v-if="showExperts" @close="closeContextMenu" :show-filter="true" :actions="expertsMenuItems" :selected="expertsMenuItems[0]" @action-clicked="handleExpertClick" :x="menuX" :y="menuY" :position="menusPosition" />
    <ContextMenu v-if="showActiveExpert" @close="closeContextMenu" :actions="activeExpertMenuItems" @action-clicked="handleExpertClick" :x="menuX" :y="menuY" :position="menusPosition" />
    <ContextMenu v-if="showCommands" @close="closeContextMenu" :show-filter="true" :actions="commands" @action-clicked="handleCommandClick" :x="menuX" :y="menuY" :position="menusPosition" />
    <ContextMenu v-if="showPrompts" @close="closeContextMenu" :show-filter="true" :actions="mcpServers" @action-clicked="handleMcpServerClick" :x="menuX" :y="menuY" :position="menusPosition" />
    <ContextMenu v-if="showConversationMenu" @close="closeContextMenu" :actions="conversationMenu" @action-clicked="handleConversationClick" :x="menuX" :y="menuY" :position="menusPosition" />
  </div>
</template>

<script setup lang="ts">

import { Expert, Command } from '../types/index'
import { DocumentBase } from '../types/rag'
import { StreamingChunk } from '../voice/stt'
import { ref, computed, onMounted, onUnmounted, nextTick, watch, PropType } from 'vue'
import { store } from '../services/store'
import { expertI18n, commandI18n, t, i18nInstructions, getLlmLocale, setLlmLocale } from '../services/i18n'
import { BIconBinoculars, BIconStars, BIconBox } from 'bootstrap-icons-vue'
import LlmFactory, { ILlmManager } from '../llms/llm'
import { mimeTypeToExtension, extensionToMimeType } from 'multi-llm-ts'
import useAudioRecorder, { isAudioRecordingSupported } from '../composables/audio_recorder'
import ContextMenu, { MenuPosition, type MenuAction } from './ContextMenu.vue'
import useTipsManager from '../composables/tips_manager'
import useTranscriber from '../composables/transcriber'
import LogoA2A from '../../assets/a2a.svg?component'
import ImageUtils from '../composables/image_utils'
import Dialog from '../composables/dialog'
import Waveform from '../components/Waveform.vue'
import AttachmentView from './Attachment.vue'
import Attachment from '../models/attachment'
import Message from '../models/message'
import Loader from './Loader.vue'
import Chat from '../models/chat'

export type SendPromptParams = {
  instructions?: string,
  prompt: string,
  attachments?: Attachment[]
  docrepo?: string,
  expert?: Expert,
  deepResearch?: boolean
  a2a?: boolean
  mcpServer?: string | null
}

export type HistoryProvider = (event: KeyboardEvent) => string[]

import useEventBus from '../composables/event_bus'
const { onEvent, emitEvent } = useEventBus()

const props = defineProps({
  chat: {
    type: Object as PropType<Chat>,
    required: true
  },
  conversationMode: {
    type: String,
    required: false
  },
  placeholder: {
    type: String,
    required: false,
    default: t('prompt.placeholders.default')
  },
  enableInstructions: {
    type: Boolean,
    default: true
  },
  enableDocRepo: {
    type: Boolean,
    default: true
  },
  enableAttachments: {
    type: Boolean,
    default: true
  },
  enableExperts: {
    type: Boolean,
    default: true
  },
  menusPosition: {
    type: String as PropType<MenuPosition>,
    default: 'above'
  },
  enableCommands: {
    type: Boolean,
    default: true
  },
  enableDictation: {
    type: Boolean,
    default: true
  },
  enableConversations: {
    type: Boolean,
    default: true
  },
  enableWaveform: {
    type: Boolean,
    default: true
  },
  enableDeepResearch: {
    type: Boolean,
    default: false
  },
  processing: {
    type: Boolean,
    default: false
  },
  historyProvider: {
    type: Function as PropType<HistoryProvider>,
    default: (_: KeyboardEvent): string[] => []
  }
})

// init stuff
const audioRecorder = useAudioRecorder(store.config)
const { transcriber, processStreamingError } = useTranscriber(store.config)
const tipsManager = useTipsManager(store)
const llmManager: ILlmManager = LlmFactory.manager(store.config)
let userStoppedDictation = false

const prompt = ref('')
const instructions = ref(null)
const expert = ref<Expert|null>(null)
const command = ref<Command|null>(null)
const activeMcpPrompt = ref<{ serverUuid: string, promptName: string, promptInfo: any }|null>(null)
const activeMcpPromptName = ref<string>('')
const activeMcpServer = ref<string|null>(null)
const activeMcpServerName = ref<string>('')
const attachments = ref<Attachment[]>([])
const docrepo = ref(null)
const input = ref(null)
const docRepos = ref<DocumentBase[]>([])
const mcpPrompts = ref<MenuAction[]>([])
const mcpServers = ref<MenuAction[]>([])
let shouldSyncMcpServer = true
const showInstructions = ref(false)
const showDocRepo = ref(false)
const showExperts = ref(false)
const showActiveExpert = ref(false)
const showCommands = ref(false)
const showPrompts = ref(false)
const showConversationMenu = ref(false)
const deepResearchActive = ref(false)
const a2aActive = ref(false)
const hasDictation = ref(false)
const dictating = ref(false)
const processing = ref(false)
const isDragOver = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const emit = defineEmits(['prompt', 'stop'])

const engine = () => props.chat?.engine || llmManager.getChatEngineModel().engine
const model = () => props.chat?.model || llmManager.getChatEngineModel().model

const backSpaceHitsToClearExpert = 1
let backSpaceHitsWhenEmpty = 0
let runCommandImmediate = false

const isProcessing = computed(() => {
  return processing.value || props.processing
})

const isPrompting = computed(() => {
  return props.chat?.lastMessage()?.transient
})

const isMcpAvailable = computed(() => {
  return window.api.mcp?.isAvailable() || false
})

const mcpServerStatus = computed(() => {
  if (!activeMcpServer.value) return null
  
  try {
    const status = window.api.mcp.getStatus()
    const server = status?.servers?.find(s => s.uuid === activeMcpServer.value)
    if (server?.state === 'connected') {
      return 'connected'
    } else if (server?.state === 'disconnected' || server?.state === 'error') {
      return 'disconnected'
    }
    return null
  } catch (e) {
    return null
  }
})

const isMcpServerActive = computed(() => {
  return mcpServerStatus.value === 'connected'
})

const docRepoActive = computed(() => {
  return props.chat?.docrepo || docrepo.value
})

const instructionIds = [ 'standard', 'structured', 'playful', 'empathic', 'uplifting', 'reflective', 'visionary' ]

const instructionsMenuItems = computed(() => {
  return [
    { label: t('prompt.instructions.title'), action: '', disabled: true },
    { label: t('prompt.instructions.default'), action: 'null' },
    ...instructionIds.map((id) => {
      return { label: t(`settings.llm.instructions.${id}`), action: id }
    }),
    ...store.config.llm.customInstructions.map((custom) => {
      return { label: custom.label, action: `custom:${custom.id}` }
    })
  ]
})

const chatInstructions = computed(() => {

  // Check default instructions first
  for (const id of instructionIds) {
    if (props.chat.instructions === i18nInstructions(store.config, `instructions.chat.${id}`)) {
      return { label: id, action: id }
    }
  }

  // Check custom instructions
  if (store.config.llm.customInstructions?.length > 0) {
    for (const custom of store.config.llm.customInstructions) {
      if (props.chat.instructions === custom.instructions) {
        return { label: custom.label, action: `custom:${custom.id}` }
      }
    }
  }

  // default
  return { label: '', action: 'null' }

})

const docReposMenuItems = computed(() => {
  const menus: MenuAction[] = docRepos.value.map(d => {
    return { label: d.name, action: d.uuid }
  })
  if (menus.length > 0 && docRepoActive.value) {
    menus.push({ separator: true })
  }
  if (docRepoActive.value) {
    menus.push({ label: 'Disconnect', action: 'disconnect' })
  }
  return menus
})

const expertsMenuItems = computed(() => {
  return store.experts.filter((p: Expert) => p.state == 'enabled').map(p => {
    return { label: p.name || expertI18n(p, 'name'), action: p.id, icon: BIconStars }
  })
})

const activeExpertMenuItems = computed(() => {
  return [
    { label: expert.value.name || expertI18n(expert.value, 'name'), icon: BIconStars },
    { label: expert.value.prompt || expertI18n(expert.value, 'prompt'), disabled: true, wrap: true },
    { separator: true },
    { label: t('prompt.experts.clear'), action: 'clear' },
  ];
})

const commands = computed(() => {
  const allItems: MenuAction[] = []
  
  // PRIMEIRO: Adicionar prompts MCP se houver (quando usar #)
  if (mcpPrompts.value.length > 0) {
    // Adicionar título para prompts MCP
    allItems.push({
      label: t('prompt.mcpPrompts.title') || 'MCP Prompts',
      action: null,
      disabled: true
    })
    allItems.push({ separator: true })
    allItems.push(...mcpPrompts.value)
    
    // Se houver comandos locais também, adicionar separador
    const localCommands = store.commands.filter((c) => c.state == 'enabled')
    if (localCommands.length > 0) {
      allItems.push({ separator: true })
    }
  }
  
  // DEPOIS: Adicionar comandos locais
  const commandItems: MenuAction[] = store.commands
    .filter((c) => c.state == 'enabled')
    .map(c => ({ 
      label: c.label ?? commandI18n(c, 'label'), 
      action: c.id, 
      icon: c.icon 
    }))
  
  allItems.push(...commandItems)
  
  return allItems
})

const conversationMenu = computed(() => {
  if (props.conversationMode) {
    return [
      { label: t('prompt.conversation.stop'), action: null }
    ]
  } else {
    return [
      { label: t('prompt.conversation.startAuto'), action: 'auto' },
      { label: t('prompt.conversation.startPTT'), action: 'ptt' },
    ]
  }
})

onMounted(() => {

  // event
  onEvent('set-prompt', onSetPrompt)
  window.api.on('docrepo-modified', loadDocRepos)
  autoGrow(input.value)

  // other stuff
  loadDocRepos()
  loadMcpServers()
  loadMcpPrompts()
  initDictation()

  // reset doc repo and expert
  watch(() => props.chat || {}, () => {
    docrepo.value = props.chat?.docrepo
    instructions.value = props.chat?.instructions || null
    
    // Sincronizar servidor MCP do chat
    if (shouldSyncMcpServer && props.chat?.mcpServer) {
      activeMcpServer.value = props.chat.mcpServer
      updateMcpServerName()
    } else if (shouldSyncMcpServer && !props.chat?.mcpServer) {
      activeMcpServer.value = null
      activeMcpServerName.value = ''
    }
  }, { immediate: true })
  
  // Recarregar quando MCP servers mudarem
  watch(() => store.config.mcp?.servers, () => {
    loadMcpServers()
    loadMcpPrompts()
  }, { deep: true })

})

onUnmounted(() => {
  window.api.off('docrepo-modified', loadDocRepos)
})

const defaultPrompt = (conversationMode: string) => {
  if (conversationMode === 'auto') {
    return t('prompt.conversation.placeholders.auto')
  } else if (conversationMode === 'ptt') {
    return t('prompt.conversation.placeholders.ptt')
  } else {
    return ''
  }
}

const onDeepResearch = () => {
  deepResearchActive.value = !deepResearchActive.value
}

const setDeepResearch = (active: boolean) => {
  deepResearchActive.value = active
}

const onA2A = () => {
  a2aActive.value = !a2aActive.value
}

const initDictation = async () => {

  // needed?
  if (!props.enableDictation) {
    return
  }

  // check
  const supported = await isAudioRecordingSupported()
  if (!supported) {
    return
  }

  // this should be good enough
  hasDictation.value = true

  // push-to-talk stuff
  const onKeyUpPTT = () => {
    //console.log('Stopping push-to-talk dictation')
    document.removeEventListener('keyup', onKeyUpPTT)
    stopDictation(false)
  }
  document.addEventListener('keydown', (event) => {
    if (props.conversationMode == 'ptt' && event.code === 'Space' && dictating.value === false) {
      //console.log('Starting push-to-talk dictation')
      document.addEventListener('keyup', onKeyUpPTT)
      startDictation()
    }
  })

}

const loadDocRepos = () => {
  if (props.enableDocRepo) {
    docRepos.value = window.api.docrepo.list()
  }
}

const setInstructions = (action: string) => {
  closeContextMenu()
  if (action === 'null') {
    instructions.value = null
  } else if (action.startsWith('custom:')) {
    // Handle custom instructions
    const customId = action.replace('custom:', '')
    const customInstruction = store.config.llm.customInstructions?.find(c => c.id === customId)
    if (customInstruction) {
      instructions.value = customInstruction.instructions
    }
  } else {
    // Handle default instructions
    // use chat llm locale if set
    let llmLocale = null
    const forceLocale = store.config.llm.forceLocale
    if (props.chat?.locale) {
      llmLocale = getLlmLocale()
      setLlmLocale(props.chat.locale)
      store.config.llm.forceLocale = true
    }

    // get the instructions
    instructions.value = i18nInstructions(store.config, `instructions.chat.${action}`)

    // restore
    if (llmLocale) {
      setLlmLocale(llmLocale)
      store.config.llm.forceLocale = forceLocale
    }
  }
  if (props.chat) {
    props.chat.instructions = instructions.value
  }
}

const onSetPrompt = (message: Message) => {
  prompt.value = message.content
  attachments.value = message.attachments
  expert.value = message.expert
  nextTick(() => {
    autoGrow(input.value)
    input.value.focus()
    try {
      input.value.scrollTo(0, input.value.scrollHeight)
    } catch {}
  })
}

const setExpert = (xpert: Expert) => {
  expert.value = xpert
  if (prompt.value == '@') {
    prompt.value = ''
  }
  nextTick(() => {
    input.value?.focus()
  })
}

const onSendPrompt = async () => {
  let message = prompt.value.trim()
  
  // Se for um prompt MCP selecionado via #, chamar o prompt MCP e concatenar com a mensagem
  if (command.value && command.value.id?.startsWith('mcp:')) {
    const mcpCommand = command.value as any
    const serverUuid = mcpCommand.mcpServerUuid
    const promptName = mcpCommand.mcpPromptName
    const promptInfo = mcpCommand.mcpPromptInfo
    
    try {
      // Preparar argumentos para o prompt MCP
      let promptArgs: anyDict = {}
      
      // Se o prompt tem argumentos e há mensagem do usuário
      if (promptInfo.arguments && Array.isArray(promptInfo.arguments) && message) {
        // Se houver apenas um argumento, usar a mensagem diretamente
        if (promptInfo.arguments.length === 1) {
          promptArgs[promptInfo.arguments[0].name] = message
        } else {
          // Se houver múltiplos argumentos, tentar parsear ou usar o primeiro
          promptArgs[promptInfo.arguments[0].name] = message
        }
      }
      
      // Construir o nome único do prompt no formato esperado: prompt_${name}___${uuid.slice(-4)}
      const uuidSuffix = serverUuid.padStart(4, '_').slice(-4)
      const uniquePromptName = `prompt_${promptName}___${uuidSuffix}`
      
      // Chamar o prompt MCP
      const promptResult = await window.api.mcp.callPrompt(
        uniquePromptName,
        promptArgs
      )
      
      // Extrair o texto do resultado do prompt MCP
      let promptText = ''
      if (promptResult.messages && Array.isArray(promptResult.messages)) {
        promptText = promptResult.messages
          .map((msg: any) => {
            if (typeof msg.content === 'string') {
              return msg.content
            } else if (msg.content?.text) {
              return msg.content.text
            } else if (Array.isArray(msg.content)) {
              return msg.content
                .map((c: any) => c.text || c)
                .filter(Boolean)
                .join('\n')
            }
            return ''
          })
          .filter(Boolean)
          .join('\n\n')
      }
      
      // Concatenar: texto do prompt MCP + mensagem do usuário
      if (promptText) {
        message = `${promptText}\n\n${message}`
      } else if (message) {
        // Se não houver texto do prompt, usar apenas a mensagem
        message = message
      } else {
        // Se não houver nem prompt nem mensagem, usar string vazia
        message = ''
      }
    } catch (e) {
      console.error('Error calling MCP prompt:', e)
      // Em caso de erro, usar apenas a mensagem do usuário
      if (!message) {
        message = ''
      }
    }
    
    // Limpar o comando após processar
    command.value = null
  } else if (command.value) {
    // Comando normal
    message = commandI18n(command.value, 'template').replace('{input}', message)
    command.value = null
  }
  
  // Limpar o badge MCP do campo de entrada após enviar
  // O mcpServer permanece no chat para ser usado na mensagem, mas o badge desaparece do prompt
  shouldSyncMcpServer = false
  activeMcpServer.value = null
  activeMcpServerName.value = ''
  nextTick(() => {
    shouldSyncMcpServer = true
  })
  
  prompt.value = defaultPrompt(props.conversationMode)
  nextTick(() => {
    autoGrow(input.value)
    // Usar mcpServer do chat se disponível, senão usar do activeMcpServer
    const mcpServerToSend = props.chat?.mcpServer || activeMcpServer.value || null
    emit('prompt', {
      instructions: instructions.value,
      prompt: message,
      attachments: attachments.value,
      docrepo: docrepo.value,
      expert: expert.value,
      deepResearch: deepResearchActive.value,
      a2a: a2aActive.value,
      mcpServer: mcpServerToSend
    } as SendPromptParams)
    attachments.value = []
  })
}

const onStopPrompting = () => {
  emit('stop', null)
}

const onAttach = () => {
  let files = window.api.file.pickFile({ multiselection: true, /*filters: [
    { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
  ]*/ })
  if (Array.isArray(files)) {
    for (const filepath of files) {
      const fileContents = window.api.file.read(filepath)
      const format = fileContents.url.split('.').pop()
      if (llmManager.canProcessFormat(engine(), model(), format)) {
        const mimeType = extensionToMimeType(format)
        attach(fileContents.contents, mimeType, fileContents.url)
      } else {
        console.error('Cannot attach format', format)
        Dialog.alert(`${fileContents.url.split('/').pop()}: ${t('prompt.attachment.formatError.title')}`, t('prompt.attachment.formatError.text'))
      }
    }
  }
}

const onPaste = (event: ClipboardEvent) => {
  for (let item of event.clipboardData.items) {
    if (item.kind === 'file') {
      let blob = item.getAsFile();
      let reader = new FileReader();
      reader.onload = (event) => {
        if (event.target.readyState === FileReader.DONE) {

          let result = event.target.result as string
          let mimeType = result.split(';')[0].split(':')[1]
          let format = mimeTypeToExtension(mimeType)
          let contents = result.split(',')[1]

          // check before attaching
          if (llmManager.canProcessFormat(engine(), model(), format)) {
            attach(contents, mimeType, 'clipboard://')
          } else {
            console.error('Cannot attach format', format)
            Dialog.alert(t('prompt.attachment.formatError.title'), t('prompt.attachment.formatError.text'))
          }
        }
      }
      reader.readAsDataURL(blob);
      event.preventDefault();
    }
  }
}

const attach = async (contents: string, mimeType: string, url: string) => {
  const toAttach = new Attachment(contents, mimeType, url)
  if (toAttach.isImage() && store.config.llm.imageResize > 0) {
    try {
      ImageUtils.resize(`data:${mimeType};base64,${contents}`, store.config.llm.imageResize, (resizedContent, resizedMimeTyoe) => {
        attachments.value.push(new Attachment(resizedContent, resizedMimeTyoe, url))
      })
    } catch (e) {
      console.error('Error resizing image', e)
      attachments.value.push(toAttach)
    }
  } else if (toAttach.isText()) {
    toAttach.loadContents()
    if (!toAttach.content) {
      Dialog.alert(`${url.split('/').pop()}: ${t('prompt.attachment.emptyError.title')}`, t('prompt.attachment.emptyError.text'))
      return
    } else {
      attachments.value.push(toAttach)
    }
  } else {
    attachments.value.push(toAttach)
  }
}

const onDetach = (attachment: Attachment) => {
  attachments.value = attachments.value.filter((a: Attachment) => a !== attachment)
}

const onDragOver = (event: DragEvent) => {
  if (!props.enableAttachments) return
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const onDragEnter = (event: DragEvent) => {
  if (!props.enableAttachments) return
  event.preventDefault()
  isDragOver.value = true
}

const onDragLeave = (event: DragEvent) => {
  if (!props.enableAttachments) return
  event.preventDefault()
  // Only set to false if we're leaving the dropzone itself, not a child element
  if (!(event.currentTarget as HTMLElement)?.contains(event.relatedTarget as Node)) {
    // for a very strange reason, when dragging over the textarea, the relatedTarget is a div with no parent and no children
    const relatedTarget = event.relatedTarget as HTMLElement
    if (relatedTarget && relatedTarget.nodeName === 'DIV' && relatedTarget.parentElement === null && relatedTarget.children.length === 0) {
      return
    }
    isDragOver.value = false
  }
}

const onDrop = async (event: DragEvent) => {
  if (!props.enableAttachments) return
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  // Process all dropped files
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    try {
      // Check if the format is supported by the LLM
      const format = file.name.split('.').pop()?.toLowerCase()
      if (!format || !llmManager.canProcessFormat(engine(), model(), format)) {
        console.error('Cannot attach format', format)
        Dialog.alert(`${file.name}: ${t('prompt.attachment.formatError.title')}`, t('prompt.attachment.formatError.text'))
        continue
      }
      
      // Read the file as base64
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        if (event.target?.readyState === FileReader.DONE) {
          const result = event.target.result as string
          
          // Extract mime type and base64 content
          const mimeType = result.split(';')[0].split(':')[1]
          const contents = result.split(',')[1]
          
          // Create the file URL for display
          const url = `file://${file.name}`
          
          // Call the existing attach function
          await attach(contents, mimeType, url)
        }
      }
      
      reader.onerror = () => {
        console.error('Error reading file:', file.name)
        Dialog.alert(`${file.name}: Error reading file`)
      }
      
      // Read the file as data URL (base64)
      reader.readAsDataURL(file)
      
    } catch (error) {
      console.error('Error processing dropped file:', error)
      Dialog.alert(`${file.name}: Error processing file`)
    }
  }
}

const onClickInstructions = () => {
  const icon = document.querySelector('.prompt .instructions')
  const rect = icon?.getBoundingClientRect()
  menuX.value = rect?.left + (props.menusPosition === 'below' ? -10 : 0)
  menuY.value = rect?.height + (props.menusPosition === 'below' ? rect?.y : 16 )  + 24
  showInstructions.value = true
}

const openExperts = () => {
  const icon = document.querySelector('.prompt .experts')
  const rect = icon?.getBoundingClientRect()
  menuX.value = rect?.left + (props.menusPosition === 'below' ? -10 : 0)
  menuY.value = rect?.height + (props.menusPosition === 'below' ? rect?.y : 16 )  + 24
  showExperts.value = true
}

const onClickExperts = () => {
  openExperts()
}

const onClickActiveExpert = () => {
  const icon = document.querySelector('.prompt .expert')
  const rect = icon?.getBoundingClientRect()
  menuX.value = rect?.left + (props.menusPosition === 'below' ? -10 : 0)
  menuY.value = rect?.height + (props.menusPosition === 'below' ? rect?.y : 8 )  + 24
  showActiveExpert.value = true
}

const onClickActiveCommand = () => {
  disableCommand()
}

const onDictate = async () => {
  if (dictating.value) {
    stopDictation(true)
    stopConversation()
  } else {
    startDictation()
  }
}

const stopDictation = async (userStopped = false) => {
  userStoppedDictation = userStopped
  transcriber.endStreaming()
  audioRecorder.stop()
}

const startDictation = async () => {

  // transcriber
  transcriber.initialize()

  // audio recorder
  await audioRecorder.initialize({

    pcm16bitStreaming: transcriber.requiresPcm16bits,
    listener: {

      onNoiseDetected: () => {
        emitEvent('audio-noise-detected', null)
      },
      
      onAudioChunk: async (chunk) => {
          if (transcriber.streaming) {
            await transcriber.sendStreamingChunk(chunk)
          }
        },

      onSilenceDetected: () => {

        // // depends on configuration
        // if (store.config.stt.silenceAction === 'nothing') {
        //   return
        // }

        // no silence in ptt conversation
        if (props.conversationMode === 'ptt') {
          return
        }

        // we dictate anyway
        stopDictation(false)

      },
      
      onRecordingComplete: async (audioChunks: Blob[], noiseDetected: boolean) => {

        try {

          // do that always
          audioRecorder.release()
          dictating.value = false

          // if streaming we are all done
          if (audioChunks.length) {

            // update
            prompt.value = defaultPrompt(props.conversationMode)

            // if no noise stop everything
            if (!noiseDetected) {
              return
            }

            // transcribe
            processing.value = true
            const response = await transcriber.transcribe(audioChunks)
            if (response) {
              prompt.value = response.text
            }

          }

          // execute?
          if (props.conversationMode/* || store.config.stt.silenceAction === 'stop_execute' || store.config.stt.silenceAction === 'execute_continue'*/) {

            // send prompt
            onSendPrompt()

            // record again?
            if (userStoppedDictation === false && (props.conversationMode === 'auto'/* || store.config.stt.silenceAction === 'execute_continue'*/)) {
              startDictation()
            }
          
          } else {

            // focus
            input.value.focus()
            await nextTick()
            autoGrow(input.value)

            // conversation tip
            if (props.enableConversations) {
              tipsManager.showTip('conversation')
            }


          }

        } catch (error) {
          console.error(error)
          Dialog.alert('Error transcribing audio')
        }

        // update
        processing.value = false

      },
    }
  })

  // streaming setup
  let connected = true
  const useStreaming = transcriber.requiresStreaming
  if (useStreaming) {
    await transcriber.startStreaming(async (chunk: StreamingChunk) => {
      if (chunk.type === 'text') {
        prompt.value = chunk.content
        autoGrow(input.value)
      } else if (chunk.type === 'error') {
        await processStreamingError(chunk)
        dictating.value = false
        audioRecorder.stop()
        connected = false
      }
    })
  }

  // check
  if (!connected) {
    return
  }

  // start
  dictating.value = true
  audioRecorder.start(transcriber.requiresStreaming)

}

const onConversationMenu = () => {
  if (!props.enableConversations) return
  const icon = document.querySelector('.prompt .dictate')
  const rect = icon?.getBoundingClientRect()
  menuX.value = rect?.left + (props.menusPosition === 'below' ? -10 : 0)
  menuY.value = rect?.height + (props.menusPosition === 'below' ? rect.y : 8 )  + 24
  showConversationMenu.value = true
}

const handleConversationClick = (action: string) => {
  closeContextMenu()
  emitEvent('conversation-mode', action)
  prompt.value = defaultPrompt(action)
  if (action === 'auto') {
    startDictation()
  } else if (action === 'ptt') {
    // nothing to do
  } else {
    stopDictation(true)
    stopConversation()
  }
}

const stopConversation = () => {
  emitEvent('audio-noise-detected', null)
  emitEvent('conversation-mode', null)
}

const onDocRepo = async () => {

  if (docRepos.value.length === 0) {
    const result = await Dialog.show({
      title: t('prompt.docRepos.none'),
      showCancelButton: true,
      confirmButtonText: t('common.create'),
    })
    if (result.isConfirmed) {
      window.api.docrepo.open()
    }
    return
  }
  
  showDocRepo.value = true
  const icon = document.querySelector('.prompt .docrepo')
  const rect = icon?.getBoundingClientRect()
  menuX.value = rect?.left
  menuY.value = rect?.height + 32
}

const handleDocRepoClick = (action: string) => {
  closeContextMenu()
  if (action === 'disconnect') {
    if (props.chat) {
      props.chat.docrepo = null
    }
    docrepo.value = null
    window.api.docrepo.disconnect()
  } else {
    window.api.docrepo.connect(action)
    if (props.chat) {
      props.chat.docrepo = action
    } else {
      docrepo.value = action
    }
  }
}

const isContextMenuOpen = () => {
  return showDocRepo.value || showExperts.value || showCommands.value || showActiveExpert.value || showConversationMenu.value || showPrompts.value
}

const closeContextMenu = () => {
  showInstructions.value = false
  showDocRepo.value = false
  showExperts.value = false
  showCommands.value = false
  showActiveExpert.value = false
  showPrompts.value = false
  showConversationMenu.value = false
  nextTick(() => {
    input.value.focus()
  })
}

const handleExpertClick = (action: string) => {
  closeContextMenu()
  if (action === 'clear') {
    disableExpert()
    return
  } else if (action) {
    setExpert(store.experts.find(p => p.id === action))
  }
}

const disableExpert = () => {
  expert.value = null
}

const disableCommand = () => {
  command.value = null
}

const onClickActiveMcpPrompt = () => {
  disableMcpPrompt()
}

const disableMcpPrompt = () => {
  activeMcpPrompt.value = null
  activeMcpPromptName.value = ''
}

const loadMcpServers = async () => {
  if (!window.api.mcp.isAvailable()) {
    mcpServers.value = []
    return
  }
  
  try {
    // Usar getStatus() para obter servidores realmente conectados
    const status = window.api.mcp.getStatus()
    const serverActions: MenuAction[] = []
    
    // Adicionar título do menu MCP
    serverActions.push({
      label: t('prompt.mcpServers.title') || 'MCP Servers',
      action: null,
      disabled: true
    })
    serverActions.push({ separator: true })
    
    let hasServers = false
    
    // status.servers contém apenas servidores conectados
    for (const server of status.servers || []) {
      hasServers = true
      serverActions.push({
        label: `📦 ${server.label || server.name || server.url || 'MCP Server'}`,
        action: server.uuid || '',
        description: `${server.tools?.length || 0} tools, ${server.prompts?.length || 0} prompts`
      })
    }
    
    // Se não houver servidores, mostrar mensagem
    if (!hasServers) {
      serverActions.push({
        label: t('prompt.mcpServers.noServers') || 'No MCP servers connected',
        action: null,
        disabled: true
      })
    }
    
    mcpServers.value = serverActions
  } catch (e) {
    console.error('Failed to load MCP servers:', e)
    mcpServers.value = [{
      label: t('prompt.mcpServers.error') || 'Failed to load MCP servers',
      action: null,
      disabled: true
    }]
  }
}

const updateMcpServerName = async () => {
  if (!activeMcpServer.value) {
    activeMcpServerName.value = ''
    return
  }
  
  try {
    const status = window.api.mcp.getStatus()
    const server = status?.servers?.find(s => s.uuid === activeMcpServer.value)
    activeMcpServerName.value = server?.label || server?.name || server?.url || 'MCP Server'
  } catch (e) {
    activeMcpServerName.value = 'MCP Server'
  }
}

const loadMcpPrompts = async () => {
  if (!window.api.mcp?.isAvailable()) {
    mcpPrompts.value = []
    return
  }
  
  try {
    // Usar getStatus() para obter servidores realmente conectados
    const status = window.api.mcp.getStatus()
    const allPrompts: MenuAction[] = []
    
    let hasPrompts = false
    
    // status.servers contém apenas servidores conectados (já filtrados)
    for (const server of status?.servers || []) {
      // getServerPrompts procura por uuid no client.server.uuid
      const serverId = server.uuid
      if (!serverId) {
        console.warn('Server without uuid:', server)
        continue
      }
      
      try {
        const prompts = await window.api.mcp.getServerPrompts(serverId)
        
        if (prompts && prompts.length > 0) {
          hasPrompts = true
          
          // Adicionar header do servidor
          allPrompts.push({
            label: `📦 ${server.label || server.name || server.url || 'MCP Server'}`,
            action: null,
            disabled: true
          })
          
          // Adicionar prompts do servidor
          for (const prompt of prompts) {
            allPrompts.push({
              label: prompt.name,
              action: `${serverId}:${prompt.name}`,
              description: prompt.description
            })
          }
          
          // Separador entre servidores
          allPrompts.push({ separator: true })
        }
      } catch (e) {
        console.error(`Failed to load prompts from server ${serverId}:`, e)
      }
    }
    
    // Se não houver prompts, não adicionar nada
    if (!hasPrompts) {
      mcpPrompts.value = []
    } else {
      // Remover último separador se houver prompts
      if (allPrompts[allPrompts.length - 1]?.separator) {
        allPrompts.pop()
      }
      mcpPrompts.value = allPrompts
    }
  } catch (e) {
    console.error('Failed to load MCP prompts:', e)
    mcpPrompts.value = []
  }
}

const onMcpServers = async () => {
  await loadMcpServers()
  showPrompts.value = true
  const textarea = document.querySelector('.prompt textarea')
  const rect = textarea?.getBoundingClientRect()
  menuX.value = rect?.right + (props.menusPosition === 'below' ? rect?.y - 150 : 0 ) - 250
  menuY.value = rect?.height + (props.menusPosition === 'below' ? rect?.y + 24 : 0 ) + 32
}

const handleMcpServerClick = async (serverUuid: string) => {
  closeContextMenu()
  
  // Ativar o servidor MCP no chat atual
  if (props.chat) {
    props.chat.mcpServer = serverUuid
  }
  
  activeMcpServer.value = serverUuid
  await updateMcpServerName()
  
  // Limpar o "/" do campo de texto quando selecionar servidor MCP
  if (prompt.value === '/') {
    prompt.value = ''
  }
}

const onClickActiveMcpServer = () => {
  // Desativar servidor MCP
  if (props.chat) {
    props.chat.mcpServer = null
  }
  activeMcpServer.value = null
  activeMcpServerName.value = ''
}

const onCommands = async (immediate: boolean) => {
  // Carregar prompts MCP antes de mostrar o menu (para aparecer no #)
  await loadMcpPrompts()
  
  // Aguardar próximo tick para garantir que o computed seja reavaliado
  await nextTick()
  
  showCommands.value = true
  runCommandImmediate = immediate
  const textarea = document.querySelector('.prompt textarea')
  const rect = textarea?.getBoundingClientRect()
  menuX.value = rect?.right + (props.menusPosition === 'below' ? rect?.y - 150 : 0 ) - 250
  menuY.value = rect?.height + (props.menusPosition === 'below' ? rect?.y + 24 : 0 ) + 32
}

const handleCommandClick = async (action: string) => {
  closeContextMenu()
  
  // Verificar se é um prompt MCP (formato: "serverUuid:promptName")
  if (action && action.includes(':') && !action.startsWith('custom:')) {
    const [serverUuid, promptName] = action.split(':')
    
    try {
      // Obter informações do prompt
      const prompts = await window.api.mcp.getServerPrompts(serverUuid)
      const promptInfo = prompts.find(p => p.name === promptName)
      
      if (!promptInfo) {
        return
      }
      
      // Criar um comando virtual para prompts MCP (funciona como comando normal)
      // Armazenar informações do prompt MCP no comando para uso posterior
      command.value = {
        id: `mcp:${serverUuid}:${promptName}`,
        label: promptName,
        template: '', // Não usar template, será processado em onSendPrompt
        icon: null,
        // Armazenar informações do prompt MCP como propriedades customizadas
        mcpServerUuid: serverUuid,
        mcpPromptName: promptName,
        mcpPromptInfo: promptInfo
      } as any
      
      // NÃO usar activeMcpPrompt quando selecionado via # (para não mostrar badge MCP)
      // Limpar activeMcpPrompt se existir
      activeMcpPrompt.value = null
      activeMcpPromptName.value = ''
      
      // Limpar o prompt do campo de texto (deixar vazio, apenas com o ícone)
      if (prompt.value.endsWith('#')) {
        prompt.value = ''
      } else {
        prompt.value = ''
      }
      
      if (runCommandImmediate) {
        onSendPrompt()
      }
    } catch (e) {
      console.error('Error handling MCP prompt click:', e)
    }
    return
  }
  
  // Comando normal
  command.value = store.commands.find(c => c.id === action)
  // Limpar prompt MCP se houver
  activeMcpPrompt.value = null
  activeMcpPromptName.value = ''
  
  // Limpar o prompt do campo de texto (deixar vazio, apenas com o ícone)
  if (prompt.value.endsWith('#')) {
    prompt.value = ''
  } else {
    prompt.value = ''
  }
  if (runCommandImmediate) {
    onSendPrompt()
  }
}

let draftPrompt = ''
const onKeyDown = (event: KeyboardEvent) => {

  if (event.key === 'Enter') {
    if (event.isComposing) return
    if (event.shiftKey) {

    } else {
      onSendPrompt()
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {

    // not if context menu is open
    if (isContextMenuOpen()) {
      return
    }

    // need an history provider
    if (!props.historyProvider) {
      return
    }

    // get caret position
    const caret = input.value.selectionStart
    const atStart = (caret === 0)
    const atEnd = (caret === prompt.value.length)
    
    // when in the middle, we need shift
    if (!atStart /*&& !atEnd*/ && !event.shiftKey) {
      return
    }

    // get messages
    const history = props.historyProvider(event)
    if (!history?.length) {
      return
    }

    // now navigate
    let newPrompt = null
    const index = history.findIndex((m: string) => m === prompt.value)
    if (event.key === 'ArrowUp') {
      if (index === -1) {
        draftPrompt = prompt.value
        newPrompt = history[history.length - 1]
      } else if (index > 0) {
        newPrompt = history[index - 1]
      } else {
        // keydown moved caret at beginning
        // so move it back to the end
        // const length = prompt.value.length;
        // input.value.setSelectionRange(length, length);
      }
    } else {
      if (index >= 0 && index < history.length - 1) {
        newPrompt = history[index + 1]
      } else if (index != -1) {
        newPrompt = draftPrompt
      }
    }

    // update
    if (newPrompt !== null) {
      prompt.value = newPrompt
      nextTick(() => {
        input.value.setSelectionRange(0, 0)
        autoGrow(input.value)
        // if (input.value.scrollTo) {
        //   // no scrollTo while testing
        //   input.value.scrollTo(0, input.value.scrollHeight)
        // }
      })
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  } else if (event.key === '@') {
    if (props.enableExperts && prompt.value === '') {
      onClickExperts()
      event.preventDefault()
      prompt.value = '@'
      return false
    }
  } else if (event.key === '/') {
    if (isMcpAvailable.value && prompt.value === '') {
      onMcpServers()
      prompt.value = '/'
      event.preventDefault()
      return false
    }
  } else if (event.key === '#') {
    if (props.enableCommands && prompt.value === '') {
      onCommands(false)
      prompt.value = '#'
      event.preventDefault()
      return false
    }
  } else if (event.key === 'Backspace') {
    if (prompt.value === '') {
      if (++backSpaceHitsWhenEmpty === backSpaceHitsToClearExpert) {
        backSpaceHitsWhenEmpty = 0
        disableExpert()
        disableCommand()
        disableMcpPrompt()
        // Limpar servidor MCP ativo também
        if (activeMcpServer.value) {
          onClickActiveMcpServer()
        }
      }
    } else {
      backSpaceHitsWhenEmpty = 0
    }
  }
}

const onGlobalKeyDown = (event: KeyboardEvent) => {
  const isCommand = !event.shiftKey && !event.altKey && (event.metaKey || event.ctrlKey)
  if (event.key === 't' && isCommand) {
    event.preventDefault()
    event.stopPropagation()
    onDictate()
  }
}

const onKeyUp = (event: KeyboardEvent) => {
  nextTick(() => {
    autoGrow(event.target as HTMLElement)
  })
}

const autoGrow = (element: HTMLElement) => {
  if (element) {
    // reset before calculating
    element.style.height = '0px'
    element.style.height = Math.min(150, element.scrollHeight) + 'px'
    emitEvent('prompt-resize', element.style.height)
  }
}

defineExpose({

  getPrompt: () => prompt.value,
  focus: () => input.value.focus(),

  setExpert,
  setDeepResearch,
  isContextMenuOpen,
  startDictation: onDictate,

  isDeepResearchActive: () => deepResearchActive.value,

  setPrompt: (message: string|Message) => {
    if (message instanceof Message) {
      onSetPrompt(message)
    } else {
      onSetPrompt(new Message('user', message))
    }
  },

  attach: (toAttach: Attachment[]) => {
    for (const attachment of toAttach) {
      attachments.value.push(attachment)
    }
  },

  sendPrompt: () => {
    onSendPrompt()
  },

})

</script>

<style scoped>

.prompt, .prompt * {
  font-size: 12pt;
}

.prompt {
  
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border: 1px solid var(--prompt-input-border-color);
  border-radius: 1rem;
  background-color: var(--prompt-input-bg-color);

  &.drag-over {
    border: 1px dashed var(--highlight-color);
  }

  .icon {
    cursor: pointer;
    color: var(--prompt-icon-color);

    &.active {
      fill: var(--highlight-color);
      color: var(--highlight-color);
    }

    &.dictate.active {
      color: red;
    }

  }

  .attachments {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 0.5rem;
    gap: 0.5rem;

    .attachment {
      
      padding: 0.5rem 0.25rem;
      border: 1px solid var(--prompt-input-border-color);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;

      &:has(img) {
        padding: 0.125rem 0.25rem;
      }

      .icon {
        height: 1.25rem !important;
        width: 1.25rem !important;
      }

      img {
        height: 2rem !important;
        width: 2rem !important;
        border-radius: 0.125rem;
        object-fit: cover;
      }

      .title {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .delete {
        padding-left: 0.25rem;
        cursor: pointer;
      }

    }
  }

  .input {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: row;

    .textarea-wrapper {
      flex: 1;
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      align-items: center;
      overflow: hidden;

      .icon.left {
        color: var(--control-placeholder-text-color);
      }

      .icon.left:first-child {
        margin-left: 0.25rem;
      }

      .icon.left.expert {
        position: relative;
        top: 2px;
        cursor: pointer;
        svg {
          height: 12pt;
        }
      }

      .icon.left.command {
        position: relative;
        top: 2px;
        transform: scale(0.9);
      }

      .mcp-server-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.625rem;
        background-color: var(--highlight-color);
        border: 1px solid var(--highlight-color);
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 500;
        color: white;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        margin-left: 0.25rem;
        
        &:hover {
          opacity: 0.9;
        }
        
        &.mcp-active {
          background-color: var(--highlight-color);
        }
        
        .mcp-icon {
          width: 0.875rem;
          height: 0.875rem;
          color: white;
          flex-shrink: 0;
        }
        
        .mcp-name {
          white-space: nowrap;
          line-height: 1;
        }
        
        .mcp-status-indicator {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
          background-color: #10b981;
        }
      }

      .icon.left.loader-wrapper {
        position: relative;
        top: -4px;
        margin-left: 0;
        margin-right: -8px;
        height: 24px;
        display: flex;
        justify-content: center;
        gap: 8px;
        transform: scale(0.5);
        :nth-child(1), :nth-child(3) {
          animation-delay: 250ms;
        }
        .loader {
          background-color: var(--control-placeholder-text-color);
        }
      }

      textarea {
        background-color: var(--prompt-input-bg-color);
        color: var(--prompt-input-text-color);
        border: none;
        resize: none;
        box-sizing: border-box;
        border-radius: 16px;
        overflow-x: hidden;
        overflow-y: auto;
        width: 100%;
      }

      .icon.left + textarea {
        padding-left: 0px;
      }

      textarea::placeholder {
        color: var(--control-placeholder-text-color);
        opacity: 0.5;
      }

      textarea:focus {
        outline: none;
        flex: 1;
      }

      textarea:disabled {
        color: var(--control-placeholder-text-color);
      }

    }

  }

  .actions {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.25rem;
    margin-left: 0.25rem;

    &:not(:has(*)) {
      display: none;
    }
    
    .icon {
      width: 1rem;
      height: 1rem;
    }

    .icon.instructions {
      transform: scaleY(110%);
      margin-top: 1px;
      margin-right: 4px;
    }

    .icon.experts {
      padding-left: 2px;
      padding-right: 2px;
      transform: scaleY(1.05);
    }

    .icon.dictate {
      margin-left: -2px;
    }

    .icon.mcp-prompt {
      &.active {
        fill: var(--highlight-color);
        color: var(--highlight-color);
      }
    }

    .icon.research {
      margin: 0 0.25rem;
      width: auto;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.25rem;
      span {
        font-size: 0.95em;
      }
    }

    .icon.mcp {
      &.active {
        fill: var(--highlight-color);
        color: var(--highlight-color);
      }
    }

    .icon.mcp-prompt {
      &.active {
        fill: var(--highlight-color);
        color: var(--highlight-color);
      }
    }

  }

}

.windows .input, .windows .input .textarea-wrapper textarea {
  border-radius: 0px;
}

::-webkit-scrollbar {
  height: 1rem;
  width: .5rem;
}

::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-color);
  border-color: var(--prompt-input-bg-color);
  border-radius: 9999px;
  border-width: 1px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-color);
}

::-webkit-scrollbar-track {
  background-color: transparent;
  border-radius: 9999px;
}

</style>
