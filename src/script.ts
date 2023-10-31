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

async function fetchData(): Promise<void> {
  const promises: Promise<any>[] = [
    fetch('db/effects_db.json').then((response) => response.json()),
    fetch('db/ingredients_db.json').then((response) => response.json())
  ];

  try {
    const [effectsData, ingredientsData] = await Promise.all(promises);
    parseData(effectsData, ingredientsData);
  } catch (error) {
    console.log('Error:', error);
  }
}

function parseData(effectsData: EffectData[], ingredientsData: IngredientData[]): void {
  const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
  const resultsList = document.querySelector('#results') as HTMLDivElement;

  searchInput.addEventListener('input', () => {
    const searchValue = searchInput.value.toLowerCase();

    resultsList.innerHTML = '';

    const results = effectsData.filter((effect) => {
      const relatedRecords = ingredientsData.filter((ingredient) => effect.ingredients.includes(ingredient.pkey));
      if (relatedRecords.length > 0) {
        effect.relatedRecords = relatedRecords;
        return effect.title.toLowerCase().includes(searchValue) ||
            effect.relatedRecords.find(ingredient => ingredient.title.toLowerCase().includes(searchValue));
      }
      return effect.title.toLowerCase().includes(searchValue);
    });

    results.forEach((item) => {
      const li = document.createElement('li');
      const mainTitleSpan = document.createElement('span');
      mainTitleSpan.textContent = item.title;

      li.appendChild(mainTitleSpan);

      if (item.relatedRecords) {
        const subList = document.createElement('ul');
        item.relatedRecords.forEach((subItem) => {
          const subLi = document.createElement('li');
          subLi.textContent = subItem.title;
          subList.appendChild(subLi);
        });

        li.appendChild(subList);
      }

      resultsList.appendChild(li);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
});