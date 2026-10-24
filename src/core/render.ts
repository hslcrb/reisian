import type { Page, Project, RenderOptions, Section } from './types';
import { safeColor, safeHref, safeImage, createSectionItem } from './model';
import { siteStyles } from './styles';
import runtimeText from '../runtime/site-runtime.js?raw';
export const escapeHTML = (text: unknown): string =>
  String(text ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );
const cssColor = (value: string, fallback: string) => (safeColor(value) ? value : fallback);
export const pageFileName = (project: Project, page: Page) =>
  project.pages[0]?.id === page.id
    ? 'index.html'
    : `${/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) && page.slug !== 'index' ? page.slug : `page-${project.pages.indexOf(page) + 1}`}.html`;
export const runtimeSource = () =>
  runtimeText.replace('export function mountSite()', 'function mountSite()') + '\nmountSite();';
function href(project: Project, link: string): string {
  if (!safeHref(link)) return '#main';
  const [destination, fragment] = link.split('#');
  const page = project.pages.find(
    (p) => p.slug === destination || `${p.slug}.html` === destination,
  );
  const target =
    page && fragment === 'contact'
      ? page.sections.find((section) => section.kind === 'contact' && !section.hidden)?.id
      : fragment;
  return page ? pageFileName(project, page) + (target ? `#${target}` : '') : link || '#main';
}
function pageAttribute(project: Project, destination: string): string {
  const filename = href(project, destination).split('#')[0];
  const page = project.pages.find((p) => pageFileName(project, p) === filename);
  return page ? ` data-page-id="${escapeHTML(page.id)}"` : '';
}
function scene(section: Section): string {
  const settings = {
    shape: ['torus', 'sphere', 'wave', 'knot'].includes(section.scene.shape)
      ? section.scene.shape
      : 'torus',
    color: cssColor(section.scene.color, '#9AAE91'),
    background: cssColor(section.scene.background, '#E5E8DD'),
    speed: Math.max(0, Math.min(3, Number(section.scene.speed) || 0)),
    scale: Math.max(0.3, Math.min(2.5, Number(section.scene.scale) || 1)),
    wireframe: !!section.scene.wireframe,
  };
  return `<div class="scene-frame" style="--scene-bg:${settings.background};--scene-color:${settings.color}" role="img" aria-label="${escapeHTML(section.imageAlt || `An abstract ${settings.shape} sculpture`)}"><div class="scene-fallback" aria-hidden="true"></div><canvas data-scene="${escapeHTML(JSON.stringify(settings))}" aria-hidden="true"></canvas></div><div class="scene-caption" aria-hidden="true"><span>Study in form / ${escapeHTML(settings.shape)}</span><span>Digital object № 01</span></div>`;
}
function sectionHTML(
  project: Project,
  section: Section,
  heading: 'h1' | 'h2',
  selectedId?: string,
): string {
  const s = section,
    e = escapeHTML;
  const title = `<${heading} class="display" data-edit="title">${e(s.title)}</${heading}>`;
  const eyebrow = s.eyebrow ? `<p class="eyebrow" data-edit="eyebrow">${e(s.eyebrow)}</p>` : '';
  const body = s.body ? `<p class="body-copy" data-edit="body">${e(s.body)}</p>` : '';
  const button = s.buttonLabel
    ? `<a class="section-link" href="${e(href(project, s.buttonHref))}"${pageAttribute(project, s.buttonHref)}><span data-edit="buttonLabel">${e(s.buttonLabel)}</span><span class="arrow" aria-hidden="true">↗</span></a>`
    : '';
  const image =
    s.image && safeImage(s.image)
      ? `<img src="${e(s.image)}" alt="${e(s.imageAlt)}" loading="lazy" decoding="async">`
      : '';
  const items =
    s.items ??
    Array.from({ length: s.columns }, (_, i) => ({
      ...createSectionItem(s.kind === 'gallery' ? 'gallery' : 'cards', i),
      image: s.image,
      imageAlt: s.imageAlt,
    }));
  const itemImage = (item: (typeof items)[number]) =>
    item.image && safeImage(item.image)
      ? `<img src="${e(item.image)}" alt="${e(item.imageAlt)}" loading="lazy" decoding="async">`
      : '';
  const itemTitle = (item: (typeof items)[number]) =>
    item.href
      ? `<a href="${e(href(project, item.href))}"${pageAttribute(project, item.href)}>${e(item.title)}</a>`
      : e(item.title);
  let inner = '';
  switch (s.kind) {
    case 'hero':
      inner = `<div class="hero-grid"><div>${eyebrow}${title}${body}${button}</div><div class="hero-scene">${image || scene(s)}</div></div><div class="hero-bottom" aria-hidden="true"><span>Thoughtfully shaped. Quietly distinctive.</span><span>Scroll to discover ↓</span></div>`;
      break;
    case 'text':
      inner = `${eyebrow}<div class="text-grid"><div>${title}</div><div>${body}${button}</div></div>`;
      break;
    case 'image':
      inner = `${eyebrow}<div class="section-heading">${title}</div><div class="image-layout">${image || '<div class="image-placeholder">A space for your perspective.</div>'}${body}${button}</div>`;
      break;
    case 'scene':
      inner = `<div class="scene-layout"><div>${eyebrow}${title}${body}${button}</div><div>${scene(s)}</div></div>`;
      break;
    case 'gallery':
      inner = `${eyebrow}<div class="section-heading">${title}${body}</div><div class="gallery-grid">${items.map((item) => `<figure class="artwork" data-item-id="${e(item.id)}"><div class="artwork-visual">${itemImage(item) || '<div class="art-object" aria-hidden="true"></div>'}</div><figcaption><span>${itemTitle(item)}</span></figcaption>${item.body ? `<p class="item-description">${e(item.body)}</p>` : ''}</figure>`).join('')}</div>${button}`;
      break;
    case 'cards':
      inner = `${eyebrow}<div class="section-heading">${title}</div>${body}<div class="cards-grid" style="margin-top:36px">${items.map((item, i) => `<article class="feature-card" data-item-id="${e(item.id)}">${itemImage(item)}<span class="card-number">${String(i + 1).padStart(2, '0')} /</span><h3>${itemTitle(item)}</h3><p>${e(item.body)}</p></article>`).join('')}</div>${button}`;
      break;
    case 'quote':
      inner = `${eyebrow}<blockquote>${title}${body}</blockquote>${button}`;
      break;
    case 'contact':
      inner = `${eyebrow}${title}${body}${button}`;
      break;
    case 'spacer':
      inner = '';
      break;
  }
  const padding = Math.max(0, Math.min(240, Number(s.padding) || 0));
  return `<section id="${e(s.id)}" ${s.kind === 'contact' ? 'data-anchor="contact" ' : ''}class="section ${e(s.kind)}${s.id === selectedId ? ' is-selected' : ''}" data-section-id="${e(s.id)}" data-motion="${e(s.motion)}" style="--section-padding:${padding}px;--section-bg:${cssColor(s.background, 'transparent')};--section-ink:${cssColor(s.color, 'inherit')};--align:${['left', 'center', 'right'].includes(s.align) ? s.align : 'left'};--columns:${[1, 2, 3].includes(s.columns) ? s.columns : 3}"><div class="section-content">${inner}</div></section>`;
}
export function renderPageDocument(
  project: Project,
  pageId: string,
  options: RenderOptions = {},
): string {
  const page = project.pages.find((p) => p.id === pageId);
  if (!page) throw new Error('This page could not be found in the project.');
  const mode = options.mode || 'preview',
    e = escapeHTML;
  const display =
    project.theme.fontPair === 'modern'
      ? 'Arial, Helvetica, sans-serif'
      : project.theme.fontPair === 'humanist'
        ? 'Palatino, "Palatino Linotype", Georgia, serif'
        : 'Georgia, "Times New Roman", serif';
  const theme = `--paper:${cssColor(project.theme.background, '#F4F1EA')};--ink:${cssColor(project.theme.text, '#29352D')};--accent:${cssColor(project.theme.accent, '#625347')};--radius:${Math.max(0, Math.min(80, project.theme.radius))}px;--display:${display}`;
  let hasH1 = false;
  const sections = page.sections
    .filter((s) => !s.hidden)
    .map((s) => {
      const level = !hasH1 && s.title && s.kind !== 'spacer' ? 'h1' : 'h2';
      if (level === 'h1') hasH1 = true;
      return sectionHTML(project, s, level, options.selectedId);
    })
    .join('\n');
  const contact = page.sections.find((s) => s.kind === 'contact' && !s.hidden);
  const nav = project.pages
    .map(
      (p) =>
        `<a href="${e(pageFileName(project, p))}" data-page-id="${e(p.id)}"${p.id === page.id ? ' aria-current="page"' : ''}>${e(p.name)}</a>`,
    )
    .join('');
  return `<!DOCTYPE html><html lang="${project.language === 'ko' ? 'ko' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${e(page.description)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline' 'self'; script-src 'unsafe-inline' 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${e(page.title || page.name)}</title>${mode === 'export' ? '<link rel="stylesheet" href="styles.css">' : `<style>${siteStyles}</style>`}</head><body class="${mode === 'editor' ? 'editor ' : ''}${options.reducedMotion ? 'motion-paused' : ''}" data-mode="${mode}" data-reduced-motion="${!!options.reducedMotion}" style="${e(theme)}"><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="wordmark" href="index.html" data-page-id="${e(project.pages[0]?.id)}">${e(project.name)}</a><nav class="site-nav" aria-label="Main navigation">${nav}${contact ? `<a class="nav-contact" href="#${e(contact.id)}">Let’s talk <span aria-hidden="true">↗</span></a>` : ''}</nav></header><main id="main">${!hasH1 ? `<h1 class="sr-only">${e(page.title || page.name)}</h1>` : ''}${sections}</main><footer class="site-footer"><a class="wordmark" href="index.html" data-page-id="${e(project.pages[0]?.id)}">${e(project.name)}</a><div class="footer-meta"><span>Thoughtfully made with Reisian.</span><button class="motion-toggle" type="button" data-motion-toggle aria-pressed="${!!options.reducedMotion}">${options.reducedMotion ? 'Play motion' : 'Pause motion'}</button></div></footer>${mode === 'export' ? '<script src="runtime.js" defer></script>' : `<script>${runtimeSource()}</script>`}</body></html>`;
}
