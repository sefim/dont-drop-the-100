import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../components/LoginPage.vue'
import TeacherClasses from '../components/TeacherClasses.vue'
import Class from '../components/Class.vue'
import StudentPage from '../components/StudentPage.vue'
import ShopPage from '../components/ShopPage.vue'
import AdminPage from '../components/AdminPage.vue'
import StudentProfilePage from '../components/StudentProfilePage.vue'
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
          return { path: '/dashboard' }
        }
        return { path: '/' }
      }
    },
    {
      path: '/dashboard',
      component: TeacherClasses,
      name: 'teacher_classes',
      meta: { requiresAuth: true },
      beforeEnter: (to, from, next) => {
        console.log(from)  
        if (from.name === 'class') {
          // Do something specific for navigation from PageA
          to.meta.cameFrom = 'class'; // Set on route meta
        }
        next(); // Important: Call next() to proceed with navigation
      }
    },
    {
      path: '/class/:id',
      component: Class,
      name: 'class',
      meta: { requiresAuth: true }
    },
    {
      path: '/class/:class_id/student/:id',
      component: StudentPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/shop/class/:classId/student/:id',
      component: ShopPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      component: AdminPage,
      meta: { requiresAuth: false }
    },
    {
      path: '/profile',
      component: StudentProfilePage,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!session) {
      next('/admin')
      return
    }
  }
  
  next()
})

export default router