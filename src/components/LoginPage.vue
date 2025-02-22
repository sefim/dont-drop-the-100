<template>
  <!-- Loggin Modal -->
  <div v-if="showConfirmModal" class="login-container">
    <h1>{{ isLogin ? 'התחברות' : 'הרשמה' }}</h1>
    
    <form @submit.prevent="handleSubmit">
      <div v-if="!isLogin" class="form-group">
        <label for="name">שם</label>
        <input 
          id="name"
          v-model="name"
          type="text"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="email">אימייל</label>
        <input 
          id="email"
          v-model="email"
          type="email"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="password">סיסמה</label>
        <input 
          id="password"
          v-model="password"
          type="password"
          required
        />
      </div>
      
      <button type="submit" class="submit-button">
        {{ isLogin ? 'התחבר' : 'הירשם' }}
      </button>
    </form>
    
    <button @click="handleGoogleLogin" class="google-button">
      התחבר עם Google
    </button>
    
    <p class="toggle-text">
      {{ isLogin ? 'אין לך חשבון?' : 'כבר יש לך חשבון?' }}
      <button @click="isLogin = !isLogin" class="toggle-button">
        {{ isLogin ? 'הירשם' : 'התחבר' }}
      </button>
    </p>

    <!-- Success Message -->
    <div v-if="showSuccessMessage" class="success-message">
      <p>ההרשמה בוצעה בהצלחה!</p>
      <p>נשלח אליך מייל אימות לכתובת {{ registeredEmail }}</p>
      <p>לאחר אימות המייל, אנא התחבר למערכת</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import { useStore } from '../store'

const store = useStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const name = ref('')
const isLogin = ref(true)
const showSuccessMessage = ref(false)
const registeredEmail = ref('')
const showConfirmModal = ref(true)
  
const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      
      if (error) throw error
      
      // Check if user is a student
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('email', user?.email)
        .single()
      
      store.userState.value = userData?.role
      console.log(store.userState.value)
      router.go(0)
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          data: {
            name: name.value
          }
        }
      })
      
      if (error) throw error

      registeredEmail.value = email.value
      showSuccessMessage.value = true
      isLogin.value = true
      email.value = ''
      password.value = ''
      name.value = ''
      return
    }
  } catch (error) {
    console.error('Error:', error)
    alert(isLogin.value ? 'שגיאה בהתחברות. אנא נסה שוב.' : 'שגיאה בהרשמה. אנא נסה שוב.')
  }
}

const handleGoogleLogin = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    
    if (error) throw error
  } catch (error) {
    console.error('Google login error:', error)
    alert('שגיאה בהתחברות עם Google. אנא נסה שוב.')
  }
}

</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.submit-button {
  width: 100%;
  padding: 10px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  margin-bottom: 10px;
}

.google-button {
  width: 100%;
  padding: 10px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  margin-bottom: 20px;
}

.toggle-text {
  text-align: center;
}

.toggle-button {
  background: none;
  border: none;
  color: #42b883;
  cursor: pointer;
  padding: 0;
  font-weight: bold;
}

button:hover {
  opacity: 0.9;
}

/* Success Message Styles */
.success-message {
  margin-top: 20px;
  padding: 15px;
  background-color: #e8f5e9;
  border: 1px solid #42b883;
  border-radius: 4px;
  text-align: center;
  color: #2c3e50;
}

.success-message p {
  margin: 5px 0;
}

.success-message p:first-child {
  font-weight: bold;
  color: #42b883;
}
</style>