import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { useCategoryStore } from './categoryStore'
import type { Class, UserLog, ShopItem } from '../types'
import router from '../router'
import { useStudentsStore } from '../store/studentsStore'


export const useStore = () => {
  const classPoints = ref(0)
  const currentUser = ref<User | null>(null)
    const userState = ref('')
  const categoryStore = useCategoryStore()

  const generateRandomSeed = () => {
    // Generate a random string (you can adjust the length)
    const length = 10;
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  
  const undoAction = async (logEntry: UserLog, classId: number, studentId: number) => {
    const studentsStore = useStudentsStore()
    const student = studentsStore.students[studentId]
    if (!student) return false

    // Calculate the reverse points change
    const reversePoints = -logEntry.points

    // Update the student's score
    const { error: updateError } = await supabase
      .from('user_points')
      .update({ daily_points: student.dailyPoints + reversePoints })
      .eq('user_id', studentId)
      .eq('class_id', classId)

    if (updateError) {
      console.error('Error undoing action:', updateError)
      return false
    }

    console.log('Undoing action:', logEntry)
    // Delete the log entry
    const { error: deleteError } = await supabase
      .from('user_logs')
      .delete()
      .eq('id', logEntry.id)

    if (deleteError) {
      console.error('Error deleting log entry:', deleteError)
      return false
    }

    // Update local state
    student.dailyPoints += reversePoints

    return true
  }

  const loadStudentLogs = async (studentId: number): Promise<UserLog[]> => {
    console.log(`[loadStudentLogs] Loading logs for student ${studentId}`)
    
    try {
      const { data, error } = await supabase
        .from('user_logs')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[loadStudentLogs] Error:', error)
        return []
      }

      console.log(`[loadStudentLogs] Found ${data?.length || 0} logs`)
      return data || []
    } catch (error) {
      console.error('[loadStudentLogs] Unexpected error:', error)
      return []
    }
  }

  const updateStudentScore = async (studentId: number, classId: number, points: number, category: string, subcategory: string) => {
    console.log(`[updateStudentScore] Updating score for student ${studentId}`)
    try {
      // First, ensure user_points record exists
      const { data: currentPoints, error: pointsError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', studentId)
        .single()

      let dailyPoints = 100

      // If no record exists, create one with default values
      if ((pointsError && pointsError.code === '406') || !currentPoints || currentPoints.length === 0) {
        const { error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: studentId,
            class_id: classId,
            daily_points: 100,
            weekly_points: 0,
            last_update: new Date().toISOString()
          })

        if (insertError) {
          console.error('[updateStudentScore] Error creating user points:', insertError)
          return
        }
      } else {
        dailyPoints = currentPoints.daily_points
      }

      // Calculate new points
      const newDailyPoints = dailyPoints + points

      // Update points
      const { error: updateError } = await supabase
        .from('user_points')
        .update({
          daily_points: newDailyPoints,
          last_update: new Date().toISOString()
        })
        .eq('user_id', studentId)
        .eq('class_id', classId)

      if (updateError) {
        console.error('[updateStudentScore] Error updating points:', updateError)
        return
      }

      // Log the score change
      const { error: logError } = await supabase
        .from('user_logs')
        .insert({
          user_id: studentId,
          class_id: classId,
          points,
          category,
          subcategory,
          created_at: new Date().toISOString()
        })

      if (logError) {
        console.error('[updateStudentScore] Error creating log:', logError)
        return
      }
      const studentsStore = useStudentsStore()
      // Update local state
      if (studentsStore.students[studentId]) {
        studentsStore.students[studentId] = {
          ...studentsStore.students[studentId],
          dailyPoints: newDailyPoints
        }
      }

      console.log('[updateStudentScore] Successfully updated student score')
    } catch (error) {
      console.error('[updateStudentScore] Unexpected error:', error)
    }
  }

  const endDay = async () => {
    const studentsStore = useStudentsStore()
    console.log('Ending Day - Processing end of day calculations')
    if (!studentsStore.currentClass) return

    // check if already last day was updated
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', studentsStore.currentClass.id)
      .single()

    if (classError || !classData) {
      console.error('[endDay] Error fetching class:', classError)
      return
    }

    studentsStore.currentClass = classData
    if (canEndDay.value === false) {
      console.log('Already updated last day')
      alert('היום כבר נסגר')
      router.go(0)
      return
    }
    
    
    try {
      for (const [userId, student] of Object.entries(studentsStore.students)) {
        let weeklyScoreIncrease = 0
        
        if (student.dailyPoints && student.dailyPoints >= 85) {
          weeklyScoreIncrease = student.dailyPoints
          if (studentsStore.currentClass) {
            studentsStore.currentClass.points += 1
          }
        } else if (student.dailyPoints && student.dailyPoints >= 70) {
          weeklyScoreIncrease = 50
        }

        const newWeeklyScore = (student.weeklyPoints || 0) + weeklyScoreIncrease

        // Update database
        const { error: studentError } = await supabase
          .from('user_points')
          .update({
            weekly_points: newWeeklyScore,
            daily_points: 100
          })
          .eq('user_id', userId)
        
        if (studentError) {
          console.error('Error updating student end day:', studentError)
          continue
        }

        // Update local state
        studentsStore.students[userId as unknown as number] = {
          ...student,
          dailyPoints: 100,
          weeklyPoints: newWeeklyScore
        }
      }

      // Update class's last day
      if (studentsStore.currentClass) {
        const { error: classError } = await supabase
          .from('classes')
          .update({
            points: studentsStore.currentClass.points,
            last_day: new Date().getDay()
          })
          .eq('id', studentsStore.currentClass.id)

        if (classError) {
          console.error('Error updating class:', classError)
        }
      }
      router.go(0)
      console.log('End of day calculations complete')
    } catch (error) {
      console.error('Error in endDay:', error)
    }
  }

  const resetWeeklyScores = async (classId: number) => {
    try {
      if (!classId || isNaN(classId)) {
        console.error('Invalid class ID for reset')
        return
      }

      // Get all students in the class
      const { data: classUsers, error: classUsersError } = await supabase
        .from('class_users')
        .select('user_id')
        .eq('class_id', classId)

      if (classUsersError) {
        console.error('Error fetching class users:', classUsersError)
        return
      }

      // Reset weekly points for all students
      for (const user of classUsers || []) {
        const { error } = await supabase
          .from('user_points')
          .update({ weekly_points: 0, daily_points: 100 })
          .eq('user_id', user.user_id)

        if (error) {
          console.error(`Error resetting weekly points for user ${user.user_id}:`, error)
        }
      }
      const studentsStore = useStudentsStore()
      if (studentsStore.currentClass?.points !== null) {
        const { error } = await supabase
          .from('classes')
          .update({ points: 0 })
          .eq('id', classId)

        if (error) {
          console.error(`Error resetting points for class ${classId}:`, error)
        }
      }
      // Reload students to refresh the UI
      
      await studentsStore.loadStudents(classId)
      alert('השבוע אופס בהצלחה')
    } catch (error) {
      console.error('Error resetting weekly scores:', error)
    }
  }

  const canEndDay = computed(() => {
    const studentsStore = useStudentsStore()
    if (!studentsStore.currentClass) {
      console.log('[canEndDay] No current class')
      return false
    }

    const today = new Date().getDay()
    console.log('[canEndDay] Current day:', today)
    console.log('[canEndDay] Last day:', studentsStore.currentClass.last_day)

    // If last_day is null, allow ending the day
    if (studentsStore.currentClass.last_day === null) {
      return true
    }

    // Otherwise, only allow if it's a different day
    return studentsStore.currentClass.last_day !== today
  })

  const purchaseItem = async (studentId: number, classId: number, item: ShopItem) => {
    const studentsStore = useStudentsStore()
    if (!studentsStore.students[studentId]) return

    try {
      const student = studentsStore.students[studentId]
      const newWeeklyPoints = student.weeklyPoints - item.cost

      const { error } = await supabase
        .from('user_points')
        .update({ weekly_points: newWeeklyPoints })
        .eq('user_id', studentId)
        .eq('class_id', classId)

      if (error) {
        console.error('Error updating points:', error)
        return
      }

      // Log the score change
      const { error: logError } = await supabase
        .from('user_logs')
        .insert({
          user_id: studentId,
          class_id: classId,
          points: -item.cost,
          category: 'חנות',
          subcategory: item.name,
          created_at: new Date().toISOString()
        })
        
      if (logError) {
        console.error('[purchaseItem] Error creating log:', logError)
        return
      }
      // Update local state
      studentsStore.students[studentId] = {
        ...student,
        weeklyPoints: newWeeklyPoints
      }
    } catch (error) {
      console.error('Error purchasing item:', error)
    }
  }

  const getDaysAgo = (days = 7) => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.setDate(today.getDate() - days));
    const isoDateString = sevenDaysAgo.toISOString().split('T')[0];
    return isoDateString
  }
  
 
  return {
    classPoints,
    categories: categoryStore.categories,
    subCategories: categoryStore.subCategories,
    currentUser,
    canEndDay,
    loadStudentLogs,
    updateStudentScore,
    endDay,
    resetWeeklyScores,
    purchaseItem,
    undoAction,
    getDaysAgo,
    userState,
    generateRandomSeed
  }
}