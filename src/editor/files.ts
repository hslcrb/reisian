import type { Project } from '../core/types';
import { serializeProject } from '../core/model';
import { createExportBundle } from '../core/export';
export const safeFilename = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'reisian-project';
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export async function saveProjectFile(project: Project): Promise<boolean> {
  const content = serializeProject(project);
  if (window.reisian)
    return !(await window.reisian.saveProject(content, safeFilename(project.name))).canceled;
  downloadBlob(
    new Blob([content], { type: 'application/json' }),
    `${safeFilename(project.name)}.reisian`,
  );
  return true;
}
export async function exportProject(project: Project): Promise<boolean> {
  const bundle = createExportBundle(project);
  if (window.reisian)
    return !(await window.reisian.exportSite(bundle.files, safeFilename(project.name))).canceled;
  const { default: JSZip } = await import('jszip');
  const archive = new JSZip();
  for (const file of bundle.files) archive.file(file.path, file.content);
  downloadBlob(
    await archive.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
    `${safeFilename(project.name)}-website.zip`,
  );
  return true;
}
