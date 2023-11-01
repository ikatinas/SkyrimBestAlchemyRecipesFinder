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
var allRecipes: Recipe[] = [];
async function fetchData(): Promise<void> {
  const promises: Promise<any>[] = [
    fetch('db/effects_db.json').then((response) => response.json()),
    fetch('db/ingredients_db.json').then((response) => response.json())
  ];

  try {
    const [effectsData, ingredientsData] = await Promise.all(promises);
    const recipes = buildRecipesDB(ingredientsData)
    allRecipes = recipes.sort((a, b) => b.effects.length - a.effects.length);
    showRecipes(allRecipes);
    populateDropdown(effectsData, ingredientsData);
  } catch (error) {
    console.log('Error:', error);
  }
}

function buildRecipesDB(ingredientsData: IngredientData[]): Recipe[]{
  let recipes2: Recipe[] = [];
  let recipes3: Recipe[] = [];
  // get 2 ingredients recipes
  for (var index1 = 0; index1 < ingredientsData.length; index1++) {
    const ingredient1 = ingredientsData[index1];
    for (var index2 = index1+1; index2 < ingredientsData.length; index2++) { 
      const ingredient2 = ingredientsData[index2];

      const twoIngredientsEffects = ingredient1.effects.filter(i1_ef => 
        ingredient2.effects.some(i2_ef => i2_ef.fkey == i1_ef.fkey)
      )

      if(!twoIngredientsEffects || !twoIngredientsEffects.length){ 
        continue; // No matching effects
      }
      
      if (recipes2.some(rec => rec.ingredients.every(ingredientKey =>
        ingredientKey == ingredient1.pkey || ingredientKey == ingredient2.pkey))) {
        continue; // Effects already exists
      }
      
      recipes2.push({
        ingredients: [
          ingredient1.pkey,
          ingredient2.pkey
        ],
        effects: twoIngredientsEffects
      });

      // get 3 ingredients recipes
      for (var index3 = index2+1; index3 < ingredientsData.length; index3++) { 
        const ingredient3 = ingredientsData[index3];

        const thirdIngredientEffects = ingredient3.effects.filter(i3_ef => 
          !twoIngredientsEffects.some(existingEf => existingEf.fkey == i3_ef.fkey) &&
          (ingredient1.effects.some(i1_ef => i1_ef.fkey == i3_ef.fkey) ||
          ingredient2.effects.some(i2_ef => i2_ef.fkey == i3_ef.fkey))
        )

        if (!thirdIngredientEffects.length){
          continue; // no new effect
        }

        recipes3.push({
          ingredients: [
            ingredient1.pkey,
            ingredient2.pkey,
            ingredient3.pkey
          ],
          effects: [...twoIngredientsEffects, ...thirdIngredientEffects]
        });

      }
     }
  }
  
  // discard 3 ingredient recipes with no added effect (same as 2 igr. rcp.)
  const filteredRecipes3 = recipes3.filter(recipe3 => {
    const matchingRecipes2 = recipes2.filter(recipe2 =>
      recipe2.ingredients.every(ingredient => recipe3.ingredients.includes(ingredient))
    );
    if (!matchingRecipes2 || !matchingRecipes2.length) {
      console.warn("Some 2 ingridients recipes are missing")
      return true;
    };
    const hasIdenticalEffectsOnly = matchingRecipes2.some(recipe2 => 
      recipe3.effects.every(effect3 => 
        recipe2.effects.some(effect2 => effect2.fkey == effect3.fkey)
      )
    );
    return !hasIdenticalEffectsOnly;
  });
  return [...recipes2, ...filteredRecipes3];
}

function showRecipes(recipes: Recipe[]): void {
  const resultsTable = document.querySelector('#results') as HTMLElement;
  resultsTable.innerHTML = '';

  const table = document.createElement('table');
  table.innerHTML = `
    <tr>
      <th>Ingredient 1</th>
      <th>Ingredient 2</th>
      <th>Ingredient 3</th>
      <th>Effects</th>
    </tr>
  `;

  const excludeTile = "add to 'exclude' filter";
  recipes.slice(0, 50).forEach((recipe) => {
    const row = document.createElement('tr');

    const ingredient1Cell = document.createElement('td');
    ingredient1Cell.innerHTML = `<span title="${excludeTile}">${recipe.ingredients[0]}</span>`;
    ingredient1Cell.onmousedown = () => addFilterCondition(recipe.ingredients[0], FilterAction.Exclude, FilterType.Ingredient);
    row.appendChild(ingredient1Cell);

    const ingredient2Cell = document.createElement('td');
    ingredient2Cell.innerHTML = `<span title="${excludeTile}">${recipe.ingredients[1]}</span>`;
    ingredient2Cell.onmousedown = () => addFilterCondition(recipe.ingredients[1], FilterAction.Exclude, FilterType.Ingredient);
    row.appendChild(ingredient2Cell);

    const ingredient3Cell = document.createElement('td');
    if(recipe.ingredients[2]){
      ingredient3Cell.innerHTML = `<span title="${excludeTile}">${recipe.ingredients[2]}</span>`;
      ingredient3Cell.onmousedown = () => addFilterCondition(recipe.ingredients[2], FilterAction.Exclude, FilterType.Ingredient);
    }
    row.appendChild(ingredient3Cell);

    const effectsCell = document.createElement('td');
    const effectsList = document.createElement('ul');
    recipe.effects.forEach((effect) => {
      const effectItem = document.createElement('li');
      effectItem.textContent = effect.fkey;
      effectItem.title = excludeTile;
      effectItem.onmousedown = () => addFilterCondition(effect.fkey, FilterAction.Exclude, FilterType.Effect);
      effectsList.appendChild(effectItem);
    });
    effectsCell.appendChild(effectsList);
    row.appendChild(effectsCell);

    table.appendChild(row);
  });

  resultsTable.appendChild(table);
}

enum FilterType {
  Effect,
  Ingredient
}

enum FilterAction {
  Include,
  Exclude
}

function populateDropdown(effects: EffectData[], ingredientsData: IngredientData[]) {
  const dropdown = document.getElementById("filterDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = '';

  effects.forEach((effect) => {
    const li = document.createElement("li");
    li.textContent = effect.title;
    li.onmousedown = () => addFilterCondition(effect.key, FilterAction.Include, FilterType.Effect);
    dropdown.appendChild(li);
  });

  ingredientsData.forEach((ingredient) => {
    const li = document.createElement("li");
    li.textContent = ingredient.title;
    li.onmousedown = () => addFilterCondition(ingredient.pkey, FilterAction.Include, FilterType.Ingredient);
    dropdown.appendChild(li);
  });
}

function filterDropdownOptions() {
  const input = document.getElementById("filterInput") as HTMLInputElement;
  const filter = input.value.toUpperCase();
  const dropdown = document.getElementById("filterDropdown") as HTMLInputElement;
  if (!dropdown) return;
  const items = dropdown.getElementsByTagName("li");

  for (let i = 0; i < items.length; i++) {
    const txtValue = items[i].textContent || items[i].innerText;

    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      items[i].style.display = "";
    } else {
      items[i].style.display = "none";
    }
  }
}

interface FilterCondition {
  ingredientKeys: string[];
  effectKeys: string[];
}

var includeConditions: FilterCondition = { ingredientKeys: [], effectKeys: [] };
var excludeConditions: FilterCondition = { ingredientKeys: [], effectKeys: [] };

function addFilterCondition(key: string, action: FilterAction, type: FilterType) {
  removeFilterCondition(key, type);
  if (action == FilterAction.Include){
    if(type == FilterType.Effect){
      includeConditions.effectKeys.push(key);
    }
    if(type == FilterType.Ingredient){
      includeConditions.ingredientKeys.push(key);
    }
  }
  if (action == FilterAction.Exclude){
    if(type == FilterType.Effect){
      excludeConditions.effectKeys.push(key);
    }
    if(type == FilterType.Ingredient){
      excludeConditions.ingredientKeys.push(key);
    }
  }
  addFilterGUI(key, action, type);
  applyFilter();
}

function removeFilterCondition(filterKey: string, type: FilterType) {
  if (type == FilterType.Effect){
    includeConditions.effectKeys = includeConditions.effectKeys.filter(key => key != filterKey);
    excludeConditions.effectKeys = excludeConditions.effectKeys.filter(key => key != filterKey);
  }
  if (type == FilterType.Ingredient){
    includeConditions.ingredientKeys = includeConditions.ingredientKeys.filter(key => key != filterKey);
    excludeConditions.ingredientKeys = excludeConditions.ingredientKeys.filter(key => key != filterKey);
  }
  removeFilterGUI(filterKey);
  applyFilter();
}

function addFilterGUI(effectKey: string, action: FilterAction, type: FilterType) {
  const filtersContainer = document.querySelector('#filtersContainer') as HTMLElement;
  const div = document.createElement('div');
  div.className = `filterCondition${FilterAction[action]}`
  div.textContent = effectKey;
  div.onmousedown = () => removeFilterCondition(effectKey, type);
  filtersContainer.appendChild(div);
}

function removeFilterGUI(effectKey: string) {
  const filtersContainer = document.querySelector('#filtersContainer') as HTMLElement;
  for (const filterItem of filtersContainer.getElementsByTagName("div")){
    if(filterItem.textContent == effectKey){
      filterItem.remove();
    }
  }
}

function applyFilter() {
  if (!includeConditions.effectKeys.length &&
    !includeConditions.ingredientKeys.length &&
    !excludeConditions.effectKeys.length &&
    !excludeConditions.ingredientKeys.length) {
    showRecipes(allRecipes);
    return;
  }

  // AND filter
  let filteredResults: Recipe[] = []
  if (!includeConditions.effectKeys.length &&
    !includeConditions.ingredientKeys.length) {
    filteredResults = allRecipes;
  } else {
    filteredResults = allRecipes.filter((recipe) => {
      return includeConditions.effectKeys.every(effectKey =>
        recipe.effects.find(effect => effect.fkey == effectKey)
      )
        && includeConditions.ingredientKeys.every(ingredientKey =>
          recipe.ingredients.find(ingredient => ingredient == ingredientKey)
        );
    });
  }

  if (!excludeConditions.effectKeys.length &&
    !excludeConditions.ingredientKeys.length) {
    showRecipes(filteredResults);
    return;
  }
  const finalResults = filteredResults.filter((recipe) => {
    return !excludeConditions.effectKeys.some(excludeEffect =>
      recipe.effects.some(effect => effect.fkey == excludeEffect)
    ) 
    && !excludeConditions.ingredientKeys.some(excludeIgr =>
      recipe.ingredients.some(ingredient => ingredient == excludeIgr)
    );
  });
  
  showRecipes(finalResults)
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});