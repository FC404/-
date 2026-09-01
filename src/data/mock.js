export const metrics = []
export const chart = []
export const alerts = []
export const orders = []
export const materials = []
export const inboundWarehouse = []
export const outboundWarehouse = []
export const warehouse = inboundWarehouse
export const customers = []
export const users = [
  {
    id: 'user-1001',
    name: '范晓',
    phone: '13800000001',
    type: 'owner',
    role: '管理员',
    level: 'level-owner',
    scope: '全部模块、全部数据、审批与用户授权',
    status: '正常',
    statusType: 'ok',
  },
]

export function tagType(text) {
  if (['停用', '缺货', '异常', '缺料', '欠料', '逾期'].includes(text)) return 'danger'
  if (['未出货', '未开启', '待处理', '待复核', '待接单', '待验收', '待审核', '紧急', '外发中', '安装中', '待交付', '生产中', '拣货中'].includes(text)) return 'warn'
  if (['已接单', '加工中', '已发货'].includes(text)) return 'info'
  if (['启用', '正常', '重点', '可访问', '已结清', '已入库', '已出库', '已完成', '已送达'].includes(text)) return 'ok'
  return 'info'
}
