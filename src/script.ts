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

interface IngredientEffect { 
  fkey: string;
  magnitude: number;
  duration: number;
  value: number;
  effectData?: EffectData
}

interface Recipe {
  ingredientKeys: string[];
  ingredients: IngredientData[];
  effects: IngredientEffect[];
}
var allRecipes: Recipe[] = [];
var preFilteredRecipes: Recipe[] = [];
async function fetchData(): Promise<void> {
  const promises: Promise<any>[] = [
    fetch('db/effects_db.json').then((response) => response.json()),
    fetch('db/ingredients_db.json').then((response) => response.json())
  ];

  try {
    const [effectsData, ingredientsData] = await Promise.all(promises);
    drawOriginsFilterGUI(ingredientsData);
    const recipes = buildRecipesDB(effectsData, ingredientsData)
    allRecipes = preFilteredRecipes = recipes.sort((a, b) => b.effects.length - a.effects.length);
    drawRecipesTableGUI(allRecipes);
    populateDropdown(effectsData, ingredientsData);
  } catch (error) {
    console.log('Error:', error);
  }
}

function drawOriginsFilterGUI(ingredientsData: IngredientData[]){
  const uniqueOrigins: string[] = Array.from(new Set(ingredientsData.map((ingredient) => ingredient.origin)));
  const divContainer = document.getElementById("originPreFilterContainer") as HTMLDivElement;
  for (const origin of uniqueOrigins) {
    if (!origin) continue;
    const checkboxHTML = `
      <label>
        <input type="checkbox" checked name="origin" value="${origin}" onchange="preFilterLimiters()">
        ${origin}
      </label>
    `;
    const checkboxDiv = document.createElement('div');
    checkboxDiv.innerHTML = checkboxHTML;
    divContainer.appendChild(checkboxDiv)
  }
}

function buildRecipesDB(effectsData: EffectData[], ingredientsData: IngredientData[]): Recipe[]{
  let recipes2: Recipe[] = [];
  let recipes3: Recipe[] = [];
  // get 2 ingredients recipes
  for (var index1 = 0; index1 < ingredientsData.length; index1++) {
    const ingredient1 = ingredientsData[index1];
    for (var index2 = index1+1; index2 < ingredientsData.length; index2++) { 
      const ingredient2 = ingredientsData[index2];

      let twoIngredientsEffects = ingredient1.effects.filter(i1_ef => 
        ingredient2.effects.some(i2_ef => i2_ef.fkey == i1_ef.fkey)
      )

      for (let ingEff of twoIngredientsEffects){
        ingEff.effectData = effectsData.find(eff => eff.key == ingEff.fkey);
      }
      
      if(!twoIngredientsEffects || !twoIngredientsEffects.length){ 
        continue; // No matching effects
      }
      
      if (recipes2.some(rec => rec.ingredientKeys.every(ingredientKey =>
        ingredientKey == ingredient1.pkey || ingredientKey == ingredient2.pkey))) {
        continue; // Effects already exists
      }
      
      recipes2.push({
        ingredientKeys: [
          ingredient1.pkey,
          ingredient2.pkey
        ],
        ingredients: [
          ingredient1,
          ingredient2
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
          ingredientKeys: [
            ingredient1.pkey,
            ingredient2.pkey,
            ingredient3.pkey
          ],
          ingredients: [
            ingredient1,
            ingredient2,
            ingredient3
          ],
          effects: [...twoIngredientsEffects, ...thirdIngredientEffects]
        });

      }
     }
  }
  
  // discard 3 ingredient recipes with no added effect (same as 2 igr. rcp.)
  const filteredRecipes3 = recipes3.filter(recipe3 => {
    const matchingRecipes2 = recipes2.filter(recipe2 =>
      recipe2.ingredientKeys.every(ingredient => recipe3.ingredientKeys.includes(ingredient))
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

function drawRecipesTableGUI(recipes: Recipe[]): void {
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

    for (const ingredient of recipe.ingredients){
      const ingredient1Cell = document.createElement('td');
      ingredient1Cell.textContent = ingredient.origin ? `${ingredient.title} [${ingredient.origin}]` : ingredient.title;
      const includeIgrFilterButton = getFilterButton(ingredient.pkey, FilterAction.Include, FilterType.Ingredient);
      ingredient1Cell.appendChild(includeIgrFilterButton);
      const excludeIgrFilterButton = getFilterButton(ingredient.pkey, FilterAction.Exclude, FilterType.Ingredient);
      ingredient1Cell.appendChild(excludeIgrFilterButton);
      row.appendChild(ingredient1Cell);
    }
    if(recipe.ingredientKeys.length < 3){
      row.appendChild(document.createElement('td'));
    }

    const effectsCell = document.createElement('td');
    const effectsList = document.createElement('ul');
    recipe.effects.forEach((effect) => {
      const effectItem = document.createElement('li');
      effectItem.textContent = effect.effectData?.title ?? effect.fkey;
      effectItem.classList.add(effect.effectData?.harmful ? "harmfull" : "beneficial")
      const includeEffFilterButton = getFilterButton(effect.fkey, FilterAction.Include, FilterType.Effect);
      effectItem.appendChild(includeEffFilterButton);
      const excludeEffFilterButton = getFilterButton(effect.fkey, FilterAction.Exclude, FilterType.Effect);
      effectItem.appendChild(excludeEffFilterButton);
      effectsList.appendChild(effectItem);
    });
    effectsCell.appendChild(effectsList);
    row.appendChild(effectsCell);

    table.appendChild(row);
  });

  resultsTable.appendChild(table);
}


function getFilterButton(key: string, filterAction: FilterAction, filterType: FilterType): HTMLSpanElement{
  const includeSvgString = 
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="filterShowIcon" viewBox="0 0 16 16">
    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
  </svg>`
  const includeTitle = "show it";
  const excludeSvgString = 
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="filterHideIcon" viewBox="0 0 16 16">
    <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/>
    <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"/>
  </svg>`
  const excludeTile = "hide it";

  const filterButton = document.createElement('span');
  filterButton.innerHTML = filterAction == FilterAction.Include ? includeSvgString : excludeSvgString;
  filterButton.title = filterAction == FilterAction.Include ? includeTitle : excludeTile;
  filterButton.onmousedown = () => addFilterCondition(key, filterAction, filterType);
  return filterButton;
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
    li.classList.add(effect.harmful ? "harmfull" : "beneficial")
    li.onmousedown = () => addFilterCondition(effect.key, FilterAction.Include, FilterType.Effect);
    dropdown.appendChild(li);
  });

  ingredientsData.forEach((ingredient) => {
    const li = document.createElement("li");
    li.textContent = ingredient.origin ? `${ingredient.title} [${ingredient.origin}]` : ingredient.title;
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

enum PreFilterType{
  isPureCheck,
  isLimit2IgrCheck,
  isGardenCheck
}

function preFilterLimiters(){
  preFilteredRecipes = allRecipes;
  const allPreFilterTypeStrings = Object.keys(PreFilterType).filter(key => Number.isNaN(parseInt(key)));
  for (const preFilterType of allPreFilterTypeStrings) {
    const checkbox: HTMLInputElement = document.getElementById(preFilterType) as HTMLInputElement;
    if (checkbox.checked && preFilterType == PreFilterType[PreFilterType.isPureCheck]){
      preFilteredRecipes = preFilteredRecipes.filter(recipe => {
        return !recipe.effects.some(effect => 
          effect.effectData?.harmful != recipe.effects[0].effectData?.harmful
        )
      })
    }
    if (checkbox.checked && preFilterType == PreFilterType[PreFilterType.isLimit2IgrCheck]){
      preFilteredRecipes = preFilteredRecipes.filter(recipe => {
        return recipe.ingredients.length == 2
      })
    }
    if (checkbox.checked && preFilterType == PreFilterType[PreFilterType.isGardenCheck]){
      preFilteredRecipes = preFilteredRecipes.filter(recipe => {
        return recipe.ingredients.every(ingredient => 
          ingredient.garden != null
        )
      })
    }
  }
  const divContainer = document.getElementById("originPreFilterContainer") as HTMLDivElement;
  const inputFields = divContainer.querySelectorAll("input");
  inputFields.forEach((input) => {
    if (!input.checked){
      preFilteredRecipes = preFilteredRecipes.filter(recipe => {
        return !recipe.ingredients.some(ingredient => 
          ingredient.origin == input.value
        )
      })
    }
  });
  applyFilter();
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
    drawRecipesTableGUI(preFilteredRecipes);
    return;
  }

  // AND filter
  let filteredResults: Recipe[] = []
  if (!includeConditions.effectKeys.length &&
    !includeConditions.ingredientKeys.length) {
    filteredResults = preFilteredRecipes;
  } else {
    filteredResults = preFilteredRecipes.filter((recipe) => {
      return includeConditions.effectKeys.every(effectKey =>
        recipe.effects.find(effect => effect.fkey == effectKey)
      )
        && includeConditions.ingredientKeys.every(ingredientKey =>
          recipe.ingredientKeys.find(ingredient => ingredient == ingredientKey)
        );
    });
  }

  if (!excludeConditions.effectKeys.length &&
    !excludeConditions.ingredientKeys.length) {
    drawRecipesTableGUI(filteredResults);
    return;
  }
  const finalResults = filteredResults.filter((recipe) => {
    return !excludeConditions.effectKeys.some(excludeEffect =>
      recipe.effects.some(effect => effect.fkey == excludeEffect)
    ) 
    && !excludeConditions.ingredientKeys.some(excludeIgr =>
      recipe.ingredientKeys.some(ingredient => ingredient == excludeIgr)
    );
  });
  
  drawRecipesTableGUI(finalResults)
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});