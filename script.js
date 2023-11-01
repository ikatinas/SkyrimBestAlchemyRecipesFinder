function fetchData() {
    const promises = [
      fetch('db/effects_db.json').then(response => response.json()),
      fetch('db/ingredients_db.json').then(response => response.json())
    ];
  
    Promise.all(promises)
      .then(data => {
        const effectsData = data[0];
        const ingredientsData = data[1];
        parseData(effectsData, ingredientsData);
      })
      .catch(error => console.log('Error:', error));
  }
  
  function parseData(effectsData, ingredientsData) {
    const searchInput = document.querySelector('#searchInput');
    const resultsList = document.querySelector('#results');
  
    searchInput.addEventListener('input', () => {
      const searchValue = searchInput.value.toLowerCase();
  
      resultsList.innerHTML = '';
  
      const results = effectsData.filter(effect => {
        const relatedRecords = ingredientsData.filter(ingredient => effect.ingredients.includes(ingredient.pkey));
        if (relatedRecords) {
          effect.relatedRecords = relatedRecords;
          return effect.title.toLowerCase().includes(searchValue) ||
            effect.relatedRecords.find(ingredient => ingredient.title.toLowerCase().includes(searchValue));
        }
        return effect.title.toLowerCase().includes(searchValue);
      });
  
      results.forEach(item => {
        const li = document.createElement('li');
        const mainTitleSpan = document.createElement('span');
        mainTitleSpan.textContent = item.title;
      
        li.appendChild(mainTitleSpan);
      
        if (item.relatedRecords) {
          const subList = document.createElement('ul');
          item.relatedRecords.forEach(subItem => {
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