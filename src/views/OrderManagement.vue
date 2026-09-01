<template>
  <section class="user-page order-page">
    <section class="order-list-shell">
      <div class="order-list-toolbar">
        <div class="order-filter-bar">
          <div class="order-filter-fields">
            <div class="filter-field select-field">
              <span>订单状态</span>
              <div class="custom-select">
                <button type="button" aria-label="按订单状态筛选" @click="toggleDropdown('status')">{{ orderStatusFilterLabel }}<i></i></button>
                <div v-if="openDropdown === 'status'" class="select-menu">
                  <button v-for="option in statusOptions" :key="option.value" type="button" :class="{ active: filters.status === option.value }" @click="chooseStatus(option.value)">
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
            <label class="filter-field date-filter-field">
              <span>下单日期</span>
              <input v-model="filters.orderDate" type="date" aria-label="按下单日期筛选" />
            </label>
            <label class="filter-field date-filter-field">
              <span>交付日期</span>
              <input v-model="filters.deliveryDate" type="date" aria-label="按交付日期筛选" />
            </label>
          </div>
          <div class="toolbar-action-group">
            <div class="progress-help">
              <button class="ghost-btn toolbar-icon-btn" type="button" title="进度颜色说明" aria-label="进度颜色说明" @click="progressLegendVisible = !progressLegendVisible"><el-icon><QuestionFilled /></el-icon></button>
              <div v-if="progressLegendVisible" class="progress-legend-menu">
                <span><i class="is-danger"></i>异常</span>
                <span><i class="is-pending"></i>待处理</span>
                <span><i class="is-progress"></i>进行中</span>
                <span><i class="is-shipped"></i>外发中</span>
                <span><i class="is-complete"></i>已完成</span>
              </div>
            </div>
            <button class="ghost-btn toolbar-icon-btn" type="button" title="重置筛选" aria-label="重置筛选" @click="resetFilters"><el-icon><Refresh /></el-icon></button>
            <button v-if="!batchSelectionMode" class="danger-outline-btn toolbar-icon-btn" type="button" title="批量删除" aria-label="批量删除" @click="startBatchSelection"><el-icon><Delete /></el-icon></button>
            <template v-else><button class="danger-outline-btn toolbar-icon-btn" type="button" :title="selectedOrderNos.length ? '删除已选' : '退出批量选择'" :aria-label="selectedOrderNos.length ? '删除已选' : '退出批量选择'" @click="requestBatchDelete"><el-icon><Delete /></el-icon></button></template>
            <button class="primary-btn toolbar-icon-btn order-create-btn" type="button" title="新增订单" aria-label="新增订单" @click="openCreateOrder"><el-icon><Plus /></el-icon></button>
          </div>
        </div>
      </div>
      <div class="table-wrap order-list-wrap">
        <table v-table-overflow class="order-list-table" :class="{ 'has-selection': batchSelectionMode }">
          <thead>
            <tr>
              <th v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="allFilteredOrdersSelected" aria-label="全选当前筛选结果" @change="toggleAllOrderSelection" /></th>
              <th>订单</th>
              <th>产品</th>
              <th>数量</th>
              <th>交付日期</th>
              <th>生产进度</th>
              <th>订单状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in pagedOrders"
              :key="order.no"
              :class="{ selected: selectedOrder?.no === order.no }"
              @click="selectOrder(order)"
            >
              <td v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="isOrderSelected(order.no)" :aria-label="`选择 ${order.no}`" @click.stop="toggleOrderSelection(order.no)" /></td>
              <td>
                <div class="main-cell order-cell-id">{{ order.no }}</div>
                <div class="sub-cell">{{ order.customer }}</div>
              </td>
              <td>
                <div class="main-cell">{{ order.productName }}</div>
                <div class="sub-cell">{{ order.factoryPartNo }}</div>
              </td>
              <td>
                <div class="order-quantity-summary">
                  <strong>{{ formatQty(order.deliveredQty) }} / {{ formatQty(order.orderQty) }}</strong>
                </div>
                <div class="order-quantity-track" aria-hidden="true"><i :style="{ width: `${deliveryPercent(order)}%` }"></i></div>
                <small class="order-quantity-note" :class="{ complete: !Number(order.pendingQty || 0) }">{{ pendingQtyLabel(order.pendingQty) }}</small>
              </td>
              <td>
                <div class="main-cell">{{ order.deliveryDate }}</div>
                <div class="sub-cell">下单 {{ order.orderDate }}</div>
              </td>
              <td class="order-stage-cell" title="点击工序可直接切换进度" @click.stop>
                <ProductionStepper :stages="orderStages(order)" interactive @stage-select="openProgressEditor(order, $event)" />
              </td>
              <td><span class="order-status-badge table-status" :class="orderStatusTone(order.status)">{{ order.status }}</span></td>
            </tr>
            <tr v-if="!pagedOrders.length">
              <td class="empty-row" :colspan="batchSelectionMode ? 7 : 6">没有匹配的订单</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-pagination order-pagination">
        <p>显示 {{ visibleStart }}-{{ pageEnd }} 条，共 {{ filteredOrders.length }} 个订单</p>
        <div class="pager">
          <button type="button" :disabled="currentPage === 1" @click="currentPage -= 1">上一页</button>
          <button v-for="page in totalPages" :key="page" type="button" :class="{ active: page === currentPage }" @click="currentPage = page">{{ page }}</button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage += 1">下一页</button>
        </div>
      </div>
    </section>

    <div v-if="selectedOrder || dialogVisible" class="order-preview-mask" @click.self="closeOrderModal">
      <aside class="order-detail-panel order-preview-card" :class="{ 'is-editing': dialogVisible }">
        <template v-if="selectedOrder && !dialogVisible">
          <div class="order-detail-head">
            <div>
              <span class="order-status-badge" :class="orderStatusTone(selectedOrder.status)">{{ selectedOrder.status }}</span>
              <h3>{{ selectedOrder.no }}</h3>
              <p>{{ selectedOrder.customer }} · {{ selectedOrder.productName }}</p>
            </div>
            <div class="preview-actions">
              <button class="ghost-btn" type="button" @click="openEditOrder(selectedOrder)">编辑</button>
              <button class="preview-close" type="button" aria-label="关闭订单预览" @click="closePreview">×</button>
            </div>
          </div>

          <div class="drawer-overview-grid">
            <div><span>客户</span><strong>{{ selectedOrder.customer }}</strong></div>
            <div><span>产品料号</span><strong>{{ selectedOrder.factoryPartNo }}</strong></div>
            <div><span>交付数量</span><strong>{{ formatQty(selectedOrder.deliveredQty) }} / {{ formatQty(selectedOrder.orderQty) }}</strong></div>
            <div><span>交付日期</span><strong>{{ selectedOrder.deliveryDate }}</strong></div>
          </div>

          <div class="detail-section production-detail-section">
            <h4>生产进度</h4>
            <ProductionStepper :stages="orderStages(selectedOrder)" />
          </div>

          <div class="detail-section">
            <h4>订单信息</h4>
            <div class="detail-grid">
              <div><span>客户料号</span><strong>{{ selectedOrder.customerPartNo }}</strong></div>
              <div><span>订单日期</span><strong>{{ selectedOrder.orderDate }}</strong></div>
              <div><span>欠交数量</span><strong>{{ pendingQtyText(selectedOrder.pendingQty) }}</strong></div>
            </div>
          </div>

          <div v-if="selectedOrder.shortageDetails && selectedOrder.shortageDetails !== '无'" class="detail-section">
            <h4>欠料明细</h4>
            <p class="detail-note">{{ selectedOrder.shortageDetails }}</p>
          </div>

          <div v-if="selectedOrder.remark && selectedOrder.remark !== '无'" class="detail-section">
            <h4>备注</h4>
            <p class="detail-note">{{ selectedOrder.remark }}</p>
          </div>
        </template>

        <template v-else>
        <form class="dialog-form order-form order-edit-form" @submit.prevent="saveOrder">
          <div class="dialog-head">
            <div>
              <p class="section-kicker">订单资料</p>
              <h3>{{ editingNo ? `编辑 ${editingNo}` : '新增订单' }}</h3>
            </div>
            <button class="dialog-close" type="button" aria-label="关闭" @click="closeOrderModal">×</button>
          </div>

          <div ref="orderFormBody" class="order-form-body">
          <section class="form-section">
            <h4>基础信息</h4>
            <div class="form-grid three">
              <label class="form-control">
                <span>订单号</span>
                <input v-model.trim="orderForm.no" type="text" placeholder="例如 SO-2026-1049" />
              </label>
              <label class="form-control customer-picker">
                <span>客户</span>
                <input
                  v-model.trim="orderForm.customer"
                  type="text"
                  autocomplete="off"
                  placeholder="输入名称、联系人或手机号快速选择"
                  @focus="customerPickerOpen = true"
                  @input="customerPickerOpen = true"
                  @blur="closeCustomerPicker"
                />
                <div v-if="customerPickerOpen && customerSuggestions.length" class="customer-suggestion-list">
                  <button
                    v-for="customer in customerSuggestions"
                    :key="customer.id || `${customer.name}-${customer.phone}`"
                    type="button"
                    class="customer-suggestion"
                    @mousedown.prevent="chooseCustomer(customer)"
                  >
                    <strong>{{ customer.name || '未命名客户' }}</strong>
                    <span>{{ customer.contact || '未填写联系人' }}{{ customer.phone ? ` · ${customer.phone}` : '' }}</span>
                  </button>
                </div>
              </label>
              <label class="form-control">
                <span>产品名称</span>
                <input v-model.trim="orderForm.productName" type="text" placeholder="例如 304 不锈钢铰链" />
              </label>
              <label class="form-control">
                <span>客户料号</span>
                <input v-model.trim="orderForm.customerPartNo" type="text" placeholder="客户提供的料号" />
              </label>
              <label class="form-control">
                <span>本厂料号</span>
                <input v-model.trim="orderForm.factoryPartNo" type="text" placeholder="工厂内部料号" />
              </label>
            </div>
          </section>

          <section class="form-section">
            <h4>日期与数量</h4>
            <div class="form-grid three">
              <label class="form-control">
                <span>订单日期</span>
                <input v-model="orderForm.orderDate" type="date" />
              </label>
              <label class="form-control">
                <span>交付日期</span>
                <input v-model="orderForm.deliveryDate" type="date" />
              </label>
              <label class="form-control">
                <span>订单数量</span>
                <input v-model.number="orderForm.orderQty" type="number" min="0" />
              </label>
              <label class="form-control">
                <span>已交付</span>
                <input v-model.number="orderForm.deliveredQty" type="number" min="0" />
              </label>
              <div class="form-control readonly-control">
                <span>欠交数量</span>
                <strong>{{ pendingQtyText(formPendingQty) }}</strong>
              </div>
              <div class="form-control">
                <span>订单状态</span>
                <div class="custom-select">
                  <button type="button" @click="toggleDropdown('formStatus')">
                    {{ orderForm.status }}
                    <i></i>
                  </button>
                  <div v-if="openDropdown === 'formStatus'" class="select-menu">
                    <button
                      v-for="option in formStatusOptions"
                      :key="option.value"
                      type="button"
                      :class="{ active: orderForm.status === option.value }"
                      @click="chooseOrderField('status', option.value)"
                    >
                      {{ option.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="form-section" data-section="progress">
            <h4>执行进度</h4>
            <div class="form-grid four">
              <div v-for="item in statusFields" :key="item.key" class="form-control">
                <span>{{ item.label }}</span>
                <div class="custom-select">
                  <button type="button" @click="toggleDropdown(item.key)">
                    {{ orderForm[item.key] }}
                    <i></i>
                  </button>
                  <div v-if="openDropdown === item.key" class="select-menu">
                    <button
                      v-for="option in stageStatusOptions(item.key)"
                      :key="option"
                      type="button"
                      :class="{ active: orderForm[item.key] === option }"
                      @click="chooseOrderField(item.key, option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <h4>欠料与备注</h4>
            <div class="form-grid two">
              <label class="form-control">
                <span>欠料明细</span>
                <textarea v-model.trim="orderForm.shortageDetails" rows="4" placeholder="例如 铝型材缺 120 根，已生成补货提醒"></textarea>
              </label>
              <label class="form-control">
                <span>备注</span>
                <textarea v-model.trim="orderForm.remark" rows="4" placeholder="填写交付要求、客户提醒、内部备注"></textarea>
              </label>
            </div>
          </section>

          <p v-if="formError" class="form-error">{{ formError }}</p>
          </div>

          <div class="dialog-actions">
            <button
              v-if="editingNo"
              class="danger-outline-btn"
              type="button"
              @click="deleteOrder(orderList.find((item) => item.no === editingNo))"
            >
              删除订单
            </button>
            <button class="primary-btn" type="submit">{{ editingNo ? '保存修改' : '确认新增' }}</button>
          </div>
        </form>
        </template>
      </aside>
    </div>

    <AppConfirmDialog
      v-if="deleteTarget"
      title="删除订单"
      :message="`确认删除「${deleteTarget.no}」吗？删除后无法恢复该订单资料。`"
      confirm-text="删除订单"
      @cancel="deleteTarget = null"
      @confirm="confirmDeleteOrder"
    />

    <AppConfirmDialog
      v-if="batchDeleteVisible"
      title="批量删除订单"
      :message="`确认删除已选择的 ${selectedOrderNos.length} 个订单吗？删除后无法恢复。`"
      confirm-text="批量删除"
      @cancel="batchDeleteVisible = false"
      @confirm="confirmBatchDelete"
    />
  </section>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Delete, Plus, QuestionFilled, Refresh } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'
import ProductionStepper from '../components/ProductionStepper.vue'
import { buildDemoCustomers } from '../data/demoRecords'
import { orders as mockOrders } from '../data/mock'
import { hydrateList, loadList, saveList, subscribeList } from '../services/storage'
import { showAssistantFeedback } from '../services/assistantFeedback'

const orderList = ref(loadList('orders', mockOrders))
const customerList = ref(loadList('customers', buildDemoCustomers(20)))
const route = useRoute()
const pageSize = 10
const currentPage = ref(1)
const selectedNo = ref('')
const openDropdown = ref('')
const dialogVisible = ref(false)
const editingNo = ref('')
const formError = ref('')
const orderFormBody = ref(null)
const progressLegendVisible = ref(false)
const customerPickerOpen = ref(false)
const syncingOrderList = ref(false)
let stopOrderSubscription
let stopCustomerSubscription
const globalSearch = inject('globalSearch', ref(''))

const filters = reactive({
  keyword: '',
  status: '',
  orderDate: '',
  deliveryDate: '',
})

const deleteTarget = ref(null)
const selectedOrderNos = ref([])
const batchSelectionMode = ref(false)
const batchDeleteVisible = ref(false)

watch(
  globalSearch,
  (value) => {
    filters.keyword = value || ''
  },
  { immediate: true },
)

const orderForm = reactive({
  no: '',
  customer: '',
  customerPartNo: '',
  factoryPartNo: '',
  productName: '',
  orderDate: '',
  deliveryDate: '',
  orderQty: 0,
  deliveredQty: 0,
  feedingProgress: '待投料',
  materialProgress: '待备料',
  outsourcingProgress: '不适用',
  shortageDetails: '',
  installationProgress: '待安装',
  remark: '',
  status: '生产中',
})

const customerSuggestions = computed(() => {
  const keyword = orderForm.customer.trim().toLocaleLowerCase()
  const candidates = customerList.value.filter((customer) => customer?.name || customer?.contact || customer?.phone)
  const matched = keyword
    ? candidates.filter((customer) => [customer.name, customer.contact, customer.phone]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(keyword)))
    : candidates

  return matched.slice(0, 6)
})

const statusOptions = [
  { label: '全部订单状态', value: '' },
  { label: '生产中', value: '生产中' },
  { label: '欠料', value: '欠料' },
  { label: '外发中', value: '外发中' },
  { label: '安装中', value: '安装中' },
  { label: '待交付', value: '待交付' },
  { label: '异常', value: '异常' },
  { label: '已完成', value: '已完成' },
]

const formStatusOptions = statusOptions.filter((item) => item.value)

const statusFields = [
  { key: 'feedingProgress', label: '投料' },
  { key: 'materialProgress', label: '备料' },
  { key: 'outsourcingProgress', label: '外发' },
  { key: 'installationProgress', label: '安装' },
]

const stageStatusConfig = {
  feedingProgress: ['待投料', '投料中', '已投料', '异常'],
  materialProgress: ['待备料', '备料中', '已备料', '异常'],
  outsourcingProgress: ['不适用', '待外发', '外发中', '已回厂', '异常'],
  installationProgress: ['待安装', '安装中', '已安装', '异常'],
}

const filteredOrders = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return orderList.value.filter((order) => {
    const searchText = [
      order.no,
      order.customer,
      order.customerPartNo,
      order.factoryPartNo,
      order.productName,
      order.shortageDetails,
    ]
      .join(' ')
      .toLowerCase()
    const keywordMatched = !keyword || searchText.includes(keyword)
    const statusMatched = !filters.status || order.status === filters.status
    const orderDateMatched = !filters.orderDate || order.orderDate === filters.orderDate
    const deliveryDateMatched = !filters.deliveryDate || order.deliveryDate === filters.deliveryDate
    return keywordMatched && statusMatched && orderDateMatched && deliveryDateMatched
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize, filteredOrders.value.length))
const visibleStart = computed(() => (filteredOrders.value.length ? pageStart.value + 1 : 0))
const pagedOrders = computed(() => filteredOrders.value.slice(pageStart.value, pageEnd.value))
const allFilteredOrdersSelected = computed(() => filteredOrders.value.length > 0 && filteredOrders.value.every((order) => isOrderSelected(order.no)))

const selectedOrder = computed(() => {
  return orderList.value.find((order) => order.no === selectedNo.value) || null
})

const statusLabel = computed(() => statusOptions.find((item) => item.value === filters.status)?.label || '全部订单状态')
const orderStatusFilterLabel = computed(() => filters.status ? statusLabel.value : '订单状态')
const formPendingQty = computed(() => Math.max(Number(orderForm.orderQty || 0) - Number(orderForm.deliveredQty || 0), 0))
const derivedFormStatus = computed(() => deriveOrderStatus(orderForm))


watch(
  orderList,
  (nextOrders) => {
    if (syncingOrderList.value) {
      syncingOrderList.value = false
      return
    }
    saveList('orders', nextOrders)
  },
  { deep: true },
)

watch(filters, () => {
  currentPage.value = 1
})

watch(totalPages, (pageTotal) => {
  if (currentPage.value > pageTotal) currentPage.value = pageTotal
})

onMounted(async () => {
  stopOrderSubscription = subscribeList('orders', (records) => {
    if (JSON.stringify(records) === JSON.stringify(orderList.value)) return
    syncingOrderList.value = true
    orderList.value = records
  })
  stopCustomerSubscription = subscribeList('customers', (records) => {
    customerList.value = records
  })
  await hydrateList('orders', orderList, mockOrders)
  const normalizedOrders = orderList.value.map((order) => normalizeOrder(order))
  if (normalizedOrders.some((order, index) => JSON.stringify(order) !== JSON.stringify(orderList.value[index]))) {
    orderList.value = normalizedOrders
  }
})

onBeforeUnmount(() => {
  stopOrderSubscription?.()
  stopCustomerSubscription?.()
})

watch(
  [() => route.query.order, orderList],
  ([orderNo]) => {
    if (!orderNo) return
    const target = orderList.value.find((order) => order.no === String(orderNo))
    if (target) selectedNo.value = target.no
  },
  { deep: true, immediate: true },
)

function formatQty(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function pendingQtyText(value) {
  const qty = Number(value || 0)
  return qty > 0 ? formatQty(qty) : '已交齐'
}

function pendingQtyLabel(value) {
  const qty = Number(value || 0)
  return qty > 0 ? `欠交 ${formatQty(qty)}` : '已交齐'
}

function orderStatusTone(status) {
  if (status === '已完成') return 'is-complete'
  if (status === '欠料' || status === '异常') return 'is-danger'
  if (status === '生产中' || status === '外发中' || status === '安装中') return 'is-progress'
  return 'is-warning'
}

function deliveryPercent(order) {
  const total = Number(order.orderQty || 0)
  if (!total) return 0
  return Math.min(100, Math.round((Number(order.deliveredQty || 0) / total) * 100))
}

function orderStages(order) {
  return [
    stageItem('feedingProgress', '投料', order.feedingProgress),
    stageItem('materialProgress', '备料', order.materialProgress),
    stageItem('outsourcingProgress', '外发', order.outsourcingProgress),
    stageItem('installationProgress', '安装', order.installationProgress),
  ]
}

function stageItem(key, fullLabel, value) {
  const toneByStatus = { 异常: 'danger', 不适用: 'complete', 待投料: 'pending', 待备料: 'pending', 待外发: 'pending', 待安装: 'pending', 投料中: 'progress', 备料中: 'progress', 外发中: 'shipped', 安装中: 'progress', 已投料: 'complete', 已备料: 'complete', 已回厂: 'complete', 已安装: 'complete' }
  return { key, label: fullLabel, fullLabel, value, tone: toneByStatus[value] || 'pending' }
}

function stageStatusOptions(key) {
  return stageStatusConfig[key] || []
}

function normalizeStage(key, value) {
  const stageValue = String(value || '')
  if (stageStatusConfig[key]?.includes(stageValue)) return stageValue
  const legacyMap = {
    feedingProgress: { '待处理': '待投料', '进行中': '投料中', '已发货': '已投料', '已送达': '已投料', '已完成': '已投料' },
    materialProgress: { '待处理': '待备料', '进行中': '备料中', '已发货': '已备料', '已送达': '已备料', '已完成': '已备料' },
    outsourcingProgress: { '待处理': '不适用', '进行中': '外发中', '已发货': '外发中', '已送达': '已回厂', '已完成': '已回厂' },
    installationProgress: { '待处理': '待安装', '进行中': '安装中', '已发货': '安装中', '已送达': '已安装', '已完成': '已安装' },
  }
  return legacyMap[key]?.[stageValue] || stageStatusConfig[key]?.[0] || '待处理'
}

function isStageComplete(key, value) {
  return ['已投料', '已备料', '已回厂', '已安装', '不适用'].includes(normalizeStage(key, value))
}

function deriveOrderStatus(payload) {
  const stages = statusFields.map((field) => [field.key, normalizeStage(field.key, payload[field.key])])
  if (stages.some(([, value]) => value === '异常')) return '异常'
  if (payload.shortageDetails && payload.shortageDetails !== '无') return '欠料'
  const allProcessesComplete = stages.every(([key, value]) => isStageComplete(key, value))
  if (allProcessesComplete && Number(payload.deliveredQty || 0) >= Number(payload.orderQty || 0)) return '已完成'
  if (normalizeStage('installationProgress', payload.installationProgress) === '安装中') return '安装中'
  if (normalizeStage('outsourcingProgress', payload.outsourcingProgress) === '外发中') return '外发中'
  if (allProcessesComplete) return '待交付'
  return '生产中'
}

function normalizeOrder(payload) {
  const orderQty = Number(payload.orderQty || 0)
  const deliveredQty = Number(payload.deliveredQty || 0)
  return {
    no: payload.no,
    customer: payload.customer,
    customerPartNo: payload.customerPartNo,
    factoryPartNo: payload.factoryPartNo,
    productName: payload.productName,
    orderDate: payload.orderDate,
    deliveryDate: payload.deliveryDate,
    orderQty,
    deliveredQty,
    pendingQty: Math.max(orderQty - deliveredQty, 0),
    feedingProgress: normalizeStage('feedingProgress', payload.feedingProgress),
    materialProgress: normalizeStage('materialProgress', payload.materialProgress),
    outsourcingProgress: normalizeStage('outsourcingProgress', payload.outsourcingProgress),
    shortageDetails: payload.shortageDetails || '无',
    installationProgress: normalizeStage('installationProgress', payload.installationProgress),
    remark: payload.remark || '无',
    status: formStatusOptions.some((item) => item.value === payload.status) ? payload.status : deriveOrderStatus(payload),
  }
}

function selectOrder(order) {
  selectedNo.value = order.no
}

function closePreview() {
  selectedNo.value = ''
  editingNo.value = ''
}

function resetFilters() {
  globalSearch.value = ''
  filters.keyword = ''
  filters.status = ''
  filters.orderDate = ''
  filters.deliveryDate = ''
  openDropdown.value = ''
}

function toggleDropdown(type) {
  openDropdown.value = openDropdown.value === type ? '' : type
}

function chooseStatus(value) {
  filters.status = value
  openDropdown.value = ''
}

function chooseOrderField(key, value) {
  orderForm[key] = value
  openDropdown.value = ''
}

function chooseCustomer(customer) {
  orderForm.customer = customer.name || ''
  customerPickerOpen.value = false
}

function closeCustomerPicker() {
  window.setTimeout(() => {
    customerPickerOpen.value = false
  }, 120)
}

function resetForm() {
  orderForm.no = `SO-2026-${String(1049 + orderList.value.length).padStart(4, '0')}`
  orderForm.customer = ''
  orderForm.customerPartNo = ''
  orderForm.factoryPartNo = ''
  orderForm.productName = ''
  orderForm.orderDate = '2026-05-16'
  orderForm.deliveryDate = '2026-05-25'
  orderForm.orderQty = 0
  orderForm.deliveredQty = 0
  orderForm.feedingProgress = '待投料'
  orderForm.materialProgress = '待备料'
  orderForm.outsourcingProgress = '不适用'
  orderForm.shortageDetails = '无'
  orderForm.installationProgress = '待安装'
  orderForm.remark = '无'
  orderForm.status = '生产中'
  formError.value = ''
  openDropdown.value = ''
  customerPickerOpen.value = false
}

function fillForm(order) {
  orderForm.no = order.no
  orderForm.customer = order.customer
  orderForm.customerPartNo = order.customerPartNo
  orderForm.factoryPartNo = order.factoryPartNo
  orderForm.productName = order.productName
  orderForm.orderDate = order.orderDate
  orderForm.deliveryDate = order.deliveryDate
  orderForm.orderQty = order.orderQty
  orderForm.deliveredQty = order.deliveredQty
  orderForm.feedingProgress = normalizeStage('feedingProgress', order.feedingProgress)
  orderForm.materialProgress = normalizeStage('materialProgress', order.materialProgress)
  orderForm.outsourcingProgress = normalizeStage('outsourcingProgress', order.outsourcingProgress)
  orderForm.shortageDetails = order.shortageDetails
  orderForm.installationProgress = normalizeStage('installationProgress', order.installationProgress)
  orderForm.remark = order.remark
  orderForm.status = order.status || deriveOrderStatus(orderForm)
}

function openCreateOrder() {
  selectedNo.value = ''
  editingNo.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEditOrder(order) {
  selectedNo.value = order.no
  editingNo.value = order.no
  fillForm(order)
  formError.value = ''
  openDropdown.value = ''
  customerPickerOpen.value = false
  dialogVisible.value = true
}

async function openProgressEditor(order, stage) {
  openEditOrder(order)
  await nextTick()
  orderFormBody.value?.querySelector('[data-section="progress"]')?.scrollIntoView({ block: 'start' })
  openDropdown.value = stage.key
}

function closeDialog() {
  dialogVisible.value = false
  openDropdown.value = ''
  customerPickerOpen.value = false
  if (!editingNo.value) selectedNo.value = ''
}

function closeOrderModal() {
  dialogVisible.value = false
  selectedNo.value = ''
  editingNo.value = ''
  formError.value = ''
  openDropdown.value = ''
}

function validateForm() {
  return ''
}

function saveOrder() {
  const error = validateForm()
  if (error) {
    formError.value = error
    return
  }

  const nextOrder = normalizeOrder(orderForm)
  if (editingNo.value) {
    orderList.value = orderList.value.map((order) => (order.no === editingNo.value ? nextOrder : order))
  } else {
    orderList.value = [nextOrder, ...orderList.value]
    currentPage.value = 1
  }
  selectedNo.value = nextOrder.no
  dialogVisible.value = false
  openDropdown.value = ''
  showAssistantFeedback(editingNo.value ? '订单修改已保存。' : '订单已新增。', '操作完成')
}

function deleteOrder(order) {
  deleteTarget.value = order
}

function isOrderSelected(no) {
  return selectedOrderNos.value.includes(no)
}

function toggleOrderSelection(no) {
  selectedOrderNos.value = isOrderSelected(no)
    ? selectedOrderNos.value.filter((item) => item !== no)
    : [...selectedOrderNos.value, no]
}

function toggleAllOrderSelection() {
  selectedOrderNos.value = allFilteredOrdersSelected.value ? [] : filteredOrders.value.map((order) => order.no)
}

function startBatchSelection() {
  batchSelectionMode.value = true
  selectedOrderNos.value = []
}

function cancelBatchSelection() {
  batchSelectionMode.value = false
  selectedOrderNos.value = []
}

function requestBatchDelete() {
  if (!selectedOrderNos.value.length) {
    cancelBatchSelection()
    return
  }
  batchDeleteVisible.value = true
}

function confirmDeleteOrder() {
  if (!deleteTarget.value) return
  const orderNo = deleteTarget.value.no
  orderList.value = orderList.value.filter((item) => item.no !== orderNo)
  if (selectedNo.value === orderNo) selectedNo.value = orderList.value[0]?.no || ''
  deleteTarget.value = null
  showAssistantFeedback('订单已删除。', '操作完成')
}

function confirmBatchDelete() {
  const selected = new Set(selectedOrderNos.value)
  orderList.value = orderList.value.filter((item) => !selected.has(item.no))
  if (selected.has(selectedNo.value)) selectedNo.value = ''
  selectedOrderNos.value = []
  batchSelectionMode.value = false
  batchDeleteVisible.value = false
  showAssistantFeedback('已删除选中的订单。', '操作完成')
}
</script>
