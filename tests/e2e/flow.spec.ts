import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from '@cantoo/pdf-lib';
import { inspectPdf, currentLocalDate } from './pdf-utils';

async function selectTemplate(page: import('@playwright/test').Page, name: string) {
  const radio = page.getByRole('radio', { name: new RegExp(name, 'i') });
  await radio.click();
  await expect(radio).toHaveAttribute('aria-checked', 'true');
}

async function fillDetails(page: import('@playwright/test').Page, recipientName = 'Jo Li') {
  await page.getByLabel('Recipient name').fill(recipientName);
  await page.getByLabel('Description').fill('For contributing to the SIESCOMS leadership programme.');
  await page.getByLabel('Event or programme').fill('SIESCOMS Leadership Forum');
  await page.getByLabel('Event date').fill(currentLocalDate());
  await page.locator('#signatories-0-name').fill('Asha Shah');
  await page.locator('#signatories-0-designation').fill('Dean, Academics');
}

test('validates the three-step flow, exports one vector PDF, repeats a name, edits, and exits cleanly', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create a certificate' })).toBeVisible();
  await page.getByRole('button', { name: 'Create certificate' }).click();
  await expect(page).toHaveURL(/\/create\/template$/u);
  const continueTemplate = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueTemplate).toBeDisabled();
  await expect(page.getByRole('radio')).toHaveCount(8);
  const firstTemplate = page.getByRole('radio').first();
  await firstTemplate.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio').nth(1)).toHaveAttribute('aria-checked', 'true');
  for (const name of ['Navy and Gold', 'Ivory Ornate', 'Gold Waves', 'Blue Geometric', 'Black and Gold Ribbon', 'Gold Frame', 'Soft Script', 'Victorian Ornate']) {
    await selectTemplate(page, name);
  }
  await selectTemplate(page, 'Navy and Gold');
  await continueTemplate.click();
  await expect(page).toHaveURL(/\/create\/details$/u);

  const continueDetails = page.getByRole('button', { name: 'Continue', exact: true });
  await continueDetails.click();
  await expect(page).toHaveURL(/\/create\/details$/u);
  await expect(page.getByRole('alert').getByText('Fix these details before continuing')).toBeVisible();

  await fillDetails(page, '🙂');
  await continueDetails.click();
  await expect(page.getByText(/cannot print “🙂”/u)).toBeVisible();
  await fillDetails(page, 'Jo Li');
  await page.getByRole('checkbox', { name: /Leave the name blank/u }).check();
  await expect(page.getByLabel('Recipient name')).toBeDisabled();
  await continueDetails.click();
  await expect(page).toHaveURL(/\/create\/export$/u);
  await expect(page.getByText('A blank name line is reserved for handwriting.')).toBeVisible();

  const downloadedBlank = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const blankDownload = await downloadedBlank;
  const blankPath = testInfo.outputPath('manual-name.pdf');
  await blankDownload.saveAs(blankPath);
  expect(blankDownload.suggestedFilename()).toMatch(/^Certificate_Blank_Participation_\d{4}-\d{2}-\d{2}\.pdf$/u);
  const blankPdf = await inspectPdf(blankPath);
  expect(blankPdf.pdfWidthPt).toBeCloseTo(841.89, 2);
  expect(blankPdf.pdfHeightPt).toBeCloseTo(595.28, 2);
  expect(blankPdf.width).toBe(1754);
  expect(blankPdf.height).toBe(1240);
  expect(blankPdf.sizeBytes).toBeLessThan(2.5 * 1024 * 1024);
  expect(blankPdf.text).toContain('Asha Shah');
  expect(blankPdf.text).toContain('Dean, Academics');
  expect(blankDownload.failure()).resolves.toBeNull();

  const postDownload = page.getByRole('region', { name: /Certificate downloaded/u });
  await expect(postDownload).toBeVisible();
  await page.getByRole('button', { name: 'Yes, change the name' }).click();
  await expect(page.getByRole('heading', { name: 'Change the recipient name' })).toBeVisible();
  await expect(page.getByLabel('Locked certificate details')).toBeVisible();
  await page.getByRole('checkbox', { name: /Leave the name blank/u }).uncheck();
  await page.getByLabel('Recipient name').fill('Meera Fernandes');

  for (let repeat = 0; repeat < 3; repeat += 1) {
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF' }).click();
    const file = await downloaded;
    const outputPath = testInfo.outputPath(`recipient-${repeat + 1}.pdf`);
    await file.saveAs(outputPath);
    expect(file.suggestedFilename()).toMatch(/^Certificate_Meera_Fernandes_Participation_\d{4}-\d{2}-\d{2}\.pdf$/u);
    const pdf = await inspectPdf(outputPath);
    expect(pdf.text).toContain('Meera Fernandes');
    await expect(page.getByRole('region', { name: /Certificate downloaded/u })).toBeVisible();
    if (repeat < 2) await page.getByRole('button', { name: 'Yes, change the name' }).click();
  }

  await page.getByRole('button', { name: 'Edit certificate' }).click();
  await expect(page).toHaveURL(/\/create\/details$/u);
  await expect(page.getByLabel('Recipient name')).toHaveValue('Meera Fernandes');
  await expect(page.getByLabel('Event or programme')).toHaveValue('SIESCOMS Leadership Forum');
  await continueDetails.click();
  const lastDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const finalFile = await lastDownload;
  await finalFile.failure();
  await expect(page.getByRole('region', { name: /Certificate downloaded/u })).toBeVisible();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const exitDialog = page.getByRole('dialog', { name: 'Exit and clear everything saved in this browser?' });
  await expect(exitDialog).toBeVisible();
  await exitDialog.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Exit and clear' }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.getByRole('heading', { name: 'Create a certificate' })).toBeFocused();
  const appKeys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('certifyx:') || key === 'certifyx-draft' || key === 'certifyx-history'));
  expect(appKeys).toEqual([]);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/create\/(details|export)$/u);
  expect(pageErrors).toEqual([]);
});

test('guards direct routes and stays usable at the requested viewport widths', async ({ page }) => {
  await page.goto('/create/export');
  await expect(page).toHaveURL(/\/create\/template$/u);
  await selectTemplate(page, 'Blue Geometric');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/create\/details$/u);

  for (const width of [320, 360, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  }
  await page.goto('/create/export');
  await expect(page).toHaveURL(/\/create\/details$/u);
  await expect(page.getByRole('heading', { name: 'Enter certificate details' })).toBeVisible();
});

test('exports a white-background template using short hex colours', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create certificate' }).click();
  await selectTemplate(page, 'Gold Waves');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await fillDetails(page, 'Jo Li');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pendingDownload;
  const outputPath = testInfo.outputPath('gold-waves.pdf');
  await download.saveAs(outputPath);
  const pdf = await PDFDocument.load(new Uint8Array(await readFile(outputPath)));
  expect(pdf.getPageCount()).toBe(1);
  await expect(page.locator('.toastError')).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Certificate downloaded/u })).toBeVisible();
});

test('uses cached app assets after first load while offline and tolerates corrupt storage', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.evaluate(() => localStorage.setItem('certifyx:v2:draft', '{broken json'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Create a certificate' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Create a certificate' })).toBeVisible();
  await context.setOffline(false);
});

test('validates, orients, stores, toggles, replaces, and removes signature images', async ({ page }) => {
  await page.goto('/create/template');
  await selectTemplate(page, 'Gold Frame');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const upload = page.getByLabel('Upload signature for signatory 1');

  await upload.setInputFiles({ name: 'badge.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.getByRole('alert').getByText(/SVG files are not supported/u)).toBeVisible();
  await upload.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024) });
  await expect(page.getByRole('alert').getByText(/2 MB or smaller/u)).toBeVisible();
  await upload.setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a valid JPEG') });
  await expect(page.getByRole('alert')).toBeVisible();

  const originalJpeg = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="#fff"/><path d="M80 300 C260 40 400 360 590 170 S930 300 1120 80" fill="none" stroke="#172238" stroke-width="22" stroke-linecap="round"/></svg>'))
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  await page.getByRole('checkbox', { name: 'Keep original image background' }).uncheck();
  await upload.setInputFiles({ name: 'rotated-signature.jpg', mimeType: 'image/jpeg', buffer: originalJpeg });
  await expect(page.getByAltText('Signature uploaded for signatory 1')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('certifyx:v2:sig:1'))).not.toBeNull();
  const firstDataUrl = await page.evaluate(() => localStorage.getItem('certifyx:v2:sig:1'));
  const firstBytes = Buffer.from((firstDataUrl ?? '').split(',')[1] ?? '', 'base64');
  const firstMeta = await sharp(firstBytes).metadata();
  expect(firstMeta.width).toBeLessThanOrEqual(900);
  expect(firstMeta.height).toBeGreaterThan(firstMeta.width ?? 0);
  const firstRaw = await sharp(firstBytes).ensureAlpha().raw().toBuffer();
  expect(firstRaw[3]).toBe(0);
  expect(firstBytes.byteLength).toBeLessThan(250 * 1024);

  await page.getByRole('checkbox', { name: 'Keep original image background' }).check();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('certifyx:v2:sig:1'))).not.toBe(firstDataUrl);
  const keptDataUrl = await page.evaluate(() => localStorage.getItem('certifyx:v2:sig:1'));
  const keptBytes = Buffer.from((keptDataUrl ?? '').split(',')[1] ?? '', 'base64');
  const keptRaw = await sharp(keptBytes).ensureAlpha().raw().toBuffer();
  expect(keptRaw[3]).toBe(255);
  expect(keptBytes.byteLength).toBeLessThan(250 * 1024);

  await upload.setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from(firstBytes) });
  await expect(page.getByAltText('Signature uploaded for signatory 1')).toBeVisible();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('button', { name: 'Upload a signature image' })).toBeVisible();
});

test('supports the mobile edit-preview switch and Escape in confirmation dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/create/template');
  await selectTemplate(page, 'Ivory Ornate');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.livePreview')).toBeHidden();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.livePreview')).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Reset details' }).click();
  await expect(page.getByRole('dialog', { name: 'Reset certificate details?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
