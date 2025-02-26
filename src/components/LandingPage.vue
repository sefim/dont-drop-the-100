<template>
  <div v-if="store.userState.value === ''" class="loading">טוען...</div>
  <LoginPage v-if="store.userState.value === 'Login'"/>
  <PendingRolePage v-if="store.userState.value === 'pending'"/>
  <StudenProfilePage  v-if="store.userState.value === 'student'"/>
  <TeacherClasses  v-if="store.userState.value === 'teacher'"/>
</template>

<script setup lang="ts">
  import LoginPage from './LoginPage.vue'
  import StudenProfilePage from './StudentProfilePage.vue'
  import TeacherClasses from './TeacherClasses.vue'
  import PendingRolePage from './PendingRolePage.vue'
  
  import { useStore } from '../store'
  import { supabase } from '../supabaseClient'
  import { onMounted } from 'vue'

  const store = useStore()

  onMounted(async () => {
    console.log('starting landing page')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('User is not logged in, Login')
      store.userState.value = 'Login'
    }
    else {
      console.log('User is logged in, find role')
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()
      console.log('userData = ', userData)
      store.userState.value = userData?.role ?? 'Login'
      console.log('store.userState', store.userState.value)
  }
})
</script>
<style scoped>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-size: 1.2em;
    color: #42b883;
  }
</style>