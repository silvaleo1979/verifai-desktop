<template>
  <div class="license-activation">
    <div class="license-container">
      <div class="license-header">
        <img src="/logoverifai.svg" alt="VerifAI" class="logo" />
        <h1>{{ t('license.activation.title') }}</h1>
        <p class="subtitle">{{ t('license.activation.subtitle') }}</p>
      </div>

      <div v-if="!activating && !activated" class="license-form">
        <div class="form-group">
          <label for="serial-key">{{ t('license.activation.serialKey') }}</label>
          <input
            id="serial-key"
            v-model="serialKey"
            type="text"
            :placeholder="t('license.activation.serialKeyPlaceholder')"
            class="serial-input"
            :class="{ 'error': error }"
            @input="formatSerialKey"
            @keyup.enter="activate"
            maxlength="29"
            autocomplete="off"
          />
          <p v-if="error" class="error-message">{{ error }}</p>
        </div>

        <button 
          class="btn-primary btn-activate"
          :disabled="!isValidFormat || activating"
          @click="activate"
        >
          {{ t('license.activation.activate') }}
        </button>

        <div class="help-text">
          <p>{{ t('license.activation.help') }}</p>
        </div>
      </div>

      <div v-else-if="activating" class="license-loading">
        <div class="spinner"></div>
        <p>{{ t('license.activation.activating') }}</p>
      </div>

      <div v-else-if="activated" class="license-success">
        <div class="success-icon">✓</div>
        <h2>{{ t('license.activation.success') }}</h2>
        <div class="license-info">
          <p><strong>{{ t('license.activation.product') }}:</strong> {{ licenseData?.product_name }}</p>
          <p><strong>{{ t('license.activation.company') }}:</strong> {{ typeof licenseData?.company === 'object' ? licenseData.company.name : licenseData?.company }}</p>
          <p><strong>{{ t('license.activation.validUntil') }}:</strong> {{ licenseData?.valid_until ? formatDate(licenseData.valid_until) : '' }}</p>
        </div>
        <button class="btn-primary" @click="closeWindow">
          {{ t('license.activation.continue') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const serialKey = ref('');
const activating = ref(false);
const activated = ref(false);
const error = ref('');
const licenseData = ref<any>(null);

const isValidFormat = computed(() => {
  const cleaned = serialKey.value.replace(/-/g, '');
  return cleaned.length === 16;
});

const formatSerialKey = () => {
  // Remove all non-alphanumeric characters
  let cleaned = serialKey.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Limit to 25 characters
  cleaned = cleaned.substring(0, 28);
  
  // Format as XXXX-XXXX-XXXX-XXXX
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.substring(i, i + 4));
  }
  
  serialKey.value = parts.join('-');
  error.value = '';
};

const activate = async () => {
  if (!isValidFormat.value || activating.value) return;
  
  activating.value = true;
  error.value = '';

  
  try {
    const result = await window.api.license.activate(serialKey.value);
    
    if (result.success) {
      activated.value = true;
      licenseData.value = result.data;
      activating.value = false;
    } else {
      error.value = result.message || t('license.activation.error');
      activating.value = false;
    }
  } catch (err: any) {
    console.error('License activation error:', err);
    error.value = err.message || t('license.activation.error');
    activating.value = false;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const closeWindow = () => {
  // Close the license activation window and restart the app
  window.api.license.closeActivationWindow();
};
</script>

<style scoped>
.license-activation {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  /* background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%); */
  background: "#000000";
  padding: 2rem;
}

.license-container {
  background: var(--color-background);
  border-radius: 16px;
  padding: 3rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.license-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
}

.license-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-text-base);
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.license-form {
  margin-top: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text-base);
}

.serial-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-secondary);
  color: var(--color-text-base);
  text-align: center;
  transition: border-color 0.2s;
}

.serial-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.serial-input.error {
  border-color: var(--color-error);
}

.error-message {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.btn-activate {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
}

.help-text {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.help-text p {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.license-loading {
  text-align: center;
  padding: 3rem 0;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1rem;
  border: 4px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.license-success {
  text-align: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: var(--color-success);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
}

.license-success h2 {
  color: var(--color-text-base);
  margin-bottom: 1.5rem;
}

.license-info {
  background: var(--color-background-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: left;
}

.license-info p {
  margin-bottom: 0.75rem;
  color: var(--color-text-base);
}

.license-info p:last-child {
  margin-bottom: 0;
}

.license-info strong {
  color: var(--color-text-muted);
  font-weight: 500;
}
</style>
