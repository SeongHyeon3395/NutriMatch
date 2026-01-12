import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const inputPath = path.join(projectRoot, 'assets', 'appicon.png');
const resRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const targets = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

async function ensureReadable(filePath) {
  await fs.access(filePath);
}

async function generateOne(outDir, fileName, size) {
  const outPath = path.join(outDir, fileName);
  const buffer = await sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await fs.writeFile(outPath, buffer);
}

async function main() {
  await ensureReadable(inputPath);

  for (const t of targets) {
    const outDir = path.join(resRoot, t.dir);
    await fs.mkdir(outDir, { recursive: true });

    await generateOne(outDir, 'ic_launcher.png', t.size);
    await generateOne(outDir, 'ic_launcher_round.png', t.size);
  }

  console.log('Android launcher icons generated successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
