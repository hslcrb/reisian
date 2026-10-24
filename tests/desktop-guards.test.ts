import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const {
  validateProject,
  validateExport,
  safeName,
  assertSender,
  MAX_PROJECT_BYTES,
} = require('../electron/guards.cjs');
const project = {
  schemaVersion: 1,
  id: 'p1',
  name: 'Project',
  language: 'en',
  updatedAt: new Date().toISOString(),
  theme: {
    background: '#ffffff',
    text: '#000000',
    accent: '#333333',
    fontPair: 'modern',
    radius: 8,
  },
  pages: [{ id: 'home', name: 'Home', slug: '', title: 'Home', description: '', sections: [] }],
};
describe('native project boundary', () => {
  it('accepts versioned projects and rejects corrupt or excessive input', () => {
    expect(validateProject(JSON.stringify(project))).toEqual(project);
    for (const input of [
      'null',
      '[]',
      '{',
      JSON.stringify({ ...project, schemaVersion: 2 }),
      ' '.repeat(MAX_PROJECT_BYTES + 1),
    ])
      expect(() => validateProject(input)).toThrow();
  });
  it('rejects duplicate pages and malformed nested sections', () => {
    expect(() =>
      validateProject(JSON.stringify({ ...project, pages: [project.pages[0], project.pages[0]] })),
    ).toThrow(/page/);
    expect(() =>
      validateProject(
        JSON.stringify({
          ...project,
          pages: [{ ...project.pages[0], sections: [{ kind: 'hero' }] }],
        }),
      ),
    ).toThrow(/section/);
  });
});
describe('native export boundary', () => {
  const index = { path: 'index.html', content: '<!doctype html>' };
  it('accepts nested independent site assets', () =>
    expect(
      validateExport([index, { path: 'assets/main.js', content: '/* local */' }]),
    ).toHaveLength(2));
  it.each([
    '../escape',
    '/tmp/escape',
    'C:/escape',
    'assets\\escape',
    'a/./b',
    'a//b',
    'a/../b',
    'a\u0000b',
    'CON.txt',
    'folder./file',
    '',
  ])('rejects unsafe archive path %j', (path) => {
    expect(() => validateExport([index, { path, content: '' }])).toThrow(/unsafe/);
  });
  it('rejects duplicate, case collision, file-directory collision and oversized collections', () => {
    expect(() => validateExport([index, { ...index, path: 'INDEX.HTML' }])).toThrow(/duplicate/);
    expect(() =>
      validateExport([index, { path: 'asset', content: '' }, { path: 'asset/a', content: '' }]),
    ).toThrow(/conflicting/);
    expect(() => validateExport(Array.from({ length: 513 }, () => index))).toThrow(/512/);
    expect(() =>
      validateExport([{ path: 'index.html', content: 'x'.repeat(40 * 1024 * 1024 + 1) }]),
    ).toThrow(/40 MB/);
  });
});
describe('native window authority and suggested names', () => {
  it('only trusts the expected top-level frame from the application window', () => {
    const frame = { url: 'file:///app/dist/index.html' };
    const webContents = { mainFrame: frame, isDestroyed: () => false };
    expect(() =>
      assertSender({ sender: webContents, senderFrame: frame }, webContents, frame.url),
    ).not.toThrow();
    expect(() =>
      assertSender(
        { sender: webContents, senderFrame: { url: frame.url } },
        webContents,
        frame.url,
      ),
    ).toThrow(/authorized/);
    expect(() => assertSender({ sender: {}, senderFrame: frame }, webContents, frame.url)).toThrow(
      /authorized/,
    );
    expect(() =>
      assertSender({ sender: webContents, senderFrame: frame }, webContents, 'https://example.com'),
    ).toThrow(/authorized/);
  });
  it('sanitizes cross-platform filenames without losing Korean names', () => {
    expect(safeName('../My:site?')).toBe('-My-site-');
    expect(safeName('CON.txt')).toBe('Reisian project');
    expect(safeName('나의 웹사이트')).toBe('나의 웹사이트');
    expect(safeName('')).toBe('Reisian project');
  });
});
