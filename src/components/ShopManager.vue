<template>
  <div class="shop-manager">
    <div class="header">
      <button class="back-button" @click="goBack">חזור</button>
      <h2>ניהול חנות</h2>
      <button @click="saveChanges" class="save-button" :disabled="!hasSelectionChanges">
        שמור שינויים
      </button>
    </div>

    <!-- Shop Items Section -->
    <div class="section">
      <div class="section-header">
        <h3>פריטים בחנות</h3>
        <div class="select-all">
          <input 
            type="checkbox" 
            :checked="allSelected"
            :indeterminate="someSelected"
            @change="toggleAll"
            class="item-checkbox"
          />
          <span>בחר הכל</span>
        </div>
        <button @click="showAddItem = true" class="add-button">
          הוסף פריט
        </button>
      </div>

      <div class="items-list">
        <div v-for="item in shopStore.items" :key="item.id" class="item-row">
          <div class="item-content">
            <input 
              type="checkbox" 
              :checked="selectedItems.has(item.id)"
              @change="toggleItem(item.id, ($event.target as HTMLInputElement).checked)"
              class="item-checkbox"
            />
            <span class="item-name">{{ item.name }}</span>
            <span class="item-cost">{{ item.cost }} נקודות</span>
            <button @click="editItem(item)" class="edit-button">ערוך</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Item Modal -->
    <div v-if="showAddItem" class="modal">
      <div class="modal-content">
        <h3>{{ editingItem ? 'ערוך פריט' : 'הוסף פריט חדש' }}</h3>
        <form @submit.prevent="saveItem">
          <div class="form-group">
            <label>שם הפריט</label>
            <input v-model="itemForm.name" required />
          </div>
          <div class="form-group">
            <label>מחיר בנקודות</label>
            <input 
              type="number" 
              v-model="itemForm.cost" 
              required 
              min="1"
              max="1000"
            />
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">שמור</button>
            <button type="button" @click="cancelItem" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShopStore } from '../store/shopStore'
import { supabase } from '../supabaseClient'
import type { ShopItem } from '../store/shopStore'

const route = useRoute()
const router = useRouter()
const shopStore = useShopStore()

const showAddItem = ref(false)
const editingItem = ref<ShopItem | null>(null)
const itemForm = ref({
  name: '',
  cost: 100
})

const classId = ref(parseInt(route.params.class_id as string))
const selectedItems = ref(new Set<number>())
const initialSelectedItems = ref(new Set<number>())

const hasSelectionChanges = computed(() => {
  // Convert sets to arrays for comparison
  const currentSelection = Array.from(selectedItems.value).sort()
  const initialSelection = Array.from(initialSelectedItems.value).sort()

  // Compare lengths first
  if (currentSelection.length !== initialSelection.length) {
    return true
  }

  // Compare each item
  return currentSelection.some((id, index) => id !== initialSelection[index])
})

const allSelected = computed(() => {
  return shopStore.items.length > 0 && shopStore.items.every(item => selectedItems.value.has(item.id))
})

const someSelected = computed(() => {
  return !allSelected.value && shopStore.items.some(item => selectedItems.value.has(item.id))
})

const toggleAll = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  shopStore.items.forEach(item => {
    if (checked) {
      selectedItems.value.add(item.id)
    } else {
      selectedItems.value.delete(item.id)
    }
  })
}

const toggleItem = (itemId: number, selected: boolean) => {
  if (selected) {
    selectedItems.value.add(itemId)
  } else {
    selectedItems.value.delete(itemId)
  }
}

const saveChanges = async () => {
  if (!classId.value) return
  
  try {
    // Delete all existing selections
    const { error: deleteError } = await supabase
      .from('class_shop_items')
      .delete()
      .eq('class_id', classId.value)

    if (deleteError) throw deleteError

    // Insert new selections
    if (selectedItems.value.size > 0) {
      const { error: insertError } = await supabase
        .from('class_shop_items')
        .insert(
          Array.from(selectedItems.value).map(itemId => ({
            class_id: classId.value,
            shop_item_id: itemId
          }))
        )

      if (insertError) throw insertError
    }

    // Update initial selection to match current selection
    initialSelectedItems.value = new Set(selectedItems.value)
    await shopStore.loadItems(classId.value)
  } catch (error) {
    console.error('Error saving changes:', error)
    alert('שגיאה בשמירת השינויים. אנא נסה שוב.')
  }
}

const editItem = (item: ShopItem) => {
  editingItem.value = item
  itemForm.value = {
    name: item.name,
    cost: item.cost
  }
  showAddItem.value = true
}

const saveItem = async () => {
  try {
    if (editingItem.value) {
      const { error } = await supabase
        .from('shop_items')
        .update({
          name: itemForm.value.name,
          cost: itemForm.value.cost
        })
        .eq('id', editingItem.value.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('shop_items')
        .insert({
          name: itemForm.value.name,
          cost: itemForm.value.cost
        })

      if (error) throw error
    }

    await shopStore.loadItems(classId.value)
    cancelItem()
  } catch (error) {
    console.error('Error saving item:', error)
    alert('שגיאה בשמירת הפריט. אנא נסה שוב.')
  }
}

const cancelItem = () => {
  showAddItem.value = false
  editingItem.value = null
  itemForm.value = {
    name: '',
    cost: 100
  }
}

const goBack = () => {
  if (hasSelectionChanges.value) {
    if (confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?')) {
      router.push(`/class/${classId.value}`)
    }
  } else {
    router.push(`/class/${classId.value}`)
  }
}

onMounted(async () => {
  if (classId.value) {
    await shopStore.loadItems(classId.value)
    // Initialize selected items from loaded data
    const selectedIds = shopStore.items
      .filter(item => item.is_selected)
      .map(item => item.id)
    
    selectedItems.value = new Set(selectedIds)
    initialSelectedItems.value = new Set(selectedIds)
  }
})
</script>

<style scoped>
.shop-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.back-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.item-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.item-name {
  flex-grow: 1;
  color: #2c3e50;
  font-weight: 500;
}

.item-cost {
  color: #666;
  font-weight: bold;
  min-width: 100px;
  text-align: left;
}

.edit-button {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.save-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.save-button:disabled {
  background: #a8d5c2;
  cursor: not-allowed;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-button {
  background: #666;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}
</style>