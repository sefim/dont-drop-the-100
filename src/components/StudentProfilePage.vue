<template>
  <div class="student-profile">
    <div class="header">
      <h1>הפרופיל שלי</h1>
      <div class="student-info">
        <div class="avatar-section">
          <img 
            :src="currentAvatar"
            :alt="student?.avatar"
            class="current-avatar"
          />
          <button @click="showAvatarSelector = true" class="change-avatar-button">
            שנה דמות
          </button>
        </div>
        <div class="info-text">
          <h2>{{ student?.name }}</h2>
        </div>
      </div>
    </div>

    <!-- Classes Section -->
    <div class="classes-section">
      <h2>הכיתות שלי</h2>
      <div class="classes-grid">
        <div v-for="class_ in classes" :key="class_.id" class="class-card">
          <h3>כיתה: {{ class_.name }}</h3>
          <p>בית ספר: {{ class_.school_name }}</p>
          <div class="class-scores">
            <div class="score-item">
              <span class="score-label">ציון יומי:</span>
              <span class="score-value">{{ class_.dailyPoints }}</span>
            </div>
            <div class="score-item">
              <span class="score-label">ציון שבועי:</span>
              <span class="score-value">{{ class_.weeklyPoints }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- History Log Section -->
    <div class="history-section">
      <h2>היסטוריית פעולות</h2>
      <div class="log-entries">
        <div v-for="log in userLogs" :key="log.id" class="log-entry">
          <div class="log-content">
            <div class="log-main">
              <span class="log-category">{{ log.category }}</span>
              <span class="log-subcategory">{{ log.subcategory }}</span>
              <span :class="['log-points', log.points >= 0 ? 'positive' : 'negative']">
                {{ log.points > 0 ? '+' : ''}}{{ log.points }}
              </span>
            </div>
            <div class="log-datetime">
              <span class="log-date">כיתה: {{ log.classes.name }}</span>
              <span class="log-date">מורה: {{ log.users.name }}</span>
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
            v-for="avatar in avatars" 
            :key="avatar.seed"
            class="avatar-option"
            @click="selectAvatar(avatar.seed)"
          >
            <img 
              :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${avatar.seed}`"
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
import { UserLog } from '../types'

const student = ref<Student | null>(null)
const classes = ref<Class[]>([])
const showAvatarSelector = ref(false)
const userLogs = ref<UserLog[]>([])
const avatars = ref<Avatar[]>([]);
const numAvatars = 20; // Number of avatars to generate

interface Student {
  id: number
  name: string
  email: string
  avatar: string
}

interface Class {
  id: number
  name: string
  school_name: string
  dailyPoints: number 
  weeklyPoints: number
}

interface Avatar {
  seed: string;
  url: string;
}


const generateAvatars = () => {
  for (let i = 0; i < numAvatars; i++) {
    const seed = generateRandomSeed(); // Function to generate a random seed (see below)
    const url = getDicebearAvatarURL(seed, "avataaars", { background: "#e0e0e0" }); // Example options
    avatars.value.push({ seed, url });
  }
};

const generateRandomSeed = () => {
    // Generate a random string (you can adjust the length)
    const length = 10;
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getDicebearAvatarURL(seed: string, style = "avataaars", options: { [key: string]: string } = {}) {
  const baseUrl = `https://api.dicebear.com/7.x/${style}/seed/${seed}`;
  const url = new URL(baseUrl);

  for (const key in options) {
    url.searchParams.append(key, options[key]);
  }

  return url.toString();
}
  
const currentAvatar = computed(() => {
  if (!student.value) return ''
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${student.value.avatar}`
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
  console.log('load Student')    
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Get student data
  const { data: userData } = await supabase
  .from('users')
  .select(`id, name, email, avatar`)
  .eq('email', user.email)
  .single()

  if (userData) {
    student.value = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar
    }

    // Get classes data
    const { data: classData } = await supabase
      .from('class_users')
      .select(`
        classes (id, name, school_name),
        users (user_points (daily_points, weekly_points))
      `)
      .eq('user_id', student.value.id)
      
    if (classData) {
      classes.value = classData.map((classData: any) => ({
        id: classData.classes.id,
        name: classData.classes.name,
        school_name: classData.classes.school_name,
        dailyPoints: classData.user_points?.daily_points,
        weeklyPoints: classData.user_points?.weekly_points
      }))
    }  
    // Load score logs
    const { data: logs } = await supabase
      .from('user_logs')
      .select('id, points, category, subcategory, created_at, classes(name), users!log_by_user_id(name)')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (logs) {
      
      userLogs.value = logs.map((log: any) => ({
        id: log.id,
        points: log.points,
        category: log.category,
        subcategory: log.subcategory,
        created_at: log.created_at,
        classes:  Array.isArray(log.classes) ? log.classes[0] : log.classes,
        users: Array.isArray(log.users) ? log.users[0] : log.users
      }))
    }
    generateAvatars()
  }
}

const selectAvatar = async (style: string) => {
  if (!student.value) return
  
  await supabase
    .from('users')
    .update({ avatar: style })
    .eq('id', student.value.id)

  student.value.avatar = style
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

/* Classes Section Styles */
.classes-section {
  margin: 40px 0;
}

.classes-section h2 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
}

.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.class-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid #42b883;
}

.class-card h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.class-card p {
  color: #666;
  margin: 0 0 15px 0;
}

.class-scores {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.score-label {
  color: #666;
}

.score-value {
  font-weight: bold;
  color: #42b883;
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