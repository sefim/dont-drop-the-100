<template>
  <div v-if="student" class="student-page">
    <div class="header">
      <div class="header-content">
        <button class="back-button" @click="handleBack">חזור</button>
        <h2 class="student-name">{{ student.name }}</h2>
        <button @click="goToShop" class="shop-button">מימוש</button>
      </div>
    </div>
    <div class="scores" style="display: flex; gap: 20px; justify-content: center;">
      <p>ציון יומי: {{ student.dailyScore }}</p>
      <p>ציון שבועי: {{ student.weeklyScore }}</p>
    </div>

    <div class="categories">
      <div 
        v-for="category in store.categories" 
        :key="category.name"
        :class="['category', category.type]"
      >
        <h3>{{ category.name }}</h3>
        <div class="sub-categories">
          <button
            v-for="sub in category.subCategories"
            :key="sub.name"
            @click="handleScoreUpdate(sub.points, category.name, sub.name)"
            class="sub-category"
          >
            {{ sub.name }} ({{ sub.points > 0 ? '+' : ''}}{{ sub.points }})
          </button>
        </div>
      </div>
    </div>

    <!-- Score Log List -->
    <div class="score-logs">
      <h3>היסטוריית פעולות</h3>
      <div class="log-entries">
        <div v-for="log in scoreLogs" :key="log.id" class="log-entry">
          <div class="log-content">
            <span class="log-category">{{ log.category }}</span>
            <span class="log-subcategory">{{ log.subcategory }}</span>
            <span :class="['log-points', log.points_change >= 0 ? 'positive' : 'negative']">
              {{ log.points_change > 0 ? '+' : ''}}{{ log.points_change }}
            </span>
            <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString('he-IL') }}</span>
          </div>
          <button @click="handleUndo(log)" class="undo-button">בטל</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStore } from '../store'
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import type { ScoreLog } from '../types'

const store = useStore()
const route = useRoute()
const router = useRouter()
const scoreLogs = ref<ScoreLog[]>([])

const studentId = computed(() => parseInt(route.params.id as string, 10))

const student = computed(() => {
  if (!studentId.value || !store.students.value) return null
  return store.students.value.find(s => s.id === studentId.value)
})

const loadLogs = async () => {
  scoreLogs.value = await store.loadStudentLogs(studentId.value)
}

const handleScoreUpdate = async (points: number, category: string, subcategory: string) => {
  if (studentId.value) {
    await store.updateStudentScore(studentId.value, points, category, subcategory)
    await loadLogs() // Refresh logs after update
  }
}

const handleUndo = async (logEntry: ScoreLog) => {
  if (confirm('האם אתה בטוח שברצונך לבטל פעולה זו?')) {
    const success = await store.undoAction(logEntry, studentId.value)
    if (success) {
      await loadLogs() // Refresh logs after undo
    }
  }
}

const goToShop = () => {
  if (studentId.value) {
    router.push(`/shop/${studentId.value}`)
  }
}

const handleBack = async () => {
  await store.loadStudents() // Refresh data before navigating back
  router.push('/')
}

onMounted(async () => {
  await store.loadStudents()
  await loadLogs()
})
</script>

<style scoped>
.student-page {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.student-name {
  margin: 0;
  flex-grow: 1;
  text-align: center;
}

.back-button, .shop-button {
  padding: 8px 16px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  min-width: 80px;
}

.back-button:hover, .shop-button:hover {
  background-color: #3aa876;
}

.categories {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}

.category {
  padding: 15px;
  border-radius: 8px;
}

.category.negative {
  background: #ffebee;
}

.category.positive {
  background: #e8f5e9;
}

.sub-categories {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.sub-category {
  padding: 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background-color: white;
  transition: all 0.2s ease;
}

.sub-category:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.score-logs {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.score-logs h3 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.log-content {
  display: flex;
  gap: 15px;
  align-items: center;
}

.log-category {
  font-weight: bold;
  color: #2c3e50;
}

.log-subcategory {
  color: #666;
}

.log-points {
  font-weight: bold;
}

.log-points.positive {
  color: #42b883;
}

.log-points.negative {
  color: #e53935;
}

.log-time {
  color: #999;
  font-size: 0.9em;
}

.undo-button {
  padding: 4px 8px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.undo-button:hover {
  background: #cc0000;
}
</style>