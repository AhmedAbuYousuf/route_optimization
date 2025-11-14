require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// ✅ Dynamic import of node-fetch for CommonJS
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

// Enable CORS for frontend dev server
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test route
app.get('/', (req, res) => res.send('Backend is running'));

// Distance helper
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /jobs
app.post('/jobs', async (req, res) => {
  const { name, type, email, address } = req.body;

  if (!address) return res.status(400).json({ error: 'Address is required' });

  try {
    // Prepare address for geocoding
    const geoAddress = address.includes('+') ? address : `${address}, Dhaka, Bangladesh`;
    console.log('Geocoding address:', geoAddress);

    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(geoAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const geoData = await geoRes.json();
    console.log('Geocode API result:', geoData);

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const { lat, lng } = geoData.results[0].geometry.location;
    console.log('Resolved coordinates:', lat, lng);

    // Get all employees
    const employeesRes = await pool.query('SELECT * FROM employees');
    const employees = employeesRes.rows;
    if (!employees.length) return res.status(400).json({ error: 'No employees available' });

    // Find nearest employee
    let nearestEmployee = null;
    let minDistance = Infinity;
    for (const emp of employees) {
      const dist = getDistance(lat, lng, emp.lat, emp.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestEmployee = emp;
      }
    }
    console.log('Nearest employee:', nearestEmployee);

    // Insert job
    const result = await pool.query(
      `INSERT INTO jobs(name,type,email,address,lat,lng,assigned_employee_id)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, email, address, lat, lng, nearestEmployee.id]
    );
    console.log('Inserted job:', result.rows[0]);

    res.json({ job: result.rows[0], assignedEmployee: nearestEmployee.name });
  } catch (err) {
    console.error('Error in /jobs route:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /employees
app.get('/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /jobs
app.get('/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));