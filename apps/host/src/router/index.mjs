import { createRouter, createWebHistory } from 'vue-router'
import { store } from '@/store'

/**
 * Host routing. The host owns the URL; remotes are mounted as components
 * inside host routes (they don't ship their own router).
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'blank', guestOnly: true, title: 'Sign in' },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: true, title: 'Dashboard' },
  },
  {
    path: '/shell-a',
    name: 'shell-a',
    // Route-level code splitting: the remote is only fetched when visited
    component: () => import('@/views/ShellAView.vue'),
    meta: { requiresAuth: true, title: 'Shell A · Catalog' },
  },
  {
    path: '/shell-b',
    name: 'shell-b',
    component: () => import('@/views/ShellBView.vue'),
    meta: { requiresAuth: true, title: 'Shell B · Tasks' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Not found' },
  },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Global auth guard
router.beforeEach((to) => {
  const isAuthenticated = store.getters['auth/isAuthenticated']

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && isAuthenticated) {
    return { name: 'home' }
  }
  return true
})

router.afterEach((to) => {
  const base = import.meta.env.VITE_APP_TITLE || 'Vue MFE'
  document.title = to.meta.title ? `${to.meta.title} | ${base}` : base
})

export default router
