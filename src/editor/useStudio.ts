import { useCallback, useEffect, useRef, useState } from 'react';
import type { Page, Project, Section, SectionKind } from '../core/types';
import { createProject, createSection, parseProject, serializeProject } from '../core/model';
import { createHistory, pushHistory, redoHistory, undoHistory } from './history';
import { copyPage, hasRoomForSections } from './operations';

export const STORAGE_KEY = 'reisian.project.v1';
function initialProject(): { project: Project; recovered: boolean } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { project: parseProject(saved), recovered: true };
  } catch { /* Invalid or unavailable storage must never prevent the studio from opening. */ }
  return { project: createProject('atelier'), recovered: false };
}
export function useStudio() {
  const [initial] = useState(initialProject);
  const [history, setHistory] = useState(() => createHistory(initial.project));
  const project = history.present;
  const [pageId, setPageId] = useState(project.pages[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(project.pages[0].sections[0]?.id ?? null);
  const [saveError, setSaveError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [notice, setNotice] = useState(initial.recovered ? 'Your last canvas is right here.' : 'A little inspiration, ready to make yours.');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announce = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 6500);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const page = project.pages.find((item) => item.id === pageId) ?? project.pages[0];
  const selected = page.sections.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    if (!project.pages.some((item) => item.id === pageId)) setPageId(project.pages[0].id);
    if (selectedId && !page.sections.some((item) => item.id === selectedId)) setSelectedId(page.sections[0]?.id ?? null);
  }, [project, page, pageId, selectedId]);
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, serializeProject(project)); setSaveStatus('saved'); setSaveError(''); }
      catch (error) { setSaveStatus('error'); setSaveError(error instanceof DOMException && error.name === 'QuotaExceededError' ? 'Local storage is full. Save a project file to keep your work.' : error instanceof Error ? error.message : 'Local storage is unavailable. Save a project file to keep your work.'); }
    }, 350);
    return () => clearTimeout(timer);
  }, [project]);
  const change = useCallback((edit: (draft: Project) => void) => {
    setHistory((current) => {
      const draft = structuredClone(current.present);
      edit(draft);
      if (JSON.stringify(draft) === JSON.stringify(current.present)) return current;
      draft.updatedAt = new Date().toISOString();
      return pushHistory(current, draft);
    });
  }, []);
  const patchSection = useCallback((id: string, patch: Partial<Section>) => change((draft) => {
    const section = draft.pages.flatMap((item) => item.sections).find((item) => item.id === id);
    if (section) Object.assign(section, patch);
  }), [change]);
  const patchPage = useCallback((patch: Partial<Omit<Page, 'id' | 'sections'>>) => change((draft) => {
    Object.assign(draft.pages.find((item) => item.id === page.id)!, patch);
  }), [change, page.id]);
  const selectPage = (id: string) => {
    const next = project.pages.find((item) => item.id === id);
    if (!next) return;
    setPageId(id); setSelectedId(next.sections[0]?.id ?? null);
  };
  const addSection = (kind: SectionKind) => {
    if (!hasRoomForSections(project, page.id)) { announce('This project supports 100 sections per page and 300 in total. Remove a section before adding more.'); return; }
    const section = createSection(kind);
    change((draft) => {
      const target = draft.pages.find((item) => item.id === page.id)!;
      const index = target.sections.findIndex((item) => item.id === selectedId);
      target.sections.splice(index < 0 ? target.sections.length : index + 1, 0, section);
    });
    setSelectedId(section.id); announce(`${section.name} added to your page.`);
  };
  const moveSection = (id: string, targetIndex: number) => change((draft) => {
    const sections = draft.pages.find((item) => item.id === page.id)!.sections;
    const from = sections.findIndex((item) => item.id === id);
    if (from < 0) return;
    const [section] = sections.splice(from, 1);
    sections.splice(Math.max(0, Math.min(targetIndex, sections.length)), 0, section);
  });
  const duplicateSection = (id: string) => {
    if (!hasRoomForSections(project, page.id)) { announce('Section limit reached. Remove a section before duplicating.'); return; }
    const original = page.sections.find((item) => item.id === id);
    if (!original) return;
    const duplicate = { ...structuredClone(original), id: crypto.randomUUID(), name: `${original.name.slice(0, 115)} copy` };
    change((draft) => {
      const sections = draft.pages.find((item) => item.id === page.id)!.sections;
      sections.splice(sections.findIndex((item) => item.id === id) + 1, 0, duplicate);
    });
    setSelectedId(duplicate.id); announce('Section duplicated. Make it your own.');
  };
  const removeSection = (id: string) => {
    change((draft) => {
      const target = draft.pages.find((item) => item.id === page.id)!;
      target.sections = target.sections.filter((item) => item.id !== id);
    });
    announce('Section removed. Undo is always here.');
  };
  const addPage = () => {
    if (project.pages.length >= 30 || project.pages.reduce((sum, item) => sum + item.sections.length, 0) >= 300) { announce('This project supports up to 30 pages and 300 sections.'); return; }
    const id = crypto.randomUUID();
    const used = new Set(project.pages.map((item) => item.slug));
    let number = project.pages.length + 1;
    while (used.has(`page-${number}`)) number++;
    const next: Page = { id, name: `Page ${number}`, slug: `page-${number}`, title: `Page ${number}`, description: '', sections: [createSection('hero')] };
    change((draft) => { draft.pages.push(next); });
    setPageId(id); setSelectedId(next.sections[0].id); announce('A new page, a new possibility.');
  };
  const duplicatePage = () => {
    if (project.pages.length >= 30 || project.pages.reduce((sum, item) => sum + item.sections.length, 0) + page.sections.length > 300) { announce('This project supports up to 30 pages and 300 sections.'); return; }
    const used = new Set(project.pages.map((item) => item.slug));
    const base = `${(page.slug || 'home').slice(0, 65).replace(/-+$/, '')}-copy`; let slug = base; let suffix = 2;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    const duplicate = copyPage(page, slug);
    change((draft) => { draft.pages.push(duplicate); });
    setPageId(duplicate.id); setSelectedId(duplicate.sections[0]?.id ?? null); announce('Page duplicated.');
  };
  const removePage = () => {
    if (project.pages.length < 2) { announce('Keep at least one page in your project.'); return; }
    change((draft) => { draft.pages = draft.pages.filter((item) => item.id !== page.id); });
    announce('Page removed. You can undo this.');
  };
  const loadProject = (next: Project) => {
    setHistory((current) => pushHistory(current, next)); setPageId(next.pages[0].id); setSelectedId(next.pages[0].sections[0]?.id ?? null);
    announce(`${next.name} is ready.`);
  };
  const undo = useCallback(() => { setHistory(undoHistory); }, []);
  const redo = useCallback(() => { setHistory(redoHistory); }, []);
  return { project, page, selected, selectedId, setSelectedId, history, change, patchSection, patchPage, selectPage, addSection, moveSection, duplicateSection, removeSection, addPage, duplicatePage, removePage, loadProject, undo, redo, saveStatus, saveError, notice, announce };
}
export type Studio = ReturnType<typeof useStudio>;
