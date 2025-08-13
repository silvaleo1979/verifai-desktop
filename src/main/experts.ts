
import { Expert } from 'types/index'
import { app, App } from 'electron'
import { createI18n } from './i18n.base'
import { getLocaleMessages } from './i18n'
import defaultExperts from '../../defaults/experts.json'
import Monitor from './monitor'
import * as window from './window'
import * as file from './file'
import path from 'path'
import fs from 'fs'

const monitor: Monitor = new Monitor(() => {
  window.notifyBrowserWindows('file-modified', 'experts');
});

export const expertsFilePath = (app: App): string => {
  const userDataPath = app.getPath('userData')
  const expertsFilePath = path.join(userDataPath, 'experts.json')
  return expertsFilePath
}

export const loadExperts = (source: App|string): Expert[] => {

  // init
  let experts: Expert[] = []
  const expertsFile = typeof source === 'string' ? source : expertsFilePath(source)

  console.log('🔍 Backend: Loading experts from file:', expertsFile)

  // read
  try {
    experts = JSON.parse(fs.readFileSync(expertsFile, 'utf-8'))
    console.log('✅ Backend: Loaded', experts.length, 'experts from file')
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log('❌ Backend: Error retrieving experts', error)
    } else {
      console.log('⚠️ Backend: Experts file not found, starting with empty array')
    }
  }

  // migrations can update
  let updated = false

  // i18n migrate label and template
  const t = createI18n(getLocaleMessages(app), 'en', { missingWarn: false }).global.t as CallableFunction
  for (const expert of experts) {
    const key = `experts.experts.${expert.id}`
    if (expert.name === t(`${key}.name`)) {
      delete expert.name
      updated = true
    }
    if (expert.prompt === t(`${key}.prompt`)) {
      delete expert.prompt
      updated = true
    }
  }
  
  // now add new experts (DISABLED - only load user-defined experts)
  console.log('🔍 Backend: Skipping default experts addition (DISABLED)')
  // for (const prompt of defaultExperts) {
  //   const p = experts.find((prt: Expert) => prt.id === prompt.id)
  //   if (p == null) {
  //     experts.push(prompt as Expert)
  //     updated = true
  //   }
  // }

  // delete deprecated experts
  const deprecated = [
    '6e197c43-1074-479b-89d5-3ab8d54ad36b' // doctor
  ]
  for (const id of deprecated) {
    const index = experts.findIndex((expert: Expert) => expert.id === id)
    if (index !== -1) {
      experts.splice(index, 1)
      updated = true
    }
  }

  // save if needed
  if (updated) {
    saveExperts(source, experts)
  }

  // start monitoring
  if (typeof source !== 'string') {
    monitor.start(expertsFile)
  }

  // done
  console.log('✅ Backend: Returning', experts.length, 'experts total')
  return experts

}

export const saveExperts = (dest: App|string, content: Expert[]): void => {
  try {
    const expertsFile = typeof dest === 'string' ? dest : expertsFilePath(dest)
    fs.writeFileSync(expertsFile, JSON.stringify(content, null, 2))
  } catch (error) {
    console.log('Error saving experts', error)
  }
}

export const exportExperts = (app: App) => {

  // pick a directory
  const filepath = file.pickDirectory(app)
  if (!filepath) {
    return false
  }

  // load defaults file content
  const contents = fs.readFileSync(expertsFilePath(app), 'utf-8')

  // write
  const target = path.join(filepath, 'experts.json')
  fs.writeFileSync(target, contents)
  
  // done
  return true

}

export const importExperts = (app: App) => {

  // pick the file
  const filename = file.pickFile(app, { location: true, filters: [{ name: 'JSON', extensions: ['json'] }] })
  if (!filename) {
    return false
  }

  // read and write
  const contents = fs.readFileSync(filename as string, 'utf-8')
  fs.writeFileSync(expertsFilePath(app), contents)

  // done
  return true

}
