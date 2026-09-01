<template>
  <section>
    <PageHeader eyebrow="Inventory Management" title="库存管理" desc="按安全库存、冻结数量和可用数量管理物料">
      <el-button type="primary" :icon="Plus" @click="dialogVisible = true">新增物料</el-button>
    </PageHeader>

    <div class="stats-grid">
      <article class="stat-card">
        <div class="stat-label">Total Items</div>
        <div class="stat-value">12,482</div>
        <p class="muted">较上一班次 +2.4%</p>
      </article>
      <article class="stat-card">
        <div class="stat-label">Low Stock Alerts</div>
        <div class="stat-value danger">24</div>
        <p class="muted">需要补货或采购确认</p>
      </article>
      <article class="stat-card">
        <div class="stat-label">Warehouse Capacity</div>
        <div class="stat-value">82%</div>
        <el-progress :percentage="82" />
      </article>
      <article class="stat-card">
        <div class="stat-label">Frozen Stock</div>
        <div class="stat-value">714</div>
        <p class="muted">等待质检/订单锁定</p>
      </article>
    </div>

    <div class="toolbar">
      <el-button-group>
        <el-button type="primary" :icon="Filter">全部类别</el-button>
        <el-button>原材料</el-button>
        <el-button>成品</el-button>
        <el-button>包装</el-button>
      </el-button-group>
      <div class="button-row">
        <el-button :icon="Download">导出 CSV</el-button>
        <el-button type="primary" :icon="Plus" @click="dialogVisible = true">新建入库</el-button>
      </div>
    </div>

    <section class="panel">
      <el-table :data="rows" stripe style="width: 100%">
        <el-table-column label="物料名称" min-width="180">
          <template #default="{ row }">
            <span class="status-dot" :class="{ danger: row.available < row.safeStock }"></span>
            <strong>{{ row.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" min-width="180" />
        <el-table-column prop="unit" label="单位" width="90" />
        <el-table-column prop="category" label="类别" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="safeStock" label="安全库存" align="right" width="120" />
        <el-table-column prop="current" label="当前库存" align="right" width="120" />
        <el-table-column label="可用库存" align="right" width="120">
          <template #default="{ row }">
            <span :class="{ 'danger-text': row.available < row.safeStock }">{{ row.available }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="frozen" label="冻结" align="right" width="90" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" @click="edit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑物料' : '新增物料'" width="520px">
      <el-form label-position="top">
        <el-form-item label="物料名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="规格"><el-input v-model="form.spec" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="form.unit" /></el-form-item>
        <el-form-item label="当前库存"><el-input-number v-model="form.current" :min="0" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { Download, Filter, Plus } from '@element-plus/icons-vue'
import PageHeader from '../shared/PageHeader.vue'
import { materials } from '../data/mock'

const rows = ref([...materials])
const dialogVisible = ref(false)
const form = reactive({ id: '', name: '', spec: '', unit: '', category: 'RAW', safeStock: 20, current: 0, available: 0, frozen: 0 })

function edit(row) {
  Object.assign(form, row)
  dialogVisible.value = true
}

function save() {
  if (!form.name) return
  const next = { ...form, available: form.available || form.current }
  const index = rows.value.findIndex((item) => item.id === form.id)
  if (index >= 0) rows.value[index] = next
  else rows.value.unshift({ ...next, id: `M-${Date.now().toString().slice(-4)}` })
  dialogVisible.value = false
}
</script>
