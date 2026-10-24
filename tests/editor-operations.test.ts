import { describe, it, expect } from 'vitest';
import { createProject } from '../src/core/model';
import { copyPage, hasRoomForSections } from '../src/editor/operations';
describe('portable page editing', () => {
  it('rewrites internal links to copied section ids without changing external links', () => {
    const page = createProject().pages[0];
    const originalTarget = page.sections[2].id;
    page.sections[0].buttonHref = `#${originalTarget}`;
    page.sections[2].items = [{ id: 'item-one', title: 'Object', body: '', image: '', imageAlt: '', href: `#${originalTarget}` }];
    const duplicate = copyPage(page, 'home-copy');
    expect(duplicate.sections[0].buttonHref).toBe(`#${duplicate.sections[2].id}`);
    expect(duplicate.sections[2].items?.[0].href).toBe(`#${duplicate.sections[2].id}`);
    expect(duplicate.sections.at(-1)?.buttonHref).toBe(page.sections.at(-1)?.buttonHref);
    expect(page.sections[0].buttonHref).toBe(`#${originalTarget}`);
  });
  it('prevents edits from producing documents over the parser section limits', () => {
    const project = createProject('blank');
    const section = createProject().pages[0].sections[0];
    project.pages[0].sections = Array.from({ length: 100 }, () => ({ ...section }));
    expect(hasRoomForSections(project, project.pages[0].id, 1)).toBe(false);
    expect(hasRoomForSections(project, project.pages[0].id, 0)).toBe(true);
  });
});
