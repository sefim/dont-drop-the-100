import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabaseClient'

export interface ShopItem {
  id: number
  name: string
  cost: number
  is_selected?: boolean
}

interface CacheData {
  items: ShopItem[]
  timestamp: number
  classId?: number
}

export const useShopStore = defineStore('shop', () => {
  const itemsRaw = ref<ShopItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Cache management
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  const CACHE_KEY = 'shopCache'

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

  // Computed property for ordered items
  const items = computed(() => {
    return [...itemsRaw.value].sort((a, b) => a.cost - b.cost)
  })

  const loadItems = async (classId?: number) => {
    try {
      loading.value = true
      error.value = null

      // Try to load from cache first
      const cached = loadFromCache(classId)
      if (cached) {
        itemsRaw.value = cached.items
        return
      }

      if (classId) {
        // Load items with selection status
        const { data, error: fetchError } = await supabase
          .rpc('get_shop_items_with_selection', { p_class_id: classId })

        if (fetchError) throw fetchError
        if (data) {
          itemsRaw.value = data
          saveToCache({ items: data, timestamp: Date.now(), classId })
        }
      } else {
        // Load all items without selection status
        const { data, error: fetchError } = await supabase
          .from('shop_items')
          .select('*')
          .order('cost', { ascending: true })

        if (fetchError) throw fetchError
        if (data) {
          itemsRaw.value = data
          saveToCache({ items: data, timestamp: Date.now() })
        }
      }
    } catch (err) {
      console.error('Error loading shop items:', err)
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const toggleItemForClass = async (classId: number, itemId: number, selected: boolean) => {
    try {
      loading.value = true
      error.value = null

      if (selected) {
        // Add item to class
        const { error: err } = await supabase
          .from('class_shop_items')
          .insert({
            class_id: classId,
            shop_item_id: itemId
          })
        if (err) throw err
      } else {
        // Remove item from class
        const { error: err } = await supabase
          .from('class_shop_items')
          .delete()
          .eq('class_id', classId)
          .eq('shop_item_id', itemId)
        if (err) throw err
      }

      // Update local state
      const item = itemsRaw.value.find(i => i.id === itemId)
      if (item) {
        item.is_selected = selected
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    loadItems,
    toggleItemForClass,
    clearCache
  }
})