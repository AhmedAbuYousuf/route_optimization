<template>
  <div>
    <form @submit.prevent="submitJob">
      <input v-model="name" type="text" placeholder="Name" required />
      <input v-model="type" type="text" placeholder="Type of Work" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="address" type="text" placeholder="Address or Plus Code" />

      <!-- Optional coordinates -->
      <input v-model.number="lat" type="number" step="any" placeholder="Latitude (optional)" />
      <input v-model.number="lng" type="number" step="any" placeholder="Longitude (optional)" />

      <button type="submit">Add Job</button>
    </form>

    <div ref="mapContainer" style="width: 100%; height: 500px;"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const name = ref('');
const type = ref('');
const email = ref('');
const address = ref('');
const lat = ref(null);
const lng = ref(null);

let map;
let directionsService;
let directionsRenderer;

const mapContainer = ref(null);

async function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google.maps);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places,directions`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

onMounted(async () => {
  await loadGoogleMaps();
  initMap();
});

function initMap() {
  map = new google.maps.Map(mapContainer.value, {
    center: { lat: 23.8103, lng: 90.4125 },
    zoom: 12,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  plotEmployeesAndJobs();
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
  try {
    const employeesRes = await fetch(`${API_BASE}/employees`);
    const employees = await employeesRes.json();
    const jobsRes = await fetch(`${API_BASE}/jobs`);
    const jobs = await jobsRes.json();

    directionsRenderer.setDirections({ routes: [] });

    for (const emp of employees) {
      new google.maps.Marker({
        position: { lat: emp.lat, lng: emp.lng },
        map,
        label: emp.name,
        title: emp.name,
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      });

      const empJobs = jobs.filter(job => job.assigned_employee_id === emp.id);
      if (!empJobs.length) continue;

      let sortedJobs = [];
      let remaining = [...empJobs];
      let currentLat = emp.lat;
      let currentLng = emp.lng;

      while (remaining.length > 0) {
        remaining.sort(
          (a, b) =>
            getDistance(currentLat, currentLng, a.lat, a.lng) -
            getDistance(currentLat, currentLng, b.lat, b.lng)
        );
        const nearest = remaining.shift();
        sortedJobs.push(nearest);
        currentLat = nearest.lat;
        currentLng = nearest.lng;
      }

      const waypoints = sortedJobs.map(job => ({
        location: { lat: job.lat, lng: job.lng },
        stopover: true,
      }));

      directionsService.route(
        {
          origin: { lat: emp.lat, lng: emp.lng },
          destination: waypoints[waypoints.length - 1].location,
          waypoints: waypoints.slice(0, -1),
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK') directionsRenderer.setDirections(result);
          else console.error('Directions request failed:', status);
        }
      );
    }
  } catch (err) {
    console.error('Error fetching employees/jobs:', err);
  }
}

async function submitJob() {
  if (!name.value || !address.value) return alert('Name and address are required');

  try {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        type: type.value,
        email: email.value,
        address: address.value,
        lat: lat.value || undefined,
        lng: lng.value || undefined,
      }),
    });

    const data = await res.json();
    if (data.error) return alert(data.error);

    alert(`Job added: ${data.job.id}, assigned to ${data.assignedEmployee}`);
    await plotEmployeesAndJobs();

    // Reset form
    name.value = '';
    type.value = '';
    email.value = '';
    address.value = '';
    lat.value = null;
    lng.value = null;
  } catch (err) {
    console.error('Error adding job:', err);
    alert('Error adding job. Check console.');
  }
}
</script>