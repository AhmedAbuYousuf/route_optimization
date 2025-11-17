<template>
  <form @submit.prevent="login" class="login-form">
    <h2>Login</h2>
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Password" required />
    <button type="submit">Login</button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
const API_BASE = import.meta.env.VITE_API_BASE;
const email = ref('');
const password = ref('');

async function login() {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method:'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.user.role);
    window.location.href = data.user.role==='admin' ? '/admin' : '/worker';
  } catch(err) { console.error(err); alert('Login failed'); }
}
</script>