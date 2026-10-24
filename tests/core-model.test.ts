import { describe, expect, it } from 'vitest';
import { createProject, createSection, parseProject, serializeProject } from '../src/core/model';

describe('portable project format', () => {
  it('round trips every template without losing content', () => {
    for (const template of ['atelier', 'portfolio', 'blank'] as const) {
      const project = createProject(template);
      expect(parseProject(serializeProject(project))).toEqual(project);
    }
  });
  it('creates independent scene settings and unique section IDs', () => {
    const a = createSection('scene'), b = createSection('scene');
    expect(a.id).not.toBe(b.id);
    a.scene.color = '#ffffff';
    expect(b.scene.color).not.toBe(a.scene.color);
  });
  it('rejects executable links, remote images, malformed colors, duplicate IDs and unsafe slugs', () => {
    for (const mutate of [
      (p: any) => { p.pages[0].sections[0].buttonHref = 'javascript:alert(1)'; },
      (p: any) => { p.pages[0].sections[0].buttonHref = 'java\nscript:alert(1)'; },
      (p: any) => { p.pages[0].sections[0].image = 'https://tracker.example/a.png'; },
      (p: any) => { p.theme.text = 'red; background: url(https://evil)'; },
      (p: any) => { p.pages[0].sections[1].id = p.pages[0].sections[0].id; },
      (p: any) => { p.pages[0].slug = '../unsafe'; },
      (p: any) => { p.pages[0].sections[0].scene.scale = 100000; },
    ]) {
      const p = createProject(); mutate(p);
      expect(() => parseProject(JSON.stringify(p))).toThrow(/project/i);
    }
  });
  it('rejects invalid versions and missing fields with understandable errors', () => {
    expect(() => parseProject('{')).toThrow(/JSON/i);
    expect(() => parseProject('{"schemaVersion":3}')).toThrow(/version/i);
    const p: any = createProject(); delete p.pages[0].sections[0].title;
    expect(() => parseProject(JSON.stringify(p))).toThrow(/title/);
  });
});
