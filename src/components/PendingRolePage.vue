<template>
  <div class="pending-role-container">
    <h1>ברוכים הבאים!</h1>
    <p class="subtitle">אנא בחר את תפקידך במערכת</p>

    <div class="role-cards">
      <div class="role-card" @click="requestRole('teacher')">
        <h2>מורה</h2>
        <p>אני רוצה ללמד ולנהל כיתות</p>
        <button class="role-button teacher">בחר</button>
      </div>

      <div class="role-card" @click="requestRole('student')">
        <h2>תלמיד</h2>
        <p>אני תלמיד ורוצה להצטרף לכיתה</p>
        <button class="role-button student">בחר</button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal">
      <div class="modal-content">
        <h2>אישור בחירת תפקיד</h2>
        <p>האם אתה בטוח שברצונך להיות {{ selectedRole === 'teacher' ? 'מורה' : 'תלמיד' }}?</p>
        <div class="modal-actions">
          <button @click="confirmRole" class="confirm-button">אשר</button>
          <button @click="showConfirmModal = false" class="cancel-button">בטל</button>
        </div>
      </div>
    </div>

    <!-- Processing Modal -->
    <div v-if="showProcessingModal" class="modal">
      <div class="modal-content">
        <h2>{{ processingMessage }}</h2>
        <p>{{ processingDetails }}</p>
      </div>
    </div>

    <!-- Teacher Details Modal -->
    <div v-if="showTeacherDetailsModal" class="modal">
      <div class="modal-content">
        <h2>פרטי המבקש</h2>
        <form @submit.prevent="submitTeacherRequest">
          <div class="form-group">
            <label>שם</label>
            <input v-model="requestDetails.name" required placeholder="שם" />
          </div>
          <div class="form-group">
            <label>אימייל</label>
            <input v-model="requestDetails.email" required placeholder="אימייל" disabled/>
          </div>
          <div class="form-group">
            <label>שם בית ספר</label>
            <input v-model="requestDetails.schoolName" required placeholder="הכנס שם בית ספר" />
          </div>
          <div class="form-group">
            <label>הערות נוספות</label>
            <textarea 
              v-model="requestDetails.notes" 
              rows="3" 
              placeholder="הוסף מידע נוסף שיעזור לנו לאשר את בקשתך"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button type="submit" class="confirm-button">שלח בקשה</button>
            <button type="button" @click="cancelTeacherDetails" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../supabaseClient'
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'

const showConfirmModal = ref(false)
const showProcessingModal = ref(false)
const showTeacherDetailsModal = ref(false)
const selectedRole = ref<'teacher' | 'student' | null>(null)
const processingMessage = ref('')
const processingDetails = ref('') 
const currentUser = ref(null)
const requestDetails = ref({
  name: '',
  email: '',
  schoolName: '',
  notes: ''
})

const requestRole = async (role: 'teacher' | 'student') => {
  const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('משתמש לא מחובר')
  
  requestDetails.value.email = user.email ?? ''
  console.log(currentUser.value)
  selectedRole.value = role
  showConfirmModal.value = true
}

const sendAdminEmail = async () => {
  try {
    const { error } = await supabase.functions.invoke('send-email-resend', {
      body: {
        userName: requestDetails.value.name, 
        email: requestDetails.value.email, 
        schoolName: requestDetails.value.schoolName, 
        notes: requestDetails.value.notes,
        role: selectedRole.value
      }
    })
    if (error instanceof FunctionsHttpError) {
      const errorMessage = await error.context.json()
      console.log('Function returned an error', errorMessage)
    } else if (error instanceof FunctionsRelayError) {
      console.log('Relay error:', error.message)
    } else if (error instanceof FunctionsFetchError) {
      console.log('Fetch error:', error.message)
    }
    if (error) throw error
  } catch (error) {
    console.error('Error sending admin notification:', error)
    // Continue anyway as this is not critical for the user
  }
}

const submitTeacherRequest = async () => {
  showTeacherDetailsModal.value = false
  showProcessingModal.value = true
  processingMessage.value = 'מעבד את בקשתך...'
  processingDetails.value = 'אנא המתן'

  try {
   
    // Send email to admin
    await sendAdminEmail()

    processingMessage.value = 'בקשתך התקבלה!'
    processingDetails.value = 'בקשתך נשלחה למנהל המערכת. תקבל מייל כאשר בקשתך תאושר.'
  } catch (error) {
    console.error('Error submitting teacher request:', error)
    processingMessage.value = 'שגיאה!'
    processingDetails.value = 'אירעה שגיאה בשליחת הבקשה. אנא נסה שוב.'
  }
}

const confirmRole = async () => {
  if (!selectedRole.value) return

  showConfirmModal.value = false
  showTeacherDetailsModal.value = true
}

const cancelTeacherDetails = () => {
  showTeacherDetailsModal.value = false
  showConfirmModal.value = false
  requestDetails.value = {
    name: '',
    email: '',
    schoolName: '',
    notes: ''
  }
}
</script>

<style scoped>
.pending-role-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;
}

h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  margin-bottom: 40px;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  margin-top: 30px;
}

.role-card {
  background: white;
  border: 2px solid #eee;
  border-radius: 12px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.role-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.role-card h2 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.role-card p {
  color: #666;
  margin-bottom: 20px;
}

.role-button {
  padding: 10px 30px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.3s;
}

.role-button.teacher {
  background: #42b883;
  color: white;
}

.role-button.student {
  background: #4a90e2;
  color: white;
}

.role-button:hover {
  opacity: 0.9;
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
  max-width: 400px;
  text-align: center;
}

.modal-content h2 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.modal-content p {
  color: #666;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
  text-align: right;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-button {
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

button:hover {
  opacity: 0.9;
}
</style>