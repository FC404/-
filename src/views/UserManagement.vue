<template>
  <section class="user-page">
    <section class="list-data-shell user-data-shell">
    <section class="user-hero user-toolbar">
      <div class="user-filter">
        <div class="filter-field select-field">
          <span>角色档位</span>
          <div class="custom-select">
            <button type="button" @click="toggleDropdown('role')">
              {{ roleLabel }}
              <i></i>
            </button>
            <div v-if="openDropdown === 'role'" class="select-menu">
              <button
                v-for="option in roleOptions"
                :key="option.value"
                type="button"
                :class="{ active: filters.role === option.value }"
                @click="chooseRole(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="filter-field select-field">
          <span>状态</span>
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
                :class="{ active: filters.status === option.value }"
                @click="chooseStatus(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
        <button class="ghost-btn toolbar-icon-btn filter-reset-btn" type="button" title="重置筛选" aria-label="重置筛选" @click="resetFilters">
          <el-icon><Refresh /></el-icon>
        </button>
        <button class="ghost-btn" type="button" @click="showRoleRules = true">角色说明</button>
      </div>
      <div class="hero-actions">
        <button v-if="!batchSelectionMode" class="danger-outline-btn toolbar-icon-btn" type="button" title="批量删除" aria-label="批量删除" @click="startBatchSelection"><el-icon><Delete /></el-icon></button>
        <template v-else><button class="danger-outline-btn toolbar-icon-btn" type="button" :title="selectedUserIds.length ? '删除已选' : '退出批量选择'" :aria-label="selectedUserIds.length ? '删除已选' : '退出批量选择'" @click="requestBatchDelete"><el-icon><Delete /></el-icon></button></template>
        <button class="primary-btn toolbar-icon-btn" type="button" title="新增用户" aria-label="新增用户" @click="openCreateUser">
          <el-icon><Plus /></el-icon>
        </button>
      </div>
    </section>

    <section class="panel user-panel">
      <div class="table-wrap">
        <table v-table-overflow>
          <thead>
            <tr>
              <th v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="allFilteredUsersSelected" aria-label="全选当前筛选结果" @change="toggleAllUserSelection" /></th>
              <th>姓名</th>
              <th>角色档位</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in pagedUsers" :key="user.id" class="entity-row" :class="{ selected: isUserSelected(user.id) }" @click="selectedUser = user">
              <td v-if="batchSelectionMode" class="selection-cell"><input type="checkbox" :checked="isUserSelected(user.id)" :aria-label="`选择 ${user.name}`" @click.stop="toggleUserSelection(user.id)" /></td>
              <td>
                <div class="main-cell">{{ user.name }}</div>
                <div class="sub-cell">{{ user.phone }}</div>
              </td>
              <td>
                <span class="role-pill" :class="user.level">{{ user.role }}</span>
              </td>
              <td><span class="tag table-status" :class="user.statusType">{{ user.status }}</span></td>
            </tr>
            <tr v-if="!pagedUsers.length">
              <td class="empty-row" :colspan="batchSelectionMode ? 4 : 3">没有匹配的账号</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-pagination">
        <p>
          显示 {{ visibleStart }}-{{ pageEnd }} 条，共 {{ filteredUsers.length }} 个账号
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

    <div v-if="selectedUser" class="user-dialog-mask" @click.self="selectedUser = null">
      <section class="user-dialog entity-detail-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div><h3>{{ selectedUser.name }}</h3></div>
          <button class="dialog-close" type="button" aria-label="关闭用户详情" @click="selectedUser = null">×</button>
        </div>
        <div class="entity-detail-content">
          <div><span>手机号</span><strong>{{ selectedUser.phone }}</strong></div>
          <div><span>账号状态</span><strong class="table-status" :class="selectedUser.statusType">{{ selectedUser.status }}</strong></div>
          <div><span>角色档位</span><strong>{{ selectedUser.role }}</strong></div>
          <div class="entity-detail-wide"><span>权限范围</span><strong>{{ selectedUser.scope }}</strong></div>
        </div>
        <div class="dialog-actions">
          <button class="ghost-btn" type="button" @click="openEditUser(selectedUser)">编辑用户</button>
          <button class="danger-outline-btn" type="button" @click="deleteUser(selectedUser)">删除用户</button>
        </div>
      </section>
    </div>

    <div v-if="showRoleRules" class="user-dialog-mask" @click.self="showRoleRules = false">
      <section class="user-dialog role-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Role Rules</p>
            <h3>角色说明</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭角色说明" @click="showRoleRules = false">×</button>
        </div>

        <div class="role-grid">
          <article v-for="role in roles" :key="role.name" class="role-card" :class="role.level">
            <div class="role-head">
              <span>{{ role.badge }}</span>
              <strong>{{ role.name }}</strong>
            </div>
            <p>{{ role.desc }}</p>
            <div class="permission-list">
              <span v-for="item in role.permissions" :key="item">{{ item }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="dialogVisible" class="user-dialog-mask" @click.self="closeDialog">
      <section class="user-dialog" aria-modal="true" role="dialog">
        <div class="dialog-head">
          <div>
            <p class="section-kicker">Account Form</p>
            <h3>{{ editingId ? '编辑用户' : '新增用户' }}</h3>
          </div>
          <button class="dialog-close" type="button" aria-label="关闭" @click="closeDialog">×</button>
        </div>

        <form class="dialog-form" @submit.prevent="saveUser">
          <label class="form-control">
            <span>姓名</span>
            <input v-model.trim="userForm.name" type="text" placeholder="例如 王主管" />
          </label>
          <label class="form-control">
            <span>手机号</span>
            <input v-model.trim="userForm.phone" type="tel" maxlength="11" placeholder="例如 13800000000" />
          </label>

          <div class="form-control">
            <span>角色档位</span>
            <div class="custom-select">
              <button type="button" @click="toggleDropdown('formRole')">
                {{ formRoleLabel }}
                <i></i>
              </button>
              <div v-if="openDropdown === 'formRole'" class="select-menu">
                <button
                  v-for="option in formRoleOptions"
                  :key="option.value"
                  type="button"
                  :class="{ active: userForm.type === option.value }"
                  @click="chooseFormRole(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="form-control">
            <span>状态</span>
            <div class="custom-select">
              <button type="button" @click="toggleDropdown('formStatus')">
                {{ userForm.status }}
                <i></i>
              </button>
              <div v-if="openDropdown === 'formStatus'" class="select-menu">
                <button
                  v-for="option in formStatusOptions"
                  :key="option"
                  type="button"
                  :class="{ active: userForm.status === option }"
                  @click="chooseFormStatus(option)"
                >
                  {{ option }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <div class="dialog-actions">
            <button
              v-if="editingId"
              class="danger-outline-btn"
              type="button"
              @click="deleteUser(users.find((item) => item.id === editingId))"
            >
              删除用户
            </button>
            <button class="primary-btn" type="submit">{{ editingId ? '保存修改' : '确认新增' }}</button>
          </div>
        </form>
      </section>
    </div>

    <AppConfirmDialog
      v-if="deleteTarget"
      title="删除用户"
      :message="`确认删除「${deleteTarget.name}」这个账号吗？`"
      confirm-text="删除用户"
      @cancel="deleteTarget = null"
      @confirm="confirmDeleteUser"
    />

    <AppConfirmDialog
      v-if="batchDeleteVisible"
      title="批量删除用户"
      :message="`确认删除已选择的 ${selectedUserIds.length} 个账号吗？此操作无法恢复。`"
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
import { buildDemoUsers } from '../data/demoRecords'
import { hydrateList, loadList, saveList, subscribeList } from '../services/storage'
import { showAssistantFeedback } from '../services/assistantFeedback'

const roles = [
  {
    badge: 'NO1',
    name: '管理员',
    level: 'level-owner',
    desc: '面向老板、厂长和管理岗，负责全局数据、关键审批、经营资料维护与账号授权。',
    permissions: ['全局看板', '订单审批', '库存调整', '账号授权'],
  },
  {
    badge: 'NO2',
    name: '仓管员',
    level: 'level-staff',
    desc: '面向仓库一线人员，负责扫码出入库、复核、盘点和库存记录。',
    permissions: ['扫码出入库', '出库复核', '库存记录', '盘点处理'],
  },
  {
    badge: 'NO3',
    name: '合作方',
    level: 'level-factory',
    desc: '面向后续版本接入的第三方加工厂或合作伙伴，只查看分配给自己的协作任务。',
    permissions: ['查看任务', '接收派工', '反馈进度', '交付确认'],
  },
]

const showRoleRules = ref(false)

const rolePresets = {
  owner: {
    role: '管理员',
    level: 'level-owner',
    scope: '全部模块、全部数据、审批与用户授权',
  },
  staff: {
    role: '仓管员',
    level: 'level-staff',
    scope: '扫码出入库、复核、库存记录',
  },
  factory: {
    role: '合作方',
    level: 'level-factory',
    scope: '协作任务、进度反馈、交付确认',
  },
}

const seedUsers = buildDemoUsers(3)

let userIdSeed = 1000

function createUserId() {
  userIdSeed += 1
  return `user-${userIdSeed}`
}

function statusMeta(status) {
  if (status === '待审核') return { status, statusType: 'warn' }
  if (status === '停用') return { status, statusType: 'danger' }
  return { status, statusType: 'ok' }
}

function buildUser({ id = createUserId(), name, phone, type, status }) {
  return {
    id,
    name,
    phone,
    type,
    ...rolePresets[type],
    ...statusMeta(status),
  }
}

const legacyRoleMap = {
  管理员: 'owner',
  经营管理员: 'owner',
  系统管理员: 'owner',
  仓管员: 'staff',
  仓库操作员: 'staff',
  仓库主管: 'staff',
  内部协作员: 'staff',
  订单专员: 'staff',
  合作方: 'factory',
  合作人员: 'factory',
}

function normalizeUserRecord(user) {
  const type = user.type || legacyRoleMap[user.role] || 'staff'
  const status = user.status || '正常'
  return {
    ...user,
    type,
    ...rolePresets[type],
    ...statusMeta(status),
  }
}

const users = ref(loadList('users', seedUsers.map(buildUser)).map(normalizeUserRecord))
const syncingUsers = ref(false)
let stopUserSubscription

const pageSize = 10
const currentPage = ref(1)
const openDropdown = ref('')
const dialogVisible = ref(false)
const selectedUser = ref(null)
const deleteTarget = ref(null)
const selectedUserIds = ref([])
const batchSelectionMode = ref(false)
const batchDeleteVisible = ref(false)
const editingId = ref('')
const formError = ref('')
const globalSearch = inject('globalSearch', ref(''))
const filters = reactive({
  keyword: '',
  role: '',
  status: '',
})

watch(
  globalSearch,
  (value) => {
    filters.keyword = value || ''
  },
  { immediate: true },
)
const userForm = reactive({
  name: '',
  phone: '',
  type: 'staff',
  status: '正常',
})

const roleOptions = [
  { label: '全部角色', value: '' },
  { label: '管理员', value: '管理员' },
  { label: '仓管员', value: '仓管员' },
  { label: '合作方', value: '合作方' },
]

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '正常', value: '正常' },
  { label: '待审核', value: '待审核' },
  { label: '停用', value: '停用' },
]

const formRoleOptions = [
  { label: '管理员', value: 'owner' },
  { label: '仓管员', value: 'staff' },
  { label: '合作方', value: 'factory' },
]
const formStatusOptions = ['正常', '待审核', '停用']

const filteredUsers = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return users.value.filter((user) => {
    const keywordMatched = !keyword || `${user.name} ${user.phone}`.toLowerCase().includes(keyword)
    const roleMatched = !filters.role || user.role === filters.role
    const statusMatched = !filters.status || user.status === filters.status
    return keywordMatched && roleMatched && statusMatched
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize, filteredUsers.value.length))
const visibleStart = computed(() => (filteredUsers.value.length ? pageStart.value + 1 : 0))
const pagedUsers = computed(() => filteredUsers.value.slice(pageStart.value, pageEnd.value))
const allFilteredUsersSelected = computed(() => filteredUsers.value.length > 0 && filteredUsers.value.every((user) => isUserSelected(user.id)))
const roleLabel = computed(() => roleOptions.find((item) => item.value === filters.role)?.label || '全部角色')
const statusLabel = computed(() => statusOptions.find((item) => item.value === filters.status)?.label || '全部状态')
const formRoleLabel = computed(() => formRoleOptions.find((item) => item.value === userForm.type)?.label || '仓管员')

watch(filters, () => {
  currentPage.value = 1
})

watch(
  users,
  (nextUsers) => {
    if (syncingUsers.value) {
      syncingUsers.value = false
      return
    }
    saveList('users', nextUsers)
  },
  { deep: true },
)

onMounted(async () => {
  stopUserSubscription = subscribeList('users', (records) => {
    if (JSON.stringify(records) === JSON.stringify(users.value)) return
    syncingUsers.value = true
    users.value = records.map(normalizeUserRecord)
  })
  await hydrateList('users', users, seedUsers.map(buildUser))
  users.value = users.value.map(normalizeUserRecord)
})

onBeforeUnmount(() => stopUserSubscription?.())

watch(totalPages, (pageTotal) => {
  if (currentPage.value > pageTotal) currentPage.value = pageTotal
})

function resetFilters() {
  globalSearch.value = ''
  filters.keyword = ''
  filters.role = ''
  filters.status = ''
  openDropdown.value = ''
}

function isUserSelected(id) {
  return selectedUserIds.value.includes(id)
}

function toggleUserSelection(id) {
  selectedUserIds.value = isUserSelected(id)
    ? selectedUserIds.value.filter((item) => item !== id)
    : [...selectedUserIds.value, id]
}

function startBatchSelection() {
  batchSelectionMode.value = true
  selectedUserIds.value = []
}

function cancelBatchSelection() {
  batchSelectionMode.value = false
  selectedUserIds.value = []
}

function toggleAllUserSelection() {
  selectedUserIds.value = allFilteredUsersSelected.value ? [] : filteredUsers.value.map((user) => user.id)
}

function requestBatchDelete() {
  if (!selectedUserIds.value.length) {
    cancelBatchSelection()
    return
  }
  batchDeleteVisible.value = true
}

function toggleDropdown(type) {
  openDropdown.value = openDropdown.value === type ? '' : type
}

function chooseRole(value) {
  filters.role = value
  openDropdown.value = ''
}

function chooseStatus(value) {
  filters.status = value
  openDropdown.value = ''
}

function chooseFormRole(value) {
  userForm.type = value
  openDropdown.value = ''
}

function chooseFormStatus(value) {
  userForm.status = value
  openDropdown.value = ''
}

function resetForm() {
  userForm.name = ''
  userForm.phone = ''
  userForm.type = 'staff'
  userForm.status = '正常'
  formError.value = ''
  openDropdown.value = ''
}

function openCreateUser() {
  editingId.value = ''
  resetForm()
  dialogVisible.value = true
}

function openEditUser(user) {
  selectedUser.value = null
  editingId.value = user.id
  userForm.name = user.name
  userForm.phone = user.phone
  userForm.type = user.type
  userForm.status = user.status
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

function saveUser() {
  const error = validateForm()
  if (error) {
    formError.value = error
    return
  }

  const nextUser = buildUser({
    id: editingId.value || createUserId(),
    name: userForm.name,
    phone: userForm.phone,
    type: userForm.type,
    status: userForm.status,
  })

  if (editingId.value) {
    users.value = users.value.map((user) => (user.id === editingId.value ? nextUser : user))
  } else {
    users.value = [nextUser, ...users.value]
    currentPage.value = 1
  }

  closeDialog()
  showAssistantFeedback(editingId.value ? '账号修改已保存。' : '账号已新增。', '操作完成')
}

function deleteUser(user) {
  selectedUser.value = null
  deleteTarget.value = user
}

function confirmDeleteUser() {
  if (!deleteTarget.value) return
  users.value = users.value.filter((item) => item.id !== deleteTarget.value.id)
  deleteTarget.value = null
  showAssistantFeedback('账号已删除。', '操作完成')
}

function confirmBatchDelete() {
  const selected = new Set(selectedUserIds.value)
  users.value = users.value.filter((item) => !selected.has(item.id))
  if (selected.has(selectedUser.value?.id)) selectedUser.value = null
  selectedUserIds.value = []
  batchSelectionMode.value = false
  batchDeleteVisible.value = false
  showAssistantFeedback('已删除选中的账号。', '操作完成')
}
</script>
