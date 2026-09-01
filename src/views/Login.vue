<template>
  <main class="login-page">
    <section class="login-visual login-photo-visual" :style="{ backgroundImage: `url(${warehousePhoto})` }">
      <div class="login-photo-shade"></div>
      <div class="login-photo-copy">
        <span>WAREHOUSE OPERATIONS</span>
        <h2>工仓链</h2>
        <p>让生产与仓储协同更清晰。</p>
      </div>
    </section>

    <section class="login-form-area">
      <div class="language-switcher">
        <button
          type="button"
          :class="{ active: language === 'zh' }"
          @click="language = 'zh'"
        >
          中文
        </button>
        <button
          type="button"
          :class="{ active: language === 'en' }"
          @click="language = 'en'"
        >
          EN
        </button>
      </div>

      <div class="login-card" :class="{ 'register-mode': mode === 'register' }">
        <section v-if="mode === 'login'" class="form-panel">
          <div class="login-heading">
            <h1>{{ text.welcome }}</h1>
            <p>{{ text.subtitle }}</p>
          </div>

          <form class="auth-form" @submit.prevent="submitLogin">
            <label class="form-field">
              <span>{{ text.phone }}</span>
              <input v-model="loginForm.phone" type="tel" autocomplete="tel" maxlength="11" />
            </label>

            <label class="form-field">
              <span>{{ text.password }}</span>
              <div class="password-box">
                <input
                  v-model="loginForm.password"
                  :type="showPassword ? 'text' : 'password'"
                />
                <button type="button" @click="showPassword = !showPassword">
                  {{ showPassword ? '隐藏' : '显示' }}
                </button>
              </div>
            </label>

            <div class="form-options">
              <label>
                <input v-model="loginForm.remember" type="checkbox" />
                <span>{{ text.remember }}</span>
              </label>
              <a href="#">{{ text.forgot }}</a>
            </div>

            <p v-if="error" class="login-error">{{ text.error }}</p>

            <button class="login-primary" type="submit">
              {{ loading ? text.loading : text.login }}
            </button>
          </form>

          <button class="login-outline" type="button">
            {{ text.google }}
          </button>

          <p class="switch-mode">
            {{ text.noAccount }}
            <button type="button" @click="mode = 'register'">{{ text.signup }}</button>
          </p>
        </section>

        <section v-else class="form-panel">
          <div class="login-heading">
            <h1>{{ text.registerTitle }}</h1>
            <p>{{ text.registerSubtitle }}</p>
          </div>

          <form class="auth-form" @submit.prevent="submitRegister">
            <label class="form-field">
              <span>{{ text.name }}</span>
              <input v-model="registerForm.name" type="text" />
            </label>
            <label class="form-field">
              <span>{{ text.phone }}</span>
              <input v-model="registerForm.phone" type="tel" autocomplete="tel" maxlength="11" />
            </label>
            <label class="form-field">
              <span>{{ text.password }}</span>
              <input v-model="registerForm.password" type="password" />
            </label>
            <button class="login-primary" type="submit">{{ text.createAccount }}</button>
          </form>

          <p class="switch-mode">
            {{ text.hasAccount }}
            <button type="button" @click="mode = 'login'">{{ text.backLogin }}</button>
          </p>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginWithApi } from '../services/storage'
import warehousePhoto from '../assets/login-warehouse.jpg'

const router = useRouter()
const route = useRoute()
const language = ref('zh')
const mode = ref('login')
const showPassword = ref(false)
const loading = ref(false)
const error = ref(false)

const loginForm = reactive({
  phone: '13800000001',
  password: '123456',
  remember: true,
})

const registerForm = reactive({
  name: '经营负责人',
  phone: '13800000001',
  password: '123456',
})

const translations = {
  zh: {
    welcome: '欢迎回来！',
    subtitle: '请输入您的信息',
    phone: '手机号',
    password: '密码',
    remember: '记住 30 天',
    forgot: '忘记密码了吗？',
    error: '手机号或密码错误。',
    login: '登录',
    loading: '登录中...',
    google: '短信验证码登录',
    noAccount: '没有账号？',
    signup: '注册',
    registerTitle: '创建账号',
    registerSubtitle: '填写您的信息',
    name: '姓名',
    createAccount: '注册并进入',
    hasAccount: '已有账号？',
    backLogin: '返回登录',
  },
  en: {
    welcome: 'Welcome back!',
    subtitle: 'Please enter your details',
    phone: 'Phone',
    password: 'Password',
    remember: 'Remember for 30 days',
    forgot: 'Forgot password?',
    error: 'Invalid phone number or password.',
    login: 'Log in',
    loading: 'Signing in...',
    google: 'Log in with SMS code',
    noAccount: "Don't have an account?",
    signup: 'Sign Up',
    registerTitle: 'Create account',
    registerSubtitle: 'Fill in your details',
    name: 'Name',
    createAccount: 'Create account',
    hasAccount: 'Already have an account?',
    backLogin: 'Back to login',
  },
}

const text = computed(() => translations[language.value])

async function submitLogin() {
  error.value = false
  loading.value = true
  const apiSession = await loginWithApi(loginForm.phone, loginForm.password)

  window.setTimeout(() => {
    loading.value = false
    if (apiSession?.authFailed) {
      error.value = true
      return
    }
    if (apiSession?.token || (!apiSession && /^1[3-9]\d{9}$/.test(loginForm.phone) && loginForm.password === '123456')) {
      sessionStorage.setItem('factory-chain-auth', JSON.stringify({
        phone: loginForm.phone,
        role: apiSession?.user?.role || '管理员',
        name: apiSession?.user?.name || '经营负责人',
        token: apiSession?.token || '',
        signedAt: Date.now(),
      }))
      router.push(String(route.query.redirect || '/dashboard'))
      return
    }
    error.value = true
  }, 250)
}

function submitRegister() {
  sessionStorage.setItem('factory-chain-auth', JSON.stringify({
    phone: registerForm.phone,
    role: '管理员',
    signedAt: Date.now(),
  }))
  router.push('/dashboard')
}
</script>
