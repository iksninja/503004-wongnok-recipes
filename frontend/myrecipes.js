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
      recipesList.innerHTML = '<div class="text-center text-muted">ยังไม่มีสูตรอาหาร</div>';
      return;
    }
    let html = `
      <table class="table table-bordered table-hover align-middle">
        <thead class="table-success align-top">
          <tr>
            <th class="text-center">รูป</th>
            <th class="text-center">ชื่อเมนู</th>
            <th class="text-center">วัตถุดิบ</th>
            <th class="text-center">ขั้นตอน</th>
            <th class="text-center">เวลา</th>
            <th class="text-center">ความยาก</th>
            <th class="text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
    `;
    recipes.forEach(r => {
      const imageSrc = r.image_url?.startsWith('http') ? r.image_url : (r.image_url ? '.' + r.image_url : 'https://via.placeholder.com/150');
      html += `
        <tr>
          <td><img src="${imageSrc}" style="max-width:80px;max-height:80px;"></td>
          <td>${r.title}</td>
          <td>${r.ingredients}</td>
          <td>${r.steps}</td>
          <td>${r.cook_time}</td>
          <td>${r.difficulty}</td>
          <td>
            <button class="btn btn-sm btn-primary btn-edit" data-id="${r.id}">Edit</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}">Delete</button>
          </td>
        </tr>
      `;
    });
    html += '</tbody></table>';
    recipesList.innerHTML = html;
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
      const r = data.recipe || data;
      document.getElementById('recipeId').value = r.id || r._id;
      document.getElementById('title').value = r.title;
      document.getElementById('imageUrl').value = r.image_url || '';
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

  const title = document.getElementById('title').value.trim();
  if (!title) {
    formMsg.textContent = 'กรุณาใส่ชื่อเมนู';
    return;
  }

  const id = document.getElementById('recipeId').value;
  const formData = new FormData(recipeForm);

  try {
    let res;
    if (id) {
      res = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        body: formData
      });
    } else {
      res = await fetch('/api/recipes', {
        method: 'POST',
        body: formData
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

  window.addEventListener('hide.bs.modal', () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  updateUserUI();
  loadMyRecipes();
});
