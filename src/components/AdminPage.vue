<template>
  <div class="admin-page">
    <h1>ניהול מערכת</h1>
    
    <!-- Classes Section -->
    <section class="section">
      <h2>כיתות</h2>
      <div class="actions">
        <button @click="showAddClass = true" class="add-button">
          הוסף כיתה
        </button>
      </div>
      
      <div class="grid">
        <div v-for="class_ in classes" :key="class_.id" class="card">
          <h3>{{ class_.name }}</h3>
          <p>בית ספר: {{ class_.school_name }}</p>
          <div class="card-actions">
            <button @click="editClass(class_)" class="edit-button">ערוך</button>
            <button @click="deleteClass(class_.id)" class="delete-button">מחק</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Teachers Section -->
    <section class="section">
      <h2>מורים</h2>
      <div class="actions">
        <button @click="showAddTeacher = true" class="add-button">
          הוסף מורה
        </button>
      </div>
      
      <div class="grid">
        <div v-for="teacher in teachers" :key="teacher.id" class="card">
          <div class="teacher-info">
            <img 
              :src="teacher.user_metadata?.picture || 'https://api.dicebear.com/7.x/initials/svg?seed=' + teacher.email" 
              :alt="teacher.email"
              class="teacher-avatar"
            />
            <div>
              <h3>{{ teacher.email }}</h3>
              <p>בית ספר: {{ teacher.school_name }}</p>
            </div>
          </div>
          <div class="card-actions">
            <button @click="editTeacher(teacher)" class="edit-button">ערוך</button>
            <button @click="deleteTeacher(teacher.id)" class="delete-button">מחק</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Add/Edit Class Modal -->
    <div v-if="showAddClass || editingClass" class="modal">
      <div class="modal-content">
        <h2>{{ editingClass ? 'ערוך כיתה' : 'הוסף כיתה' }}</h2>
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
            <button type="button" @click="cancelClass" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add/Edit Teacher Modal -->
    <div v-if="showAddTeacher || editingTeacher" class="modal">
      <div class="modal-content">
        <h2>{{ editingTeacher ? 'ערוך מורה' : 'הוסף מורה' }}</h2>
        <form @submit.prevent="saveTeacher">
          <div class="form-group">
            <label>אימייל</label>
            <input type="email" v-model="teacherForm.email" required />
          </div>
          <div class="form-group">
            <label>בית ספר</label>
            <select v-model="teacherForm.school_name" required>
              <option v-for="school in schools" :key="school.id" :value="school.id">
                {{ school.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">שמור</button>
            <button type="button" @click="cancelTeacher" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

interface Class {
  id: number
  name: string
  school_name: string
}

interface Teacher {
  id: string
  email: string
  school_name : string
  user_metadata?: {
    picture?: string
  }
}

// State
const classes = ref<Class[]>([])
const teachers = ref<Teacher[]>([])

// Modal states
const showAddClass = ref(false)
const showAddTeacher = ref(false)

// Editing states
const editingClass = ref<Class | null>(null)
const editingTeacher = ref<Teacher | null>(null)

// Form states
const classForm = ref({ name: '', school_name: '' })
const teacherForm = ref({ email: '', school_name: 0 })

// Load data
const loadData = async () => {

  // Load classes
  const { data: classesData } = await supabase
    .from('classes')
    .select('*')
  if (classesData) classes.value = classesData
  console.log('loaded classes ', classes.value.length)
  // Load teachers
  const { data: teachersData } = await supabase
    .from('users')
    .select('*, auth.users!inner(email, raw_user_meta_data)')
    
  if (teachersData) {
    teachers.value = teachersData.map(teacher => ({
      id: teacher.id,
      email: teacher.users.email,
      school_name: teacher.school_name,
      user_metadata: teacher.users.raw_user_meta_data
    }))
  }
}

// Class operations
const saveClass = async () => {
  if (editingClass.value) {
    await supabase
      .from('classes')
      .update({ 
        name: classForm.value.name,
        school_name: classForm.value.school_name
      })
      .eq('id', editingClass.value.id)
  } else {
    await supabase
      .from('classes')
      .insert([{ 
        name: classForm.value.name,
        school_name: classForm.value.school_name
      }])
  }
  
  await loadData()
  cancelClass()
}

const editClass = (class_: Class) => {
  editingClass.value = class_
  classForm.value.name = class_.name
  classForm.value.school_name = class_.school_name
  showAddClass.value = true
}

const deleteClass = async (id: number) => {
  if (confirm('האם אתה בטוח שברצונך למחוק כיתה זו?')) {
    await supabase
      .from('classes')
      .delete()
      .eq('id', id)
    await loadData()
  }
}

const cancelClass = () => {
  showAddClass.value = false
  editingClass.value = null
  classForm.value.name = ''
  classForm.value.school_name = ''
}

// Teacher operations
const saveTeacher = async () => {
  if (editingTeacher.value) {
    await supabase
      .from('users')
      .update({ school_name: teacherForm.value.school_name })
      .eq('user_id', editingTeacher.value.id)
  } else {
    // Create auth user with teacher role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: teacherForm.value.email,
      email_confirm: true,
      user_metadata: { role: 'teacher' }
    })

    if (authError) {
      alert('שגיאה ביצירת משתמש: ' + authError.message)
      return
    }

    if (authData.user) {
      // Update teacher's school
      await supabase
        .from('users')
        .update({ school_name: teacherForm.value.school_name })
        .eq('user_id', authData.user.id)
    }
  }
  
  await loadData()
  cancelTeacher()
}

const editTeacher = (teacher: Teacher) => {
  editingTeacher.value = teacher
  teacherForm.value.email = teacher.email
  teacherForm.value.school_name = teacher.school_name
  showAddTeacher.value = true
}

const deleteTeacher = async (id: string) => {
  if (confirm('האם אתה בטוח שברצונך למחוק מורה זה?')) {
    await supabase.auth.admin.deleteUser(id)
    await loadData()
  }
}

const cancelTeacher = () => {
  showAddTeacher.value = false
  editingTeacher.value = null
  teacherForm.value.email = ''
  teacherForm.value.school_name = ''
}

onMounted(loadData)
</script>

<style scoped>
.admin-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section {
  margin-bottom: 40px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.actions {
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.teacher-info {
  display: flex;
  gap: 15px;
  align-items: center;
}

.teacher-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
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
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Buttons */
.add-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}

.edit-button {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
}

.delete-button {
  background: #e53935;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
}

.save-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}

.cancel-button {
  background: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}

button:hover {
  opacity: 0.9;
}
</style>