<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'mobile-nav-open': mobileNavOpen }">
    <header class="site-header">
      <div class="site-header-left">
        <button
          class="site-brand"
          type="button"
          :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <span class="site-brand-copy">
            <strong class="site-brand-wordmark">
              <span class="site-brand-initial">工</span><span class="site-brand-rest">仓链</span>
            </strong>
          </span>
        </button>
      </div>

      <label class="site-global-search">
        <el-icon><Search /></el-icon>
        <input v-model="globalSearch" type="search" :placeholder="globalSearchPlaceholder" aria-label="搜索当前页面" />
      </label>

      <div class="site-header-actions">
        <div class="site-account">
          <span class="site-account-avatar" :title="accountName">{{ accountAvatar }}</span>
          <strong>{{ accountName }}</strong>
          <button class="site-account-logout" type="button" title="退出登录" @click="logout">
            <el-icon><SwitchButton /></el-icon>
          </button>
        </div>
        <button class="site-menu" type="button" title="打开导航菜单" @click="mobileNavOpen = true">
          <el-icon><Menu /></el-icon>
        </button>
      </div>
    </header>

    <button class="sidebar-scrim" type="button" aria-label="关闭导航菜单" @click="mobileNavOpen = false"></button>
    <aside class="sidebar">
      <div class="sidebar-head">
        <button class="mobile-sidebar-close" type="button" title="关闭菜单" @click="mobileNavOpen = false">
          <el-icon><Close /></el-icon>
        </button>
      </div>

      <nav class="nav">
        <template v-for="item in navItems" :key="item.label">
          <div
            v-if="item.children"
            class="nav-group"
            :class="{ active: isGroupActive(item), expanded: isGroupExpanded(item) }"
          >
            <button
              class="nav-parent"
              type="button"
              :title="item.label"
              :aria-expanded="isGroupExpanded(item)"
              @click.stop="toggleNavGroup(item, $event)"
            >
              <span class="nav-icon"><component :is="item.icon" /></span>
              <span class="nav-label">{{ item.label }}</span>
              <el-icon class="nav-chevron"><ArrowDown /></el-icon>
            </button>
            <div v-if="!sidebarCollapsed" class="nav-children">
              <RouterLink v-for="child in item.children" :key="child.path" :to="child.path" class="nav-sub-link">
                {{ child.label }}
              </RouterLink>
            </div>
          </div>
          <RouterLink v-else :to="item.path" :title="item.label">
            <span class="nav-icon"><component :is="item.icon" /></span>
            <span class="nav-label">{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

    </aside>

    <Teleport to="body">
      <button
        v-if="collapsedFlyout"
        class="nav-flyout-backdrop"
        type="button"
        aria-label="关闭仓储菜单"
        @click="collapsedFlyout = null"
      ></button>
      <div
        v-if="collapsedFlyout"
        class="nav-flyout"
        :style="{ top: `${collapsedFlyout.top}px` }"
        @click.stop
      >
        <strong>{{ collapsedFlyout.label }}</strong>
        <RouterLink v-for="child in collapsedFlyout.children" :key="child.path" :to="child.path">
          {{ child.label }}
        </RouterLink>
      </div>
    </Teleport>

    <main class="workspace">
      <section class="content" :class="{ 'data-content': isDataPage }">
        <RouterView v-slot="{ Component, route: viewRoute }">
          <Transition name="page-shift" mode="out-in">
            <component :is="Component" :key="viewRoute.path" />
          </Transition>
        </RouterView>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onErrorCaptured, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, Box, Close, Grid, List, Menu, Search, Setting, SwitchButton, User, UserFilled as UsersIcon } from '@element-plus/icons-vue'
import { showAssistantFeedback } from '../services/assistantFeedback'

const sidebarCollapsed = ref(false)
const mobileNavOpen = ref(false)
const collapsedFlyout = ref(null)
const expandedGroups = ref(new Set())
const route = useRoute()
const router = useRouter()
const accountInfo = ref(readSessionUser())
const globalSearch = ref('')

onErrorCaptured((error) => {
  showAssistantFeedback(error?.message || '操作没有完成，请检查输入后重试。', '操作异常')
  return false
})

const globalSearchPlaceholder = computed(() => {
  if (route.path === '/orders') return '搜索订单、客户或料号'
  if (route.path === '/materials') return '搜索物料或 SKU'
  if (route.path.includes('/warehouse/')) return '搜索单据或库位'
  if (route.path === '/customers') return '搜索客户、联系人或电话'
    if (route.path === '/users') return '搜索姓名或手机号'
    if (route.path === '/production-board') return '搜索生产订单'
    return '搜索当前页面'
})

const isDataPage = computed(() => [
  '/orders',
  '/materials',
  '/warehouse/inbound',
  '/warehouse/outbound',
  '/production-board',
  '/customers',
  '/users',
].includes(route.path))

provide('globalSearch', globalSearch)

const navItems = [
  { label: '仪表盘', path: '/dashboard', icon: Grid },
  { label: '订单管理', path: '/orders', icon: List },
  {
    label: '仓储管理',
    icon: Box,
    children: [
      { label: '物料管理', path: '/materials' },
      { label: '入库记录', path: '/warehouse/inbound' },
      { label: '出库记录', path: '/warehouse/outbound' },
    ],
  },
  {
    label: '生产管理',
    icon: Grid,
    children: [
      { label: '生产看板', path: '/production-board' },
    ],
  },
  { label: '客户信息', path: '/customers', icon: User },
  { label: '用户权限', path: '/users', icon: UsersIcon },
  { label: '系统维护', path: '/settings', icon: Setting },
]

function readSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem('factory-chain-auth') || 'null') || {}
  } catch (error) {
    return {}
  }
}

const accountName = computed(() => accountInfo.value.name || '管理账户')
const accountRole = computed(() => accountInfo.value.role || '管理员')
const accountAvatar = computed(() => accountName.value.trim().slice(0, 1) || '管')
const todayLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
}).format(new Date())

function isGroupActive(item) {
  return item.children?.some((child) => route.path === child.path)
}

function isGroupExpanded(item) {
  return expandedGroups.value.has(item.label)
}

function toggleNavGroup(item, event) {
  if (sidebarCollapsed.value) {
    if (collapsedFlyout.value?.label === item.label) {
      collapsedFlyout.value = null
      return
    }

    const triggerRect = event.currentTarget.getBoundingClientRect()
    collapsedFlyout.value = {
      label: item.label,
      children: item.children,
      top: Math.min(triggerRect.top, window.innerHeight - 132),
    }
    return
  }

  const next = new Set(expandedGroups.value)

  if (next.has(item.label)) {
    next.delete(item.label)
  } else {
    next.add(item.label)
  }

  expandedGroups.value = next
}

watch(
  () => route.path,
  (path) => {
    accountInfo.value = readSessionUser()
    globalSearch.value = ''
    mobileNavOpen.value = false
    collapsedFlyout.value = null
    const activeGroup = navItems.find((item) => item.children?.some((child) => child.path === path))
    if (!activeGroup) return
    expandedGroups.value = new Set([...expandedGroups.value, activeGroup.label])
  },
  { immediate: true },
)

watch(sidebarCollapsed, () => {
  collapsedFlyout.value = null
})

watch(mobileNavOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function logout() {
  sessionStorage.removeItem('factory-chain-auth')
  router.push('/login')
}
</script>
