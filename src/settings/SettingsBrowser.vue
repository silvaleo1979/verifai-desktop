<template>
  <div class="form form-vertical form-large">
    <div class="description">
      {{ t('settings.plugins.browser.description') }}
    </div>
    <div class="form-field horizontal">
      <input type="checkbox" name="enabled" v-model="enabled" @change="save" />
      <label>{{ t('common.enabled') }}</label>
    </div>
    <div class="form-field">
      <label>{{ t('settings.plugins.browser.allowedDomains') }}</label>
      <textarea rows="3" v-model="allowedDomainsText" @change="save"></textarea>
    </div>
    <div class="form-field horizontal">
      <input type="checkbox" name="capture" v-model="captureScreenshots" @change="save" />
      <label>{{ t('settings.plugins.browser.captureScreenshots') }}</label>
    </div>
    <div class="form-field horizontal">
      <input type="checkbox" name="headless" v-model="headless" @change="save" />
      <label>{{ t('settings.plugins.browser.headless') }}</label>
    </div>
    <div class="form-field">
      <label>{{ t('settings.plugins.browser.actionTimeout') }}</label>
      <input type="number" min="1000" step="500" v-model.number="actionTimeoutMs" @change="save" />
    </div>
    <div class="form-field">
      <label>{{ t('settings.plugins.browser.maxTextLength') }}</label>
      <input type="number" min="500" step="500" v-model.number="maxTextLength" @change="save" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { store } from '../services/store'
import { t } from '../services/i18n'

const enabled = ref(false)
const allowedDomainsText = ref('')
const captureScreenshots = ref(true)
const headless = ref(false)
const actionTimeoutMs = ref(15000)
const maxTextLength = ref(6000)

const load = () => {
  const cfg = store.config.plugins.browser || {}
  enabled.value = cfg.enabled || false
  allowedDomainsText.value = (cfg.allowedDomains || []).join('\n')
  captureScreenshots.value = cfg.captureScreenshots !== false
  headless.value = cfg.headless || false
  actionTimeoutMs.value = cfg.actionTimeoutMs || 15000
  maxTextLength.value = cfg.maxTextLength || 6000
}

const save = () => {
  const domains = allowedDomainsText.value.split('\n').map(d => d.trim()).filter(Boolean)
  store.config.plugins.browser = {
    enabled: enabled.value,
    allowedDomains: domains,
    captureScreenshots: captureScreenshots.value,
    headless: headless.value,
    actionTimeoutMs: actionTimeoutMs.value,
    maxTextLength: maxTextLength.value || 6000,
  }
  store.saveSettings()
}

defineExpose({ load })
</script>




