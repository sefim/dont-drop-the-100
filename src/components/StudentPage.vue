<template>
  <div v-if="student" class="student-page">
    <div class="header">
      <div class="header-content">
        <button class="nav-button back-button" @click="handleBack">חזור</button>
        <h2 class="student-name">{{ student.name }}</h2>
        <button @click="goToShop" class="nav-button shop-button">מימוש</button>
      </div>
    </div>
    <div class="scores">
      <div class="score-box">
        <p>ציון יומי</p>
        <span class="score-value">{{ student.dailyScore }}</span>
      </div>
      <div class="score-box">
        <p>ציון שבועי</p>
        <span class="score-value">{{ student.weeklyScore }}</span>
      </div>
    </div>

    <div class="categories-tabs">
      <div class="tabs">
        <button 
          v-for="category in store.categories" 
          :key="category.name"
          :class="[
            'tab-button', 
            { 
              'active': activeTab === category.name,
              'negative-tab': category.type === 'negative',
              'positive-tab': category.type === 'positive'
            }
          ]"
          @click="activeTab = category.name"
        >
          {{ category.name }}
        </button>
      </div>

      <div class="tab-content">
        <div 
          v-for="category in store.categories" 
          :key="category.name"
          v-show="activeTab === category.name"
          :class="['category', category.type]"
        >
          <div class="sub-categories">
            <button
              v-for="sub in category.subCategories"
              :key="sub.name"
              @click="handleScoreUpdate(sub.points, category.name, sub.name)"
              class="square-button sub-category"
            >
              {{ sub.name }}
              <span class="points">{{ sub.points > 0 ? '+' : ''}}{{ sub.points }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

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
          <button @click="handleUndo(log)" class="square-button undo-button">בטל</button>
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
const activeTab = ref(store.categories[0].name)

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
    await loadLogs()
  }
}

const handleUndo = async (logEntry: ScoreLog) => {
  if (confirm('האם אתה בטוח שברצונך לבטל פעולה זו?')) {
    const success = await store.undoAction(logEntry, studentId.value)
    if (success) {
      await loadLogs()
    }
  }
}

const goToShop = () => {
  if (studentId.value) {
    router.push(`/shop/${studentId.value}`)
  }
}

const handleBack = async () => {
  await store.loadStudents()
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
  max-width: 1200px;
  margin: 0 auto;
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

.nav-button {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: bold;
  text-align: center;
  line-height: 1.2;
  min-width: 80px;
}

.square-button {
  aspect-ratio: 1;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: bold;
  text-align: center;
  line-height: 1.2;
}

.back-button, .shop-button {
  background-color: #42b883;
  color: white;
  border: none;
  height: 40px;
}

.back-button:hover, .shop-button:hover {
  background-color: #3aa876;
  transform: scale(1.05);
}

.scores {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.score-box {
  background: white;
  border: 2px solid #42b883;
  border-radius: 8px;
  padding: 12px;
  min-width: 100px;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-value {
  font-size: 1.8em;
  font-weight: bold;
  color: #42b883;
}

.categories-tabs {
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.tabs {
  display: flex;
  gap: 2px;
  background: #f0f0f0;
  padding: 4px;
  border-radius: 8px 8px 0 0;
}

.tab-button {
  flex: 1;
  padding: 12px;
  border: none;
  background: white;
  color: #666;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
}

.tab-button.active {
  background: #42b883;
  color: white;
}

.tab-button.negative-tab {
  color: #e53935;
}

.tab-button.negative-tab.active {
  background: #e53935;
  color: white;
}

.tab-button.positive-tab {
  color: #42b883;
}

.tab-button.positive-tab.active {
  background: #42b883;
  color: white;
}

.tab-button:hover:not(.active) {
  background: #e8e8e8;
}

.tab-content {
  padding: 20px;
}

.category {
  padding: 16px;
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
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}

.sub-category {
  background-color: white;
  border: 2px solid currentColor;
  min-height: 90px;
  font-size: 0.85em;
  flex-direction: column;
}

.sub-category:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.points {
  font-size: 1.1em;
  margin-top: 6px;
  font-weight: bold;
}

.category.negative .sub-category {
  color: #e53935;
}

.category.positive .sub-category {
  color: #42b883;
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
  display: grid;
  gap: 10px;
}

.log-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  background: #ff4444;
  color: white;
  border: none;
  min-width: 40px;
  min-height: 40px;
  font-size: 0.85em;
}

.undo-button:hover {
  background: #cc0000;
}
</style>