import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('edit visually, undo, add a 3D section and persist the project', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('textbox', { name: 'Heading', exact: true });
  await expect(heading).toBeVisible();
  await heading.fill('A quieter kind of beautiful.');
  await expect(page.frameLocator('iframe[title="Website canvas"]').locator('h1')).toContainText('A quieter kind of beautiful.');
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
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole('list', { name: 'Page sections' })).toContainText('3D');
});

test('canvas selection and inline text editing use the shared renderer', async ({ page }) => {
  await page.goto('/');
  const canvas = page.frameLocator('iframe[title="Website canvas"]');
  const title = canvas.locator('h1');
  await title.dblclick();
  await title.fill('Made by hand. Made for you.');
  await title.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Heading', exact: true })).toHaveValue('Made by hand. Made for you.');
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

test('studio exposes accessible controls without serious automated violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export website', exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).exclude('iframe').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('mobile artboard and reduced motion preserve content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mobile viewport', exact: true }).click();
  await expect(page.locator('.canvas-artboard')).toHaveClass(/device-mobile/);
  await page.getByRole('button', { name: 'Preview website', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1')).toBeVisible();
});
