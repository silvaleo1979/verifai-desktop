
import { App, autoUpdater, dialog } from 'electron';
import { useI18n } from '../main/i18n'

export default class AutoUpdater {

  app: App
  manualUpdate = false
  downloading = false
  updateAvailable = false

  constructor(app: App, public hooks: {
    onUpdateAvailable: () => void
    preInstall: () => void
  }) {
    this.app = app
    this.initialize();
  }

  private initialize = () => {

    // not available on mas
    if (process.mas) {
      return
    }

    // localization
    const t = useI18n(this.app)

    // basic setup
    const server = 'https://update.electronjs.org'
    const feed = `${server}/nbonamy/witsy/${process.platform}-${process.arch}/${this.app.getVersion()}`
    console.log('Checking for updates at', feed)
    autoUpdater.setFeedURL({ url: feed })

    // error
    autoUpdater.on('error', (error) => {
      console.error('Error while checking for updates', error)
      this.downloading = false
      if (this.manualUpdate) {
        dialog.showErrorBox('Witsy', t('autoupdate.error'))
      } 
    })

    // checking
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates')
    })

    // available
    autoUpdater.on('update-available', () => {
      console.log('Update available. Downloading…')
      this.downloading = true
      if (this.manualUpdate) {
        dialog.showMessageBox({
          type: 'info',
          message: 'Witsy',
          detail: t('autoupdate.available'),
        })
      }
    })

    // not available
    autoUpdater.on('update-not-available', () => {
      if (!this.downloading) {
        console.log('Update not available')
        if (this.manualUpdate) {
          dialog.showMessageBox({
            type: 'info',
            message: 'Witsy',
            detail: t('autoupdate.uptodate'),
          })
        }
      }
    })

    // downloaded
    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
      console.log('Update downloaded', event, releaseNotes, releaseName)
      this.downloading = false
      this.updateAvailable = true
      this.hooks.onUpdateAvailable?.()
    })
      
    // before quit for update
    autoUpdater.on('before-quit-for-update', () => {
      console.log('Before quit update')
      this.hooks.preInstall?.()
    })

    // check now and schedule
    autoUpdater.checkForUpdates()
    setInterval(() => {
      console.log('Scheduled update-check')
      this.manualUpdate = false;
      autoUpdater.checkForUpdates()
    }, 60*60*1000)

    // debug
    // setTimeout(() => {
    //   this.updateAvailable = true;
    //   this.hooks.onUpdateAvailable?.();
    // }, 5000)
  
  }

  check = () => {
    if (this.downloading) {
      const t = useI18n(this.app)
      dialog.showMessageBox({
        type: 'info',
        message: 'Witsy',
        detail: t('autoupdate.downloading'),
      })
    } else {
      this.manualUpdate = true;
      autoUpdater.checkForUpdates()
    }
  }

  install = () => {
    if (this.updateAvailable) {
      console.log('Applying update')
      this.hooks.preInstall?.()
      // https://github.com/electron-userland/electron-builder/issues/3402
      setImmediate(() => autoUpdater.quitAndInstall())
      setTimeout(() => autoUpdater.quitAndInstall(), 5000)
    }
  }

}
