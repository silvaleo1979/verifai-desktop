<template>
  <div class="ui-resource-container" ref="containerRef">
    <div class="ui-resource-header">
      <span class="ui-resource-title" v-if="resourceTitle">{{ resourceTitle }}</span>
      <span class="ui-resource-title" v-else>Widget MCP-UI</span>
      <div class="ui-resource-actions">
        <button 
          class="btn-download" 
          @click="onDownload"
          title="Baixar widget como HTML"
        >
          📥
        </button>
        <button 
          class="btn-fullscreen" 
          @click="toggleFullscreen"
          :title="isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'"
        >
          {{ isFullscreen ? '⤓' : '⤢' }}
        </button>
      </div>
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
  
  <!-- Modal Fullscreen -->
  <Teleport to="body">
    <div 
      v-if="isFullscreen" 
      class="ui-resource-fullscreen-overlay"
      @click="toggleFullscreen"
    >
      <div class="ui-resource-fullscreen-container" @click.stop>
        <div class="ui-resource-fullscreen-header">
          <span class="ui-resource-fullscreen-title">{{ resourceTitle }}</span>
          <div class="ui-resource-fullscreen-actions">
            <button 
              class="btn-download-fullscreen" 
              @click="onDownload"
              title="Baixar widget como HTML"
            >
              📥
            </button>
            <button 
              class="btn-close-fullscreen" 
              @click="toggleFullscreen"
              title="Fechar tela cheia"
            >
              ✕
            </button>
          </div>
        </div>
        <div class="ui-resource-fullscreen-frame">
          <iframe
            ref="fullscreenIframeRef"
            :srcdoc="htmlContent"
            :sandbox="sandboxAttributes"
            class="ui-resource-fullscreen-iframe"
            @load="onFullscreenFrameLoad"
          ></iframe>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, PropType, nextTick } from 'vue'

const props = defineProps({
  resource: {
    type: Object as PropType<any>,
    required: true,
  },
})

const emits = defineEmits(['ui-action'])

const containerRef = ref<HTMLElement | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)
const isFullscreen = ref(false)
const fullscreenIframeRef = ref<HTMLIFrameElement | null>(null)

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

const toggleFullscreen = async () => {
  isFullscreen.value = !isFullscreen.value
  
  if (isFullscreen.value) {
    // Enter fullscreen
    document.body.style.overflow = 'hidden'
    await nextTick()
    
    // Send initial data to fullscreen iframe
    if (fullscreenIframeRef.value?.contentWindow) {
      const meta = props.resource._meta
      const initialData = meta?.['mcpui.dev/ui-initial-render-data']
      
      if (initialData) {
        fullscreenIframeRef.value.contentWindow.postMessage({
          type: 'mcpui:render',
          data: initialData,
        }, '*')
      }
    }
  } else {
    // Exit fullscreen
    document.body.style.overflow = ''
  }
}

const onDownload = () => {
  try {
    // Create a complete HTML document with the widget content
    const fullHtmlContent = createDownloadableHTML()
    
    // Create blob and download
    const blob = new Blob([fullHtmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const a = document.createElement('a')
    a.href = url
    a.download = generateDownloadFilename()
    a.click()
    
    // Cleanup
    URL.revokeObjectURL(url)
    
    console.log('Widget downloaded successfully')
  } catch (error) {
    console.error('Error downloading widget:', error)
  }
}

const createDownloadableHTML = () => {
  const title = props.resource._meta?.title || 'Widget MCP-UI'
  const widgetContent = props.resource.text || (props.resource.blob ? atob(props.resource.blob) : '')
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 1rem;
            background: #f8f9fa;
        }
        
        .widget-container {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .widget-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #e9ecef;
        }
        
        .widget-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        
        .download-info {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            color: #1976d2;
        }
        
        .download-info strong {
            font-weight: 600;
        }
        
        .widget-content {
            /* Preserve original widget styles */
        }
    </style>
</head>
<body>
    <div class="widget-container">
        <div class="widget-header">
            <h1 class="widget-title">${title}</h1>
        </div>
        
        <div class="download-info">
            <strong>Widget MCP-UI Exportado</strong><br>
            Este widget foi exportado do VerifAI Desktop em ${new Date().toLocaleString('pt-BR')}.<br>
            <em>Nota: Algumas funcionalidades interativas podem não funcionar fora do ambiente VerifAI.</em>
        </div>
        
        <div class="widget-content">
            ${widgetContent}
        </div>
    </div>
</body>
</html>`
}

const generateDownloadFilename = () => {
  const title = props.resource._meta?.title || 'widget'
  const timestamp = new Date().toISOString().split('T')[0]
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
  
  return `${sanitizedTitle}-${timestamp}.html`
}

const onFullscreenFrameLoad = () => {
  if (!fullscreenIframeRef.value?.contentWindow) return
  
  const meta = props.resource._meta
  const initialData = meta?.['mcpui.dev/ui-initial-render-data']
  
  if (initialData) {
    fullscreenIframeRef.value.contentWindow.postMessage({
      type: 'mcpui:render',
      data: initialData,
    }, '*')
  }
}

const handleIframeMessage = (event: MessageEvent) => {
  // Handle messages from the iframe
  if (event.data?.type === 'mcpui:action') {
    console.log('UI Action received:', event.data)
    // Emit event for parent components to handle
    emits('ui-action', event.data)
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('message', handleIframeMessage)
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--ui-resource-header-bg, rgba(0, 0, 0, 0.03));
  border-bottom: 1px solid var(--ui-resource-border-color, #dee2e6);
}

.ui-resource-title {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--ui-resource-title-color, #333);
}

.ui-resource-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-download,
.btn-fullscreen {
  background: none;
  border: 1px solid var(--ui-resource-border-color, #dee2e6);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--ui-resource-title-color, #333);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-download:hover,
.btn-fullscreen:hover {
  background-color: var(--ui-resource-border-color, #dee2e6);
}

.btn-download {
  border-color: #28a745;
  color: #28a745;
}

.btn-download:hover {
  background-color: #28a745;
  color: white;
}

.ui-resource-frame {
  position: relative;
  width: 100%;
}

.ui-resource-frame iframe {
  display: block;
  background: white;
}

/* Fullscreen Modal Styles */
.ui-resource-fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.ui-resource-fullscreen-container {
  background: white;
  border-radius: 8px;
  width: 100%;
  height: 100%;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.ui-resource-fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  flex-shrink: 0;
}

.ui-resource-fullscreen-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #333;
}

.ui-resource-fullscreen-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-download-fullscreen,
.btn-close-fullscreen {
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #666;
  transition: all 0.2s;
}

.btn-download-fullscreen {
  border-color: #28a745;
  color: #28a745;
}

.btn-download-fullscreen:hover {
  background-color: #28a745;
  color: white;
}

.btn-close-fullscreen:hover {
  background-color: #e9ecef;
  color: #333;
}

.ui-resource-fullscreen-frame {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.ui-resource-fullscreen-iframe {
  width: 100%;
  height: 100%;
  border: none;
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
  
  .btn-download {
    border-color: #4caf50;
    color: #4caf50;
  }
  
  .btn-download:hover {
    background-color: #4caf50;
    color: white;
  }
  
  .ui-resource-fullscreen-container {
    background: #2d3748;
  }
  
  .ui-resource-fullscreen-header {
    background-color: #4a5568;
    border-bottom-color: #718096;
  }
  
  .ui-resource-fullscreen-title {
    color: #e2e8f0;
  }
  
  .btn-download-fullscreen {
    border-color: #4caf50;
    color: #4caf50;
  }
  
  .btn-download-fullscreen:hover {
    background-color: #4caf50;
    color: white;
  }
  
  .btn-close-fullscreen {
    color: #a0aec0;
  }
  
  .btn-close-fullscreen:hover {
    background-color: #4a5568;
    color: #e2e8f0;
  }
}
</style>


