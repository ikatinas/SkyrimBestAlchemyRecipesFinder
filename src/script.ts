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
  relatedRecords?: IngredientData[];
}

interface IngredientData {
  image: string;
  title: string;
  pkey: string;
  id: string;
  collected_by: string;
  effects: IngredientEffect[];
  value: number;
  weight: number;
  merchant_avail: string;
  garden_hf: null;
}

interface IngredientEffect { 
  fkey: string;
  magnitude: number;
  duration: number;
  value: number;
}

interface Recipe {
  ingredients: string[];
  effects: IngredientEffect[];
}

async function fetchData(): Promise<void> {
  const promises: Promise<any>[] = [
    fetch('db/effects_db.json').then((response) => response.json()),
    fetch('db/ingredients_db.json').then((response) => response.json())
  ];

  try {
    const [effectsData, ingredientsData] = await Promise.all(promises);
    const recipes = buildRecipesDB(ingredientsData)
    parseData(recipes, effectsData, ingredientsData);
  } catch (error) {
    console.log('Error:', error);
  }
}

function buildRecipesDB(ingredientsData: IngredientData[]): Recipe[]{
  let recipes2: Recipe[] = [];
  let recipes3: Recipe[] = [];
  // get 2 ingredients recipes
  for (const ingredient1 of ingredientsData) {
    for (const ingredient2 of ingredientsData) { 
      if (ingredient2.pkey == ingredient1.pkey){
        continue;
      }

      const twoIngredientsEffects = ingredient1.effects.filter(i1_ef => 
        ingredient2.effects.some(i2_ef => i2_ef.fkey == i1_ef.fkey)
      )

      if(!twoIngredientsEffects || !twoIngredientsEffects.length){
        continue;
      }

      recipes2.push({
        ingredients: [
          ingredient1.pkey,
          ingredient2.pkey
        ],
        effects: twoIngredientsEffects
      });

      // get 3 ingredients recipes
      for (const ingredient3 of ingredientsData) { 
        if (ingredient1.pkey == ingredient3.pkey || ingredient2.pkey == ingredient3.pkey){
          continue;
        }

        const threeIngredientsEffects = ingredient3.effects.filter(i3_ef => 
          ingredient1.effects.some(i1_ef => i1_ef.fkey == i3_ef.fkey) ||
          ingredient2.effects.some(i2_ef => i2_ef.fkey == i3_ef.fkey)
        )

        recipes3.push({
          ingredients: [
            ingredient1.pkey,
            ingredient2.pkey,
            ingredient3.pkey
          ],
          effects: threeIngredientsEffects
        });

      }
     }
  }
  return [...recipes2, ...recipes3];
}

function parseData(recipes: Recipe[], effectsData: EffectData[], ingredientsData: IngredientData[]): void {
  const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
  
  const sorted = recipes.sort((a, b) => b.effects.length - a.effects.length);
  showRecipes(sorted)

  searchInput.addEventListener('input', () => {
    const searchValue = searchInput.value.toLowerCase();
    const results = sorted.filter((recipe) => {
      return recipe.ingredients.find(ingredient => ingredient.toLowerCase().includes(searchValue)) ||
        recipe.effects.find(effect => effect.fkey.toLowerCase().includes(searchValue));
    });
    showRecipes(results)
  });
}

function findBestRecipees(recipes: Recipe[], effectsData: EffectData[], ingredientsData: IngredientData[]): void {

}

function showRecipes(recipes: Recipe[]): void {
  const resultsList = document.querySelector('#results') as HTMLDivElement;
  resultsList.innerHTML = '';
  recipes.slice(0, 50).forEach((recipe) => {
    const li = document.createElement('li');
    const mainTitleSpan = document.createElement('span');
    mainTitleSpan.textContent = recipe.ingredients.join(", ");

    li.appendChild(mainTitleSpan);

    const subList = document.createElement('ul');
    recipe.effects.forEach((subItem) => {
      const subLi = document.createElement('li');
      subLi.textContent = subItem.fkey;
      subList.appendChild(subLi);
    });

    li.appendChild(subList);

    resultsList.appendChild(li);
  });

}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});