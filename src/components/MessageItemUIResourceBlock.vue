<template>
  <div class="ui-resource-container" ref="containerRef">
    <div class="ui-resource-header" v-if="resourceTitle">
      <span class="ui-resource-title">{{ resourceTitle }}</span>
    </div>
    <div class="ui-resource-frame">
      <iframe
        ref="iframeRef"
        :srcdoc="htmlContent"
        :sandbox="sandboxAttributes"
        :style="frameStyle"
        @load="onFrameLoad"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, PropType } from 'vue'

const props = defineProps({
  resource: {
    type: Object as PropType<any>,
    required: true,
  },
})

const containerRef = ref<HTMLElement | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)

const resourceTitle = computed(() => {
  return props.resource._meta?.title || null
})

const htmlContent = computed(() => {
  // If it's HTML content
  if (props.resource.mimeType === 'text/html' && props.resource.text) {
    return props.resource.text
  }
  
  // If it's a blob
  if (props.resource.blob) {
    return atob(props.resource.blob)
  }
  
  // If it's a plain text, wrap it in basic HTML
  if (props.resource.text) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 1rem;
      margin: 0;
    }
  </style>
</head>
<body>${props.resource.text}</body>
</html>`
  }
  
  return '<html><body>No content available</body></html>'
})

const sandboxAttributes = computed(() => {
  // Secure sandbox with minimal permissions
  return 'allow-scripts allow-same-origin'
})

const frameStyle = computed(() => {
  const meta = props.resource._meta
  const preferredSize = meta?.['mcpui.dev/ui-preferred-frame-size']
  
  if (preferredSize && Array.isArray(preferredSize) && preferredSize.length === 2) {
    return {
      width: preferredSize[0],
      height: preferredSize[1],
      border: 'none',
    }
  }
  
  // Default responsive sizing
  return {
    width: '100%',
    height: '400px',
    border: 'none',
  }
})

const onFrameLoad = () => {
  if (!iframeRef.value?.contentWindow) return
  
  const meta = props.resource._meta
  const initialData = meta?.['mcpui.dev/ui-initial-render-data']
  
  // Send initial render data to the iframe if available
  if (initialData) {
    iframeRef.value.contentWindow.postMessage({
      type: 'mcpui:render',
      data: initialData,
    }, '*')
  }
}

const handleIframeMessage = (event: MessageEvent) => {
  // Handle messages from the iframe
  if (event.data?.type === 'mcpui:action') {
    console.log('UI Action received:', event.data)
    // Future: emit event for parent components to handle
    // emits('ui-action', event.data)
  }
}

onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
})
</script>

<style scoped>
.ui-resource-container {
  width: 100%;
  margin: 0.5rem 0 1rem 0;
  background-color: var(--ui-resource-bg-color, #f8f9fa);
  border: 1px solid var(--ui-resource-border-color, #dee2e6);
  border-radius: 8px;
  overflow: hidden;
}

.ui-resource-header {
  padding: 0.75rem 1rem;
  background-color: var(--ui-resource-header-bg, rgba(0, 0, 0, 0.03));
  border-bottom: 1px solid var(--ui-resource-border-color, #dee2e6);
}

.ui-resource-title {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--ui-resource-title-color, #333);
}

.ui-resource-frame {
  position: relative;
  width: 100%;
}

.ui-resource-frame iframe {
  display: block;
  background: white;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .ui-resource-container {
    --ui-resource-bg-color: #2d3748;
    --ui-resource-border-color: #4a5568;
    --ui-resource-header-bg: rgba(255, 255, 255, 0.05);
    --ui-resource-title-color: #e2e8f0;
  }
}
</style>


