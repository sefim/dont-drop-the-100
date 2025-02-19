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
          <h3>בית ספר {{ store.currentClass.value?.school_name }}</h3>
          <h3>כיתה {{ store.currentClass.value?.name }}</h3>
        </div>
      </div>
      <div v-if="state.user" class="user-info">
        <div class="avatar-menu">
          <img 
            :src="state.user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${state.user.email}`" 
            :alt="state.user.user_metadata?.full_name || state.user.email"
            class="user-avatar"
            @click="showMenu = !showMenu"
          />
          <div v-if="showMenu" class="menu">
            <button @click="goToClasses" class="menu-item">
              הכיתות שלי
            </button>
            <button @click="showAddStudent = true" class="menu-item">
              הוסף תלמיד
            </button>
            <button @click="showEditClass = true" class="menu-item">
              ערוך כיתה
            </button>
            <button @click="handleLogout" class="menu-item">
              התנתק
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="current-day">
      <h2>{{ getCurrentDay() }}</h2>
    </div>
    <div class="class-score">
      <h2>ציון שבועי: {{ store.currentClass.value?.points || 0 }}</h2>
    </div>
    <div v-if="sortedStudents.length > 0" class="students">
      <div 
        v-for="student in sortedStudents" 
        :key="student.id"
        class="student-card"
      >
        <div class="student-content" @click="goToStudent(student.id)">
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
        </div>
        <div class="student-menu">
          <button @click="showStudentMenu(student.id)" class="menu-trigger">
            <span class="dots"></span>
          </button>
          <div v-if="activeStudentMenu === student.id" class="menu">
            <button @click="deleteStudent(student.id)" class="menu-item delete">
              מחק תלמיד
            </button>
          </div>
        </div>
      </div>
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
      <!-- Add Student Modal -->
      <div v-if="showAddStudent" class="modal">
        <div class="modal-content">
          <h2>הוסף תלמיד</h2>
          <form @submit.prevent="addStudent">
            <div class="form-group">
              <label>שם התלמיד</label>
              <input v-model="studentForm.name" required placeholder="הכנס שם תלמיד" />
            </div>
            <div class="form-group">
              <label>אימייל</label>
              <input v-model="studentForm.email" type="email" placeholder="הכנס אימייל" />
            </div>
            <div class="modal-actions">
              <button type="submit" class="save-button">הוסף</button>
              <button type="button" @click="cancelAddStudent" class="cancel-button">בטל</button>
            </div>
          </form>
        </div>
      </div>
      <!-- Edit Class Modal -->
      <div v-if="showEditClass" class="modal">
        <div class="modal-content">
          <h2>ערוך כיתה</h2>
          <form @submit.prevent="saveClass">
            <div class="form-group">
              <label>שם כיתה</label>
              <input v-model="classForm.name" required />
            </div>
            <div class="form-group">
              <label>בית ספר</label>
              <input v-model="classForm.school_name" required />
            </div>
            <div class="modal-actions">
              <button type="submit" class="save-button">שמור</button>
              <button type="button" @click="cancelEdit" class="cancel-button">בטל</button>
            </div>
          </form>
        </div>
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

const showMenu = ref(false)
const activeStudentMenu = ref<number | null>(null)
const showAddStudent = ref(false)
const showEditClass = ref(false)
const studentForm = ref({
  name: '',
  email: ''
})
const classForm = computed(() => ({
  name: store.currentClass.value?.name || '',
  school_name: store.currentClass.value?.school_name || ''
}))

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

const goToClasses = () => {
  router.push('/dashboard')
  showMenu.value = false
}

const handleReset = async () => {
  if (classId.value && confirm('האם אתה בטוח שברצונך לאפס את כל הציונים השבועיים?')) {
    await store.resetWeeklyScores(classId.value)
  }
}

const showStudentMenu = (studentId: number) => {
  activeStudentMenu.value = activeStudentMenu.value === studentId ? null : studentId
}

const addStudent = async () => {
  if (!classId.value) return

  try {
    let user_id = 0
    if (studentForm.value.email) {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentForm.value.email,
        password: 'Password123!', // Default password
        options: {
          data: {
            role: 'student',
            name: studentForm.value.name
          }
        }
      })
      if (authError) throw authError
      console.log(authData)
      // get user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authData.user?.id)
        .single()

      if (userError) throw userError
      console.log(userData)
      user_id = userData.id
    }
    else {
      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name: studentForm.value.name,
          role: 'student'
        })
        .select()
        .single()

      if (userError) throw userError
      console.log('insert user', userData)
      user_id = userData.id
    }
      // Add user to class
    const { error: classError } = await supabase
      .from('class_users')
      .insert({
        class_id: classId.value,
        user_id: user_id
      })

    if (classError) throw classError

    // Initialize user points
    const { error: pointsError } = await supabase
      .from('user_points')
      .insert({
        user_id: user_id,
        daily_points: 100,
        weekly_points: 0
      })

    if (pointsError) throw pointsError

    await store.loadStudents(classId.value)
    showAddStudent.value = false
    studentForm.value = { name: '', email: '' }
  
  } catch (error) {
    console.error('Error adding student:', error)
    alert('שגיאה בהוספת תלמיד. אנא נסה שוב.')
  }
}


const saveClass = async () => {
  if (!classId.value) return

  try {
    const { error } = await supabase
      .from('classes')
      .update({
        name: classForm.value.name,
        school_name: classForm.value.school_name
      })
      .eq('id', classId.value)

    if (error) throw error

    await store.loadStudents(classId.value)
    showEditClass.value = false
    showMenu.value = false
  } catch (error) {
    console.error('Error updating class:', error)
    alert('שגיאה בעדכון הכיתה. אנא נסה שוב.')
  }
}

const deleteStudent = async (studentId: number) => {
  if (!confirm('האם אתה בטוח שברצונך למחוק תלמיד זה?')) return

  try {
    // Delete the class_users association first
    const { error: classUserError } = await supabase
      .from('class_users')
      .delete()
      .eq('user_id', studentId)

    if (classUserError) throw classUserError

    // Delete the user_points
    const { error: pointsError } = await supabase
      .from('user_points')
      .delete()
      .eq('user_id', studentId)

    if (pointsError) throw pointsError

    // Delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', studentId)

    if (userError) throw userError

    // Reload students to update the UI
    if (classId.value) {
      await store.loadStudents(classId.value)
    }
    activeStudentMenu.value = null
  } catch (error) {
    console.error('Error deleting student:', error)
    alert('שגיאה במחיקת התלמיד. אנא נסה שוב.')
  }
}

const cancelAddStudent = () => {
  showAddStudent.value = false
  studentForm.value = { name: '', email: '' }
}

const cancelEdit = () => {
  showEditClass.value = false
  showMenu.value = false
  classForm.value.name = store.currentClass.value?.name || ''
  classForm.value.school_name = store.currentClass.value?.school_name || ''
}

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
</style>