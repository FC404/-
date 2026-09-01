<template>
  <main class="mobile-stage">
    <section class="mobile-app mobile-scan-page">
      <header class="mobile-page-bar">
        <button class="mobile-icon-btn" type="button" title="返回登录" @click="router.push('/mobile/login')">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <strong>扫码出入库</strong>
        <button class="mobile-icon-btn" type="button" title="操作记录" @click="showHistory = !showHistory">
          <el-icon><Clock /></el-icon>
        </button>
      </header>

      <section v-if="showHistory" class="mobile-history-panel">
        <div class="mobile-section-title">
          <div>
            <strong>最近操作</strong>
            <span>仅保存在当前设备</span>
          </div>
          <button type="button" @click="showHistory = false">收起</button>
        </div>
        <div v-if="records.length" class="mobile-history-list">
          <article v-for="record in records" :key="record.id">
            <span :class="record.type">{{ record.type === 'in' ? '入库' : '出库' }}</span>
            <div>
              <strong>{{ record.material }}</strong>
              <small>{{ record.code }} · {{ record.time }}</small>
            </div>
            <b>{{ record.type === 'in' ? '+' : '-' }}{{ record.qty }}</b>
          </article>
        </div>
        <p v-else class="mobile-empty-text">还没有出入库记录</p>
      </section>

      <section class="mobile-scanner-area" :class="{ active: cameraActive }">
        <video ref="videoRef" autoplay muted playsinline></video>
        <div v-if="!cameraActive" class="mobile-camera-backdrop">
          <el-icon><Camera /></el-icon>
        </div>
        <div class="mobile-material-frame" aria-hidden="true">
          <i></i><i></i><i></i><i></i>
          <span v-if="cameraActive"></span>
        </div>
        <button class="mobile-camera-toggle" type="button" @click="cameraActive ? stopCamera() : startCamera()">
          <el-icon><Camera /></el-icon>
          {{ cameraActive ? '结束扫描' : '开始扫描' }}
        </button>
      </section>

      <p class="mobile-scan-tip">{{ scanTip }}</p>

      <section class="mobile-material-card">
        <div class="mobile-material-thumb">
          <el-icon><Box /></el-icon>
        </div>
        <div class="mobile-material-main">
          <div class="mobile-material-title">
            <div>
              <strong>{{ material.code }}</strong>
              <span>{{ material.name }}</span>
            </div>
            <el-icon><CircleCheckFilled /></el-icon>
          </div>
          <div class="mobile-stock-row">
            <span>当前库存</span>
            <strong>{{ formatQty(material.stock) }} <small>{{ material.unit }}</small></strong>
          </div>
          <div class="mobile-stock-meta">
            <span>安全库存 {{ formatQty(material.safetyStock) }}</span>
            <span>默认库位 {{ material.location }}</span>
          </div>
        </div>
      </section>

      <section class="mobile-operation-form">
        <div class="mobile-segmented">
          <button type="button" :class="{ active: form.type === 'in' }" @click="form.type = 'in'">
            <el-icon><Download /></el-icon>
            入库
          </button>
          <button type="button" :class="{ active: form.type === 'out' }" @click="form.type = 'out'">
            <el-icon><Upload /></el-icon>
            出库
          </button>
        </div>

        <label class="mobile-form-field">
          <span>数量（{{ material.unit }}）</span>
          <div class="mobile-qty-control">
            <button type="button" title="减少数量" @click="changeQty(-10)"><el-icon><Minus /></el-icon></button>
            <input v-model.number="form.qty" type="number" inputmode="numeric" min="1" />
            <button type="button" title="增加数量" @click="changeQty(10)"><el-icon><Plus /></el-icon></button>
          </div>
        </label>

        <label class="mobile-form-field">
          <span>库位</span>
          <select v-model="form.location">
            <option v-for="location in locations" :key="location" :value="location">{{ location }}</option>
          </select>
        </label>

        <label class="mobile-form-field">
          <span>关联订单号 <small>选填</small></span>
          <input v-model.trim="form.orderNo" type="text" placeholder="例如 SO-2026-1048" />
        </label>

        <label class="mobile-form-field">
          <span>备注 <small>选填</small></span>
          <input v-model.trim="form.remark" type="text" placeholder="填写批次、收货人等信息" />
        </label>

        <p v-if="formError" class="mobile-form-error">{{ formError }}</p>

        <button class="mobile-confirm-btn" type="button" :disabled="submitting" @click="submitOperation">
          <el-icon v-if="submitSuccess"><CircleCheckFilled /></el-icon>
          <el-icon v-else><component :is="form.type === 'in' ? Download : Upload" /></el-icon>
          {{ confirmLabel }}
        </button>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Box, Camera, CircleCheckFilled, Clock, Download, Minus, Plus, Upload } from '@element-plus/icons-vue'

const router = useRouter()
const videoRef = ref(null)
const cameraActive = ref(false)
const scanTip = ref('将物料二维码或条码放入框内，也可以直接使用演示物料')
const showHistory = ref(false)
const submitting = ref(false)
const submitSuccess = ref(false)
const formError = ref('')

const material = reactive({
  code: 'M-10248',
  name: '六角螺帽 M10',
  stock: Number(localStorage.getItem('mobile-demo-stock')) || 1280,
  safetyStock: 500,
  unit: '件',
  location: 'A-01-01',
})

const locations = ['A-01-01', 'A-01-02', 'A-02-03', 'B-01-01', '待检区-01']
const form = reactive({ type: 'in', qty: 100, location: material.location, orderNo: '', remark: '' })
const records = ref(readRecords())

let mediaStream
let scanFrame
let detector

const confirmLabel = computed(() => {
  if (submitting.value) return '正在提交...'
  if (submitSuccess.value) return '操作已完成'
  return `确认${form.type === 'in' ? '入库' : '出库'}`
})

function readRecords() {
  try {
    return JSON.parse(localStorage.getItem('mobile-warehouse-records') || '[]')
  } catch (error) {
    return []
  }
}

function formatQty(value) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function changeQty(amount) {
  form.qty = Math.max(1, Number(form.qty || 0) + amount)
}

async function startCamera() {
  formError.value = ''
  scanTip.value = '正在请求摄像头权限...'
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    videoRef.value.srcObject = mediaStream
    cameraActive.value = true
    scanTip.value = '请对准物料二维码或条码'
    if ('BarcodeDetector' in window) {
      detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] })
      scanMaterial()
    } else {
      scanTip.value = '相机已开启，当前浏览器暂不支持自动识别'
    }
  } catch (error) {
    scanTip.value = '无法使用摄像头，请检查浏览器权限'
  }
}

async function scanMaterial() {
  if (!cameraActive.value || !detector || !videoRef.value) return
  try {
    const codes = await detector.detect(videoRef.value)
    if (codes.length) {
      applyScannedMaterial(codes[0].rawValue)
      stopCamera()
      return
    }
  } catch (error) {
    // Ignore frames that are not ready and keep scanning.
  }
  scanFrame = requestAnimationFrame(scanMaterial)
}

function applyScannedMaterial(rawValue) {
  const code = String(rawValue || '').trim()
  material.code = code || 'M-10248'
  material.name = code.includes('10631') ? '不锈钢螺丝 M6×20' : '六角螺帽 M10'
  scanTip.value = `已识别物料 ${material.code}`
}

function stopCamera() {
  cameraActive.value = false
  if (scanFrame) cancelAnimationFrame(scanFrame)
  mediaStream?.getTracks().forEach((track) => track.stop())
  mediaStream = undefined
  if (videoRef.value) videoRef.value.srcObject = null
}

function submitOperation() {
  formError.value = ''
  submitSuccess.value = false
  const qty = Number(form.qty)

  if (!Number.isFinite(qty) || qty <= 0) {
    formError.value = '请输入正确的操作数量'
    return
  }
  if (form.type === 'out' && qty > material.stock) {
    formError.value = `出库数量不能超过当前库存 ${formatQty(material.stock)} ${material.unit}`
    return
  }

  submitting.value = true
  window.setTimeout(() => {
    material.stock += form.type === 'in' ? qty : -qty
    localStorage.setItem('mobile-demo-stock', String(material.stock))

    const record = {
      id: Date.now(),
      type: form.type,
      material: material.name,
      code: material.code,
      qty,
      location: form.location,
      orderNo: form.orderNo,
      remark: form.remark,
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
    }
    records.value.unshift(record)
    records.value = records.value.slice(0, 20)
    localStorage.setItem('mobile-warehouse-records', JSON.stringify(records.value))

    submitting.value = false
    submitSuccess.value = true
    form.orderNo = ''
    form.remark = ''
    scanTip.value = `${form.type === 'in' ? '入库' : '出库'}成功，库存已更新`
    window.setTimeout(() => (submitSuccess.value = false), 1800)
  }, 500)
}

onBeforeUnmount(stopCamera)
</script>
