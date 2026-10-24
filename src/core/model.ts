import type { Project, Section, SectionItem, SectionKind } from './types';

export const MAX_PROJECT_BYTES = 10 * 1024 * 1024;
const assertProjectSize = (text: string) => {
  if (typeof text !== 'string' || text.length > MAX_PROJECT_BYTES || new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES) throw new Error('Project is too large. Keep project files below 10 MiB.');
};
const kinds: SectionKind[] = ['hero', 'text', 'image', 'gallery', 'scene', 'cards', 'quote', 'contact', 'spacer'];
export const uid = (prefix = 'item') => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
export function createSectionItem(kind: 'cards' | 'gallery' = 'cards', index = 0): SectionItem {
  const i = index % 3;
  return { id: uid('item'), title: kind === 'gallery' ? ['Vessel / No. 01', 'Still / No. 02', 'Orbit / No. 03'][i] : ['Rooted in curiosity', 'Shaped with care', 'Made for living'][i], body: kind === 'gallery' ? ['A study in organic form.', 'A quiet moment, made tangible.', 'An exploration of endless movement.'][i] : ['Every good idea begins with a thoughtful question.', 'Considered details, honest materials, lasting impressions.', 'Purposeful experiences for everyday moments.'][i], image: '', imageAlt: '', href: '' };
}
export function createSection(kind: SectionKind): Section {
  if (!kinds.includes(kind)) throw new Error('Choose a supported section type.');
  const titles: Record<SectionKind, string> = { hero: 'Objects for a slower world.', text: 'Less, but with meaning.', image: 'A different perspective.', gallery: 'The collected works.', scene: 'A new dimension.', cards: 'Considered from every angle.', quote: 'Good things take their own time.', contact: 'Let’s make something meaningful.', spacer: '' };
  return { id: uid('section'), kind, name: kind[0].toUpperCase() + kind.slice(1), eyebrow: kind === 'hero' ? 'Independent design studio · Est. 2024' : 'A considered approach', title: titles[kind], body: 'We create thoughtful objects and digital experiences. Rooted in curiosity, shaped by care, and made to be lived with.', buttonLabel: kind === 'hero' ? 'Explore our world' : kind === 'contact' ? 'Start a conversation' : '', buttonHref: kind === 'contact' ? 'mailto:hello@example.com' : '#main', image: '', imageAlt: '', background: '', color: '', align: 'left', padding: kind === 'hero' ? 96 : 80, columns: 3, motion: 'none', scene: { shape: 'torus', color: '#9AAE91', background: '#E5E8DD', speed: 0.35, scale: 1, wireframe: false }, hidden: false, ...((kind === 'cards' || kind === 'gallery') ? {items: Array.from({length:3}, (_,i)=>createSectionItem(kind,i))} : {}) };
}
export function createProject(template: 'atelier' | 'portfolio' | 'blank' = 'atelier'): Project {
  const hero = createSection('hero');
  const text = createSection('text'); text.eyebrow = '01 / Our philosophy'; text.body = 'A quieter kind of design. We believe the most enduring things don’t ask for attention — they earn it. Through honest materials, thoughtful forms, and room to breathe.';
  const gallery = createSection('gallery'); gallery.eyebrow = '02 / Selected objects'; gallery.title = 'Form follows feeling.'; gallery.body = 'An ongoing exploration of shape, texture, and the space in between.'; gallery.background = '#E5E8DD';
  hero.buttonHref = `#${gallery.id}`;
  const quote = createSection('quote'); quote.eyebrow = 'A note from the studio'; quote.title = '“The everyday deserves a little extraordinary.”'; quote.body = 'Made slowly. Made with intention.'; quote.align = 'center'; quote.background = '#DDD6EA';
  const contact = createSection('contact'); contact.eyebrow = 'The next chapter'; contact.background = '#29352D'; contact.color = '#F4F1EA'; contact.body = 'Have a thought, a question, or the beginning of an idea? Our door is open.';
  if (template === 'portfolio') { hero.eyebrow = 'Designer & creative thinker'; hero.title = 'Ideas made tangible.'; hero.body = 'A selection of independent work across identity, objects, and digital experiences.'; hero.scene.shape = 'knot'; hero.scene.color = '#AEA1C9'; gallery.title = 'A few things I’ve made.'; }
  return { schemaVersion: 1, id: uid('project'), name: template === 'portfolio' ? 'Studio / Portfolio' : template === 'blank' ? 'Untitled studio' : 'Atelier / Objects', language: 'en', theme: { background: '#F4F1EA', text: '#29352D', accent: '#625347', fontPair: 'editorial', radius: 4 }, pages: [{ id: uid('page'), name: 'Home', slug: 'index', title: template === 'portfolio' ? 'Independent design & selected work' : 'Atelier — Objects for a slower world', description: 'An independent design studio creating thoughtful objects and digital experiences.', sections: template === 'blank' ? [] : [hero, text, gallery, quote, contact] }], updatedAt: new Date().toISOString() };
}
export function safeHref(value: string): boolean {
  if (typeof value !== 'string' || value.length > 2000 || /[\u0000-\u0020\u007f\\<>"']/.test(value)) return false;
  return value === '' || /^#[A-Za-z0-9_.:-]*$/.test(value) || /^https?:\/\/[^/\s]+[^\s]*$/i.test(value) || /^mailto:[^\s@?]+@[^\s@?]+(?:\?[^\s]*)?$/i.test(value) || /^tel:\+?[0-9()-]+$/.test(value) || /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.html)?(?:#[A-Za-z0-9_.:-]+)?$/.test(value);
}
export const safeImage = (value: string) => value === '' || (value.length <= 8_000_000 && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
export const safeColor = (value: string) => /^#[a-fA-F0-9]{6}$/.test(value);
export function parseProject(text: string): Project {
  assertProjectSize(text);
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('This project is not valid JSON. Choose a .reisian project file.'); }
  const fail = (path: string, reason: string): never => { throw new Error(`Invalid project: ${path} ${reason}.`); };
  const object = (v: any, path: string) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path, 'must be an object'); return v; };
  const str = (v: any, path: string, max = 5000): string => { if (typeof v !== 'string' || v.length > max) fail(path, `must be text of at most ${max} characters`); return v; };
  const enumeration = <T extends string>(v: any, options: readonly T[], path: string): T => options.includes(v) ? v : fail(path, 'has an unsupported value');
  const number = (v: any, min: number, max: number, path: string): number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fail(path, `must be between ${min} and ${max}`);
  const bool = (v: any, path: string): boolean => typeof v === 'boolean' ? v : fail(path, 'must be true or false');
  const color = (v: any, path: string, optional = false): string => (optional && v === '') || (typeof v === 'string' && safeColor(v)) ? v : fail(path, 'must be a six-digit hex color');
  const ids = new Set<string>();
  const id = (v: any, path: string) => { const s = str(v, path, 100); if (!/^[A-Za-z0-9_-]+$/.test(s) || ids.has(s)) fail(path, 'must be a unique identifier'); ids.add(s); return s; };
  object(raw, 'root'); if (raw.schemaVersion !== 1) fail('schemaVersion', 'uses an unsupported version');
  object(raw.theme, 'theme');
  if (!Array.isArray(raw.pages) || raw.pages.length < 1 || raw.pages.length > 30) fail('pages', 'must contain between 1 and 30 pages');
  const slugs = new Set<string>(); let total = 0;
  const project: Project = { schemaVersion: 1, id: id(raw.id, 'id'), name: str(raw.name, 'name', 120), language: enumeration(raw.language, ['en', 'ko'], 'language'), theme: { background: color(raw.theme.background, 'theme.background'), text: color(raw.theme.text, 'theme.text'), accent: color(raw.theme.accent, 'theme.accent'), fontPair: enumeration(raw.theme.fontPair, ['editorial', 'modern', 'humanist'], 'theme.fontPair'), radius: number(raw.theme.radius, 0, 80, 'theme.radius') }, updatedAt: str(raw.updatedAt, 'updatedAt', 50), pages: raw.pages.map((page: any, pi: number) => {
    const path = `pages[${pi}]`; object(page, path); const slug = str(page.slug, `${path}.slug`, 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) fail(`${path}.slug`, 'must be unique lowercase words joined with hyphens'); slugs.add(slug);
    if (!Array.isArray(page.sections) || page.sections.length > 100 || (total += page.sections.length) > 300) fail(`${path}.sections`, 'exceeds the 100 per page or 300 per project limit');
    return { id: id(page.id, `${path}.id`), name: str(page.name, `${path}.name`, 120), slug, title: str(page.title, `${path}.title`, 300), description: str(page.description, `${path}.description`, 1000), sections: page.sections.map((s: any, si: number): Section => {
      const p = `${path}.sections[${si}]`; object(s, p); object(s.scene, `${p}.scene`);
      const href = str(s.buttonHref, `${p}.buttonHref`, 2000); if (!safeHref(href)) fail(`${p}.buttonHref`, 'must be a safe web, email, telephone, page or anchor link');
      const image = str(s.image, `${p}.image`, 8_000_000); if (!safeImage(image)) fail(`${p}.image`, 'must be an embedded PNG, JPEG, WebP or GIF');
      let items: SectionItem[] | undefined;
      if (s.items !== undefined) {
        if (!Array.isArray(s.items) || s.items.length > 12) fail(`${p}.items`, 'must contain at most 12 items');
        const itemIds = new Set<string>();
        items = s.items.map((item: any, ii: number): SectionItem => {
          const ip = `${p}.items[${ii}]`; object(item, ip);
          const itemId = str(item.id, `${ip}.id`, 100);
          if (!/^[A-Za-z0-9_-]+$/.test(itemId) || itemIds.has(itemId)) fail(`${ip}.id`, 'must be a unique item identifier within its section'); itemIds.add(itemId);
          const image = str(item.image, `${ip}.image`, 8_000_000); if (!safeImage(image)) fail(`${ip}.image`, 'must be an embedded raster image');
          const href = str(item.href, `${ip}.href`, 2000); if (!safeHref(href)) fail(`${ip}.href`, 'must be a safe link');
          return { id: itemId, title: str(item.title, `${ip}.title`, 2000), body: str(item.body, `${ip}.body`, 10000), image, imageAlt: str(item.imageAlt, `${ip}.imageAlt`, 1000), href };
        });
      }
      return { ...(items !== undefined ? {items} : {}), id: id(s.id, `${p}.id`), kind: enumeration(s.kind, kinds, `${p}.kind`), name: str(s.name, `${p}.name`, 120), eyebrow: str(s.eyebrow, `${p}.eyebrow`, 300), title: str(s.title, `${p}.title`, 2000), body: str(s.body, `${p}.body`, 20000), buttonLabel: str(s.buttonLabel, `${p}.buttonLabel`, 200), buttonHref: href, image, imageAlt: str(s.imageAlt, `${p}.imageAlt`, 1000), background: color(s.background, `${p}.background`, true), color: color(s.color, `${p}.color`, true), align: enumeration(s.align, ['left', 'center', 'right'], `${p}.align`), padding: number(s.padding, 0, 240, `${p}.padding`), columns: [1,2,3].includes(s.columns) ? s.columns : fail(`${p}.columns`, 'must be 1, 2 or 3'), motion: enumeration(s.motion, ['none','reveal','parallax','rotate'], `${p}.motion`), hidden: bool(s.hidden, `${p}.hidden`), scene: { shape: enumeration(s.scene.shape, ['torus','sphere','wave','knot'], `${p}.scene.shape`), color: color(s.scene.color, `${p}.scene.color`), background: color(s.scene.background, `${p}.scene.background`), speed: number(s.scene.speed, 0, 3, `${p}.scene.speed`), scale: number(s.scene.scale, 0.3, 2.5, `${p}.scene.scale`), wireframe: bool(s.scene.wireframe, `${p}.scene.wireframe`) } };
    }) };
  }) };
  if (Number.isNaN(Date.parse(project.updatedAt))) fail('updatedAt', 'must be a valid date');
  return project;
}
export const serializeProject = (project: Project): string => {
  const text = JSON.stringify(parseProject(JSON.stringify(project)), null, 2);
  assertProjectSize(text);
  return text;
};
export const cloneProject = (project: Project): Project => parseProject(JSON.stringify(project));
