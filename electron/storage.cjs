'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { MAX_PROJECT_BYTES, validateProject } = require('./guards.cjs');

// A sibling temporary file makes rename atomic on the selected filesystem.
// The destination remains intact if writing or flushing the temporary file fails.
async function atomicWrite(destination, data) {
  const temporary = path.join(path.dirname(destination), `.reisian-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(data);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporary, destination);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await fs.unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT')
        console.warn('Could not remove a temporary Reisian file:', error.code);
    });
  }
}

async function readProject(filename) {
  const handle = await fs.open(filename, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error('Choose a regular .reisian project file.');
    if (stat.size > MAX_PROJECT_BYTES) throw new Error('Project exceeds the 10 MB limit.');
    // Read at most one byte beyond the limit, even if another process grows the file.
    const buffer = Buffer.alloc(MAX_PROJECT_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_PROJECT_BYTES) throw new Error('Project exceeds the 10 MB limit.');
    const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length));
    validateProject(content);
    return content;
  } finally {
    await handle.close();
  }
}

function fileError(error) {
  const hints = {
    EACCES: 'Permission denied. Choose a location you can write to.',
    EPERM: 'Permission denied. Check that the file is not locked by another application.',
    ENOSPC: 'The disk is full. Free some space and try again.',
    ENOENT: 'The selected file or folder no longer exists.',
    EISDIR: 'Choose a file, not a folder.',
    EROFS: 'This location is read-only. Choose another folder.',
  };
  return new Error(
    hints[error.code] || error.message || 'The file operation failed. Try another location.',
  );
}
module.exports = { atomicWrite, readProject, fileError };
