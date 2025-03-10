<template>
  <div class="student-management">
    <div class="header">
      <button class="back-button" @click="goBack">חזור</button>
      <h2>ניהול תלמידים</h2>
    </div>

    <!-- Add Student Section -->
    <div class="add-student-section">
      <div class="add-options">
        
        <button @click="showImportModal = true" class="import-button">
          ייבא תלמידים
        </button>
      </div>
    </div>

    <!-- Students List -->
    <div class="students-list">
      <div v-for="student in studentsStore.students" :key="student.id" class="student-card">
        <div class="student-info">
          <img 
            :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`"
            :alt="student.name"
            class="student-avatar"
          />
          <div class="student-details">
            <h3>{{ student.name }}</h3>
            <div class="student-scores">
              <span>ציון יומי: {{ student.dailyPoints }}</span>
              <span>ציון שבועי: {{ student.weeklyPoints }}</span>
            </div>
          </div>
        </div>
        <div class="student-actions">
          <button @click="showUpdateScore(student)" class="action-button score-button">
            עדכן ציון
          </button>
          <button @click="editStudent(student)" class="action-button edit-button">
            ערוך
          </button>
          <button @click="deleteStudent(student.id)" class="action-button delete-button">
            מחק
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Student Modal -->
    <div v-if="showAddStudent" class="modal">
      <div class="modal-content">
        <h2>{{ editingStudent ? 'ערוך תלמיד' : 'הוסף תלמיד חדש' }}</h2>
        <form @submit.prevent="saveStudent">
          <div class="form-group">
            <label>שם תלמיד</label>
            <input v-model="studentForm.name" required placeholder="הכנס שם תלמיד" />
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">
              {{ editingStudent ? 'שמור שינויים' : 'הוסף תלמיד' }}
            </button>
            <button type="button" @click="cancelStudent" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Update Score Modal -->
    <div v-if="showScoreModal" class="modal">
      <div class="modal-content">
        <h2>עדכן ציון שבועי</h2>
        <form @submit.prevent="saveScore">
          <div class="form-group">
            <label>ציון שבועי חדש</label>
            <input 
              type="number" 
              v-model="scoreForm.weeklyPoints" 
              required 
              min="0"
              max="1000"
            />
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">שמור</button>
            <button type="button" @click="cancelScore" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Import Students Modal -->
    <div v-if="showImportModal" class="modal">
      <div class="modal-content import-modal">
        <h2>ייבא תלמידים</h2>
        
        <div class="import-method">
          <div class="radio-group">
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="importMethod" 
                value="file"
                name="importMethod"
              />
              העלאת קובץ Excel/CSV
            </label>
            <label class="radio-label">
              <input 
                type="radio" 
                v-model="importMethod" 
                value="manual"
                name="importMethod"
              />
              הזנה ידנית
            </label>
          </div>
        </div>

        <div class="scrollable-content">
          <div class="import-content">
            <!-- File Upload Option -->
            <div v-if="importMethod === 'file'" class="import-option">
              <p>בחר קובץ Excel או CSV</p>
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                @change="handleFileUpload"
                class="file-input"
              />
            </div>

            <!-- Manual Input Option -->
            <div v-if="importMethod === 'manual'" class="import-option">
              <p>הכנס רשימת שמות (שם בכל שורה)</p>
              <textarea 
                v-model="manualStudentList"
                @input="processManualList"
                rows="10"
                placeholder="לדוגמה:&#10;ישראל ישראלי&#10;דוד דוידוב&#10;יעל יעלי"
                class="student-list-input"
              ></textarea>
            </div>
          </div>

          <div class="preview-section" v-if="studentsToImport.length > 0">
            <h3>תצוגה מקדימה</h3>
            <div class="students-preview">
              <div v-for="(student, index) in studentsToImport" :key="index" class="student-preview-item">
                {{ student.name }}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            @click="importStudents" 
            class="save-button"
            :disabled="studentsToImport.length === 0"
          >
            ייבא {{ studentsToImport.length }} תלמידים
          </button>
          <button @click="cancelImport" class="cancel-button">בטל</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useStudentsStore } from '../store/studentsStore'

const studentsStore = useStudentsStore()
interface Student {
  id: number
  name: string
  dailyPoints: number
  weeklyPoints: number
}

interface StudentToImport {
  name: string
}

const route = useRoute()
const router = useRouter()
const showAddStudent = ref(false)
const showScoreModal = ref(false)
const showImportModal = ref(false)
const editingStudent = ref<Student | null>(null)
const selectedStudent = ref<Student | null>(null)

const studentForm = ref({
  name: ''
})

const scoreForm = ref({
  weeklyPoints: 0
})

const importMethod = ref('file')
const manualStudentList = ref('')
const studentsToImport = ref<StudentToImport[]>([])

const classId = ref(parseInt(route.params.class_id as string))

const saveStudent = async () => {
  try {
    if (editingStudent.value) {
      // Update existing student
      const { error } = await supabase
        .from('users')
        .update({ name: studentForm.value.name })
        .eq('id', editingStudent.value.id)

      if (error) throw error
    } else {
      // Create new student
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name: studentForm.value.name,
          role: 'student'
        })
        .select()
        .single()

      if (userError) throw userError

      // Link to class
      const { error: linkError } = await supabase
        .from('class_users')
        .insert({
          class_id: classId.value,
          user_id: userData.id
        })

      if (linkError) throw linkError

      // Initialize points
      const { error: pointsError } = await supabase
        .from('user_points')
        .insert({
          user_id: userData.id,
          class_id: classId.value,
          daily_points: 100,
          weekly_points: 0
        })

      if (pointsError) throw pointsError
    }

    await studentsStore.loadStudents(classId.value)
    cancelStudent()
  } catch (error) {
    console.error('Error saving student:', error)
    alert('שגיאה בשמירת התלמיד. אנא נסה שוב.')
  }
}

const editStudent = (student: Student) => {
  editingStudent.value = student
  studentForm.value.name = student.name
  showAddStudent.value = true
}

const deleteStudent = async (studentId: number) => {
  if (!confirm('האם אתה בטוח שברצונך למחוק תלמיד זה?')) return

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', studentId)

    if (error) throw error

    await studentsStore.loadStudents(classId.value)
  } catch (error) {
    console.error('Error deleting student:', error)
    alert('שגיאה במחיקת התלמיד. אנא נסה שוב.')
  }
}

const showUpdateScore = (student: Student) => {
  selectedStudent.value = student
  scoreForm.value.weeklyPoints = student.weeklyPoints
  showScoreModal.value = true
}

const saveScore = async () => {
  if (!selectedStudent.value) return

  try {
    const { error } = await supabase
      .from('user_points')
      .update({ weekly_points: scoreForm.value.weeklyPoints })
      .eq('user_id', selectedStudent.value.id)
      .eq('class_id', classId.value)

    if (error) throw error

    await studentsStore.loadStudents(classId.value)
    cancelScore()
  } catch (error) {
    console.error('Error updating score:', error)
    alert('שגיאה בעדכון הציון. אנא נסה שוב.')
  }
}

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    if (file.name.endsWith('.csv')) {
      // Handle CSV
      const text = await file.text()
      Papa.parse(text, {
        complete: (results) => {
          studentsToImport.value = results.data
            .filter((row: any) => row[0]?.trim())
            .map((row: any) => ({ name: row[0].trim() }))
        }
      })
    } else {
      // Handle Excel
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      studentsToImport.value = jsonData
        .filter((row: any) => row[0]?.trim())
        .map((row: any) => ({ name: row[0].trim() }))
    }
  } catch (error) {
    console.error('Error parsing file:', error)
    alert('שגיאה בקריאת הקובץ. אנא נסה שוב.')
  }
}

const processManualList = () => {
  if (!manualStudentList.value.trim()) {
    studentsToImport.value = []
    return
  }

  studentsToImport.value = manualStudentList.value
    .split('\n')
    .map(name => name.trim())
    .filter(name => name)
    .map(name => ({ name }))
}

const importStudents = async () => {
  if (!classId.value || studentsToImport.value.length === 0) return

  try {
    for (const student of studentsToImport.value) {
      // Create new user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name: student.name,
          role: 'student'
        })
        .select()
        .single()

      if (userError) throw userError

      // Link user to class
      const { error: linkError } = await supabase
        .from('class_users')
        .insert({
          class_id: classId.value,
          user_id: userData.id
        })

      if (linkError) throw linkError

      // Initialize user points
      const { error: pointsError } = await supabase
        .from('user_points')
        .insert({
          user_id: userData.id,
          class_id: classId.value,
          daily_points: 100,
          weekly_points: 0
        })

      if (pointsError) throw pointsError
    }

    await studentsStore.loadStudents(classId.value)
    alert(`${studentsToImport.value.length} תלמידים נוספו בהצלחה`)
    cancelImport()
  } catch (error) {
    console.error('Error importing students:', error)
    alert('שגיאה בייבוא התלמידים. אנא נסה שוב.')
  }
}

const cancelStudent = () => {
  showAddStudent.value = false
  editingStudent.value = null
  studentForm.value.name = ''
}

const cancelScore = () => {
  showScoreModal.value = false
  selectedStudent.value = null
  scoreForm.value.weeklyPoints = 0
}

const cancelImport = () => {
  showImportModal.value = false
  manualStudentList.value = ''
  studentsToImport.value = []
  importMethod.value = 'file'
}

const goBack = () => {
  router.push(`/`)
}
const initializeComponent = async () => {
  console.log('classId.value', classId.value)
  await Promise.all([
    studentsStore.loadStudents(classId.value)
  ])
}

onMounted(initializeComponent)

</script>

<style scoped>
.student-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.back-button {
  background: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.add-student-section {
  margin-bottom: 20px;
}

.add-options {
  display: flex;
  gap: 10px;
}

.add-button,
.import-button {
  flex: 1;
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.import-button {
  background: #4a90e2;
}

.students-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.student-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.student-info {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.student-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid #42b883;
}

.student-details {
  flex-grow: 1;
}

.student-details h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.student-scores {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #666;
  font-size: 0.9em;
}

.student-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  color: white;
}

.score-button {
  background: #42b883;
}

.edit-button {
  background: #4a90e2;
}

.delete-button {
  background: #e53935;
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
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.import-modal {
  display: flex;
  flex-direction: column;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  margin: 20px -10px 20px 0;
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
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  background: white;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.save-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-button {
  background: #666;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
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

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  margin: 0;
}

.import-content {
  margin-top: 20px;
}

.import-option {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  
}

.import-option p {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 0.9em;
}

.file-input {
  width: 100%;
  padding: 10px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.student-list-input {
  width: 100%;
  min-height: 150px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
}

.preview-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.students-preview {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.student-preview-item {
  padding: 5px;
  border-bottom: 1px solid #eee;
}

.student-preview-item:last-child {
  border-bottom: none;
}

button:hover {
  opacity: 0.9;
}
</style>