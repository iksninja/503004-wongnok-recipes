const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ตั้งค่า session
app.use(session({
  secret: 'wongnok_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 วัน
}));

// ให้บริการไฟล์ frontend แบบ static
app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware เช็คล็อกอิน
function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'ต้องเข้าสู่ระบบก่อน' });
  }
  next();
}

// API: สมัครสมาชิก
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);
    res.json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: เข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ error: 'ไม่พบผู้ใช้' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง' });

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: 'เข้าสู่ระบบสำเร็จ', user: { id: user.id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ออกจากระบบ
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'ออกจากระบบสำเร็จ' });
});

// API: ค้นหาสูตรอาหาร
app.get('/api/recipes', async (req, res) => {
  const { keyword = '', cookTime = '', difficulty = '' } = req.query;
  let sql = `SELECT r.*, u.username FROM recipes r JOIN users u ON r.user_id = u.id WHERE 1=1`;
  const params = [];

  if (keyword) {
    sql += ` AND (r.title LIKE ? OR r.ingredients LIKE ?)`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (cookTime) {
    sql += ` AND r.cook_time = ?`;
    params.push(cookTime);
  }
  if (difficulty) {
    sql += ` AND r.difficulty = ?`;
    params.push(difficulty);
  }

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ดูรายละเอียดสูตรอาหาร
app.get('/api/recipes/:id', async (req, res) => {
  const recipeId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u.username FROM recipes r JOIN users u ON r.user_id = u.id WHERE r.id = ?`,
      [recipeId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });

    // ดึงคะแนนเฉลี่ยและจำนวนคะแนน
    const [ratings] = await pool.query(
      `SELECT AVG(rating_value) as avg_rating, COUNT(*) as count_rating FROM ratings WHERE recipe_id = ?`,
      [recipeId]
    );

    res.json({ recipe: rows[0], rating: ratings[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: สร้างสูตรอาหาร (สมาชิก)
app.post('/api/recipes', authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  const { title, image_url, ingredients, steps, cook_time, difficulty } = req.body;
  if (!title || !ingredients || !steps || !cook_time || !difficulty) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO recipes (user_id, title, image_url, ingredients, steps, cook_time, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, image_url, ingredients, steps, cook_time, difficulty]
    );
    res.json({ message: 'เพิ่มสูตรอาหารสำเร็จ', recipeId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: อ่านสูตรอาหารของตัวเอง (สมาชิก)
app.get('/api/myrecipes', authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  try {
    const [rows] = await pool.query('SELECT * FROM recipes WHERE user_id = ?', [userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: แก้ไขสูตรอาหาร (สมาชิก)
app.put('/api/recipes/:id', authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  const recipeId = req.params.id;
  const { title, image_url, ingredients, steps, cook_time, difficulty } = req.body;

  try {
    const [rows] = await pool.query('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขสูตรนี้' });

    await pool.query(
      `UPDATE recipes SET title=?, image_url=?, ingredients=?, steps=?, cook_time=?, difficulty=?, updated_at=NOW() WHERE id=?`,
      [title, image_url, ingredients, steps, cook_time, difficulty, recipeId]
    );
    res.json({ message: 'แก้ไขสูตรอาหารสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ลบสูตรอาหาร (สมาชิก)
app.delete('/api/recipes/:id', authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  const recipeId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    if (rows[0].user_id !== userId) return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบสูตรนี้' });

    await pool.query('DELETE FROM recipes WHERE id = ?', [recipeId]);
    res.json({ message: 'ลบสูตรอาหารสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ให้คะแนนสูตรอาหาร (สมาชิก)
app.post('/api/recipes/:id/rate', authMiddleware, async (req, res) => {
  const userId = req.session.userId;
  const recipeId = req.params.id;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'คะแนนต้องอยู่ระหว่าง 1-5' });
  }

  try {
    // ตรวจสอบสูตรอาหาร
    const [recipes] = await pool.query('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
    if (recipes.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    if (recipes[0].user_id === userId) return res.status(403).json({ error: 'ไม่สามารถให้คะแนนสูตรของตัวเองได้' });

    // ตรวจสอบว่าผู้ใช้ให้คะแนนสูตรนี้แล้วหรือยัง
    const [existing] = await pool.query('SELECT id FROM ratings WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
    if (existing.length > 0) return res.status(400).json({ error: 'คุณให้คะแนนสูตรนี้ไปแล้ว' });

    await pool.query('INSERT INTO ratings (user_id, recipe_id, rating_value) VALUES (?, ?, ?)', [userId, recipeId, rating]);
    res.json({ message: 'ให้คะแนนสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เพิ่ม API ดึงสูตรอาหารยอดนิยม
app.get('/api/recipes/top-rated', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*, 
        AVG(rt.rating_value) as avg_rating,
        COUNT(rt.id) as total_ratings
      FROM recipes r
      LEFT JOIN ratings rt ON r.id = rt.recipe_id
      GROUP BY r.id
      ORDER BY avg_rating DESC, total_ratings DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เริ่ม server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
