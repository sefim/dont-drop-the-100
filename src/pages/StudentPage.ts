import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from '../store'
import type { StudentPageState } from './types'

export function useStudentPage() {
  const store = useStore()
  const route = useRoute()
  const router = useRouter()
  const state = ref<StudentPageState>({
    activeTab: store.categories[0].name,
    scoreLogs: []
  })

  const studentId = computed(() => parseInt(route.params.id as string, 10))

  const student = computed(() => {
    if (!studentId.value || !store.students.value) return null
    return store.students.value.find(s => s.id === studentId.value)
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