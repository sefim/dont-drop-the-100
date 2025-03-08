import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import type { StudentPageState, UserLog } from '../types'
import { useStudentsStore } from '../store/studentsStore'

const studentsStore = useStudentsStore()
export function useStudentPage() {
  const store = useStore()
  const route = useRoute()
  const router = useRouter()
  const state = ref<StudentPageState>({
    activeTab: store.categories[0].name,
    scoreLogs: []
  })

  const classId = computed(() => parseInt(route.params.class_id as string, 10))
  const studentId = computed(() => parseInt(route.params.id as string, 10))

  const student = computed(() => {
    if (!studentId.value || !studentsStore.students) return null
    return studentsStore.students[studentId.value]
  })

  const getHebrewDay = (date: Date) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
    return days[date.getDay()]
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const hebrewDay = getHebrewDay(date)
    const formattedDate = date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return `יום ${hebrewDay}, ${formattedDate}`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const loadLogs = async () => {
    state.value.scoreLogs = await store.loadStudentLogs(studentId.value)
  }

  const handleScoreUpdate = async (points: number, category: string, subcategory: string) => {
    if (studentId.value) {
      await store.updateStudentScore(studentId.value, classId.value, points, category, subcategory)
      await loadLogs()
    }
  }

  const handleUndo = async (logEntry: UserLog) => {
    if (confirm('האם אתה בטוח שברצונך לבטל פעולה זו?')) {
      const success = await store.undoAction(logEntry, classId.value, studentId.value)
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
    await studentsStore.loadStudents(classId.value)
    router.push('/')
  }

  return {
    state,
    store,
    student,
    formatDate,
    formatTime,
    loadLogs,
    handleScoreUpdate,
    handleUndo,
    goToShop,
    handleBack
  }
}