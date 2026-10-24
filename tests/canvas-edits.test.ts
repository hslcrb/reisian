import { describe, expect, it } from 'vitest';
import { createProject } from '../src/core/model';
import { applyCanvasEdits } from '../src/editor/canvasEdits';
describe('canvas snapshot flushing', () => {
  it('preserves valid long imported text and does not mutate history', () => {
    const project = createProject();
    const id = project.pages[0].sections[0].id;
    const long = 'A'.repeat(1500);
    const changed = applyCanvasEdits(project, [{ sectionId: id, field: 'title', value: long }]);
    expect(changed.pages[0].sections[0].title).toBe(long);
    expect(project.pages[0].sections[0].title).not.toBe(long);
  });
  it('rejects oversized or privileged fields without silently truncating', () => {
    const project = createProject();
    const sectionId = project.pages[0].sections[0].id;
    expect(() =>
      applyCanvasEdits(project, [{ sectionId, field: 'title', value: 'A'.repeat(2001) }]),
    ).toThrow('character limit');
    expect(() =>
      applyCanvasEdits(project, [{ sectionId, field: '__proto__', value: 'x' }]),
    ).toThrow();
    expect(() =>
      applyCanvasEdits(project, [{ sectionId, field: 'buttonHref', value: 'javascript:alert(1)' }]),
    ).toThrow();
  });
});
