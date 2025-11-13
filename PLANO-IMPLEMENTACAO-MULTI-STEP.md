# 📋 Plano de Implementação - Multi-Step Agents

## 🎯 Objetivo
Implementar suporte a **workflows multi-step** na Forja de Agentes, permitindo que agentes executem múltiplas etapas sequenciais com passagem de dados entre elas.

---

## 📊 Análise das Mudanças Necessárias

### **✅ Confirmação: Baseado no Código Real do VerifAI**

Este plano foi criado através de análise direta do código fonte do repositório oficial do VerifAI:

- **Commit de Referência:** `eb27b918` (2 de agosto de 2025)
- **Autor:** Nicolas Bonamy  
- **Repositório:** https://github.com/nbonamy/witsy
- **Método:** Análise direta usando `git show` do commit específico
- **Arquivos analisados:** 30 arquivos modificados (839 inserções, 568 deleções)
- **Verificação:** Código extraído diretamente do repositório upstream

**Todas as mudanças documentadas aqui são baseadas no código real implementado no VerifAI.**

---

## 🔧 Mudanças por Arquivo

### **1. Tipos TypeScript** (`src/types/index.ts`)

#### **Adicionar:**
```typescript
export type AgentStep = {
  prompt: string|null
  tools: string[]|null
  agents: string[]|null
  docrepo: string|null
  structuredOutput?: {
    name: string
    structure: ZodType
  }
  // Campos comentados no código original (para uso futuro):
  // engine: string|null
  // model: string|null
  // modelOpts: LlmModelOpts|null
  // disableStreaming: boolean
  // locale: string|null
  // instructions: string
  // parameters: PluginParameter[]
}
```

**Nota:** Os campos comentados podem ser implementados no futuro para permitir configurações diferentes por step.

#### **Modificar Interface Agent:**
```typescript
export interface Agent {
  id: string
  source: AgentSource  // Já existe no código atual
  createdAt: number
  updatedAt: number
  name: string
  description: string
  type: AgentType
  engine: string|null
  model: string|null
  modelOpts: LlmModelOpts|null
  disableStreaming: boolean
  locale: string|null
  instructions: string
  parameters: PluginParameter[]
  // REMOVER: prompt: string|null
  // ADICIONAR:
  steps: AgentStep[]
  schedule: string|null
  invocationValues: Record<string, string>
  buildPrompt: (step: number, parameters: anyDict) => string|null
  getPreparationDescription?: () => string
  getRunningDescription?: (args: any) => string
  getCompletedDescription?: (args: any, results: any) => string
  getErrorDescription?: (args: any, results: any) => string
}
```

**Nota:** O campo `source: AgentSource` já existe no código atual e deve ser mantido.

---

### **2. Modelo Agent** (`src/models/agent.ts`)

#### **Mudanças Principais:**

1. **Remover campo `prompt`:**
   ```typescript
   // REMOVER esta linha:
   prompt: string|null
   ```

2. **Adicionar campo `steps`:**
   ```typescript
   steps: AgentStep[] = []
   ```

3. **Modificar construtor:**
   ```typescript
   constructor() {
     // ... código existente ...
     // REMOVER: this.prompt = null
     // ADICIONAR:
     this.steps = [{
       prompt: null,
       tools: null,
       agents: [],
       docrepo: null
     }]
   }
   ```

4. **Modificar `fromJson`:**
   ```typescript
   static fromJson(obj: any, ...): Agent {
     // ... código existente ...
     // REMOVER: agent.prompt = obj.prompt ?? null
     // ADICIONAR:
     agent.steps = obj.steps ?? [{
       prompt: obj.prompt ?? null,  // Migração: converter prompt antigo
       tools: obj.tools ?? null,
       agents: obj.agents ?? [],
       docrepo: obj.docrepo ?? null
     }]
   }
   ```

5. **Modificar `buildPrompt`:**
   ```typescript
   // ANTES:
   buildPrompt(parameters: anyDict): string|null {
     if (!this.prompt) return null
     // ...
   }

   // DEPOIS:
   buildPrompt(step: number, parameters: anyDict): string|null {
     if (!this.steps[step] || !this.steps[step].prompt) return null
     const promptInputs = extractPromptInputs(this.steps[step].prompt)
     // ... substituir variáveis ...
     return replacePromptInputs(this.steps[step].prompt, parameters)
   }
   ```

---

### **3. Componente AgentSelector** (`src/screens/AgentSelector.vue`)

**Status:** Precisa ser criado (não existe na versão atual)

Este componente permite selecionar múltiplos agents para cada step.  
**Referência:** Ver commit `eb27b918` para implementação completa.

---

### **4. Editor de Agentes** (`src/agent/Editor.vue`)

#### **Mudanças Principais:**

1. **Adicionar imports:**
   ```typescript
   import AgentSelector from '../screens/AgentSelector.vue'
   import { extractPromptInputs, replacePromptInputs } from '../services/prompt'
   ```

2. **Adicionar estado:**
   ```typescript
   const expandedStep = ref(0)  // Step expandido atualmente
   const toolSelector = ref(null)
   const agentSelector = ref(null)
   ```

3. **Modificar função `steps()`:**
   ```typescript
   // ANTES: Array fixo de steps
   const steps = ['general', 'goal', 'model', 'workflow', 'tools', 'agents', 'invocation']

   // DEPOIS: Função dinâmica
   const steps = (): string[] => {
     const baseSteps = [kStepGeneral, kStepGoal, kStepModel]
     
     // Adicionar settings se necessário
     if (hasStep(kStepSettings)) {
       baseSteps.push(kStepSettings)
     }
     
     baseSteps.push(kStepWorkflow, kStepTools, kStepAgents, kStepInvocation)
     return baseSteps
   }
   ```

4. **Adicionar funções de gerenciamento de steps:**
   ```typescript
   const onAddStep = (index: number) => {
     agent.value.steps.push({
       prompt: index > 1 ? `{{output.${index-1}}}` : '',
       tools: null,
       agents: [],
       docrepo: null
     })
   }

   const onDeleteStep = async (index: number) => {
     const rc = await Dialog.show({
       title: t('agent.create.workflow.confirmDeleteStep'),
       text: t('common.confirmation.cannotUndo'),
       showCancelButton: true,
     })
     if (rc.isConfirmed) {
       agent.value.steps.splice(index, 1)
     }
   }

   const toggleStepExpansion = (index: number) => {
     expandedStep.value = expandedStep.value === index ? -1 : index
   }

   const promptInputs = (step: number) => {
     return extractPromptInputs(agent.value.steps[step].prompt).map((input) => {
       if (input.name.startsWith('output.')) {
         input.description = t('agent.create.workflow.help.outputVarDesc', 
           { step: input.name.split('.')[1] })
       }
       return input
     })
   }
   ```

5. **Modificar template do WizardStep de Workflow:**
   ```vue
   <WizardStep class="workflow" :visible="isStepVisible(kStepWorkflow)" 
               :error="informationError" @prev="onPrevStep" @next="validateWorkflow">
     <template #header>
       <label>{{ t('agent.create.workflow.title') }}</label>
       <div class="help">{{ t('agent.create.workflow.help.title') }}</div>
     </template>
     <template #content>
       <template v-for="(step, index) in agent.steps" :key="index">
         <div class="panel step-panel">
           <div class="panel-header" @click="toggleStepExpansion(index)">
             <BIconCaretDownFill v-if="expandedStep === index" class="icon caret" />
             <BIconCaretRightFill v-else class="icon caret" />
             <label>{{ t('agent.create.workflow.step', { step: index + 1 }) }}</label>
             <BIconTrash class="icon delete" @click.stop="onDeleteStep(index)" 
                         v-if="index > 0 && expandedStep === index"/>
           </div>
           <div v-if="expandedStep === index">
             <div class="form-field">
               <label for="prompt">{{ t('common.prompt') }}</label>
               <textarea v-model="agent.steps[index].prompt"></textarea>
               <div class="help" v-if="index > 0">
                 {{ t('agent.create.workflow.help.connect') }}
               </div>
             </div>
             <div class="form-field" v-if="promptInputs(index).length">
               <!-- Mostrar variáveis de input -->
             </div>
             <div class="step-actions">
               <button class="tools" @click="onToolsStep(index)">
                 {{ t('agent.create.workflow.customTools') }}
               </button>
               <button class="agents" @click="onAgentsStep(index)">
                 {{ t('agent.create.workflow.customAgents') }}
               </button>
             </div>
           </div>
         </div>
         <div class="workflow-arrow" v-if="index < agent.steps.length - 1">
           <BIconThreeDotsVertical />
         </div>
       </template>
     </template>
     <template #buttons>
       <button @click="onAddStep(agent.steps.length+1)">
         {{ t('agent.create.workflow.addStep') }}
       </button>
     </template>
   </WizardStep>
   ```

6. **Adicionar componentes de seleção:**
   ```vue
   <ToolSelector ref="toolSelector" 
                 :tools="agent.steps[expandedStep]?.tools" 
                 @save="onSaveStepTools" />
   <AgentSelector ref="agentSelector" 
                  :exclude-agent-id="agent.id" 
                  @save="onSaveStepAgents" />
   ```

---

### **5. Runner de Agentes** (`src/services/runner.ts`)

#### **Mudanças Principais:**

1. **Modificar método `run()`:**
   ```typescript
   async run(trigger: AgentRunTrigger, prompt?: string, opts?: GenerationOpts): Promise<GenerationResult> {
     // ... código de inicialização ...

     // Array para armazenar outputs de cada step
     const outputs: string[] = []

     // Loop através de todos os steps
     for (let stepIdx = 0; stepIdx < this.agent.steps.length; stepIdx++) {
       const step = this.agent.steps[stepIdx]

       // Construir prompt do step
       let stepPrompt: string
       if (stepIdx === 0) {
         // Primeiro step: usa prompt fornecido ou prompt do step
         stepPrompt = prompt?.trim() || step.prompt || ''
       } else {
         // Steps subsequentes: substitui variáveis output.{n}
         const outputParams = outputs.reduce((acc, output, idx) => {
           acc[`output.${idx + 1}`] = output
           return acc
         }, {} as Record<string, string>)
         stepPrompt = replacePromptInputs(step.prompt || '', outputParams)
       }

       if (!stepPrompt.length) {
         return 'error'
       }

       // Configurar ferramentas para este step
       // ... código de configuração de tools ...

       // Configurar agents para este step
       // ... código de configuração de agents ...

       // Executar geração
       const result = await this.llm.generate(/* ... */)

       // Armazenar output deste step
       if (result && result.content) {
         outputs.push(result.content)
       }

       // Se último step e tem chat, adicionar mensagem
       if (stepIdx === this.agent.steps.length - 1 && opts?.chat) {
         // ... adicionar mensagem ao chat ...
       }
     }

     return 'success'
   }
   ```

---

### **6. Traduções** (`locales/pt.json` e outros)

#### **Adicionar em `agent.create.workflow`:**

```json
{
  "agent": {
    "create": {
      "workflow": {
        "title": "Fluxo de Trabalho",
        "help": {
          "title": "Defina múltiplas etapas para seu agente. Cada etapa pode usar o resultado da etapa anterior através de variáveis {{output.1}}, {{output.2}}, etc.",
          "connect": "Use {{output.1}}, {{output.2}}, etc. para referenciar resultados de etapas anteriores.",
          "outputVarDesc": "Resultado da etapa {step}"
        },
        "step": "Etapa {step}",
        "addStep": "Adicionar Etapa",
        "customTools": "Ferramentas Personalizadas",
        "customAgents": "Agentes Personalizados",
        "confirmDeleteStep": "Tem certeza que deseja excluir esta etapa?",
        "error": {
          "emptyStepPrompt": "A etapa {step} precisa ter um prompt"
        }
      }
    }
  }
}
```

---

### **7. Estilos CSS** (`css/index.css` e `css/panel.css`)

#### **Adicionar estilos para workflow:**

```css
.workflow {
  .step-panel {
    margin-bottom: 1rem;
    
    .panel-header {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      .caret {
        transition: transform 0.2s;
      }
      
      .delete {
        margin-left: auto;
      }
    }
  }
  
  .workflow-arrow {
    text-align: center;
    padding: 0.5rem 0;
    color: var(--faded-text-color);
  }
  
  .step-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    
    button {
      padding: 0.5rem 1rem;
    }
  }
}
```

---

### **8. Migração de Dados**

#### **Script de migração** (executar uma vez):

```typescript
// Migrar agents existentes de prompt único para steps[]
function migrateAgents() {
  const agents = loadAllAgents()
  
  agents.forEach(agent => {
    if (agent.prompt && !agent.steps) {
      agent.steps = [{
        prompt: agent.prompt,
        tools: agent.tools,
        agents: agent.agents || [],
        docrepo: agent.docrepo
      }]
      delete agent.prompt
      saveAgent(agent)
    }
  })
}
```

---

## 📝 Ordem de Implementação Recomendada

1. ✅ **Tipos TypeScript** - Base para tudo
2. ✅ **Modelo Agent** - Estrutura de dados
3. ✅ **Traduções** - Textos da interface
4. ✅ **AgentSelector** - Componente novo
5. ✅ **Editor.vue** - Interface visual
6. ✅ **Runner** - Lógica de execução
7. ✅ **CSS** - Estilos visuais
8. ✅ **Migração** - Converter dados existentes

---

## 🧪 Testes Necessários

1. ✅ Criar agente com múltiplos steps
2. ✅ Executar agente multi-step
3. ✅ Verificar passagem de dados entre steps (output.{n})
4. ✅ Testar remoção de steps
5. ✅ Testar ferramentas personalizadas por step
6. ✅ Testar agents personalizados por step
7. ✅ Migração de agents antigos

---

## 📚 Referências

- **Commit original:** `eb27b918` no repositório upstream
- **Data:** 2 de agosto de 2025
- **Arquivos modificados:** 30 arquivos
- **Linhas adicionadas:** ~839
- **Linhas removidas:** ~568

---

## ⚠️ Pontos de Atenção

1. **Compatibilidade retroativa:** Agents existentes precisam ser migrados
2. **Validação:** Garantir que todos os steps tenham prompt válido
3. **Performance:** Múltiplos steps podem demorar mais para executar
4. **Erros:** Tratamento de erros em cada step individual

