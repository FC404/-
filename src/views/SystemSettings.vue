<template>
  <section class="system-page">
    <section class="system-status-grid">
      <article class="system-status-card">
        <span>服务状态</span>
        <strong :class="{ offline: !health }">{{ health ? '运行中' : '未连接' }}</strong>
        <p>{{ health ? `最近检查 ${checkedAt}` : '当前仅使用浏览器本地数据' }}</p>
      </article>
      <article v-for="item in collectionStats" :key="item.label" class="system-status-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.note }}</p>
      </article>
    </section>

    <section class="system-panel">
      <header>
        <div>
          <span>Data Maintenance</span>
          <h2>备份与恢复</h2>
        </div>
        <button class="ghost-btn" type="button" @click="refreshHealth">刷新状态</button>
      </header>

      <div class="system-action-grid">
        <article>
          <strong>导出业务备份</strong>
          <p>导出订单、物料、客户、用户和仓库流水，用于交付前留档或迁移到另一台电脑。</p>
          <button class="primary-btn" type="button" :disabled="busy" @click="downloadBackup">导出备份</button>
        </article>

        <article>
          <strong>导入业务备份</strong>
          <p>从之前导出的 JSON 文件恢复数据。导入前服务端会自动保存一份当前数据备份。</p>
          <label class="ghost-btn system-file-action">
            选择备份文件
            <input type="file" accept="application/json,.json" @change="handleImport" />
          </label>
        </article>

        <article>
          <strong>恢复初始数据</strong>
          <p>把系统恢复成 V1 初始试用数据。适合演示前清理测试数据。</p>
          <button class="ghost-btn danger-action" type="button" :disabled="busy" @click="resetData">恢复初始数据</button>
        </article>
      </div>

      <p v-if="message" class="system-message" :class="{ error: messageType === 'error' }">{{ message }}</p>
    </section>

    <AppConfirmDialog
      v-if="resetConfirmVisible"
      title="恢复初始数据"
      message="确认恢复 V1 初始试用数据吗？当前数据会先自动备份。"
      confirm-text="确认恢复"
      @cancel="resetConfirmVisible = false"
      @confirm="confirmResetData"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'
import { exportBackup, getServerHealth, importBackup, resetServerData } from '../services/storage'

const busy = ref(false)
const health = ref(null)
const checkedAt = ref('')
const message = ref('')
const messageType = ref('info')
const resetConfirmVisible = ref(false)

const labels = {
  orders: '订单',
  materials: '物料',
  customers: '客户',
  users: '用户',
  warehouseInboundRecords: '入库流水',
  warehouseOutboundRecords: '出库流水',
}

const collectionStats = computed(() => {
  const collections = health.value?.collections || {}
  return Object.entries(labels).map(([key, label]) => ({
    label,
    value: `${Number(collections[key] || 0).toLocaleString('zh-CN')} 条`,
    note: collectionNote(key),
  }))
})

onMounted(refreshHealth)

async function refreshHealth() {
  health.value = await getServerHealth()
  checkedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

function collectionNote(key) {
  const notes = {
    orders: '订单执行与交付记录',
    materials: '库存与补货数据',
    customers: '客户资料库',
    users: '账号和角色配置',
    warehouseInboundRecords: '采购、退料与完工入库记录',
    warehouseOutboundRecords: '销售、领料与委外出库记录',
  }
  return notes[key]
}

function setMessage(text, type = 'info') {
  message.value = text
  messageType.value = type
}

async function downloadBackup() {
  busy.value = true
  setMessage('')
  try {
    const payload = await exportBackup()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `工仓链备份_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('备份已导出。')
  } catch (error) {
    setMessage(error.message || '导出失败，请确认服务端已启动。', 'error')
  } finally {
    busy.value = false
  }
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  busy.value = true
  setMessage('')
  try {
    const text = await file.text()
    const payload = JSON.parse(text)
    const result = await importBackup(payload)
    await refreshHealth()
    setMessage(`导入完成，服务端已自动生成导入前备份：${result.backupFile}`)
  } catch (error) {
    setMessage(error.message || '导入失败，请检查备份文件。', 'error')
  } finally {
    busy.value = false
  }
}

async function resetData() {
  resetConfirmVisible.value = true
}

async function confirmResetData() {
  resetConfirmVisible.value = false
  busy.value = true
  setMessage('')
  try {
    const result = await resetServerData()
    await refreshHealth()
    setMessage(`已恢复初始数据，原数据备份为：${result.backupFile}`)
  } catch (error) {
    setMessage(error.message || '恢复失败，请确认服务端已启动。', 'error')
  } finally {
    busy.value = false
  }
}
</script>
