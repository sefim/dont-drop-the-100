<template>
  <div class="teacher-classes">
    <div class="header">
      <div v-if="studentsStore.currentAuthUser" class="user-info">
        <div class="avatar-menu">
          <img 
            :src="studentsStore.currentAuthUser.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${studentsStore.currentAuthUser.email}`" 
            :alt="studentsStore.currentAuthUser.user_metadata?.full_name || studentsStore.currentAuthUser.email"
            class="user-avatar"
            @click="showMenu = !showMenu"
          />
          <div v-if="showMenu" class="menu">
            <button @click="handleLogout" class="menu-item">
              התנתק
            </button>
          </div>
        </div>
      </div>
      <h1>אל תפיל את ה 100</h1>
    </div>

    <div class="section-header">
      <h2 class="section-title">הכיתות שלי</h2>
      <button @click="showAddClass = true" class="add-button">
        הוסף כיתה
      </button>
    </div>

    <div class="classes-grid">
      <div 
        v-for="class_ in studentsStore.classes" 
        :key="class_.id"
        class="class-card"
      >
        <div class="class-header">
          <h2>{{ class_.name }}</h2>
          <p>{{ class_.school_name }}</p>
        </div>
        <div class="class-points" v-if="classHasPoints(class_.points)">
          <h3>ציון כיתתי: {{ class_.points || 0 }}</h3>
        </div>
        <div class="class-actions">
          <button @click="goToClass(class_.id)" class="action-button view-button">
            כנס לכיתה
          </button>
          <button @click="editClass(class_)" class="action-button edit-button">
             ערוך כיתה 
          </button>
          <button @click="deleteClass(class_.id)" class="action-button delete-button">
           מחק כיתה
          </button>
          <button @click="goToStudents(class_)" class="action-button import-button">
            תלמידים
          </button>
          <button @click="goToCategories(class_.id)" class="action-button sub-edit-button">
              קטגוריות
            </button>
            <button @click="goToShop(class_.id)" class="action-button sub-edit-button">
              מתנות
            </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Class Modal -->
    <div v-if="showAddClass || editingClass" class="modal">
      <div class="modal-content">
        <h2>{{ editingClass ? 'ערוך כיתה' : 'הוסף כיתה חדשה' }}</h2>
        <form @submit.prevent="saveClass">
          <div class="form-group">
            <label>שם כיתה</label>
            <input v-model="classForm.name" required placeholder="הכנס שם כיתה" />
          </div>
          <div class="form-group">
            <label>בית ספר</label>
            <input v-model="classForm.school_name" required placeholder="הכנס שם בית ספר" />
          </div>
          <div  class="form-group">
            <input type="checkbox" v-model="editClassHasPoints"
            class="form-checkbox" />
            <label class="aligned-label">ציון שבועי</label>
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">
              {{ editingClass ? 'שמור שינויים' : 'הוסף כיתה' }}
            </button>
            <button type="button" @click="cancelClassModal" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import { useStudentsStore } from '../store/studentsStore'


interface Class {
  id: number
  name: string
  school_name: string
  points: number | null
}

const studentsStore = useStudentsStore()
const route = useRoute()
const router = useRouter()
const showMenu = ref(false)
const showAddClass = ref(false)
const editingClass = ref<Class | null>(null)
const classForm = ref<{
  name: string,
  school_name: string,
  points: number | null
}>({
  name: '',
  school_name: '',
  points: null
})

const goToCategories = (classId: number) => {
  if (classId) {
    router.push(`/class/${classId}/category`)
  }
}
const goToShop = (classId: number) => {
  if (classId) {
    router.push(`/class/${classId}/shop`)
  }
}

const saveClass = async () => {
  try {
    let points_update = editClassHasPoints.value ? 0 : null
    if (editingClass.value) {
      // Update existing class
      if (editingClass.value.points !== null && editClassHasPoints.value) {
        points_update = editingClass.value.points
      }
      const { error } = await supabase
        .from('classes')
        .update({
          name: classForm.value.name,
          school_name: classForm.value.school_name,
          points: points_update
        })
        .eq('id', editingClass.value.id)

      if (error) throw error
    } else {
      console.log('points_update', points_update, editClassHasPoints.value)
      // Create new class
      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert({
          name: classForm.value.name,
          school_name: classForm.value.school_name,
          points: points_update,
        })
        .select()
        .single()

      if (createError) throw createError

      // Add user to class
      const { error: linkError } = await supabase
        .from('class_users')
        .insert({
          class_id: newClass.id,
          user_id: studentsStore.currentUser.id
        })

      if (linkError) throw linkError
    }

    await studentsStore.loadClasses()
    cancelClassModal()
  } catch (error) {
    console.error('Error saving class:', error)
    alert('שגיאה בשמירת הכיתה. אנא נסה שוב.')
  }
}

const editClass = (class_: Class) => {
  editingClass.value = class_
  classForm.value = {
    name: class_.name,
    school_name: class_.school_name,
    points: class_.points
  }
  showAddClass.value = true
}

const classHasPoints = (points: number | null) => {
  return points !== null
}

const editClassHasPoints = computed({
  get: () => {
    console.log('classForm.value.points', classForm.value.points)
    return classForm.value.points !== null
  },
  set: (_newValue) => {
    if (_newValue) {
      classForm.value.points = editingClass.value?.points || 0
    } else {
      classForm.value.points = null
    }
  },
});

const deleteClass = async (classId: number) => {
  if (confirm('האם אתה בטוח שברצונך למחוק כיתה זו?')) {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)

      if (error) throw error

      await studentsStore.loadClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('שגיאה במחיקת הכיתה. אנא נסה שוב.')
    }
  }
}

const cancelClassModal = () => {
  showAddClass.value = false
  editingClass.value = null
  classForm.value = {
    name: '',
    school_name: '',
    points: editClassHasPoints.value ? 0 : null
  }
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/')
}

const goToClass = (classId: number) => {
  router.push(`/class/${classId}`)
}

const goToStudents = (class_: Class) => {
  router.push(`/class/${class_.id}/students`)
}

const initializeComponent = async () => {
  await studentsStore.loadClasses()
  await studentsStore.loadUser()
  
  // Only redirect if coming from login (not from a class page)
  if (studentsStore.classes.length === 1 && route.meta.from_name !== 'class') {
    router.push(`/class/${studentsStore.classes[0].id}`)
  }
}

onMounted(initializeComponent)
onMounted(studentsStore.loadClasses)
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  color: #2c3e50;
  margin: 0;
  font-size: 1.5em;
}

.add-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.add-button:hover {
  background: #3aa876;
  transform: translateY(-1px);
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
  margin-bottom: 15px;
}

.class-points h3 {
  margin: 0;
  color: #42b883;
  font-size: 1.2em;
}

.class-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.action-button {
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s ease;
}

.view-button {
  background: #28A745;
  color: white;
}

.view-button:hover {
  background: #3aa876;
}

.edit-button {
  background: #FFA500;
  color: white;
}

.edit-button:hover {
  background: #357abd;
}

.delete-button {
  background: #e53935;
  color: white;
}

.delete-button:hover {
  background: #c62828;
}
.sub-edit-button {
  background: #b299b2;
  color: white;
}

.sub-edit-button:hover {
  background: #a74989;
}

.import-button {
  background: #007bff;
  color: white;
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
  display: flex;
  margin-bottom: 20px;
  align-content: center;
}

.form-group label {
  align-content: center;
  display: inline-block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #2c3e50;
  min-width: 70px;
  text-align: right;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
}

.form-checkbox{
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
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

.import-method {
  margin-bottom: 20px;
}

.radio-group {
  display: flex;
  gap: 20px;
  justify-content: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.radio-label:hover {
  background: #eee;
}

.aligned-label {
  display: block;
  text-align: left; /* Adjust alignment as needed */
  margin-bottom: 5px; /* Adjust spacing as needed */
}
</style>