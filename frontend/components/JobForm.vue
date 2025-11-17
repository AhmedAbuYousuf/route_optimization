<template>
  <form @submit.prevent="submitForm" class="job-form">
    <h2>Add Job</h2>
    <input v-model="name" type="text" placeholder="Name" required />
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="phone" type="text" placeholder="Phone Number" required />
    <input v-model="type" type="text" placeholder="Type of Work" required />
    <input
      v-model="location"
      type="text"
      placeholder="Address or Plus Code"
      @blur="handleAddressInput"
      required
    />
    
    <div ref="mapContainer" class="map-container" v-show="showMap"></div>

    <button type="submit">Submit</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const name = ref('');
const email = ref('');
const phone = ref('');
const type = ref('');
const location = ref('');
const lat = ref(null);
const lng = ref(null);

const mapContainer = ref(null);
let map, marker;
const showMap = ref(false);

const emit = defineEmits(['location-updated']);

async function geocodeAddress(address) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Geocode error:', err);
    return null;
  }
}

async function handleAddressInput() {
  if (!location.value) return;

  const geoData = await geocodeAddress(location.value);

  if (geoData && geoData.status === 'OK' && geoData.results.length > 0) {
    const loc = geoData.results[0].geometry.location;
    lat.value = loc.lat;
    lng.value = loc.lng;
    showMap.value = false;
  } else {
    showMap.value = true;

    const defaultLatLng = { lat: 23.8103, lng: 90.4125 }; // Dhaka

    if (!map) {
      map = new google.maps.Map(mapContainer.value, {
        center: defaultLatLng,
        zoom: 15,
      });

      marker = new google.maps.Marker({
        position: defaultLatLng,
        map,
        draggable: true,
      });

      marker.addListener('dragend', async () => {
        const pos = marker.getPosition();
        lat.value = pos.lat();
        lng.value = pos.lng();

        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.lat()},${pos.lng()}&key=${GOOGLE_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          location.value = data.results[0].formatted_address;
        }
      });
    }
  }
}

async function submitForm() {
  if (!name.value || !email.value || !phone.value || !type.value || !location.value) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        phone: phone.value,
        type: type.value,
        address: location.value,
        lat: lat.value,
        lng: lng.value
      })
    });

    const data = await res.json();
    if (data.error) return alert(data.error);

    alert(`Job added: ${data.job.id}, assigned to ${data.assignedEmployee}`);

    emit('location-updated', { lat: data.job.lat, lng: data.job.lng });

    // Reset form
    name.value = '';
    email.value = '';
    phone.value = '';
    type.value = '';
    location.value = '';
    lat.value = null;
    lng.value = null;
    if (marker) {
      marker.setPosition(null);
      map.setCenter({ lat: 23.8103, lng: 90.4125 });
    }
    showMap.value = false;
  } catch (err) {
    console.error(err);
    alert('Error adding job. Check console.');
  }
}
</script>

<style>
.job-form {
  width: 100%;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(34, 102, 239, 0.2);
}
.job-form input {
  padding: 0.75rem 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
}
.job-form input:focus {
  border-color: #2266ef;
  outline: none;
  box-shadow: 0 0 8px rgba(34, 102, 239, 0.3);
}
.job-form button {
  padding: 0.75rem;
  background-color: #2266ef;
  color: #fff;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.job-form button:hover {
  background-color: #1144cc;
  box-shadow: 0 4px 10px rgba(34, 102, 239, 0.3);
}
.map-container {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-top: 0.5rem;
  overflow: hidden;
}
</style>
