import { defineStore } from 'pinia'
import { supabase } from '../supabaseClient';
import { Class, StudentDictionary } from '../types';

export const useStudentsStore = defineStore('studentsStore', {
  state: () => ({
    currentClass : {} as Class,
    students: {} as StudentDictionary
  }),
  actions: {
    async loadStudents(classId: number) {
        this.loadClass(classId)
        console.log(`[loadStudents] Starting to load students for class ${classId}`)
        
        try {
          const { data: studentsData, error: studentsError } = await supabase
            .from('class_users')
            .select(`
              user_id,
              users!inner (
                id,
                name,
                avatar,
                user_points (
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
          let studentDict: StudentDictionary = {}        
          if (studentsData) {
            studentsData.flatMap((item) => item.users).forEach(student => {
              let points = Array.isArray(student.user_points) ? student.user_points[0] : student.user_points;
              
              studentDict[student.id] = {
                id: student.id,
                name: student.name,
                dailyPoints: points.daily_points ?? 100,
                weeklyPoints: points.weekly_points ?? 0,
                avatar: student.avatar 
              }
            })  
            this.students = studentDict
            console.log('[loadStudents] Successfully loaded all students')
          }
        } catch (error) {
          console.error('[loadStudents] Unexpected error:', error)
        }
      },
        async loadClass(classId: number) {
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
    
        if (classError || !classData) {
          console.error('[loadStudents] Error fetching class:', classError)
          return
        }
    
        this.currentClass = classData
        if (this.currentClass) {
          console.log(`[loadStudents] Found class: ${this.currentClass.name} ${this.currentClass.points}`)
        }
      }
  }
})
