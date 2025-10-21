// 전역 변수
let currentIngredients = [];
let recipes = [];
let recipeIngredients = [];

// 저장 알림 표시 함수
function showSaveNotification(message = '✅ 저장하였습니다') {
    const overlay = document.getElementById('save-overlay');
    const messageElement = overlay.querySelector('.save-message');
    messageElement.textContent = message;
    overlay.classList.add('show');
    
    setTimeout(() => {
        overlay.classList.remove('show');
    }, 1500);
}

// 페이지 전환 함수
function showPage(pageId) {
    // 모든 페이지 숨기기
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 모든 탭 비활성화
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 선택된 페이지 보이기
    document.getElementById(pageId).classList.add('active');
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    
    // 레시피 입력 페이지로 이동 시 카테고리 드롭다운 업데이트
    if (pageId === 'recipe-input') {
        updateRecipeCategoryDropdown();
    }
    
    // 가능한 레시피 페이지로 이동 시 업데이트
    if (pageId === 'makeable-recipes') {
        updateMakeableRecipes();
    }
}


// 재료 목록 업데이트
function updateIngredientList() {
    const container = document.getElementById('ingredient-list');
    container.innerHTML = '';
    
    console.log('업데이트할 재료 목록:', currentIngredients);
    
    if (currentIngredients.length === 0) {
        container.innerHTML = '<div class="no-results">추가된 재료가 없습니다.</div>';
        return;
    }
    
    currentIngredients.forEach((ingredient, index) => {
        const item = document.createElement('div');
        item.className = 'ingredient-item';
        item.innerHTML = `
            <div style="flex: 1; min-width: 0;">
                <strong style="font-size: 1.1rem; word-break: break-word;">${ingredient.name}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <button class="btn" onclick="decreaseQuantity(${index})" style="padding: 8px 12px; font-size: 0.9rem; min-width: 40px;">-</button>
                <input type="number" value="${ingredient.quantity}" min="0" 
                       onchange="updateQuantity(${index}, this.value)" 
                       style="width: 70px; padding: 8px; text-align: center; border: 2px solid #cbd5e0; border-radius: 4px; font-size: 0.9rem; background: #f7fafc;">
                <button class="btn" onclick="increaseQuantity(${index})" style="padding: 8px 12px; font-size: 0.9rem; min-width: 40px;">+</button>
            </div>
        `;
        container.appendChild(item);
    });
    
    console.log('재료 목록 업데이트 완료, 총', currentIngredients.length, '개');
}

// 수량 증가
function increaseQuantity(index) {
    currentIngredients[index].quantity++;
    updateIngredientList();
}

// 수량 감소
function decreaseQuantity(index) {
    if (currentIngredients[index].quantity > 0) {
        currentIngredients[index].quantity--;
        updateIngredientList();
    }
}

// 수량 직접 수정
function updateQuantity(index, value) {
    const quantity = parseInt(value);
    if (quantity >= 0) {
        currentIngredients[index].quantity = quantity;
        updateIngredientList();
    }
}


// 현재 재료 수량 저장
async function saveCurrentIngredients() {
    if (currentIngredients.length === 0) {
        return;
    }
    
    // JSON 파일로 저장할 데이터 준비
    const data = {
        ingredients: currentIngredients,
        recipes: recipes,
        lastUpdated: new Date().toISOString(),
        version: "1.0"
    };
    
    try {
        // 백엔드 API로 데이터 저장
        const response = await fetch('/api/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('데이터가 성공적으로 저장되었습니다.');
            showSaveNotification('재료 수량을 저장하였습니다');
            
            // 재료 목록 업데이트
            updateIngredientList();
        } else {
            console.error('저장 실패:', result.message);
        }
    } catch (error) {
        console.error('서버 저장 실패:', error);
        // 실패 시 다운로드 방식으로 폴백
        downloadDataAsFile(data);
    }
}

// 전체 재료 삭제
function clearIngredients() {
    if (currentIngredients.length === 0) {
        showStatus('ingredient-status', '삭제할 재료가 없습니다.', 'info');
        return;
    }
    
    if (confirm('모든 재료를 삭제하시겠습니까?')) {
        currentIngredients = [];
        updateIngredientList();
        saveIngredientsToStorage();
        showStatus('ingredient-status', '모든 재료가 삭제되었습니다.', 'success');
    }
}

// 레시피 검색 함수
function searchRecipes() {
    if (currentIngredients.length === 0) {
        alert('먼저 재료를 입력해주세요.');
        return;
    }
    
    showPage('makeable-recipes');
    updateMakeableRecipes();
}

// 가능한 레시피 업데이트
function updateMakeableRecipes() {
    const availableRecipes = recipes.filter(recipe => {
        return recipe.ingredients.every(recipeIngredient => {
            const availableIngredient = currentIngredients.find(ingredient => 
                ingredient.name.replace(/\s/g, '') === recipeIngredient.name.replace(/\s/g, '')
            );
            return availableIngredient && availableIngredient.quantity >= recipeIngredient.quantity;
        });
    });
    
    // 카테고리 필터 업데이트
    updateMakeableCategoryFilter(availableRecipes);
    
    // 레시피 표시
    displayMakeableRecipes(availableRecipes);
}

// 가능한 레시피의 카테고리 필터 업데이트
function updateMakeableCategoryFilter(availableRecipes) {
    const filter = document.getElementById('makeable-category-filter');
    const categories = new Set(['전체']);
    
    availableRecipes.forEach(recipe => {
        if (recipe.category) {
            categories.add(recipe.category);
        }
    });
    
    const currentValue = filter.value;
    filter.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filter.appendChild(option);
    });
    
    if (Array.from(categories).includes(currentValue)) {
        filter.value = currentValue;
    }
}

// 가능한 레시피 카테고리별 필터링
function filterMakeableRecipesByCategory() {
    const selectedCategory = document.getElementById('makeable-category-filter').value;
    
    const availableRecipes = recipes.filter(recipe => {
        return recipe.ingredients.every(recipeIngredient => {
            const availableIngredient = currentIngredients.find(ingredient => 
                ingredient.name.replace(/\s/g, '') === recipeIngredient.name.replace(/\s/g, '')
            );
            return availableIngredient && availableIngredient.quantity >= recipeIngredient.quantity;
        });
    });
    
    if (selectedCategory === '전체') {
        displayMakeableRecipes(availableRecipes);
    } else {
        const filteredRecipes = availableRecipes.filter(recipe => recipe.category === selectedCategory);
        displayMakeableRecipes(filteredRecipes);
    }
}

// 가능한 레시피 표시
function displayMakeableRecipes(recipes) {
    const container = document.getElementById('makeable-recipes-results');
    
    if (recipes.length === 0) {
        container.innerHTML = '<div class="no-results">현재 재료로 만들 수 있는 레시피가 없습니다.</div>';
        return;
    }
    
    container.innerHTML = '';
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const ingredientsText = recipe.ingredients.map(ing => 
            `${ing.name} ${ing.quantity}개${ing.processing ? ' (가공필요)' : ''}`
        ).join(', ');
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="display: flex; align-items: flex-end; gap: 10px; flex: 1;">
                    <h3 style="margin: 0; font-size: 1.6rem; line-height: 1.2;">${recipe.name}</h3>
                    <span style="background: #667eea; color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 2px;">${recipe.category}</span>
                </div>
            </div>
            ${recipe.quantity ? `<div style="margin-bottom: 10px;"><span style="background: #38a169; color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.85rem;">수량: ${recipe.quantity}</span></div>` : ''}
            ${recipe.description ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 10px;">${recipe.description}</p>` : ''}
            <div class="recipe-ingredients">
                <strong>필요 재료:</strong> ${ingredientsText}
            </div>
        `;
        
        container.appendChild(card);
    });
}

// 현재 레시피 리스트 표시 함수
function showRecipeList() {
    showPage('recipe-list');
    updateCategoryFilter();
    displayRecipeList(recipes);
}

// 카테고리 필터 업데이트
function updateCategoryFilter() {
    const filter = document.getElementById('category-filter');
    const categories = new Set(['전체']);
    
    // 모든 레시피의 카테고리 수집
    recipes.forEach(recipe => {
        if (recipe.category) {
            categories.add(recipe.category);
        }
    });
    
    // 현재 선택된 값 저장
    const currentValue = filter.value;
    
    // 옵션 업데이트
    filter.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filter.appendChild(option);
    });
    
    // 이전 선택 복원 (가능하면)
    if (Array.from(categories).includes(currentValue)) {
        filter.value = currentValue;
    }
}

// 카테고리별 레시피 필터링
function filterRecipesByCategory() {
    const selectedCategory = document.getElementById('category-filter').value;
    
    if (selectedCategory === '전체') {
        displayRecipeList(recipes);
    } else {
        const filteredRecipes = recipes.filter(recipe => recipe.category === selectedCategory);
        displayRecipeList(filteredRecipes);
    }
}

// 레시피 수정 함수
function editRecipe(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    // 수정 모드 ID 설정
    window.editingRecipeId = recipeId;
    
    // 레시피 입력 페이지로 이동
    showPage('recipe-input');
    
    // 폼에 기존 데이터 채우기
    document.getElementById('recipe-name').value = recipe.name;
    document.getElementById('recipe-category-custom').value = recipe.category;
    document.getElementById('recipe-category').value = recipe.category;
    document.getElementById('recipe-quantity').value = recipe.quantity || 1;
    document.getElementById('recipe-description').value = recipe.description || '';
    
    // 재료 데이터 설정
    recipeIngredients = [...recipe.ingredients];
    
    // 기존 재료 입력 칸들 제거
    const ingredientRows = document.getElementById('ingredient-rows');
    ingredientRows.innerHTML = '';
    
    // 재료 데이터로 입력 칸들 생성
    recipe.ingredients.forEach((ingredient, index) => {
        const newRow = document.createElement('div');
        newRow.className = 'ingredient-input-group';
        newRow.style.marginBottom = '10px';
        newRow.innerHTML = `
            <input type="text" placeholder="재료 이름" style="flex: 2;" value="${ingredient.name}" onchange="updateRecipeIngredientsList()">
            <input type="number" placeholder="수량" min="1" value="${ingredient.quantity}" style="flex: 1;" onchange="updateRecipeIngredientsList()">
            <select style="flex: 1.5;" onchange="updateRecipeIngredientsList()">
                <option value="false" ${!ingredient.processing ? 'selected' : ''}>가공불필요</option>
                <option value="true" ${ingredient.processing ? 'selected' : ''}>가공필요</option>
            </select>
            <button type="button" class="btn btn-danger" onclick="removeIngredientRow(this)" style="padding: 8px 12px; font-size: 0.8rem;">삭제</button>
        `;
        ingredientRows.appendChild(newRow);
    });
    
    updateRecipeIngredientsList();
}

// 레시피 삭제 함수
function deleteRecipe(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    const confirmed = confirm(`"${recipe.name}" 레시피를 삭제하시겠습니까?\n\n확인: 삭제\n취소: 삭제하지 않음`);
    
    if (confirmed) {
        const index = recipes.findIndex(r => r.id === recipeId);
        if (index > -1) {
            recipes.splice(index, 1);
            saveRecipesToStorage();
            updateCategoryFilter();
            filterRecipesByCategory();
            showStatus('recipe-list-status', `"${recipe.name}" 레시피가 삭제되었습니다.`, 'success');
        }
    } else {
        showStatus('recipe-list-status', '삭제가 취소되었습니다.', 'info');
    }
}

// 레시피 리스트 표시
function displayRecipeList(recipes) {
    const container = document.getElementById('recipe-list-results');
    
    if (recipes.length === 0) {
        container.innerHTML = '<div class="no-results">등록된 레시피가 없습니다.</div>';
        showStatus('recipe-list-status', '등록된 레시피가 없습니다.', 'info');
        return;
    }
    
    container.innerHTML = '';
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const ingredientsText = recipe.ingredients.map(ing => 
            `${ing.name} ${ing.quantity}개`
        ).join(', ');
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="display: flex; align-items: flex-end; gap: 10px; flex: 1;">
                    <h3 style="margin: 0; font-size: 1.6rem; line-height: 1.2;">${recipe.name}</h3>
                    <span style="background: #667eea; color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.85rem; margin-bottom: 2px;">${recipe.category}</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn" onclick="editRecipe(${recipe.id})" style="padding: 5px 10px; font-size: 0.8rem; background: #38a169;">수정</button>
                    <button class="btn btn-danger" onclick="deleteRecipe(${recipe.id})" style="padding: 5px 10px; font-size: 0.8rem;">삭제</button>
                </div>
            </div>
            ${recipe.quantity ? `<div style="margin-bottom: 10px;"><span style="background: #38a169; color: white; padding: 4px 10px; border-radius: 10px; font-size: 0.85rem;">수량: ${recipe.quantity}</span></div>` : ''}
            ${recipe.description ? `<p style="color: #718096; font-size: 0.9rem; margin-bottom: 10px;">${recipe.description}</p>` : ''}
            <div class="recipe-ingredients">
                <strong>필요 재료:</strong> ${ingredientsText}
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // 레시피 리스트는 조용히 표시
}

// 레시피 재료 추가
function addRecipeIngredient() {
    const name = document.getElementById('recipe-ingredient-name').value.trim();
    const quantity = parseInt(document.getElementById('recipe-ingredient-quantity').value);
    
    if (!name) {
        alert('재료 이름을 입력해주세요.');
        return;
    }
    
    if (quantity <= 0) {
        alert('수량은 1개 이상이어야 합니다.');
        return;
    }
    
    recipeIngredients.push({ name, quantity });
    
    // 입력 필드 초기화
    document.getElementById('recipe-ingredient-name').value = '';
    document.getElementById('recipe-ingredient-quantity').value = '1';
    
    // 재료 목록 업데이트
    updateRecipeIngredientsList();
}

// 레시피 재료 목록 업데이트
function updateRecipeIngredientsList() {
    const container = document.getElementById('recipe-ingredients-tags');
    container.innerHTML = '';
    
    // 입력 칸에서 재료 정보 수집
    const rows = document.querySelectorAll('#ingredient-rows .ingredient-input-group');
    recipeIngredients = [];
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input, select');
        const name = inputs[0].value.trim();
        const quantity = parseInt(inputs[1].value) || 1;
        const processing = inputs[2].value === 'true';
        
        if (name) {
            recipeIngredients.push({ name, quantity, processing });
        }
    });
    
    // 태그 표시
    recipeIngredients.forEach((ingredient, index) => {
        const tag = document.createElement('span');
        tag.className = 'ingredient-tag';
        tag.innerHTML = `${ingredient.name} ${ingredient.quantity}개 <span class="remove" onclick="removeRecipeIngredient(${index})">×</span>`;
        container.appendChild(tag);
    });
}

// 레시피 재료 삭제
function removeRecipeIngredient(index) {
    recipeIngredients.splice(index, 1);
    updateRecipeIngredientsList();
}

// 재료 입력 칸 추가
function addIngredientRow() {
    const container = document.getElementById('ingredient-rows');
    const newRow = document.createElement('div');
    newRow.className = 'ingredient-input-group';
    newRow.style.marginBottom = '10px';
    newRow.innerHTML = `
        <input type="text" placeholder="재료 이름" style="flex: 2;" onchange="updateRecipeIngredientsList()">
        <input type="number" placeholder="수량" min="1" value="1" style="flex: 1;" onchange="updateRecipeIngredientsList()">
        <select style="flex: 1.5;" onchange="updateRecipeIngredientsList()">
            <option value="false">가공불필요</option>
            <option value="true">가공필요</option>
        </select>
        <button type="button" class="btn btn-danger" onclick="removeIngredientRow(this)" style="padding: 8px 12px; font-size: 0.8rem;">삭제</button>
    `;
    container.appendChild(newRow);
}

// 재료 입력 칸 삭제
function removeIngredientRow(button) {
    const row = button.parentElement;
    row.remove();
    updateRecipeIngredientsList();
}

// 레시피 입력 페이지의 카테고리 드롭다운 업데이트
function updateRecipeCategoryDropdown() {
    const select = document.getElementById('recipe-category-select');
    const categories = new Set(['직접입력']);
    
    // 모든 레시피의 카테고리 수집
    recipes.forEach(recipe => {
        if (recipe.category) {
            categories.add(recipe.category);
        }
    });
    
    // 현재 선택된 값 저장
    const currentValue = select.value;
    
    // 옵션 업데이트
    select.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category === '직접입력' ? '' : category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    // 이전 선택 복원 (가능하면)
    if (currentValue) {
        select.value = currentValue;
    }
}

// 카테고리 선택 처리
function handleCategoryChange() {
    const select = document.getElementById('recipe-category-select');
    const customInput = document.getElementById('recipe-category-custom');
    const hiddenInput = document.getElementById('recipe-category');
    
    if (select.value) {
        customInput.value = select.value;
        hiddenInput.value = select.value;
    }
}

// 직접입력 카테고리 값 업데이트
function updateCategoryValue() {
    const customInput = document.getElementById('recipe-category-custom');
    const hiddenInput = document.getElementById('recipe-category');
    hiddenInput.value = customInput.value.trim();
}

// 레시피 추가/수정
function addRecipe(event) {
    event.preventDefault();
    
    const name = document.getElementById('recipe-name').value.trim();
    
    // 카테고리 값 확인 (직접입력 우선)
    const categoryCustom = document.getElementById('recipe-category-custom').value.trim();
    const category = categoryCustom || document.getElementById('recipe-category').value;
    
    // hidden input에도 설정
    document.getElementById('recipe-category').value = category;
    
    const quantity = parseInt(document.getElementById('recipe-quantity').value) || 1;
    const description = document.getElementById('recipe-description').value.trim();
    
    if (!name || !category) {
        alert('레시피 이름과 카테고리를 모두 입력해주세요.');
        return;
    }
    
    if (recipeIngredients.length === 0) {
        alert('최소 1개 이상의 재료를 추가해주세요.');
        return;
    }
    
    // 모든 재료에 이름이 있는지 확인
    const hasEmptyIngredient = recipeIngredients.some(ing => !ing.name || ing.name.trim() === '');
    if (hasEmptyIngredient) {
        alert('모든 재료의 이름을 입력해주세요.');
        return;
    }
    
    // 수정 모드인지 확인 (기존 레시피 이름과 같은지 체크)
    const existingRecipe = recipes.find(r => r.name === name && r.id !== window.editingRecipeId);
    if (existingRecipe) {
        alert('같은 이름의 레시피가 이미 존재합니다.');
        return;
    }
    
    if (window.editingRecipeId) {
        // 수정 모드
        const recipeIndex = recipes.findIndex(r => r.id === window.editingRecipeId);
        if (recipeIndex > -1) {
            recipes[recipeIndex] = {
                ...recipes[recipeIndex],
                name,
                category,
                quantity,
                description,
                ingredients: [...recipeIngredients],
                updatedAt: new Date().toISOString()
            };
        }
        window.editingRecipeId = null;
    } else {
        // 새로 추가
        const maxId = recipes.length > 0 ? Math.max(...recipes.map(r => r.id)) : 0;
        
        const newRecipe = {
            id: maxId + 1,
            name,
            category,
            quantity,
            description,
            ingredients: [...recipeIngredients],
            createdAt: new Date().toISOString()
        };
        
        recipes.push(newRecipe);
        
        // 새 레시피의 재료들을 보유 재료 목록에 추가 (수량 0으로)
        recipeIngredients.forEach(ingredient => {
            // 띄어쓰기 제거하고 비교
            const normalizedName = ingredient.name.replace(/\s/g, '');
            const exists = currentIngredients.find(ing => 
                ing.name.replace(/\s/g, '') === normalizedName
            );
            if (!exists) {
                currentIngredients.push({ name: ingredient.name, quantity: 0 });
            }
        });
        
        updateIngredientList();
    }
    
    saveRecipesToStorage();
    clearRecipeForm();
}

// 레시피 폼 초기화
function clearRecipeForm() {
    document.getElementById('recipe-name').value = '';
    document.getElementById('recipe-category-select').value = '';
    document.getElementById('recipe-category-custom').value = '';
    document.getElementById('recipe-category').value = '';
    document.getElementById('recipe-quantity').value = '1';
    document.getElementById('recipe-description').value = '';
    
    // 재료 입력 칸들 초기화
    const ingredientRows = document.getElementById('ingredient-rows');
    ingredientRows.innerHTML = `
        <div class="ingredient-input-group" style="margin-bottom: 10px;">
            <input type="text" placeholder="재료 이름" style="flex: 2;" onchange="updateRecipeIngredientsList()">
            <input type="number" placeholder="수량" min="1" value="1" style="flex: 1;" onchange="updateRecipeIngredientsList()">
            <select style="flex: 1.5;" onchange="updateRecipeIngredientsList()">
                <option value="false">가공불필요</option>
                <option value="true">가공필요</option>
            </select>
            <button type="button" class="btn btn-danger" onclick="removeIngredientRow(this)" style="padding: 8px 12px; font-size: 0.8rem;">삭제</button>
        </div>
    `;
    
    recipeIngredients = [];
    updateRecipeIngredientsList();
    window.editingRecipeId = null;
}

// 데이터 저장 함수들 (메모리에서만 관리)
function saveIngredientsToStorage() {
    // 메모리에서만 관리
}



async function saveRecipesToStorage() {
    // JSON 파일로 저장할 데이터 준비
    const data = {
        ingredients: currentIngredients,
        recipes: recipes,
        lastUpdated: new Date().toISOString(),
        version: "1.0"
    };
    
    try {
        // 백엔드 API로 데이터 저장
        const response = await fetch('/api/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('데이터가 성공적으로 저장되었습니다.');
            showSaveNotification('레시피를 저장하였습니다');
            
            // 레시피 리스트 업데이트
            if (document.getElementById('recipe-list-results')) {
                updateCategoryFilter();
                filterRecipesByCategory();
            }
            
            // 재료 목록도 업데이트
            updateIngredientList();
        } else {
            console.error('저장 실패:', result.message);
        }
    } catch (error) {
        console.error('서버 저장 실패:', error);
        // 실패 시 다운로드 방식으로 폴백
        downloadDataAsFile(data);
    }
}

// 다운로드 방식 (폴백)
function downloadDataAsFile(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadRecipesFromStorage() {
    // 페이지 로드 시 샘플 데이터로 초기화
    if (recipes.length === 0) {
        recipes = [
            {
                id: 1,
                name: "바나나 빵",
                category: "빵",
                description: "달콤하고 부드러운 바나나 빵",
                ingredients: [
                    { name: "바나나", quantity: 2 },
                    { name: "밀가루", quantity: 1 },
                    { name: "달걀", quantity: 1 },
                    { name: "우유", quantity: 1 }
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: "치킨 스테이크",
                category: "요리",
                description: "부드럽고 맛있는 치킨 스테이크",
                ingredients: [
                    { name: "닭고기", quantity: 1 },
                    { name: "버터", quantity: 1 },
                    { name: "소금", quantity: 1 }
                ],
                createdAt: new Date().toISOString()
            }
        ];
    }
}

// 상태 메시지 표시 (중앙 오버레이 사용)
function showStatus(elementId, message, type) {
    // success 타입만 중앙 오버레이로 표시
    if (type === 'success') {
        showSaveNotification(message);
    } else {
        // error나 info는 콘솔에만 표시
        console.log(`[${type}] ${message}`);
    }
}

// JSON 파일에서 데이터 로드
async function loadDataFromFile() {
    try {
        const response = await fetch('./data.json');
        if (response.ok) {
            const data = await response.json();
            currentIngredients = data.ingredients || [];
            recipes = data.recipes || [];
            console.log('데이터 파일에서 로드됨:', data);
            console.log('로드된 재료 수:', currentIngredients.length);
            console.log('로드된 레시피 수:', recipes.length);
            
            // 모든 레시피의 재료를 보유 재료 목록에 추가
            addAllRecipeIngredients();
            
            updateIngredientList();
            
            // 레시피 리스트도 업데이트
            if (document.getElementById('recipe-list-results')) {
                updateCategoryFilter();
                displayRecipeList(recipes);
            }
        } else {
            console.log('data.json 파일이 없습니다.');
        }
    } catch (error) {
        console.log('데이터 로드 실패:', error);
    }
}


// 모든 레시피의 재료를 보유 재료 목록에 추가 (수량 0으로)
function addAllRecipeIngredients() {
    const allIngredients = new Map(); // 정규화된 이름 -> 실제 이름
    
    // 현재 보유 재료들을 먼저 추가
    currentIngredients.forEach(ingredient => {
        const normalized = ingredient.name.replace(/\s/g, '');
        allIngredients.set(normalized, ingredient.name);
    });
    
    // 모든 레시피의 재료들을 수집
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ingredient => {
            const normalized = ingredient.name.replace(/\s/g, '');
            if (!allIngredients.has(normalized)) {
                allIngredients.set(normalized, ingredient.name);
            }
        });
    });
    
    // 새로운 재료들을 수량 0으로 추가
    allIngredients.forEach((actualName, normalizedName) => {
        const exists = currentIngredients.find(ingredient => 
            ingredient.name.replace(/\s/g, '') === normalizedName
        );
        if (!exists) {
            currentIngredients.push({ name: actualName, quantity: 0 });
        }
    });
}

// 페이지 로드 시 데이터 불러오기
window.onload = function() {
    // JSON 파일에서 로드 시도
    loadDataFromFile();
};
