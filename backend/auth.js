require("dotenv").config();
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// REGISTER (admin only)
router.post("/register", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users(name,email,phone,password,role)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id,name,email,role`,
      [name, email, phone, hashed, role]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
    if (!result.rows.length) return res.status(400).json({ error: "Invalid email/password" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid email/password" });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;