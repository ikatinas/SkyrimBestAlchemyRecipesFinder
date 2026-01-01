#!/usr/bin/env node

import * as path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

interface EffectData {
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

interface IngredientEffect {
  fkey: string;
  magnitude?: number;
  duration?: number;
  value?: number;
  effectData?: EffectData;
}

interface IngredientData {
  image: string;
  title: string;
  pkey: string;
  origin: string;
  id: string;
  collected_by: string;
  effects: IngredientEffect[];
  value: number;
  weight: number;
  merchant_avail: string;
  garden: null;
}

interface Recipe {
  ingredientKeys: string[];
  ingredients: IngredientData[];
  effects: (Required<Pick<IngredientEffect, 'fkey' | 'magnitude' | 'duration' | 'value'>> & {
    effectData?: EffectData;
  })[];
}

function asNumberOrDefault(value: number | undefined | null, defaultValue: number): number {
  return value === undefined || value === null ? defaultValue : value;
}

function buildRecipesDB(effectsData: EffectData[], ingredientsData: IngredientData[]): Recipe[] {
  const effectByKey = new Map<string, EffectData>(effectsData.map((eff) => [eff.key, eff]));

  const recipes2: Recipe[] = [];
  const recipes3: Recipe[] = [];

  for (let index1 = 0; index1 < ingredientsData.length; index1++) {
    const ingredient1 = ingredientsData[index1];

    for (let index2 = index1 + 1; index2 < ingredientsData.length; index2++) {
      const ingredient2 = ingredientsData[index2];

      const twoIngredientsEffects: Recipe['effects'] = [];
      for (const i1_ef of ingredient1.effects) {
        const i2_ef = ingredient2.effects.find((e) => e.fkey === i1_ef.fkey);
        if (!i2_ef) continue;

        twoIngredientsEffects.push({
          fkey: i2_ef.fkey,
          magnitude: Math.max(
            asNumberOrDefault(i1_ef.magnitude, 1),
            asNumberOrDefault(i2_ef.magnitude, 1)
          ),
          duration: Math.max(
            asNumberOrDefault(i1_ef.duration, 1),
            asNumberOrDefault(i2_ef.duration, 1)
          ),
          value: Math.max(asNumberOrDefault(i1_ef.value, 1), asNumberOrDefault(i2_ef.value, 1)),
          effectData: effectByKey.get(i2_ef.fkey),
        });
      }

      if (!twoIngredientsEffects.length) continue;

      const alreadyExists = recipes2.some((rec) =>
        rec.ingredientKeys.every(
          (ingredientKey) => ingredientKey === ingredient1.pkey || ingredientKey === ingredient2.pkey
        )
      );
      if (alreadyExists) continue;

      recipes2.push({
        ingredientKeys: [ingredient1.pkey, ingredient2.pkey],
        ingredients: [ingredient1, ingredient2],
        effects: twoIngredientsEffects,
      });

      for (let index3 = index2 + 1; index3 < ingredientsData.length; index3++) {
        const ingredient3 = ingredientsData[index3];

        const thirdIngredientEffects = ingredient3.effects.filter(
          (i3_ef) =>
            !twoIngredientsEffects.some((existingEf) => existingEf.fkey === i3_ef.fkey) &&
            (ingredient1.effects.some((i1_ef) => i1_ef.fkey === i3_ef.fkey) ||
              ingredient2.effects.some((i2_ef) => i2_ef.fkey === i3_ef.fkey))
        );

        if (!thirdIngredientEffects.length) continue;

        const threeIngredientsEffects: Recipe['effects'] = [...twoIngredientsEffects];
        for (const i3_ef of thirdIngredientEffects) {
          const i1_ef = ingredient1.effects.find((e) => e.fkey === i3_ef.fkey);
          if (i1_ef) {
            threeIngredientsEffects.push({
              fkey: i1_ef.fkey,
              magnitude: Math.max(
                asNumberOrDefault(i3_ef.magnitude, 1),
                asNumberOrDefault(i1_ef.magnitude, 1)
              ),
              duration: Math.max(
                asNumberOrDefault(i3_ef.duration, 1),
                asNumberOrDefault(i1_ef.duration, 1)
              ),
              value: Math.max(
                asNumberOrDefault(i3_ef.value, 1),
                asNumberOrDefault(i1_ef.value, 1)
              ),
              effectData: effectByKey.get(i1_ef.fkey),
            });
          }

          const i2_ef = ingredient2.effects.find((e) => e.fkey === i3_ef.fkey);
          if (i2_ef) {
            threeIngredientsEffects.push({
              fkey: i2_ef.fkey,
              magnitude: Math.max(
                asNumberOrDefault(i3_ef.magnitude, 1),
                asNumberOrDefault(i2_ef.magnitude, 1)
              ),
              duration: Math.max(
                asNumberOrDefault(i3_ef.duration, 1),
                asNumberOrDefault(i2_ef.duration, 1)
              ),
              value: Math.max(
                asNumberOrDefault(i3_ef.value, 1),
                asNumberOrDefault(i2_ef.value, 1)
              ),
              effectData: effectByKey.get(i2_ef.fkey),
            });
          }
        }

        recipes3.push({
          ingredientKeys: [ingredient1.pkey, ingredient2.pkey, ingredient3.pkey],
          ingredients: [ingredient1, ingredient2, ingredient3],
          effects: threeIngredientsEffects,
        });
      }
    }
  }

  const filteredRecipes3 = recipes3.filter((recipe3) => {
    const matchingRecipes2 = recipes2.filter((recipe2) =>
      recipe2.ingredientKeys.every((ingredient) => recipe3.ingredientKeys.includes(ingredient))
    );

    if (!matchingRecipes2.length) return true;

    const hasIdenticalEffectsOnly = matchingRecipes2.some((recipe2) =>
      recipe3.effects.every((effect3) => recipe2.effects.some((effect2) => effect2.fkey === effect3.fkey))
    );

    return !hasIdenticalEffectsOnly;
  });

  return [...recipes2, ...filteredRecipes3];
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const effectsPath = path.join(projectRoot, 'db', 'effects_db.json');
  const ingredientsPath = path.join(projectRoot, 'db', 'ingredients_db.json');
  const outPath = path.join(projectRoot, 'db', 'build_recipes_db.json');

  const [effectsDataRaw, ingredientsDataRaw] = await Promise.all([
    readFile(effectsPath, 'utf8'),
    readFile(ingredientsPath, 'utf8'),
  ]);

  const effectsData = JSON.parse(effectsDataRaw) as EffectData[];
  const ingredientsData = JSON.parse(ingredientsDataRaw) as IngredientData[];

  const recipes = buildRecipesDB(effectsData, ingredientsData);

  await writeFile(outPath, JSON.stringify(recipes), 'utf8');
  process.stdout.write(`Generated ${recipes.length} recipes -> ${path.relative(projectRoot, outPath)}\n`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
