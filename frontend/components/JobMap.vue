<template>
  <div id="map" class="map-container"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
const API_BASE = import.meta.env.VITE_API_BASE;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const map = ref(null);
let marker;
let directionsService;
let directionsRenderer;

function setCenter(latLng) {
  if (map.value) {
    map.value.setCenter(latLng);
    if (marker) marker.setPosition(latLng);
  }
}

const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const plotEmployeesAndJobs = async () => {
  if (!map.value) return;
  const employeesRes = await fetch(`${API_BASE}/employees`);
  const employees = await employeesRes.json();
  const jobsRes = await fetch(`${API_BASE}/jobs`);
  const jobs = await jobsRes.json();

  directionsRenderer.setMap(null);
  directionsRenderer = new google.maps.DirectionsRenderer({ map: map.value });

  for (const emp of employees) {
    new google.maps.Marker({
      position: { lat: emp.lat, lng: emp.lng },
      map: map.value,
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

    directionsService.route({
      origin: { lat: emp.lat, lng: emp.lng },
      destination: waypoints[waypoints.length - 1].location,
      waypoints: waypoints.slice(0, -1),
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK') directionsRenderer.setDirections(result);
      else console.error('Directions request failed:', status);
    });
  }
};

onMounted(() => {
  map.value = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 23.8103, lng: 90.4125 },
    zoom: 12
  });
  marker = new google.maps.Marker({ map: map.value });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map: map.value });

  plotEmployeesAndJobs();
});

</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
