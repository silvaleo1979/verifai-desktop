
import { Configuration } from '../types/config'
import { RunCommandParams } from '../types/automation'
import { App, Notification } from 'electron'
import { getCachedText, putCachedText } from '../main/utils'
import { loadSettings } from '../main/config'
import { useI18n, useI18nLlm } from '../main/i18n'
import LlmFactory, { ILlmManager } from '../llms/llm'
import Automator from './automator'
import Automation from './automation'
import * as window from '../main/window'

export const askMeAnythingId = '00000000-0000-0000-0000-000000000000'

export const notEditablePrompts = [
  askMeAnythingId
]

export default class Commander {

  static initCommand = async (app: App, timeout?: number): Promise<void> => {

    // not available in mas
    if (process.mas) {
      window.showMasLimitsDialog()
      return
    }

    // start time
    const startTime = Date.now();

    // localization
    const t = useI18n(app);

    // get selected text
    const automator = new Automator();
    const text = await Automation.grabSelectedText(automator, timeout);

    // error
    if (text == null) {
      try {
        new Notification({
          title: 'VerifAI Assistant',
          body: t('automation.grabError')
        }).show()
      } catch (error) {
        console.error('Error showing notification', error);
      }
      return;
    }

    // notify if no text
    if (text.trim() === '') {
      try {
        new Notification({
          title: 'VerifAI Assistant',
          body: t('automation.commander.emptyText')
        }).show()
        console.log('No text selected');
      } catch (error) {
        console.error('Error showing notification', error);
      }
      return;
    }

    // go on with a cached text id
    const textId = putCachedText(text);
    const sourceApp = await automator.getForemostApp();
    window.openCommandPicker({ textId, sourceApp, startTime });

  }

  execCommand = async (app: App, params: RunCommandParams): Promise<boolean> => {

    // deconstruct
    const { textId, sourceApp, command } = params;
    
    // get text
    const text = getCachedText(textId);

    try {

      // check
      if (!text) {
        console.error('No text to process');
        return false;
      }

      // config
      const config: Configuration = loadSettings(app);
      const llmManager: ILlmManager = LlmFactory.manager(config);

      // extract what we need
      let engine = command.engine || config.commands.engine;
      let model = command.model || config.commands.model;
      if (!engine?.length || !model?.length) {
        ({ engine, model } = llmManager.getChatEngineModel(false));
      }

      // template may be localized
      let template = command.template
      if (!template) {
        const t = useI18nLlm(app);
        template = t(`commands.commands.${command.id}.template`)
      }

      // build prompt
      const prompt = template.replace('{input}', text);

      // build the params
      const promptParams = {
        promptId: putCachedText(prompt),
        sourceApp: sourceApp,
        engine: engine || command.engine,
        model: model || command.model,
        execute: command.id != askMeAnythingId,
        action: params.action || 'default',
        replace: true,
      };
      
      // and open the window
      window.openPromptAnywhere(promptParams);
      return true;

    } catch (error) {
      console.error('Error while executing command', error);
    }

    // done
    return false;

  }

}
