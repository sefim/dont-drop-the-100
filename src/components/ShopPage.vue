<template>
  <div v-if="student" class="shop-page">
    <div class="header">
      <button class="back-button" @click="handleBack">חזור</button>
      <h2>חנות</h2>
    </div>
    <p>נקודות זמינות: {{ student.weeklyPoints }}</p>

    <!-- Purchase History Section -->
    <div class="purchase-history">
      <h3>היסטוריית רכישות אחרונות</h3>
      <div class="history-list">
        <div v-for="purchase in purchases" :key="purchase.id" class="purchase-item">
          <div class="purchase-details">
            <span class="item-name">{{ purchase.subcategory }}</span>
            <span class="item-cost negative">{{ purchase.points }}</span>
          </div>
          <div class="purchase-date">
            {{ formatDate(purchase.created_at) }}
          </div>
        </div>
        <div v-if="purchases.length === 0" class="no-purchases">
          לא נמצאו רכישות קודמות
        </div>
      </div>
    </div>


    <div class="score-logs">
      <h3>היסטוריית רכישות אחרונות</h3>
      
      <div class="log-entries">
        <div v-for="log in purchases" :key="log.id" class="log-entry">
          <div class="log-content">
            
            <div class="log-main">
              <span class="log-category">{{ log.category }}</span>
              <span class="log-subcategory">{{ log.subcategory }}</span>
              <span :class="['log-points', log.points >= 0 ? 'positive' : 'negative']">
                {{ log.points > 0 ? '+' : ''}}{{ log.points }}
              </span>
            </div>
            
            <div class="log-datetime">
              <span class="log-date">{{ formatDate(log.created_at) }}</span>
              <span class="log-time">{{ formatTime(log.created_at) }}</span>
            </div>
          </div>
          
          <button @click="handleUndo(log)" class="square-button undo-button">בטל</button>
        </div>
      </div>
    </div>



    <div class="shop-items">
      <div 
        v-for="item in shopStore.items" 
        :key="item.id"
        class="shop-item"
        @click="purchaseItem(item)"
      >
        <h3>{{ item.name }}</h3>
        <p>מחיר: {{ item.cost }} נקודות</p>
        <div class="purchase-status">
          <span>לחץ לקנייה</span>
          <span v-if="student.weeklyPoints < item.cost" class="negative-warning">
            (יגרום לחוב של {{ student.weeklyPoints - item.cost }} נקודות)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import { useShopStore } from '../store/shopStore'
import { supabase } from '../supabaseClient'
import type { UserLog } from '../types'

const store = useStore()
const shopStore = useShopStore()
const route = useRoute()
const router = useRouter()
const purchases = ref<UserLog[]>([])

const studentId = computed(() => parseInt(route.params.id as string, 10))
const classId = computed(() => parseInt(route.params.classId as string, 10))

const student = computed(() => {
  if (!studentId.value || !store.students.value) return null
  return store.students.value[studentId.value] || null
})
const handleUndo = async (logEntry: UserLog) => {
  if (confirm('האם אתה בטוח שברצונך לבטל פעולה זו?')) {
    const success = await store.undoAction(logEntry, studentId.value)
    if (success) {
      await loadLogs()
    }
  }
}
const formatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadPurchaseHistory = async () => {
  if (!studentId.value) return
 
  const { data, error } = await supabase
    .from('user_logs')
    .select('*')
    .eq('user_id', studentId.value)
    .eq('class_id', classId.value)
    .eq('category', 'רכישה')
    .order('created_at', { ascending: false })
    .gte('created_at', store.getDaysAgo())
    .limit(5)

  if (error) {
    console.error('Error loading purchase history:', error)
    return
  }

  purchases.value = data
}

const purchaseItem = async (item: { name: string, cost: number }) => {
  if (student.value) {
    await store.purchaseItem(
      studentId.value,
      classId.value,
      item,
    )
    await loadPurchaseHistory()
  }
}

const handleBack = async () => {
  await store.loadStudents(classId.value)
  router.push(`/class/${classId.value}/student/${studentId.value}`)
}

onMounted(async () => {
  await Promise.all([
    store.loadStudents(classId.value),
    shopStore.loadItems(),
    loadPurchaseHistory()
  ])
})
</script>

<style scoped>
.shop-page {
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.back-button {
  padding: 8px 16px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #3aa876;
}

/* Purchase History Styles */
.purchase-history {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin: 20px 0;
}

.purchase-history h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.purchase-item {
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.purchase-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.item-name {
  font-weight: bold;
  color: #2c3e50;
}

.item-cost {
  font-weight: bold;
  direction: ltr;
}

.item-cost.negative {
  color: #e53935;
}

.purchase-date {
  font-size: 0.9em;
  color: #666;
}

.no-purchases {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

/* Existing Shop Items Styles */
.shop-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* Changed to 2 columns */
  gap: 20px;
  margin-top: 20px;
}

.shop-item {
  padding: 20px;
  border: 2px solid #42b883;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.shop-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 184, 131, 0.2);
  background: #f8fff8;
}

.purchase-status {
  margin-top: 12px;
  font-size: 0.9em;
  color: #42b883;
  font-weight: bold;
}

.negative-warning {
  display: block;
  color: #e53935;
  font-size: 0.9em;
  margin-top: 4px;
}

h3 {
  color: #2c3e50;
  margin-bottom: 8px;
}

p {
  color: #666;
  margin: 8px 0;
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
  flex-direction: column;
  gap: 4px;
  flex-grow: 1;
}

.log-main {
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
  direction: ltr;
}

.log-points.positive {
  color: #42b883;
}

.log-points.negative {
  color: #e53935;
}

.log-datetime {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.85em;
  color: #666;
}

.log-date {
  color: #666;
}

.log-time {
  color: #999;
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