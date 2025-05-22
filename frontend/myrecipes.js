document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.getElementById('nav-links');
  const userInfo = document.getElementById('userInfo');
  const usernameDisplay = document.getElementById('usernameDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const recipesList = document.getElementById('recipesList');
  const btnAddRecipe = document.getElementById('btnAddRecipe');
  const recipeModalEl = document.getElementById('recipeModal');
  const recipeModal = new bootstrap.Modal(recipeModalEl);
  const recipeForm = document.getElementById('recipeForm');
  const formMsg = document.getElementById('formMsg');

  let currentUser = null;

  function updateUserUI() {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      currentUser = JSON.parse(userStr);
      usernameDisplay.textContent = `สวัสดี, ${currentUser.username}`;
      userInfo.classList.remove('d-none');
      navLinks.classList.add('d-none');
    } else {
      currentUser = null;
      userInfo.classList.add('d-none');
      navLinks.classList.remove('d-none');
      window.location.href = 'index.html';
    }
  }

  async function loadMyRecipes() {
    try {
      const res = await fetch('/api/myrecipes');
      if (!res.ok) throw new Error('ไม่สามารถโหลดสูตรอาหารได้');
      const recipes = await res.json();
      renderRecipes(recipes);
    } catch (err) {
      recipesList.innerHTML = `<p class="text-danger">${err.message}</p>`;
    }
  }

  function renderRecipes(recipes) {
    if (!recipes.length) {
      recipesList.innerHTML = '<p>ยังไม่มีสูตรอาหาร</p>';
      return;
    }
    recipesList.innerHTML = recipes.map(r => `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100">
          <img src="${r.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" class="card-img-top" alt="${r.title}">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${r.title}</h5>
            <p class="card-text text-truncate">${r.ingredients}</p>
            <p><small>เวลา: ${r.cook_time} | ความยาก: ${r.difficulty}</small></p>
            <div class="mt-auto d-flex justify-content-between">
              <button class="btn btn-sm btn-primary btn-edit" data-id="${r.id}">แก้ไข</button>
              <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}">ลบ</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  btnAddRecipe.addEventListener('click', () => {
    formMsg.textContent = '';
    recipeForm.reset();
    document.getElementById('recipeId').value = '';
    document.getElementById('recipeModalLabel').textContent = 'เพิ่มสูตรอาหาร';
    recipeModal.show();
  });

  recipesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-edit')) {
      const id = e.target.dataset.id;
      await loadRecipeToForm(id);
      recipeModal.show();
    } else if (e.target.classList.contains('btn-delete')) {
      const id = e.target.dataset.id;
      if (confirm('คุณต้องการลบสูตรอาหารนี้หรือไม่?')) {
        await deleteRecipe(id);
      }
    }
  });

  async function loadRecipeToForm(id) {
    try {
      const res = await fetch(`/api/recipes/${id}`);
      if (!res.ok) throw new Error('ไม่พบสูตรอาหาร');
      const data = await res.json();
      const r = data.recipe || data; // ปรับตามโครงสร้าง response
      document.getElementById('recipeId').value = r.id || r._id;
      document.getElementById('title').value = r.title;
      document.getElementById('image_url').value = r.image_url || '';
      document.getElementById('ingredients').value = r.ingredients;
      document.getElementById('steps').value = r.steps;
      document.getElementById('cook_time').value = r.cook_time;
      document.getElementById('difficulty').value = r.difficulty;
      document.getElementById('recipeModalLabel').textContent = 'แก้ไขสูตรอาหาร';
      formMsg.textContent = '';
    } catch (err) {
      alert(err.message);
    }
  }

  recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    const id = document.getElementById('recipeId').value;
    const recipeData = {
      title: document.getElementById('title').value.trim(),
      image_url: document.getElementById('image_url').value.trim(),
      ingredients: document.getElementById('ingredients').value.trim(),
      steps: document.getElementById('steps').value.trim(),
      cook_time: document.getElementById('cook_time').value,
      difficulty: document.getElementById('difficulty').value,
    };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/recipes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData),
        });
      } else {
        res = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      recipeModal.hide();
      loadMyRecipes();
    } catch (err) {
      formMsg.textContent = err.message;
    }
  });

  async function deleteRecipe(id) {
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      loadMyRecipes();
    } catch (err) {
      alert(err.message);
    }
  }

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
  });

  // เพิ่ม blur โฟกัสก่อน modal ปิด เพื่อแก้ warning accessibility
  window.addEventListener('hide.bs.modal', () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  updateUserUI();
  loadMyRecipes();
});
