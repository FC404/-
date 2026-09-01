<template>
  <section class="user-page production-board-page">
    <section class="production-kanban-grid">
      <article v-for="column in boardColumns" :key="column.key" class="production-kanban-column">
        <header class="production-kanban-column-head">
          <div>
            <span class="production-column-dot" :class="`is-${column.tone}`"></span>
            <h2>{{ column.label }}</h2>
          </div>
          <strong>{{ column.orders.length }}</strong>
        </header>

        <div class="production-task-list">
          <article
            v-for="order in column.orders"
            :key="order.no"
            class="production-task-card"
            tabindex="0"
            role="button"
            @click="openOrder(order)"
            @keydown.enter="openOrder(order)"
          >
            <div class="production-task-card-head">
              <strong>{{ order.no }}</strong>
              <span :class="orderStatusTone(order.status)">{{ order.status }}</span>
            </div>
            <h3>{{ order.productName }}</h3>
            <p>{{ order.customer }}</p>
            <div class="production-task-meta">
              <span>{{ formatQty(order.deliveredQty) }} / {{ formatQty(order.orderQty) }}</span>
              <span>交付 {{ order.deliveryDate }}</span>
            </div>
            <ProductionStepper :stages="orderStages(order)" />
          </article>
          <div v-if="!column.orders.length" class="production-empty-column">暂无订单</div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ProductionStepper from '../components/ProductionStepper.vue'
import { orders as mockOrders } from '../data/mock'
import { hydrateList, loadList, subscribeList } from '../services/storage'

const router = useRouter()
const orderList = ref(loadList('orders', mockOrders))
let stopOrderSubscription

const boardColumns = computed(() => {
  const buckets = [
    { key: 'feeding', label: '投料', tone: 'pending', orders: [] },
    { key: 'material', label: '备料', tone: 'progress', orders: [] },
    { key: 'outsourcing', label: '外发', tone: 'progress', orders: [] },
    { key: 'installation', label: '安装', tone: 'progress', orders: [] },
  ]

  orderList.value.forEach((order) => {
    if (order.status !== '已完成') buckets[columnForOrder(order)].orders.push(order)
  })
  return buckets
})

onMounted(() => {
  stopOrderSubscription = subscribeList('orders', (records) => {
    orderList.value = records
  })
  hydrateList('orders', orderList, mockOrders)
})

onBeforeUnmount(() => stopOrderSubscription?.())

function formatQty(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function isComplete(value) {
  return ['已投料', '已备料', '已回厂', '已安装', '不适用', '已送达', '已完成', '正常'].includes(value)
}

function columnForOrder(order) {
  const stages = [order.feedingProgress, order.materialProgress, order.outsourcingProgress, order.installationProgress]
  const activeStage = stages.findIndex((value) => ['投料中', '备料中', '外发中', '安装中', '异常'].includes(value))
  if (activeStage !== -1) return activeStage

  const pendingStage = stages.findIndex((value) => !isComplete(value))
  return pendingStage === -1 ? 3 : pendingStage
}

function orderStages(order) {
  return [
    stageItem('feeding', '投料', order.feedingProgress),
    stageItem('material', '备料', order.materialProgress),
    stageItem('outsourcing', '外发', order.outsourcingProgress),
    stageItem('installation', '安装', order.installationProgress),
  ]
}

function stageItem(label, fullLabel, value) {
  if (isComplete(value)) return { label, fullLabel, value, short: '完成', tone: 'complete' }
  if (value === '异常') return { label, fullLabel, value, short: '异常', tone: 'danger' }
  if (['待投料', '待备料', '待外发', '待安装', '待处理', '未开启', '欠料'].includes(value)) return { label, fullLabel, value, short: '待办', tone: 'pending' }
  return { label, fullLabel, value, short: '进行', tone: value === '外发中' ? 'shipped' : 'progress' }
}

function orderStatusTone(status) {
  if (status === '已完成') return 'is-complete'
  if (status === '欠料' || status === '异常') return 'is-danger'
  if (status === '生产中' || status === '外发中' || status === '安装中') return 'is-progress'
  return 'is-warning'
}

function openOrder(order) {
  router.push({ path: '/orders', query: { order: order.no } })
}
</script>
