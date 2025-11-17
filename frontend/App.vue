<template>
  <div class="app-container">
    <!-- Left section: Form -->
    <div class="left-panel">
      <JobForm @address-changed="updateMapLocation" />
    </div>

    <!-- Right section: Map -->
    <div class="right-panel">
      <JobMap ref="jobMap" />
    </div>
  </div>
</template>

<script setup>
</script>


<script setup>
import { ref } from 'vue';
import JobForm from './components/JobForm.vue';
import JobMap from './components/JobMap.vue';

const jobMap = ref(null);

function updateMapLocation(latLng) {
  if (jobMap.value) jobMap.value.setCenter(latLng);
}
</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: Arial, sans-serif;
}

.app-container {
  display: flex;
  height: 100vh;
}

.left-panel {
  width: 35%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7ff;
  padding: 2rem;
  box-shadow: 2px 0 10px rgba(34, 102, 239, 0.2);
}

.right-panel {
  width: 65%;
  height: 100%;
}
</style>
