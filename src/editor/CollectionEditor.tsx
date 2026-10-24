import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { createSectionItem, safeHref } from '../core/model';
import type { Section, SectionItem } from '../core/types';
import { Field, IconButton, ValidatedInput } from './controls';

export function CollectionEditor({ section, onChange, announce }: { section: Section; onChange: (items: SectionItem[]) => void; announce: (message: string) => void }) {
  const fallback = useMemo(() => Array.from({ length: 3 }, (_, index) => createSectionItem(section.kind === 'gallery' ? 'gallery' : 'cards', index)), [section.id, section.kind]);
  const items = section.items ?? fallback;
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageTarget = useRef<string | null>(null);
  const patch = (id: string, values: Partial<SectionItem>) => onChange(items.map((item) => item.id === id ? { ...item, ...values } : item));
  const move = (index: number, next: number) => { const result = [...items]; const [item] = result.splice(index, 1); result.splice(next, 0, item); onChange(result); };
  const upload = (file?: File) => {
    if (!file || !imageTarget.current) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 3 * 1024 * 1024) { announce('Choose a PNG, JPG, WebP or GIF image smaller than 3 MB.'); return; }
    const target = imageTarget.current;
    const reader = new FileReader();
    reader.onload = () => { patch(target, { image: String(reader.result) }); announce('Image added to your collection. Add a description, too.'); };
    reader.onerror = () => announce('Could not read that image. Please try another file.');
    reader.readAsDataURL(file);
  };
  return <div className="inspector-group"><h3>{section.kind === 'gallery' ? 'Gallery items' : 'Collection items'}<span className="items-count">{items.length} / 12</span></h3><input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ''; }} />
    <div className="collection-items">{items.map((item, index) => <div className="collection-item" key={item.id}><button className="collection-item-heading" aria-expanded={openId === item.id} aria-controls={`item-fields-${item.id}`} onClick={() => setOpenId(openId === item.id ? null : item.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title || 'Untitled item'}</strong><span>{openId === item.id ? '−' : '+'}</span></button>{openId === item.id && <div className="collection-item-fields" id={`item-fields-${item.id}`}><Field label={`Item ${index + 1} title`}><input value={item.title} maxLength={2000} onChange={(event) => patch(item.id, { title: event.target.value })} /></Field><Field label={`Item ${index + 1} description`}><textarea rows={3} value={item.body} maxLength={10000} onChange={(event) => patch(item.id, { body: event.target.value })} /></Field>{item.image && <img className="image-swatch" src={item.image} alt="Collection image preview" />}<button className="secondary-button full-width" onClick={() => { imageTarget.current = item.id; imageInput.current?.click(); }}><ImagePlus size={14} />{item.image ? 'Replace image' : 'Choose item image'}</button><Field label={`Item ${index + 1} image description`}><input value={item.imageAlt} maxLength={500} onChange={(event) => patch(item.id, { imageAlt: event.target.value })} /></Field>{item.image && <button className="text-button" onClick={() => patch(item.id, { image: '', imageAlt: '' })}>Remove item image</button>}<Field label={`Item ${index + 1} link`}><ValidatedInput value={item.href} placeholder="https:// or a page.html" onChange={(href) => patch(item.id, { href })} validate={(value) => safeHref(value) ? null : "Enter a safe page, anchor, email or web link."} /></Field><div className="collection-actions"><IconButton icon={ArrowUp} label={`Move item ${index + 1} up`} disabled={index === 0} onClick={() => move(index, index - 1)} /><IconButton icon={ArrowDown} label={`Move item ${index + 1} down`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} /><IconButton icon={Trash2} label={`Remove item ${index + 1}`} onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))} /></div></div>}</div>)}</div>
    <button className="secondary-button full-width add-item" disabled={items.length >= 12} onClick={() => { const item = createSectionItem(section.kind === 'gallery' ? 'gallery' : 'cards', items.length); onChange([...items, item]); setOpenId(item.id); }}><Plus size={14} />Add an item</button>
  </div>;
}
