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
        <h3>{{ student.name }}</h3>
        <p>ציון יומי: {{ student.dailyScore }}</p>
        <p>ציון שבועי: {{ student.weeklyScore }}</p>
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

// Load students when component mounts
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
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.student-button:hover {
  background: #f0f0f0;
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
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.reset-button {
  background: #e53935;
}

.reset-button:hover {
  background: #d32f2f;
}
</style>