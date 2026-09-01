<template>
  <section>
    <PageHeader eyebrow="Order Pipeline" title="订单管理" desc="跟踪订单履约进度、BOM 匹配和缺料状态">
      <el-button type="primary" :icon="Plus">创建订单</el-button>
    </PageHeader>

    <div class="dashboard-main">
      <section class="panel">
        <PanelHeader title="活跃订单">
          <el-button :icon="Filter">筛选</el-button>
        </PanelHeader>
        <el-table :data="orders" highlight-current-row @row-click="selected = $event">
          <el-table-column prop="id" label="订单号" min-width="140" />
          <el-table-column prop="customer" label="客户" min-width="160" />
          <el-table-column label="进度" min-width="180">
            <template #default="{ row }">
              <el-progress :percentage="row.progress" :status="row.status === '缺料' ? 'exception' : undefined" />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag class="table-status" :type="tagType(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <aside class="panel">
        <PanelHeader :title="selected.id">
          <el-tag effect="dark">当前选择</el-tag>
        </PanelHeader>
        <div class="panel-body">
          <p class="muted">客户</p>
          <h2>{{ selected.customer }}</h2>
          <div class="info-grid">
            <div><p class="eyebrow">交期</p><strong>{{ selected.due }}</strong></div>
            <div><p class="eyebrow">优先级</p><strong>{{ selected.priority }}</strong></div>
          </div>
          <el-button type="primary" style="width: 100%">分配物料</el-button>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Filter, Plus } from '@element-plus/icons-vue'
import PageHeader from '../shared/PageHeader.vue'
import PanelHeader from '../shared/PanelHeader.vue'
import { orders } from '../data/mock'

const selected = ref(orders[2])

function tagType(status) {
  if (status === '缺料') return 'danger'
  if (status === '已完成') return 'success'
  if (status === '生产中') return 'warning'
  return 'info'
}
</script>
