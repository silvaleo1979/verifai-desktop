<template>
  <div class="tab-content">
    <header>
      <div class="title">{{ t('settings.tabs.models') }}</div>
      <BIconTrash class="icon delete" @click="onDeleteCustom" v-if="isCustom" />
    </header>
    <main>
      <div class="master-detail">
        <div class="md-master" v-if="showMaster">
          <div class="md-master-list">
            <div class="md-master-list-item" v-for="engine in engines" :key="engine.id" :class="{ selected: currentEngine == engine.id }" @click="selectEngine(engine)">
              <EngineLogo :engine="engine.id" :grayscale="true" />
              {{ engine.label }}
            </div>
          </div>
        </div>
        <component :is="currentView" class="md-detail" ref="engineSettings" :engine="currentEngine" @createCustom="showCreateCustom"/>
      </div>
      <CreateEngine ref="createEngine" @create="onCreateCustom" />
    </main>
  </div>
</template>

<script setup lang="ts">

import { CustomEngineConfig } from '../types/config'
import { ref, computed, nextTick } from 'vue'
import { store } from '../services/store'
import { t } from '../services/i18n'
import Dialog from '../composables/dialog'
import EngineLogo from '../components/EngineLogo.vue'
import CreateEngine from '../screens/CreateEngine.vue'
import SettingsCustomLLM from './SettingsCustomLLM.vue'
import LlmFactory, { ILlmManager } from '../llms/llm'

type Engine = {
  id: string,
  label: string
}

const llmManager: ILlmManager = LlmFactory.manager(store.config)

const createEngine = ref(null)

// Garantir um único engine custom OpenAI para Bayer
const ensureCustomEngine = (): string => {
  const customIds = Object.keys(store.config.engines).filter(id => llmManager.isCustomEngine(id))
  if (customIds.length) return customIds[0]
  const id = 'bayer'
  store.config.engines[id] = {
    label: 'Bayer',
    api: 'openai',
    baseURL: 'https://chat.int.bayer.com/api/v2',
    apiKey: '',
    models: { chat: [], image: [] },
    model: { chat: '', image: '' }
  } as unknown as CustomEngineConfig
  store.saveSettings()
  return id
}

const currentEngine= ref<string>(ensureCustomEngine())
const engineSettings = ref(null)

const isCustom = computed(() => llmManager.isCustomEngine(currentEngine.value))

const engines = computed(() => {
  const id = ensureCustomEngine()
  return [{ id, label: (store.config.engines[id] as CustomEngineConfig).label }]
})

// Exibir somente o detalhe (um engine)
const showMaster = computed(() => false)

const currentView = computed(() => {
  return SettingsCustomLLM
})

const selectEngine = (engine: Engine) => {
  currentEngine.value = engine.id
  nextTick(() => engineSettings.value.load())
}

const showCreateCustom = (apiSpec?: string) => {
  createEngine.value.show(apiSpec || (currentEngine.value === 'azure' ? 'azure' : 'openai'))
}

const onCreateCustom = (payload: { label: string, api: string, baseURL: string, apiKey: string, deployment: string, apiVersion: string}) => {
  const uuid = 'c' + crypto.randomUUID().replace(/-/g, '')
  store.config.engines[uuid] = {
    label: payload.label,
    api: payload.api,
    baseURL: payload.baseURL,
    apiKey: payload.apiKey,
    deployment: payload.deployment,
    apiVersion: payload.apiVersion,
    models: { chat: [], image: [] },
    model: { chat: '', image: '' }
  }
  store.saveSettings()
  selectEngine({ id: uuid } as Engine)
  nextTick(() => engineSettings.value.loadModels())
}

const onDeleteCustom = () => {
  Dialog.show({
    target: document.querySelector('.settings .plugins'),
    title: t('settings.engines.custom.confirmDelete'),
    text: t('common.confirmation.cannotUndo'),
    confirmButtonText: t('common.delete'),
    showCancelButton: true,
  }).then((result) => {
    if (result.isConfirmed) {
      delete store.config.engines[currentEngine.value]
      selectEngine({ id: llmManager.getChatEngines()[0] } as Engine)
      store.saveSettings()
    }
  })
}

const load = (payload: { engine: string }) => {
  if (payload?.engine) {
    selectEngine({ id: payload.engine } as Engine)
  } else {
    engineSettings.value.load()
  }
}

const save = () => {
}

defineExpose({ load })

</script>

