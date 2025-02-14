import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import type { ShopPageState } from './types'

export function useShopPage() {
  const store = useStore()
  const route = useRoute()
  const router = useRouter()
  const state = ref<ShopPageState>({
    student: null
  })

  const studentId = computed(() => parseInt(route.params.id as string, 10))

  const student = computed(() => {
    if (!studentId.value || !store.students.value) return null
    return store.students.value.find(s => s.id === studentId.value)
  })

  const purchaseItem = async (item: { name: string, cost: number }) => {
    if (student.value) {
      await store.purchaseItem(studentId.value, item)
    }
  }

  const handleBack = async () => {
    await store.loadStudents()
    router.push(`/student/${studentId.value}`)
  }

  return {
    state,
    store,
    student,
    purchaseItem,
    handleBack
  }
}