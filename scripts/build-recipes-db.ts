#!/usr/bin/env node

import * as path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

interface EffectData {
  key: string;
  title: string;
  id: string;
  ingredients: number[];
  description: string;
  base_cost: number;
  base_mag: number;
  base_dur: number;
  gold_val: number;
  harmful: boolean;
}

interface IngredientEffect {
  fkey: number;
  magnitude?: number;
  duration?: number;
  value?: number;
}

interface IngredientData {
  image: unknown;
  title: string;
  pkey: number;
  origin: string;
  id: string;
  collected_by: string;
  effects: IngredientEffect[];
  value: number;
  weight: number;
  merchant_avail: string;
  garden: number | null;
}

interface IngredientsDb {
  meta: {
    spriteSheetUrl: string;
  };
  ingredients: IngredientData[];
}

interface BuildRecipe {
  ingredientKeys: number[];
  effectIds: number[];
}

function sharedEffectIdsBetween(a: IngredientData, b: IngredientData): number[] {
  const aEffects = a.effects ?? [];
  const bEffects = b.effects ?? [];

  const [smaller, bigger] = aEffects.length <= bEffects.length ? [aEffects, bEffects] : [bEffects, aEffects];
  const biggerKeys = new Set(bigger.map((e) => e.fkey));

  const shared: number[] = [];
  for (const eff of smaller) {
    if (biggerKeys.has(eff.fkey)) shared.push(eff.fkey);
  }

  // Unique + deterministic.
  return Array.from(new Set(shared)).sort();
}

function buildRecipesDB(_effectsData: EffectData[], ingredientsData: IngredientData[]): BuildRecipe[] {
  const recipes2: BuildRecipe[] = [];
  const recipes3: BuildRecipe[] = [];

  for (let index1 = 0; index1 < ingredientsData.length; index1++) {
    const ingredient1 = ingredientsData[index1];

    for (let index2 = index1 + 1; index2 < ingredientsData.length; index2++) {
      const ingredient2 = ingredientsData[index2];

      const effectIds2 = sharedEffectIdsBetween(ingredient1, ingredient2);
      if (!effectIds2.length) continue;

      const alreadyExists = recipes2.some((rec) =>
        rec.ingredientKeys.every(
          (ingredientKey) => ingredientKey === ingredient1.pkey || ingredientKey === ingredient2.pkey
        )
      );
      if (alreadyExists) continue;

      recipes2.push({
        ingredientKeys: [ingredient1.pkey, ingredient2.pkey],
        effectIds: effectIds2,
      });

      for (let index3 = index2 + 1; index3 < ingredientsData.length; index3++) {
        const ingredient3 = ingredientsData[index3];

        const effectIds13 = sharedEffectIdsBetween(ingredient1, ingredient3);
        const effectIds23 = sharedEffectIdsBetween(ingredient2, ingredient3);
        const effectIds3 = Array.from(new Set([...effectIds2, ...effectIds13, ...effectIds23])).sort();

        if (!effectIds3.length) continue;

        recipes3.push({
          ingredientKeys: [ingredient1.pkey, ingredient2.pkey, ingredient3.pkey],
          effectIds: effectIds3,
        });
      }
    }
  }

  const filteredRecipes3 = recipes3.filter((recipe3) => {
    const matchingRecipes2 = recipes2.filter((recipe2) =>
      recipe2.ingredientKeys.every((ingredient) => recipe3.ingredientKeys.includes(ingredient))
    );

    if (!matchingRecipes2.length) return true;

    // drop if 3rd ingredient doesn't add any new effects
    const hasSameEffectsAsSomePair = matchingRecipes2.some((recipe2) => {
      if (recipe2.effectIds.length !== recipe3.effectIds.length) return false;
      return recipe2.effectIds.every((id, idx) => id === recipe3.effectIds[idx]);
    });

    return !hasSameEffectsAsSomePair;
  });

  return [...recipes2, ...filteredRecipes3];
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const effectsPath = path.join(projectRoot, 'dist', 'db', 'effects_db.json');
  const ingredientsPath = path.join(projectRoot, 'dist', 'db', 'ingredients_db.json');
  const outPath = path.join(projectRoot, 'dist', 'db', 'build_recipes_db.json');

  const [effectsDataRaw, ingredientsDataRaw] = await Promise.all([
    readFile(effectsPath, 'utf8'),
    readFile(ingredientsPath, 'utf8'),
  ]);

  const effectsData = JSON.parse(effectsDataRaw) as EffectData[];
  const ingredientsDb = JSON.parse(ingredientsDataRaw) as IngredientsDb;
  const ingredientsData = ingredientsDb.ingredients ?? [];

  const recipes = buildRecipesDB(effectsData, ingredientsData);

  await writeFile(outPath, JSON.stringify(recipes), 'utf8');
  process.stdout.write(`Generated ${recipes.length} recipes -> ${path.relative(projectRoot, outPath)}\n`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
