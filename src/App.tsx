import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Command,
  Eye,
  File,
  FolderOpen,
  Globe2,
  Layers,
  LayoutTemplate,
  Monitor,
  MousePointer2,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  X,
} from 'lucide-react';
import { createProject, parseProject } from './core/model';
import { auditProject } from './core/audit';
import { useStudio } from './editor/useStudio';
import { Canvas, type CanvasHandle, type Device } from './editor/Canvas';
import { Inspector } from './editor/Inspector';
import { Sidebar, type Panel } from './editor/Sidebar';
import { IconButton, Modal } from './editor/controls';
import { exportProject, saveProjectFile } from './editor/files';
import './styles.css';

export default function App() {
  const studio = useStudio();
  const [panel, setPanel] = useState<Panel>('layers');
  const [device, setDevice] = useState<Device>('desktop');
  const [preview, setPreview] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [modal, setModal] = useState<'export' | 'new' | 'help' | null>(null);
  const [exportState, setExportState] = useState<'ready' | 'working' | 'done'>('ready');
  const [exportError, setExportError] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useCallback(async () => {
    setFileBusy(true);
    try {
      if (await saveProjectFile((await canvasRef.current?.flushProject()) ?? studio.project))
        studio.announce('Project saved. Your canvas, safely kept.');
    } catch (error) {
      studio.announce(
        error instanceof Error ? error.message : 'Could not save your project. Please try again.',
      );
    } finally {
      setFileBusy(false);
    }
  }, [studio.project, studio.announce]);
  const importText = (text: string) => {
    try {
      const project = parseProject(text);
      studio.loadProject(project);
      setPreview(false);
      setPanel('layers');
    } catch (error) {
      studio.announce(
        `Could not open project: ${error instanceof Error ? error.message : 'Invalid project file.'} Your current work is unchanged.`,
      );
    }
  };
  const open = async () => {
    try {
      await canvasRef.current?.flushProject();
    } catch (error) {
      studio.announce(error instanceof Error ? error.message : 'Could not read pending edits.');
      return;
    }
    if (!window.reisian) {
      fileInput.current?.click();
      return;
    }
    setFileBusy(true);
    try {
      const result = await window.reisian.openProject();
      if (!result.canceled && result.content) importText(result.content);
    } catch (error) {
      studio.announce(error instanceof Error ? error.message : 'Could not open that project.');
    } finally {
      setFileBusy(false);
    }
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
        return;
      }
      if (editing || modal) return;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? studio.redo() : studio.undo();
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        studio.redo();
      }
      if (event.key === 'Escape') setPreview(false);
      if (event.key.toLowerCase() === 'p' && !modifier) setPreview((current) => !current);
      if (event.key.toLowerCase() === 'a' && !modifier) {
        setPanel('insert');
        setLeftOpen(true);
      }
      if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key) && studio.selectedId) {
        event.preventDefault();
        const index = studio.page.sections.findIndex((item) => item.id === studio.selectedId);
        studio.moveSection(studio.selectedId, index + (event.key === 'ArrowUp' ? -1 : 1));
      }
      if (modifier && event.key.toLowerCase() === 'd' && studio.selectedId) {
        event.preventDefault();
        studio.duplicateSection(studio.selectedId);
      }
    };
    const shortcut = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      if (action === 'save') void save();
      if (modal) return;
      if (action === 'preview') setPreview((value) => !value);
      if (action === 'return-editor') setPreview(false);
      if (action === 'undo') studio.undo();
      if (action === 'redo') studio.redo();
      if (action === 'insert') {
        setPanel('insert');
        setLeftOpen(true);
        setPreview(false);
      }
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('reisian:shortcut', shortcut);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('reisian:shortcut', shortcut);
    };
  }, [save, studio, modal]);
  const togglePreview = async () => {
    try {
      if (!preview) await canvasRef.current?.flushProject();
      setPreview((current) => !current);
    } catch (error) {
      studio.announce(
        error instanceof Error ? error.message : 'Could not read pending canvas edits.',
      );
    }
  };
  const showExport = () => {
    setExportState('ready');
    setExportError('');
    setModal('export');
  };
  const doExport = async () => {
    setExportState('working');
    setExportError('');
    try {
      const exported = await exportProject(
        (await canvasRef.current?.flushProject()) ?? studio.project,
      );
      setExportState(exported ? 'done' : 'ready');
      if (exported) studio.announce('Your website is ready. Unzip it and open index.html.');
    } catch (error) {
      setExportState('ready');
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    }
  };
  const issues = modal === 'export' ? auditProject(studio.project) : [];
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const navigate = (next: Panel) => {
    setPanel(next);
    setLeftOpen(true);
    setPreview(false);
  };
  return (
    <div
      className={`studio ${preview ? 'preview-mode' : ''} ${leftOpen ? '' : 'left-collapsed'} ${rightOpen ? '' : 'right-collapsed'}`}
    >
      <a className="skip-link" href="#studio-tools">
        Skip to design tools
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setModal('new')}
          aria-label="Reisian, start a new project"
        >
          <img src="./brand/reisian-mark.svg" alt="" />
          <span>reisian</span>
          <span className="alpha-label">ALPHA</span>
        </button>
        <div className="topbar-divider" />
        <div className="project-heading">
          <label className="project-title">
            <input
              aria-label="Project name"
              value={studio.project.name}
              maxLength={80}
              onChange={(event) =>
                studio.change((draft) => {
                  draft.name = event.target.value;
                })
              }
            />
            <ChevronDown size={12} />
          </label>
          <span
            className={`save-indicator save-${studio.saveStatus}`}
            title={studio.saveError || undefined}
          >
            <span />
            {studio.saveStatus === 'saved'
              ? 'All changes saved locally'
              : studio.saveStatus === 'saving'
                ? 'Saving your changes…'
                : 'Autosave needs attention · see details'}
          </span>
        </div>
        <div className="topbar-flex" />
        <div className="history-actions">
          <IconButton
            icon={Undo2}
            label="Undo"
            disabled={!studio.history.past.length}
            onClick={studio.undo}
          />
          <IconButton
            icon={Redo2}
            label="Redo"
            disabled={!studio.history.future.length}
            onClick={studio.redo}
          />
        </div>
        <div className="topbar-divider small" />
        <IconButton
          icon={ArrowDownToLine}
          label="Save project file"
          disabled={fileBusy}
          onClick={() => void save()}
        />
        <button
          className={`preview-button ${preview ? 'active' : ''}`}
          onClick={() => void togglePreview()}
          aria-label={preview ? 'Return to editor' : 'Preview website'}
        >
          <Eye size={16} />
          <span>{preview ? 'Back to edit' : 'Preview'}</span>
        </button>
        <button
          className="primary-button export-button"
          onClick={showExport}
          aria-label="Export website"
        >
          Export
          <ArrowUpRight size={16} />
        </button>
      </header>
      <div className="workspace-toolbar">
        <div className="workspace-label">
          <span className="studio-star">✳</span>
          <strong>Your little corner of the internet.</strong>
          <span>Make it feel like you.</span>
        </div>
        <div className="device-switcher" role="group" aria-label="Preview device">
          {(
            [
              { value: 'desktop', icon: Monitor, label: 'Desktop' },
              { value: 'tablet', icon: Tablet, label: 'Tablet' },
              { value: 'mobile', icon: Smartphone, label: 'Mobile' },
            ] as const
          ).map(({ value, icon, label }) => (
            <IconButton
              key={value}
              icon={icon}
              label={`${label} viewport`}
              active={device === value}
              onClick={() => setDevice(value)}
            />
          ))}
        </div>
        <div className="workspace-layout">
          <IconButton
            icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
            label={leftOpen ? 'Hide design panel' : 'Show design panel'}
            onClick={() => setLeftOpen(!leftOpen)}
          />
          <IconButton
            icon={rightOpen ? PanelRightClose : PanelRightOpen}
            label={rightOpen ? 'Hide inspector' : 'Show inspector'}
            onClick={() => setRightOpen(!rightOpen)}
          />
        </div>
      </div>
      <div className="studio-body">
        {!preview && (
          <nav className="tool-rail" id="studio-tools" aria-label="Studio navigation">
            <button
              className={`insert-tool ${panel === 'insert' ? 'active' : ''}`}
              onClick={() => navigate('insert')}
              aria-label="Insert"
              title="Insert sections (A)"
            >
              <Plus size={22} strokeWidth={1.5} />
            </button>
            <span className="rail-divider" />
            {(
              [
                { value: 'layers', icon: Layers, label: 'Layers' },
                { value: 'pages', icon: File, label: 'Pages' },
                { value: 'theme', icon: Palette, label: 'Theme' },
                { value: 'accessibility', icon: ShieldCheck, label: 'Accessibility' },
              ] as const
            ).map(({ value, icon, label }) => (
              <div className="rail-tool" key={value}>
                <IconButton
                  icon={icon}
                  label={label}
                  active={panel === value}
                  onClick={() => navigate(value)}
                />
                <span>{label}</span>
              </div>
            ))}
            <div className="rail-spacer" />
            <IconButton
              icon={FolderOpen}
              label="Open a project"
              disabled={fileBusy}
              onClick={() => void open()}
            />
            <IconButton
              icon={CircleHelp}
              label="Help and shortcuts"
              onClick={() => setModal('help')}
            />
            <span className="rail-version">0.1</span>
          </nav>
        )}
        {!preview && leftOpen && (
          <Sidebar
            studio={studio}
            panel={panel}
            setPanel={setPanel}
            onNew={() => setModal('new')}
            onOpen={() => void open()}
            onSave={() => void save()}
          />
        )}
        <Canvas ref={canvasRef} studio={studio} device={device} preview={preview} />
        {!preview && rightOpen && <Inspector studio={studio} />}
      </div>
      <div
        className={`status-toast ${studio.notice ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={15} />
        <span>{studio.notice}</span>
      </div>
      <input
        hidden
        ref={fileInput}
        type="file"
        accept=".reisian,.json,application/json"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            studio.announce(
              'Project files must be smaller than 10 MB. Your current work is unchanged.',
            );
            return;
          }
          try {
            importText(await file.text());
          } catch {
            studio.announce('Could not read that file. Your current work is unchanged.');
          }
        }}
      />
      <Modal
        title="Ready for the world."
        eyebrow="MADE HERE. YOURS EVERYWHERE."
        open={modal === 'export'}
        onClose={() => {
          if (exportState !== 'working') setModal(null);
        }}
        className="export-modal"
      >
        {exportState === 'done' ? (
          <div className="export-success">
            <span className="success-orbit">
              <Check size={32} />
            </span>
            <h3>Your corner of the internet is ready.</h3>
            <p>
              Unzip your website, then open <strong>index.html</strong> in a browser. Upload the
              folder to any static web host when you're ready to share.
            </p>
            <button className="primary-button" onClick={() => setModal(null)}>
              Back to creating <ArrowUpRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <p className="modal-description">
              Your pages, images, motion and 3D scenes. One portable website, with everything it
              needs.
            </p>
            <div className="export-preview">
              <div className="export-mini-art">
                <span>R</span>
                <i />
                <i />
              </div>
              <div>
                <strong>{studio.project.name}</strong>
                <span>
                  {studio.project.pages.length} page{studio.project.pages.length === 1 ? '' : 's'} ·
                  HTML, CSS & JavaScript
                </span>
                <small>Self-contained ZIP · works offline</small>
              </div>
              <Globe2 size={22} />
            </div>
            <div className="export-benefits">
              <span>
                <Check size={14} />
                No account required
              </span>
              <span>
                <Check size={14} />
                Your files, your host
              </span>
              <span>
                <Check size={14} />
                Motion preferences respected
              </span>
            </div>
            <div className={`export-audit ${errorCount ? 'has-issues' : ''}`}>
              <ShieldCheck size={20} />
              <div>
                <strong>
                  {errorCount
                    ? `${errorCount} accessibility issue${errorCount === 1 ? '' : 's'} to review`
                    : 'Automated foundations checked'}
                </strong>
                <p>
                  {errorCount
                    ? 'You can still export. We recommend reviewing the highlighted sections first.'
                    : 'Take one last look with a keyboard. Automated checks cannot replace a human review.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setModal(null);
                  navigate('accessibility');
                }}
              >
                Review
                <ArrowUpRight size={13} />
              </button>
            </div>
            {exportError && (
              <p className="error-message" role="alert">
                {exportError}
              </p>
            )}
            <div className="modal-footer">
              <button
                className="text-button"
                onClick={() => setModal(null)}
                disabled={exportState === 'working'}
              >
                Keep creating
              </button>
              <button
                className="primary-button"
                disabled={exportState === 'working'}
                onClick={() => void doExport()}
              >
                {exportState === 'working'
                  ? 'Preparing your website…'
                  : window.reisian
                    ? 'Save website ZIP'
                    : 'Download website'}
                <ArrowDownToLine size={16} />
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        title="Every good thing starts somewhere."
        eyebrow="A NEW CANVAS"
        open={modal === 'new'}
        onClose={() => setModal(null)}
        className="template-modal"
      >
        <p className="modal-description">
          Choose a starting point. Every word, color and shape is yours to change.
        </p>
        <div className="template-grid">
          {(
            [
              {
                id: 'atelier',
                name: 'Quiet atelier',
                desc: 'Objects, stories, a slower pace.',
                label: 'EDITORIAL',
              },
              {
                id: 'portfolio',
                name: 'Personal perspective',
                desc: 'Work with a point of view.',
                label: 'PORTFOLIO',
              },
              {
                id: 'blank',
                name: 'An open page',
                desc: 'Room for your own beginning.',
                label: 'BLANK CANVAS',
              },
            ] as const
          ).map((template) => (
            <button
              className={`template-card template-${template.id}`}
              key={template.id}
              onClick={async () => {
                try {
                  await canvasRef.current?.flushProject();
                } catch (error) {
                  studio.announce(
                    error instanceof Error ? error.message : 'Could not read pending edits.',
                  );
                  return;
                }
                studio.loadProject(createProject(template.id));
                setModal(null);
                setPanel('layers');
                setPreview(false);
              }}
            >
              <div className="template-art">
                <span>
                  {template.id === 'atelier'
                    ? 'Objects for a slower world.'
                    : template.id === 'portfolio'
                      ? 'A different perspective.'
                      : '+'}
                </span>
                {template.id !== 'blank' && <i />}
              </div>
              <small>{template.label}</small>
              <strong>{template.name}</strong>
              <p>{template.desc}</p>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
        <div className="new-project-note">
          <ArrowDownToLine size={16} />
          <p>Save your current project before starting a new one.</p>
          <button className="text-button" onClick={() => void save()}>
            Save current project
          </button>
        </div>
      </Modal>
      <Modal
        title="A few things to make it yours."
        eyebrow="WELCOME TO REISIAN"
        open={modal === 'help'}
        onClose={() => setModal(null)}
      >
        <p className="modal-description">
          A visual studio for a more personal web. Pick a section, shape its feeling, and take your
          site anywhere.
        </p>
        <div className="help-steps">
          <div>
            <span>01</span>
            <strong>Choose your pieces</strong>
            <p>
              Add sections from the + menu. Arrange them in Structure with drag, arrows or keyboard.
            </p>
          </div>
          <div>
            <span>02</span>
            <strong>Make the details yours</strong>
            <p>
              Double-click words on the canvas. Use Content, Style and Motion to shape every
              section.
            </p>
          </div>
          <div>
            <span>03</span>
            <strong>Share something good</strong>
            <p>
              Check accessibility, preview every device, then export your self-contained website.
            </p>
          </div>
        </div>
        <h3 className="shortcuts-title">A few useful shortcuts</h3>
        <dl className="shortcut-list">
          <div>
            <dt>Save project</dt>
            <dd>
              <kbd>Ctrl / ⌘</kbd>
              <kbd>S</kbd>
            </dd>
          </div>
          <div>
            <dt>Undo / redo</dt>
            <dd>
              <kbd>Ctrl / ⌘</kbd>
              <kbd>⇧ Z</kbd>
            </dd>
          </div>
          <div>
            <dt>Insert a section</dt>
            <dd>
              <kbd>A</kbd>
            </dd>
          </div>
          <div>
            <dt>Preview / return</dt>
            <dd>
              <kbd>P</kbd>
              <kbd>Esc</kbd>
            </dd>
          </div>
          <div>
            <dt>Move a section</dt>
            <dd>
              <kbd>Alt</kbd>
              <kbd>↑ / ↓</kbd>
            </dd>
          </div>
        </dl>
        <p className="help-foot">Reisian 0.1 · Open source · Made for your imagination.</p>
      </Modal>
    </div>
  );
}
