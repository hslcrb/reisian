// Print an explicit UTF-8 GitHub Git Trees API payload. This script never writes remotely.
import { readFileSync, lstatSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
const root = process.cwd();
const paths = process.argv.slice(2);
if (!paths.length) throw new Error('Supply explicit repository-relative paths.');
const tree = paths.map((path) => {
  const absolute = resolve(root, path);
  const name = relative(root, absolute).split(sep).join('/');
  if (name.startsWith('../') || name === '..' || name.startsWith('.git/'))
    throw new Error('Path outside source tree.');
  if (!lstatSync(absolute).isFile()) throw new Error('Only ordinary files are supported.');
  const content = readFileSync(absolute, 'utf8');
  if (content.includes('\0') || content.includes('\uFFFD'))
    throw new Error('Use a blob for binary files.');
  return { path: name, mode: '100644', type: 'blob', content };
});
process.stdout.write(JSON.stringify(tree));
