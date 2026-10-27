import { expect, test, type Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { currentLocalDate, inspectPdf } from './pdf-utils';

const templates = ['Navy and Gold', 'Ivory Ornate', 'Gold Waves', 'Blue Geometric', 'Black and Gold Ribbon', 'Gold Frame', 'Soft Script', 'Victorian Ornate'];

test('typical and worst-case PDF pages match the shared SVG preview for all eight templates', async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1920, height: 1400 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create certificate' }).click();
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  for (const [index, templateName] of templates.entries()) {
    if (index > 0) {
      await page.getByRole('button', { name: /Choose template/u }).click();
      await page.getByRole('radio', { name: new RegExp(templateName, 'i') }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
    }

    await fillTypical(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await compareDownloadedPage(page, testInfo.outputPath(`typical-${index + 1}.pdf`), `${templateName}: typical`);

    await page.getByRole('button', { name: /Enter details/u }).click();
    await fillWorstCase(page);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await compareDownloadedPage(page, testInfo.outputPath(`worst-${index + 1}.pdf`), `${templateName}: worst-case`);
    if (index < templates.length - 1) await page.getByRole('button', { name: /Enter details/u }).click();
  }
});

async function fillTypical(page: Page) {
  await page.getByLabel('Certificate type').selectOption('Achievement');
  const name = page.getByLabel('Recipient name');
  if (await name.isDisabled()) await page.getByRole('checkbox', { name: /Leave the name blank/u }).uncheck();
  await name.fill("D'Souza");
  await page.getByLabel('Description').fill('For contributing to the SIESCOMS student leadership programme.');
  await page.getByLabel('Event or programme').fill('SIESCOMS Leadership Forum');
  await page.getByLabel('Event date').fill(currentLocalDate());
  await page.getByLabel('Reference ID (optional)').fill('SIES/2026/PARITY');
  const second = page.getByRole('checkbox', { name: 'Second signatory' });
  if (await second.isChecked()) await second.uncheck();
  await page.locator('#signatories-0-name').fill('Asha Shah');
  await page.locator('#signatories-0-designation').fill('Dean, Academics');
}

async function fillWorstCase(page: Page) {
  await page.getByLabel('Certificate type').selectOption('Custom');
  await page.getByLabel('Custom type').fill('W'.repeat(24));
  await page.getByRole('checkbox', { name: /Leave the name blank/u }).uncheck().catch(() => undefined);
  await page.getByLabel('Recipient name').fill('WM'.repeat(20));
  await page.getByLabel('Description').fill('W'.repeat(200));
  await page.getByLabel('Event or programme').fill('W'.repeat(70));
  await page.getByLabel('Event date').fill(currentLocalDate());
  await page.getByLabel('Reference ID (optional)').fill('W'.repeat(28));
  const second = page.getByRole('checkbox', { name: 'Second signatory' });
  if (!(await second.isChecked())) await second.check();
  await page.locator('#signatories-0-name').fill('W'.repeat(32));
  await page.locator('#signatories-0-designation').fill('W'.repeat(40));
  await page.locator('#signatories-1-name').fill('M'.repeat(32));
  await page.locator('#signatories-1-designation').fill('M'.repeat(40));
}

async function compareDownloadedPage(page: Page, path: string, label: string) {
  await expect(page).toHaveURL(/\/create\/export$/u);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.exportWorkspace').evaluate((element) => {
    const workspace = element as HTMLElement;
    workspace.style.display = 'block';
    workspace.style.width = '1754px';
    const preview = workspace.querySelector<HTMLElement>('.exportPreview');
    if (preview) { preview.style.width = '1754px'; preview.style.overflow = 'visible'; }
    const canvas = workspace.querySelector<HTMLElement>('.exportCanvas');
    if (canvas) { canvas.style.width = '1754px'; canvas.style.overflow = 'visible'; }
    const svg = workspace.querySelector<SVGSVGElement>('.certificateSvg');
    if (svg) { svg.style.width = '1754px'; svg.style.height = '1240px'; svg.style.maxWidth = 'none'; }
  });
  const previewPng = await page.locator('.exportCanvas .certificateSvg').screenshot({ animations: 'disabled' });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadEvent;
  await download.saveAs(path);
  const rendered = await inspectPdf(path);
  expect(rendered.width, label).toBe(1754);
  expect(rendered.height, label).toBe(1240);
  expect(rendered.text, label).toContain('SIESCOMS');
  const preview = PNG.sync.read(previewPng);
  const pdf = PNG.sync.read(rendered.png);
  expect(preview.width, `${label} preview width`).toBe(pdf.width);
  expect(preview.height, `${label} preview height`).toBe(pdf.height);
  const differences = pixelmatch(preview.data, pdf.data, undefined, pdf.width, pdf.height);
  const ratio = differences / (pdf.width * pdf.height);
  expect(ratio, `${label} pixel difference ${(ratio * 100).toFixed(2)}%`).toBeLessThan(0.015);
}
