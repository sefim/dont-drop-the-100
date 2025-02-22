import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import { useStore } from '../store'
import type { ClassState } from '../types'

export function useClass() {
  const router = useRouter()
  const store = useStore()
  const state = ref<ClassState>({
    isLoading: true,
    user: null
  })

  const getCurrentDay = () => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת']
    const today = new Date().getDay()
    return days[today]
  }

  const goToStudent = (id: number) => {
    router.push(`/class/${store.currentClass.value?.id}/student/${id}`)
  }

  const goBack = () => {
    router.push('/')
  }

  const handleReset = async (classId: number) => {
    if (confirm('האם אתה בטוח שברצונך לאפס את כל הציונים השבועיים?')) {
      await store.resetWeeklyScores(classId)
    }
  }

  const initializeComponent = async (classId: number) => {
    try {
      state.value.isLoading = true
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (!isNaN(classId)) {
          await store.loadStudents(classId)
        } else {
          console.error('Invalid class ID')
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error initializing component:', error)
      router.push('/')
    } finally {
      state.value.isLoading = false
    }
  }

  return {
    state,
    store,
    getCurrentDay,
    goToStudent,
    goBack,
    handleReset,
    initializeComponent
  }
}