require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// Use native fetch when available (Node 18+), otherwise fallback to node-fetch
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const app = express();

// Enable CORS for frontend dev server
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test route
app.get("/", (req, res) => res.send("Backend is running"));

// Haversine Formula (Distance Helper)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ⭐ POST /jobs — Add Job + Geocode + Auto Assign Nearest Employee
app.post("/jobs", async (req, res) => {
  const { name, type, email, address } = req.body;

  if (!address)
    return res.status(400).json({ error: "Address is required" });

  try {
    // Fix address formatting for Dhaka-based searches
    const geoAddress = address.includes("+")
      ? address
      : `${address}, Dhaka, Bangladesh`;

    console.log("🔍 Geocoding address:", geoAddress);

    // GOOGLE MAPS GEOCODE API REQUEST
    const geoRes = await fetchFn(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        geoAddress
      )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const geoData = await geoRes.json();
    console.log("📌 Geocode API result:", geoData);

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return res.status(400).json({ error: "Invalid address or API key error" });
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    console.log("📍 Resolved coordinates:", lat, lng);

    // Fetch employees
    const employeesRes = await pool.query("SELECT * FROM employees");
    const employees = employeesRes.rows;

    if (!employees.length)
      return res.status(400).json({ error: "No employees available" });

    // Find nearest employee
    let nearestEmployee = null;
    let nearestDistance = Infinity;

    for (const emp of employees) {
      if (!emp.lat || !emp.lng) continue;

      const dist = getDistance(lat, lng, emp.lat, emp.lng);

      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestEmployee = emp;
      }
    }

    if (!nearestEmployee)
      return res.status(500).json({ error: "No employee has valid coordinates" });

    console.log("👤 Nearest employee:", nearestEmployee);

    // Insert job
    const insertRes = await pool.query(
      `INSERT INTO jobs(name, type, email, address, lat, lng, assigned_employee_id)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [name, type, email, address, lat, lng, nearestEmployee.id]
    );

    console.log("🆕 Job inserted:", insertRes.rows[0]);

    res.json({
      job: insertRes.rows[0],
      assignedEmployee: nearestEmployee.name,
    });
  } catch (err) {
    console.error("❗ Error in /jobs route:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ⭐ GET /employees
app.get("/employees", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM employees");
    res.json(result.rows);
  } catch (err) {
    console.error("❗ Employee fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ⭐ GET /jobs
app.get("/jobs", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM jobs");
    res.json(result.rows);
  } catch (err) {
    console.error("❗ Job fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);