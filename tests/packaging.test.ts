import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const afterPack = require('../scripts/after-pack.cjs');
const folders: string[] = [];
const fixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reisian-packaging-'));
  folders.push(dir);
  return dir;
};
afterEach(async () => {
  await Promise.all(folders.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('scoped packaged executable cleanup', () => {
  it.each([
    {
      platform: 'linux',
      finished: 'reisian',
      original: 'electron',
      partials: ['.electron.3G4uVv', '.electron.3G4uVv.Wi5zT9', '.reisian.3XejUy'],
    },
    {
      platform: 'win32',
      finished: 'Reisian.exe',
      original: 'electron.exe',
      partials: ['.electron.exe.UtIFLg', '.electron.exe.UtIFLg.c87XjU', '.Reisian.exe.uXZfMk'],
    },
  ])(
    'removes only ordinary generated copies on $platform',
    async ({ platform, finished, original, partials }) => {
      const dir = await fixture();
      for (const name of [
        finished,
        original,
        ...partials,
        'resources.pak',
        'library.dll',
        '.unrelated',
        '.electron.log',
      ])
        await writeFile(join(dir, name), name);
      await mkdir(join(dir, 'resources'));
      await writeFile(join(dir, 'resources', original), 'nested file');
      await afterPack({ electronPlatformName: platform, appOutDir: dir });
      expect((await readdir(dir)).sort()).toEqual(
        [
          '.electron.log',
          '.unrelated',
          finished,
          'library.dll',
          'resources',
          'resources.pak',
        ].sort(),
      );
      expect(await readFile(join(dir, finished), 'utf8')).toBe(finished);
      expect(await readFile(join(dir, 'resources', original), 'utf8')).toBe('nested file');
    },
  );
  it('preserves candidate directories and symlinks, including dangling symlinks', async () => {
    const dir = await fixture();
    await writeFile(join(dir, 'reisian'), 'finished');
    await writeFile(join(dir, 'preserved'), 'target');
    await mkdir(join(dir, '.electron.Abc123'));
    await writeFile(join(dir, '.electron.Abc123', 'child'), 'nested');
    await symlink(join(dir, 'preserved'), join(dir, 'electron'));
    await symlink(join(dir, 'missing'), join(dir, '.reisian.Def456'));
    await afterPack({ electronPlatformName: 'linux', appOutDir: dir });
    expect((await readdir(dir)).sort()).toEqual(
      ['.electron.Abc123', '.reisian.Def456', 'electron', 'preserved', 'reisian'].sort(),
    );
    expect(await readFile(join(dir, 'preserved'), 'utf8')).toBe('target');
  });
  it.each(['missing', 'empty', 'directory', 'symlink'])(
    'refuses cleanup when the final executable is %s',
    async (kind) => {
      const dir = await fixture();
      await writeFile(join(dir, 'electron'), 'must survive');
      if (kind === 'empty') await writeFile(join(dir, 'reisian'), '');
      if (kind === 'directory') await mkdir(join(dir, 'reisian'));
      if (kind === 'symlink') await symlink(join(dir, 'electron'), join(dir, 'reisian'));
      await expect(afterPack({ electronPlatformName: 'linux', appOutDir: dir })).rejects.toThrow(
        /Refusing packaging cleanup/,
      );
      expect(await readFile(join(dir, 'electron'), 'utf8')).toBe('must survive');
    },
  );
  it('does nothing on unsupported platforms', async () => {
    const dir = await fixture();
    await writeFile(join(dir, 'electron'), 'untouched');
    await afterPack({ electronPlatformName: 'darwin', appOutDir: dir });
    expect(await readdir(dir)).toEqual(['electron']);
  });
});
