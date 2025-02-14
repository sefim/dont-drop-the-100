<template>
  <div v-if="state.isLoading" class="loading">
    טוען...
  </div>
  <div v-else class="student-list">
    <div class="header">
      <button v-if="!state.isSingleClass" class="back-button" @click="goBack">חזור</button>
      <div class="header-info">
        <h2>אל תפיל את ה 100</h2>
        <div class="school-class-info">
          <h3>בית ספר {{ store.currentClass?.school_name }}</h3>
          <h3>כיתה {{ store.currentClass?.name }}</h3>
        </div>
      </div>
      <div v-if="state.user" class="user-info">
        <div class="avatar-tooltip">
          <img 
            :src="state.user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${state.user.email}`" 
            :alt="state.user.user_metadata?.full_name || state.user.email"
            class="user-avatar"
          />
          <span class="tooltip-text">{{ state.user.user_metadata?.full_name || state.user.email }}</span>
        </div>
      </div>
    </div>
    <div class="current-day">
      <h2>{{ getCurrentDay() }}</h2>
    </div>
    <div class="class-score">
      <h2>ציון שבועי: {{ store.currentClass?.points || 0 }}</h2>
    </div>
    <div v-if="sortedStudents.length > 0" class="students">
      <button 
        v-for="student in sortedStudents" 
        :key="student.id"
        @click="goToStudent(student.id)"
        class="student-button"
      >
        <div class="student-avatar">
          <img 
            :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}&backgroundColor=42b883`" 
            :alt="`Avatar of ${student.name}`"
            class="avatar-image"
          />
        </div>
        <div class="student-info">
          <h3>{{ student.name }}</h3>
          <p>ציון יומי: {{ student.dailyPoints }}</p>
          <p>ציון שבועי: {{ student.weeklyPoints }}</p>
        </div>
      </button>
    </div>
    <div v-else class="no-students">
      לא נמצאו תלמידים בכיתה זו
    </div>
    <div class="action-buttons">
      <button 
        @click="store.endDay" 
        class="end-day-button"
        :disabled="!store.canEndDay.value"
        :class="{ 'disabled': !store.canEndDay.value }"
      >
        סיום יום
      </button>
      <button @click="handleReset" class="reset-button">איפוס שבועי</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'

const route = useRoute()
const router = useRouter()
const store = useStore()

interface State {
  isLoading: boolean
  user: User | null
  isSingleClass: boolean
}

const state = ref<State>({
  isLoading: true,
  user: null,
  isSingleClass: false
})

const classId = computed(() => {
  const id = Number(route.params.id)
  if (!id || isNaN(id)) {
    console.error('Invalid class ID:', route.params.id)
    return null
  }
  return id
})

const sortedStudents = computed(() => {
  if (!store.students.value) return []
  return Object.values(store.students.value).sort((a, b) => a.id - b.id)
})

const getCurrentDay = () => {
  const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת']
  const today = new Date().getDay()
  return days[today]
}

const goToStudent = (id: number) => {
  if (classId.value) {
    router.push(`/class/${classId.value}/student/${id}`)
  }
}

const goBack = () => {
  router.push('/dashboard')
}

const handleReset = async () => {
  if (classId.value && confirm('האם אתה בטוח שברצונך לאפס את כל הציונים השבועיים?')) {
    await store.resetWeeklyScores(classId.value)
  }
}

const checkTeacherClasses = async (userId: string) => {
  const { data: userData } = await supabase
    .from('users')
    .select('user_id')
    .eq('aut_user_id', userId)
    .single()

  if (userData) {
    const { data: classesData } = await supabase
      .from('class_users')
      .select('class_id')
      .eq('user_id', userData.user_id)

    state.value.isSingleClass = classesData?.length === 1
  }
}

const initializeComponent = async () => {
  try {
    state.value.isLoading = true
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/')
      return
    }

    state.value.user = session.user
    await checkTeacherClasses(session.user.id)

    if (!classId.value) {
      console.error('Invalid class ID')
      router.push('/dashboard')
      return
    }

    await store.loadStudents(classId.value)
  } catch (error) {
    console.error('Error initializing component:', error)
    router.push('/dashboard')
  } finally {
    state.value.isLoading = false
  }
}

onMounted(initializeComponent)
</script>

<style scoped>
.student-list {
  padding: 20px;
  text-align: center;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.header-info {
  flex-grow: 1;
  text-align: center;
}

.header-info h2 {
  margin: 0;
  color: #2c3e50;
}

.school-class-info {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 5px;
}

.school-class-info h3 {
  margin: 0;
  font-size: 1em;
  color: #666;
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
  width: 32px;
  height: 32px;
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

.current-day {
  background: #42b883;
  color: white;
  padding: 10px;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(66, 184, 131, 0.2);
}

.current-day h2 {
  margin: 0;
  font-size: 1.5em;
}

.students {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 20px 0;
}

.student-button {
  padding: 20px;
  border: 2px solid #42b883;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.student-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.2);
}

.student-avatar {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f0;
  border: 3px solid #42b883;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.student-info {
  flex-grow: 1;
  text-align: right;
}

.student-info h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.student-info p {
  margin: 4px 0;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 20px;
}

.end-day-button, .reset-button {
  background: #42b883;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.end-day-button:hover:not(.disabled) {
  background: #3aa876;
  transform: translateY(-1px);
}

.end-day-button.disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.reset-button {
  background: #e53935;
}

.reset-button:hover {
  background: #d32f2f;
  transform: translateY(-1px);
}

.class-score {
  margin: 20px 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.class-score h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8em;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2em;
  color: #42b883;
}

.no-students {
  text-align: center;
  padding: 2em;
  color: #666;
  font-size: 1.2em;
}
</style>