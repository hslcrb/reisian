import { useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImagePlus, Layers, SlidersHorizontal, Sparkles, Trash2, Type } from 'lucide-react';
import type { Section } from '../core/types';
import type { Studio } from './useStudio';
import { ColorField, Field, IconButton, Slider, ValidatedInput } from './controls';
import { safeHref } from '../core/model';
import { contrastRatio } from '../core/audit';
import { CollectionEditor } from './CollectionEditor';

export function Inspector({ studio }: { studio: Studio }) {
  const [tab, setTab] = useState<'content' | 'style' | 'motion'>('content');
  const imageInput = useRef<HTMLInputElement>(null);
  const section = studio.selected;
  if (!section) return <aside className="inspector inspector-empty" aria-label="Section inspector"><div className="empty-orbit"><SlidersHorizontal size={24} /></div><h2>Your details, here.</h2><p>Select a section on your canvas to give it your own character.</p></aside>;
  const patch = (values: Partial<Section>) => studio.patchSection(section.id, values);
  const index = studio.page.sections.findIndex((item) => item.id === section.id);
  const scene = section.kind === 'scene' || section.kind === 'hero';
  const ratio = contrastRatio(section.color || studio.project.theme.text, section.background || studio.project.theme.background);
  const loadImage = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { studio.announce('Choose a PNG, JPEG, WebP or GIF image.'); return; }
    if (file.size > 3 * 1024 * 1024) { studio.announce('Choose an image smaller than 3 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { patch({ image: String(reader.result) }); studio.announce('Image added. Remember to describe it for screen readers.'); };
    reader.onerror = () => studio.announce('This image could not be read. Please try another file.');
    reader.readAsDataURL(file);
  };
  return <aside className="inspector" aria-label="Section inspector">
    <div className="panel-heading"><span className="eyebrow">MAKE IT YOURS</span><div className="panel-title-row"><h2>{section.name}</h2><span className="kind-pill">{section.kind}</span></div></div>
    <div className="inspector-tabs" role="group" aria-label="Inspector view">
      <button type="button" className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')} aria-pressed={tab === 'content'}><Type size={14} />Content</button>
      <button type="button" className={tab === 'style' ? 'active' : ''} onClick={() => setTab('style')} aria-pressed={tab === 'style'}><SlidersHorizontal size={14} />Style</button>
      <button type="button" className={tab === 'motion' ? 'active' : ''} onClick={() => setTab('motion')} aria-pressed={tab === 'motion'}><Sparkles size={14} />Motion</button>
    </div>
    <div className="inspector-scroll" key={section.id}>
      {tab === 'content' && <>
        <div className="inspector-group"><h3>Words & meaning</h3>
          <Field label="Layer name"><input value={section.name} maxLength={80} onChange={(event) => patch({ name: event.target.value })} /></Field>
          {section.kind !== 'spacer' && <>
            <Field label="Eyebrow"><input value={section.eyebrow} maxLength={300} placeholder="A small introduction" onChange={(event) => patch({ eyebrow: event.target.value })} /></Field>
            <Field label={section.kind === 'quote' ? 'Quote' : 'Heading'}><textarea rows={3} value={section.title} maxLength={2000} onChange={(event) => patch({ title: event.target.value })} /></Field>
            <Field label="Description"><textarea rows={4} value={section.body} maxLength={20000} placeholder="A story worth telling…" onChange={(event) => patch({ body: event.target.value })} /></Field>
          </>}
          <p className="quiet-note"><Type size={13} />Double-click words on the canvas to edit them.</p>
        </div>
        {section.kind !== 'spacer' && <div className="inspector-group"><h3>A next step</h3>
          <Field label="Button label"><input value={section.buttonLabel} maxLength={200} placeholder="Explore the collection" onChange={(event) => patch({ buttonLabel: event.target.value })} /></Field>
          <Field label="Button destination" hint="Use #section-id, a page filename, https://, or mailto:."><ValidatedInput value={section.buttonHref} placeholder="#contact" onChange={(buttonHref) => patch({ buttonHref })} validate={(value) => safeHref(value) ? null : "Enter a safe page, anchor, email or web link."} /></Field>
        </div>}
        {['cards', 'gallery'].includes(section.kind) && <CollectionEditor section={section} onChange={(items) => patch({ items })} announce={studio.announce} />}
        {['image', 'hero'].includes(section.kind) && <div className="inspector-group"><h3>Image</h3>
          <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { void loadImage(event.target.files?.[0]); event.target.value = ''; }} />
          {section.image && <img className="image-swatch" src={section.image} alt="Selected image preview" />}
          <button className="secondary-button full-width" onClick={() => imageInput.current?.click()}><ImagePlus size={15} />{section.image ? 'Replace image' : 'Choose an image'}</button>
          <Field label="Image description" hint="Describe what matters. Leave empty only for decoration."><textarea rows={2} value={section.imageAlt} maxLength={500} placeholder="Soft light on a ceramic vase" onChange={(event) => patch({ imageAlt: event.target.value })} /></Field>
          {section.image && <button className="text-button" onClick={() => patch({ image: '', imageAlt: '' })}>Remove image</button>}
          <p className="field-hint">PNG, JPG, WebP or GIF · up to 3 MB. Images travel inside your project.</p>
        </div>}
      </>}
      {tab === 'style' && <>
        <div className="inspector-group"><h3>Color story</h3><ColorField label="Background" value={section.background || studio.project.theme.background} onChange={(background) => patch({ background })} /><ColorField label="Text" value={section.color || studio.project.theme.text} onChange={(color) => patch({ color })} />
          <div className={`contrast-readout ${ratio >= 4.5 ? 'passes' : 'needs-care'}`}><span className="contrast-sample">Aa</span><span><strong>{ratio.toFixed(2)}:1</strong><small>{ratio >= 4.5 ? 'Meets normal-text contrast' : 'Increase contrast for readability'}</small></span></div>
        </div>
        <div className="inspector-group"><h3>Room to breathe</h3><Slider label="Vertical space" value={section.padding} min={24} max={160} step={4} suffix=" px" onChange={(padding) => patch({ padding })} />
          <Field label="Alignment"><span className="segmented align-control">{([{ value: 'left', icon: AlignLeft }, { value: 'center', icon: AlignCenter }, { value: 'right', icon: AlignRight }] as const).map(({ value, icon }) => <IconButton key={value} icon={icon} label={`Align ${value}`} active={section.align === value} onClick={() => patch({ align: value })} />)}</span></Field>
          {['gallery', 'cards'].includes(section.kind) && <Field label="Columns"><select value={section.columns} onChange={(event) => patch({ columns: Number(event.target.value) as 1 | 2 | 3 })}><option value={1}>One, focused</option><option value={2}>Two, balanced</option><option value={3}>Three, rhythmic</option></select></Field>}
        </div>
        {scene && <div className="inspector-group"><h3><span className="tiny-orbit" />Sculpture</h3>
          <Field label="Shape"><select value={section.scene.shape} onChange={(event) => patch({ scene: { ...section.scene, shape: event.target.value as Section['scene']['shape'] } })}><option value="torus">Orbit · torus</option><option value="sphere">Pebble · sphere</option><option value="wave">Ripple · wave</option><option value="knot">Intertwine · knot</option></select></Field>
          <ColorField label="Object color" value={section.scene.color} onChange={(color) => patch({ scene: { ...section.scene, color } })} />
          <ColorField label="Scene background" value={section.scene.background} onChange={(background) => patch({ scene: { ...section.scene, background } })} />
          <Slider label="Object scale" value={section.scene.scale} min={0.5} max={2} step={0.1} suffix="×" onChange={(scale) => patch({ scene: { ...section.scene, scale } })} />
          <label className="toggle-row"><span>Wireframe texture</span><input type="checkbox" checked={section.scene.wireframe} onChange={(event) => patch({ scene: { ...section.scene, wireframe: event.target.checked } })} /></label>
        </div>}
      </>}
      {tab === 'motion' && <>
        <div className="motion-intro"><span className="motion-orbit" /><h3>A little movement.<br />A lot of feeling.</h3><p>Choose a gesture. The page does the rest.</p></div>
        <div className="inspector-group"><h3>On scroll</h3><div className="motion-options">{([{ value: 'none', name: 'Still', desc: 'Let the composition speak' }, { value: 'reveal', name: 'Arrive', desc: 'A gentle fade into view' }, { value: 'parallax', name: 'Drift', desc: 'Move softly with the scroll' }, { value: 'rotate', name: 'Turn', desc: 'A subtle change of perspective' }] as const).map((motion) => <button type="button" key={motion.value} className={section.motion === motion.value ? 'selected' : ''} onClick={() => patch({ motion: motion.value })} aria-pressed={section.motion === motion.value}><span className={`motion-mini ${motion.value}`} /><span><strong>{motion.name}</strong><small>{motion.desc}</small></span><span className="radio-dot" /></button>)}</div></div>
        {scene && <div className="inspector-group"><h3>Object motion</h3><Slider label="Rotation speed" value={section.scene.speed} min={0} max={2} step={0.1} suffix="×" onChange={(speed) => patch({ scene: { ...section.scene, speed } })} /><p className="field-hint">Set to 0 for a still sculpture. Visitors can pause all movement.</p></div>}
        <div className="accessibility-note"><Layers size={16} /><p>Reduced-motion preferences are respected automatically. Your story stays visible with motion turned off.</p></div>
      </>}
      <div className="inspector-group section-actions"><h3>Arrange section</h3><div className="section-action-row"><IconButton icon={ArrowUp} label="Move section up" disabled={index === 0} onClick={() => studio.moveSection(section.id, index - 1)} /><IconButton icon={ArrowDown} label="Move section down" disabled={index === studio.page.sections.length - 1} onClick={() => studio.moveSection(section.id, index + 1)} /><IconButton icon={Copy} label="Duplicate section" onClick={() => studio.duplicateSection(section.id)} /><IconButton icon={section.hidden ? EyeOff : Eye} label={section.hidden ? 'Show section' : 'Hide section'} onClick={() => patch({ hidden: !section.hidden })} /><IconButton icon={Trash2} label="Delete section" className="danger-button" onClick={() => studio.removeSection(section.id)} /></div></div>
    </div>
    <div className="inspector-foot"><span className="small-dot" />Changes appear on your canvas</div>
  </aside>;
}
