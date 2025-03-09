<template>
  <div v-if="state.isLoading" class="loading">
    טוען...
  </div>
  <div v-else class="student-list">
    <div class="header">
      <div v-if="state.user" class="user-info">
        <div class="avatar-menu">
          <img 
          :src="state.user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${state.user.email}`" 
          :alt="state.user.user_metadata?.full_name || state.user.email"
          class="user-avatar"
          @click="showMenu = !showMenu"
          />
          <div v-if="showMenu" class="menu">
            <button @click="handleLogout" class="menu-item">התנתק</button>
          </div>
        </div>
      </div>
      <div class="header-info">
        <h2>אל תפיל את ה 100</h2>
      </div>
      <div>
        <button @click="goToClasses" class="back-button">הכיתות שלי</button>  
      </div>
    </div>
    <div class="school-class-info">
      <h3>בית ספר {{ studentsStore.currentClass?.school_name }}</h3>
      <h3>כיתה {{ studentsStore.currentClass?.name }}</h3>
    </div>
    <div class="current-day">
      <h2>{{ getCurrentDay() }}</h2>
    </div>
    <div class="class-score" v-if="classHasPoints">
      <h2>ציון שבועי: {{ studentsStore.currentClass?.points }}</h2>
    </div>
    <div v-if="sortedStudents.length > 0" class="students">
      <div 
        v-for="student in sortedStudents" 
        :key="student.id"
        class="student-card"
      >
        <div class="student-content" @click="goToStudent(student.id)">
          <h3>{{ student.name }}</h3>
          <div class="student-avatar">
            <img 
              :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${student.avatar}&backgroundColor=42b883`" 
              :alt="`Avatar of ${student.name}`"
              class="avatar-image"
            />
          </div>
        </div>
        <div class="student-content">
          <div class="student-info">
            <p>ציון יומי: {{ student.dailyPoints }}</p>
            <p>ציון שבועי: {{ student.weeklyPoints }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="sortedStudents.length === 0" class="no-students">
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
    <!-- Update Score Modal -->
    <div v-if="showScoreModal" class="modal">
      <div class="modal-content">
        <h2>עדכון ציון ל{{ selectedStudent?.name }}</h2>
        <form @submit.prevent="updateStudentScore">
          <div class="form-group">
            <label>ציון יומי נוכחי: {{ selectedStudent?.dailyPoints }}</label>
            <div class="score-input">
              <input 
                v-model.number="scoreChange" 
                type="number" 
                required
                placeholder="הכנס שינוי בציון"
              />
              <span class="score-preview" :class="{ positive: scoreChange > 0, negative: scoreChange < 0 }">
                ציון חדש: {{ selectedStudent ? selectedStudent.dailyPoints + (scoreChange || 0) : 0 }}
              </span>
            </div>
          </div>
          <div class="form-group">
            <label>סיבה לשינוי</label>
            <input 
              v-model="scoreReason" 
              type="text" 
              required
              placeholder="הכנס סיבה לשינוי הציון"
            />
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">עדכן</button>
            <button type="button" @click="cancelScoreUpdate" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'
import { useStudentsStore } from '../store/studentsStore'

const studentsStore = useStudentsStore()
const route = useRoute()
const router = useRouter()
const store = useStore()
const teachers = ref<Teacher[]>([])
  interface Teacher {
    id: number
    name: string
    email: string
}

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

const showMenu = ref(false)
const showScoreModal = ref(false)
const selectedStudent = ref<any>(null)
const scoreChange = ref<number>(0)
const scoreReason = ref('')

const classId = computed(() => {
  const id = Number(route.params.id)
  return id
})

const classHasPoints = computed(() => {
  return studentsStore.currentClass?.points !== null;
});

const sortedStudents = computed(() => {
  if (!studentsStore.students) return [];

  const studentsArray = Object.values(studentsStore.students);
  const sorted = studentsArray.sort((a, b) => a.id - b.id);
  
  return sorted;
});

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

const goToClasses = () => {
  router.push('/')
  showMenu.value = false
}

const handleReset = async () => {
  if (classId.value && confirm('האם אתה בטוח שברצונך לאפס את כל הציונים השבועיים?')) {
    await store.resetWeeklyScores(classId.value)
  }
}

const updateStudentScore = async () => {
  if (!selectedStudent.value || !scoreChange.value || !scoreReason.value) return

  try {
    await store.updateStudentScore(
      selectedStudent.value.id,
      classId.value,
      scoreChange.value,
      'עדכון ידני',
      scoreReason.value
    )

    // Reload students to update the UI
    if (classId.value) {
      await studentsStore.loadStudents(classId.value)
    }

    cancelScoreUpdate()
  } catch (error) {
    console.error('Error updating score:', error)
    alert('שגיאה בעדכון הציון. אנא נסה שוב.')
  }
}

const cancelScoreUpdate = () => {
  showScoreModal.value = false
  selectedStudent.value = null
  scoreChange.value = 0
  scoreReason.value = ''
}

const loadTeachers = async (classId: number) => {
  try {
    const { data: teachersData } = await supabase
      .from('class_users')
      .select(`
        users!inner (
          id,
          name,
          email
        )
      `)
      .eq('class_id', classId)
      .eq('users.role', 'teacher')

    if (teachersData) {
      teachers.value = teachersData.flatMap((item) => item.users).map(
        user => ({
          id: user.id,
          name: user.name,
          email: user.email,
      }))
    }
  } catch (error) {
    console.error('Error loading teachers:', error)
  }
}

// const addStudent = async () => {
//   if (!classId.value) return

//   try {
//     let user_id = 0
//      {
//       // Create user record
//       const { data: userData, error: userError } = await supabase
//         .from('users')
//         .insert({
//           name: studentForm.value.name,
//           email: studentForm.value.email,
//           role: 'student'
//         })
//         .select()
//         .single()

//       if (userError) throw userError
//       console.log('insert user', userData)
//       user_id = userData.id
//     }
//       // Add user to class
//     const { error: classError } = await supabase
//       .from('class_users')
//       .insert({
//         class_id: classId.value,
//         user_id: user_id
//       })

//     if (classError) throw classError

//     // Initialize user points
//     const { error: pointsError } = await supabase
//       .from('user_points')
//       .insert({
//         user_id: user_id,
//         daily_points: 100,
//         weekly_points: 0
//       })

//     if (pointsError) throw pointsError

//     await store.loadStudents(classId.value)
//     showAddStudent.value = false
//     studentForm.value = { name: '', email: '' }
//     showMenu.value = false
    
//   } catch (error) {
//     console.error('Error adding student:', error)
//     alert('שגיאה בהוספת תלמיד. אנא נסה שוב.')
//   }
// }

// const deleteStudent = async (studentId: number) => {
//   if (!confirm('האם אתה בטוח שברצונך למחוק תלמיד זה?')) return

//   try {
//     // Delete the class_users association first
//     const { error: classUserError } = await supabase
//       .from('class_users')
//       .delete()
//       .eq('user_id', studentId)

//     if (classUserError) throw classUserError

//     // Delete the user_points
//     const { error: pointsError } = await supabase
//       .from('user_points')
//       .delete()
//       .eq('user_id', studentId)

//     if (pointsError) throw pointsError

//     // Delete the user
//     const { error: userError } = await supabase
//       .from('users')
//       .delete()
//       .eq('id', studentId)

//     if (userError) throw userError

//     // Reload students to update the UI
//     if (classId.value) {
//       await store.loadStudents(classId.value)
//     }
//     activeStudentMenu.value = null
//   } catch (error) {
//     console.error('Error deleting student:', error)
//     alert('שגיאה במחיקת התלמיד. אנא נסה שוב.')
//   }
// }

// const cancelAddStudent = () => {
//   showAddStudent.value = false
//   studentForm.value = { name: '', email: '' }
// }

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/')
}

const checkTeacherClasses = async (userId: string) => {
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single()

  if (userData) {
    const { data: classesData } = await supabase
      .from('class_users')
      .select('class_id')
      .eq('user_id', userData.id)

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
      router.push('/')
      return
    }

    await Promise.all([
      studentsStore.loadStudents(classId.value),
      loadTeachers(classId.value)
    ])
  } catch (error) {
    console.error('Error initializing component:', error)
    router.push('/')
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
  margin-right: 10px;
}

.back-button {
  background: #888ae0;
  color: white;
  align-content: flex-end;
  max-width: 90px;
  max-height: 60px;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
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
  justify-content: center;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar-menu {
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

.menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 150px;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 10px 15px;
  text-align: right;
  border: none;
  background: none;
  color: #2c3e50;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f8f9fa;
  color: #42b883;
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

.student-card {
  padding: 20px;
  border: 2px solid #42b883;
  border-radius: 12px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.3s ease;
}

.student-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-grow: 1;
  cursor: pointer;
}

.student-avatar {
  width: 45px;
  height: 45px;
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

.student-menu {
  position: relative;
}

.menu-trigger {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.menu-trigger:hover {
  background: #f0f0f0;
}

.dots {
  display: block;
  width: 4px;
  height: 4px;
  background: #666;
  border-radius: 50%;
  position: relative;
}

.dots::before,
.dots::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: #666;
  border-radius: 50%;
  left: 0;
}

.dots::before {
  top: -6px;
}

.dots::after {
  bottom: -6px;
}

.menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 150px;
  overflow: hidden;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 10px 15px;
  text-align: right;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-item.delete {
  color: #e53935;
}

.menu-item.delete:hover {
  background-color: #ffebee;
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
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.save-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-button:hover {
  background: #3aa876;
}

.cancel-button {
  background: #666;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover {
  background: #555;
}

.score-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-preview {
  font-size: 0.9em;
  font-weight: bold;
}

.score-preview.positive {
  color: #42b883;
}

.score-preview.negative {
  color: #e53935;
}
</style>