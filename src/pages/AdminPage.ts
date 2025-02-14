import { ref } from 'vue'
import { supabase } from '../supabaseClient'
import type { AdminPageState, School, Class, Teacher } from './types'

export function useAdminPage() {
  const state = ref<AdminPageState>({
    schools: [],
    classes: [],
    teachers: [],
    showAddSchool: false,
    showAddClass: false,
    showAddTeacher: false,
    editingSchool: null,
    editingClass: null,
    editingTeacher: null,
    schoolForm: {
      name: ''
    },
    classForm: {
      name: '',
      school_id: 0
    },
    teacherForm: {
      email: '',
      school_id: 0
    }
  })

  const loadData = async () => {
    // Load schools
    const { data: schoolsData } = await supabase
      .from('schools')
      .select('*')
    if (schoolsData) state.value.schools = schoolsData

    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
    if (classesData) state.value.classes = classesData

    // Load teachers
    const { data: teachersData } = await supabase
      .from('teachers')
      .select('*, auth.users!inner(email, raw_user_meta_data)')
    if (teachersData) {
      state.value.teachers = teachersData.map(teacher => ({
        id: teacher.id,
        email: teacher.users.email,
        school_id: teacher.school_id,
        user_metadata: teacher.users.raw_user_meta_data
      }))
    }
  }

  const getSchoolName = (id: number) => {
    return state.value.schools.find(s => s.id === id)?.name || 'לא נמצא'
  }

  // School operations
  const saveSchool = async () => {
    if (state.value.editingSchool) {
      await supabase
        .from('schools')
        .update({ name: state.value.schoolForm.name })
        .eq('id', state.value.editingSchool.id)
    } else {
      await supabase
        .from('schools')
        .insert([{ name: state.value.schoolForm.name }])
    }
    
    await loadData()
    cancelSchool()
  }

  const editSchool = (school: School) => {
    state.value.editingSchool = school
    state.value.schoolForm.name = school.name
    state.value.showAddSchool = true
  }

  const deleteSchool = async (id: number) => {
    if (confirm('האם אתה בטוח שברצונך למחוק בית ספר זה?')) {
      await supabase
        .from('schools')
        .delete()
        .eq('id', id)
      await loadData()
    }
  }

  const cancelSchool = () => {
    state.value.showAddSchool = false
    state.value.editingSchool = null
    state.value.schoolForm.name = ''
  }

  // Class operations
  const saveClass = async () => {
    if (state.value.editingClass) {
      await supabase
        .from('classes')
        .update({ 
          name: state.value.classForm.name,
          school_id: state.value.classForm.school_id
        })
        .eq('id', state.value.editingClass.id)
    } else {
      await supabase
        .from('classes')
        .insert([{ 
          name: state.value.classForm.name,
          school_id: state.value.classForm.school_id
        }])
    }
    
    await loadData()
    cancelClass()
  }

  const editClass = (class_: Class) => {
    state.value.editingClass = class_
    state.value.classForm.name = class_.name
    state.value.classForm.school_id = class_.school_id
    state.value.showAddClass = true
  }

  const deleteClass = async (id: number) => {
    if (confirm('האם אתה בטוח שברצונך למחוק כיתה זו?')) {
      await supabase
        .from('classes')
        .delete()
        .eq('id', id)
      await loadData()
    }
  }

  const cancelClass = () => {
    state.value.showAddClass = false
    state.value.editingClass = null
    state.value.classForm.name = ''
    state.value.classForm.school_id = 0
  }

  // Teacher operations
  const saveTeacher = async () => {
    if (state.value.editingTeacher) {
      await supabase
        .from('teachers')
        .update({ school_id: state.value.teacherForm.school_id })
        .eq('id', state.value.editingTeacher.id)
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: state.value.teacherForm.email,
        email_confirm: true,
        user_metadata: { role: 'teacher' }
      })

      if (authError) {
        alert('שגיאה ביצירת משתמש: ' + authError.message)
        return
      }

      if (authData.user) {
        await supabase
          .from('teachers')
          .update({ school_id: state.value.teacherForm.school_id })
          .eq('id', authData.user.id)
      }
    }
    
    await loadData()
    cancelTeacher()
  }

  const editTeacher = (teacher: Teacher) => {
    state.value.editingTeacher = teacher
    state.value.teacherForm.email = teacher.email
    state.value.teacherForm.school_id = teacher.school_id
    state.value.showAddTeacher = true
  }

  const deleteTeacher = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק מורה זה?')) {
      await supabase.auth.admin.deleteUser(id)
      await loadData()
    }
  }

  const cancelTeacher = () => {
    state.value.showAddTeacher = false
    state.value.editingTeacher = null
    state.value.teacherForm.email = ''
    state.value.teacherForm.school_id = 0
  }

  return {
    state,
    loadData,
    getSchoolName,
    saveSchool,
    editSchool,
    deleteSchool,
    cancelSchool,
    saveClass,
    editClass,
    deleteClass,
    cancelClass,
    saveTeacher,
    editTeacher,
    deleteTeacher,
    cancelTeacher
  }
}