import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'design/source/siescoms-logo.jpg');
const outputPath = resolve(root, 'public/assets/siescoms-logo.png');
const metadata = await sharp(sourcePath).metadata();
if (!metadata.width || !metadata.height) throw new Error('The official logo dimensions could not be read.');

const { data, info } = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const background = sampleBackground(data, info.width, info.height, info.channels);
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let sourceIndex = 0, targetIndex = 0; sourceIndex < data.length; sourceIndex += info.channels, targetIndex += 4) {
  const red = data[sourceIndex];
  const green = data[sourceIndex + 1];
  const blue = data[sourceIndex + 2];
  const distance = Math.hypot(red - background[0], green - background[1], blue - background[2]);
  const alpha = Math.max(0, Math.min(255, Math.round(((distance - 7) / 42) * 255)));
  if (alpha < 7) {
    rgba[targetIndex] = background[0];
    rgba[targetIndex + 1] = background[1];
    rgba[targetIndex + 2] = background[2];
    rgba[targetIndex + 3] = 0;
    continue;
  }
  // The JPEG pixel is a matte blend. Remove the estimated background contribution
  // before saving alpha so edges do not keep a cream fringe on white paper.
  const amount = alpha / 255;
  rgba[targetIndex] = unmatte(red, background[0], amount);
  rgba[targetIndex + 1] = unmatte(green, background[1], amount);
  rgba[targetIndex + 2] = unmatte(blue, background[2], amount);
  rgba[targetIndex + 3] = alpha;
}

await mkdir(dirname(outputPath), { recursive: true });
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(outputPath);
console.log(`Wrote transparent logo at ${info.width} × ${info.height}px.`);
if (info.width < 390 || info.height < 165) {
  console.log(`Source is below the recommended 390 × 165px; kept native resolution and did not upscale.`);
}

if (process.argv.includes('--check')) await writeBackgroundCheck(outputPath, info.width, info.height);

function unmatte(value, matte, alpha) {
  return Math.max(0, Math.min(255, Math.round(matte + (value - matte) / alpha)));
}

function sampleBackground(pixels, width, height, channels) {
  const patchWidth = Math.max(1, Math.floor(width * .06));
  const patchHeight = Math.max(1, Math.floor(height * .06));
  const samples = [];
  for (const [left, top] of [[0, 0], [width - patchWidth, 0], [0, height - patchHeight], [width - patchWidth, height - patchHeight]]) {
    for (let y = top; y < top + patchHeight; y += 1) {
      for (let x = left; x < left + patchWidth; x += 1) {
        const index = (y * width + x) * channels;
        samples.push([pixels[index], pixels[index + 1], pixels[index + 2]]);
      }
    }
  }
  return [0, 1, 2].map((channel) => Math.round(samples.reduce((sum, sample) => sum + sample[channel], 0) / samples.length));
}

async function writeBackgroundCheck(pngPath, width, height) {
  const scale = 4;
  const backgrounds = ['#ffffff', '#fcfaf5', '#e6e8ec'];
  const panels = await Promise.all(backgrounds.map((color) => sharp(pngPath).flatten({ background: color }).resize(width * scale, height * scale, { kernel: 'nearest' }).png().toBuffer()));
  const panelWidth = width * scale;
  const reviewPath = resolve(root, 'node_modules/.cache/certifyx-logo-background-check.png');
  await mkdir(dirname(reviewPath), { recursive: true });
  await sharp({ create: { width: panelWidth * panels.length, height: height * scale, channels: 3, background: '#fff' } })
    .composite(panels.map((input, index) => ({ input, left: index * panelWidth, top: 0 })))
    .png().toFile(reviewPath);
  console.log(`4× white, cream, and grey comparison: ${reviewPath}`);
}
