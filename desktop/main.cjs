/**
 * Weave Patterner for the desktop: Electron showing the same app as weave-patterner.com (Weave, Knit and Sew
 * Patterner), built by Vite into dist/ and served from inside the app at app://patterner/. Saved patterns live in the
 * app's own storage, as they do in a browser. Links out (help pages, donating, sharing) open in the usual browser.
 * It can update itself from the GitHub releases, if the person using it agrees (updates.cjs).
 */
const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { autoCheck, checkForUpdates, checkOnLaunch, setAutoCheck } = require('./updates.cjs')

const SCHEME = 'app'
const HOST = 'patterner'
const HOME = `${SCHEME}://${HOST}/`
/** The built site: next to this file in the packaged app, or the repo's dist/ when run from the repo. */
const ROOT = app.isPackaged ? path.join(__dirname, 'dist') : path.join(__dirname, '..', 'dist')

// A standard, secure scheme, so storage, fetch and relative links behave as on a website.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

/** The file for an app:// address: a folder's index.html, and never anything outside the built site. */
function fileFor(url) {
  const { pathname } = new URL(url)
  let rel = decodeURIComponent(pathname)
  if (rel.endsWith('/')) rel += 'index.html'
  const file = path.normalize(path.join(ROOT, rel))
  return file.startsWith(ROOT + path.sep) ? file : null
}

const isOwn = (url) => url.startsWith(HOME)

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    title: 'Weave Patterner',
    backgroundColor: '#fff0f6',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  // Links to other sites open in the browser; new windows of the app itself stay in the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isOwn(url)) return { action: 'allow' }
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (isOwn(url)) return
    e.preventDefault()
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url)
  })
  win.loadURL(HOME)
  return win
}

function menu() {
  const site =
    (page = '') =>
    () =>
      shell.openExternal(`https://weave-patterner.com/${page}`)
  return Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Guides', click: site('guide/') },
        { label: 'Weave Patterner on the web', click: site() },
        { type: 'separator' },
        {
          label: 'Check for updates…',
          click: (_item, win) => checkForUpdates(win ?? BrowserWindow.getAllWindows()[0], { byHand: true }),
        },
        {
          id: 'auto-update',
          label: 'Check for updates automatically',
          type: 'checkbox',
          checked: autoCheck() === true,
          click: (item) => setAutoCheck(item.checked),
        },
        { type: 'separator' },
        {
          label: 'Report a problem',
          click: () => shell.openExternal('https://github.com/steves165/weave-patterner/issues'),
        },
      ],
    },
  ])
}

// One window's worth of app: opening it again brings the existing window forward.
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    protocol.handle(SCHEME, (request) => {
      const file = fileFor(request.url)
      if (!file) return new Response('Not found', { status: 404 })
      return net.fetch(pathToFileURL(file).toString()).catch(() => new Response('Not found', { status: 404 }))
    })
    // The camera, for scanning a drawn-on paper sheet; nothing else is asked for.
    session.defaultSession.setPermissionRequestHandler((wc, permission, done) =>
      done(permission === 'media' && isOwn(wc.getURL())),
    )
    Menu.setApplicationMenu(menu())
    const win = createWindow()
    win.webContents.once('did-finish-load', () =>
      checkOnLaunch(win, (auto) => {
        const item = Menu.getApplicationMenu()?.getMenuItemById('auto-update')
        if (item) item.checked = auto
      }),
    )
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
