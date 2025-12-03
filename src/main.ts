
import process from 'node:process';
import { app, BrowserWindow, dialog, nativeTheme, systemPreferences, Menu, Notification } from 'electron';
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';
import Store from 'electron-store';
import log from 'electron-log/main';
import { EventEmitter } from 'events';

import AutoUpdater from './main/autoupdate';
import Automator from './automations/automator';
import Commander from './automations/commander';
import PromptAnywhere from './automations/anywhere';
import ReadAloud from './automations/readaloud';
import Transcriber from './automations/transcriber';
import DocumentRepository from './rag/docrepo';
import MemoryManager from './main/memory';
import Mcp from './main/mcp';
import TrayIconManager from './main/tray';

import { fixPath } from './main/utils';
import { useI18n } from './main/i18n';
import { installIpc, installLicenseIpc } from './main/ipc';

import * as config from './main/config';
import * as shortcuts from './main/shortcuts';
import * as window from './main/window';
import * as menu from './main/menu';
import * as backup from './main/backup';

let mcp: Mcp = null
const appEvents = new EventEmitter()

// first-thing: single instance
// on darwin/mas this is done through Info.plist (LSMultipleInstancesProhibited)
if (process.platform !== 'darwin' && !process.env.TEST) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    process.exit(0);
  }
}

// changes path
if (process.env.VERIFAI_HOME) {
  app.getPath = (name: string) => `${process.env.VERIFAI_HOME}/${name}`;
}

// set up logging
Object.assign(console, log.functions);
log.eventLogger.startLogging();
console.log('=== VERIFAI STARTING ===');
console.log('Log file:',log.transports.file.getFile().path);
console.log('Platform:', process.platform);
console.log('Environment DEBUG:', process.env.DEBUG);
console.log('Environment VERIFAI_TRIAL:', process.env.VERIFAI_TRIAL);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) {
  console.log('Squirrel startup detected, quitting');
  app.quit();
}

// Catch unhandled errors
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  log.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  log.error('UNHANDLED REJECTION:', reason);
});

// auto-update
const autoUpdater = new AutoUpdater(app, {
  preInstall: () => quitAnyway = true,
  onUpdateAvailable: () => {
    window.notifyBrowserWindows('update-available');
    trayIconManager.install();
  },
});

// store will be initialized in whenReady
let store: Store | null = null;

// this is going to be called later
const installMenu = () => {
  const settings = config.loadSettings(app);
  menu.installMenu(app, {
    quit: app.quit,
    checkForUpdates: autoUpdater.check,
    quickPrompt: PromptAnywhere.open,
    openMain: window.openMainWindow,
    scratchpad: window.openScratchPad,
    settings: window.openSettingsWindow,
    studio: window.openDesignStudioWindow,
    forge: window.openAgentForgeWindow,
    backupExport: async () => await backup.exportBackup(app),
    backupImport: async () => await backup.importBackup(app, quitApp),
  }, settings.shortcuts);
}

// this is going to be called later
const registerShortcuts = () => {
  shortcuts.registerShortcuts(app, {
    prompt: PromptAnywhere.open,
    chat: () => window.openMainWindow({ queryParams: { view: 'chat' } }),
    command: () => Commander.initCommand(app),
    readaloud: () => ReadAloud.read(app),
    transcribe: Transcriber.initTranscription,
    scratchpad: window.openScratchPad,
    realtime: window.openRealtimeChatWindow,
    studio: window.openDesignStudioWindow,
    forge: window.openAgentForgeWindow,
  });
}

// quit at all costs
let quitAnyway = false;
const quitApp = () => {
  quitAnyway = true;
  app.quit();
}

//  tray icon
const trayIconManager = new TrayIconManager(app, autoUpdater, quitApp);

// this needs to be done before onReady
if (process.platform === 'darwin') {
  systemPreferences.setUserDefault('NSDisabledDictationMenuItem', 'boolean', true)
  //systemPreferences.setUserDefault('NSDisabledCharacterPaletteMenuItem', 'boolean', true)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {

  console.log('=== APP READY ===');
  console.log('Platform:', process.platform);
  console.log('DEBUG:', process.env.DEBUG);
  console.log('__IS_TRIAL__:', __IS_TRIAL__);
  console.log('__TRIAL_PERIOD_DAYS__:', __TRIAL_PERIOD_DAYS__);

  // Initialize store now that app is ready
  store = new Store({ name: 'window' });
  window.setStore(store);
  console.log('Store initialized');

  // check if run from app folder
  if (process.platform === 'darwin' && !process.env.DEBUG && !process.env.TEST && !app.isInApplicationsFolder()) {
    dialog.showMessageBox({
      type: 'error',
      message: 'Você precisa executar o VerifAI a partir da pasta Aplicativos. Mova o ícone do aplicativo para lá e tente novamente.',
      detail: 'Se você já moveu o ícone do aplicativo para lá, certifique-se de executar o VerifAI a partir da pasta Aplicativos.',
      buttons: ['OK'],
    });
    quitApp();
    return;
  }

  // trial period
  if (__IS_TRIAL__) {
    const trialStore = new Store({ name: 'trial' });
    const trialStartDate = trialStore.get('startDate') as number;
    
    if (!trialStartDate) {
      trialStore.set('startDate', Date.now());
    } else {
      const days = __TRIAL_PERIOD_DAYS__;
      const msPerDay = 1000 * 60 * 60 * 24;
      const elapsed = Date.now() - trialStartDate;
      if (elapsed > days * msPerDay) {
        await dialog.showMessageBox({
          type: 'error',
          message: 'Período de teste expirado',
          detail: `Seu período de teste de ${days} dias expirou. Por favor, adquira a versão completa para continuar usando o VerifAI.`,
          buttons: ['OK'],
        });
        quitApp();
        return;
      }
    }
  }

  // install license IPC handlers early (needed for license activation window)
  installLicenseIpc(appEvents);

  // we need settings loaded first for any window
  const settings = config.loadSettings(app);

  // error
  if (config.settingsFileHadError()) {
    const t = useI18n(app)
    dialog.showMessageBox({
      type: 'error',
      message: t('settings.load.error.title'),
      detail: t('settings.load.error.text'),
    })
  }

  // proxy
  if (settings.general.proxyMode === 'bypass') {
    app.commandLine.appendSwitch('no-proxy-server');
  } else if (settings.general.proxyMode === 'custom' && settings.general.customProxy?.length) {
    app.commandLine.appendSwitch('proxy-server', settings.general.customProxy);
  }

  // debugging
  if (process.env.DEBUG) {
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error while installing Extension: ', err));
  }

  // set theme
  nativeTheme.themeSource = settings.appearance.theme;

  // install the menu
  window.addWindowListener({
    onWindowCreated: () => setTimeout(installMenu, 500), 
    onWindowFocused: () => setTimeout(installMenu, 500), 
    onWindowTitleChanged: () => setTimeout(installMenu, 500), 
    onWindowClosed: () => setTimeout(installMenu, 500), 
  });
  installMenu();

  // register shortcuts
  registerShortcuts();

  // license check - now that basic setup is done
  console.log('Starting license check, __IS_TRIAL__:', __IS_TRIAL__);
  if (!__IS_TRIAL__) {
    // Only check license if NOT in trial mode
    console.log('Checking license...');
    const LicenseManager = (await import('./main/license')).default;
    console.log('LicenseManager imported');
    const licenseValid = await LicenseManager.checkLicenseBlocking();
    
    console.log('License check result:', licenseValid);
    
    if (licenseValid === false) {
      console.log('License invalid or missing - opening activation window');
      // License check failed and user wants to activate
      // Show activation window
      const { openLicenseActivationWindow } = await import('./main/window');
      console.log('openLicenseActivationWindow imported');
      const activationWindow = openLicenseActivationWindow();
      console.log('Activation window opened:', activationWindow?.id);
      
      // Wait for license activation before continuing
      await new Promise<void>((resolve) => {
        console.log('Waiting for license-activated event...');
        appEvents.once('license-activated', () => {
          console.log('License activated, continuing app initialization');
          resolve();
        });
      });
    } else {
      console.log('License valid, continuing with app initialization');
    }
  } else {
    console.log('Trial mode enabled, skipping license check');
  }

  // start mcp
  if (!process.mas) {
    await fixPath()
    mcp = new Mcp(app);
    mcp.connect();
  }

  // create the main window
  if (!settings.general.hideOnStartup || process.env.TEST) {
    log.info('Creating initial main window');
    window.openMainWindow({ queryParams: { view: 'chat'} });
  } else {
    app.dock?.hide();
  }

  // on config change
  config.setOnSettingsChange(() => {

    console.log('Settings changed');

    // notify browser windows
    window.notifyBrowserWindows('file-modified', 'settings');

    // update tray icon
    trayIconManager.install();

    // update main menu
    installMenu();

  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (window.areAllWindowsClosed()) {
      window.openMainWindow();
    }
  });

  // tray icon
  trayIconManager.install();

  // request notification permission
  new Notification();

  // create the document repository
  const docRepo = new DocumentRepository(app);

  // create the memory manager
  const memoryManager = new MemoryManager(app);

  // some platforms have a one-time automator initialization to do so give them a chance
  new Automator();

  // install IPC handlers
  installIpc(store, autoUpdater, docRepo, memoryManager, mcp, installMenu, registerShortcuts, quitApp, appEvents);

  // we want some windows to be as fast as possible
  if (!process.env.TEST) {
    window.prepareMainWindow();
    window.preparePromptAnywhere();
    window.prepareCommandPicker();
  }
  
});

// called when the app is already running
app.on('second-instance', () => {
  window.openMainWindow();
});

//
app.on('before-quit', (ev) => {

  const closeAllWindows = () => {

    // close all windows
    BrowserWindow.getAllWindows().forEach((win) => {
      win.removeAllListeners('close');
      win.close();
    });

    // clean up when debugging (vscode restarts the app)
    if (process.env.DEBUG) {
      trayIconManager.destroy();
      shortcuts.unregisterShortcuts();
    }

  }

  // if force quit
  if (/*process.env.DEBUG ||*/ process.env.TEST || quitAnyway) {
    closeAllWindows();
    return;
  }

  // check settings
  const settings = config.loadSettings(app);
  if (!settings.general.keepRunning) {
    closeAllWindows();
    return;
  }

  // close all windows but do not quit
  BrowserWindow.getAllWindows().forEach((win) => win.close());
  ev.preventDefault();

});

// real quit
app.on('will-quit', () => {
  try { Menu.setApplicationMenu(null)  } catch { /* empty */ }
  try { trayIconManager.destroy();  } catch { /* empty */ }
  try { shortcuts.unregisterShortcuts(); } catch { /* empty */ }
  try { mcp?.shutdown(); } catch { /* empty */ }
})

// vscode debugging
app.on('render-process-gone', () => {
  quitAnyway = true;
  app.quit();
})
