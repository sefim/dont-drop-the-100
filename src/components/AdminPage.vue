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

    <!-- Students Section -->
    <section class="section">
      <h2>תלמידים</h2>
      <div class="actions">
        <button @click="showAddStudent = true" class="add-button">
          הוסף תלמיד
        </button>
      </div>
      
      <div class="grid">
        <div v-for="student in students" :key="student.user_id" class="card">
          <h3>{{ student.name }}</h3>
          <p>כיתה: {{ getClassName(student.class_id) }}</p>
          <p v-if="student.email">אימייל: {{ student.email }}</p>
          <div class="card-actions">
            <button @click="editStudent(student)" class="edit-button">ערוך</button>
            <button @click="deleteStudent(student.user_id)" class="delete-button">מחק</button>
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
        <div v-for="teacher in teachers" :key="teacher.user_id" class="card">
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
            <button @click="deleteTeacher(teacher.user_id)" class="delete-button">מחק</button>
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

    <!-- Add/Edit Student Modal -->
    <div v-if="showAddStudent || editingStudent" class="modal">
      <div class="modal-content">
        <h2>{{ editingStudent ? 'ערוך תלמיד' : 'הוסף תלמיד' }}</h2>
        <form @submit.prevent="saveStudent">
          <div class="form-group">
            <label>שם תלמיד</label>
            <input v-model="studentForm.name" required />
          </div>
          <div class="form-group">
            <label>אימייל (אופציונלי)</label>
            <input type="email" v-model="studentForm.email" />
          </div>
          <div class="form-group">
            <label>כיתה</label>
            <select v-model="studentForm.class_id" required>
              <option v-for="class_ in classes" :key="class_.id" :value="class_.id">
                {{ class_.name }} - {{ class_.school_name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">שמור</button>
            <button type="button" @click="cancelStudent" class="cancel-button">בטל</button>
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
            <input v-model="teacherForm.school_name" required />
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

interface Student {
  user_id: number
  name: string
  email?: string
  class_id: number
}



// State
const classes = ref<Class[]>([])
const students = ref<Student[]>([])
const teachers = ref<Teacher[]>([])

// Modal states
const showAddClass = ref(false)
const showAddStudent = ref(false)
const showAddTeacher = ref(false)

// Editing states
const editingClass = ref<Class | null>(null)
const editingStudent = ref<Student | null>(null)
const editingTeacher = ref<Teacher | null>(null)

// Form states
const classForm = ref({ name: '', school_name: '' })
const studentForm = ref({ name: '', email: '', class_id: 0 })
const teacherForm = ref({ email: '', school_name: '' })

interface Teacher {
  user_id: number
  name: string
  email: string
  school_name: string
  user_metadata?: {
    picture?: string
  }
}
// Load data
const loadData = async () => {
  // Load classes
  const { data: classesData } = await supabase
    .from('classes')
    .select('*')
  if (classesData) classes.value = classesData

  // Load students
  const { data: studentsData } = await supabase
    .from('users')
    .select('user_id, name, email, class_users!inner(class_id)')
    .eq('user_type', 'student')
  
  if (studentsData) {
    students.value = studentsData.map(student => ({
      user_id: student.user_id,
      name: student.name,
      email: student.email,
      class_id: student.class_users[0].class_id
    }))
  }

  // Load teachers
  const { data: teachersData } = await supabase
    .from('users')
    .select('user_id, name, email')
    .eq('user_type', 'teacher')
    
  if (teachersData) {
    teachers.value = teachersData.map(teacher => ({
      user_id: teacher.user_id,
      name: teacher.name,
      email: '',
      school_name: ''
    }))
  }
}

const getClassName = (classId: number) => {
  const class_ = classes.value.find(c => c.id === classId)
  return class_ ? `${class_.name} - ${class_.school_name}` : 'לא נמצא'
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

// Student operations
const saveStudent = async () => {
  if (editingStudent.value) {
    // Update student name and email
    await supabase
      .from('users')
      .update({ 
        name: studentForm.value.name,
        email: studentForm.value.email || null
      })
      .eq('user_id', editingStudent.value.user_id)

    // Update class assignment
    await supabase
      .from('class_users')
      .update({ class_id: studentForm.value.class_id })
      .eq('user_id', editingStudent.value.user_id)
  } else {
    // Create new student user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        name: studentForm.value.name,
        email: studentForm.value.email || null,
        user_type: 'student'
      }])
      .select()

    if (userError || !userData) {
      console.error('Error creating student:', userError)
      return
    }

    // Assign student to class
    await supabase
      .from('class_users')
      .insert([{
        user_id: userData[0].user_id,
        class_id: studentForm.value.class_id
      }])
  }
  
  await loadData()
  cancelStudent()
}

const editStudent = (student: Student) => {
  editingStudent.value = student
  studentForm.value.name = student.name
  studentForm.value.email = student.email || ''
  studentForm.value.class_id = student.class_id
  showAddStudent.value = true
}

const deleteStudent = async (userId: number) => {
  if (confirm('האם אתה בטוח שברצונך למחוק תלמיד זה?')) {
    await supabase
      .from('users')
      .delete()
      .eq('user_id', userId)
    await loadData()
  }
}

const cancelStudent = () => {
  showAddStudent.value = false
  editingStudent.value = null
  studentForm.value.name = ''
  studentForm.value.email = ''
  studentForm.value.class_id = 0
}

// Teacher operations
const saveTeacher = async () => {
  if (editingTeacher.value) {
    await supabase
      .from('users')
      .update({ school_name: teacherForm.value.school_name })
      .eq('user_id', editingTeacher.value.user_id)
  } else {
    // Create new teacher user
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        email: teacherForm.value.email,
        school_name: teacherForm.value.school_name,
        user_type: 'teacher'
      }])
      .select()

    if (userError || !userData) {
      console.error('Error creating teacher:', userError)
      return
    }
  }
  
  await loadData()
  cancelTeacher()
}

const editTeacher = (teacher: Teacher) => {
  editingTeacher.value = teacher
  teacherForm.value.email = teacher?.email
  teacherForm.value.school_name = teacher?.school_name
  showAddTeacher.value = true
}

const deleteTeacher = async (id: number) => {
  if (confirm('האם אתה בטוח שברצונך למחוק מורה זה?')) {
    await supabase
      .from('users')
      .delete()
      .eq('user_id', id)
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