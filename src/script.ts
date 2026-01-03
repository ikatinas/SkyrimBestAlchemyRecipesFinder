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

interface BuildRecipe {
  ingredientKeys: string[];
  effectIds: string[];
}

interface Recipe {
  ingredientKeys: string[];
  ingredients: IngredientData[];
  effects: IngredientEffect[];
}

var allRecipes: Recipe[] = [];
var preFilteredRecipes: Recipe[] = [];
var effectsByKey: Record<string, EffectData> = {};

function asNumberOrDefault(value: number | undefined | null, defaultValue: number): number {
  return value === undefined || value === null ? defaultValue : value;
}

function buildIngredientByKeyMap(ingredientsData: IngredientData[]): Record<string, IngredientData> {
  return Object.fromEntries(ingredientsData.map((ing) => [ing.pkey, ing]));
}

function rehydrateRecipes(
  buildRecipes: BuildRecipe[],
  ingredientsData: IngredientData[],
  effectsData: EffectData[]
): Recipe[] {
  indexEffectsByKey(effectsData);
  const ingredientByKey = buildIngredientByKeyMap(ingredientsData);

  return buildRecipes
    .map((buildRec) => {
      const ingredients: IngredientData[] = buildRec.ingredientKeys
        .map((key) => ingredientByKey[key])
        .filter((ing): ing is IngredientData => Boolean(ing));

      const effects: IngredientEffect[] = (buildRec.effectIds ?? []).map((effectId) => {
        let magnitude = 0;
        let duration = 0;
        let value = 0;

        for (const ing of ingredients) {
          const eff = (ing.effects ?? []).find((e) => e.fkey === effectId);
          if (!eff) continue;
          magnitude = Math.max(magnitude, asNumberOrDefault(eff.magnitude, 1));
          duration = Math.max(duration, asNumberOrDefault(eff.duration, 1));
          value = Math.max(value, asNumberOrDefault(eff.value, 1));
        }

        return {
          fkey: effectId,
          magnitude,
          duration,
          value,
          effectData: effectsByKey[effectId],
        };
      });

      return {
        ingredientKeys: buildRec.ingredientKeys,
        ingredients,
        effects,
      };
    })
    .filter((rec) => rec.ingredients.length >= 2 && rec.effects.length > 0);
}

function indexEffectsByKey(effectsData: EffectData[]): void {
  effectsByKey = Object.fromEntries(effectsData.map((effect) => [effect.key, effect]));
}

function getEffectTitle(effectKey: string): string {
  return effectsByKey[effectKey]?.title ?? effectKey;
}

function buildIngredientTooltipText(ingredient: IngredientData): HTMLElement {
  const container = document.createElement('div');

  const ingredientTitle = ingredient.origin
    ? `${ingredient.title} [${ingredient.origin}]`
    : ingredient.title;
  const titleDiv = document.createElement('div');
  titleDiv.textContent = ingredientTitle;
  container.appendChild(titleDiv);

  const effects = ingredient.effects ?? [];
  if (effects.length) {
    container.appendChild(document.createElement('br'));
    for (const effect of effects) {
      const line = document.createElement('div');
      line.appendChild(document.createTextNode('- '));

      const effectSpan = document.createElement('span');
      effectSpan.textContent = getEffectTitle(effect.fkey);
      const harmful = effectsByKey[effect.fkey]?.harmful ?? false;
      effectSpan.classList.add(harmful ? 'harmfull' : 'beneficial');
      line.appendChild(effectSpan);

      container.appendChild(line);
    }
  }

  const collectedBy = (ingredient.collected_by ?? '').trim();
  if (collectedBy) {
    container.appendChild(document.createElement('br'));
    const collectedDiv = document.createElement('div');
    collectedDiv.textContent = collectedBy;
    container.appendChild(collectedDiv);
  }

  return container;
}
async function fetchData(): Promise<void> {
  const promises: Promise<any>[] = [
    fetch('db/effects_db.json').then((response) => response.json()),
    fetch('db/ingredients_db.json').then((response) => response.json()),
    fetch('db/build_recipes_db.json').then((response) => response.json())
  ];

  try {
    const [effectsData, ingredientsData, buildRecipes] = await Promise.all(promises);
    const hydratedRecipes = rehydrateRecipes(
      buildRecipes as BuildRecipe[],
      ingredientsData as IngredientData[],
      effectsData as EffectData[]
    );
    drawOriginsFilterGUI(ingredientsData as IngredientData[]);
    allRecipes = preFilteredRecipes = sortRecipesBy(hydratedRecipes, SortBy.Magnifiers);
    drawRecipesTableGUI(allRecipes);
    populateDropdown(effectsData as EffectData[], ingredientsData as IngredientData[]);
    applyFilterConditionsFromStorage();
    hideLoadingIndicator();
  } catch (error) {
    console.log('Error:', error);
  }
}

enum SortBy {
  Magnifiers,
  EffectsNum,
  Price
}

function sortRecipesBy(recipes: Recipe[],  by: SortBy): Recipe[]{
  if (by == SortBy.Magnifiers){
    return recipes.sort((a, b) => {
      const aggregateA = a.effects.reduce(
        (acc, effect) => acc + effect.magnitude + effect.duration,
        0
      );
      const aggregateB = b.effects.reduce(
        (acc, effect) => acc + effect.magnitude + effect.duration,
        0
      );
      return aggregateB - aggregateA;
    });
  }
  if (by == SortBy.EffectsNum){
    return recipes.sort((a, b) => b.effects.length - a.effects.length);
  }
  if (by == SortBy.Price){
    console.log("TODO sortRecipesBy", SortBy.Price)
  }
  return recipes;
}

function hideLoadingIndicator(){
  const loadingScreen = document.getElementById("loading-screen") as HTMLDivElement;
  loadingScreen.style.display = "none";
}

function showLoadingIndicator(message: string){
  const loadingScreen = document.getElementById("loading-screen") as HTMLDivElement;
  const span = loadingScreen.querySelector("span") as HTMLSpanElement;
  span.innerText = message;
  loadingScreen.style.display = "flex";
}

function getOriginTitle(originCode: string): string {
  return (Origin as unknown as Record<string, string>)[originCode] ?? originCode;
}

function formatTooltipText(text: string): string {
  return text
    .replace(/\.\s+/g, '.\n')
    .replace(/;\s+/g, ';\n')
    .trim();
}

function attachMultilineTooltip(target: HTMLElement, tooltipContent: HTMLElement): void {
  if (!tooltipContent) return;
  const text = (tooltipContent.textContent ?? '').trim();
  if (!text) return;

  target.classList.add('hasTooltip');
  target.removeAttribute('title');

  const tooltip = document.createElement('div');
  tooltip.className = 'customTooltip';
  tooltip.appendChild(tooltipContent);
  target.appendChild(tooltip);
}

function drawOriginsFilterGUI(ingredientsData: IngredientData[]){
  const uniqueOrigins: string[] = Array.from(new Set(ingredientsData.map((ingredient) => ingredient.origin)));
  const divContainer = document.getElementById("originPreFilterContainer") as HTMLDivElement;
  divContainer.innerHTML = '';
  for (const origin of uniqueOrigins) {
    if (!origin) continue;
    const originTitle = getOriginTitle(origin);
    const checkboxHTML = `
      <label title="${originTitle}">
        <input type="checkbox" checked name="origin" value="${origin}" onchange="preFilterLimiters()" title="${originTitle}">
        ${origin}
      </label>
    `;
    const checkboxDiv = document.createElement('div');
    checkboxDiv.innerHTML = checkboxHTML;
    divContainer.appendChild(checkboxDiv)
  }
}

function drawRecipesTableGUI(recipes: Recipe[], part: number = 0): void {
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

  const maxPerPage = 50;
  const start = part * maxPerPage;
  const end = start + maxPerPage;
  const maxPart = Math.ceil(recipes.length/maxPerPage);
  const bestRecipes = recipes.slice(start, end);
  bestRecipes.forEach((recipe) => {
    const row = document.createElement('tr');

    for (const ingredient of recipe.ingredients){

      const img = document.createElement('img');
      img.src = ingredient.image;
      const imgContainer = document.createElement('div');
      imgContainer.appendChild(img);
      
      const ingrText = document.createElement('span');
      ingrText.textContent = ingredient.origin ? `${ingredient.title} [${ingredient.origin}]` : ingredient.title;
      const includeIgrFilterButton = getFilterButton(ingredient.pkey, FilterAction.Include, FilterType.Ingredient);
      const excludeIgrFilterButton = getFilterButton(ingredient.pkey, FilterAction.Exclude, FilterType.Ingredient);

      const textContainer = document.createElement('div');
      textContainer.appendChild(ingrText);
      textContainer.appendChild(includeIgrFilterButton);
      textContainer.appendChild(excludeIgrFilterButton);

      const ingredientTdCell = document.createElement('td');
      const tooltipText = buildIngredientTooltipText(ingredient);
      attachMultilineTooltip(ingredientTdCell, tooltipText);
      ingredientTdCell.style.textAlign = "center";
      ingredientTdCell.appendChild(imgContainer);
      ingredientTdCell.appendChild(textContainer);

      row.appendChild(ingredientTdCell);      
    }
    if(recipe.ingredientKeys.length < 3){
      row.appendChild(document.createElement('td'));
    }

    const effectsTdCell = document.createElement('td');
    const effectsList = document.createElement('ul');
    recipe.effects.forEach((effect) => {
      const effectItem = document.createElement('li');
      const effectText = document.createElement('span');
      effectText.textContent = effect.effectData?.title ?? effect.fkey;
      effectText.classList.add(effect.effectData?.harmful ? "harmfull" : "beneficial");
      effectText.title = effect.effectData?.description ?? effectText.textContent;
      effectItem.appendChild(effectText);
      const magnifiersContainer = getMagnifiersGUI(effect)
      if(magnifiersContainer.childNodes.length > 0 ){
        effectItem.appendChild(magnifiersContainer);
      }
      const includeEffFilterButton = getFilterButton(effect.fkey, FilterAction.Include, FilterType.Effect);
      effectItem.appendChild(includeEffFilterButton);
      const excludeEffFilterButton = getFilterButton(effect.fkey, FilterAction.Exclude, FilterType.Effect);
      effectItem.appendChild(excludeEffFilterButton);
      effectsList.appendChild(effectItem);
    });
    effectsTdCell.appendChild(effectsList);
    row.appendChild(effectsTdCell);
    table.appendChild(row);
  });
  
  // table's footer
  const row = document.createElement('tr');
  const tfooter = document.createElement('td');
  tfooter.colSpan = 4;
  tfooter.classList.add("tableFooter");
  if (bestRecipes.length < recipes.length){
    if(part > 0){
      const prevButton = document.createElement('button');
      prevButton.innerText = " < ";
      prevButton.onmousedown = () => drawRecipesTableGUI(recipes, part - 1);
      tfooter.appendChild(prevButton);
    }
    const footerText = document.createElement('span');
    footerText.innerText = `page ${part+1} out of ${maxPart} (${recipes.length} recipes)`;
    tfooter.appendChild(footerText);
    if (part+1 < maxPart){
      const nextButton = document.createElement('button');
      nextButton.innerText = " > ";
      nextButton.onmousedown = () => drawRecipesTableGUI(recipes, part + 1);
      tfooter.appendChild(nextButton);
    }
  } else {
    tfooter.innerText = `${recipes.length} recipes`;
  }
  row.appendChild(tfooter);
  table.appendChild(row);
  resultsTable.appendChild(table);
}

function getMagnifiersGUI(effect: IngredientEffect): HTMLSpanElement{
  const magnitudeIcon = 
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="orange" class="bi bi-fire" viewBox="0 0 16 16">
    <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"/>
  </svg>`
  const durationIcon = 
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="orange" class="bi bi-hourglass-split" viewBox="0 0 16 16">
    <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2h-7zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48V8.35zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
  </svg>`
  const priceIcon = 
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gold" class="bi bi-currency-exchange" viewBox="0 0 16 16">
    <path d="M0 5a5 5 0 0 0 4.027 4.905 6.5 6.5 0 0 1 .544-2.073C3.695 7.536 3.132 6.864 3 5.91h-.5v-.426h.466V5.05q-.001-.07.004-.135H2.5v-.427h.511C3.236 3.24 4.213 2.5 5.681 2.5c.316 0 .59.031.819.085v.733a3.5 3.5 0 0 0-.815-.082c-.919 0-1.538.466-1.734 1.252h1.917v.427h-1.98q-.004.07-.003.147v.422h1.983v.427H3.93c.118.602.468 1.03 1.005 1.229a6.5 6.5 0 0 1 4.97-3.113A5.002 5.002 0 0 0 0 5m16 5.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0m-7.75 1.322c.069.835.746 1.485 1.964 1.562V14h.54v-.62c1.259-.086 1.996-.74 1.996-1.69 0-.865-.563-1.31-1.57-1.54l-.426-.1V8.374c.54.06.884.347.966.745h.948c-.07-.804-.779-1.433-1.914-1.502V7h-.54v.629c-1.076.103-1.808.732-1.808 1.622 0 .787.544 1.288 1.45 1.493l.358.085v1.78c-.554-.08-.92-.376-1.003-.787zm1.96-1.895c-.532-.12-.82-.364-.82-.732 0-.41.311-.719.824-.809v1.54h-.005zm.622 1.044c.645.145.943.38.943.796 0 .474-.37.8-1.02.86v-1.674z"/>
  </svg>`
  const magnifiersContainer = document.createElement('span');
  magnifiersContainer.classList.add("magnifier");
  if (effect.magnitude && effect.magnitude != 1){
    const power = document.createElement('span');
    power.title = "Power magnifier"
    power.innerHTML = `${effect.magnitude}x${magnitudeIcon}`    
    power.classList.add(effect.magnitude < 1 ? "harmfull" : "beneficial");
    magnifiersContainer.appendChild(power)
  }
  if (effect.duration && effect.duration != 1){
    const duration = document.createElement('span');
    duration.title = "Duration magnifier"
    duration.innerHTML = `${effect.duration}x${durationIcon}`    
    duration.classList.add(effect.duration < 1 ? "harmfull" : "beneficial");
    magnifiersContainer.appendChild(duration)
  }
  if (effect.value && effect.value != 1){
    const duration = document.createElement('span');
    duration.title = "Price magnifier"
    duration.innerHTML = `${effect.value}x${priceIcon}`    
    duration.classList.add(effect.value < 1 ? "harmfull" : "beneficial");
    magnifiersContainer.appendChild(duration)
  }
  return magnifiersContainer;
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

function clearFilterConditions() {
  localStorage.setItem('includeEffectKeys', '[]');
  localStorage.setItem('includeIngredientKeys', '[]');
  localStorage.setItem('excludeEffectKeys', '[]');
  localStorage.setItem('excludeIngredientKeys', '[]');
  includeConditions = { ingredientKeys: [], effectKeys: [] };
  excludeConditions = { ingredientKeys: [], effectKeys: [] };
  const filtersContainer = document.querySelector('#filtersContainer') as HTMLElement;
  filtersContainer.innerHTML = '';
  applyFilter();
}

function applyFilterConditionsFromStorage() {
  const includeEffectKeys = JSON.parse(localStorage.getItem('includeEffectKeys') || '[]');
  const includeIngredientKeys = JSON.parse(localStorage.getItem('includeIngredientKeys') || '[]');
  const excludeEffectKeys = JSON.parse(localStorage.getItem('excludeEffectKeys') || '[]');
  const excludeIngredientKeys = JSON.parse(localStorage.getItem('excludeIngredientKeys') || '[]');

  includeConditions = { ingredientKeys: includeIngredientKeys, effectKeys: includeEffectKeys };
  excludeConditions = { ingredientKeys: excludeIngredientKeys, effectKeys: excludeEffectKeys };
  for (const key of includeEffectKeys) {
    addFilterGUI(key, FilterAction.Include, FilterType.Effect);
  }
  for (const key of includeIngredientKeys) {
    addFilterGUI(key, FilterAction.Include, FilterType.Ingredient);
  }
  for (const key of excludeEffectKeys) {
    addFilterGUI(key, FilterAction.Exclude, FilterType.Effect);
  }
  for (const key of excludeIngredientKeys) {
    addFilterGUI(key, FilterAction.Exclude, FilterType.Ingredient);
  }
  applyFilter();
}

function addFilterCondition(key: string, action: FilterAction, type: FilterType) {
  removeFilterCondition(key, type);
  if (action == FilterAction.Include){
    if(type == FilterType.Effect){
      includeConditions.effectKeys.push(key);
      localStorage.setItem('includeEffectKeys', JSON.stringify(includeConditions.effectKeys));
    }
    if(type == FilterType.Ingredient){
      includeConditions.ingredientKeys.push(key);
      localStorage.setItem('includeIngredientKeys', JSON.stringify(includeConditions.ingredientKeys));
    }
  }
  if (action == FilterAction.Exclude){
    if(type == FilterType.Effect){
      excludeConditions.effectKeys.push(key);
      localStorage.setItem('excludeEffectKeys', JSON.stringify(excludeConditions.effectKeys));
    }
    if(type == FilterType.Ingredient){
      excludeConditions.ingredientKeys.push(key);
      localStorage.setItem('excludeIngredientKeys', JSON.stringify(excludeConditions.ingredientKeys));
    }
  }
  addFilterGUI(key, action, type);
  applyFilter();
}

function removeFilterCondition(filterKey: string, type: FilterType) {
  if (type == FilterType.Effect){
    includeConditions.effectKeys = includeConditions.effectKeys.filter(key => key != filterKey);
    excludeConditions.effectKeys = excludeConditions.effectKeys.filter(key => key != filterKey);
    localStorage.setItem('includeEffectKeys', JSON.stringify(includeConditions.effectKeys));
    localStorage.setItem('excludeEffectKeys', JSON.stringify(excludeConditions.effectKeys));
  }
  if (type == FilterType.Ingredient){
    includeConditions.ingredientKeys = includeConditions.ingredientKeys.filter(key => key != filterKey);
    excludeConditions.ingredientKeys = excludeConditions.ingredientKeys.filter(key => key != filterKey);
    localStorage.setItem('includeIngredientKeys', JSON.stringify(includeConditions.ingredientKeys));
    localStorage.setItem('excludeIngredientKeys', JSON.stringify(excludeConditions.ingredientKeys));
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
      setClearFilterAllButtonVisiblity(false);
      return;
  }
  setClearFilterAllButtonVisiblity(true);

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

function setClearFilterAllButtonVisiblity(display = false){
  const button = document.querySelector('#clearFilterAllButton') as HTMLElement;
  button.style.display = display ? 'block':'none'
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});