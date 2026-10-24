import type { AuditIssue, Project } from './types';
import { safeColor, safeHref } from './model';
export function contrastRatio(a: string, b: string): number {
  if (!safeColor(a) || !safeColor(b)) return 1;
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Authoring assistance, not an accessibility certification. */
export function auditProject(project: Project): AuditIssue[] {
  const issues: AuditIssue[] = [];
  for (const page of project.pages) {
    let count = 0;
    const add = (
      severity: AuditIssue['severity'],
      title: string,
      description: string,
      sectionId?: string,
    ) =>
      issues.push({
        id: `${page.id}-${sectionId || 'page'}-${count++}`,
        severity,
        title,
        description,
        pageId: page.id,
        ...(sectionId ? { sectionId } : {}),
      });
    if (!page.title.trim())
      add(
        'warning',
        'Give this page a descriptive title',
        'The page title identifies this page in browser tabs, bookmarks, and assistive technology.',
      );
    if (!page.description.trim())
      add(
        'info',
        'Add a page description',
        'A short summary helps people understand this page when it is shared or found in search.',
      );
    const visible = page.sections.filter((s) => !s.hidden);
    if (!visible.some((s) => s.title.trim() && s.kind !== 'spacer'))
      add(
        'warning',
        'Add a visible page heading',
        'A clear heading helps visitors understand the purpose of this page.',
      );
    for (const s of visible) {
      if (s.kind === 'spacer') continue;
      const foreground = s.color || project.theme.text,
        background = s.background || project.theme.background;
      const ratio = contrastRatio(foreground, background);
      if (ratio < 4.5)
        add(
          'error',
          'Text contrast needs attention',
          `Text and background have a ${ratio.toFixed(2)}:1 contrast ratio. Aim for at least 4.5:1 for normal text; check images and interactive states manually.`,
          s.id,
        );
      if (s.image && !s.imageAlt.trim())
        add(
          'error',
          'Add an image alternative',
          'Describe what this image communicates. Decorative images can be ignored by assistive technology, but confirm that choice manually.',
          s.id,
        );
      if (s.kind === 'image' && !s.image)
        add(
          'info',
          'Choose an image',
          'This section currently shows a placeholder. Upload an image and describe it before publishing.',
          s.id,
        );
      if (s.buttonLabel && !s.buttonHref)
        add(
          'warning',
          'Choose a destination for this link',
          'A button label needs a meaningful link destination.',
          s.id,
        );
      if (s.buttonHref && !safeHref(s.buttonHref))
        add(
          'error',
          'This link destination is unsafe',
          'Use a web address, email address, telephone number, page slug, or section anchor.',
          s.id,
        );
      if (s.buttonLabel && /^(click here|here|read more|more)$/i.test(s.buttonLabel.trim()))
        add(
          'warning',
          'Use a descriptive link label',
          'Explain where this link goes so it makes sense outside the surrounding sentence.',
          s.id,
        );
      if (s.buttonHref.startsWith('#') && s.buttonHref !== '#main' && s.buttonHref !== '#') {
        const anchor = s.buttonHref.slice(1);
        if (
          !visible.some(
            (target) => target.id === anchor || (target.kind === 'contact' && anchor === 'contact'),
          )
        )
          add(
            'warning',
            'This section link has no destination',
            'Choose an existing section on this page or use a valid page link.',
            s.id,
          );
      }
      for (const item of s.items ?? []) {
        if (item.image && !item.imageAlt.trim())
          add(
            'error',
            'Add an image alternative',
            `Describe the image in “${item.title || 'Untitled item'}” so its meaning is available to visitors using assistive technology.`,
            s.id,
          );
        if (item.href && !safeHref(item.href))
          add(
            'error',
            'This item link destination is unsafe',
            'Use a web address, email address, telephone number, page slug, or section anchor.',
            s.id,
          );
      }
      if (s.motion !== 'none')
        add(
          'info',
          'Review movement and reading order',
          'Reduced-motion preferences and the pause control are supported. Preview this effect and check that all text remains easy to read.',
          s.id,
        );
    }
  }
  return issues;
}
