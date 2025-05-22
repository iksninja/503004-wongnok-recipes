document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const recipesContainer = document.getElementById('recipes');
  const navLinks = document.getElementById('nav-links');



  // เช็คสถานะล็อกอิน
  async function checkLogin() {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userObj = JSON.parse(user);
      navLinks.innerHTML = `
        <li style="background-color:powderblue; margin:10px; " class="nav-item"><a class="nav-link" href="myrecipes.html">สูตรของฉัน</a></li>
        <li style="background-color:powderblue; margin:10px;" class="nav-item"><a class="nav-link" href="#" id="logoutBtn">ออกจากระบบ <strong> (${userObj.username})</storng></a></li>
      `;
      document.getElementById('logoutBtn').addEventListener('click', async e => {
        e.preventDefault();
        await fetch('/api/logout', { method: 'POST' });
        sessionStorage.removeItem('user');
        location.reload();
      });
    }
  }

  // ดึงสูตรอาหารจาก API
  async function fetchRecipes(params = {}) {
    const query = new URLSearchParams(params);
    const res = await fetch('/api/recipes?' + query.toString());
    if (!res.ok) {
      recipesContainer.innerHTML = `<p class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
      return [];
    }
    return res.json();
  }

  // ดึงสูตรอาหารยอดนิยม
  async function fetchTopRatedRecipes() {
    try {
      const res = await fetch('/api/recipes/top-rated');
      if (!res.ok) throw new Error('Failed to fetch top recipes');
      return res.json();
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  // ฟังก์ชันแสดงผลสูตรอาหาร (รวมทั้งรูปภาพและปุ่มดูรายละเอียด)
  function renderRecipes(recipes) {
    if (!recipes || recipes.length === 0) {
      recipesContainer.innerHTML = '<p>ไม่พบสูตรอาหาร</p>';
      return;
    }
    recipesContainer.innerHTML = recipes.map(r => `
      <div class="col-md-4 mb-3">
        <div class="card h-100">
          <img src="${r.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" class="card-img-top" alt="${r.title}">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${r.title}</h5>
            <p class="card-text text-truncate">${r.ingredients}</p>
            <a href="recipe.html?id=${r.id}" class="btn btn-primary mt-auto">ดูรายละเอียด</a>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Event form submit ค้นหาสูตรอาหาร
  searchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const keyword = document.getElementById('keyword').value.trim();
    const cookTime = document.getElementById('cookTime').value;
    const difficulty = document.getElementById('difficulty').value;
    const recipes = await fetchRecipes({ keyword, cookTime, difficulty });
    renderRecipes(recipes);
  });

  

  // โหลดสูตรอาหารเริ่มต้นเมื่อโหลดหน้า
  fetchRecipes().then(renderRecipes);
  checkLogin();
});
