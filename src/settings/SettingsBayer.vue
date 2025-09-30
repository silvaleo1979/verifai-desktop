<template>
  <div class="form form-vertical form-large">
  <div class="form-field">
    <label>URL Base da API</label>
    <input v-model="baseURL" placeholder="https://chat.int.bayer.com/api/v2" @change="save" @keydown.enter.prevent="save" />
  </div>
  <div class="form-field">
    <label>Chave de API</label>
    <InputObfuscated v-model="apiKey" @change="save" />
  </div>
    <div class="form-field">
      <label>Modelo de chat</label>
      <div class="form-subgroup">
        <div class="control-group">
          <ModelSelectPlus id="chat" v-model="chat_model" :models="chat_models" :height="280" :disabled="chat_models.length == 0" @change="save" />
          <RefreshButton :on-refresh="getModels" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { store } from '../services/store'
import LlmFactory from '../llms/llm'
import Dialog from '../composables/dialog'
import ModelSelectPlus from '../components/ModelSelectPlus.vue'
import RefreshButton from '../components/RefreshButton.vue'
import { ChatModel, defaultCapabilities } from 'multi-llm-ts'
import InputObfuscated from '../components/InputObfuscated.vue'

const baseURL = ref('https://chat.int.bayer.com/api/v2')
const apiKey = ref('')
const chat_model = ref<string>('')
const chat_models = ref<ChatModel[]>([])

const load = () => {
  const cfg: any = store.config.engines.bayer || {}
  baseURL.value = cfg.baseURL || 'https://chat.int.bayer.com/api/v2'
  chat_models.value = cfg.models?.chat || []
  chat_model.value = cfg.model?.chat || ''
  apiKey.value = cfg.apiKey || ''
}

const getModels = async (): Promise<boolean> => {
  const llmManager = LlmFactory.manager(store.config)
  // tentativa simples: se não houver permissões, usuário poderá preencher manualmente
  try {
    Dialog.alert('Para este ambiente, use um modelo compatível com OpenAI exposto pelo gateway da Bayer. Se a lista não estiver preenchida, digite o ID do modelo manualmente.')
  } catch (e) { console.error(e) }
  load()
  return true
}

const save = () => {
  const cfg: any = store.config.engines.bayer || (store.config.engines.bayer = { models: { chat: [] }, model: { chat: '' } })
  cfg.baseURL = baseURL.value
  cfg.model = cfg.model || {}
  cfg.model.chat = chat_model.value
  cfg.apiKey = apiKey.value
  store.saveSettings()
}

defineExpose({ load })
</script>


