<template>
  <div class="teacher-classes">
    <div class="header">
      <h1>אל תפיל את ה 100</h1>
      <div v-if="user" class="user-info">
        <div class="avatar-tooltip">
          <img 
            :src="user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`" 
            :alt="user.user_metadata?.full_name || user.email"
            class="user-avatar"
          />
          <span class="tooltip-text">{{ user.user_metadata?.full_name || user.email }}</span>
        </div>
      </div>
    </div>

    <h2 class="section-title">הכיתות שלי</h2>
    <div class="classes-grid">
      <div 
        v-for="class_ in classes" 
        :key="class_.id"
        class="class-card"
        @click="goToClass(class_.id)"
      >
        <div class="class-header">
          <h2>{{ class_.name }}</h2>
          <p>{{ class_.school_name }}</p>
        </div>
        <div class="class-points">
          <h3>ציון כיתתי: {{ class_.points || 0 }}</h3>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'
import type { Class } from '../types'

const router = useRouter()
const classes = ref<Class[]>([])
const user = ref<User | null>(null)
 
const loadClasses = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    user.value = session.user

    const { data: userData } = await supabase
      .from('users')
      .select('user_id')
      .eq('aut_user_id', session.user.id)
      .single()

    if (!userData) return

    const { data: classesData } = await supabase
      .from('classes')
      .select(`
          id,
          name,
          school_name,
          points,
          last_day,
          class_users(user_id, class_id)
      `)
      .eq('class_user.user_id', userData.user_id)

    if (classesData) {
      // If there's only one class, navigate directly to it
      if (classesData.length === 1) {
        router.push(`/class/${classesData[0].class_users[0].class_id}`)
        return
      }

      classes.value = classesData
    }
  } catch (error) {
    console.error('Error loading classes:', error)
  }
}

const goToClass = (classId: number) => {
  router.push(`/class/${classId}`)
}

onMounted(loadClasses)
</script>

<style scoped>
.teacher-classes {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.header h1 {
  margin: 0;
  font-size: 2em;
  color: #2c3e50;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar-tooltip {
  position: relative;
  cursor: pointer;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #42b883;
  transition: transform 0.2s ease;
}

.user-avatar:hover {
  transform: scale(1.1);
}

.tooltip-text {
  visibility: hidden;
  position: absolute;
  z-index: 1;
  bottom: -30px;
  right: 50%;
  transform: translateX(50%);
  background-color: #333;
  color: white;
  text-align: center;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip-text::after {
  content: "";
  position: absolute;
  bottom: 100%;
  right: 50%;
  margin-right: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: transparent transparent #333 transparent;
}

.avatar-tooltip:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}

.section-title {
  color: #2c3e50;
  margin: 20px 0;
  font-size: 1.5em;
}

.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.class-card {
  background: white;
  border: 2px solid #42b883;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.class-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.2);
}

.class-header {
  margin-bottom: 15px;
}

.class-card h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.class-card p {
  margin: 0;
  color: #666;
}

.class-points {
  text-align: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.class-points h3 {
  margin: 0;
  color: #42b883;
  font-size: 1.2em;
}
</style>