'use strict';
const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const JSZip = require('jszip');
const { assertSender, safeName, validateProject, validateExport } = require('./guards.cjs');
const { atomicWrite, readProject, fileError } = require('./storage.cjs');

const distribution = path.resolve(__dirname, '../dist');
let mainWindow;
let pendingFileOperation = false;

function developmentURL() {
  if (app.isPackaged || !process.env.REISIAN_DEV_URL) return undefined;
  const url = new URL(process.env.REISIAN_DEV_URL);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('REISIAN_DEV_URL must be an explicit http://127.0.0.1:PORT/ address.');
  }
  return url.href;
}
const devURL = developmentURL();
const rendererURL = devURL || pathToFileURL(path.join(distribution, 'index.html')).href;

function allowedResource(raw) {
  try {
    const url = new URL(raw);
    if (['data:', 'blob:', 'about:'].includes(url.protocol)) return true;
    if (devURL) {
      const origin = new URL(devURL);
      return (
        ['http:', 'ws:'].includes(url.protocol) &&
        url.hostname === origin.hostname &&
        url.port === origin.port &&
        !url.username &&
        !url.password
      );
    }
    if (url.protocol !== 'file:') return false;
    const relative = path.relative(distribution, fileURLToPath(url));
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

function installIPC() {
  const handle = (channel, action) =>
    ipcMain.handle(channel, async (event, ...args) => {
      assertSender(event, mainWindow?.webContents, rendererURL);
      if (pendingFileOperation)
        throw new Error('Finish the open file dialog before starting another file operation.');
      pendingFileOperation = true;
      try {
        return await action(...args);
      } catch (error) {
        throw fileError(error);
      } finally {
        pendingFileOperation = false;
      }
    });
  handle('reisian:save-project', async (content, name) => {
    validateProject(content);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Reisian project',
      defaultPath: `${safeName(name)}.reisian`,
      filters: [{ name: 'Reisian project', extensions: ['reisian'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await atomicWrite(result.filePath, content);
    return { canceled: false, filePath: result.filePath };
  });
  handle('reisian:open-project', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Reisian project',
      filters: [{ name: 'Reisian project', extensions: ['reisian'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const filePath = result.filePaths[0];
    return { canceled: false, content: await readProject(filePath), filePath };
  });
  handle('reisian:export-site', async (files, name) => {
    validateExport(files);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export independent website',
      defaultPath: `${safeName(name, 'Reisian website')}.zip`,
      filters: [{ name: 'Website ZIP archive', extensions: ['zip'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const zip = new JSZip();
    for (const file of files) zip.file(file.path, file.content);
    const archive = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    await atomicWrite(result.filePath, archive);
    return { canceled: false, filePath: result.filePath };
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(distribution, 'brand/reisian-app.png'),
    title: 'Reisian',
    width: 1512,
    height: 982,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#F4F1EA',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: !app.isPackaged,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame || !['about:srcdoc', 'about:blank'].includes(event.url))
      event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.on('will-prevent-unload', (event) => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
  await mainWindow.loadURL(rendererURL);
}

app
  .whenReady()
  .then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.on('will-download', (event) => event.preventDefault());
    session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
      callback({ cancel: !allowedResource(details.url) }),
    );
    installIPC();
    await createWindow();
    app.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) createWindow().catch(fatal);
    });
  })
  .catch(fatal);
function fatal(error) {
  console.error('Reisian could not start:', error.message);
  dialog.showErrorBox('Reisian could not start', error.message);
  app.quit();
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
