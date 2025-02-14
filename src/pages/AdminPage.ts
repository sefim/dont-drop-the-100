import { ref } from 'vue'
import { supabase } from '../supabaseClient'
import type { AdminPageState, Class, Teacher } from './types'

export function useAdminPage() {
  const state = ref<AdminPageState>({
    classes: [],
    teachers: [],
    showAddClass: false,
    showAddTeacher: false,
    editingClass: null,
    editingTeacher: null,
    classForm: {
      name: '',
      school_name: ''
    },
    teacherForm: {
      email: '',
      name: ''
    }
  })

  const loadData = async () => {
    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
    if (classesData) state.value.classes = classesData

    // Load teachers
    const { data: teachersData } = await supabase
      .from('users')
      .select('*, auth.users!inner(email, raw_user_meta_data)')
      .eq('user_type', 'techer')
    if (teachersData) {
      state.value.teachers = teachersData.map(teacher => ({
        id: teacher.user_id,
        name: teacher.name,
        user_metadata: teacher.users.raw_user_meta_data
      }))
    }
  }

  // Class operations
  const saveClass = async () => {
    if (state.value.editingClass) {
      await supabase
        .from('classes')
        .update({ 
          name: state.value.classForm.name,
          school_name: state.value.classForm.school_name
        })
        .eq('id', state.value.editingClass.id)
    } else {
      await supabase
        .from('classes')
        .insert([{ 
          name: state.value.classForm.name,
          school_name: state.value.classForm.school_name
        }])
    }
    
    await loadData()
    cancelClass()
  }

  const editClass = (class_: Class) => {
    state.value.editingClass = class_
    state.value.classForm.name = class_.name
    state.value.classForm.school_name = class_.school_name
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
    state.value.classForm.school_name = ''
  }

  // Teacher operations
  const saveTeacher = async () => {
    if (state.value.editingTeacher) {
      await supabase
        .from('users')
        .update({ name: state.value.teacherForm.name })
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
    state.value.teacherForm.name = teacher.name
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