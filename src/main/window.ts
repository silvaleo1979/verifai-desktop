import { dialog, shell } from 'electron';

export * from './windows/index';
export * from './windows/main';
export * from './windows/anywhere';
export * from './windows/commands';
export * from './windows/forge';
export * from './windows/settings';
export * from './windows/readaloud';
export * from './windows/realtime';
export * from './windows/transcribe';
export * from './windows/scratchpad';
export * from './windows/computer';
export * from './windows/studio';
export * from './windows/debug';

export const showMasLimitsDialog = () => {

  const version = process.arch === 'arm64' ? 'Apple Silicon (M1, M2, M3, M4)' : 'Mac Intel architecture';
  const response = dialog.showMessageBoxSync(null, {
    message: 'Este recurso (e muitos outros) não estão disponíveis na versão da Mac App Store do VerifAI. Você pode verificar a versão do site.',
    detail: `Você precisará baixar a versão "${version}".`,
    buttons: ['Fechar', 'Verificar site'],
    defaultId: 1,
  })
  if (response === 1) {
    shell.openExternal(`https://verifai.com.br/${process.arch}`)
  }
}
