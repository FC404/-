<template>
  <section class="table-page" :class="{ 'warehouse-page': isWarehousePage }">
    <section v-if="page === 'materials'" class="data-toolbar material-toolbar">
      <div class="material-filter">
        <label class="filter-field filter-search">
          <span>物料名称/编号</span>
          <div class="filter-input-with-icon">
            <el-icon><Search /></el-icon>
            <input v-model="materialFilters.keyword" type="search" placeholder="搜索物料名称或编号" />
          </div>
        </label>

        <div class="filter-field select-field">
          <span>物料分类</span>
          <div class="custom-select">
            <button type="button" @click="toggleMaterialDropdown('category')">
              {{ materialCategoryLabel }}
              <i></i>
            </button>
            <div v-if="materialDropdown === 'category'" class="select-menu">
              <button
                v-for="option in materialCategoryOptions"
                :key="option.value"
                type="button"
                :class="{ active: materialFilters.category === option.value }"
                @click="chooseMaterialFilter('category', option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="filter-field select-field">
          <span>库存状态</span>
          <div class="custom-select">
            <button type="button" @click="toggleMaterialDropdown('status')">
              {{ materialStatusLabel }}
              <i></i>
            </button>
            <div v-if="materialDropdown === 'status'" class="select-menu">
              <button
                v-for="option in materialStatusOptions"
                :key="option.value"
                type="button"
                :class="{ active: materialFilters.status === option.value }"
                @click="chooseMaterialFilter('status', option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>

        <button class="ghost-btn toolbar-icon-btn" type="button" title="重置筛选" aria-label="重置筛选" @click="resetMaterialFilters"><el-icon><Refresh /></el-icon></button>
      </div>
      <button class="primary-btn toolbar-icon-btn" type="button" title="新增物料" aria-label="新增物料"><el-icon><Plus /></el-icon></button>
    </section>

    <section class="panel" :class="{ 'warehouse-record-panel': isWarehousePage }">
      <div v-if="page !== 'materials' && !isWarehousePage" class="panel-head table-head">
        <div>
          <h3>{{ config.tableTitle }}</h3>
          <p v-if="config.tableDesc">{{ config.tableDesc }}</p>
        </div>
        <button v-if="config.action" class="primary-btn toolbar-icon-btn" type="button" :title="config.action" :aria-label="config.action" @click="handlePrimaryAction"><el-icon><Plus /></el-icon></button>
      </div>

      <div v-if="isWarehousePage" class="warehouse-record-actions">
        <div class="warehouse-filter-bar">
          <div class="filter-field select-field">
            <div class="custom-select">
              <button type="button" @click="warehouseFilterOpen = warehouseFilterOpen === 'status' ? '' : 'status'">{{ warehouseStatusLabel }}<i></i></button>
              <div v-if="warehouseFilterOpen === 'status'" class="select-menu">
                <button v-for="option in warehouseStatusOptions" :key="option.value" type="button" :class="{ active: warehouseFilters.status === option.value }" @click="chooseWarehouseFilter('status', option.value)">{{ option.label }}</button>
              </div>
            </div>
          </div>
          <div class="filter-field select-field">
            <div class="custom-select">
              <button type="button" @click="warehouseFilterOpen = warehouseFilterOpen === 'type' ? '' : 'type'">{{ warehouseTypeLabel }}<i></i></button>
              <div v-if="warehouseFilterOpen === 'type'" class="select-menu">
                <button v-for="option in warehouseTypeOptions" :key="option.value" type="button" :class="{ active: warehouseFilters.type === option.value }" @click="chooseWarehouseFilter('type', option.value)">{{ option.label }}</button>
              </div>
            </div>
          </div>
          <label class="filter-field date-filter-field warehouse-date-filter"><span>记录日期</span><input v-model="warehouseFilters.date" type="date" aria-label="按记录日期筛选" /></label>
          <div class="toolbar-action-group">
            <button class="ghost-btn toolbar-icon-btn" type="button" title="重置筛选" aria-label="重置筛选" @click="resetWarehouseFilters"><el-icon><Refresh /></el-icon></button>
            <button v-if="!batchSelectionMode" class="danger-outline-btn toolbar-icon-btn" type="button" title="批量删除" aria-label="批量删除" @click="startBatchSelection"><el-icon><Delete /></el-icon></button>
            <template v-else><button class="danger-outline-btn toolbar-icon-btn" type="button" :title="selectedRecordNos.length ? '删除已选' : '退出批量选择'" :aria-label="selectedRecordNos.length ? '删除已选' : '退出批量选择'" @click="requestBatchDelete"><el-icon><Delete /></el-icon></button></template>
            <button class="primary-btn toolbar-icon-btn" type="button" :title="config.action" :aria-label="config.action" @click="handlePrimaryAction"><el-icon><Plus /></el-icon></button>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table v-table-overflow :class="{ 'order-table': page === 'orders' }">
          <thead>
            <tr>
              <th v-for="header in tableHeaders" :key="header" :class="{ 'selection-cell': header === '选择' }">
                <input v-if="header === '选择'" type="checkbox" :checked="allVisibleRecordsSelected" aria-label="全选当前筛选结果" @change="toggleAllRecordSelection" />
                <template v-else>{{ header }}</template>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedRows" :key="rowKey(row)" :class="{ 'warehouse-row': isWarehousePage, selected: isWarehousePage && isRecordSelected(row.no) }" @click="isWarehousePage && (selectedRecord = row)">
              <template v-if="page === 'orders'">
                <td><div class="main-cell">{{ row.no }}</div></td>
                <td><span class="table-overflow-text">{{ row.customer }}</span></td>
                <td><span class="table-overflow-text">{{ row.customerPartNo }}</span></td>
                <td><span class="table-overflow-text">{{ row.factoryPartNo }}</span></td>
                <td><div class="main-cell">{{ row.productName }}</div></td>
                <td>{{ row.orderDate }}</td>
                <td>{{ row.deliveryDate }}</td>
                <td>{{ formatQty(row.orderQty) }}</td>
                <td>{{ formatQty(row.deliveredQty) }}</td>
                <td>{{ formatQty(row.pendingQty) }}</td>
                <td><ProgressCell :value="row.feedingProgress" /></td>
                <td><ProgressCell :value="row.materialProgress" /></td>
                <td><ProgressCell :value="row.outsourcingProgress" /></td>
                <td><div class="note-cell">{{ row.shortageDetails }}</div></td>
                <td><ProgressCell :value="row.installationProgress" /></td>
                <td><div class="note-cell">{{ row.remark }}</div></td>
                <td><span class="tag table-status" :class="tagType(row.status)">{{ row.status }}</span></td>
              </template>

              <template v-else-if="page === 'materials'">
                <td><div class="main-cell">{{ row.name }}</div><div class="sub-cell">{{ row.code }}</div></td>
                <td><span class="table-overflow-text">{{ row.category }}</span></td>
                <td>{{ row.stock }}</td>
                <td>{{ row.available }}</td>
                <td><span class="tag table-status" :class="tagType(row.status)">{{ row.status }}</span></td>
                <td><button class="row-action" type="button">设置</button></td>
              </template>

              <template v-else-if="isWarehousePage">
                <td v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="isRecordSelected(row.no)" :aria-label="`选择 ${row.no}`" @click.stop="toggleRecordSelection(row.no)" /></td>
                <td><div class="main-cell">{{ row.no }}</div><div class="sub-cell">{{ row.type }}</div></td>
                <td><span class="table-overflow-text">{{ row.location }}</span></td>
                <td>{{ row.time }}</td>
                <td><span class="tag table-status" :class="tagType(row.status)">{{ row.status }}</span></td>
              </template>

              <template v-else-if="page === 'customers'">
                <td><div class="main-cell">{{ row.name }}</div><div class="sub-cell">{{ row.type }}</div></td>
                <td><span class="table-overflow-text">{{ row.contact }}</span></td>
                <td><span class="table-overflow-text">{{ row.city }}</span></td>
                <td>{{ row.orders }}</td>
                <td><span class="tag table-status" :class="tagType(row.status)">{{ row.status }}</span></td>
                <td><button class="row-action" type="button">查看</button></td>
              </template>

              <template v-else>
                <td><div class="main-cell">{{ row.name }}</div><div class="sub-cell">{{ row.phone }}</div></td>
                <td><span class="table-overflow-text">{{ row.role }}</span></td>
                <td><span class="table-overflow-text wide">{{ row.scope }}</span></td>
                <td><span class="tag table-status" :class="tagType(row.status)">{{ row.status }}</span></td>
                <td><button class="row-action" type="button">编辑</button></td>
              </template>
            </tr>
            <tr v-if="!pagedRows.length">
              <td class="empty-row" :colspan="tableHeaders.length">没有匹配的数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-pagination">
        <p>
          显示 {{ visibleStart }}-{{ pageEnd }} 条，共 {{ rows.length }} 条记录
        </p>
        <div class="pager">
          <button type="button" :disabled="currentPage === 1" @click="currentPage -= 1">
            上一页
          </button>
          <button
            v-for="pageNumber in totalPages"
            :key="pageNumber"
            type="button"
            :class="{ active: pageNumber === currentPage }"
            @click="currentPage = pageNumber"
          >
            {{ pageNumber }}
          </button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage += 1">
            下一页
          </button>
        </div>
      </div>
    </section>

    <div v-if="selectedRecord" class="user-dialog-mask" @click.self="selectedRecord = null">
      <section class="user-dialog customer-dialog warehouse-record-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Warehouse Record</p>
            <h3>{{ selectedRecord.no }}</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭" @click="selectedRecord = null">×</button>
        </div>
        <div class="record-detail-content">
          <div class="detail-grid">
            <div><span>单据类型</span><strong>{{ selectedRecord.type }}</strong></div>
            <div><span>库位/流向</span><strong>{{ selectedRecord.location }}</strong></div>
            <div><span>状态</span><strong>{{ selectedRecord.status }}</strong></div>
            <div v-if="selectedRecord.note" class="entity-detail-wide"><span>备注</span><strong>{{ selectedRecord.note }}</strong></div>
          </div>
          <p class="detail-note">记录时间：{{ selectedRecord.time }}</p>
        </div>
        <div class="dialog-actions"><button class="primary-btn" type="button" @click="openEditRecord(selectedRecord)">编辑记录</button></div>
      </section>
    </div>

    <div v-if="recordDialogVisible" class="user-dialog-mask" @click.self="closeRecordDialog">
      <section class="user-dialog customer-dialog warehouse-record-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Warehouse Form</p>
            <h3>{{ editingRecordNo ? `编辑${isOutboundPage ? '出库' : '入库'}单据` : config.formTitle }}</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeRecordDialog">×</button>
        </div>
        <form class="dialog-form" @submit.prevent="saveRecord">
          <div class="form-grid">
            <label class="form-control">
              <span>单据编号</span>
              <input v-model.trim="recordForm.no" type="text" placeholder="例如 IN-2026-0820-01" />
            </label>
            <label class="form-control">
              <span>备注</span>
              <input v-model.trim="recordForm.note" type="text" placeholder="选填" />
            </label>
          </div>
          <div class="form-grid">
            <label class="form-control">
              <span>库位/流向</span>
              <input v-model.trim="recordForm.location" type="text" placeholder="例如 A 区 03 架" />
            </label>
            <div class="form-control">
              <span>状态</span>
              <div class="custom-select">
                <button type="button" @click="recordStatusOpen = !recordStatusOpen">
                  {{ recordForm.status }}
                  <i></i>
                </button>
                <div v-if="recordStatusOpen" class="select-menu">
                  <button
                    v-for="status in recordStatusOptions"
                    :key="status"
                    type="button"
                    :class="{ active: recordForm.status === status }"
                    @click="chooseRecordStatus(status)"
                  >
                    {{ status }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="recordError" class="form-error">{{ recordError }}</p>
          <div class="dialog-actions">
            <button
              v-if="editingRecordNo"
              class="danger-outline-btn"
              type="button"
              @click="requestDeleteRecord((isOutboundPage ? warehouseOutboundRecords : warehouseInboundRecords).find((item) => item.no === editingRecordNo))"
            >
              删除记录
            </button>
            <button class="primary-btn" type="submit">{{ editingRecordNo ? '保存修改' : '确认新增' }}</button>
          </div>
        </form>
      </section>
    </div>

    <AppConfirmDialog
      v-if="deleteTarget"
      :title="`删除${isOutboundPage ? '出库' : '入库'}记录`"
      :message="`确认删除「${deleteTarget.no}」吗？删除后无法恢复该记录。`"
      confirm-text="删除记录"
      @cancel="deleteTarget = null"
      @confirm="confirmDeleteRecord"
    />

    <AppConfirmDialog
      v-if="batchDeleteVisible"
      :title="`批量删除${isOutboundPage ? '出库' : '入库'}记录`"
      :message="`确认删除已选择的 ${selectedRecordNos.length} 条记录吗？此操作无法恢复。`"
      confirm-text="批量删除"
      @cancel="batchDeleteVisible = false"
      @confirm="confirmBatchDelete"
    />
  </section>
</template>

<script setup>
import { computed, defineComponent, h, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Delete, Plus, Refresh, Search } from '@element-plus/icons-vue'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'
import { customers, inboundWarehouse, materials, orders, outboundWarehouse, tagType, users } from '../data/mock'
import { hydrateList, loadList, saveList, subscribeList } from '../services/storage'
import { showAssistantFeedback } from '../services/assistantFeedback'

const props = defineProps({
  page: {
    type: String,
    required: true,
  },
})

const pageConfig = {
  orders: {
    eyebrow: 'Orders',
    title: '订单管理',
    desc: '按客户料号、本厂料号、交付数量和生产节点跟踪订单执行。',
    action: '新增订单',
    tableTitle: '订单执行列表',
    tableDesc: '统一查看投料、备料、外发、安装和欠料明细。',
    headers: [
      '订单号',
      '客户',
      '客户料号',
      '本厂料号',
      '产品名称',
      '订单日期',
      '交付日期',
      '订单数量',
      '已交付',
      '欠交数量',
      '投料进度',
      '备料进度',
      '外发进度',
      '欠料明细',
      '安装进度',
      '备注',
      '状态',
    ],
    rows: orders,
  },
  materials: {
    eyebrow: 'Materials',
    title: '物料管理',
    desc: '维护物料档案、分类、库存和安全库存线。',
    action: '新增物料',
    tableTitle: '物料列表',
    tableDesc: '可查看库存数量、可用数量和预警状态。',
    headers: ['物料名称', '分类', '库存数量', '可用数量', '库存状态', '操作'],
    rows: materials,
  },
  'warehouse-inbound': {
    eyebrow: 'Warehouse',
    title: '入库记录',
    desc: '',
    action: '新增入库单',
    formTitle: '新增入库单据',
    tableTitle: '入库记录明细',
    tableDesc: '',
    headers: ['选择', '单据编号', '库位/流向', '时间', '状态'],
    rows: inboundWarehouse,
  },
  'warehouse-outbound': {
    eyebrow: 'Warehouse',
    title: '出库记录',
    desc: '',
    action: '新增出库单',
    formTitle: '新增出库单据',
    tableTitle: '出库记录明细',
    tableDesc: '',
    headers: ['选择', '单据编号', '库位/流向', '时间', '状态'],
    rows: outboundWarehouse,
  },
  customers: {
    eyebrow: 'Customers',
    title: '客户信息',
    desc: '维护客户资料、联系人和订单历史。',
    action: '新增客户',
    tableTitle: '客户列表',
    tableDesc: '统一管理客户联系人、城市和合作状态。',
    headers: ['客户名称', '联系人', '城市', '订单数', '状态', '操作'],
    rows: customers,
  },
  users: {
    eyebrow: 'Users',
    title: '用户管理',
    desc: '配置内部账号、角色权限和访问状态。',
    action: '新增用户',
    tableTitle: '用户列表',
    tableDesc: '根据岗位配置仓库、销售和管理访问范围。',
    headers: ['姓名', '角色', '权限范围', '状态', '操作'],
    rows: users,
  },
}

const config = computed(() => pageConfig[props.page])
const pageSize = 10
const currentPage = ref(1)
const warehouseInboundRecords = ref(loadList('warehouseInboundRecords', inboundWarehouse))
const warehouseOutboundRecords = ref(loadList('warehouseOutboundRecords', outboundWarehouse))
const syncingInboundRecords = ref(false)
const syncingOutboundRecords = ref(false)
let stopInboundSubscription
let stopOutboundSubscription
const selectedRecord = ref(null)
const recordDialogVisible = ref(false)
const editingRecordNo = ref('')
const deleteTarget = ref(null)
const recordStatusOpen = ref(false)
const recordError = ref('')
const selectedRecordNos = ref([])
const batchSelectionMode = ref(false)
const batchDeleteVisible = ref(false)
const warehouseFilterOpen = ref('')
const warehouseFilters = reactive({ status: '', type: '', date: '' })
const isWarehousePage = computed(() => props.page === 'warehouse-inbound' || props.page === 'warehouse-outbound')
const isOutboundPage = computed(() => props.page === 'warehouse-outbound')
const globalSearch = inject('globalSearch', ref(''))
const recordStatusOptions = computed(() =>
  isOutboundPage.value ? ['待复核', '拣货中', '已出库'] : ['待复核', '进行中', '已入库'],
)
const warehouseStatusOptions = computed(() => [
  { label: '全部状态', value: '' },
  ...[...new Set((isOutboundPage.value ? warehouseOutboundRecords.value : warehouseInboundRecords.value).map((record) => record.status))].map((status) => ({ label: status, value: status })),
])
const warehouseTypeOptions = computed(() => [
  { label: '全部类型', value: '' },
  ...[...new Set((isOutboundPage.value ? warehouseOutboundRecords.value : warehouseInboundRecords.value).map((record) => record.type))].map((type) => ({ label: type, value: type })),
])
const warehouseStatusLabel = computed(() => warehouseStatusOptions.value.find((item) => item.value === warehouseFilters.status)?.label || '全部状态')
const warehouseTypeLabel = computed(() => warehouseTypeOptions.value.find((item) => item.value === warehouseFilters.type)?.label || '全部类型')
const tableHeaders = computed(() => config.value.headers.filter((header) => header !== '选择' || batchSelectionMode.value))
const allVisibleRecordsSelected = computed(() => rows.value.length > 0 && rows.value.every((record) => isRecordSelected(record.no)))
const recordForm = reactive({
  no: '',
  type: '',
  location: '',
  note: '',
  status: '待复核',
})
const materialDropdown = ref('')
const materialFilters = reactive({ keyword: '', category: '', status: '' })

watch(
  globalSearch,
  (value) => {
    materialFilters.keyword = value || ''
  },
  { immediate: true },
)

const materialCategoryOptions = computed(() => [
  { label: '全部分类', value: '' },
  ...[...new Set(materials.map((item) => item.category))].map((category) => ({ label: category, value: category })),
])
const materialStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: '正常' },
  { label: '缺货', value: '缺货' },
]
const materialCategoryLabel = computed(
  () => materialCategoryOptions.value.find((item) => item.value === materialFilters.category)?.label || '全部分类',
)
const materialStatusLabel = computed(
  () => materialStatusOptions.find((item) => item.value === materialFilters.status)?.label || '全部状态',
)

function filterWarehouseRows(records) {
  const keyword = materialFilters.keyword.trim().toLowerCase()
  return records.filter((record) => {
    const keywordMatched = !keyword || `${record.no} ${record.type} ${record.location} ${record.status} ${record.time}`.toLowerCase().includes(keyword)
    const statusMatched = !warehouseFilters.status || record.status === warehouseFilters.status
    const typeMatched = !warehouseFilters.type || record.type === warehouseFilters.type
    const dateMatched = !warehouseFilters.date || String(record.time).startsWith(warehouseFilters.date)
    return keywordMatched && statusMatched && typeMatched && dateMatched
  })
}

const rows = computed(() => {
  if (props.page === 'warehouse-inbound') return filterWarehouseRows(warehouseInboundRecords.value)
  if (props.page === 'warehouse-outbound') return filterWarehouseRows(warehouseOutboundRecords.value)
  if (props.page !== 'materials') return config.value.rows
  const keyword = materialFilters.keyword.trim().toLowerCase()
  return materials.filter((item) => {
    const matchesKeyword = !keyword || `${item.name} ${item.code}`.toLowerCase().includes(keyword)
    const matchesCategory = !materialFilters.category || item.category === materialFilters.category
    const matchesStatus = !materialFilters.status || item.status === materialFilters.status
    return matchesKeyword && matchesCategory && matchesStatus
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize, rows.value.length))
const visibleStart = computed(() => (rows.value.length ? pageStart.value + 1 : 0))
const pagedRows = computed(() => rows.value.slice(pageStart.value, pageEnd.value))

watch(
  warehouseInboundRecords,
  (nextRecords) => {
    if (syncingInboundRecords.value) {
      syncingInboundRecords.value = false
      return
    }
    saveList('warehouseInboundRecords', nextRecords)
  },
  { deep: true },
)

watch(
  warehouseOutboundRecords,
  (nextRecords) => {
    if (syncingOutboundRecords.value) {
      syncingOutboundRecords.value = false
      return
    }
    saveList('warehouseOutboundRecords', nextRecords)
  },
  { deep: true },
)

watch(rows, () => {
  currentPage.value = 1
})

watch(warehouseFilters, () => {
  currentPage.value = 1
})

watch(totalPages, (pageTotal) => {
  if (currentPage.value > pageTotal) currentPage.value = pageTotal
})

onMounted(async () => {
  stopInboundSubscription = subscribeList('warehouseInboundRecords', (records) => {
    if (JSON.stringify(records) === JSON.stringify(warehouseInboundRecords.value)) return
    syncingInboundRecords.value = true
    warehouseInboundRecords.value = records
  })
  stopOutboundSubscription = subscribeList('warehouseOutboundRecords', (records) => {
    if (JSON.stringify(records) === JSON.stringify(warehouseOutboundRecords.value)) return
    syncingOutboundRecords.value = true
    warehouseOutboundRecords.value = records
  })
  await Promise.all([
    hydrateList('warehouseInboundRecords', warehouseInboundRecords, inboundWarehouse),
    hydrateList('warehouseOutboundRecords', warehouseOutboundRecords, outboundWarehouse),
  ])
  normalizeWarehouseFinalStatus(warehouseInboundRecords, '已入库', 'warehouseInboundRecords')
  normalizeWarehouseFinalStatus(warehouseOutboundRecords, '已出库', 'warehouseOutboundRecords')
})

onBeforeUnmount(() => {
  stopInboundSubscription?.()
  stopOutboundSubscription?.()
})

function normalizeWarehouseFinalStatus(recordList, finalStatus, storageKey) {
  const normalized = recordList.value.map((record) => (record.status === '已完成' ? { ...record, status: finalStatus } : record))
  if (normalized.some((record, index) => record !== recordList.value[index])) {
    recordList.value = normalized
    saveList(storageKey, normalized)
  }
}

function toggleMaterialDropdown(type) {
  materialDropdown.value = materialDropdown.value === type ? '' : type
}

function chooseMaterialFilter(type, value) {
  materialFilters[type] = value
  materialDropdown.value = ''
}

function resetMaterialFilters() {
  globalSearch.value = ''
  materialFilters.keyword = ''
  materialFilters.category = ''
  materialFilters.status = ''
  materialDropdown.value = ''
}

function chooseWarehouseFilter(key, value) {
  warehouseFilters[key] = value
  warehouseFilterOpen.value = ''
}

function resetWarehouseFilters() {
  globalSearch.value = ''
  materialFilters.keyword = ''
  warehouseFilters.status = ''
  warehouseFilters.type = ''
  warehouseFilters.date = ''
  warehouseFilterOpen.value = ''
}

function isRecordSelected(no) {
  return selectedRecordNos.value.includes(no)
}

function toggleRecordSelection(no) {
  selectedRecordNos.value = isRecordSelected(no)
    ? selectedRecordNos.value.filter((item) => item !== no)
    : [...selectedRecordNos.value, no]
}

function startBatchSelection() {
  batchSelectionMode.value = true
  selectedRecordNos.value = []
}

function cancelBatchSelection() {
  batchSelectionMode.value = false
  selectedRecordNos.value = []
}

function toggleAllRecordSelection() {
  selectedRecordNos.value = allVisibleRecordsSelected.value ? [] : rows.value.map((record) => record.no)
}

function requestBatchDelete() {
  if (!selectedRecordNos.value.length) {
    cancelBatchSelection()
    return
  }
  batchDeleteVisible.value = true
}

function handlePrimaryAction() {
  if (isWarehousePage.value) {
    const records = isOutboundPage.value ? warehouseOutboundRecords.value : warehouseInboundRecords.value
    const prefix = isOutboundPage.value ? 'OUT' : 'IN'
    recordForm.no = `${prefix}-2026-0820-${String(records.length + 1).padStart(2, '0')}`
    recordForm.type = isOutboundPage.value ? '销售出库' : '采购入库'
    recordForm.location = ''
    recordForm.note = ''
    recordForm.status = '待复核'
    editingRecordNo.value = ''
    recordError.value = ''
    recordStatusOpen.value = false
    recordDialogVisible.value = true
  }
}

function closeRecordDialog() {
  recordDialogVisible.value = false
  editingRecordNo.value = ''
  recordStatusOpen.value = false
  recordError.value = ''
}

function chooseRecordStatus(status) {
  recordForm.status = status
  recordStatusOpen.value = false
}

function saveRecord() {
  const records = isOutboundPage.value ? warehouseOutboundRecords.value : warehouseInboundRecords.value
  const wasEditing = Boolean(editingRecordNo.value)

  const existingRecord = records.find((item) => item.no === editingRecordNo.value)
  const nextRecord = {
    no: recordForm.no,
    type: recordForm.type,
    location: recordForm.location,
    note: recordForm.note,
    status: recordForm.status,
    time: existingRecord?.time || new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  if (editingRecordNo.value) {
    const nextRecords = records.map((item) => (item.no === editingRecordNo.value ? nextRecord : item))
    if (isOutboundPage.value) {
      warehouseOutboundRecords.value = nextRecords
    } else {
      warehouseInboundRecords.value = nextRecords
    }
  } else if (isOutboundPage.value) {
    warehouseOutboundRecords.value = [nextRecord, ...warehouseOutboundRecords.value]
  } else {
    warehouseInboundRecords.value = [nextRecord, ...warehouseInboundRecords.value]
  }
  closeRecordDialog()
  showAssistantFeedback(wasEditing ? '单据修改已保存。' : '单据已新增。', '操作完成')
}

function openEditRecord(record) {
  selectedRecord.value = null
  editingRecordNo.value = record.no
  recordForm.no = record.no
  recordForm.type = record.type
  recordForm.location = record.location
  recordForm.note = record.note || ''
  recordForm.status = record.status
  recordError.value = ''
  recordStatusOpen.value = false
  recordDialogVisible.value = true
}

function requestDeleteRecord(record) {
  deleteTarget.value = record
}

function confirmDeleteRecord() {
  if (!deleteTarget.value) return
  const records = isOutboundPage.value ? warehouseOutboundRecords.value : warehouseInboundRecords.value
  const nextRecords = records.filter((record) => record.no !== deleteTarget.value.no)
  if (isOutboundPage.value) {
    warehouseOutboundRecords.value = nextRecords
  } else {
    warehouseInboundRecords.value = nextRecords
  }
  if (selectedRecord.value?.no === deleteTarget.value.no) selectedRecord.value = null
  deleteTarget.value = null
  showAssistantFeedback('单据已删除。', '操作完成')
}

function confirmBatchDelete() {
  const selected = new Set(selectedRecordNos.value)
  if (isOutboundPage.value) {
    warehouseOutboundRecords.value = warehouseOutboundRecords.value.filter((record) => !selected.has(record.no))
  } else {
    warehouseInboundRecords.value = warehouseInboundRecords.value.filter((record) => !selected.has(record.no))
  }
  if (selected.has(selectedRecord.value?.no)) selectedRecord.value = null
  selectedRecordNos.value = []
  batchSelectionMode.value = false
  batchDeleteVisible.value = false
  showAssistantFeedback('已删除选中的单据。', '操作完成')
}

const ProgressCell = defineComponent({
  props: {
    value: {
      type: Number,
      required: true,
    },
  },
  setup(progressProps) {
    return () =>
      h('div', { class: 'progress-cell' }, [
        h('div', { class: 'progress-track table-progress' }, [
          h('i', { style: { width: `${progressProps.value}%` } }),
        ]),
        h('span', `${progressProps.value}%`),
      ])
  },
})

function rowKey(row) {
  return row.no || row.code || row.name
}

function formatQty(value) {
  return Number(value).toLocaleString('zh-CN')
}
</script>
