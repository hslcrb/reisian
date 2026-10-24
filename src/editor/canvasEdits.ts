import type { Project } from '../core/types';
export interface CanvasEdit { sectionId: string; itemId?: string; field: string; value: string; }
const SECTION_LIMITS: Record<string, number> = { eyebrow: 300, title: 2000, body: 20000, buttonLabel: 200 };
const ITEM_LIMITS: Record<string, number> = { title: 2000, body: 10000 };
/** Apply only the plain-text authoring fields supported by our sandboxed canvas. */
export function applyCanvasEdits(project: Project, edits: unknown): Project {
  if (!Array.isArray(edits) || edits.length > 100) throw new Error('The canvas returned an invalid edit. Your project is unchanged.');
  const next = structuredClone(project);
  for (const edit of edits) {
    if (!edit || typeof edit !== 'object' || typeof edit.sectionId !== 'string' || typeof edit.field !== 'string' || typeof edit.value !== 'string') throw new Error('The canvas returned an invalid text edit.');
    const limits = edit.itemId === undefined ? SECTION_LIMITS : ITEM_LIMITS;
    if (!Object.hasOwn(limits, edit.field)) throw new Error('That field cannot be edited on the canvas.');
    if (edit.value.length > limits[edit.field]) throw new Error(`This text exceeds the ${limits[edit.field].toLocaleString()} character limit. Shorten it before saving.`);
    const section = next.pages.flatMap((page) => page.sections).find((item) => item.id === edit.sectionId);
    if (!section) continue;
    if (edit.itemId !== undefined) {
      if (typeof edit.itemId !== 'string') throw new Error('The canvas returned an invalid item.');
      const item = section.items?.find((item) => item.id === edit.itemId);
      if (item) Object.assign(item, { [edit.field]: edit.value });
    } else Object.assign(section, { [edit.field]: edit.value });
  }
  if (JSON.stringify(next) !== JSON.stringify(project)) next.updatedAt = new Date().toISOString();
  return next;
}
