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
      >
        <div class="class-header" @click="goToClass(class_.id)">
          <h2>{{ class_.name }}</h2>
          <p>{{ class_.school_name }}</p>
        </div>
        
        <div class="class-logs">
          <h3>פעילות אחרונה</h3>
          <div class="logs-list">
            <div v-for="log in class_.logs" :key="log.id" class="log-entry">
              <div class="log-content">
                <div class="log-main">
                  <span class="student-name">{{ log.student_name }}</span>
                  <span class="log-category">{{ log.category }}</span>
                  <span class="log-subcategory">{{ log.subcategory }}</span>
                  <span :class="['log-points', log.points >= 0 ? 'positive' : 'negative']">
                    {{ log.points > 0 ? '+' : ''}}{{ log.points }}
                  </span>
                </div>
                <div class="log-datetime">
                  <span class="log-date">{{ formatDate(log.created_at) }}</span>
                  <span class="log-time">{{ formatTime(log.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
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

const router = useRouter()
const classes = ref([])
const user = ref<User | null>(null)

const getHebrewDay = (date: Date) => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  return days[date.getDay()]
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  const hebrewDay = getHebrewDay(date)
  const formattedDate = date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return `יום ${hebrewDay}, ${formattedDate}`
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadClassLogs = async (classId: number) => {
  const { data: logs } = await supabase
    .from('user_logs')
    .select(`
      id,
      points,
      category,
      subcategory,
      created_at,
      users!inner (
        name
      )
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(5)

  return logs?.map(log => ({
    ...log,
    student_name: log.users.name
  })) || []
}

const loadClasses = async () => {
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
    .from('class_users')
    .select(`
      classes (
        id,
        name,
        school_name
      )
    `)
    .eq('user_id', userData.user_id)

  if (classesData) {
    // If there's only one class, navigate directly to it
    if (classesData.length === 1 && classesData[0].classes) {
      router.push(`/class/${classesData[0].classes.id}`)
      return
    }

    // Otherwise, load all classes with their logs
    const classesWithLogs = await Promise.all(
      classesData.map(async (item) => {
        const logs = await loadClassLogs(item.classes.id)
        return {
          ...item.classes,
          logs
        }
      })
    )
    classes.value = classesWithLogs
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
}

.class-header {
  cursor: pointer;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
  margin-bottom: 15px;
}

.class-header:hover {
  opacity: 0.8;
}

.class-card h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.class-card p {
  margin: 0;
  color: #666;
}

.class-logs h3 {
  color: #2c3e50;
  font-size: 1.1em;
  margin-bottom: 10px;
}

.logs-list {
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-main {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.student-name {
  font-weight: bold;
  color: #2c3e50;
}

.log-category {
  color: #666;
}

.log-subcategory {
  color: #888;
  font-size: 0.9em;
}

.log-points {
  font-weight: bold;
  direction: ltr;
}

.log-points.positive {
  color: #42b883;
}

.log-points.negative {
  color: #e53935;
}

.log-datetime {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.85em;
  color: #666;
}

.log-date {
  color: #666;
}

.log-time {
  color: #999;
}
</style>