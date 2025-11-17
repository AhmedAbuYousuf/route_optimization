require("dotenv").config();
const { Pool } = require("pg");
const {
  optimizeRoute,
  pickBestEmployee,
  predictJobDuration,
  predictTravelTime,
  calculateAddressConfidence,
  generateCustomerMessage,
} = require("./ai_helpers");

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log("🟢 Worker started: AI automation running...");

// --------------------------------------------------------------
// 1. AUTO ASSIGN JOBS WITH AI
// --------------------------------------------------------------
async function autoAssignJobs() {
  console.log("🤖 Checking for unassigned jobs...");

  const jobsRes = await pool.query(
    "SELECT * FROM jobs WHERE assigned_employee_id IS NULL"
  );
  const jobs = jobsRes.rows;

  if (jobs.length === 0) return console.log("✔ No unassigned jobs.");

  const employeesRes = await pool.query("SELECT * FROM employees");
  const employees = employeesRes.rows;

  for (const job of jobs) {
    const best = pickBestEmployee(job, employees);
    if (!best) continue;

    await pool.query(
      `UPDATE jobs SET assigned_employee_id = $1 WHERE id = $2`,
      [best.id, job.id]
    );

    console.log(`📍 Auto-assigned job ${job.id} → ${best.name}`);
  }
}

// --------------------------------------------------------------
// 2. UPDATE PREDICTED JOB DURATIONS
// --------------------------------------------------------------
async function updateJobDurations() {
  console.log("⏱ Updating predicted job durations...");

  const jobs = (await pool.query("SELECT * FROM jobs")).rows;

  for (const job of jobs) {
    const predicted = predictJobDuration(job.type);
    await pool.query(
      `UPDATE jobs SET predicted_duration = $1 WHERE id = $2`,
      [predicted, job.id]
    );
  }

  console.log("✔ Job durations updated.");
}

// --------------------------------------------------------------
// 3. UPDATE TRAVEL TIME (ETA) FOR ASSIGNED JOBS
// --------------------------------------------------------------
async function updateTravelTimes() {
  console.log("🚗 Updating travel time predictions...");

  const jobsRes = await pool.query(`
    SELECT jobs.*, employees.lat AS emp_lat, employees.lng AS emp_lng
    FROM jobs
    JOIN employees ON jobs.assigned_employee_id = employees.id
  `);

  for (const job of jobsRes.rows) {
    const eta = predictTravelTime(
      job.emp_lat,
      job.emp_lng,
      job.lat,
      job.lng
    );

    await pool.query(
      `UPDATE jobs SET eta_minutes = $1 WHERE id = $2`,
      [eta, job.id]
    );
  }

  console.log("✔ ETA updated.");
}

// --------------------------------------------------------------
// 4. AI ADDRESS CONFIDENCE CHECK
// --------------------------------------------------------------
async function updateAddressConfidence() {
  console.log("📡 Checking address quality...");

  const jobs = (await pool.query("SELECT * FROM jobs")).rows;

  for (const job of jobs) {
    const confidence = calculateAddressConfidence({
      types: ["street_address"],
      geometry: { location_type: "ROOFTOP" },
      partial_match: false,
    });

    await pool.query(
      `UPDATE jobs SET address_confidence = $1 WHERE id = $2`,
      [confidence, job.id]
    );
  }

  console.log("✔ Address AI confidence updated.");
}

// --------------------------------------------------------------
// 5. NOTIFICATION QUEUE GENERATION
// --------------------------------------------------------------
async function pushNotifications() {
  console.log("📨 Generating customer notifications...");

  const jobs = (await pool.query("SELECT * FROM jobs")).rows;

  for (const job of jobs) {
    const message = generateCustomerMessage("job_assigned", {
      employeeName: "Your assigned technician",
    });

    await pool.query(
      `INSERT INTO notifications(job_id, message, sent) VALUES ($1, $2, false)`,
      [job.id, message]
    );
  }

  console.log("✔ Notification events created.");
}

// --------------------------------------------------------------
// RUN EVERY 30 SECONDS
// --------------------------------------------------------------
async function runWorker() {
  try {
    await autoAssignJobs();
    await updateJobDurations();
    await updateTravelTimes();
    await updateAddressConfidence();
    await pushNotifications();

    console.log("🔁 Worker cycle complete.\n");
  } catch (err) {
    console.error("❌ Worker error:", err);
  }
}

setInterval(runWorker, 30 * 1000);
runWorker();