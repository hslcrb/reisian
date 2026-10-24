import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.REISIAN_DEV_PORT || 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('REISIAN_DEV_PORT must be a port between 1024 and 65535.');
let server;
let desktop;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (desktop?.pid && desktop.exitCode === null && desktop.signalCode === null) {
    const exited = new Promise(resolve => desktop.once('exit', resolve));
    desktop.kill('SIGTERM');
    const timeout = setTimeout(() => desktop.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timeout);
  }
  await server?.close();
  process.exitCode = code;
}
process.on('SIGINT', () => void stop(130));
process.on('SIGTERM', () => void stop(143));
try {
  server = await createServer({ root, server: { host: '127.0.0.1', port, strictPort: true, open: false } });
  await server.listen();
  server.printUrls();
  const env = { ...process.env, REISIAN_DEV_URL: `http://127.0.0.1:${port}/` };
  delete env.ELECTRON_RUN_AS_NODE;
  desktop = spawn(require('electron'), [root], { cwd: root, stdio: 'inherit', env });
  desktop.once('error', error => { console.error(error.message); void stop(1); });
  desktop.once('exit', (code, signal) => { void stop(code ?? (signal ? 1 : 0)); });
} catch (error) {
  console.error('Could not start the desktop development session:', error.message);
  await stop(1);
}
