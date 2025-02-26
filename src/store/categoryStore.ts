import { defineStore } from 'pinia'
import { ref, computed, Ref } from 'vue'
import { supabase } from '../supabaseClient'

export interface Category {
  id: number
  name: string
  type: 'positive' | 'negative'
  is_selected?: boolean
}

export interface Subcategory {
  id: number
  category_id: number
  name: string
  points: number
  is_selected?: boolean
}

interface CacheData {
  categories: Category[]
  subCategories: Subcategory[]
  timestamp: number
  classId?: number
}

export const useCategoryStore = defineStore('categories', () => {
  const categoriesRaw = ref<Category[]>([])
  const subCategoriesRaw = ref<Subcategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pendingChanges = ref<{
    categories: Map<number, boolean>
    subcategories: Map<number, boolean>
  }>({
    categories: new Map(),
    subcategories: new Map()
  })

  // Computed properties for ordered categories and subcategories
  const categories = computed(() => {
    return [...categoriesRaw.value].sort((a, b) => {
      // Sort by type (negative first, positive last)
      if (a.type === 'negative' && b.type === 'positive') return -1
      if (a.type === 'positive' && b.type === 'negative') return 1
      return 0
    })
  })

  const subCategories = computed(() => {
    return [...subCategoriesRaw.value].sort((a, b) => {
      // Sort by points ascending
      return b.points - a.points
    })
  })

  // Cache management
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  const CACHE_KEY = 'categoryCache'

  const clearCache = () => {
    sessionStorage.removeItem(CACHE_KEY)
  }

  const loadFromCache = (classId?: number): CacheData | null => {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CacheData = JSON.parse(cached)
    const now = Date.now()

    if (now - data.timestamp > CACHE_DURATION) {
      clearCache()
      return null
    }

    if (classId && data.classId !== classId) {
      return null
    }

    return data
  }

  const saveToCache = (data: CacheData) => {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }))
  }

  const loadCategories = async (classId?: number) => {
    try {
      loading.value = true
      error.value = null

      // Reset pending changes
      pendingChanges.value = {
        categories: new Map(),
        subcategories: new Map()
      }

      // Try to load from cache first
      const cached = loadFromCache(classId)
      if (cached) {
        categoriesRaw.value = cached.categories
        subCategoriesRaw.value = cached.subCategories
        return
      }
      console.log('load categories from db')
      if (classId) {
        // Load categories with selection status
        const { data: catsData, error: catsError } = await supabase
          .rpc('get_categories_with_selection', { class_id: classId })

        if (catsError) throw catsError
        if (catsData) {
          categoriesRaw.value = catsData
        }

        // Load subcategories with selection status
        const { data: subsData, error: subsError } = await supabase
          .rpc('get_sub_categories_with_selection', { class_id: classId })

        if (subsError) throw subsError
        if (subsData) {
          subCategoriesRaw.value = subsData
        }

        // Save to cache
        saveToCache({
          categories: categoriesRaw.value,
          subCategories: subCategoriesRaw.value,
          timestamp: Date.now(),
          classId
        })
      } 
    } catch (err) {
      console.error('Error loading categories:', err)
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const addCategory = async (category: Omit<Category, 'id'>) => {
    const { data, error: insertError } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single()

    if (insertError) throw insertError

    categoriesRaw.value.push(data)
    clearCache() // Clear cache when adding a category
    return data
  }

  const updateCategory = async (id: number, updates: Partial<Omit<Category, 'id'>>) => {
    const { data, error: updateError } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const index = categoriesRaw.value.findIndex(c => c.id === id)
    if (index !== -1) {
      categoriesRaw.value[index] = { ...categoriesRaw.value[index], ...data }
    }
    
    clearCache() // Clear cache when updating a category
    return data
  }

  const addSubcategory = async (subcategory: Omit<Subcategory, 'id'>) => {
    const { data, error: insertError } = await supabase
      .from('sub_categories')
      .insert(subcategory)
      .select()
      .single()

    if (insertError) throw insertError

    subCategoriesRaw.value.push(data)
    clearCache() // Clear cache when adding a subcategory
    return data
  }

  const updateSubcategory = async (id: number, updates: Partial<Omit<Subcategory, 'id' | 'category_id'>>) => {
    const { data, error: updateError } = await supabase
      .from('sub_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const index = subCategoriesRaw.value.findIndex(s => s.id === id)
    if (index !== -1) {
      subCategoriesRaw.value[index] = { ...subCategoriesRaw.value[index], ...data }
    }
    
    clearCache() // Clear cache when updating a subcategory
    return data
  }

  const deleteCategory = async (id: number) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    categoriesRaw.value = categoriesRaw.value.filter(c => c.id !== id)
    subCategoriesRaw.value = subCategoriesRaw.value.filter(s => s.category_id !== id)
    clearCache() // Clear cache when deleting a category
  }

  const deleteSubcategory = async (id: number) => {
    const { error } = await supabase
      .from('sub_categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    subCategoriesRaw.value = subCategoriesRaw.value.filter(s => s.id !== id)
    clearCache() // Clear cache when deleting a subcategory
  }

  const toggleCategorySelection = (categoryId: number, selected: boolean, isChanged: Ref<boolean>) => {
    // Update local state
    const category = categoriesRaw.value.find(c => c.id === categoryId)
    if (category) {
      category.is_selected = selected
    }
    // Track change
    if (pendingChanges.value.categories.has(categoryId))
      pendingChanges.value.categories.delete(categoryId)
    else 
      pendingChanges.value.categories.set(categoryId, selected)
    updateChanged(isChanged)
  }

  const toggleSubcategorySelection = (subcategoryId: number, selected: boolean, isChanged: Ref<boolean>) => {
    // Update local state
    const subcategory = subCategoriesRaw.value.find(s => s.id === subcategoryId)
    if (subcategory) {
      subcategory.is_selected = selected
    }
    // Track change
    if (pendingChanges.value.subcategories.has(subcategoryId))
      pendingChanges.value.subcategories.delete(subcategoryId)
    else 
      pendingChanges.value.subcategories.set(subcategoryId, selected)
    updateChanged(isChanged)
  }
  
  const updateChanged = (isChanged: Ref<boolean>) => {
    isChanged.value = pendingChanges.value.categories.size !== 0 || pendingChanges.value.subcategories.size !== 0
  }
  
  const saveChanges = async (classId: number) => {
    try {
      loading.value = true
      error.value = null

      // Process category changes
      for (const [categoryId, selected] of pendingChanges.value.categories) {
        if (selected) {
          await supabase
            .from('class_categories')
            .insert({ class_id: classId, category_id: categoryId })
            .throwOnError()
        } else {
          await supabase
            .from('class_categories')
            .delete()
            .eq('class_id', classId)
            .eq('category_id', categoryId)
            .throwOnError()
        }
      }

      // Process subcategory changes
      for (const [subcategoryId, selected] of pendingChanges.value.subcategories) {
        if (selected) {
          await supabase
            .from('class_sub_categories')
            .insert({ class_id: classId, sub_category_id: subcategoryId })
            .throwOnError()
        } else {
          await supabase
            .from('class_sub_categories')
            .delete()
            .eq('class_id', classId)
            .eq('subcategory_id', subcategoryId)
            .throwOnError()
        }
      }

      // Clear pending changes
      pendingChanges.value = {
        categories: new Map(),
        subcategories: new Map()
      }

      // Clear cache and reload data
      clearCache()
      await loadCategories(classId)
    } catch (err) {
      console.error('Error saving changes:', err)
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    subCategories,
    loading,
    error,
    loadCategories,
    addCategory,
    updateCategory,
    addSubcategory,
    updateSubcategory,
    deleteCategory,
    deleteSubcategory,
    toggleCategorySelection,
    toggleSubcategorySelection,
    saveChanges,
    clearCache
  }
})