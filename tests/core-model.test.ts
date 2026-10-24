import { describe, expect, it } from 'vitest';
import {
  createProject,
  createSection,
  parseProject,
  serializeProject,
  MAX_PROJECT_BYTES,
} from '../src/core/model';

describe('portable project format', () => {
  it('round trips every template without losing content', () => {
    for (const template of ['atelier', 'portfolio', 'blank'] as const) {
      const project = createProject(template);
      expect(parseProject(serializeProject(project))).toEqual(project);
    }
  });
  it('creates independent scene settings and unique section IDs', () => {
    const a = createSection('scene'),
      b = createSection('scene');
    expect(a.id).not.toBe(b.id);
    a.scene.color = '#ffffff';
    expect(b.scene.color).not.toBe(a.scene.color);
  });
  it('rejects executable links, remote images, malformed colors, duplicate IDs and unsafe slugs', () => {
    for (const mutate of [
      (p: any) => {
        p.pages[0].sections[0].buttonHref = 'javascript:alert(1)';
      },
      (p: any) => {
        p.pages[0].sections[0].buttonHref = 'java\nscript:alert(1)';
      },
      (p: any) => {
        p.pages[0].sections[0].image = 'https://tracker.example/a.png';
      },
      (p: any) => {
        p.theme.text = 'red; background: url(https://evil)';
      },
      (p: any) => {
        p.pages[0].sections[1].id = p.pages[0].sections[0].id;
      },
      (p: any) => {
        p.pages[0].slug = '../unsafe';
      },
      (p: any) => {
        p.pages[0].sections[0].scene.scale = 100000;
      },
    ]) {
      const p = createProject();
      mutate(p);
      expect(() => parseProject(JSON.stringify(p))).toThrow(/project/i);
    }
  });
  it('validates editable collection items and preserves legacy sections', () => {
    const p = createProject();
    const gallery = p.pages[0].sections.find((s) => s.kind === 'gallery')!;
    expect(gallery.items).toHaveLength(3);
    gallery.items![0].title = 'A personal work';
    expect(
      parseProject(JSON.stringify(p)).pages[0].sections.find((s) => s.kind === 'gallery')!.items![0]
        .title,
    ).toBe('A personal work');
    gallery.items![1].id = gallery.items![0].id;
    expect(() => parseProject(JSON.stringify(p))).toThrow(/item/i);
    delete gallery.items;
    expect(() => parseProject(JSON.stringify(p))).not.toThrow();
  });
  it('uses one UTF-8 byte limit for imports and formatted saves', () => {
    expect(() =>
      parseProject(JSON.stringify({ text: '한'.repeat(Math.ceil(MAX_PROJECT_BYTES / 3)) })),
    ).toThrow(/too large/i);
    const p = createProject('blank');
    p.pages[0].sections = [createSection('image'), createSection('image')];
    p.pages[0].sections[0].image = 'data:image/png;base64,' + 'A'.repeat(6_000_000);
    p.pages[0].sections[1].image = 'data:image/png;base64,';
    const remaining = MAX_PROJECT_BYTES - new TextEncoder().encode(JSON.stringify(p)).length - 4;
    p.pages[0].sections[1].image += 'A'.repeat(remaining);
    expect(() => parseProject(JSON.stringify(p))).not.toThrow();
    expect(() => serializeProject(p)).toThrow(/too large/i);
  });
  it('rejects invalid versions and missing fields with understandable errors', () => {
    expect(() => parseProject('{')).toThrow(/JSON/i);
    expect(() => parseProject('{"schemaVersion":3}')).toThrow(/version/i);
    const p: any = createProject();
    delete p.pages[0].sections[0].title;
    expect(() => parseProject(JSON.stringify(p))).toThrow(/title/);
  });
});
