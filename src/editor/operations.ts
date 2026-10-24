import type { Page, Project } from '../core/types';
export function hasRoomForSections(project: Project, pageId: string, amount = 1): boolean {
  const page = project.pages.find((item) => item.id === pageId);
  const total = project.pages.reduce((sum, item) => sum + item.sections.length, 0);
  return !!page && page.sections.length + amount <= 100 && total + amount <= 300;
}
export function copyPage(page: Page, slug: string): Page {
  const result = structuredClone(page);
  result.id = crypto.randomUUID(); result.name = `${result.name.slice(0, 115)} copy`; result.slug = slug;
  const ids = new Map(result.sections.map((section) => [section.id, crypto.randomUUID()]));
  const rewrite = (href: string) => href.startsWith('#') && ids.has(href.slice(1)) ? `#${ids.get(href.slice(1))}` : href;
  for (const section of result.sections) {
    section.id = ids.get(section.id)!; section.buttonHref = rewrite(section.buttonHref);
    section.items?.forEach((item) => { item.href = rewrite(item.href); });
  }
  return result;
}
