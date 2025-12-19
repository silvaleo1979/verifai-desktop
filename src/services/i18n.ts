
import { anyDict, Command, Expert } from '../types/index'
import { createI18n, hasLocalization, allLanguages } from '../main/i18n.base'
import { WritableComputedRef } from 'vue'
import { I18n, Locale } from 'vue-i18n'

let i18n: I18n|null = null
let i18nLlm: I18n|null = null

if (!i18n && typeof window !== 'undefined') {
  const locale = window.api?.config?.localeUI() || 'en-US'
  const messages = window.api?.config?.getI18nMessages()
  i18n = createI18n(messages, locale)
}

if (!i18nLlm && typeof window !== 'undefined') {
  const locale = window.api?.config?.localeLLM() || 'en-US'
  const messages = window.api?.config?.getI18nMessages()
  i18nLlm = createI18n(messages, locale)
}

const localeToLangName = (locale: string): string => {
  const translate = i18nLlm?.global?.t as CallableFunction | undefined
  if (!translate) return locale
  const language = translate(`common.language.${locale}`)
  return language.startsWith('common.language.') ? locale : language
}

const i18nInstructions = (config: anyDict, key: string, params?: any): string => {

  // get instructions
  const instructions = key.split('.').reduce((obj, token) => obj?.[token], config)
  if (typeof instructions === 'string' && (instructions as string)?.length) {
    return instructions
  }

  // default
  // @ts-expect-error not sure why
  const translate = i18nLlm?.global?.t as CallableFunction | undefined
  if (!translate) return key
  return translate(key, params)

}

const getLlmLocale = (): string => {
  const i18nLlmLocale = (i18nLlm?.global?.locale as WritableComputedRef<Locale>) || null
  return i18nLlmLocale?.value ?? 'en-US'
}

const setLlmLocale = (locale: string): void => {
  const i18nLlmLocale = (i18nLlm?.global?.locale as WritableComputedRef<Locale>) || null
  if (i18nLlmLocale) {
    i18nLlmLocale.value = locale
  }
}

const noopT = (key: string) => key
const t: CallableFunction = i18n?.global?.t || noopT
const tllm: CallableFunction = i18nLlm?.global?.t || noopT

type i18nCommandAttr = 'label' | 'template'
type i18nExpertAttr = 'name' | 'prompt'

const commandI18n = (command: Command|null, attr: i18nCommandAttr): string => {
  if (!command) return ''
  if (attr === 'label' && command.label) return command.label
  if (attr === 'template' && command.template) return command.template
  return commandI18nDefault(command, attr)
}

const commandI18nDefault = (command: Command|null, attr: i18nCommandAttr): string => {
  return command ? tllm(`commands.commands.${command.id}.${attr}`) : ''
}

const expertI18n = (expert: Expert|null, attr: i18nExpertAttr): string => {
  if (!expert) return ''
  if (attr === 'name' && expert.name) return expert.name
  if (attr === 'prompt' && expert.prompt) return expert.prompt
  return expertI18nDefault(expert, attr)
}

const expertI18nDefault = (expert: Expert|null, attr: i18nExpertAttr): string => {
  return expert ? tllm(`experts.experts.${expert.id}.${attr}`) : ''
}

export {
  allLanguages,
  i18n as default,
  i18nCommandAttr,
  i18nExpertAttr,
  i18nLlm,
  t,
  tllm,
  getLlmLocale,
  setLlmLocale,
  i18nInstructions,
  localeToLangName,
  hasLocalization,
  commandI18n,
  commandI18nDefault,
  expertI18n,
  expertI18nDefault,
}
