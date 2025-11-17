const express = require("express");
const router = express.Router();
const auth = require("./middleware/authMiddleware");
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all jobs
router.get("/jobs", auth("admin"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM jobs");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign job manually
router.post("/jobs/assign", auth("admin"), async (req, res) => {
  const { jobId, employeeId } = req.body;
  try {
    await pool.query("UPDATE jobs SET assigned_employee_id=$1 WHERE id=$2", [employeeId, jobId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;