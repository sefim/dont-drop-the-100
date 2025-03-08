export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'teacher';
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata: any;

}
export interface Student extends User {
  dailyPoints: number;
  weeklyPoints: number;
  avatar: string;
}

export interface StudentDictionary {
  [key: number]: Student
}

export interface Class {
  id: number;
  name: string;
  school_name: string;
  points: number
  last_day: number
}

export interface Category {
  name: string;
  type: 'positive' | 'negative'
  subCategories: SubCategory[];
}

export interface SubCategory {
  name: string;
  points: number;
}

export interface ShopItem {
  name: string;
  cost: number;
}


export interface UserLog {
  id: number
  points: number
  category: string
  subcategory: string
  created_at: string
  classes: {name: string}
  users: {name: string}
}

export interface ClassWithLogs extends Class{
  logs: UserLog[]
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
  scoreLogs: UserLog[]
}

export interface ShopPageState {
  student: {
    id: number
    name: string
    weeklyScore: number
  } | null
}

export interface AdminPageState {
  classes: Class[]
  showAddClass: boolean
  showAddTeacher: boolean
  editingClass: Class | null
  classForm: {
    name: string
    school_name: string
  }
  teacherForm: {
    email: string
    name: string
  }
}

