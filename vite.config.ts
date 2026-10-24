import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [
    react(),
    {
      name: 'reisian-runtime-csp',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          // srcdoc inherits its parent's CSP. Authorize only the exact shared runtime.
          const source =
            readFileSync(new URL('./src/runtime/site-runtime.js', import.meta.url), 'utf8').replace(
              'export function mountSite()',
              'function mountSite()',
            ) + '\nmountSite();';
          const hash = createHash('sha256').update(source).digest('base64');
          const scripts =
            command === 'serve'
              ? "script-src 'self' 'unsafe-inline';"
              : `script-src 'self' 'sha256-${hash}';`;
          return html.replace("script-src 'self';", scripts);
        },
      },
    },
  ],
  optimizeDeps: { include: ['jszip'] },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/release/**', '**/test-results/**', '**/playwright-report/**'] },
  },
  build: { target: 'es2022' },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
