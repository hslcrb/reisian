'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

// Some extraction environments leave executable copy fragments behind. Restrict
// cleanup to the direct output directory and the extractor's six-character
// temporary suffixes; never follow symlinks or recurse into application assets.
module.exports = async function afterPack(context) {
  const platform = context.electronPlatformName;
  const names =
    platform === 'linux'
      ? {
          finished: 'reisian',
          original: 'electron',
          partial: /^\.(?:electron|reisian)\.[A-Za-z0-9]{6}(?:\.[A-Za-z0-9]{6})*$/,
        }
      : platform === 'win32'
        ? {
            finished: 'Reisian.exe',
            original: 'electron.exe',
            partial: /^\.(?:electron|Reisian)\.exe\.[A-Za-z0-9]{6}(?:\.[A-Za-z0-9]{6})*$/,
          }
        : undefined;
  if (!names) return;
  if (typeof context.appOutDir !== 'string' || !context.appOutDir)
    throw new Error('Packaging cleanup requires an application output directory.');
  const finishedPath = path.join(context.appOutDir, names.finished);
  let finished;
  try {
    finished = await fs.lstat(finishedPath);
  } catch {
    throw new Error(
      `Refusing packaging cleanup: finished executable ${names.finished} is missing.`,
    );
  }
  if (!finished.isFile() || finished.size === 0) {
    throw new Error(
      `Refusing packaging cleanup: ${names.finished} must be an ordinary non-empty file.`,
    );
  }
  for (const name of await fs.readdir(context.appOutDir)) {
    if (name !== names.original && !names.partial.test(name)) continue;
    const candidate = path.join(context.appOutDir, name);
    const stat = await fs.lstat(candidate);
    if (stat.isFile()) await fs.unlink(candidate);
  }
};
