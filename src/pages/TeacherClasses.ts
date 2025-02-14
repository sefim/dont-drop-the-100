import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabaseClient'
import type { TeacherClassesState, ClassLog } from './types'

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

  const loadClassLogs = async (classId: number): Promise<ClassLog[]> => {
    const { data: logs } = await supabase
      .from('user_logs')
      .select(`
        id,
        points,
        category,
        subcategory,
        created_at,
        users!inner (
          name
        )
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(5)

    return logs?.map(log => ({
      ...log,
      student_name: log.users.name
    })) || []
  }

  const loadClasses = async () => {
    try {
      state.value.isLoading = true
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      state.value.user = session.user

      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('aut_user_id', session.user.id)
        .single()

      if (!userData) return

      const { data: classesData } = await supabase
        .from('class_users')
        .select(`
          classes (
            id,
            name,
            school_name
          )
        `)
        .eq('user_id', userData.user_id)

      if (classesData) {
        // If there's only one class, navigate directly to it
        if (classesData.length === 1 && classesData[0].classes) {
          router.push(`/class/${classesData[0].classes.id}`)
          return
        }

        // Otherwise, load all classes with their logs
        const classesWithLogs = await Promise.all(
          classesData.map(async (item) => {
            const logs = await loadClassLogs(item.classes.id)
            return {
              ...item.classes,
              logs
            }
          })
        )
        state.value.classes = classesWithLogs
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      state.value.isLoading = false
    }
  }

  const goToClass = (classId: number) => {
    router.push(`/class/${classId}`)
  }

  return {
    state,
    formatDate,
    formatTime,
    loadClasses,
    goToClass
  }
}