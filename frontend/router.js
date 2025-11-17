import { createRouter, createWebHistory } from 'vue-router';
import Login from './Login.vue';
import AdminDashboard from './AdminDashboard.vue';
import WorkerDashboard from './WorkerDashboard.vue';
import JobFormPage from './components/JobForm.vue'; // your current App.vue form page

const routes = [
  { path: '/', component: JobFormPage }, // public client submission page
  { path: '/login', component: Login },
  { path: '/admin', component: AdminDashboard },
  { path: '/worker', component: WorkerDashboard },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Optional: simple route guard based on localStorage role
router.beforeEach((to, from, next) => {
  const role = localStorage.getItem('role');
  if ((to.path === '/admin' && role !== 'admin') || (to.path === '/worker' && role !== 'worker')) {
    return next('/login'); // redirect unauthorized users
  }
  next();
});

export default router;
