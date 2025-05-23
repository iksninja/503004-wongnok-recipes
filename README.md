# 🍽️ Wongnok - ระบบแชร์สูตรอาหารพร้อมให้คะแนน

Wongnok เป็นเว็บแอปพลิเคชันที่ให้ผู้ใช้งานสามารถ:

* สมัครสมาชิก / เข้าสู่ระบบ
* ค้นหาและดูสูตรอาหารยอดนิยม
* เพิ่ม แก้ไข และลบสูตรอาหารของตนเอง
* ให้คะแนนสูตรอาหารของผู้ใช้อื่น

## 🔧 เทคโนโลยีที่ใช้

* Frontend: HTML, CSS, Bootstrap 5, JavaScript (Vanilla)
* Backend: Node.js + Express.js
* ฐานข้อมูล: MySQL (ผ่าน mysql2/promise)
* Session: express-session
* อัปโหลดภาพ: multer

## 📁 โครงสร้างโปรเจกต์

```
├── backend/
│   ├── app.js              # Express application
│   ├── db.js               # Database connection
│   ├── uploads/            # ภาพที่อัปโหลดจากผู้ใช้
│   └── .env                # ตัวแปรสภาพแวดล้อม
├── frontend/
│   ├── index.html          # หน้าแรก
│   ├── login.html          # หน้าล็อกอิน
│   ├── register.html       # สมัครสมาชิก
│   ├── myrecipes.html      # จัดการสูตรของฉัน
│   ├── recipe.html         # หน้ารายละเอียดสูตร
│   ├── main.js             # สคริปต์หน้าแรก
│   ├── myrecipes.js        # สคริปต์จัดการสูตร
│   ├── recipe.js           # สคริปต์รายละเอียดสูตร
│   └── style.css           # สไตล์ทั้งหมด
```

## ⚙️ วิธีติดตั้งและรันโปรเจกต์

### 1. Clone repo

```bash
git clone https://github.com/yourusername/wongnok.git
cd wongnok/backend
```

### 2. ติดตั้ง dependency

```bash
npm install
```

### 3. ตั้งค่า `.env`

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=wongnok_db
SESSION_SECRET=wongnok_super_secret
PORT=3000
NODE_ENV=development
```

### 4. ตั้งค่าฐานข้อมูล

```sql
-- สร้างฐานข้อมูลและตาราง (ตัวอย่าง)
CREATE DATABASE wongnok_db;
USE wongnok_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255)
);

CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  image_url TEXT,
  ingredients TEXT,
  steps TEXT,
  cook_time VARCHAR(50),
  difficulty VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  recipe_id INT,
  rating_value INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);
```

### 5. รันเซิร์ฟเวอร์

```bash
node app.js
```

### 6. เปิดใช้งาน

ไปที่: [http://localhost:3000](http://localhost:3000)

## 📷 ตัวอย่างหน้าจอ

(เพิ่มภาพ screenshot ได้ที่นี่ เช่น หน้า index, myrecipes, rating)

## 📄 License

โครงการนี้ใช้เพื่อการเรียนรู้เท่านั้น คุณสามารถนำไปใช้งาน ปรับแต่ง หรือพัฒนาเพิ่มเติมได้ตามสะดวก ✨
