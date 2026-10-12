/** Whether this is the desktop app (Electron, desktop/main.cjs), which serves the app from app://patterner/. */
export const DESKTOP = typeof location !== 'undefined' && location.protocol === 'app:'

/** Where to download the desktop app: the latest release's installers. */
export const DESKTOP_DOWNLOAD = 'https://github.com/steves165/weave-patterner/releases/latest'
