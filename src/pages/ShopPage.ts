import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import type { ShopPageState } from '../types'
import { useStudentsStore } from '../store/studentsStore'

const studentsStore = useStudentsStore()
export function useShopPage() {
  const store = useStore()
  const route = useRoute()
  const router = useRouter()
  const state = ref<ShopPageState>({
    student: null
  })

  const studentId = computed(() => parseInt(route.params.id as string, 10))
  const classId = computed(() => parseInt(route.params.class_id as string, 10))

  const student = computed(() => {
    if (!studentId.value || !studentsStore.students) return null
    return studentsStore.students[studentId.value]
  })

  const purchaseItem = async (item: { name: string, cost: number }) => {
    if (student.value) {
      await store.purchaseItem(studentId.value, classId.value, item)
    }
  }

  const handleBack = async () => {
    await studentsStore.loadStudents(classId.value)
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