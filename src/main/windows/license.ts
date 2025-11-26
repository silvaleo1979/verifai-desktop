
import { app, BrowserWindow } from 'electron';
import { createWindow, getCenteredCoordinates } from './index';

let licenseActivationWindow: BrowserWindow = null;

export const openLicenseActivationWindow = (): BrowserWindow => {

  if (licenseActivationWindow !== null) {
    console.log('License activation window already open');
    licenseActivationWindow.focus();
    return licenseActivationWindow;
  }

  // Ensure dock is visible on macOS
  if (process.platform === 'darwin') {
    app.dock.show();
  }

  const coords = getCenteredCoordinates(600, 700);

  console.log('Creating license activation window at', coords);

  licenseActivationWindow = createWindow({
    hash: '/license',
    parent: null,
    modal: false,
    x: coords.x,
    y: coords.y,
    width: 600,
    height: 700,
    minWidth: 500,
    minHeight: 600,
    maxWidth: 800,
    maxHeight: 900,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Activate License - VerifAI',
    show: false,
    showInDock: true,
  });

  // Log when page finishes loading
  licenseActivationWindow.webContents.on('did-finish-load', () => {
    console.log('License window finished loading');
  });

  // Log any loading errors
  licenseActivationWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('License window failed to load:', errorCode, errorDescription);
  });

  // Enable dev tools temporarily to debug
  if (process.env.DEBUG) {
    licenseActivationWindow.webContents.openDevTools();
  }

  licenseActivationWindow.once('ready-to-show', () => {
    console.log('License activation window ready to show');
    if (licenseActivationWindow) {
      licenseActivationWindow.show();
    }
  });

  // Fallback: show window after 2 seconds if ready-to-show hasn't fired
  setTimeout(() => {
    if (licenseActivationWindow && !licenseActivationWindow.isVisible()) {
      console.log('Forcing license activation window to show (fallback)');
      licenseActivationWindow.show();
    }
  }, 2000);

  licenseActivationWindow.on('closed', () => {
    console.log('License activation window closed');
    licenseActivationWindow = null;
  });

  console.log('License activation window created, waiting for ready-to-show');
  return licenseActivationWindow;
};

export const closeLicenseActivationWindow = (): void => {
  if (licenseActivationWindow) {
    licenseActivationWindow.close();
    licenseActivationWindow = null;
  }
};
