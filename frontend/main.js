const API_BASE = import.meta.env.VITE_API_BASE;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

let map, directionsService, directionsRenderer;

async function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 23.8103, lng: 90.4125 },
    zoom: 12
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  await plotEmployeesAndJobs();
}

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

async function plotEmployeesAndJobs() {
  const employeesRes = await fetch(`${API_BASE}/employees`);
  const employees = await employeesRes.json();
  const jobsRes = await fetch(`${API_BASE}/jobs`);
  const jobs = await jobsRes.json();

  for (const emp of employees) {
    new google.maps.Marker({
      position: { lat: emp.lat, lng: emp.lng },
      map,
      label: emp.name,
      title: emp.name,
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });

    const empJobs = jobs.filter(job => job.assigned_employee_id === emp.id);
    if (!empJobs.length) continue;

    let sortedJobs = [];
    let remaining = [...empJobs];
    let currentLat = emp.lat;
    let currentLng = emp.lng;

    while (remaining.length > 0) {
      remaining.sort((a, b) => getDistance(currentLat, currentLng, a.lat, a.lng) - getDistance(currentLat, currentLng, b.lat, b.lng));
      const nearest = remaining.shift();
      sortedJobs.push(nearest);
      currentLat = nearest.lat;
      currentLng = nearest.lng;
    }

    const waypoints = sortedJobs.map(job => ({ location: { lat: job.lat, lng: job.lng }, stopover: true }));

    directionsService.route(
      {
        origin: { lat: emp.lat, lng: emp.lng },
        destination: waypoints[waypoints.length - 1].location,
        waypoints: waypoints.slice(0, -1),
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') directionsRenderer.setDirections(result);
        else console.error('Directions request failed:', status);
      }
    );
  }
}

// Form submit
const form = document.getElementById('jobForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const type = document.getElementById('type').value;
  const email = document.getElementById('email').value;
  const address = document.getElementById('address').value;

  if (!address) return alert('Address is required');

  try {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, email, address })
    });

    const data = await res.json();
    if (data.error) return alert(data.error);

    alert(`Job added: ${data.job.id}, assigned to ${data.assignedEmployee}`);
    plotEmployeesAndJobs();
  } catch (err) {
    console.error(err);
    alert('Error adding job. Check console.');
  }
});