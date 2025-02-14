import type { User } from '@supabase/supabase-js'

export interface ClassLog {
  id: number
  student_name: string
  category: string
  subcategory: string
  points: number
  created_at: string
}

export interface ClassWithLogs {
  id: number
  name: string
  school_name: string
  points: number
  logs: ClassLog[]
}

export interface TeacherClassesState {
  classes: ClassWithLogs[]
  user: User | null
  isLoading: boolean
}

export interface ClassState {
  isLoading: boolean
  user: User | null
}

export interface StudentPageState {
  activeTab: string
  scoreLogs: ScoreLog[]
}

export interface ScoreLog {
  id: number
  user_id: number
  points: number
  category: string
  subcategory: string
  created_at: string
}

export interface ShopPageState {
  student: {
    id: number
    name: string
    weeklyScore: number
  } | null
}

export interface AdminPageState {
  schools: School[]
  classes: Class[]
  teachers: Teacher[]
  showAddSchool: boolean
  showAddClass: boolean
  showAddTeacher: boolean
  editingSchool: School | null
  editingClass: Class | null
  editingTeacher: Teacher | null
  schoolForm: {
    name: string
  }
  classForm: {
    name: string
    school_id: number
  }
  teacherForm: {
    email: string
    school_id: number
  }
}

export interface School {
  id: number
  name: string
}

export interface Class {
  id: number
  name: string
  school_id: number
}

export interface Teacher {
  id: string
  email: string
  school_id: number
  user_metadata?: {
    picture?: string
  }
}