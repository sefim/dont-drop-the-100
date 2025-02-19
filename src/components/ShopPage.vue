<template>
  <div v-if="student" class="shop-page">
    <div class="header">
      <button class="back-button" @click="handleBack">חזור</button>
      <h2>חנות</h2>
    </div>
    <p>נקודות זמינות: {{ student.weeklyPoints }}</p>

    <div class="shop-items">
      <div 
        v-for="item in store.shopItems" 
        :key="item.name"
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

import { useStore } from '../store'
import { useRoute, useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'

const store = useStore()
const route = useRoute()
const router = useRouter()

const studentId = computed(() => parseInt(route.params.id as string, 10))
const classId = computed(() => parseInt(route.params.classId as string, 10))

const student = computed(() => {
  if (!studentId.value || !store.students.value) return null
  return store.students.value[studentId.value] || null
})

const purchaseItem = async (item: { name: string, cost: number }) => {
  if (student.value) {
    await store.purchaseItem(studentId.value, item)
  }
}

const handleBack = async () => {
  await store.loadStudents(classId.value) // Refresh data before navigating back
  router.push(`/class/${classId.value}/student/${studentId.value}`)
}

// Load students when component mounts
onMounted(() => {
  store.loadStudents(classId.value)
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
</style>