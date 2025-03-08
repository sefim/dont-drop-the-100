import { defineStore } from 'pinia'
import { supabase } from '../supabaseClient';
import { AuthUser, Class, StudentDictionary, User } from '../types';

export const useStudentsStore = defineStore('studentsStore', {
  state: () => ({
    classes: [] as Class[],
    students: {} as StudentDictionary,
    currentClass : {} as Class,
    currentUser: {} as User,
    currentAuthUser: {} as AuthUser
  }),
  actions: {
    async loadStudents(classId: number) {
        this.loadAuthUser()
        this.loadUser()
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
                role,
                email,
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
                email: student.email,
                role: student.role,
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
      },
      async loadClasses() {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
      
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
          
          if (!userData) return
      
          const { data: classesData } = await supabase
            .from('class_users')
            .select(`
              classes (
                id,
                name,
                school_name,
                points,
                last_day
              )
            `)
            .eq('user_id', userData.id)
            interface ClassUserResponse {
                classes: Class[]
              }
          if (classesData) {
            this.classes = classesData.flatMap((item: ClassUserResponse) => item.classes)
          }
          console.log(`[loadClasses] Found ${this.classes.length} classes`)
        } catch (error) {
          console.error('Error loading classes:', error)
        }
      },
      async loadUser() {      
        // Get student data
        const { data: userData } = await supabase
        .from('users')
        .select(`id, name, role, email, avatar`)
        .eq('email', this.currentAuthUser.email)
        .single()
        
        if (userData) {
          this.currentUser = userData
        } else {
          console.error('Error: userData is null')
        }
      },
      async loadAuthUser() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        if (user) {
          this.currentAuthUser = user
        } else {
          console.error('Error: user is null')
        }
      },
  }
})
