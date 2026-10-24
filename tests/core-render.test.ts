import { describe, it, expect } from 'vitest';
import { createProject, createSection } from '../src/core/model';
import { renderPageDocument } from '../src/core/render';
import { createExportBundle } from '../src/core/export';
import { auditProject, contrastRatio } from '../src/core/audit';
describe('shared semantic rendering and offline export', () => {
  it('escapes text and never renders executable links or SVG image payloads', () => {
    const p = createProject(); const s = p.pages[0].sections[0];
    s.title = '<script>alert("x")</script>'; s.buttonHref = 'javascript:alert(1)'; s.image = 'data:image/svg+xml,<svg onload="alert(1)">';
    const html = renderPageDocument(p,p.pages[0].id);
    expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('href="javascript:'); expect(html).not.toContain('data:image/svg+xml');
  });
  it('has exactly one h1 even when authors add several heroes', () => {
    const p = createProject(); p.pages[0].sections.push(createSection('hero'));
    expect(renderPageDocument(p,p.pages[0].id).match(/<h1\b/g)).toHaveLength(1);
  });
  it('exports offline resources and correct page links', () => {
    const p = createProject(); p.pages.push({...p.pages[0],id:'about-page',slug:'about',name:'About',sections:[]});
    const files = createExportBundle(p).files;
    expect(files.map(f=>f.path)).toEqual(expect.arrayContaining(['index.html','about.html','styles.css','runtime.js']));
    expect(files.find(f=>f.path==='index.html')!.content).toContain('href="about.html"');
    expect(files.find(f=>f.path==='index.html')!.content).toContain('src="runtime.js"');
    expect(files.find(f=>f.path==='runtime.js')!.content).not.toContain('import ');
  });
  it('resolves page fragments and rejects export filename collisions', () => {
    const p = createProject();
    p.pages.push({...p.pages[0],id:'about',slug:'about',name:'About',sections:[]});
    p.pages[0].sections[0].buttonHref='about#main';
    expect(renderPageDocument(p,p.pages[0].id)).toContain('href="about.html#main"');
    p.pages[0].slug='home';p.pages[1].slug='index';
    p.pages.push({...p.pages[1],id:'collision',slug:'page-2'});
    expect(()=>createExportBundle(p)).toThrow(/filename/);
  });
  it('rejects missing pages and emits reduced-motion preference', () => {
    const p = createProject(); expect(()=>renderPageDocument(p,'missing')).toThrow(/page/i);
    expect(renderPageDocument(p,p.pages[0].id,{reducedMotion:true})).toContain('data-reduced-motion="true"');
  });
  it('provides useful contrast and image findings without claiming conformance', () => {
    expect(contrastRatio('#ffffff','#000000')).toBeCloseTo(21,4);
    const p = createProject(); expect(auditProject(p).filter(i=>i.severity==='error')).toEqual([]);
    const s = createSection('image'); s.image='data:image/png;base64,AAAA'; s.imageAlt=''; s.color='#ffffff';s.background='#ffffff';p.pages[0].sections.push(s);
    const issues=auditProject(p); expect(issues.some(i=>i.sectionId===s.id&&/alternative/i.test(i.title))).toBe(true);
    expect(issues.some(i=>i.sectionId===s.id&&/contrast/i.test(i.title))).toBe(true);
  });
});
