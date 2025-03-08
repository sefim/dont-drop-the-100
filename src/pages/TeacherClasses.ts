import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TeacherClassesState } from '../types'

export function useTeacherClasses() {
  const router = useRouter()
  const state = ref<TeacherClassesState>({
    classes: [],
    user: null,
    isLoading: true
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

  // const loadClassLogs = async (classId: number): Promise<UserLog[]> => {
  //   const { data: logs } = await supabase
  //     .from('user_logs')
  //     .select(`
  //       id,
  //       user_id,
  //       points,
  //       category,
  //       subcategory,
  //       created_at,
  //       users!inner (
  //         name
  //       )
  //     `)
  //     .eq('class_id', classId)
  //     .order('created_at', { ascending: false })
  //     .limit(5)

  //   return logs?.map(log => ({
  //     ...log,
  //     student_name: log.users[0].name
  //   })) || []
  // }

  const goToClass = (classId: number) => {
    router.push(`/class/${classId}`)
  }

  return {
    state,
    formatDate,
    formatTime,
    goToClass
  }
}