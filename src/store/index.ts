import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { Class, StudentDictionary, Category, UserLog, ShopItem } from '../types'

export const useStore = () => {
  const students = ref<StudentDictionary>({})
  const classPoints = ref(0)
  const currentUser = ref<User | null>(null)
  const currentClass = ref<Class | null>(null)

  const categories: Category[] = [
    {
      name: "הגעה בזמן",
      type: "negative",
      subCategories: [
        { name: "עד 2 דקות", points: -3 },
        { name: "בין 5 ל 10 דקות", points: -5 },
        { name: "מעל 10 דקות", points: -10 },
        { name: "מעל 20 דקות", points: -30 },
      ]
    },
    {
      name: "נוכחות בכיתה",
      type: "negative",
      subCategories: [
        { name: "הישארות בכיתה", points: -3 },
        { name: "ישיבה במקום", points: -3 },
      ]
    },
    {
      name: "התנהגות מכבדת",
      type: "negative",
      subCategories: [
        { name: "הפרעה", points: -5 },
        { name: "התייחסות מכבדת לחבר", points: -3 },
        { name: "התייחסות מכבדת למורה", points: -5 },
        { name: "פגיעה אלימה", points: -5 },
        { name: "פגיעה אלימה בצחוק", points: -3 },
        { name: "התייחסות מכבדת לחבר", points: -3 },
        { name: "הקשבה לצוות", points: -3 },
        { name: "שמירה על רכוש בית ספר", points: -5 },
        { name: "שימוש מהטלפון", points: -4 },
        { name: "כל אלימות מילולית", points: -5 },
        { name: "תלבושת מתאימה", points: -5 },
        { name: "התנהגות חריגה", points: -15 },
      ]
    },
    {
      name: "בונוסים",
      type: "positive",
      subCategories: [
        { name: "עזרה לחבר/צוות", points: 3 },
        { name: "בונוס משימה", points: 3 },
        { name: "בונוס משימה", points: 5 },
        { name: "בונוס לפי שיקול מורה", points: 5 },
        { name: "בונוס לפי שיקול מורה", points: 10 },
        { name: "התארגנות לשיעור", points: 5 },
      ]
    },
  ]

  const shopItems: ShopItem[] = [
    { name: "שטיח2/ ליקריץ ", cost: 85 },
    { name: "סוכרייה על מקל", cost: 100 },
    { name: "שרשרת סוכריות", cost: 100 },
    { name: "שוקולד", cost: 200 },
    { name: "רול אפ עם גלידה", cost: 400 },
    { name: "20 דקות מחשב", cost: 150 },
    { name: "רבע שעה בחוץ בחצר", cost: 150 },
    { name: "רבע שעה טלפון", cost: 150 },
    { name: "חצי שעה טלפון", cost: 300 },
    { name: "טלפון שיעור 45 דק", cost: 450 },
    { name: "צופר הפתעה", cost: 300 },
    { name: "משחק קופסא/סנוקר 20 דקות", cost: 200 },
  ]

  const loadStudents = async (classId?: number) => {
    console.log(`[loadStudents] Starting to load students for class ${classId}`)
    
    try {
      if (!classId || isNaN(classId)) {
        console.error('[loadStudents] Invalid or missing class ID')
        return
      }

      // First, get the class details
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (classError) {
        console.error('[loadStudents] Error fetching class:', classError)
        return
      }

      if (!classData) {
        console.error('[loadStudents] No class found with ID:', classId)
        return
      }

      currentClass.value = classData
      if (currentClass.value) {
        console.log(`[loadStudents] Found class: ${currentClass.value.name} ${currentClass.value.points}`)
      }

      // Then load students with their points
      const { data: studentsData, error: studentsError } = await supabase
        .from('class_users')
        .select(`
          user_id,
          users!inner (
            id,
            name,
            user_points!inner (
              daily_points,
              weekly_points
            )
          )
        `)
        .eq('class_id', classId)
        .eq('users.role', 'student')
      if (studentsError) {
        console.error('[loadStudents] Error fetching students:', studentsError)
        return
      }

      console.log(`[loadStudents] Found ${studentsData?.length || 0} students`)

      if (studentsData) {
        const studentDict: StudentDictionary = {}
        studentsData.flatMap((item) => item.users).forEach(student => {
          studentDict[student.id] = {
            id: student.id,
            name: student.name,
            dailyPoints: student.user_points[0].daily_points ?? 100,
            weeklyPoints: student.user_points[0].weekly_points ?? 0
          }
        })

        students.value = studentDict
        console.log('[loadStudents] Successfully loaded all students')
      }
    } catch (error) {
      console.error('[loadStudents] Unexpected error:', error)
    }
  }

  const undoAction = async (logEntry: UserLog, studentId: number) => {
    const student = students.value[studentId]
    if (!student) return false

    // Calculate the reverse points change
    const reversePoints = -logEntry.points

    // Update the student's score
    const { error: updateError } = await supabase
      .from('students')
      .update({ daily_score: student.dailyPoints + reversePoints })
      .eq('id', studentId)

    if (updateError) {
      console.error('Error undoing action:', updateError)
      return false
    }

    // Delete the log entry
    const { error: deleteError } = await supabase
      .from('score_logs')
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

  const updateStudentScore = async (studentId: number, points: number, category: string, subcategory: string) => {
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

      if (updateError) {
        console.error('[updateStudentScore] Error updating points:', updateError)
        return
      }

      // Log the score change
      const { error: logError } = await supabase
        .from('user_logs')
        .insert({
          user_id: studentId,
          points,
          category,
          subcategory,
          created_at: new Date().toISOString()
        })

      if (logError) {
        console.error('[updateStudentScore] Error creating log:', logError)
        return
      }

      // Update local state
      if (students.value[studentId]) {
        students.value[studentId] = {
          ...students.value[studentId],
          dailyPoints: newDailyPoints
        }
      }

      console.log('[updateStudentScore] Successfully updated student score')
    } catch (error) {
      console.error('[updateStudentScore] Unexpected error:', error)
    }
  }

  const endDay = async () => {
    console.log('Ending Day - Processing end of day calculations')
    if (!currentClass.value) return

    try {
      for (const [userId, student] of Object.entries(students.value)) {
        let weeklyScoreIncrease = 0
        
        if (student.dailyPoints && student.dailyPoints >= 85) {
          weeklyScoreIncrease = student.dailyPoints
          if (currentClass.value) {
            currentClass.value.points += 1
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
        students.value[userId as unknown as number] = {
          ...student,
          dailyPoints: 100,
          weeklyPoints: newWeeklyScore
        }
      }

      // Update class's last day
      if (currentClass.value) {
        const { error: classError } = await supabase
          .from('classes')
          .update({
            points: currentClass.value.points,
            last_day: new Date().getDay()
          })
          .eq('id', currentClass.value.id)

        if (classError) {
          console.error('Error updating class:', classError)
        }
      }
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
          .update({ weekly_points: 0 })
          .eq('user_id', user.user_id)

        if (error) {
          console.error(`Error resetting weekly points for user ${user.user_id}:`, error)
        }
      }

      const { error } = await supabase
        .from('classes')
        .update({ points: 0 })
        .eq('id', classId)

      if (error) {
        console.error(`Error resetting points for class ${classId}:`, error)
      }

      // Reload students to refresh the UI
      await loadStudents(classId)
    } catch (error) {
      console.error('Error resetting weekly scores:', error)
    }
  }

  const canEndDay = computed(() => {
    if (!currentClass.value) {
      console.log('[canEndDay] No current class')
      return false
    }

    const today = new Date().getDay()
    console.log('[canEndDay] Current day:', today)
    console.log('[canEndDay] Last day:', currentClass.value.last_day)

    // If last_day is null, allow ending the day
    if (currentClass.value.last_day === null) {
      return true
    }

    // Otherwise, only allow if it's a different day
    return currentClass.value.last_day !== today
  })

  const purchaseItem = async (studentId: number, item: ShopItem) => {
    if (!students.value[studentId]) return

    try {
      const student = students.value[studentId]
      const newWeeklyPoints = student.weeklyPoints - item.cost

      const { error } = await supabase
        .from('user_points')
        .update({ weekly_points: newWeeklyPoints })
        .eq('user_id', studentId)

      if (error) {
        console.error('Error updating points:', error)
        return
      }

      // Update local state
      students.value[studentId] = {
        ...student,
        weeklyPoints: newWeeklyPoints
      }
    } catch (error) {
      console.error('Error purchasing item:', error)
    }
  }

  return {
    students,
    classPoints,
    categories,
    shopItems,
    currentUser,
    currentClass,
    canEndDay,
    loadStudents,
    loadStudentLogs,
    updateStudentScore,
    endDay,
    resetWeeklyScores,
    purchaseItem,
    undoAction
  }
}