#!/usr/bin/env node

import * as path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

interface EffectDataRaw {
  key: string;
  title: string;
  id: string;
  ingredients: string[];
  description: string;
  base_cost: number;
  base_mag: number;
  base_dur: number;
  gold_val: number;
  harmful: boolean;
}

interface IngredientEffectRaw {
  fkey: string;
  magnitude?: number;
  duration?: number;
  value?: number;
}

interface IngredientDataRaw {
  image: string;
  title: string;
  pkey: string;
  origin: string;
  id: string;
  collected_by: string;
  effects: IngredientEffectRaw[];
  value: number;
  weight: number;
  merchant_avail: string;
  garden: number | null;
}

interface EffectDataBuild extends Omit<EffectDataRaw, 'ingredients'> {
  ingredients: number[];
}

interface IngredientEffectBuild extends Omit<IngredientEffectRaw, 'fkey'> {
  fkey: number;
}

interface IngredientDataBuild extends Omit<IngredientDataRaw, 'pkey' | 'effects'> {
  pkey: number;
  effects: IngredientEffectBuild[];
}

function sortByStringKey<T>(items: T[], getKey: (item: T) => string): T[] {
  return items.slice().sort((a, b) => {
    const ka = getKey(a);
    const kb = getKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');

  const effectsPath = path.join(projectRoot, 'db', 'effects_db.json');
  const ingredientsPath = path.join(projectRoot, 'db', 'ingredients_db.json');

  const outDir = path.join(projectRoot, 'dist', 'db');
  const outEffectsPath = path.join(outDir, 'effects_db.json');
  const outIngredientsPath = path.join(outDir, 'ingredients_db.json');

  const [effectsDataRawText, ingredientsDataRawText] = await Promise.all([
    readFile(effectsPath, 'utf8'),
    readFile(ingredientsPath, 'utf8'),
  ]);

  const effectsDataRaw = JSON.parse(effectsDataRawText) as EffectDataRaw[];
  const ingredientsDataRaw = JSON.parse(ingredientsDataRawText) as IngredientDataRaw[];

  // Deterministic IDs.
  const effectsSorted = sortByStringKey(effectsDataRaw, (e) => e.key);
  const ingredientsSorted = sortByStringKey(ingredientsDataRaw, (i) => i.pkey);

  const effectKeyToId = new Map<string, number>();
  for (let i = 0; i < effectsSorted.length; i++) effectKeyToId.set(effectsSorted[i].key, i);

  const ingredientKeyToId = new Map<string, number>();
  for (let i = 0; i < ingredientsSorted.length; i++) ingredientKeyToId.set(ingredientsSorted[i].pkey, i);

  const ingredientsBuild: IngredientDataBuild[] = ingredientsSorted.map((ing) => {
    const pkey = ingredientKeyToId.get(ing.pkey);
    if (pkey === undefined) throw new Error(`Missing ingredient id mapping for ${ing.pkey}`);

    const effectsBuild = (ing.effects ?? [])
      .map((eff): IngredientEffectBuild | null => {
        const fkey = effectKeyToId.get(eff.fkey);
        if (fkey === undefined) return null;
        return {
          fkey,
          magnitude: eff.magnitude,
          duration: eff.duration,
          value: eff.value,
        };
      })
      .filter((x): x is IngredientEffectBuild => x !== null);

    return {
      image: ing.image,
      title: ing.title,
      pkey,
      origin: ing.origin,
      id: ing.id,
      collected_by: ing.collected_by,
      effects: effectsBuild,
      value: ing.value,
      weight: ing.weight,
      merchant_avail: ing.merchant_avail,
      garden: ing.garden ?? null,
    };
  });

  const effectsBuild: EffectDataBuild[] = effectsSorted.map((eff) => {
    const ingredientIds: number[] = (eff.ingredients ?? [])
      .map((ingredientKey) => ingredientKeyToId.get(ingredientKey))
      .filter((id): id is number => id !== undefined);

    return {
      key: eff.key,
      title: eff.title,
      id: eff.id,
      ingredients: ingredientIds,
      description: eff.description,
      base_cost: eff.base_cost,
      base_mag: eff.base_mag,
      base_dur: eff.base_dur,
      gold_val: eff.gold_val,
      harmful: eff.harmful,
    };
  });

  await mkdir(outDir, { recursive: true });

  // No pretty-print to keep size smaller.
  await Promise.all([
    writeFile(outIngredientsPath, JSON.stringify(ingredientsBuild), 'utf8'),
    writeFile(outEffectsPath, JSON.stringify(effectsBuild), 'utf8'),
  ]);

  process.stdout.write(
    `Generated compressed DBs -> ${path.relative(projectRoot, outIngredientsPath)}, ${path.relative(projectRoot, outEffectsPath)}\n`
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
