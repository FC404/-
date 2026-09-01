const testAdministrator = {
  id: 'user-1001',
  name: '范晓',
  phone: '13800000001',
  type: 'owner',
  role: '管理员',
  level: 'level-owner',
  scope: '全部模块、全部数据、审批与用户授权',
  status: '正常',
  statusType: 'ok',
}

function generateDemoData() {
  return {
    orders: [],
    materials: [],
    customers: [],
    users: [{ ...testAdministrator }],
    warehouseRecords: [],
    warehouseInboundRecords: [],
    warehouseOutboundRecords: [],
    auditEvents: [],
  }
}

module.exports = {
  generateDemoData,
}
