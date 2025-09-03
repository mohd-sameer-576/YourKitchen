let searchInput = document.querySelector('#searchInput');
let searchbtn = document.querySelector('.search-btn');
let recContainer = document.querySelector('.recContainer');
let categoryBar = document.querySelector('#categoryBar');

let currentCategory = 'All';

async function fetchRecipes(query = '') {
    recContainer.innerHTML = "<div style='color:#fff;padding:14px'>Fetching dishes...</div>";

    let url;
    if (query) {
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
    } else if (currentCategory && currentCategory !== 'All') {
        url = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(currentCategory)}`;
    } else {
        // default: random selection of meals by a generic search to show something
        url = `https://www.themealdb.com/api/json/v1/1/search.php?s=chicken`;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        const meals = data.meals || [];

        if (!meals.length) {
            recContainer.innerHTML = "<div style='color:#fff;padding:14px'>No recipes found. Try another search or category.</div>";
            return;
        }

        // When using filter.php, meals have fewer fields; we only show what exists
        renderCards(meals);
    } catch (e) {
        recContainer.innerHTML = "<div style='color:#fff;padding:14px'>Failed to fetch recipes. Please try again later.</div>";
    }
}

function renderCards(meals){
    recContainer.innerHTML = "";
    meals.forEach(meal => {
        const title = meal.strMeal || '';
        const thumb = meal.strMealThumb || '';
        const area = meal.strArea || '';
        const category = meal.strCategory || currentCategory || '';

        let recCard = document.createElement('div');
        recCard.classList.add('recCard');
        recCard.innerHTML = `
            <div class="media">
                <img src="${thumb}" alt="${title}">
            </div>
            <h3>${title}</h3>
            <div class="recMeta">
                ${category ? `<span>${category}</span>` : ''}
                ${area ? `<span>${area}</span>` : ''}
            </div>
            <p>${(meal.strInstructions || '').slice(0, 120)}${meal.strInstructions && meal.strInstructions.length > 120 ? '...' : ''}</p>
        `;
        let actions = document.createElement('div');
        actions.classList.add('recActions');

        let button = document.createElement('button');
        button.classList.add('recbtn');
        button.textContent = "Get Recipe";
        actions.appendChild(button);
        recCard.appendChild(actions);

        button.addEventListener('click', async () => {
            // If we came from filter.php, we need full details by id
            if (!meal.strInstructions && meal.idMeal) {
                const full = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`).then(r => r.json());
                const detail = (full.meals && full.meals[0]) ? full.meals[0] : meal;
                openRecipeModal(detail);
            } else {
                openRecipeModal(meal);
            }
        });

        recContainer.appendChild(recCard);
    });
}

async function loadCategories(){
    try {
        const res = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?c=list');
        const data = await res.json();
        const cats = (data.meals || []).map(c => c.strCategory);

        const all = ['All', ...cats];
        categoryBar.innerHTML = '';
        all.forEach(cat => {
            const chip = document.createElement('button');
            chip.className = 'category-chip' + (cat === currentCategory ? ' active' : '');
            chip.textContent = cat;
            chip.addEventListener('click', () => {
                currentCategory = cat;
                Array.from(categoryBar.children).forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                fetchRecipes();
            });
            categoryBar.appendChild(chip);
        });
    } catch (e) {
        categoryBar.innerHTML = '';
    }
}

function openRecipeModal(meal){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">${meal.strMeal}</div>
                <button class="modal-close" aria-label="Close">✕</button>
            </div>
            <div class="modal-body">
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
                <div>
                    <div class="modal-section">
                        <h4>Details</h4>
                        <div class="recMeta" style="margin:0 0 8px 0;">
                            ${meal.strCategory ? `<span>${meal.strCategory}</span>` : ''}
                            ${meal.strArea ? `<span>${meal.strArea}</span>` : ''}
                        </div>
                    </div>
                    <div class="modal-section">
                        <h4>Ingredients</h4>
                        <ul id="ingredientsList" style="margin-left:18px"></ul>
                    </div>
                    <div class="modal-section">
                        <h4>Instructions</h4>
                        <div class="modal-instructions">${meal.strInstructions || 'No instructions available.'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Populate ingredients
    const ingredientsList = overlay.querySelector('#ingredientsList');
    for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
            const li = document.createElement('li');
            li.textContent = `${ing}${measure && measure.trim() ? ` - ${measure}` : ''}`;
            ingredientsList.appendChild(li);
        }
    }

    document.body.appendChild(overlay);

    // Close handlers
    const closeBtn = overlay.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    document.addEventListener('keydown', function escHandler(e){
        if (e.key === 'Escape'){
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

searchbtn.addEventListener('click', () => {
    fetchRecipes(searchInput.value.trim());
});

// Enter key search
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchRecipes(searchInput.value.trim());
    }
});

// Initial load
loadCategories();
fetchRecipes();