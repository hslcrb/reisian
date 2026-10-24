/** Versioned portable project format. All authoring remains visual. */
export type SectionKind = 'hero' | 'text' | 'image' | 'gallery' | 'scene' | 'cards' | 'quote' | 'contact' | 'spacer';
export type MotionPreset = 'none' | 'reveal' | 'parallax' | 'rotate';
export type SceneShape = 'torus' | 'sphere' | 'wave' | 'knot';
export type FontPair = 'editorial' | 'modern' | 'humanist';
export interface SceneSettings {
  shape: SceneShape;
  color: string;
  background: string;
  speed: number;
  scale: number;
  wireframe: boolean;
}
export interface Section {
  id: string;
  kind: SectionKind;
  name: string;
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  image: string;
  imageAlt: string;
  background: string;
  color: string;
  align: 'left' | 'center' | 'right';
  padding: number;
  columns: 1 | 2 | 3;
  motion: MotionPreset;
  scene: SceneSettings;
  hidden: boolean;
}
export interface Page {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  sections: Section[];
}
export interface Project {
  schemaVersion: 1;
  id: string;
  name: string;
  language: 'en' | 'ko';
  theme: {
    background: string;
    text: string;
    accent: string;
    fontPair: FontPair;
    radius: number;
  };
  pages: Page[];
  updatedAt: string;
}
export interface AuditIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  pageId: string;
  sectionId?: string;
}
export interface ExportFile { path: string; content: string; }
export interface ExportBundle { files: ExportFile[]; }
export type RenderMode = 'editor' | 'preview' | 'export';
export interface RenderOptions { mode?: RenderMode; selectedId?: string; reducedMotion?: boolean; }
export interface NativeBridge {
  platform: string;
  saveProject: (content: string, name: string) => Promise<{ canceled: boolean; filePath?: string }>;
  openProject: () => Promise<{ canceled: boolean; content?: string; filePath?: string }>;
  exportSite: (files: ExportFile[], name: string) => Promise<{ canceled: boolean; filePath?: string }>;
}
