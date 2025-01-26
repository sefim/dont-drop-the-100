<template>
  <div class="student-list">
    <h1>אל תפיל את ה 100 </h1>
    <div class="class-score">
      <h2>ציון שבועי: {{ store.classWeeklyScore }}</h2>
    </div>
    <div class="students">
      <button 
        v-for="student in sortedStudents" 
        :key="student.id"
        @click="goToStudent(student.id)"
        class="student-button"
      >
        <div class="student-avatar">
          <img 
            :src="`https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}&backgroundColor=42b883`" 
            :alt="`Avatar of ${student.name}`"
            class="avatar-image"
          />
        </div>
        <div class="student-info">
          <h3>{{ student.name }}</h3>
          <p>ציון יומי: {{ student.dailyScore }}</p>
          <p>ציון שבועי: {{ student.weeklyScore }}</p>
        </div>
      </button>
    </div>
    <div class="action-buttons">
      <button @click="store.endDay" class="end-day-button">סיום יום</button>
      <button @click="handleReset" class="reset-button">איפוס שבועי</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStore } from '../store'
import { useRouter } from 'vue-router'
import { onMounted, computed } from 'vue'

const store = useStore()
const router = useRouter()

const sortedStudents = computed(() => {
  if (!store.students.value) return []
  return [...store.students.value].sort((a, b) => a.id - b.id)
})

const goToStudent = (id: number) => {
  router.push(`/student/${id}`)
}

const handleReset = async () => {
  if (confirm('האם אתה בטוח שברצונך לאפס את כל הציונים השבועיים?')) {
    await store.resetWeeklyScores()
  }
}

onMounted(() => {
  store.loadStudents()
})
</script>

<style scoped>
.student-list {
  padding: 20px;
  text-align: center;
}

.students {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 20px 0;
}

.student-button {
  padding: 20px;
  border: 2px solid #42b883;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.student-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.2);
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

.end-day-button:hover {
  background: #3aa876;
  transform: translateY(-1px);
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
</style>