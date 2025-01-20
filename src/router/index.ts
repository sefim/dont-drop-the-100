import { createRouter, createWebHistory } from 'vue-router'
import StudentList from '../components/StudentList.vue'
import StudentPage from '../components/StudentPage.vue'
import ShopPage from '../components/ShopPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: StudentList
    },
    {
      path: '/student/:id',
      component: StudentPage
    },
    {
      path: '/shop/:id',
      component: ShopPage
    }
  ]
})

export default router