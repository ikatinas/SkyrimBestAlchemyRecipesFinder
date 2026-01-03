#!/usr/bin/env node

import * as path from 'node:path';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

type CliArgs = {
  inputDir: string;
  outputFile: string;
  mapFile: string;
  cols?: number;
  cell?: number;
  padding: number;
};

type SpriteFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type SpriteSheetMap = {
  meta: {
    image: string;
    width: number;
    height: number;
    cell: number;
    padding: number;
    cols: number;
    rows: number;
    count: number;
  };
  sprites: Record<string, SpriteFrame>;
};

function parseArgs(argv: string[], projectRoot: string): CliArgs {
  const inputDefault = path.join(projectRoot, 'db', 'images', 'skyrim');
  const outputDefault = path.join(projectRoot, 'db', 'images', 'skyrim-sprite-sheet.png');

  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return undefined;
    return argv[idx + 1];
  };

  const parseIntOrUndefined = (value: string | undefined): number | undefined => {
    if (value === undefined) return undefined;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const inputDir = get('--input') ?? inputDefault;
  const outputFile = get('--output') ?? outputDefault;
  const mapFile =
    get('--map') ??
    path.join(path.dirname(outputFile), `${path.basename(outputFile, path.extname(outputFile))}.json`);

  const cols = parseIntOrUndefined(get('--cols'));
  const cell = parseIntOrUndefined(get('--cell'));

  const paddingRaw = parseIntOrUndefined(get('--padding'));
  const padding = paddingRaw === undefined ? 0 : Math.max(0, paddingRaw);

  return { inputDir, outputFile, mapFile, cols, cell, padding };
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const args = parseArgs(process.argv.slice(2), projectRoot);

  const entries = await readdir(args.inputDir, { withFileTypes: true });
  const pngEntries = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.png'))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const pngFiles = pngEntries.map((e) => path.join(args.inputDir, e.name));
  const spriteKeys = pngEntries.map((e) => e.name);

  if (pngFiles.length === 0) {
    throw new Error(`No .png files found in ${args.inputDir}`);
  }

  const metas = await Promise.all(pngFiles.map((file) => sharp(file).metadata()));
  const maxWidth = Math.max(...metas.map((m) => m.width ?? 0));
  const maxHeight = Math.max(...metas.map((m) => m.height ?? 0));

  if (maxWidth <= 0 || maxHeight <= 0) {
    throw new Error('Could not read image dimensions (width/height missing).');
  }

  const cellSize = args.cell ?? Math.max(maxWidth, maxHeight);
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new Error(`Invalid --cell value: ${args.cell}`);
  }

  const cols = args.cols && args.cols > 0 ? args.cols : Math.ceil(Math.sqrt(pngFiles.length));
  const rows = Math.ceil(pngFiles.length / cols);

  const padding = args.padding;
  const sheetWidth = cols * cellSize + (cols + 1) * padding;
  const sheetHeight = rows * cellSize + (rows + 1) * padding;

  const composites: sharp.OverlayOptions[] = [];
  const sprites: Record<string, SpriteFrame> = {};

  for (let i = 0; i < pngFiles.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const left = padding + col * (cellSize + padding);
    const top = padding + row * (cellSize + padding);

    const buf = await sharp(pngFiles[i])
      .resize(cellSize, cellSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    composites.push({ input: buf, left, top });

    sprites[spriteKeys[i]] = {
      x: left,
      y: top,
      w: cellSize,
      h: cellSize,
    };
  }

  await mkdir(path.dirname(args.outputFile), { recursive: true });

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(args.outputFile);

  const map: SpriteSheetMap = {
    meta: {
      image: path.basename(args.outputFile),
      width: sheetWidth,
      height: sheetHeight,
      cell: cellSize,
      padding,
      cols,
      rows,
      count: pngFiles.length,
    },
    sprites,
  };

  await writeFile(args.mapFile, JSON.stringify(map, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${args.outputFile} + ${args.mapFile} (${pngFiles.length} images, ${cols}x${rows}, cell=${cellSize}, padding=${padding})`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
