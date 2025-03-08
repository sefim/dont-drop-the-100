<template>
  <div class="category-manager">
    <div class="header">
      <h2>ניהול קטגוריות</h2>
      <button 
        :disabled="!isChanged"
        class="save-changes-button"
        @click="saveChanges"
      >שמור</button>
      <button class="back-button" @click="goBack">חזור</button>
    </div>
    
    <!-- Categories List -->
    <div class="categories-list">
      <div v-for="category in categoryStore.categories" :key="category.id" class="category-card">
        <div class="category-header">
          <div class="category-title">
            <input 
              type="checkbox" 
              :checked="category.is_selected"
              @change="toggleCategory(category.id, ($event.target as HTMLInputElement).checked)"
              class="category-checkbox"
            />
            <h3 @click="toggleCollapse(category.id)" class="category-name">
              {{ category.name }}
              <span class="collapse-icon">{{ isCollapsed(category.id) ? '▼' : '▲' }}</span>
            </h3>
            <span :class="['type-badge', category.type]">
              {{ category.type === 'positive' ? 'חיובי' : 'שלילי' }}
            </span>
          </div>
        </div>

        <!-- Subcategories -->
        <div 
          v-show="!isCollapsed(category.id)"
          class="subcategories"
        >
          <!-- Select All Subcategories -->
          <div class="select-all-subcategories">
            <input 
              type="checkbox" 
              :checked="isAllSubcategoriesSelected(category.id)"
              :indeterminate="isSomeSubcategoriesSelected(category.id)"
              @change="toggleAllSubcategories(category.id, ($event.target as HTMLInputElement).checked)"
              class="subcategory-checkbox"
            />
            <span class="select-all-label">בחר הכל</span>
          </div>

          <div 
            v-for="sub in getSubcategories(category.id)" 
            :key="sub.id" 
            class="subcategory-item"
          >
            <div class="subcategory-content">
              <input 
                type="checkbox" 
                :checked="sub.is_selected"
                @change="toggleSubcategory(sub.id, category.id, ($event.target as HTMLInputElement).checked)"
                class="subcategory-checkbox"
              />
              <span class="subcategory-name">{{ sub.name }}</span>
              <span class="points" :class="{ negative: sub.points < 0 }">
                {{ sub.points > 0 ? '+' : ''}}{{ sub.points }}
              </span>
            </div>
          </div>

          <!-- Add Subcategory Button -->
          <button class="add-sub-button" @click="showAddSubcategoryModal(category)">
            הוסף תת-קטגוריה
          </button>
        </div>
      </div>
    </div>

    <!-- Add Category Button -->
    <button class="add-button" @click="showAddCategory = true">
      הוסף קטגוריה חדשה
    </button>

    <!-- Add/Edit Category Modal -->
    <div v-if="showAddCategory" class="modal">
      <div class="modal-content">
        <h3>{{ editingCategory ? 'ערוך קטגוריה' : 'הוסף קטגוריה חדשה' }}</h3>
        <form @submit.prevent="saveCategory">
          <div class="form-group">
            <label>שם הקטגוריה</label>
            <input v-model="categoryForm.name" required />
          </div>
          <div class="form-group">
            <label>סוג</label>
            <select v-model="categoryForm.type" required>
              <option value="positive">חיובי</option>
              <option value="negative">שלילי</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">שמור</button>
            <button type="button" @click="cancelCategory" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add/Edit Subcategory Modal -->
    <div v-if="showAddSubcategory" class="modal">
      <div class="modal-content">
        <h3>{{ editingSubcategory ? 'ערוך תת-קטגוריה' : 'הוסף תת-קטגוריה' }}</h3>
        <form @submit.prevent="saveSubcategory">
          <div class="form-group">
            <label>שם</label>
            <input v-model="subcategoryForm.name" required />
          </div>
          <div class="form-group">
            <label>נקודות</label>
            <input
              type="number" 
              v-model="subcategoryForm.points" 
              required
              :max="selectedCategory?.type === 'positive' ? 100 : 0"
              :min="selectedCategory?.type === 'positive' ? 0 : -100"
            />
          </div>
          <div class="modal-actions">
            <button type="submit" class="save-button">שמור</button>
            <button type="button" @click="cancelSubcategory" class="cancel-button">בטל</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCategoryStore } from '../store/categoryStore'
import type { Category, Subcategory } from '../store/categoryStore'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()

const showAddCategory = ref(false)
const showAddSubcategory = ref(false)
const selectedCategory = ref<Category | null>(null)
const editingCategory = ref<Category | null>(null)
const editingSubcategory = ref<Subcategory | null>(null)
const isChanged = ref(false)
const collapsedCategories = ref<Set<number>>(new Set())

const categoryForm = ref({
  name: '',
  type: 'positive' as 'positive' | 'negative'
})

const subcategoryForm = ref({
  name: '',
  points: 0
})

const classId = ref(parseInt(route.params.class_id as string))

const getSubcategories = (categoryId: number) => {
  return categoryStore.subCategories.filter(s => s.category_id === categoryId)
}

const isAllSubcategoriesSelected = (categoryId: number) => {
  const subs = getSubcategories(categoryId)
  return subs.length > 0 && subs.every(sub => sub.is_selected)
}

const isSomeSubcategoriesSelected = (categoryId: number) => {
  const subs = getSubcategories(categoryId)
  return subs.some(sub => sub.is_selected) && !isAllSubcategoriesSelected(categoryId)
}

const toggleAllSubcategories = (categoryId: number, selected: boolean) => {
  const subs = getSubcategories(categoryId)
  subs.forEach(sub => {
    categoryStore.toggleSubcategorySelection(sub.id, selected, isChanged)
  })
  // Also select/deselect the parent category
  categoryStore.toggleCategorySelection(categoryId, selected, isChanged)
}

const toggleCollapse = (categoryId: number) => {
  if (collapsedCategories.value.has(categoryId)) {
    collapsedCategories.value.delete(categoryId)
  } else {
    collapsedCategories.value.add(categoryId)
  }
}

const isCollapsed = (categoryId: number) => {
  return collapsedCategories.value.has(categoryId)
}

const toggleCategory = (categoryId: number, selected: boolean) => {
  categoryStore.toggleCategorySelection(categoryId, selected, isChanged)
  // Also select/deselect all subcategories
  const subs = getSubcategories(categoryId)
  subs.forEach(sub => {
    categoryStore.toggleSubcategorySelection(sub.id, selected, isChanged)
  })
}

const toggleSubcategory = (subcategoryId: number, categoryId: number, selected: boolean) => {
  categoryStore.toggleSubcategorySelection(subcategoryId, selected, isChanged)
  
  // Check if we need to update the parent category's selection
  const category = categoryStore.categories.find(c => c.id === categoryId)
  if (category) {
    const subs = getSubcategories(categoryId)
    const noneSelected = subs.every(sub => !sub.is_selected)
    
    if (selected && !category.is_selected) {
      // If selecting a subcategory and parent isn't selected, select it
      categoryStore.toggleCategorySelection(categoryId, true, isChanged)
    } else if (!selected && category.is_selected && noneSelected) {
      // If deselecting a subcategory and all are now deselected, deselect parent
      categoryStore.toggleCategorySelection(categoryId, false, isChanged)
    }
  }
}

const saveChanges = async () => {
  if (!classId.value) return
  
  try {
    await categoryStore.saveChanges(classId.value)
    isChanged.value = false
  } catch (error) {
    console.error('Error saving changes:', error)
    alert('שגיאה בשמירת השינויים. אנא נסה שוב.')
  }
}

const showAddSubcategoryModal = (category: Category) => {
  selectedCategory.value = category
  editingSubcategory.value = null
  subcategoryForm.value = {
    name: '',
    points: category.type === 'positive' ? 5 : -5
  }
  showAddSubcategory.value = true
}

const saveCategory = async () => {
  try {
    if (editingCategory.value) {
      await categoryStore.updateCategory(classId.value,  editingCategory.value.id, {
        name: categoryForm.value.name,
        type: categoryForm.value.type
      })
    } else {
      await categoryStore.addCategory(classId.value, {
        name: categoryForm.value.name,
        type: categoryForm.value.type
      })
    }
    cancelCategory()
  } catch (error) {
    console.error('Error saving category:', error)
    alert('שגיאה בשמירת הקטגוריה. אנא נסה שוב.')
  }
}

const saveSubcategory = async () => {
  try {
    if (editingSubcategory.value) {
      await categoryStore.updateSubcategory(classId.value, editingSubcategory.value.id, {
        name: subcategoryForm.value.name,
        points: subcategoryForm.value.points
      })
    } else if (selectedCategory.value) {
      await categoryStore.addSubcategory(classId.value, {
        category_id: selectedCategory.value.id,
        name: subcategoryForm.value.name,
        points: subcategoryForm.value.points
      })
    }
    cancelSubcategory()
    router.push(`/`)
  } catch (error) {
    console.error('Error saving subcategory:', error)
    alert('שגיאה בשמירת תת-הקטגוריה. אנא נסה שוב.')
  }
}

const cancelCategory = () => {
  showAddCategory.value = false
  editingCategory.value = null
  categoryForm.value = {
    name: '',
    type: 'positive'
  }
}

const cancelSubcategory = () => {
  showAddSubcategory.value = false
  editingSubcategory.value = null
  selectedCategory.value = null
  subcategoryForm.value = {
    name: '',
    points: 0
  }
}

const goBack = () => {
  if (isChanged.value) {
    if (confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?')) {
      router.push(`/`)
    }
  } else {
    router.push(`/`)
  }
}

onMounted(async () => {
  if (classId.value) {
    await categoryStore.loadCategories(classId.value)
  }
})
</script>

<style scoped>
.category-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between; ;
  align-items: center;
  margin-bottom: 10px;
}

.back-button {
  background: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.save-changes-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}
.save-changes-button:disabled {
  background: #a8d5c2;
  cursor: not-allowed;
}
.add-button {
  margin: 20px 0;
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
}

.categories-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.category-card {
  background: white;
  border-radius: 8px;
  
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.category-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.category-checkbox,
.subcategory-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  align-self: center;
}

.category-name {
  text-align: right;
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  margin: 0;
}

.collapse-icon {
  font-size: 0.8em;
  color: #666;
  transition: transform 0.3s ease;
}

.type-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.type-badge.positive {
  background: #e8f5e9;
  color: #2e7d32;
}

.type-badge.negative {
  background: #ffebee;
  color: #c62828;
}

.subcategories {
  margin: 15px 0;
  transition: all 0.3s ease;
}

.select-all-subcategories {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 8px;
}

.select-all-label {
  font-weight: bold;
  color: #666;
  
}

.subcategory-name {
  text-align: right;
  flex-grow: 1;
}


 .subcategory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.subcategory-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 5px;
  
}

.points {
  font-weight: bold;
  color: #2e7d32;
  direction: ltr;
}

.points.negative {
  color: #c62828;
}

.category-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-button {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.delete-button {
  background: #e53935;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.add-sub-button {
  width: 100%;
  padding: 8px;
  background: none;
  border: 2px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin: 10px 0;
}

.add-sub-button:hover {
  border-color: #42b883;
  color: #42b883;
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
  max-width: 400px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.save-button, .cancel-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-button {
  background: #42b883;
  color: white;
}

.cancel-button {
  background: #666;
  color: white;
}

button:hover {
  opacity: 0.9;
}
</style>