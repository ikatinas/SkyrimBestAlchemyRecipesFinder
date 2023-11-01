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

  recipes.slice(0, 50).forEach((recipe) => {
    const row = document.createElement('tr');

    const ingredient1Cell = document.createElement('td');
    ingredient1Cell.textContent = recipe.ingredients[0];
    row.appendChild(ingredient1Cell);

    const ingredient2Cell = document.createElement('td');
    ingredient2Cell.textContent = recipe.ingredients[1];
    row.appendChild(ingredient2Cell);

    const ingredient3Cell = document.createElement('td');
    ingredient3Cell.textContent = recipe.ingredients[2];
    row.appendChild(ingredient3Cell);

    const effectsCell = document.createElement('td');
    const effectsList = document.createElement('ul');
    recipe.effects.forEach((effect) => {
      const effectItem = document.createElement('li');
      effectItem.textContent = effect.fkey;
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

function populateDropdown(effects: EffectData[], ingredientsData: IngredientData[]) {
  const dropdown = document.getElementById("filterDropdown");
  if (!dropdown) return;

  dropdown.innerHTML = '';

  effects.forEach((effect) => {
    const li = document.createElement("li");
    li.textContent = effect.title;
    li.onmousedown = () => addFilterCondition(effect.key, FilterType.Effect);
    dropdown.appendChild(li);
  });

  ingredientsData.forEach((ingredient) => {
    const li = document.createElement("li");
    li.textContent = ingredient.title;
    li.onmousedown = () => addFilterCondition(ingredient.pkey, FilterType.Ingredient);
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

function addFilterCondition(key: string, type: FilterType) {
  if(type == FilterType.Effect){
    includeConditions.effectKeys.push(key);
  }
  if(type == FilterType.Ingredient){
    includeConditions.ingredientKeys.push(key);
  }
  addFilterGUI(key, type);
  applyFilter();
}

function removeFilterCondition(key: string, type: FilterType) {
  if (type == FilterType.Effect){
    includeConditions.effectKeys = includeConditions.effectKeys.filter(key => key != key);
  }
  if (type == FilterType.Ingredient){
    includeConditions.ingredientKeys = includeConditions.ingredientKeys.filter(key => key != key);
  }
  removeFilterGUI(key);
  applyFilter();
}

function addFilterGUI(effectKey: string, type: FilterType) {
  const filtersContainer = document.querySelector('#filtersContainer') as HTMLElement;
  const div = document.createElement('div');
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
  if (!includeConditions.effectKeys.length && !includeConditions.ingredientKeys.length){
    showRecipes(allRecipes);
    return;
  }

  // AND filter
  const results = allRecipes.filter((recipe) => {
    return includeConditions.effectKeys.every(effectKey => 
      recipe.effects.find(effect => effect.fkey == effectKey)
    ) 
    && includeConditions.ingredientKeys.every(ingredientKey => 
      recipe.ingredients.find(ingredient => ingredient == ingredientKey)
    );
  });
  showRecipes(results)
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});