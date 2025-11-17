<template>
  <div class="worker-dashboard">
    <h2>My Jobs</h2>
    <ul>
      <li v-for="job in jobs" :key="job.id">
        <strong>{{ job.type }}</strong> - {{ job.address }}
        <div>ETA: {{ job.eta_minutes }} mins</div>
        <div>
          <button @click="updateStatus(job.id,'started')">Start</button>
          <button @click="updateStatus(job.id,'completed')">Complete</button>
        </div>
      </li>
    </ul>
    <div id="map" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const API_BASE = import.meta.env.VITE_API_BASE;

const jobs = ref([]);
let map, directionsService, directionsRenderer;

async function fetchJobs() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/worker/jobs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  jobs.value = await res.json();
}

async function updateStatus(jobId, status){
  const token = localStorage.getItem('token');
  await fetch(`${API_BASE}/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
    body: JSON.stringify({ status })
  });
  fetchJobs();
}

function plotJobs() {
  if (!map || !jobs.value.length) return;
  directionsRenderer.setMap(null);
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  const origin = { lat: jobs.value[0].lat, lng: jobs.value[0].lng };
  const waypoints = jobs.value.slice(1).map(job => ({ location:{lat: job.lat,lng:job.lng}, stopover:true }));
  
  directionsService.route({
    origin,
    destination: origin,
    waypoints,
    travelMode: google.maps.TravelMode.DRIVING
  }, (res, status)=>{
    if(status==='OK') directionsRenderer.setDirections(res);
  });
}

onMounted(()=>{
  map = new google.maps.Map(document.getElementById('map'), { center: {lat:23.8103,lng:90.4125}, zoom:12 });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });
  fetchJobs().then(plotJobs);
});
</script>

<style>
.map-container { width: 100%; height: 400px; margin-top: 1rem; }
</style>
