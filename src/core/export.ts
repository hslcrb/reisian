import type { ExportBundle, Project } from './types';
import { parseProject } from './model';
import { pageFileName, renderPageDocument, runtimeSource } from './render';
import { siteStyles } from './styles';
/** Builds an entirely offline static site. Image data remains embedded in HTML. */
export function createExportBundle(project: Project): ExportBundle {
  const safe = parseProject(JSON.stringify(project));
  const paths = new Set<string>();
  const pages = safe.pages.map((page) => {
    const path = pageFileName(safe, page);
    if (paths.has(path))
      throw new Error('Two pages have the same export filename. Give every page a unique slug.');
    paths.add(path);
    return { path, content: renderPageDocument(safe, page.id, { mode: 'export' }) };
  });
  return {
    files: [
      ...pages,
      { path: 'styles.css', content: siteStyles },
      { path: 'runtime.js', content: runtimeSource() },
    ],
  };
}
