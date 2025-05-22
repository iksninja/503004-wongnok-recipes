
    const recipeDetail = document.getElementById('recipeDetail');
    const ratingSection = document.getElementById('ratingSection');
    const msg = document.getElementById('msg');

    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }

    async function fetchRecipe(id) {
      const res = await fetch('/api/recipes/' + id);
      if (!res.ok) {
        recipeDetail.innerHTML = '<p class="text-danger">ไม่พบสูตรอาหาร</p>';
        return null;
      }
      return res.json();
    }

    async function submitRating(recipeId, rating) {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (!user.id) {
        // กรณีนี้จะไม่เกิดเพราะ modal แจ้งเตือนก่อนหน้านี้แล้ว
        msg.style.color = 'red';
        msg.textContent = 'กรุณาเข้าสู่ระบบเพื่อให้คะแนน';
        return;
      }

      const res = await fetch('/api/recipes/' + recipeId + '/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      const data = await res.json();
      if (res.ok) {
        msg.style.color = 'green';
        msg.textContent = data.message;
        loadRecipe(recipeId); // รีเฟรชข้อมูล
      } else {
        msg.style.color = 'red';
        msg.textContent = data.error || 'เกิดข้อผิดพลาด';
      }
    }

    function renderStars(rating) {
      const fullStars = Math.floor(rating);
      const halfStar = rating % 1 >= 0.5;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

      let starsHTML = '';

      for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fa fa-star text-warning"></i>';
      }
      if (halfStar) {
        starsHTML += '<i class="fa fa-star-half-o text-warning"></i>';
      }
      for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="fa fa-star-o text-warning"></i>';
      }
      return starsHTML;
    }

    function renderRecipe(data) {
      const r = data.recipe;
      const avgRating = data.rating.avg_rating ? parseFloat(data.rating.avg_rating) : 0;
      const countRating = data.rating.count_rating || 0;

      recipeDetail.innerHTML = `
        <h2>${r.title}</h2>
        <img src="${r.image_url || 'https://via.placeholder.com/600x300?text=No+Image'}" alt="${r.title}" class="img-fluid mb-3" />
        <p><strong>โดย:</strong> ${r.username}</p>
        <p><strong>เวลา:</strong> ${r.cook_time} | <strong>ความยาก:</strong> ${r.difficulty}</p>
        <h4>วัตถุดิบ</h4>
        <p>${r.ingredients.replace(/\n/g, '<br>')}</p>
        <h4>ขั้นตอนการปรุง</h4>
        <p>${r.steps.replace(/\n/g, '<br>')}</p>
        <p><strong>คะแนนเฉลี่ย:</strong> ${renderStars(avgRating)} (${countRating} คนให้คะแนน)</p>
        <button id="rateBtn" class="btn btn-primary">ให้คะแนน</button>
      `;

      // ตรวจสอบสถานะล็อกอินและซ่อนปุ่ม rateBtn ถ้าล็อกอินแล้ว
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      const rateBtn = document.getElementById('rateBtn');
      if (user.id) {
        if (rateBtn) rateBtn.style.display = 'none';
      } else {
        if (rateBtn) {
          rateBtn.style.display = 'inline-block';
          rateBtn.addEventListener('click', () => {
            // แสดง modal แจ้งเตือนให้เข้าสู่ระบบ
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
          });
        }
      }

      // ฟอร์มให้คะแนนสำหรับผู้ใช้ที่ล็อกอินและไม่ใช่เจ้าของสูตร
      if (user.id && user.id !== r.user_id) {
        ratingSection.innerHTML = `
          <h5>ให้คะแนนสูตรอาหาร</h5>
          <form id="starRatingForm" class="star-rating">
            <input type="radio" id="star5" name="rating" value="5" /><label for="star5" title="5 ดาว"></label>
            <input type="radio" id="star4" name="rating" value="4" /><label for="star4" title="4 ดาว"></label>
            <input type="radio" id="star3" name="rating" value="3" /><label for="star3" title="3 ดาว"></label>
            <input type="radio" id="star2" name="rating" value="2" /><label for="star2" title="2 ดาว"></label>
            <input type="radio" id="star1" name="rating" value="1" /><label for="star1" title="1 ดาว"></label>
          </form>
          <button id="submitRatingBtn" class="btn btn-primary mt-2">ส่งคะแนน</button>
        `;

        document.getElementById('submitRatingBtn').addEventListener('click', () => {
          const form = document.getElementById('starRatingForm');
          const rating = form.rating.value;
          if (!rating) {
            msg.style.color = 'red';
            msg.textContent = 'กรุณาเลือกคะแนน';
            return;
          }
          submitRating(r.id, parseInt(rating));
        });
      } else {
        ratingSection.innerHTML = '';
      }
    }

    async function loadRecipe(id) {
      const data = await fetchRecipe(id);
      if (data) renderRecipe(data);
    }

    const recipeId = getQueryParam('id');
    if (recipeId) {
      loadRecipe(recipeId);
    } else {
      recipeDetail.innerHTML = '<p class="text-danger">ไม่พบข้อมูลสูตรอาหาร</p>';
    }
