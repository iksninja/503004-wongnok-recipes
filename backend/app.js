// app.js (cleaned and optimized version)
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const pool = require('./db');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload folder config
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed!'));
    cb(null, true);
  }
});

// Static file serving
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'wongnok_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Middleware for auth check
function authMiddleware(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'ต้องเข้าสู่ระบบก่อน' });
  next();
}

// Register
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

// Login
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

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'ออกจากระบบสำเร็จ' });
});

// Search recipes
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

// Get recipe details
app.get('/api/recipes/:id', async (req, res) => {
  const recipeId = req.params.id;
  try {
    const [recipes] = await pool.query('SELECT r.*, u.username FROM recipes r JOIN users u ON r.user_id = u.id WHERE r.id = ?', [recipeId]);
    if (recipes.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    const [ratings] = await pool.query('SELECT AVG(rating_value) as avg_rating, COUNT(*) as count_rating FROM ratings WHERE recipe_id = ?', [recipeId]);
    res.json({ recipe: recipes[0], rating: ratings[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create recipe
app.post('/api/recipes', authMiddleware, upload.single('imageFile'), async (req, res) => {
  const { title, imageUrl, ingredients, steps, cook_time, difficulty } = req.body;
  const userId = req.session.userId;
  if (!title || !ingredients || !steps || !cook_time || !difficulty) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }
  let image_url = imageUrl || '';
  if (req.file) image_url = '/uploads/' + req.file.filename;
  try {
    const [result] = await pool.query('INSERT INTO recipes (user_id, title, image_url, ingredients, steps, cook_time, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, title, image_url, ingredients, steps, cook_time, difficulty]);
    res.json({ message: 'เพิ่มสูตรอาหารสำเร็จ', recipeId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user recipes
app.get('/api/myrecipes', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM recipes WHERE user_id = ?', [req.session.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update recipe
app.put('/api/recipes/:id', authMiddleware, upload.single('imageFile'), async (req, res) => {
  const { title, imageUrl, ingredients, steps, cook_time, difficulty } = req.body;
  const recipeId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [recipeId]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    if (rows[0].user_id !== req.session.userId) return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขสูตรนี้' });

    let image_url = imageUrl || rows[0].image_url;
    if (req.file) {
      image_url = '/uploads/' + req.file.filename;
      if (rows[0].image_url && rows[0].image_url.startsWith('/uploads/')) {
        const oldPath = path.join(uploadDir, path.basename(rows[0].image_url));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    await pool.query('UPDATE recipes SET title=?, image_url=?, ingredients=?, steps=?, cook_time=?, difficulty=?, updated_at=NOW() WHERE id=?', [title, image_url, ingredients, steps, cook_time, difficulty, recipeId]);
    res.json({ message: 'แก้ไขสูตรอาหารสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', authMiddleware, async (req, res) => {
  const recipeId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT * FROM recipes WHERE id = ?', [recipeId]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    if (rows[0].user_id !== req.session.userId) return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบสูตรนี้' });
    await pool.query('DELETE FROM recipes WHERE id = ?', [recipeId]);
    res.json({ message: 'ลบสูตรอาหารสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate recipe
app.post('/api/recipes/:id/rate', authMiddleware, async (req, res) => {
  const { rating } = req.body;
  const recipeId = req.params.id;
  const userId = req.session.userId;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'คะแนนต้องอยู่ระหว่าง 1-5' });
  }

  try {
    const [recipes] = await pool.query('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
    if (recipes.length === 0) return res.status(404).json({ error: 'ไม่พบสูตรอาหาร' });
    if (recipes[0].user_id === userId) return res.status(403).json({ error: 'ไม่สามารถให้คะแนนสูตรของตัวเองได้' });

    const [existing] = await pool.query('SELECT id FROM ratings WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
    if (existing.length > 0) return res.status(400).json({ error: 'คุณให้คะแนนสูตรนี้ไปแล้ว' });

    await pool.query('INSERT INTO ratings (user_id, recipe_id, rating_value) VALUES (?, ?, ?)', [userId, recipeId, rating]);
    res.json({ message: 'ให้คะแนนสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top-rated recipes
app.get('/api/recipes/top-rated', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, AVG(rt.rating_value) as avg_rating, COUNT(rt.id) as total_ratings
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
