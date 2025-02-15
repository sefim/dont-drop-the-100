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

interface Session {
  user: any;
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

interface SupabaseAuthResponse {
  data: {
    session: Session | null;
  };
}

router.beforeEach(async (to: any, _from: any, next: any) => {
  const { data: { session } }: SupabaseAuthResponse = await supabase.auth.getSession()

  if (to.matched.some((record: any) => record.meta.requiresAuth)) {
    if (session) {
      next('/dashboard')
      return
    }
  }
  
  next()
})

export default router