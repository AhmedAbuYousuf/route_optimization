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

const { predictJobDuration, calculateAddressConfidence, predictTravelTime } = require("./ai_helpers");
const { sendSMS } = require("./sms_helpers"); // SMS helper

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

// ⭐ POST /jobs — Add Job + Auto Assign + SMS notifications
app.post("/jobs", async (req, res) => {
  const { name, type, email, phone, address } = req.body;

  if (!address) return res.status(400).json({ error: "Address is required" });
  if (!phone) return res.status(400).json({ error: "Phone number is required" });

  try {
    const geoAddress = address.includes("+") ? address : `${address}, Dhaka, Bangladesh`;
    const geoRes = await fetchFn(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        geoAddress
      )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const geoData = await geoRes.json();

    if (geoData.status !== "OK" || !geoData.results?.length) {
      await sendSMS(phone, "No available workers at the moment.");
      return res.status(400).json({ error: "Invalid address or API key error" });
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    // Fetch employees
    const employeesRes = await pool.query("SELECT * FROM employees");
    const employees = employeesRes.rows;

    if (!employees.length) {
      await sendSMS(phone, "No available workers at the moment.");
      return res.status(400).json({ error: "No employees available" });
    }

    // Auto-assign nearest employee within 10 km
    let nearestEmployee = null;
    let nearestDistance = Infinity;
    const MAX_DISTANCE_KM = 10;

    for (const emp of employees) {
      if (!emp.lat || !emp.lng) continue;
      const dist = getDistance(lat, lng, emp.lat, emp.lng);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestEmployee = emp;
      }
    }

    if (!nearestEmployee || nearestDistance > MAX_DISTANCE_KM) {
      await sendSMS(phone, "No available workers at the moment.");
      return res.status(400).json({ error: "No employee nearby" });
    }

    // Predict duration and confidence
    const predictedDuration = predictJobDuration(type);
    const addressConfidence = calculateAddressConfidence({
      types: ["street_address"],
      geometry: { location_type: "ROOFTOP" },
      partial_match: false,
    });

    // Insert job
    const insertRes = await pool.query(
      `INSERT INTO jobs(name, type, email, phone, address, lat, lng, assigned_employee_id, predicted_duration, address_confidence)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name,
        type,
        email,
        phone,
        address,
        lat,
        lng,
        nearestEmployee.id,
        predictedDuration,
        addressConfidence,
      ]
    );

    const job = insertRes.rows[0];

    // Calculate ETA using travel time prediction
    const etaMinutes = predictTravelTime(nearestEmployee.lat, nearestEmployee.lng, lat, lng);

    // Send SMS to client
    await sendSMS(phone, `Worker has been assigned. He will arrive in approx ${etaMinutes} minutes.`);

    res.json({
      job,
      assignedEmployee: nearestEmployee.name,
      etaMinutes
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