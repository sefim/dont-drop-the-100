import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../components/LandingPage.vue'
import Class from '../components/Class.vue'
import StudentPage from '../components/StudentPage.vue'
import ShopPage from '../components/ShopPage.vue'
import AdminPage from '../components/AdminPage.vue'


const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: LandingPage
    },
    {
      path: '/auth/callback',
      component: LandingPage,
    },
    {
      path: '/class/:id',
      component: Class,
      name: 'class',
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/class/:class_id/student/:id',
      component: StudentPage,
      name: 'student',
      meta: { requiresAuth: true },
      props: true
    },
    {
      path: '/shop/class/:classId/student/:id',
      component: ShopPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: AdminPage,
      meta: { requiresAuth: true }
    }
  ]
})

export default router