"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var allRecipes = [];
var preFilteredRecipes = [];
function fetchData() {
    return __awaiter(this, void 0, void 0, function* () {
        const promises = [
            fetch('db/effects_db.json').then((response) => response.json()),
            fetch('db/ingredients_db.json').then((response) => response.json())
        ];
        try {
            const [effectsData, ingredientsData] = yield Promise.all(promises);
            drawOriginsFilterGUI(ingredientsData);
            const recipes = buildRecipesDB(effectsData, ingredientsData);
            allRecipes = preFilteredRecipes = sortRecipesBy(recipes, SortBy.Magnifiers);
            drawRecipesTableGUI(allRecipes);
            populateDropdown(effectsData, ingredientsData);
            hideLoadingIndicator();
        }
        catch (error) {
            console.log('Error:', error);
        }
    });
}
var SortBy;
(function (SortBy) {
    SortBy[SortBy["Magnifiers"] = 0] = "Magnifiers";
    SortBy[SortBy["EffectsNum"] = 1] = "EffectsNum";
    SortBy[SortBy["Price"] = 2] = "Price";
})(SortBy || (SortBy = {}));
function sortRecipesBy(recipes, by) {
    if (by == SortBy.Magnifiers) {
        return recipes.sort((a, b) => {
            const aggregateA = a.effects.reduce((acc, effect) => acc + effect.magnitude + effect.duration, 0);
            const aggregateB = b.effects.reduce((acc, effect) => acc + effect.magnitude + effect.duration, 0);
            return aggregateB - aggregateA;
        });
    }
    if (by == SortBy.EffectsNum) {
        return recipes.sort((a, b) => b.effects.length - a.effects.length);
    }
    if (by == SortBy.Price) {
        console.log("TODO sortRecipesBy", SortBy.Price);
    }
    return recipes;
}
function hideLoadingIndicator() {
    const loadingScreen = document.getElementById("loading-screen");
    loadingScreen.style.display = "none";
}
function showLoadingIndicator(message) {
    const loadingScreen = document.getElementById("loading-screen");
    const span = loadingScreen.querySelector("span");
    span.innerText = message;
    loadingScreen.style.display = "flex";
}
function drawOriginsFilterGUI(ingredientsData) {
    const uniqueOrigins = Array.from(new Set(ingredientsData.map((ingredient) => ingredient.origin)));
    const divContainer = document.getElementById("originPreFilterContainer");
    for (const origin of uniqueOrigins) {
        if (!origin)
            continue;
        const checkboxHTML = `
      <label>
        <input type="checkbox" checked name="origin" value="${origin}" onchange="preFilterLimiters()">
        ${origin}
      </label>
    `;
        const checkboxDiv = document.createElement('div');
        checkboxDiv.innerHTML = checkboxHTML;
        divContainer.appendChild(checkboxDiv);
    }
}
function buildRecipesDB(effectsData, ingredientsData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    let recipes2 = [];
    let recipes3 = [];
    // get 2 ingredients recipes
    for (var index1 = 0; index1 < ingredientsData.length; index1++) {
        const ingredient1 = ingredientsData[index1];
        for (var index2 = index1 + 1; index2 < ingredientsData.length; index2++) {
            const ingredient2 = ingredientsData[index2];
            let twoIngredientsEffects = [];
            for (const i1_ef of ingredient1.effects) {
                const i2_ef = ingredient2.effects.find(i2_ef => i2_ef.fkey == i1_ef.fkey);
                if (i2_ef) {
                    twoIngredientsEffects.push({
                        fkey: i2_ef.fkey,
                        magnitude: Math.max((_a = i1_ef.magnitude) !== null && _a !== void 0 ? _a : 1, (_b = i2_ef.magnitude) !== null && _b !== void 0 ? _b : 1),
                        duration: Math.max((_c = i1_ef.duration) !== null && _c !== void 0 ? _c : 1, (_d = i2_ef.duration) !== null && _d !== void 0 ? _d : 1),
                        value: Math.max((_e = i1_ef.value) !== null && _e !== void 0 ? _e : 1, (_f = i2_ef.value) !== null && _f !== void 0 ? _f : 1),
                        effectData: effectsData.find(eff => eff.key == i2_ef.fkey)
                    });
                }
            }
            if (!twoIngredientsEffects || !twoIngredientsEffects.length) {
                continue; // No matching effects
            }
            if (recipes2.some(rec => rec.ingredientKeys.every(ingredientKey => ingredientKey == ingredient1.pkey || ingredientKey == ingredient2.pkey))) {
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
            for (var index3 = index2 + 1; index3 < ingredientsData.length; index3++) {
                const ingredient3 = ingredientsData[index3];
                const thirdIngredientEffects = ingredient3.effects.filter(i3_ef => !twoIngredientsEffects.some(existingEf => existingEf.fkey == i3_ef.fkey) &&
                    (ingredient1.effects.some(i1_ef => i1_ef.fkey == i3_ef.fkey) ||
                        ingredient2.effects.some(i2_ef => i2_ef.fkey == i3_ef.fkey)));
                if (!thirdIngredientEffects.length) {
                    continue; // no new effect
                }
                let threeIngredientsEffects = [...twoIngredientsEffects];
                for (const i3_ef of thirdIngredientEffects) {
                    const i1_ef = ingredient1.effects.find(i1_ef => i1_ef.fkey == i3_ef.fkey);
                    if (i1_ef) {
                        threeIngredientsEffects.push({
                            fkey: i1_ef.fkey,
                            magnitude: Math.max((_g = i3_ef.magnitude) !== null && _g !== void 0 ? _g : 1, (_h = i1_ef.magnitude) !== null && _h !== void 0 ? _h : 1),
                            duration: Math.max((_j = i3_ef.duration) !== null && _j !== void 0 ? _j : 1, (_k = i1_ef.duration) !== null && _k !== void 0 ? _k : 1),
                            value: Math.max((_l = i3_ef.value) !== null && _l !== void 0 ? _l : 1, (_m = i1_ef.value) !== null && _m !== void 0 ? _m : 1),
                            effectData: effectsData.find(eff => eff.key == i1_ef.fkey)
                        });
                    }
                    const i2_ef = ingredient2.effects.find(i2_ef => i2_ef.fkey == i3_ef.fkey);
                    if (i2_ef) {
                        threeIngredientsEffects.push({
                            fkey: i2_ef.fkey,
                            magnitude: Math.max((_o = i3_ef.magnitude) !== null && _o !== void 0 ? _o : 1, (_p = i2_ef.magnitude) !== null && _p !== void 0 ? _p : 1),
                            duration: Math.max((_q = i3_ef.duration) !== null && _q !== void 0 ? _q : 1, (_r = i2_ef.duration) !== null && _r !== void 0 ? _r : 1),
                            value: Math.max((_s = i3_ef.value) !== null && _s !== void 0 ? _s : 1, (_t = i2_ef.value) !== null && _t !== void 0 ? _t : 1),
                            effectData: effectsData.find(eff => eff.key == i2_ef.fkey)
                        });
                    }
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
                    effects: threeIngredientsEffects
                });
            }
        }
    }
    // discard 3 ingredient recipes with no added effect (same as 2 igr. rcp.)
    const filteredRecipes3 = recipes3.filter(recipe3 => {
        const matchingRecipes2 = recipes2.filter(recipe2 => recipe2.ingredientKeys.every(ingredient => recipe3.ingredientKeys.includes(ingredient)));
        if (!matchingRecipes2 || !matchingRecipes2.length) {
            console.warn("Some 2 ingridients recipes are missing");
            return true;
        }
        ;
        const hasIdenticalEffectsOnly = matchingRecipes2.some(recipe2 => recipe3.effects.every(effect3 => recipe2.effects.some(effect2 => effect2.fkey == effect3.fkey)));
        return !hasIdenticalEffectsOnly;
    });
    return [...recipes2, ...filteredRecipes3];
}
function drawRecipesTableGUI(recipes, part = 0) {
    const resultsTable = document.querySelector('#results');
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
    const maxPart = Math.ceil(recipes.length / maxPerPage);
    const bestRecipes = recipes.slice(start, end);
    bestRecipes.forEach((recipe) => {
        const row = document.createElement('tr');
        for (const ingredient of recipe.ingredients) {
            const ingredient1Cell = document.createElement('td');
            ingredient1Cell.textContent = ingredient.origin ? `${ingredient.title} [${ingredient.origin}]` : ingredient.title;
            const includeIgrFilterButton = getFilterButton(ingredient.pkey, FilterAction.Include, FilterType.Ingredient);
            ingredient1Cell.appendChild(includeIgrFilterButton);
            const excludeIgrFilterButton = getFilterButton(ingredient.pkey, FilterAction.Exclude, FilterType.Ingredient);
            ingredient1Cell.appendChild(excludeIgrFilterButton);
            row.appendChild(ingredient1Cell);
        }
        if (recipe.ingredientKeys.length < 3) {
            row.appendChild(document.createElement('td'));
        }
        const effectsCell = document.createElement('td');
        const effectsList = document.createElement('ul');
        recipe.effects.forEach((effect) => {
            var _a, _b, _c;
            const effectItem = document.createElement('li');
            const effectText = document.createElement('span');
            effectText.textContent = (_b = (_a = effect.effectData) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : effect.fkey;
            effectText.classList.add(((_c = effect.effectData) === null || _c === void 0 ? void 0 : _c.harmful) ? "harmfull" : "beneficial");
            effectItem.appendChild(effectText);
            const magnifiersContainer = getMagnifiersGUI(effect);
            if (magnifiersContainer.childNodes.length > 0) {
                effectItem.appendChild(magnifiersContainer);
            }
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
    // table's footer
    const row = document.createElement('tr');
    const tfooter = document.createElement('td');
    tfooter.colSpan = 4;
    tfooter.classList.add("tableFooter");
    if (bestRecipes.length < recipes.length) {
        if (part > 0) {
            const prevButton = document.createElement('button');
            prevButton.innerText = " < ";
            prevButton.onmousedown = () => drawRecipesTableGUI(recipes, part - 1);
            tfooter.appendChild(prevButton);
        }
        const footerText = document.createElement('span');
        footerText.innerText = `page ${part + 1} out of ${maxPart} (${recipes.length} recipes)`;
        tfooter.appendChild(footerText);
        if (part + 1 < maxPart) {
            const nextButton = document.createElement('button');
            nextButton.innerText = " > ";
            nextButton.onmousedown = () => drawRecipesTableGUI(recipes, part + 1);
            tfooter.appendChild(nextButton);
        }
    }
    else {
        tfooter.innerText = `${recipes.length} recipes`;
    }
    row.appendChild(tfooter);
    table.appendChild(row);
    resultsTable.appendChild(table);
}
function getMagnifiersGUI(effect) {
    const magnitudeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="orange" class="bi bi-fire" viewBox="0 0 16 16">
    <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16Zm0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15Z"/>
  </svg>`;
    const durationIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="orange" class="bi bi-hourglass-split" viewBox="0 0 16 16">
    <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2h-7zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48V8.35zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
  </svg>`;
    const magnifiersContainer = document.createElement('span');
    magnifiersContainer.classList.add("magnifier");
    if (effect.magnitude && effect.magnitude != 1) {
        const power = document.createElement('span');
        power.title = "Power magnifier";
        power.innerHTML = `${effect.magnitude}x${magnitudeIcon}`;
        power.classList.add(effect.magnitude < 1 ? "harmfull" : "beneficial");
        magnifiersContainer.appendChild(power);
    }
    if (effect.duration && effect.duration != 1) {
        const duration = document.createElement('span');
        duration.title = "Duration magnifier";
        duration.innerHTML = `${effect.duration}x${durationIcon}`;
        duration.classList.add(effect.magnitude < 1 ? "harmfull" : "beneficial");
        magnifiersContainer.appendChild(duration);
    }
    return magnifiersContainer;
}
function getFilterButton(key, filterAction, filterType) {
    const includeSvgString = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="filterShowIcon" viewBox="0 0 16 16">
    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
  </svg>`;
    const includeTitle = "show it";
    const excludeSvgString = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="filterHideIcon" viewBox="0 0 16 16">
    <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/>
    <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"/>
  </svg>`;
    const excludeTile = "hide it";
    const filterButton = document.createElement('span');
    filterButton.innerHTML = filterAction == FilterAction.Include ? includeSvgString : excludeSvgString;
    filterButton.title = filterAction == FilterAction.Include ? includeTitle : excludeTile;
    filterButton.onmousedown = () => addFilterCondition(key, filterAction, filterType);
    return filterButton;
}
var FilterType;
(function (FilterType) {
    FilterType[FilterType["Effect"] = 0] = "Effect";
    FilterType[FilterType["Ingredient"] = 1] = "Ingredient";
})(FilterType || (FilterType = {}));
var FilterAction;
(function (FilterAction) {
    FilterAction[FilterAction["Include"] = 0] = "Include";
    FilterAction[FilterAction["Exclude"] = 1] = "Exclude";
})(FilterAction || (FilterAction = {}));
function populateDropdown(effects, ingredientsData) {
    const dropdown = document.getElementById("filterDropdown");
    if (!dropdown)
        return;
    dropdown.innerHTML = '';
    effects.forEach((effect) => {
        const li = document.createElement("li");
        li.textContent = effect.title;
        li.classList.add(effect.harmful ? "harmfull" : "beneficial");
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
    const input = document.getElementById("filterInput");
    const filter = input.value.toUpperCase();
    const dropdown = document.getElementById("filterDropdown");
    if (!dropdown)
        return;
    const items = dropdown.getElementsByTagName("li");
    for (let i = 0; i < items.length; i++) {
        const txtValue = items[i].textContent || items[i].innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            items[i].style.display = "";
        }
        else {
            items[i].style.display = "none";
        }
    }
}
var PreFilterType;
(function (PreFilterType) {
    PreFilterType[PreFilterType["isPureCheck"] = 0] = "isPureCheck";
    PreFilterType[PreFilterType["isLimit2IgrCheck"] = 1] = "isLimit2IgrCheck";
    PreFilterType[PreFilterType["isGardenCheck"] = 2] = "isGardenCheck";
})(PreFilterType || (PreFilterType = {}));
function preFilterLimiters() {
    preFilteredRecipes = allRecipes;
    const allPreFilterTypeStrings = Object.keys(PreFilterType).filter(key => Number.isNaN(parseInt(key)));
    for (const preFilterType of allPreFilterTypeStrings) {
        const checkbox = document.getElementById(preFilterType);
        if (checkbox.checked && preFilterType == PreFilterType[PreFilterType.isPureCheck]) {
            preFilteredRecipes = preFilteredRecipes.filter(recipe => {
                return !recipe.effects.some(effect => { var _a, _b; return ((_a = effect.effectData) === null || _a === void 0 ? void 0 : _a.harmful) != ((_b = recipe.effects[0].effectData) === null || _b === void 0 ? void 0 : _b.harmful); });
            });
        }
        if (checkbox.checked && preFilterType == PreFilterType[PreFilterType.isLimit2IgrCheck]) {
            preFilteredRecipes = preFilteredRecipes.filter(recipe => {
                return recipe.ingredients.length == 2;
            });
        }
        if (checkbox.checked && preFilterType == PreFilterType[PreFilterType.isGardenCheck]) {
            preFilteredRecipes = preFilteredRecipes.filter(recipe => {
                return recipe.ingredients.every(ingredient => ingredient.garden != null);
            });
        }
    }
    const divContainer = document.getElementById("originPreFilterContainer");
    const inputFields = divContainer.querySelectorAll("input");
    inputFields.forEach((input) => {
        if (!input.checked) {
            preFilteredRecipes = preFilteredRecipes.filter(recipe => {
                return !recipe.ingredients.some(ingredient => ingredient.origin == input.value);
            });
        }
    });
    applyFilter();
}
var includeConditions = { ingredientKeys: [], effectKeys: [] };
var excludeConditions = { ingredientKeys: [], effectKeys: [] };
function addFilterCondition(key, action, type) {
    removeFilterCondition(key, type);
    if (action == FilterAction.Include) {
        if (type == FilterType.Effect) {
            includeConditions.effectKeys.push(key);
        }
        if (type == FilterType.Ingredient) {
            includeConditions.ingredientKeys.push(key);
        }
    }
    if (action == FilterAction.Exclude) {
        if (type == FilterType.Effect) {
            excludeConditions.effectKeys.push(key);
        }
        if (type == FilterType.Ingredient) {
            excludeConditions.ingredientKeys.push(key);
        }
    }
    addFilterGUI(key, action, type);
    applyFilter();
}
function removeFilterCondition(filterKey, type) {
    if (type == FilterType.Effect) {
        includeConditions.effectKeys = includeConditions.effectKeys.filter(key => key != filterKey);
        excludeConditions.effectKeys = excludeConditions.effectKeys.filter(key => key != filterKey);
    }
    if (type == FilterType.Ingredient) {
        includeConditions.ingredientKeys = includeConditions.ingredientKeys.filter(key => key != filterKey);
        excludeConditions.ingredientKeys = excludeConditions.ingredientKeys.filter(key => key != filterKey);
    }
    removeFilterGUI(filterKey);
    applyFilter();
}
function addFilterGUI(effectKey, action, type) {
    const filtersContainer = document.querySelector('#filtersContainer');
    const div = document.createElement('div');
    div.className = `filterCondition${FilterAction[action]}`;
    div.textContent = effectKey;
    div.onmousedown = () => removeFilterCondition(effectKey, type);
    filtersContainer.appendChild(div);
}
function removeFilterGUI(effectKey) {
    const filtersContainer = document.querySelector('#filtersContainer');
    for (const filterItem of filtersContainer.getElementsByTagName("div")) {
        if (filterItem.textContent == effectKey) {
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
    let filteredResults = [];
    if (!includeConditions.effectKeys.length &&
        !includeConditions.ingredientKeys.length) {
        filteredResults = preFilteredRecipes;
    }
    else {
        filteredResults = preFilteredRecipes.filter((recipe) => {
            return includeConditions.effectKeys.every(effectKey => recipe.effects.find(effect => effect.fkey == effectKey))
                && includeConditions.ingredientKeys.every(ingredientKey => recipe.ingredientKeys.find(ingredient => ingredient == ingredientKey));
        });
    }
    if (!excludeConditions.effectKeys.length &&
        !excludeConditions.ingredientKeys.length) {
        drawRecipesTableGUI(filteredResults);
        return;
    }
    const finalResults = filteredResults.filter((recipe) => {
        return !excludeConditions.effectKeys.some(excludeEffect => recipe.effects.some(effect => effect.fkey == excludeEffect))
            && !excludeConditions.ingredientKeys.some(excludeIgr => recipe.ingredientKeys.some(ingredient => ingredient == excludeIgr));
    });
    drawRecipesTableGUI(finalResults);
}
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});
