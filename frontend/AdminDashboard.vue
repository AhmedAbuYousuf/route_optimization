<template>
  <div>
    <h2>Admin Dashboard</h2>
    <ul>
      <li v-for="job in jobs" :key="job.id">
        {{ job.type }} - {{ job.address }} Assigned: {{ getEmployeeName(job.assigned_employee_id) }}
        <select v-model="assignments[job.id]">
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
        </select>
        <button @click="assignJob(job.id)">Assign</button>
      </li>
    </ul>
    <div id="map" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const API_BASE = import.meta.env.VITE_API_BASE;

const jobs = ref([]);
const employees = ref([]);
const assignments = ref({});

async function fetchData() {
  const token = localStorage.getItem('token');
  const jobsRes = await fetch(`${API_BASE}/admin/jobs`, { headers:{Authorization:`Bearer ${token}`} });
  jobs.value = await jobsRes.json();
  const empRes = await fetch(`${API_BASE}/employees`);
  employees.value = await empRes.json();
}

function getEmployeeName(id){ return employees.value.find(e=>e.id===id)?.name || 'Unassigned'; }

async function assignJob(jobId){
  const token = localStorage.getItem('token');
  const empId = assignments[jobId];
  await fetch(`${API_BASE}/admin/jobs/assign`, {
    method:'POST',
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
    body: JSON.stringify({ jobId, employeeId: empId })
  });
  fetchData();
}

onMounted(()=>{ fetchData(); });
</script>

<style>
.map-container{ width:100%; height:400px; margin-top:1rem;}
</style>
