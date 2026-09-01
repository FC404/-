<template>
  <section class="material-page-v2">
    <section class="list-data-shell material-data-shell">
    <header class="material-commandbar">
      <div class="material-filter-bar">
        <div class="filter-field select-field">
          <div class="custom-select">
            <button type="button" @click="categoryFilterOpen = !categoryFilterOpen">{{ categoryFilterLabel }}<i></i></button>
            <div v-if="categoryFilterOpen" class="select-menu">
              <button type="button" :class="{ active: !categoryFilter }" @click="chooseCategoryFilter('')">全部分类</button>
              <button v-for="category in materialCategories" :key="category.id" type="button" :class="{ active: categoryFilter === category.name }" @click="chooseCategoryFilter(category.name)">{{ category.name }}</button>
            </div>
          </div>
        </div>
        <button class="ghost-btn category-manage-btn" type="button" @click="openCategoryManager">材料分类</button>
        <button class="ghost-btn toolbar-icon-btn" type="button" title="重置筛选" aria-label="重置筛选" @click="resetMaterialFilters"><el-icon><Refresh /></el-icon></button>
      </div>
      <div class="material-actions">
        <button v-if="!batchSelectionMode" class="danger-outline-btn toolbar-icon-btn" type="button" title="批量删除" aria-label="批量删除" @click="startBatchSelection"><el-icon><Delete /></el-icon></button>
        <template v-else><button class="danger-outline-btn toolbar-icon-btn" type="button" :title="selectedMaterialCodes.length ? '删除已选' : '退出批量选择'" :aria-label="selectedMaterialCodes.length ? '删除已选' : '退出批量选择'" @click="requestBatchDelete"><el-icon><Delete /></el-icon></button></template>
        <button class="primary-btn material-icon-action" type="button" title="新增物料" aria-label="新增物料" @click="openCreateMaterial">
          <el-icon><Plus /></el-icon>
        </button>
      </div>
    </header>

    <section class="material-table-panel">
      <div class="table-wrap material-plan-wrap">
        <table class="material-plan-table" :class="{ 'is-selecting': batchSelectionMode }">
          <thead>
            <tr>
              <th v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="allFilteredMaterialsSelected" aria-label="全选当前筛选结果" @change="toggleAllMaterialSelection" /></th>
              <th>物料</th>
              <th>库位</th>
              <th>现有</th>
              <th>订单占用</th>
              <th>可用</th>
              <th>库存状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pagedMaterials" :key="item.code" class="entity-row" :class="{ selected: isMaterialSelected(item.code) }" @click="selectedMaterial = item">
              <td v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="isMaterialSelected(item.code)" :aria-label="`选择 ${item.name}`" @click.stop="toggleMaterialSelection(item.code)" /></td>
              <td>
                <div class="material-name-cell">
                  <span><el-icon><Box /></el-icon></span>
                  <div><strong>{{ item.name }}</strong><small>{{ item.code }} · {{ item.category }}</small></div>
                </div>
              </td>
              <td>{{ item.location }}</td>
              <td><strong>{{ formatQty(item.onHand) }}</strong> {{ item.unit }}</td>
              <td>{{ formatQty(item.committed) }}</td>
              <td><strong>{{ formatQty(item.available) }}</strong></td>
              <td><span class="tag table-status" :class="tagType(item.status)">{{ item.status }}</span></td>
            </tr>
            <tr v-if="!pagedMaterials.length">
              <td class="empty-row" :colspan="batchSelectionMode ? 7 : 6">没有匹配的物料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-pagination">
        <p>
          显示 {{ visibleStart }}-{{ pageEnd }} 条，共 {{ filteredMaterials.length }} 种物料
        </p>
        <div class="pager">
          <button type="button" :disabled="currentPage === 1" @click="currentPage -= 1">
            上一页
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            type="button"
            :class="{ active: page === currentPage }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage += 1">
            下一页
          </button>
        </div>
      </div>
    </section>
    </section>

    <div v-if="selectedMaterial" class="material-drawer-mask" @click.self="selectedMaterial = null">
      <aside class="material-drawer">
        <header>
          <div>
            <span>{{ selectedMaterial.code }}</span>
            <h2>{{ selectedMaterial.name }}</h2>
          </div>
          <button type="button" title="关闭" @click="selectedMaterial = null">×</button>
        </header>
        <section class="material-drawer-grid">
          <div><span>现有库存</span><strong>{{ formatQty(selectedMaterial.onHand) }} {{ selectedMaterial.unit }}</strong></div>
          <div><span>订单占用</span><strong>{{ formatQty(selectedMaterial.committed) }} {{ selectedMaterial.unit }}</strong></div>
          <div><span>可用库存</span><strong>{{ formatQty(selectedMaterial.available) }} {{ selectedMaterial.unit }}</strong></div>
        </section>
        <section class="material-drawer-section">
          <h3>库存位置</h3>
          <p>{{ selectedMaterial.location }} · 默认供应商 {{ selectedMaterial.supplier }}</p>
        </section>
        <div class="material-drawer-actions">
          <button class="ghost-btn" type="button" @click="openEditMaterial(selectedMaterial)">编辑物料</button>
          <button class="danger-outline-btn" type="button" @click="requestDeleteMaterial(selectedMaterial)">删除物料</button>
        </div>
      </aside>
    </div>

    <div v-if="dialogVisible" class="user-dialog-mask" @click.self="closeDialog">
      <section class="user-dialog customer-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Material Form</p>
            <h3>{{ editingCode ? '编辑物料' : '新增物料' }}</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeDialog">×</button>
        </div>

        <form class="dialog-form order-form" @submit.prevent="saveMaterial">
          <section class="form-section">
            <h4>基础档案</h4>
            <div class="form-grid three">
              <label class="form-control">
                <span>物料名称</span>
                <input v-model.trim="materialForm.name" type="text" placeholder="例如 304 不锈钢铰链" />
              </label>
              <label class="form-control">
                <span>物料编码</span>
                <input v-model.trim="materialForm.code" type="text" placeholder="例如 MAT-HG-304" />
              </label>
              <div class="form-control category-picker">
                <span>分类</span>
                <input v-model.trim="materialForm.category" type="search" placeholder="搜索并选择分类" @focus="categorySuggestionsOpen = true" @input="categorySuggestionsOpen = true" @blur="closeCategorySuggestions" />
                <div v-if="categorySuggestionsOpen" class="category-suggestions">
                  <button v-for="category in matchingFormCategories" :key="category.id" type="button" @mousedown.prevent="chooseFormCategory(category.name)">
                    <span>{{ category.name }}</span><small>{{ categoryMaterialCount(category.name) }} 种物料</small>
                  </button>
                  <p v-if="!matchingFormCategories.length">没有匹配分类，请先到“材料分类”中新增。</p>
                </div>
              </div>
              <label class="form-control">
                <span>单位</span>
                <input v-model.trim="materialForm.unit" type="text" placeholder="件 / 根 / 卷" />
              </label>
              <label class="form-control">
                <span>默认库位</span>
                <input v-model.trim="materialForm.location" type="text" placeholder="例如 A-03-02" />
              </label>
              <label class="form-control">
                <span>默认供应商</span>
                <input v-model.trim="materialForm.supplier" type="text" placeholder="例如 华东五金供应" />
              </label>
            </div>
          </section>

          <section class="form-section">
            <h4>库存参数</h4>
            <div class="form-grid two">
              <label class="form-control">
                <span>现有库存</span>
                <input v-model.number="materialForm.onHand" type="number" min="0" />
              </label>
              <label class="form-control">
                <span>订单占用</span>
                <input v-model.number="materialForm.committed" type="number" min="0" />
              </label>
            </div>
          </section>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <div class="dialog-actions">
            <button
              v-if="editingCode"
              class="danger-outline-btn"
              type="button"
              @click="requestDeleteMaterial(materialList.find((item) => item.code === editingCode))"
            >
              删除物料
            </button>
            <button class="primary-btn" type="submit">{{ editingCode ? '保存修改' : '确认新增' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="categoryDialogVisible" class="user-dialog-mask" @click.self="closeCategoryManager">
      <section class="user-dialog category-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Material Categories</p>
            <h3>材料分类</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeCategoryManager">×</button>
        </div>

        <div class="category-manager-body">
          <label class="category-search-field">
            <el-icon><Search /></el-icon>
            <input v-model.trim="categoryKeyword" type="search" placeholder="搜索分类" />
          </label>

          <div class="category-manager-grid">
            <div class="category-list" role="list">
              <button v-for="category in filteredCategories" :key="category.id" type="button" :class="{ active: editingCategoryId === category.id }" @click="selectCategory(category)">
                <strong>{{ category.name }}</strong>
                <span>{{ categoryMaterialCount(category.name) }} 种物料</span>
                <small>{{ category.description || '未填写说明' }}</small>
              </button>
              <p v-if="!filteredCategories.length" class="category-empty">没有匹配的分类</p>
            </div>

            <form class="category-editor" @submit.prevent="saveCategory">
              <label class="form-control"><span>分类名称</span><input v-model.trim="categoryForm.name" type="text" placeholder="例如：辅料" /></label>
              <label class="form-control"><span>分类说明</span><textarea v-model.trim="categoryForm.description" rows="4" placeholder="说明该类物料的用途或范围"></textarea></label>
              <p v-if="categoryError" class="form-error">{{ categoryError }}</p>
              <div class="dialog-actions">
                <button v-if="editingCategoryId" class="danger-outline-btn" type="button" @click="deleteCategory">删除分类</button>
                <button class="primary-btn" type="submit">{{ editingCategoryId ? '保存修改' : '新增分类' }}</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>

    <AppConfirmDialog
      v-if="deleteTarget"
      title="删除物料"
      :message="`确认删除「${deleteTarget.name}」吗？删除后无法恢复该物料资料。`"
      confirm-text="删除物料"
      @cancel="deleteTarget = null"
      @confirm="confirmDeleteMaterial"
    />

    <AppConfirmDialog
      v-if="batchDeleteVisible"
      title="批量删除物料"
      :message="`确认删除已选择的 ${selectedMaterialCodes.length} 种物料吗？删除后无法恢复。`"
      confirm-text="批量删除"
      @cancel="batchDeleteVisible = false"
      @confirm="confirmBatchDelete"
    />

    <div v-if="toastText" class="material-toast" role="status">
      <span>{{ toastText }}</span>
      <button type="button" @click="toastText = ''">知道了</button>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowRight, Box, Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'
import { tagType } from '../data/mock'
import { buildDemoMaterials } from '../data/demoRecords'
import { hydrateList, loadList, saveList, subscribeList } from '../services/storage'
import { showAssistantFeedback } from '../services/assistantFeedback'

const keyword = ref('')
const globalSearch = inject('globalSearch', ref(''))
const currentPage = ref(1)
const selectedMaterial = ref(null)
const dialogVisible = ref(false)
const deleteTarget = ref(null)
const selectedMaterialCodes = ref([])
const batchSelectionMode = ref(false)
const batchDeleteVisible = ref(false)
const editingCode = ref('')
const formError = ref('')
const toastText = ref('')
const categoryFilter = ref('')
const categoryFilterOpen = ref(false)
const categoryDialogVisible = ref(false)
const categoryKeyword = ref('')
const editingCategoryId = ref('')
const categoryError = ref('')
const categorySuggestionsOpen = ref(false)

const seedMaterials = buildDemoMaterials(20)

const materialList = ref(loadList('materials', seedMaterials))
const seedCategories = [
  { id: 'category-hardware', name: '五金件', description: '铰链、拉手、滑轨等金属五金部件' },
  { id: 'category-accessory', name: '辅料', description: '密封条、胶粘件等辅助用料' },
  { id: 'category-fastener', name: '紧固件', description: '螺丝、垫片等连接固定件' },
  { id: 'category-semifinished', name: '半成品', description: '已完成部分加工、待继续装配的材料' },
  { id: 'category-raw', name: '原材料', description: '钢板、型材等基础生产材料' },
  { id: 'category-packaging', name: '包材', description: '包装护角、防尘袋等包装材料' },
]
const materialCategories = ref(loadList('materialCategories', seedCategories))
const syncingMaterials = ref(false)
const syncingCategories = ref(false)
let stopMaterialsSubscription
let stopCategoriesSubscription

const materialForm = reactive({
  name: '',
  code: '',
  category: '',
  location: '',
  onHand: 0,
  committed: 0,
  unit: '件',
  supplier: '',
})

const pageSize = 10

const categoryForm = reactive({
  name: '',
  description: '',
})

watch(
  globalSearch,
  (value) => {
    keyword.value = value || ''
  },
  { immediate: true },
)

const filteredMaterials = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return materialList.value.filter((item) => {
    const matchesSearch = !search || `${item.name} ${item.code} ${item.category}`.toLowerCase().includes(search)
    return matchesSearch && (!categoryFilter.value || item.category === categoryFilter.value)
  })
})
const categoryFilterLabel = computed(() => categoryFilter.value || '全部分类')
const filteredCategories = computed(() => {
  const search = categoryKeyword.value.toLowerCase()
  return materialCategories.value.filter((category) => `${category.name} ${category.description || ''}`.toLowerCase().includes(search))
})
const matchingFormCategories = computed(() => {
  const search = materialForm.category.trim().toLowerCase()
  return materialCategories.value.filter((category) => category.name.toLowerCase().includes(search)).slice(0, 6)
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredMaterials.value.length / pageSize)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize, filteredMaterials.value.length))
const visibleStart = computed(() => (filteredMaterials.value.length ? pageStart.value + 1 : 0))
const pagedMaterials = computed(() => filteredMaterials.value.slice(pageStart.value, pageEnd.value))
const allFilteredMaterialsSelected = computed(() => filteredMaterials.value.length > 0 && filteredMaterials.value.every((material) => isMaterialSelected(material.code)))

watch(
  materialList,
  (nextMaterials) => {
    if (syncingMaterials.value) {
      syncingMaterials.value = false
      return
    }
    saveList('materials', nextMaterials)
  },
  { deep: true },
)

watch(
  materialCategories,
  (nextCategories) => {
    if (syncingCategories.value) {
      syncingCategories.value = false
      return
    }
    saveList('materialCategories', nextCategories)
  },
  { deep: true },
)

watch([keyword, categoryFilter], () => {
  currentPage.value = 1
})

watch(totalPages, (pageTotal) => {
  if (currentPage.value > pageTotal) currentPage.value = pageTotal
})

onMounted(() => {
  stopMaterialsSubscription = subscribeList('materials', (records) => {
    if (JSON.stringify(records) === JSON.stringify(materialList.value)) return
    syncingMaterials.value = true
    materialList.value = records
  })
  stopCategoriesSubscription = subscribeList('materialCategories', (records) => {
    if (JSON.stringify(records) === JSON.stringify(materialCategories.value)) return
    syncingCategories.value = true
    materialCategories.value = records
  })
  hydrateList('materials', materialList, seedMaterials)
})

onBeforeUnmount(() => {
  stopMaterialsSubscription?.()
  stopCategoriesSubscription?.()
})

function formatQty(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function resetForm() {
  materialForm.name = ''
  materialForm.code = `MAT-${String(1000 + materialList.value.length + 1)}`
  materialForm.category = ''
  materialForm.location = ''
  materialForm.onHand = 0
  materialForm.committed = 0
  materialForm.unit = '件'
  materialForm.supplier = ''
  formError.value = ''
  categorySuggestionsOpen.value = false
}

function fillForm(material) {
  materialForm.name = material.name
  materialForm.code = material.code
  materialForm.category = material.category
  materialForm.location = material.location
  materialForm.onHand = material.onHand
  materialForm.committed = material.committed
  materialForm.unit = material.unit
  materialForm.supplier = material.supplier
  formError.value = ''
  categorySuggestionsOpen.value = false
}

function openCreateMaterial() {
  editingCode.value = ''
  selectedMaterial.value = null
  resetForm()
  dialogVisible.value = true
}

function openEditMaterial(material) {
  editingCode.value = material.code
  fillForm(material)
  selectedMaterial.value = null
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  formError.value = ''
}

function chooseCategoryFilter(value) {
  categoryFilter.value = value
  categoryFilterOpen.value = false
}

function resetMaterialFilters() {
  globalSearch.value = ''
  keyword.value = ''
  categoryFilter.value = ''
  categoryFilterOpen.value = false
}

function categoryMaterialCount(name) {
  return materialList.value.filter((item) => item.category === name).length
}

function chooseFormCategory(name) {
  materialForm.category = name
  categorySuggestionsOpen.value = false
}

function closeCategorySuggestions() {
  window.setTimeout(() => {
    categorySuggestionsOpen.value = false
  }, 120)
}

function resetCategoryForm() {
  editingCategoryId.value = ''
  categoryForm.name = ''
  categoryForm.description = ''
  categoryError.value = ''
}

function openCategoryManager() {
  categoryDialogVisible.value = true
  categoryKeyword.value = ''
  resetCategoryForm()
}

function closeCategoryManager() {
  categoryDialogVisible.value = false
  categoryKeyword.value = ''
  resetCategoryForm()
}

function selectCategory(category) {
  editingCategoryId.value = category.id
  categoryForm.name = category.name
  categoryForm.description = category.description || ''
  categoryError.value = ''
}

function saveCategory() {
  const name = categoryForm.name.trim()
  const wasEditing = Boolean(editingCategoryId.value)

  if (editingCategoryId.value) {
    const previous = materialCategories.value.find((category) => category.id === editingCategoryId.value)
    materialCategories.value = materialCategories.value.map((category) => category.id === editingCategoryId.value ? { ...category, name, description: categoryForm.description.trim() } : category)
    if (previous && previous.name !== name) {
      materialList.value = materialList.value.map((material) => material.category === previous.name ? { ...material, category: name } : material)
    }
  } else {
    materialCategories.value = [...materialCategories.value, { id: `category-${Date.now()}`, name, description: categoryForm.description.trim() }]
  }
  resetCategoryForm()
  showAssistantFeedback(wasEditing ? '物料分类修改已保存。' : '物料分类已新增。', '操作完成')
}

function deleteCategory() {
  const category = materialCategories.value.find((item) => item.id === editingCategoryId.value)
  if (!category) return
  const count = categoryMaterialCount(category.name)
  if (count) {
    const message = `“${category.name}”正在被 ${count} 种物料使用，不能删除。`
    categoryError.value = message
    showAssistantFeedback(message, '无法删除')
    return
  }
  materialCategories.value = materialCategories.value.filter((item) => item.id !== category.id)
  resetCategoryForm()
  showAssistantFeedback('物料分类已删除。', '操作完成')
}

function normalizeMaterial(payload) {
  const onHand = Number(payload.onHand || 0)
  const committed = Number(payload.committed || 0)
  const available = Math.max(onHand - committed, 0)
  const status = available === 0 ? '缺货' : '正常'

  return {
    name: payload.name,
    code: payload.code,
    category: payload.category,
    location: payload.location,
    onHand,
    committed,
    available,
    unit: payload.unit,
    status,
    supplier: payload.supplier,
  }
}

function validateForm() {
  return ''
}

function saveMaterial() {
  const error = validateForm()
  if (error) {
    formError.value = error
    return
  }

  const nextMaterial = normalizeMaterial(materialForm)
  if (editingCode.value) {
    materialList.value = materialList.value.map((item) => (item.code === editingCode.value ? nextMaterial : item))
    toastText.value = '物料资料已保存'
  } else {
    materialList.value = [nextMaterial, ...materialList.value]
    currentPage.value = 1
    toastText.value = '物料已新增'
  }
  closeDialog()
  showAssistantFeedback(editingCode.value ? '物料资料修改已保存。' : '物料已新增。', '操作完成')
}

function requestDeleteMaterial(material) {
  if (!material) return
  deleteTarget.value = material
  selectedMaterial.value = null
}

function isMaterialSelected(code) {
  return selectedMaterialCodes.value.includes(code)
}

function toggleMaterialSelection(code) {
  selectedMaterialCodes.value = isMaterialSelected(code)
    ? selectedMaterialCodes.value.filter((item) => item !== code)
    : [...selectedMaterialCodes.value, code]
}

function startBatchSelection() {
  batchSelectionMode.value = true
  selectedMaterialCodes.value = []
}

function cancelBatchSelection() {
  batchSelectionMode.value = false
  selectedMaterialCodes.value = []
}

function toggleAllMaterialSelection() {
  selectedMaterialCodes.value = allFilteredMaterialsSelected.value ? [] : filteredMaterials.value.map((material) => material.code)
}

function requestBatchDelete() {
  if (!selectedMaterialCodes.value.length) {
    cancelBatchSelection()
    return
  }
  batchDeleteVisible.value = true
}

function confirmDeleteMaterial() {
  if (!deleteTarget.value) return
  materialList.value = materialList.value.filter((item) => item.code !== deleteTarget.value.code)
  deleteTarget.value = null
  showAssistantFeedback('物料已删除。', '操作完成')
}

function confirmBatchDelete() {
  const selected = new Set(selectedMaterialCodes.value)
  materialList.value = materialList.value.filter((item) => !selected.has(item.code))
  if (selected.has(selectedMaterial.value?.code)) selectedMaterial.value = null
  selectedMaterialCodes.value = []
  batchSelectionMode.value = false
  batchDeleteVisible.value = false
  showAssistantFeedback('已删除选中的物料。', '操作完成')
}

</script>
