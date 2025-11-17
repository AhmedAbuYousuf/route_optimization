const express = require("express");
const router = express.Router();
const auth = require("./middleware/authMiddleware");
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get jobs assigned to logged-in worker
router.get("/jobs", auth("worker"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM jobs WHERE assigned_employee_id=$1", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
