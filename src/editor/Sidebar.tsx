import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Box, Check, ChevronDown, ChevronRight, Circle, Copy, File, GripVertical, Image, LayoutTemplate, Minus, MoreHorizontal, Plus, Quote, Search, ShieldCheck, Sparkles, Square, Trash2, Type } from 'lucide-react';
import type { SectionKind } from '../core/types';
import type { Studio } from './useStudio';
import { ColorField, Field, IconButton, Slider } from './controls';
import { auditProject } from '../core/audit';

export type Panel = 'layers' | 'insert' | 'pages' | 'theme' | 'accessibility';
export const SECTION_LIBRARY: { kind: SectionKind; name: string; description: string; icon: typeof Box }[] = [
  { kind: 'hero', name: 'Opening', description: 'Make an entrance', icon: LayoutTemplate },
  { kind: 'text', name: 'Story', description: 'Words with room', icon: Type },
  { kind: 'scene', name: '3D scene', description: 'A new dimension', icon: Box },
  { kind: 'image', name: 'Image', description: 'A moment, framed', icon: Image },
  { kind: 'gallery', name: 'Gallery', description: 'Things in company', icon: Square },
  { kind: 'cards', name: 'Collection', description: 'Ideas, together', icon: LayoutTemplate },
  { kind: 'quote', name: 'A thought', description: 'Something to keep', icon: Quote },
  { kind: 'contact', name: 'Contact', description: 'Start a conversation', icon: ArrowUpRight },
  { kind: 'spacer', name: 'Breathing room', description: 'The beauty of space', icon: Minus },
];
const THEMES = [
  { name: 'Quiet atelier', background: '#F4F1EA', text: '#30252D', accent: '#71354D', colors: ['#F4F1EA', '#D2DDD2', '#71354D'] },
  { name: 'After hours', background: '#252B30', text: '#F1EDE4', accent: '#DDB597', colors: ['#252B30', '#F1EDE4', '#DDB597'] },
  { name: 'Coastal air', background: '#ECF1F0', text: '#243B43', accent: '#365D6B', colors: ['#ECF1F0', '#B9CFCA', '#365D6B'] },
  { name: 'Soft expression', background: '#F2ECF1', text: '#382936', accent: '#6D3B67', colors: ['#F2ECF1', '#CFC3DD', '#6D3B67'] },
];

export function Sidebar({ studio, panel, setPanel, onNew, onOpen, onSave }: { studio: Studio; panel: Panel; setPanel: (panel: Panel) => void; onNew: () => void; onOpen: () => void; onSave: () => void }) {
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const { project, page, selectedId } = studio;
  return <aside className="sidebar" aria-label="Design tools">
    {panel === 'layers' && <>
      <div className="panel-heading"><span className="eyebrow">YOUR CANVAS</span><div className="panel-title-row"><h2>Structure</h2><IconButton icon={Plus} label="Insert a section" onClick={() => setPanel('insert')} /></div></div>
      <div className="page-picker"><File size={14} /><select value={page.id} onChange={(event) => studio.selectPage(event.target.value)} aria-label="Current page">{project.pages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={13} /></div>
      <div className="structure-label"><span>SECTIONS</span><span>{page.sections.length.toString().padStart(2, '0')}</span></div>
      <div className="layer-list" role="list" aria-label="Page sections">
        {page.sections.map((section, index) => {
          const Icon = SECTION_LIBRARY.find((item) => item.kind === section.kind)?.icon ?? Square;
          return <div key={section.id} role="listitem" className={`layer-item ${selectedId === section.id ? 'selected' : ''} ${dropId === section.id ? 'drop-target' : ''} ${section.hidden ? 'is-hidden' : ''}`} draggable onDragStart={(event) => { setDragId(section.id); event.dataTransfer.setData('text/plain', section.id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDragId(null); setDropId(null); }} onDragOver={(event) => { if (dragId) { event.preventDefault(); setDropId(section.id); } }} onDrop={(event) => { event.preventDefault(); if (dragId) { studio.moveSection(dragId, index); studio.announce('Section order updated.'); } setDragId(null); setDropId(null); }}>
            <button type="button" className="layer-select" aria-pressed={selectedId === section.id} onClick={() => studio.setSelectedId(section.id)}><Icon size={15} strokeWidth={1.6} /><span>{section.name}</span>{section.motion !== 'none' && <Sparkles className="layer-motion" size={12} />}</button><GripVertical size={13} className="layer-grip" aria-hidden="true" />
          </div>;
        })}
        {page.sections.length === 0 && <p className="empty-copy">A blank canvas.<br />A beautiful place to begin.</p>}
      </div>
      {studio.selected && <div className="layer-arrange"><span>Arrange</span><IconButton icon={ArrowUp} label="Move selected layer up" disabled={page.sections[0]?.id === selectedId} onClick={() => studio.moveSection(selectedId!, page.sections.findIndex((section) => section.id === selectedId) - 1)} /><IconButton icon={ArrowDown} label="Move selected layer down" disabled={page.sections.at(-1)?.id === selectedId} onClick={() => studio.moveSection(selectedId!, page.sections.findIndex((section) => section.id === selectedId) + 1)} /></div>}
      <button className="add-section-button" onClick={() => setPanel('insert')}><Plus size={15} />Add a section<span>+</span></button>
      <div className="sidebar-spacer" />
      <div className="studio-tip"><span className="tip-flower">✳</span><strong>A page with a point of view.</strong><p>Start with the feeling.<br />The details will follow.</p></div>
      <div className="sidebar-foot"><span className="small-dot" />Your work stays on your device</div>
    </>}
    {panel === 'insert' && <>
      <div className="panel-heading"><span className="eyebrow">A LITTLE POSSIBILITY</span><div className="panel-title-row"><h2>Add something.</h2><IconButton icon={ChevronRight} label="Back to layers" onClick={() => setPanel('layers')} /></div><p>Beautiful pieces.<br />Made to become yours.</p></div>
      <label className="search-field"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a section" aria-label="Find a section" /></label>
      <div className="section-library">{SECTION_LIBRARY.filter((item) => `${item.name} ${item.kind}`.toLowerCase().includes(search.toLowerCase())).map(({ kind, name, description, icon: Icon }) => <button key={kind} className={`library-card library-${kind}`} onClick={() => { studio.addSection(kind); setPanel('layers'); }}><span className={`library-preview preview-${kind}`}><Icon size={kind === 'scene' ? 30 : 23} strokeWidth={1.2} />{kind === 'hero' && <i />}</span><strong>{name}</strong><small>{description}</small><span className="library-plus"><Plus size={13} /></span></button>)}</div>
      <div className="accessibility-note sidebar-note"><ShieldCheck size={17} /><p>Every section starts with semantic structure and keyboard support.</p></div>
    </>}
    {panel === 'pages' && <>
      <div className="panel-heading"><span className="eyebrow">THE BIGGER PICTURE</span><div className="panel-title-row"><h2>Your pages</h2><IconButton icon={Plus} label="Add page" onClick={studio.addPage} /></div></div>
      <div className="pages-list">{project.pages.map((item, index) => <button key={item.id} className={`page-list-button ${item.id === page.id ? 'selected' : ''}`} onClick={() => studio.selectPage(item.id)}><File size={15} /><span>{item.name}<small>{index === 0 ? 'Home · index.html' : `${item.slug}.html`}</small></span>{item.id === page.id && <Check size={14} />}</button>)}</div>
      <div className="sidebar-form"><Field label="Page name"><input value={page.name} maxLength={80} onChange={(event) => studio.patchPage({ name: event.target.value })} /></Field><Field label="Page title" hint="Shown in the browser tab and search results."><input value={page.title} maxLength={160} onChange={(event) => studio.patchPage({ title: event.target.value })} /></Field><Field label="Page description"><textarea rows={3} value={page.description} maxLength={300} onChange={(event) => studio.patchPage({ description: event.target.value })} /></Field>{project.pages[0].id !== page.id && <Field label="Page address" hint="Letters, numbers and hyphens."><input value={page.slug} maxLength={64} onChange={(event) => studio.patchPage({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>}<div className="page-actions"><button className="secondary-button" onClick={studio.duplicatePage}><Copy size={14} />Duplicate</button><IconButton icon={Trash2} label="Delete page" disabled={project.pages.length === 1} onClick={studio.removePage} /></div></div>
      <div className="sidebar-spacer" /><div className="project-actions"><button onClick={onNew}>New project<Plus size={14} /></button><button onClick={onOpen}>Open project<ArrowUpRight size={14} /></button><button onClick={onSave}>Save project<ArrowDown size={14} /></button></div>
    </>}
    {panel === 'theme' && <>
      <div className="panel-heading"><span className="eyebrow">SET THE FEELING</span><h2>Color & type</h2><p>A small palette.<br />A whole personality.</p></div>
      <div className="theme-presets">{THEMES.map((theme) => <button key={theme.name} onClick={() => { studio.change((draft) => { draft.theme = { ...draft.theme, background: theme.background, text: theme.text, accent: theme.accent }; draft.pages.forEach((item) => item.sections.forEach((section) => { section.background = theme.background; section.color = theme.text; section.scene.background = theme.background; })); }); studio.announce(`${theme.name} palette applied.`); }}><span className="palette-dots">{theme.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><span>{theme.name}</span><ChevronRight size={12} /></button>)}</div>
      <div className="sidebar-form"><h3>Project palette</h3><ColorField label="Page background" value={project.theme.background} onChange={(background) => studio.change((draft) => { draft.theme.background = background; })} /><ColorField label="Page text" value={project.theme.text} onChange={(text) => studio.change((draft) => { draft.theme.text = text; })} /><ColorField label="Accent" value={project.theme.accent} onChange={(accent) => studio.change((draft) => { draft.theme.accent = accent; })} />
        <Field label="Typography"><select value={project.theme.fontPair} onChange={(event) => studio.change((draft) => { draft.theme.fontPair = event.target.value as typeof draft.theme.fontPair; })}><option value="editorial">Editorial · expressive serif</option><option value="modern">Modern · clean sans</option><option value="humanist">Humanist · warm & open</option></select></Field>
        <div className={`type-specimen type-${project.theme.fontPair}`}><span>Aa</span><p>Some things<br />just feel right.</p></div>
        <Slider label="Corner softness" value={project.theme.radius} min={0} max={40} step={2} suffix=" px" onChange={(radius) => studio.change((draft) => { draft.theme.radius = radius; })} />
        <Field label="Site language"><select value={project.language} onChange={(event) => studio.change((draft) => { draft.language = event.target.value as 'en' | 'ko'; })}><option value="en">English</option><option value="ko">한국어</option></select></Field>
      </div>
    </>}
    {panel === 'accessibility' && <AccessibilityPanel studio={studio} />}
  </aside>;
}
function AccessibilityPanel({ studio }: { studio: Studio }) {
  const issues = auditProject(studio.project);
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  return <><div className="panel-heading"><span className="eyebrow">A WEB FOR EVERYONE</span><h2>Thoughtful by design.</h2><p>Good design includes<br />the people using it.</p></div><div className={`audit-summary ${errors ? 'audit-error' : ''}`}><ShieldCheck size={24} /><strong>{errors ? `${errors} thing${errors === 1 ? '' : 's'} to fix` : 'Good foundations.'}</strong><span>{warnings ? `${warnings} suggestion${warnings === 1 ? '' : 's'} to consider` : 'No automated errors found'}</span></div><div className="audit-list">{issues.map((issue) => <button key={issue.id} className={`audit-item audit-${issue.severity}`} onClick={() => { studio.selectPage(issue.pageId); if (issue.sectionId) studio.setSelectedId(issue.sectionId); }}><span className="audit-severity">{issue.severity}</span><strong>{issue.title}</strong><span>{issue.description}</span><small>View on canvas <ArrowUpRight size={11} /></small></button>)}{issues.length === 0 && <p className="empty-copy">Your automated checks are clear. Take a moment to try your page with a keyboard, too.</p>}</div><div className="accessibility-note sidebar-note"><ShieldCheck size={17} /><p>Checks help with contrast, headings, labels and links. They do not certify WCAG conformance. Review real content with real people.</p></div></>;
}
