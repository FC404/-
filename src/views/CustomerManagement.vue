<template>
  <section class="user-page customer-page">
    <section class="list-data-shell customer-data-shell">
    <section class="data-toolbar customer-toolbar">
      <div class="customer-filter">
        <div class="filter-field select-field">
          <span>地址类型</span>
          <div class="custom-select">
            <button type="button" @click="toggleDropdown('region')">
              {{ regionLabel }}
              <i></i>
            </button>
            <div v-if="openDropdown === 'region'" class="select-menu">
              <button
                v-for="option in regionOptions"
                :key="option.value"
                type="button"
                :class="{ active: filters.region === option.value }"
                @click="chooseRegion(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="filter-field select-field">
          <span>合作状态</span>
          <div class="custom-select">
            <button type="button" @click="toggleDropdown('status')">
              {{ statusLabel }}
              <i></i>
            </button>
            <div v-if="openDropdown === 'status'" class="select-menu">
              <button
                v-for="option in statusOptions"
                :key="option.value"
                type="button"
                :class="[{ active: filters.status === option.value }, `customer-status-option status-${option.value || 'all'}`]"
                @click="chooseStatus(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <button class="ghost-btn toolbar-icon-btn" type="button" title="重置筛选" aria-label="重置筛选" @click="resetFilters">
          <el-icon><Refresh /></el-icon>
        </button>
      </div>
      <div class="toolbar-action-group">
        <button v-if="!batchSelectionMode" class="danger-outline-btn toolbar-icon-btn" type="button" title="批量删除" aria-label="批量删除" @click="startBatchSelection"><el-icon><Delete /></el-icon></button>
        <template v-else><button class="danger-outline-btn toolbar-icon-btn" type="button" :title="selectedCustomerIds.length ? '删除已选' : '退出批量选择'" :aria-label="selectedCustomerIds.length ? '删除已选' : '退出批量选择'" @click="requestBatchDelete"><el-icon><Delete /></el-icon></button></template>
        <button class="primary-btn toolbar-icon-btn" type="button" title="新增客户" aria-label="新增客户" @click="openCreateCustomer">
          <el-icon><Plus /></el-icon>
        </button>
      </div>
    </section>

    <section class="panel user-panel">
      <div class="table-wrap">
        <table v-table-overflow class="customer-table">
          <thead>
            <tr>
              <th v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="allFilteredCustomersSelected" aria-label="全选当前筛选结果" @change="toggleAllCustomerSelection" /></th>
              <th>客户名称</th>
              <th>联系人</th>
              <th>地址类型</th>
              <th>地址</th>
              <th>订单数</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in pagedCustomers" :key="customer.id" class="entity-row" :class="{ selected: isCustomerSelected(customer.id) }" @click="selectedCustomer = customer">
              <td v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="isCustomerSelected(customer.id)" :aria-label="`选择 ${customer.name}`" @click.stop="toggleCustomerSelection(customer.id)" /></td>
              <td>
                <div class="main-cell">{{ customer.name }}</div>
                <div class="sub-cell">{{ customer.type }}</div>
              </td>
              <td>
                <div class="main-cell">{{ customer.contact }}</div>
                <div class="sub-cell">{{ customer.phone }}</div>
              </td>
              <td><span class="tag" :class="customer.region === '国内' ? 'ok' : 'info'">{{ customer.region }}</span></td>
              <td>
                <div class="address-cell">{{ formatAddress(customer) }}</div>
              </td>
              <td>{{ customer.orders }}</td>
              <td><span class="tag table-status" :class="customerStatusClass(customer.status)">{{ customer.status }}</span></td>
            </tr>
            <tr v-if="!pagedCustomers.length">
              <td class="empty-row" :colspan="batchSelectionMode ? 7 : 6">没有匹配的客户</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-pagination">
        <p>
          显示 {{ visibleStart }}-{{ pageEnd }} 条，共 {{ filteredCustomers.length }} 个客户
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

    <div v-if="selectedCustomer" class="user-dialog-mask" @click.self="selectedCustomer = null">
      <section class="user-dialog customer-dialog entity-detail-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div><h3>{{ selectedCustomer.name }}</h3></div>
          <button class="dialog-close" type="button" aria-label="关闭客户详情" @click="selectedCustomer = null">×</button>
        </div>
        <div class="entity-detail-content">
          <div><span>客户类型</span><strong>{{ selectedCustomer.type }}</strong></div>
          <div><span>合作状态</span><strong class="table-status" :class="customerStatusClass(selectedCustomer.status)">{{ selectedCustomer.status }}</strong></div>
          <div><span>联系人</span><strong>{{ selectedCustomer.contact }}</strong></div>
          <div><span>联系电话</span><strong>{{ selectedCustomer.phone }}</strong></div>
          <div><span>地址类型</span><strong>{{ selectedCustomer.region }}</strong></div>
          <div><span>订单数</span><strong>{{ selectedCustomer.orders }}</strong></div>
          <div class="entity-detail-wide"><span>地址</span><strong>{{ formatAddress(selectedCustomer) }}</strong></div>
        </div>
        <div class="dialog-actions">
          <button class="ghost-btn" type="button" @click="openEditCustomer(selectedCustomer)">编辑客户</button>
          <button class="danger-outline-btn" type="button" @click="deleteCustomer(selectedCustomer)">删除客户</button>
        </div>
      </section>
    </div>

    <div v-if="dialogVisible" class="user-dialog-mask" @click.self="closeDialog">
      <section class="user-dialog customer-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Customer Form</p>
            <h3>{{ editingId ? '编辑客户' : '新增客户' }}</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeDialog">×</button>
        </div>

        <form class="dialog-form" @submit.prevent="saveCustomer">
          <div class="form-grid">
            <label class="form-control">
              <span>客户名称</span>
              <input v-model.trim="customerForm.name" type="text" placeholder="例如 北桥五金" />
            </label>
            <label class="form-control">
              <span>客户类型</span>
              <input v-model.trim="customerForm.type" type="text" placeholder="例如 企业客户" />
            </label>
          </div>

          <div class="form-grid">
            <label class="form-control">
              <span>联系人</span>
              <input v-model.trim="customerForm.contact" type="text" placeholder="例如 张经理" />
            </label>
            <label class="form-control">
              <span>联系电话</span>
              <input v-model.trim="customerForm.phone" type="tel" placeholder="手机号或海外电话" />
            </label>
          </div>

          <div class="form-grid">
            <div class="form-control">
              <span>地址类型</span>
              <div class="custom-select">
                <button type="button" @click="toggleDropdown('formRegion')">
                  {{ customerForm.region }}
                  <i></i>
                </button>
                <div v-if="openDropdown === 'formRegion'" class="select-menu">
                  <button
                    v-for="option in formRegionOptions"
                    :key="option"
                    type="button"
                    :class="{ active: customerForm.region === option }"
                    @click="chooseFormRegion(option)"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-control">
              <span>合作状态</span>
              <div class="custom-select">
                <button type="button" @click="toggleDropdown('formStatus')">
                  {{ customerForm.status }}
                  <i></i>
                </button>
                <div v-if="openDropdown === 'formStatus'" class="select-menu">
                  <button
                    v-for="option in formStatusOptions"
                    :key="option"
                    type="button"
                    :class="{ active: customerForm.status === option }"
                    @click="chooseFormStatus(option)"
                  >
                    {{ option }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <template v-if="customerForm.region === '国内'">
            <div class="form-grid">
              <label class="form-control">
                <span>省份</span>
                <input v-model.trim="customerForm.province" type="text" placeholder="例如 浙江省" />
              </label>
              <label class="form-control">
                <span>城市</span>
                <input v-model.trim="customerForm.city" type="text" placeholder="例如 宁波市" />
              </label>
            </div>
          </template>

          <template v-else>
            <div class="form-grid">
              <label class="form-control">
                <span>国家/地区</span>
                <input v-model.trim="customerForm.country" type="text" placeholder="例如 Germany" />
              </label>
              <label class="form-control">
                <span>州省/城市</span>
                <input v-model.trim="customerForm.city" type="text" placeholder="例如 Berlin" />
              </label>
            </div>
          </template>

          <label class="form-control">
            <span>详细地址</span>
            <textarea v-model.trim="customerForm.address" rows="3" placeholder="填写街道、门牌号、园区或收货备注"></textarea>
          </label>

          <label class="form-control order-field">
            <span>订单数</span>
            <input v-model.number="customerForm.orders" type="number" min="0" />
          </label>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <div class="dialog-actions">
            <button
              v-if="editingId"
              class="danger-outline-btn"
              type="button"
              @click="deleteCustomer(customers.find((item) => item.id === editingId))"
            >
              删除客户
            </button>
            <button class="primary-btn" type="submit">{{ editingId ? '保存修改' : '确认新增' }}</button>
          </div>
        </form>
      </section>
    </div>

    <AppConfirmDialog
      v-if="deleteTarget"
      title="删除客户"
      :message="`确认删除「${deleteTarget.name}」吗？此操作不会影响已有订单记录。`"
      confirm-text="删除客户"
      @cancel="deleteTarget = null"
      @confirm="confirmDeleteCustomer"
    />

    <AppConfirmDialog
      v-if="batchDeleteVisible"
      title="批量删除客户"
      :message="`确认删除已选择的 ${selectedCustomerIds.length} 个客户吗？此操作不会影响已有订单记录。`"
      confirm-text="批量删除"
      @cancel="batchDeleteVisible = false"
      @confirm="confirmBatchDelete"
    />
  </section>
</template>

<script setup>
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Delete, Plus, Refresh } from '@element-plus/icons-vue'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'
import { tagType } from '../data/mock'
import { buildDemoCustomers } from '../data/demoRecords'
import { hydrateList, loadList, saveList, subscribeList } from '../services/storage'
import { showAssistantFeedback } from '../services/assistantFeedback'

let customerIdSeed = 2000

function createCustomerId() {
  customerIdSeed += 1
  return `customer-${customerIdSeed}`
}

function buildCustomer(customer) {
  return {
    id: customer.id || createCustomerId(),
    name: customer.name,
    type: customer.type,
    contact: customer.contact,
    phone: customer.phone,
    region: customer.region,
    country: customer.country || '中国',
    province: customer.province || '',
    city: customer.city || '',
    address: customer.address,
    orders: Number(customer.orders) || 0,
    status: customer.status,
  }
}

const seedCustomers = buildDemoCustomers(20).map(buildCustomer)

const customers = ref(loadList('customers', seedCustomers))
const syncingCustomers = ref(false)
let stopCustomerSubscription

const openDropdown = ref('')
const dialogVisible = ref(false)
const selectedCustomer = ref(null)
const deleteTarget = ref(null)
const selectedCustomerIds = ref([])
const batchSelectionMode = ref(false)
const batchDeleteVisible = ref(false)
const editingId = ref('')
const formError = ref('')
const globalSearch = inject('globalSearch', ref(''))
const pageSize = 10
const currentPage = ref(1)

const filters = reactive({
  keyword: '',
  region: '',
  status: '',
})

watch(
  globalSearch,
  (value) => {
    filters.keyword = value || ''
  },
  { immediate: true },
)

const customerForm = reactive({
  name: '',
  type: '',
  contact: '',
  phone: '',
  region: '国内',
  country: '中国',
  province: '',
  city: '',
  address: '',
  orders: 0,
  status: '正常',
})

const regionOptions = [
  { label: '全部地址', value: '' },
  { label: '国内', value: '国内' },
  { label: '海外', value: '海外' },
]

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: '正常' },
  { label: '重点', value: '重点' },
  { label: '潜在', value: '潜在' },
  { label: '停用', value: '停用' },
]

const formRegionOptions = ['国内', '海外']
const formStatusOptions = ['正常', '重点', '潜在', '停用']

const filteredCustomers = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return customers.value.filter((customer) => {
    const searchText = [
      customer.name,
      customer.type,
      customer.contact,
      customer.phone,
      customer.country,
      customer.province,
      customer.city,
      customer.address,
    ]
      .join(' ')
      .toLowerCase()

    const keywordMatched = !keyword || searchText.includes(keyword)
    const regionMatched = !filters.region || customer.region === filters.region
    const statusMatched = !filters.status || customer.status === filters.status
    return keywordMatched && regionMatched && statusMatched
  })
})

const regionLabel = computed(() => regionOptions.find((item) => item.value === filters.region)?.label || '全部地址')
const statusLabel = computed(() => statusOptions.find((item) => item.value === filters.status)?.label || '全部状态')
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCustomers.value.length / pageSize)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize, filteredCustomers.value.length))
const visibleStart = computed(() => (filteredCustomers.value.length ? pageStart.value + 1 : 0))
const pagedCustomers = computed(() => filteredCustomers.value.slice(pageStart.value, pageEnd.value))
const allFilteredCustomersSelected = computed(() => filteredCustomers.value.length > 0 && filteredCustomers.value.every((customer) => isCustomerSelected(customer.id)))

watch(filters, () => {
  currentPage.value = 1
})

watch(
  customers,
  (nextCustomers) => {
    if (syncingCustomers.value) {
      syncingCustomers.value = false
      return
    }
    saveList('customers', nextCustomers)
  },
  { deep: true },
)

onMounted(() => {
  stopCustomerSubscription = subscribeList('customers', (records) => {
    if (JSON.stringify(records) === JSON.stringify(customers.value)) return
    syncingCustomers.value = true
    customers.value = records
  })
  hydrateList('customers', customers, seedCustomers)
})

onBeforeUnmount(() => stopCustomerSubscription?.())

watch(totalPages, (pageTotal) => {
  if (currentPage.value > pageTotal) currentPage.value = pageTotal
})

watch(
  () => customerForm.region,
  (region) => {
    if (region === '国内') {
      customerForm.country = '中国'
      return
    }

    customerForm.province = ''
    if (customerForm.country === '中国') customerForm.country = ''
  },
)

function formatAddress(customer) {
  if (customer.region === '国内') {
    return [customer.province, customer.city, customer.address].filter(Boolean).join(' ')
  }
  return [customer.country, customer.city, customer.address].filter(Boolean).join(' ')
}

function customerStatusClass(status) {
  return {
    正常: 'ok',
    重点: 'warn',
    潜在: 'info',
    停用: 'danger',
  }[status] || tagType(status)
}

function resetFilters() {
  globalSearch.value = ''
  filters.keyword = ''
  filters.region = ''
  filters.status = ''
  openDropdown.value = ''
}

function isCustomerSelected(id) {
  return selectedCustomerIds.value.includes(id)
}

function toggleCustomerSelection(id) {
  selectedCustomerIds.value = isCustomerSelected(id)
    ? selectedCustomerIds.value.filter((item) => item !== id)
    : [...selectedCustomerIds.value, id]
}

function startBatchSelection() {
  batchSelectionMode.value = true
  selectedCustomerIds.value = []
}

function cancelBatchSelection() {
  batchSelectionMode.value = false
  selectedCustomerIds.value = []
}

function toggleAllCustomerSelection() {
  selectedCustomerIds.value = allFilteredCustomersSelected.value ? [] : filteredCustomers.value.map((customer) => customer.id)
}

function requestBatchDelete() {
  if (!selectedCustomerIds.value.length) {
    cancelBatchSelection()
    return
  }
  batchDeleteVisible.value = true
}

function toggleDropdown(type) {
  openDropdown.value = openDropdown.value === type ? '' : type
}

function chooseRegion(value) {
  filters.region = value
  openDropdown.value = ''
}

function chooseStatus(value) {
  filters.status = value
  openDropdown.value = ''
}

function chooseFormRegion(value) {
  customerForm.region = value
  openDropdown.value = ''
}

function chooseFormStatus(value) {
  customerForm.status = value
  openDropdown.value = ''
}

function resetForm() {
  customerForm.name = ''
  customerForm.type = ''
  customerForm.contact = ''
  customerForm.phone = ''
  customerForm.region = '国内'
  customerForm.country = '中国'
  customerForm.province = ''
  customerForm.city = ''
  customerForm.address = ''
  customerForm.orders = 0
  customerForm.status = '正常'
  formError.value = ''
  openDropdown.value = ''
}

function openCreateCustomer() {
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEditCustomer(customer) {
  selectedCustomer.value = null
  editingId.value = customer.id
  customerForm.name = customer.name
  customerForm.type = customer.type
  customerForm.contact = customer.contact
  customerForm.phone = customer.phone
  customerForm.region = customer.region
  customerForm.country = customer.country
  customerForm.province = customer.province
  customerForm.city = customer.city
  customerForm.address = customer.address
  customerForm.orders = customer.orders
  customerForm.status = customer.status
  formError.value = ''
  openDropdown.value = ''
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  openDropdown.value = ''
}

function validateForm() {
  return ''
}

function saveCustomer() {
  const error = validateForm()
  if (error) {
    formError.value = error
    return
  }

  const nextCustomer = buildCustomer({
    id: editingId.value || createCustomerId(),
    name: customerForm.name,
    type: customerForm.type || (customerForm.region === '海外' ? '海外客户' : '企业客户'),
    contact: customerForm.contact,
    phone: customerForm.phone,
    region: customerForm.region,
    country: customerForm.region === '国内' ? '中国' : customerForm.country,
    province: customerForm.region === '国内' ? customerForm.province : '',
    city: customerForm.city,
    address: customerForm.address,
    orders: customerForm.orders,
    status: customerForm.status,
  })

  if (editingId.value) {
    customers.value = customers.value.map((customer) => (customer.id === editingId.value ? nextCustomer : customer))
  } else {
    customers.value = [nextCustomer, ...customers.value]
    currentPage.value = 1
  }

  closeDialog()
  showAssistantFeedback(editingId.value ? '客户资料修改已保存。' : '客户已新增。', '操作完成')
}

function deleteCustomer(customer) {
  selectedCustomer.value = null
  deleteTarget.value = customer
}

function confirmDeleteCustomer() {
  if (!deleteTarget.value) return
  customers.value = customers.value.filter((item) => item.id !== deleteTarget.value.id)
  deleteTarget.value = null
  showAssistantFeedback('客户已删除。', '操作完成')
}

function confirmBatchDelete() {
  const selected = new Set(selectedCustomerIds.value)
  customers.value = customers.value.filter((item) => !selected.has(item.id))
  if (selected.has(selectedCustomer.value?.id)) selectedCustomer.value = null
  selectedCustomerIds.value = []
  batchSelectionMode.value = false
  batchDeleteVisible.value = false
  showAssistantFeedback('已删除选中的客户。', '操作完成')
}
</script>
