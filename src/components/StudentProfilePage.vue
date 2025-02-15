<template>
  <div class="student-profile">
    <div class="header">
      <h1>הפרופיל שלי</h1>
      <div class="student-info">
        <div class="avatar-section">
          <img 
            :src="currentAvatar"
            :alt="student?.name"
            class="current-avatar"
          />
          <button @click="showAvatarSelector = true" class="change-avatar-button">
            שנה דמות
          </button>
        </div>
        <div class="info-text">
          <h2>{{ student?.name }}</h2>
          <p>כיתה: {{ className }}</p>
          <p>ציון יומי: {{ student?.dailyPoints }}</p>
          <p>ציון שבועי: {{ student?.weeklyPoints }}</p>
        </div>
      </div>
    </div>

    <!-- History Log Section -->
    <div class="history-section">
      <h2>היסטוריית פעולות</h2>
      <div class="log-entries">
        <div v-for="log in scoreLogs" :key="log.id" class="log-entry">
          <div class="log-content">
            <div class="log-main">
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

    <!-- Avatar Selector Modal -->
    <div v-if="showAvatarSelector" class="modal">
      <div class="modal-content">
        <h2>בחר דמות</h2>
        <div class="avatars-grid">
          <button 
            v-for="style in avatarStyles" 
            :key="style"
            class="avatar-option"
            @click="selectAvatar(style)"
          >
            <img 
              :src="`https://api.dicebear.com/7.x/${style}/svg?seed=${student?.name}`"
              :alt="style"
            />
          </button>
        </div>
        <div class="modal-actions">
          <button @click="showAvatarSelector = false" class="cancel-button">סגור</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabaseClient'

interface Student {
  user_id: number
  name: string
  email?: string
  dailyPoints: number
  weeklyPoints: number
  class_id: number
  avatar_style?: string
}

interface ScoreLog {
  id: number
  points: number
  category: string
  subcategory: string
  created_at: string
}

const student = ref<Student | null>(null)
const className = ref('')
const showAvatarSelector = ref(false)
const scoreLogs = ref<ScoreLog[]>([])

const avatarStyles = [
  'bottts',
  'pixel-art',
  'adventurer',
  'fun-emoji',
  'big-smile',
  'personas',
  'notionists',
  'micah',
  'miniavs',
  'open-peeps',
  'avataaars',
  'big-ears'
]

const currentAvatar = computed(() => {
  if (!student.value) return ''
  const style = student.value.avatar_style || 'bottts'
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${student.value.name}`
})

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

const loadStudent = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  // Get student data
  const { data: userData } = await supabase
    .from('users')
    .select(`
      user_id,
      name,
      email,
      avatar_style,
      user_points (
        daily_points,
        weekly_points
      ),
      class_users!inner (
        class_id,
        classes (
          name,
          school_name
        )
      )
    `)
    .eq('email', session.user.email)
    .single()

  if (userData) {
    student.value = {
      user_id: userData.user_id,
      name: userData.name,
      email: userData.email,
      dailyPoints: userData.user_points[0].daily_points,
      weeklyPoints: userData.user_points[0].weekly_points,
      class_id: userData.class_users[0].class_id,
      avatar_style: userData.avatar_style
    }
    className.value = `${userData.class_users[0].classes[0].name} - ${userData.class_users[0].classes[0].school_name}`

    // Load score logs
    const { data: logs } = await supabase
      .from('user_logs')
      .select('*')
      .eq('user_id', userData.user_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (logs) {
      scoreLogs.value = logs
    }
  }
}

const selectAvatar = async (style: string) => {
  if (!student.value) return

  await supabase
    .from('users')
    .update({ avatar_style: style })
    .eq('user_id', student.value.user_id)

  student.value.avatar_style = style
  showAvatarSelector.value = false
}

onMounted(loadStudent)
</script>

<style scoped>
.student-profile {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.student-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.current-avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 4px solid #42b883;
  background: white;
  padding: 4px;
}

.change-avatar-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.change-avatar-button:hover {
  background: #3aa876;
  transform: translateY(-2px);
}

.info-text {
  text-align: center;
}

.info-text h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.info-text p {
  margin: 5px 0;
  color: #666;
}

/* History Section Styles */
.history-section {
  margin-top: 40px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
}

.history-section h2 {
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.log-entries {
  display: grid;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.log-entry {
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.log-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-main {
  display: flex;
  gap: 15px;
  align-items: center;
}

.log-category {
  font-weight: bold;
  color: #2c3e50;
}

.log-subcategory {
  color: #666;
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

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.avatars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.avatar-option {
  aspect-ratio: 1;
  padding: 8px;
  border: 2px solid #eee;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-option:hover {
  border-color: #42b883;
  transform: scale(1.05);
}

.avatar-option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.modal-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.cancel-button {
  background: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button:hover {
  opacity: 0.9;
}
</style>