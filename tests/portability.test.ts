import { describe, expect, it } from 'vitest';
import { createProject, createSection, parseProject } from '../src/core/model';
import { createExportBundle } from '../src/core/export';
describe('portable static-site navigation', () => {
  it('rejects Windows device names before creating an unusable export', () => {
    for (const slug of ['con', 'aux', 'nul', 'prn', 'com1', 'lpt9']) {
      const project = createProject();
      project.pages[0].slug = slug;
      expect(() => parseProject(JSON.stringify(project))).toThrow('portable');
    }
  });
  it('exports cross-page contact aliases as real destination IDs', () => {
    const project = createProject();
    const contact = createSection('contact');
    project.pages.push({
      id: 'about',
      name: 'About',
      slug: 'about',
      title: 'About',
      description: '',
      sections: [createSection('hero'), contact],
    });
    project.pages[0].sections[0].buttonHref = 'about#contact';
    const files = createExportBundle(project).files;
    expect(files.find((file) => file.path === 'index.html')?.content).toContain(
      `href="about.html#${contact.id}"`,
    );
    expect(files.find((file) => file.path === 'about.html')?.content).toContain(
      `id="${contact.id}"`,
    );
  });
});
