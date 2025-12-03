
<template>

  <div class="runs sticky-table-container">
    
    <table>
      <thead>
        <tr>
          <th>{{ t('agent.history.date') }}</th>
          <th>{{ t('agent.history.trigger') }}</th>
          <th>{{ t('agent.history.prompt') }}</th>
          <th>{{ t('agent.history.status') }}</th>
          <th>{{ t('agent.history.duration') }}</th>
          <th class="actions-header">{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="run in [...runs].reverse()" :key="run.id">
          <td>{{ new Date(run.createdAt).toLocaleString() }}</td>
          <td>{{ run.trigger }}</td>
          <td class="prompt-cell">{{ run.prompt }}</td>
          <td>{{ run.status }}</td>
          <td>{{ Math.ceil((run.updatedAt - run.createdAt) / 1000) }} s</td>
          <td class="actions-cell">
            <BIconFileText class="icon view-log" @click="viewLog(run)" :title="t('agent.history.viewLog')" />
            <BIconChatDots class="icon analyze-chat" @click="analyzeInChat(run)" :title="t('agent.history.analyzeInChat')" />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="empty" v-if="runs.length === 0">
      {{ t('agent.history.empty') }}
    </div>

  </div>

</template>

<script setup lang="ts">

import { Agent, AgentRun } from '../types/index';
import { BIconChatDots, BIconFileText } from 'bootstrap-icons-vue'

import { PropType } from 'vue'
import { t } from '../services/i18n'
import { buildLogSummary } from '../services/agent-log-formatter'
import Dialog from '../composables/dialog'

const props = defineProps({
  agent: {
    type: Object as PropType<Agent>,
    required: true
  },
  runs: {
    type: Array as PropType<AgentRun[]>,
    required: true,
  }
})

const emit = defineEmits(['analyze-log'])

const viewLog = (run: AgentRun) => {
  // Mostrar JSON completo do log em um dialog
  Dialog.show({
    title: t('agent.history.log'),
    html: `<pre style="max-height: 400px; overflow: auto; text-align: left;">${JSON.stringify(run, null, 2)}</pre>`,
    confirmButtonText: t('common.ok'),
  })
}

const analyzeInChat = (run: AgentRun) => {
  const summary = buildLogSummary(run, props.agent.name)
  emit('analyze-log', summary)
}

</script>


<style scoped>

.sticky-table-container {
  
  table {

    th, td {
      font-size: 10.5pt !important;
    }

    th {
      font-weight: bold;
    }

  }

  .empty {
    padding-top: 64px;
    text-align: center;
    font-size: 18pt;
    opacity: 0.5;
    font-family: var(--serif-font);
  }

  .actions-header {
    text-align: center;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;

    .icon {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }

      &.view-log {
        color: var(--primary-color);
      }

      &.analyze-chat {
        color: var(--accent-color);
      }
    }
  }

  .prompt-cell {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

}

</style>
