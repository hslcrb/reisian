import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, rm, writeFile, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { atomicWrite, readProject, fileError } = require('../electron/storage.cjs');
const folders: string[] = [];
const folder = async () => {
  const name = await mkdtemp(join(tmpdir(), 'reisian-test-'));
  folders.push(name);
  return name;
};
afterEach(async () => {
  await Promise.all(folders.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
describe('native file transactions', () => {
  it('replaces the selected file atomically and cleans the sibling temporary file', async () => {
    const dir = await folder();
    const target = join(dir, 'test.reisian');
    await writeFile(target, 'original');
    await atomicWrite(target, 'replacement');
    expect(await readFile(target, 'utf8')).toBe('replacement');
    expect(await readdir(dir)).toEqual(['test.reisian']);
  });
  it('preserves existing destination when a write fails and removes temporary files', async () => {
    const dir = await folder();
    const target = join(dir, 'test.reisian');
    await writeFile(target, 'original');
    await expect(atomicWrite(target, { invalid: true })).rejects.toThrow();
    expect(await readFile(target, 'utf8')).toBe('original');
    expect(await readdir(dir)).toEqual(['test.reisian']);
  });
  it('rejects oversized, non-UTF8 and malformed imports before returning content', async () => {
    const dir = await folder();
    const target = join(dir, 'test.reisian');
    await writeFile(target, 'null');
    await expect(readProject(target)).rejects.toThrow(/malformed/);
    await writeFile(target, Buffer.from([0xff, 0xfe]));
    await expect(readProject(target)).rejects.toThrow();
    await truncate(target, 10 * 1024 * 1024 + 1);
    await expect(readProject(target)).rejects.toThrow(/10 MB/);
  });
  it('makes disk and permission failures actionable', () => {
    expect(fileError({ code: 'ENOSPC' }).message).toMatch(/disk is full/);
    expect(fileError({ code: 'EACCES' }).message).toMatch(/Permission denied/);
  });
});
