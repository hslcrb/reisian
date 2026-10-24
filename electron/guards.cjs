'use strict';

const MAX_PROJECT_BYTES = 10 * 1024 * 1024;
const MAX_EXPORT_BYTES = 40 * 1024 * 1024;
const MAX_EXPORT_FILES = 512;
const kinds = new Set([
  'hero',
  'text',
  'image',
  'gallery',
  'scene',
  'cards',
  'quote',
  'contact',
  'spacer',
]);
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (message) => {
  throw new Error(message);
};
const string = (value, max = 100000) => typeof value === 'string' && value.length <= max;

function validateProject(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_PROJECT_BYTES) {
    fail('Project must be a JSON document smaller than 10 MB.');
  }
  let project;
  try {
    project = JSON.parse(content);
  } catch {
    fail('This project is not valid JSON.');
  }
  if (
    !plain(project) ||
    project.schemaVersion !== 1 ||
    !string(project.id, 200) ||
    !project.id ||
    !string(project.name, 200) ||
    !['en', 'ko'].includes(project.language) ||
    !string(project.updatedAt, 100) ||
    !plain(project.theme) ||
    !['background', 'text', 'accent'].every((key) => string(project.theme[key], 100)) ||
    !['editorial', 'modern', 'humanist'].includes(project.theme.fontPair) ||
    !Number.isFinite(project.theme.radius) ||
    !Array.isArray(project.pages) ||
    project.pages.length < 1 ||
    project.pages.length > 50
  ) {
    fail('Unsupported or malformed Reisian project.');
  }
  const ids = new Set();
  for (const page of project.pages) {
    if (
      !plain(page) ||
      !['id', 'name', 'slug', 'title', 'description'].every((key) => string(page[key], 10000)) ||
      !page.id ||
      ids.has(page.id) ||
      !Array.isArray(page.sections) ||
      page.sections.length > 200
    ) {
      fail('Project contains an invalid page.');
    }
    ids.add(page.id);
    const sectionIds = new Set();
    for (const section of page.sections) {
      if (
        !plain(section) ||
        !kinds.has(section.kind) ||
        !string(section.id, 200) ||
        !section.id ||
        sectionIds.has(section.id) ||
        ![
          'name',
          'eyebrow',
          'title',
          'body',
          'buttonLabel',
          'buttonHref',
          'image',
          'imageAlt',
          'background',
          'color',
        ].every((key) => string(section[key], key === 'image' ? MAX_PROJECT_BYTES : 100000)) ||
        !['left', 'center', 'right'].includes(section.align) ||
        !Number.isFinite(section.padding) ||
        ![1, 2, 3].includes(section.columns) ||
        !['none', 'reveal', 'parallax', 'rotate'].includes(section.motion) ||
        typeof section.hidden !== 'boolean' ||
        !plain(section.scene) ||
        !['torus', 'sphere', 'wave', 'knot'].includes(section.scene.shape) ||
        !string(section.scene.color, 100) ||
        !string(section.scene.background, 100) ||
        !Number.isFinite(section.scene.speed) ||
        !Number.isFinite(section.scene.scale) ||
        typeof section.scene.wireframe !== 'boolean'
      ) {
        fail('Project contains an invalid section.');
      }
      sectionIds.add(section.id);
    }
  }
  return project;
}

function safeName(name, fallback = 'Reisian project') {
  if (typeof name !== 'string') return fallback;
  const cleaned = name
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '-')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 80)
    .replace(/[. ]+$/g, '');
  if (!cleaned || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)) return fallback;
  return cleaned;
}

function validateExport(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_EXPORT_FILES)
    fail('Export must contain between 1 and 512 files.');
  const seen = new Set();
  let bytes = 0;
  for (const file of files) {
    if (!plain(file) || typeof file.path !== 'string' || typeof file.content !== 'string')
      fail('Export contains an invalid file.');
    const segments = file.path.split('/');
    if (
      file.path.length > 240 ||
      /[\\:\u0000-\u001f\u007f<>"|?*]/.test(file.path) ||
      segments.some(
        (part) =>
          !part ||
          part === '.' ||
          part === '..' ||
          /[. ]$/.test(part) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      )
    ) {
      fail('Export contains an unsafe file path.');
    }
    const key = file.path.normalize('NFC').toLowerCase();
    if (seen.has(key)) fail('Export contains duplicate file paths.');
    seen.add(key);
    bytes += Buffer.byteLength(file.content, 'utf8');
    if (bytes > MAX_EXPORT_BYTES) fail('Export exceeds the 40 MB limit.');
  }
  for (const key of seen) {
    const segments = key.split('/');
    segments.pop();
    while (segments.length) {
      if (seen.has(segments.join('/'))) fail('Export contains conflicting file and folder paths.');
      segments.pop();
    }
  }
  if (!seen.has('index.html')) fail('Export must include index.html.');
  return files;
}

function assertSender(event, webContents, expectedURL) {
  if (
    !webContents ||
    webContents.isDestroyed() ||
    event.sender !== webContents ||
    !event.senderFrame ||
    event.senderFrame !== webContents.mainFrame ||
    event.senderFrame.url !== expectedURL
  ) {
    fail('This window is not authorized to access native files.');
  }
}

module.exports = {
  MAX_PROJECT_BYTES,
  MAX_EXPORT_BYTES,
  MAX_EXPORT_FILES,
  validateProject,
  safeName,
  validateExport,
  assertSender,
};
