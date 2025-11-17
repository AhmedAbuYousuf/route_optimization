// backend/ai_helpers.js

/**
 * ---------------------------------------------------
 * BASIC AI / RULE-BASED ENGINE FOR FIELD SERVICE APP
 * ---------------------------------------------------
 * Features included:
 * 1. Smart Route Optimization
 * 2. Intelligent Job Assignment
 * 3. Predictive Job Duration
 * 4. Travel Time Prediction
 * 5. AI Mapping Enhancements
 * 6. Automatic Customer Notifications
 *
 * This is designed to be lightweight and FAST,
 * without using external AI APIs.
 * ---------------------------------------------------
 */

// ---------------------------------------------------
// 1. SMART ROUTE OPTIMIZATION (Nearest-Neighbor Solver)
// ---------------------------------------------------
function optimizeRoute(jobLocations) {
  if (jobLocations.length <= 1) return jobLocations;

  const route = [];
  const remaining = [...jobLocations];
  let current = remaining.shift(); // starting point = first job
  route.push(current);

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    current = remaining.splice(nearestIndex, 1)[0];
    route.push(current);
  }

  return route;
}

// ---------------------------------------------------
// 2. INTELLIGENT JOB ASSIGNMENT (Skill + Load + Distance)
// ---------------------------------------------------
function pickBestEmployee(job, employees) {
  let bestEmployee = null;
  let bestScore = -Infinity;

  employees.forEach(emp => {
    const distance = haversineDistance(job.lat, job.lng, emp.lat, emp.lng);
    const workload = emp.current_jobs || 0;

    const score =
      (emp.skills?.includes(job.type) ? 40 : 0) + // skill match weight
      (20 - workload * 2) +                      // less workload = better
      (30 - distance);                           // closer = better

    if (score > bestScore) {
      bestScore = score;
      bestEmployee = emp;
    }
  });

  return bestEmployee;
}

// ---------------------------------------------------
// 3. PREDICTIVE JOB DURATION (Simple Rule-Based Model)
// ---------------------------------------------------
function predictJobDuration(jobType) {
  const baseTimes = {
    installation: 60,
    repair: 45,
    inspection: 30,
    cleaning: 25,
    emergency: 20
  };

  return baseTimes[jobType] || 30; // fallback 30 min
}

// ---------------------------------------------------
// 4. TRAVEL TIME PREDICTION (Distance → Minutes)
// ---------------------------------------------------
function predictTravelTime(lat1, lng1, lat2, lng2) {
  const distance = haversineDistance(lat1, lng1, lat2, lng2);
  const avgSpeedKmH = 25; // Dhaka real-world average
  const minutes = (distance / avgSpeedKmH) * 60;

  return Math.round(minutes);
}

// ---------------------------------------------------
// 5. AI MAPPING ENHANCEMENTS (Confidence Score)
// ---------------------------------------------------
function calculateAddressConfidence(geoResult) {
  if (!geoResult) return 0;

  let score = 50;

  if (geoResult.types?.includes("street_address")) score += 30;
  if (geoResult.partial_match) score -= 20;
  if (geoResult.geometry?.location_type === "ROOFTOP") score += 20;

  return Math.max(0, Math.min(score, 100));
}

// ---------------------------------------------------
// 6. CUSTOMER NOTIFICATIONS (Dynamic Message Generator)
// ---------------------------------------------------
function generateCustomerMessage(event, data) {
  switch (event) {
    case "job_assigned":
      return `Good news! Your job has been assigned to ${data.employeeName}. They will contact you shortly.`;
    case "job_started":
      return `Your technician is now on the way. Estimated arrival time: ${data.eta} minutes.`;
    case "job_completed":
      return `Your service has been completed. Thank you for choosing us!`;
    default:
      return `Your request has been updated.`;
  }
}

// ---------------------------------------------------
// Utility: Haversine Distance
// ---------------------------------------------------
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------
// EXPORT ALL AI HELPERS
// ---------------------------------------------------
module.exports = {
  optimizeRoute,
  pickBestEmployee,
  predictJobDuration,
  predictTravelTime,
  calculateAddressConfidence,
  generateCustomerMessage,
};