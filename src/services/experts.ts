
import { Expert } from 'types/index'
import { store } from './store'

export const newExpert = (): Expert => {
  return {
    id: null,
    type: 'user',
    name: 'New expert',
    prompt: '',
    state: 'enabled',
    triggerApps: []
  }
}

export const loadExperts = (): void => {
  try {
    store.experts = window.api.experts.load()
    console.log('✅ Experts loaded from API:', store.experts.length, 'experts')
  } catch (error) {
    console.log('❌ Error loading experts data', error)
    // Fallback to user experts file instead of default experts
    try {
      store.experts = window.api.experts.load()
      console.log('✅ Experts loaded from fallback API:', store.experts.length, 'experts')
    } catch (fallbackError) {
      console.log('❌ Fallback error loading experts data', fallbackError)
      // Only load the 4 specific experts we want
      store.experts = [
        {
          "id": "4521cd8a-74da-47b1-87b4-c7f611314f34",
          "type": "system",
          "state": "enabled",
          "triggerApps": []
        },
        {
          "id": "e70b0fc1-2fcc-4adb-b5c4-06fe3fb66695",
          "type": "system",
          "state": "enabled",
          "triggerApps": []
        },
        {
          "id": "6657124f-7323-4dc4-9fd3-20d47a2286bb",
          "type": "system",
          "state": "enabled",
          "triggerApps": []
        },
        {
          "id": "ceva-export-analyst-2025",
          "type": "system",
          "state": "enabled",
          "triggerApps": []
        }
      ]
      console.log('✅ Experts loaded from hardcoded fallback:', store.experts.length, 'experts')
    }
  }
}

export const saveExperts = (): void => {
  try {
    window.api.experts.save(JSON.parse(JSON.stringify(store.experts)))
  } catch (error) {
    console.log('Error saving experts data', error)
  }
}
