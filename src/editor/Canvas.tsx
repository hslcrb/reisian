import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ArrowDown, Minus, MousePointer2, Plus, Scan, Sparkles } from 'lucide-react';
import type { Project } from '../core/types';
import { renderPageDocument } from '../core/render';
import type { Studio } from './useStudio';
import { IconButton } from './controls';
import { applyCanvasEdits } from './canvasEdits';

export type Device = 'desktop' | 'tablet' | 'mobile';
const WIDTHS = { desktop: 1200, tablet: 768, mobile: 390 };
export interface CanvasHandle { flushProject: () => Promise<Project>; }
export const Canvas = forwardRef<CanvasHandle, { studio: Studio; device: Device; preview: boolean }>(function Canvas({ studio, device, preview }, handle) {
  const latest = useRef(studio); latest.current = studio;
  const ready = useRef(false);
  const pending = useRef(new Map<string, { resolve: (project: Project) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [bounds, setBounds] = useState({ width: 900, height: 720 });
  const [zoom, setZoom] = useState<number | null>(null);
  const scroll = useRef(0);
  const selectedRef = useRef(studio.selectedId);
  const pageRef = useRef(studio.page.id);
  const [renderProject, setRenderProject] = useState(studio.project);
  const scrollSelection = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setRenderProject(studio.project), 120);
    return () => clearTimeout(timer);
  }, [studio.project]);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) => setBounds({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(viewport.current); return () => observer.disconnect();
  }, []);
  const width = WIDTHS[device];
  const scale = zoom ?? Math.min(1, Math.max(0.2, (bounds.width - 64) / width));
  const height = Math.max(420, (bounds.height - 48) / scale);
  const visiblePageId = renderProject.pages.some((page) => page.id === studio.page.id) ? studio.page.id : renderProject.pages[0].id;
  const html = useMemo(() => renderPageDocument(renderProject, visiblePageId, { mode: preview ? 'preview' : 'editor' }), [renderProject, visiblePageId, preview]);
  const post = (data: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(data, '*');
  useEffect(() => { ready.current = false; }, [html]);
  useImperativeHandle(handle, () => ({
    flushProject() {
      if (!ready.current || !frame.current?.contentWindow) return Promise.resolve(latest.current.project);
      return new Promise<Project>((resolve, reject) => {
        const requestId = crypto.randomUUID();
        const timer = setTimeout(() => { pending.current.delete(requestId); reject(new Error('The canvas is still responding. Please try saving again.')); }, 2500);
        pending.current.set(requestId, { resolve, reject, timer });
        post({ type: 'reisian:flush', requestId });
      });
    },
  }), []);
  useEffect(() => () => { for (const request of pending.current.values()) { clearTimeout(request.timer); request.reject(new Error('The canvas was closed before saving.')); } pending.current.clear(); }, []);
  useEffect(() => {
    selectedRef.current = studio.selectedId;
    scrollSelection.current = true;
    post({ type: 'reisian:select', sectionId: studio.selectedId });
    if (studio.selectedId && !preview) post({ type: 'reisian:scrollTo', sectionId: studio.selectedId });
  }, [studio.selectedId, preview]);
  useEffect(() => {
    if (pageRef.current !== studio.page.id) { scroll.current = 0; pageRef.current = studio.page.id; }
  }, [studio.page.id]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      const message = event.data;
      if (message.type === 'reisian:select' && typeof message.sectionId === 'string' && studio.page.sections.some((section) => section.id === message.sectionId)) studio.setSelectedId(message.sectionId);
      if (message.type === 'reisian:flushed' && typeof message.requestId === 'string') {
        const request = pending.current.get(message.requestId);
        if (request) {
          clearTimeout(request.timer); pending.current.delete(message.requestId);
          try {
            const snapshot = applyCanvasEdits(latest.current.project, message.edits);
            latest.current.change((draft) => Object.assign(draft, applyCanvasEdits(draft, message.edits)));
            request.resolve(snapshot);
          } catch (error) { request.reject(error instanceof Error ? error : new Error('Could not read the canvas changes.')); }
        }
      }
      if (['reisian:edit', 'reisian:item-edit'].includes(message.type) && !preview) {
        const edit = { sectionId: message.sectionId, field: message.field, value: message.value, ...(message.type === 'reisian:item-edit' ? { itemId: message.itemId } : {}) };
        try {
          applyCanvasEdits(latest.current.project, [edit]);
          latest.current.change((draft) => Object.assign(draft, applyCanvasEdits(draft, [edit])));
        } catch (error) { latest.current.announce(error instanceof Error ? error.message : 'Could not apply this text.'); }
      }
      if (message.type === 'reisian:navigate' && preview && typeof message.pageId === 'string' && studio.project.pages.some((page) => page.id === message.pageId)) { scroll.current = 0; studio.selectPage(message.pageId); }
      if (message.type === 'reisian:shortcut' && ['save', 'preview', 'return-editor', 'undo', 'redo', 'insert'].includes(message.action)) window.dispatchEvent(new CustomEvent('reisian:shortcut', { detail: message.action }));
      if (message.type === 'reisian:scroll' && Number.isFinite(message.top)) scroll.current = Math.max(0, message.top);
      if (message.type === 'reisian:ready') {
        ready.current = true;
        post({ type: 'reisian:restoreScroll', top: scroll.current });
        post({ type: 'reisian:select', sectionId: selectedRef.current });
        if (scrollSelection.current && selectedRef.current && !preview) { post({ type: 'reisian:scrollTo', sectionId: selectedRef.current }); scrollSelection.current = false; }
      }
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [studio.page, studio.setSelectedId, studio.patchSection, preview]);
  return <main className={`canvas-area ${preview ? 'is-preview' : ''}`} aria-label={preview ? 'Website preview' : 'Design canvas'}>
    <div className="canvas-context"><div><span className="canvas-mode-dot" /><span>{studio.page.name}</span><span className="context-divider">/</span><span>{preview ? 'Preview' : 'Design'}</span></div><span className="canvas-context-hint">{preview ? 'Explore your site as a visitor would' : <><MousePointer2 size={12} />Click to select · double-click to write</>}</span></div>
    <div className="canvas-viewport" ref={viewport}><div className={`canvas-artboard device-${device}`} style={{ width: width * scale, height: height * scale }}><iframe title="Website canvas" ref={frame} sandbox="allow-scripts" srcDoc={html} style={{ width, height, transform: `scale(${scale})` }} /></div></div>
    <div className="canvas-bottom"><div className="canvas-meta"><span>{width} × {Math.round(height)}</span><span className="meta-dot">·</span><span>{device[0].toUpperCase() + device.slice(1)}</span></div><div className="zoom-control"><IconButton icon={Minus} label="Zoom out" disabled={scale <= 0.25} onClick={() => setZoom(Math.max(0.25, Math.round((scale - 0.1) * 100) / 100))} /><button className="zoom-number" title="Fit canvas" onClick={() => setZoom(null)}>{Math.round(scale * 100)}%<span>{zoom === null ? 'Fit' : ''}</span></button><IconButton icon={Plus} label="Zoom in" disabled={scale >= 1.5} onClick={() => setZoom(Math.min(1.5, Math.round((scale + 0.1) * 100) / 100))} /><span className="zoom-divider" /><IconButton icon={Scan} label="Fit canvas to workspace" onClick={() => setZoom(null)} /></div><span className="canvas-bottom-note"><ArrowDown size={12} />Scroll to explore</span></div>
  </main>;
});
