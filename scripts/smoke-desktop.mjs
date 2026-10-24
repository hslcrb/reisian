import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron as electron } from 'playwright';
import JSZip from 'jszip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(path.join(tmpdir(), 'reisian-native-smoke-'));
const env = { ...process.env, REISIAN_DEV_URL: '' };
delete env.ELECTRON_RUN_AS_NODE;
const executablePath = process.env.REISIAN_ELECTRON_EXECUTABLE;
const args = executablePath ? [] : [root];
if (process.env.REISIAN_ELECTRON_HEADLESS === '1') args.unshift('--ozone-platform=headless');
if (process.env.REISIAN_ELECTRON_SOFTWARE_GL === '1') args.unshift('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
if (process.env.REISIAN_ELECTRON_NO_SANDBOX === '1') {
  console.warn('TEST ENVIRONMENT ONLY: Chromium OS sandbox disabled explicitly; production settings are still checked.');
  args.unshift('--no-sandbox');
}
let application;
const checks = [];
const pass = label => { checks.push(label); console.log(`PASS ${label}`); };
try {
  await readFile(path.join(root, 'dist/index.html'));
  application = await electron.launch({ args, executablePath, cwd: root, env, timeout: 30000 });
  const page = await application.firstWindow();
  await page.waitForFunction(() => typeof window.reisian?.saveProject === 'function');
  const isolation = await page.evaluate(() => ({
    bridge: Object.keys(window.reisian).sort(), node: typeof window.require, process: typeof window.process,
  }));
  assert.deepEqual(isolation.bridge, ['exportSite', 'openProject', 'platform', 'saveProject']);
  assert.equal(isolation.node, 'undefined'); assert.equal(isolation.process, 'undefined');
  const preferences = await application.evaluate(({ BrowserWindow }) => {
    const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { sandbox: p.sandbox, contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration, webviewTag: p.webviewTag };
  });
  assert.deepEqual(preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: false });
  pass('isolated renderer, sandbox preference and narrow preload bridge');

  if (process.env.REISIAN_ELECTRON_SOFTWARE_GL === '1') {
    const pixel = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return null;
      gl.clearColor(1, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      const color = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color);
      return Array.from(color);
    });
    assert.deepEqual(pixel, [255, 0, 0, 255]);
    pass('WebGL context renders a verified pixel using software graphics');
  }

  // Stub only native picker results in the main process. The actual IPC, validation,
  // filesystem transaction and ZIP generation run unchanged.
  const project = JSON.stringify({ schemaVersion: 1, id: 'smoke-project', name: 'Native smoke', language: 'en', updatedAt: new Date().toISOString(), theme: { background: '#ffffff', text: '#000000', accent: '#665544', fontPair: 'modern', radius: 4 }, pages: [{ id: 'home', name: 'Home', slug: 'index', title: 'Home', description: '', sections: [] }] });
  const projectPath = path.join(scratch, 'smoke.reisian');
  await application.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, projectPath);
  const saved = await page.evaluate(content => window.reisian.saveProject(content, '../Smoke'), project);
  assert.equal(saved.filePath, projectPath); assert.equal(await readFile(projectPath, 'utf8'), project);
  await application.evaluate(({ dialog }, filePath) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] }); }, projectPath);
  const opened = await page.evaluate(() => window.reisian.openProject());
  assert.equal(opened.content, project); assert.equal(opened.canceled, false);
  pass('project save/open round trip through real native IPC and filesystem');

  await application.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: true }); dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] }); });
  assert.deepEqual(await page.evaluate(content => window.reisian.saveProject(content, 'Canceled'), project), { canceled: true });
  assert.deepEqual(await page.evaluate(() => window.reisian.openProject()), { canceled: true });
  assert.deepEqual(await page.evaluate(() => window.reisian.exportSite([{ path: 'index.html', content: 'hello' }], 'Canceled')), { canceled: true });
  assert.equal(await readFile(projectPath, 'utf8'), project);
  pass('save/open/export cancellation leaves the saved project intact');

  await assert.rejects(page.evaluate(() => window.reisian.saveProject('null', 'Invalid')), /malformed/);
  await assert.rejects(page.evaluate(() => window.reisian.exportSite([{ path: '../escape', content: 'bad' }], 'Invalid')), /unsafe/);
  await writeFile(projectPath, '{broken');
  await application.evaluate(({ dialog }, filePath) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] }); }, projectPath);
  await assert.rejects(page.evaluate(() => window.reisian.openProject()), /valid JSON/);
  pass('malformed imports and archive traversal rejected');

  const zipPath = path.join(scratch, 'website.zip');
  await application.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, zipPath);
  const files = [{ path: 'index.html', content: '<!doctype html><title>Reisian smoke</title>' }, { path: 'assets/site.css', content: 'body{color:#30252d}' }];
  const exported = await page.evaluate(files => window.reisian.exportSite(files, 'Website'), files);
  assert.equal(exported.filePath, zipPath);
  const zip = await JSZip.loadAsync(await readFile(zipPath));
  assert.equal(await zip.file('index.html').async('string'), files[0].content);
  assert.equal(await zip.file('assets/site.css').async('string'), files[1].content);
  pass('ZIP export contains the requested independent site files');

  await application.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, path.join(scratch, 'missing', 'project.reisian'));
  await assert.rejects(page.evaluate(content => window.reisian.saveProject(content, 'Unavailable'), project), /no longer exists/);
  pass('write failure returns an actionable error');

  const initialURL = page.url();
  await page.evaluate(() => { window.open('https://example.com'); location.href = 'https://example.com'; });
  assert.equal(page.url(), initialURL);
  assert.equal(application.windows().length, 1);
  const remote = await page.evaluate(async () => { try { await fetch('https://example.com'); return 'allowed'; } catch { return 'blocked'; } });
  assert.equal(remote, 'blocked');
  pass('external navigation, windows and network requests blocked');
  console.log(`Native smoke passed: ${checks.length} checks. Electron ${await application.evaluate(() => process.versions.electron)}.`);
} finally {
  await application?.close();
  await rm(scratch, { recursive: true, force: true });
}
