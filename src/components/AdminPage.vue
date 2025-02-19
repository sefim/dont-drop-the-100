<template>
  <div class="admin-page">
    <h1>ניהול מערכת</h1>
    
    <!-- Users Section -->
    <section class="section">
      <h2>משתמשים</h2>
      <div class="users-grid">
        <div v-for="user in users" :key="user.id" class="user-card">
          <div class="user-info">
            <img 
              :src="user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`" 
              :alt="user.email"
              class="user-avatar"
            />
            <div class="user-details">
              <h3>{{ user.email }}</h3>
              <p>{{ user.user_metadata?.name || 'No name' }}</p>
            </div>
          </div>
          <div class="role-selector">
            <select 
              :value="user.user_metadata?.role || 'student'"
              @change="updateUserRole(user.id, $event.target.value)"
            >
              <option value="student">תלמיד</option>
              <option value="teacher">מורה</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
          <div class="user-status">
            <span :class="['status-badge', user.email_confirmed_at ? 'confirmed' : 'pending']">
              {{ user.email_confirmed_at ? 'מאומת' : 'ממתין לאימות' }}
            </span>
          </div>
        </div>
      </div>
    </section>

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
          
          <!-- Teachers List with Drop Zone -->
          <div 
            class="teachers-list drop-zone"
            @dragover.prevent
            @drop.prevent="handleDrop($event, class_.id, 'teacher')"
          >
            <h4>מורים:</h4>
            <div v-if="classTeachers[class_.id]?.length" class="teacher-chips">
              <div 
                v-for="teacher in classTeachers[class_.id]" 
                :key="teacher.id" 
                class="teacher-chip"
                draggable="true"
                @dragstart="handleDragStart($event, teacher, 'teacher')"
              >
                <img 
                  :src="teacher.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${teacher.email}`" 
                  :alt="teacher.email"
                  class="teacher-avatar"
                />
                <span>{{ teacher.email }}</span>
              </div>
            </div>
            <p v-else class="no-teachers">גרור מורים לכאן</p>
          </div>

          <!-- Students List with Drop Zone -->
          <div 
            class="students-list drop-zone"
            @dragover.prevent
            @drop.prevent="handleDrop($event, class_.id, 'student')"
          >
            <h4>תלמידים:</h4>
            <div v-if="classStudents[class_.id]?.length" class="student-chips">
              <div 
                v-for="student in classStudents[class_.id]" 
                :key="student.user_id" 
                class="student-chip"
                draggable="true"
                @dragstart="handleDragStart($event, student, 'student')"
              >
                <img 
                  :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`"
                  :alt="student.name"
                  class="student-avatar"
                />
                <span>{{ student.name }}</span>
              </div>
            </div>
            <p v-else class="no-students">גרור תלמידים לכאן</p>
          </div>

          <div class="card-actions">
            <button @click="editClass(class_)" class="edit-button">ערוך</button>
            <button @click="deleteClass(class_.id)" class="delete-button">מחק</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Available Teachers Section -->
    <section class="section">
      <h2>מורים זמינים</h2>
      <div class="available-users">
        <div 
          v-for="teacher in unassignedTeachers" 
          :key="teacher.id"
          class="user-chip"
          draggable="true"
          @dragstart="handleDragStart($event, teacher, 'teacher')"
        >
          <img 
            :src="teacher.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${teacher.email}`" 
            :alt="teacher.email"
            class="user-avatar"
          />
          <span>{{ teacher.email }}</span>
        </div>
      </div>
    </section>

    <!-- Available Students Section -->
    <section class="section">
      <h2>תלמידים זמינים</h2>
      <div class="available-users">
        <div 
          v-for="student in unassignedStudents" 
          :key="student.user_id"
          class="user-chip"
          draggable="true"
          @dragstart="handleDragStart($event, student, 'student')"
        >
          <img 
            :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`"
            :alt="student.name"
            class="user-avatar"
          />
          <span>{{ student.name }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../supabaseClient'

interface User {
  id: string
  email: string
  email_confirmed_at: string | null
  user_metadata: {
    name?: string
    picture?: string
    role?: string
  }
}

interface Class {
  id: number
  name: string
  school_name: string
}

interface Student {
  user_id: number
  name: string
  email?: string
  class_id?: number
}

interface Teacher {
  id: string
  email: string
  school_name: string
  user_metadata?: {
    picture?: string
  }
}

interface ClassTeachers {
  [key: number]: Teacher[]
}

interface ClassStudents {
  [key: number]: Student[]
}

// State
const users = ref<User[]>([])
const classes = ref<Class[]>([])
const students = ref<Student[]>([])
const teachers = ref<Teacher[]>([])
const classTeachers = ref<ClassTeachers>({})
const classStudents = ref<ClassStudents>({})

// Modal states
const showAddClass = ref(false)

// Editing states
const editingClass = ref<Class | null>(null)

// Form states
const classForm = ref({ name: '', school_name: '' })

// Computed properties for unassigned users
const unassignedTeachers = computed(() => {
  const assignedTeacherIds = new Set(
    Object.values(classTeachers.value)
      .flat()
      .map(t => t.id)
  )
  return teachers.value.filter(t => !assignedTeacherIds.has(t.id))
})

const unassignedStudents = computed(() => {
  const assignedStudentIds = new Set(
    Object.values(classStudents.value)
      .flat()
      .map(s => s.user_id)
  )
  return students.value.filter(s => !assignedStudentIds.has(s.user_id))
})

// User role management
const updateUserRole = async (userId: string, newRole: string) => {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: newRole }
    })

    if (error) {
      console.error('Error updating user role:', error)
      return
    }

    // Reload users to reflect changes
    await loadUsers()
  } catch (error) {
    console.error('Error updating user role:', error)
  }
}

// Drag and drop handlers
const handleDragStart = (event: DragEvent, item: Teacher | Student, type: 'teacher' | 'student') => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify({ item, type }))
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDrop = async (event: DragEvent, classId: number, expectedType: 'teacher' | 'student') => {
  if (!event.dataTransfer) return

  const data = JSON.parse(event.dataTransfer.getData('text/plain'))
  if (data.type !== expectedType) return

  const item = data.item
  const userId = expectedType === 'teacher' ? item.id : item.user_id

  try {
    // Remove from previous class if exists
    await supabase
      .from('class_users')
      .delete()
      .eq('user_id', userId)

    // Add to new class
    await supabase
      .from('class_users')
      .insert([{
        class_id: classId,
        user_id: userId
      }])

    // Reload data
    await loadData()
  } catch (error) {
    console.error('Error updating class assignment:', error)
  }
}

// Load data
const loadUsers = async () => {
  const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Error loading users:', error)
    return
  }

  users.value = authUsers
}

const loadData = async () => {
  // Load users first
  await loadUsers()

  // Load classes
  const { data: classesData } = await supabase
    .from('classes')
    .select('*')
  if (classesData) {
    classes.value = classesData
    // Load teachers and students for each class
    await Promise.all([
      ...classesData.map(loadClassTeachers),
      ...classesData.map(loadClassStudents)
    ])
  }

  // Load all students
  const { data: studentsData } = await supabase
    .from('users')
    .select('user_id, name, email')
    .eq('user_type', 'student')
  
  if (studentsData) {
    students.value = studentsData
  }

  // Load all teachers
  const { data: teachersData } = await supabase
    .from('users')
    .select('*, auth.users!inner(email, raw_user_meta_data)')
    .eq('user_type', 'teacher')
    
  if (teachersData) {
    teachers.value = teachersData.map(teacher => ({
      id: teacher.user_id,
      email: teacher.users.email,
      school_name: teacher.school_name,
      user_metadata: teacher.users.raw_user_meta_data
    }))
  }
}

const loadClassTeachers = async (class_: Class) => {
  const { data: teachersData } = await supabase
    .from('class_users')
    .select(`
      users!inner (
        user_id,
        auth.users!inner (
          email,
          raw_user_meta_data
        )
      )
    `)
    .eq('class_id', class_.id)
    .eq('users.user_type', 'teacher')

  if (teachersData) {
    classTeachers.value[class_.id] = teachersData.map(item => ({
      id: item.users.user_id,
      email: item.users.users.email,
      school_name: class_.school_name,
      user_metadata: item.users.users.raw_user_meta_data
    }))
  }
}

const loadClassStudents = async (class_: Class) => {
  const { data: studentsData } = await supabase
    .from('class_users')
    .select(`
      users!inner (
        user_id,
        name,
        email
      )
    `)
    .eq('class_id', class_.id)
    .eq('users.user_type', 'student')

  if (studentsData) {
    classStudents.value[class_.id] = studentsData.map(item => ({
      user_id: item.users.user_id,
      name: item.users.name,
      email: item.users.email
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

.drop-zone {
  margin-top: 15px;
  padding: 15px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.drop-zone:hover {
  border-color: #42b883;
  background: rgba(66, 184, 131, 0.05);
}

.teachers-list, .students-list {
  margin-top: 15px;
}

.teachers-list h4, .students-list h4 {
  margin: 0 0 10px 0;
  color: #666;
}

.teacher-chips, .student-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.teacher-chip, .student-chip, .user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.9em;
  border: 1px solid #ddd;
  cursor: move;
  transition: all 0.3s ease;
}

.teacher-chip:hover, .student-chip:hover, .user-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.teacher-avatar, .student-avatar, .user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.no-teachers, .no-students {
  color: #666;
  font-style: italic;
  margin: 0;
  text-align: center;
}

.available-users {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
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

/* New styles for users section */
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.user-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.user-info {
  display: flex;
  gap: 15px;
  align-items: center;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #42b883;
}

.user-details {
  flex-grow: 1;
}

.user-details h3 {
  margin: 0;
  font-size: 1.1em;
  color: #2c3e50;
}

.user-details p {
  margin: 5px 0 0 0;
  color: #666;
  font-size: 0.9em;
}

.role-selector select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.user-status {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.status-badge.confirmed {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.pending {
  background: #fff3e0;
  color: #ef6c00;
}
</style>