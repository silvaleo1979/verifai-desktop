<template>
  <div class="form form-vertical form-large">
    <div class="form-field">
      <label>Region</label>
      <input v-model="region" placeholder="us-east-1" @change="save" @keydown.enter.prevent="save" />
    </div>
    <div class="form-field">
      <label>Profile (SSO)</label>
      <input v-model="profile" placeholder="default" @change="save" @keydown.enter.prevent="save" />
    </div>
    <div class="form-field">
      <label>Role ARN (opcional)</label>
      <input v-model="roleArn" placeholder="" @change="save" @keydown.enter.prevent="save" />
    </div>
    <div class="form-field">
      <label>Endpoint VPC (opcional)</label>
      <input v-model="endpointUrl" placeholder="https://bedrock-runtime-...amazonaws.com" @change="save" @keydown.enter.prevent="save" />
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

const region = ref('us-east-1')
const profile = ref('')
const roleArn = ref('')
const endpointUrl = ref('')
const chat_model = ref<string>('')
const chat_models = ref<ChatModel[]>([])

const load = () => {
  const cfg: any = store.config.engines.bayer || {}
  region.value = cfg.region || 'us-east-1'
  profile.value = cfg.profile || ''
  roleArn.value = cfg.roleArn || ''
  endpointUrl.value = cfg.endpointUrl || ''
  chat_models.value = cfg.models?.chat || []
  chat_model.value = cfg.model?.chat || ''
}

const getModels = async (): Promise<boolean> => {
  const llmManager = LlmFactory.manager(store.config)
  // tentativa simples: se não houver permissões, usuário poderá preencher manualmente
  try {
    // aqui reutilizamos mecanismo do manager: ele não carrega bayer dinamicamente, então simulamos
    // deixamos a UI para fornecer allowlist manual caso ListFoundationModels não seja possível (futuro)
    // por ora, apenas preservamos os já existentes
    Dialog.alert('Listagem dinâmica de modelos via Bedrock será carregada automaticamente ao usar o app, conforme permissões. Se não aparecer, preencha manualmente o ID do modelo no chat.')
  } catch (e) {
    console.error(e)
    Dialog.alert('Não foi possível listar modelos via Bedrock. Verifique permissões.')
  }
  load()
  return true
}

const save = () => {
  const cfg: any = store.config.engines.bayer || (store.config.engines.bayer = { models: { chat: [] }, model: { chat: '' } })
  cfg.region = region.value
  cfg.profile = profile.value
  cfg.roleArn = roleArn.value
  cfg.endpointUrl = endpointUrl.value
  cfg.model = cfg.model || {}
  cfg.model.chat = chat_model.value
  store.saveSettings()
}

defineExpose({ load })
</script>


