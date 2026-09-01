<template>
  <main class="mobile-stage">
    <section class="mobile-app mobile-login-page">
      <header class="mobile-brand-bar">
        <div class="mobile-brand-mark">仓</div>
        <div>
          <strong>工仓链</strong>
          <span>移动仓库终端</span>
        </div>
      </header>

      <section class="mobile-login-copy">
        <span class="mobile-kicker">Secure Access</span>
        <h1>扫码登录</h1>
        <p>扫描电脑端生成的登录二维码，快速进入当前仓库。</p>
      </section>

      <section class="mobile-login-scanner" :class="{ active: cameraActive, success: loginState === 'success' }">
        <video ref="videoRef" autoplay muted playsinline></video>
        <div v-if="!cameraActive" class="mobile-camera-placeholder">
          <el-icon><Camera /></el-icon>
          <span>摄像头尚未开启</span>
        </div>
        <div class="mobile-scan-corners" aria-hidden="true">
          <i></i><i></i><i></i><i></i>
          <span v-if="cameraActive && loginState !== 'success'"></span>
        </div>
        <div v-if="loginState === 'success'" class="mobile-scan-success">
          <el-icon><CircleCheckFilled /></el-icon>
          <strong>验证成功</strong>
        </div>
      </section>

      <p class="mobile-camera-status" :class="{ error: loginState === 'error' }">{{ statusText }}</p>

      <div class="mobile-login-actions">
        <button v-if="!cameraActive" class="mobile-primary-action" type="button" @click="startCamera">
          <el-icon><Camera /></el-icon>
          开启相机扫码
        </button>
        <button v-else class="mobile-secondary-action" type="button" @click="stopCamera">
          关闭相机
        </button>
        <button class="mobile-demo-link" type="button" @click="completeLogin('DEMO-WAREHOUSE-TOKEN')">
          演示扫码登录
        </button>
      </div>

      <footer class="mobile-security-note">
        <el-icon><Lock /></el-icon>
        <span>二维码仅用于本次登录，请勿转发给他人</span>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, CircleCheckFilled, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const videoRef = ref(null)
const cameraActive = ref(false)
const loginState = ref('idle')
const statusText = ref('请将登录二维码放入扫描框内')

let mediaStream
let scanFrame
let detector

async function startCamera() {
  loginState.value = 'idle'
  statusText.value = '正在请求摄像头权限...'

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    videoRef.value.srcObject = mediaStream
    cameraActive.value = true
    statusText.value = '请将登录二维码放入扫描框内'

    if ('BarcodeDetector' in window) {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      scanCode()
    } else {
      statusText.value = '当前浏览器不支持自动识别，可使用演示扫码登录'
    }
  } catch (error) {
    loginState.value = 'error'
    statusText.value = '无法使用摄像头，请检查权限或使用演示入口'
  }
}

async function scanCode() {
  if (!cameraActive.value || !detector || !videoRef.value) return

  try {
    const codes = await detector.detect(videoRef.value)
    if (codes.length) {
      completeLogin(codes[0].rawValue)
      return
    }
  } catch (error) {
    // The video may not have a frame ready yet; continue scanning.
  }

  scanFrame = requestAnimationFrame(scanCode)
}

function completeLogin(token) {
  if (loginState.value === 'success') return
  loginState.value = 'success'
  statusText.value = '身份已验证，正在进入仓库...'
  sessionStorage.setItem('warehouse-mobile-token', token || 'SCANNED-TOKEN')
  stopCamera(false)
  window.setTimeout(() => router.replace('/mobile/scan'), 650)
}

function stopCamera(resetStatus = true) {
  cameraActive.value = false
  if (scanFrame) cancelAnimationFrame(scanFrame)
  mediaStream?.getTracks().forEach((track) => track.stop())
  mediaStream = undefined
  if (videoRef.value) videoRef.value.srcObject = null
  if (resetStatus && loginState.value !== 'success') statusText.value = '摄像头已关闭'
}

onBeforeUnmount(() => stopCamera(false))
</script>
