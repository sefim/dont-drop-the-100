import { ref } from 'vue'
import type { Student, ShopItem, ScoreLog, Category } from '../types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

const log = (action: string, details: any) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${action}:`, details)
}

export const useStore = () => {
  const students = ref<Student[]>([])
  const classWeeklyScore = ref(0)

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
        { name: "אי הגעה", points: -100 },
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
        { name: "הלשנה", points: -3 },
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

  const loadStudents = async () => {
    log('Loading Students', 'Fetching students from database')
    const { data, error } = await supabase
      .from('students')
      .select('*')
    
    if (error) {
      log('Error Loading Students', error)
      console.error('Error loading students:', error)
      return
    }
    
    if (data) {
      students.value = data.map(student => ({
        id: student.id,
        name: student.name,
        dailyScore: student.daily_score,
        weeklyScore: student.weekly_score
      }))
      log('Students Loaded', `Loaded ${data.length} students`)
    }
  }

  const loadClassScore = async () => {
    log('Loading Class Score', 'Fetching class score from database')
    const { data, error } = await supabase
      .from('class_score')
      .select('*')
      .single()
    
    if (error) {
      log('Error Loading Class Score', error)
      console.error('Error loading class score:', error)
      return
    }
    
    if (data) {
      classWeeklyScore.value = data.score
      log('Class Score Loaded', { score: data.score })
    }
  }

  const loadStudentLogs = async (studentId: number) => {
    const { data, error } = await supabase
      .from('score_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error loading student logs:', error)
      return []
    }

    return data || []
  }

  const logScoreChange = async (
    studentId: number,
    points: number,
    category: string,
    subcategory: string
  ) => {
    const log: ScoreLog = {
      student_id: studentId,
      action: points >= 0 ? 'increase' : 'decrease',
      points_change: points,
      timestamp: new Date().toISOString(),
      category,
      subcategory
    }

    const { error } = await supabase.from('score_logs').insert([log])
    if (error) {
      console.error('Error logging score change:', error)
    }
  }

  const updateStudentScore = async (
    studentId: number,
    points: number,
    category: string,
    subcategory: string
  ) => {
    log('Updating Student Score', {
      studentId,
      points,
      category,
      subcategory
    })

    const student = students.value.find(s => s.id === studentId)
    if (student) {
      const oldScore = student.dailyScore
      const newScore = Math.max(0, student.dailyScore + points)
      
      // Update local state
      student.dailyScore = newScore
      
      // Update database
      const { error } = await supabase
        .from('students')
        .update({ daily_score: newScore })
        .eq('id', studentId)
      
      if (error) {
        log('Error Updating Score', error)
        console.error('Error updating student score:', error)
        return
      }
      
      log('Score Updated', {
        student: student.name,
        oldScore,
        newScore,
        change: points
      })

      // Log the change
      await logScoreChange(studentId, points, category, subcategory)
    }
  }

  const endDay = async () => {
    log('Ending Day', 'Processing end of day calculations')
    
    for (const student of students.value) {
      let weeklyScoreIncrease = 0
      
      if (student.dailyScore >= 85) {
        weeklyScoreIncrease = student.dailyScore
        classWeeklyScore.value += 1
      } else if (student.dailyScore >= 70) {
        weeklyScoreIncrease = 50
      }

      const oldWeeklyScore = student.weeklyScore
      const oldDailyScore = student.dailyScore

      // Update local state
      student.weeklyScore += weeklyScoreIncrease
      student.dailyScore = 100

      // Update database
      const { error: studentError } = await supabase
        .from('students')
        .update({
          weekly_score: student.weeklyScore,
          daily_score: 100
        })
        .eq('id', student.id)
      
      if (studentError) {
        log('Error Updating Student End Day', {
          student: student.name,
          error: studentError
        })
        console.error('Error updating student end day:', studentError)
      } else {
        log('Student Day Ended', {
          student: student.name,
          oldDailyScore,
          newDailyScore: 100,
          oldWeeklyScore,
          newWeeklyScore: student.weeklyScore,
          increase: weeklyScoreIncrease
        })
      }
    }

    // Update class score
    const { error: classError } = await supabase
      .from('class_score')
      .update({ score: classWeeklyScore.value })
      .eq('id', 1)
    
    if (classError) {
      log('Error Updating Class Score', classError)
      console.error('Error updating class score:', classError)
    } else {
      log('Class Score Updated', { newScore: classWeeklyScore.value })
    }
  }

  const resetWeeklyScores = async () => {
    // Update database
    const { error } = await supabase
      .from('students')
      .update({ weekly_score: 0 })
      .neq('id', 0)
    
    if (error) {
      console.error('Error resetting weekly scores:', error)
      return
    }

    // Reset class score
    const { error: classError } = await supabase
      .from('class_score')
      .update({ score: 0 })
      .eq('id', 1)
    
    if (classError) {
      console.error('Error resetting class score:', classError)
      return
    }

    // Update local state
    students.value.forEach(student => {
      student.weeklyScore = 0
    })
    classWeeklyScore.value = 0
  }

  const undoAction = async (logEntry: ScoreLog, studentId: number) => {
    const student = students.value.find(s => s.id === studentId)
    if (!student) return false

    // Calculate the reverse points change
    const reversePoints = -logEntry.points_change

    // Update the student's score
    const { error: updateError } = await supabase
      .from('students')
      .update({ daily_score: student.dailyScore + reversePoints })
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
    student.dailyScore += reversePoints

    return true
  }

  const purchaseItem = async (studentId: number, item: ShopItem) => {
    log('Attempting Purchase', {
      studentId,
      item: item.name,
      cost: item.cost
    })

    const student = students.value.find(s => s.id === studentId)
    if (student) {
      const oldScore = student.weeklyScore
      
      // Update local state
      student.weeklyScore -= item.cost
      
      // Update database
      const { error } = await supabase
        .from('students')
        .update({ weekly_score: student.weeklyScore })
        .eq('id', studentId)
      
      if (error) {
        log('Error Processing Purchase', error)
        console.error('Error purchasing item:', error)
        return false
      }

      log('Purchase Successful', {
        student: student.name,
        item: item.name,
        cost: item.cost,
        oldScore,
        newScore: student.weeklyScore
      })

      // Log the purchase
      await logScoreChange(
        studentId,
        -item.cost,
        'Shop',
        `Purchase: ${item.name}`
      )
      
      return true
    }

    log('Purchase Failed', {
      reason: 'Student not found',
      studentId,
      item: item.name
    })
    return false
  }

  // Load class score when store is initialized
  loadClassScore()

  return {
    students,
    classWeeklyScore,
    categories,
    shopItems,
    loadStudents,
    loadStudentLogs,
    updateStudentScore,
    endDay,
    purchaseItem,
    resetWeeklyScores,
    undoAction
  }
}