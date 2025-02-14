import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import TeacherClasses from '../components/TeacherClasses.vue'
import Class from '../components/Class.vue'
import StudentPage from '../components/StudentPage.vue'
import ShopPage from '../components/ShopPage.vue'
import AdminPage from '../components/AdminPage.vue'
import { supabase } from '../supabaseClient'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: LoginPage
    },
    {
      path: '/auth/callback',
      component: LoginPage,
      beforeEnter: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (session.user.user_metadata?.role === 'admin') {
            return { path: '/admin' }
          }
          return { path: '/dashboard' }
        }
        return { path: '/' }
      }
    },
    {
      path: '/dashboard',
      component: TeacherClasses,
      meta: { requiresAuth: true }
    },
    {
      path: '/class/:id',
      component: Class,
      meta: { requiresAuth: true }
    },
    {
      path: '/class/:class_id/student/:id',
      component: StudentPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/shop/:id',
      component: ShopPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: AdminPage,
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!session) {
      next('/')
      return
    }
    console.log('user role', session.user.user_metadata)
    // Check if user is admin and trying to access non-admin pages
    if (session.user.user_metadata?.email === 'sefi.maman@gmail.com' && to.path !== '/admin') {
      next('/admin')
      return
    }

    // Check if non-admin user is trying to access admin page
    if (to.matched.some(record => record.meta.requiresAdmin)) {
      const isAdmin = session.user.user_metadata?.role === 'admin'
      if (!isAdmin) {
        next('/dashboard')
        return
      }
    }
  }
  
  next()
})

export default router