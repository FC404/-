import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from './layouts/AdminLayout.vue'
import Dashboard from './views/Dashboard.vue'
import CustomerManagement from './views/CustomerManagement.vue'
import Login from './views/Login.vue'
import MobileLogin from './views/MobileLogin.vue'
import MaterialManagement from './views/MaterialManagement.vue'
import OrderManagement from './views/OrderManagement.vue'
import ProductionBoard from './views/ProductionBoard.vue'
import Scan from './views/Scan.vue'
import SystemSettings from './views/SystemSettings.vue'
import TablePage from './views/TablePage.vue'
import UserManagement from './views/UserManagement.vue'

const routes = [
  { path: '/login', component: Login },
  { path: '/mobile', redirect: '/mobile/login' },
  { path: '/mobile/login', component: MobileLogin },
  { path: '/mobile/scan', component: Scan, meta: { requiresMobileAuth: true } },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: Dashboard, meta: { title: '仪表盘', eyebrow: '工仓链 SSaS' } },
      { path: 'orders', component: OrderManagement, meta: { title: '订单管理', eyebrow: '订单流转' } },
      { path: 'materials', component: MaterialManagement, meta: { title: '物料管理', eyebrow: '库存与补货' } },
      { path: 'warehouse', redirect: '/warehouse/inbound' },
      { path: 'warehouse/inbound', component: TablePage, props: { page: 'warehouse-inbound' }, meta: { title: '入库记录', eyebrow: '仓储管理' } },
      { path: 'warehouse/outbound', component: TablePage, props: { page: 'warehouse-outbound' }, meta: { title: '出库记录', eyebrow: '仓储管理' } },
      { path: 'production-board', component: ProductionBoard, meta: { title: '生产看板', eyebrow: '生产管理' } },
      { path: 'customers', component: CustomerManagement, meta: { title: '客户信息', eyebrow: '客户资料' } },
      { path: 'users', component: UserManagement, meta: { title: '用户权限', eyebrow: '权限控制' } },
      { path: 'settings', component: SystemSettings, meta: { title: '系统维护', eyebrow: '备份与恢复' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !sessionStorage.getItem('factory-chain-auth')) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.meta.requiresMobileAuth && !sessionStorage.getItem('warehouse-mobile-token')) {
    return '/mobile/login'
  }
})

export default router
