import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('edit visually, undo, add a 3D section and persist the project', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('textbox', { name: 'Heading', exact: true });
  await expect(heading).toBeVisible();
  await heading.fill('A quieter kind of beautiful.');
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('h1')).toContainText(
    'A quieter kind of beautiful.',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(heading).not.toHaveValue('A quieter kind of beautiful.');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(heading).toHaveValue('A quieter kind of beautiful.');
  await page.getByRole('button', { name: 'Insert a section', exact: true }).click();
  await page.getByRole('button', { name: '3D scene A new dimension' }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Shape', { exact: true }).selectOption('sphere');
  await expect(page.getByLabel('Shape', { exact: true })).toHaveValue('sphere');
  await page.getByRole('button', { name: 'Motion', exact: true }).click();
  await page.getByRole('button', { name: /Drift Move softly/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('reisian.project.v1') || '{}').pages?.[0]?.sections?.some(
          (section: { kind: string; motion: string }) =>
            section.kind === 'scene' && section.motion === 'parallax',
        ),
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByRole('list', { name: 'Page sections' })).toContainText('Scene');
});

test('canvas selection and inline text editing use the shared renderer', async ({ page }) => {
  await page.goto('/');
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const title = canvas.locator('h1');
  await title.dblclick();
  await title.fill('Made by hand. Made for you.');
  await title.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Heading', exact: true })).toHaveValue(
    'Made by hand. Made for you.',
  );
});

test('page management, project save, and standalone export work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Page name', exact: true }).fill('About');
  await page.getByRole('textbox', { name: 'Page title', exact: true }).fill('About our studio');
  await page.getByRole('textbox', { name: 'Page address', exact: true }).fill('about');
  const save = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  expect((await save).suggestedFilename()).toMatch(/\.reisian$/);
  await page.getByRole('button', { name: 'Export website', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download website', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/-website\.zip$/);
});

test('studio exposes accessible controls without serious automated violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export website', exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .exclude('iframe')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations
      .filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))
      .map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
  ).toEqual([]);
});

test('mobile artboard and reduced motion preserve content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mobile viewport', exact: true }).click();
  await expect(page.locator('.canvas-artboard')).toHaveClass(/device-mobile/);
  await page.getByRole('button', { name: 'Preview website', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toBeVisible();
});

test('a pending canvas edit is included in immediate save and preview export', async ({ page }) => {
  await page.goto('/');
  const title = page.frameLocator('iframe[title="Website canvas"]').locator('h1');
  await title.dblclick();
  await title.fill('The very latest words.');
  const save = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project file', exact: true }).click();
  const saved = await save;
  const { readFile } = await import('node:fs/promises');
  const project = JSON.parse(await readFile((await saved.path())!, 'utf8'));
  expect(project.pages[0].sections[0].title).toBe('The very latest words.');
  await page.getByRole('button', { name: 'Preview website', exact: true }).click();
  const previewSave = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project file', exact: true }).click();
  expect((await previewSave).suggestedFilename()).toMatch(/\.reisian$/);
  await page.getByRole('button', { name: 'Export website', exact: true }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download website', exact: true }).click();
  expect((await exported).suggestedFilename()).toMatch(/\.zip$/);
});

test('individual collection items and invalid page addresses preserve valid documents', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('list', { name: 'Page sections' })
    .getByRole('button', { name: 'Gallery', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Item 1 title', exact: true })
    .fill('A personally named object');
  await expect(
    page.frameLocator('iframe').getByText('A personally named object', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Page address', exact: true }).fill('con');
  await expect(page.getByText(/Not applied:.*reserved/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Page name', exact: true }).focus();
  await expect(page.getByRole('textbox', { name: 'Page address', exact: true })).toHaveValue(
    'page-2',
  );
  await expect(page.locator('.save-indicator')).toContainText('All changes saved');
});

test('preview follows a link to a contact section on another page', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Button destination', exact: true })
    .fill('about#contact');
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Page name', exact: true }).fill('About');
  await page.getByRole('textbox', { name: 'Page address', exact: true }).fill('about');
  await page.getByRole('button', { name: 'Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Contact Start a conversation' }).click();
  await page.getByRole('button', { name: 'Preview website', exact: true }).click();
  const canvas = page.frameLocator('iframe');
  await canvas.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('.canvas-context')).toContainText('Home');
  await canvas.getByRole('link', { name: 'Explore our world' }).click();
  await expect(page.locator('.canvas-context')).toContainText('About');
  await expect(canvas.locator('section.contact')).toBeInViewport();
});
