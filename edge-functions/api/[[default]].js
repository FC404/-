const COLLECTIONS = [
  'orders',
  'materials',
  'customers',
  'users',
  'warehouseRecords',
  'warehouseInboundRecords',
  'warehouseOutboundRecords',
  'auditEvents',
]

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

function initialRecords(name) {
  return name === 'users' ? [{ ...testAdministrator }] : []
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    },
  })
}

function keyFor(name) {
  return `factory_chain_${name}`
}

function base64urlEncode(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

async function signingKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function signToken(payload, secret) {
  const body = base64urlEncode(JSON.stringify(payload))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(body))
  return `${body}.${base64urlEncode(new Uint8Array(signature))}`
}

async function verifyToken(token, secret) {
  if (!token?.includes('.')) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const valid = await crypto.subtle.verify('HMAC', await signingKey(secret), base64urlDecode(signature), new TextEncoder().encode(body))
  if (!valid) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)))
    return payload.exp && payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

async function parseBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function getRecords(kv, name) {
  const value = await kv.get(keyFor(name), { type: 'json' })
  if (Array.isArray(value)) return value
  const initial = initialRecords(name)
  await kv.put(keyFor(name), JSON.stringify(initial))
  return initial
}

async function putRecords(kv, name, records) {
  await kv.put(keyFor(name), JSON.stringify(records))
}

async function audit(kv, user, action, result = '已记录', tone = 'info') {
  const events = await getRecords(kv, 'auditEvents')
  events.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    user: user?.name || '系统',
    phone: user?.phone || 'system',
    action,
    result,
    tone,
  })
  await putRecords(kv, 'auditEvents', events.slice(0, 200))
}

function getKv(context) {
  return context.env?.FACTORY_CHAIN_KV || globalThis.FACTORY_CHAIN_KV
}

export async function onRequest(context) {
  const { request } = context
  if (request.method === 'OPTIONS') return json({}, 204)

  const kv = getKv(context)
  if (!kv) return json({ error: 'KV 存储尚未绑定，请在 EdgeOne Pages 项目中绑定 FACTORY_CHAIN_KV。' }, 503)

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/?/, '')
  const secret = context.env?.AUTH_SECRET || 'factory-chain-test-secret-change-before-production'
  const authorization = request.headers.get('authorization') || ''
  const user = await verifyToken(authorization.startsWith('Bearer ') ? authorization.slice(7) : '', secret)
  const requireUser = () => user ? null : json({ error: '请先登录后再操作' }, 401)

  if (path === 'health') {
    const counts = await Promise.all(COLLECTIONS.map(async (name) => [name, (await getRecords(kv, name)).length]))
    return json({ ok: true, product: '工仓链', collections: Object.fromEntries(counts), time: new Date().toISOString() })
  }

  if (path === 'auth/login' && request.method === 'POST') {
    const body = await parseBody(request)
    const loginUser = (await getRecords(kv, 'users')).find((item) => item.phone === String(body?.phone || '') && item.status === '正常')
    if (!loginUser || String(body?.password || '') !== '123456') return json({ error: '手机号或密码错误' }, 401)
    const userPayload = {
      id: loginUser.id,
      phone: loginUser.phone,
      name: loginUser.name,
      role: loginUser.role,
      level: loginUser.level,
      exp: Date.now() + 12 * 60 * 60 * 1000,
    }
    await audit(kv, loginUser, `${loginUser.name} 登录系统`, '已登录', 'ok')
    return json({ token: await signToken(userPayload, secret), user: loginUser })
  }

  if (path === 'auth/me' && request.method === 'GET') {
    const denied = requireUser()
    return denied || json({ user })
  }

  if (path === 'backup' && request.method === 'GET') {
    const denied = requireUser()
    if (denied) return denied
    const collections = Object.fromEntries(await Promise.all(COLLECTIONS.map(async (name) => [name, await getRecords(kv, name)])))
    await audit(kv, user, '导出业务备份', '已完成', 'info')
    return json({ product: '工仓链', version: 1, exportedAt: new Date().toISOString(), collections })
  }

  if (path === 'backup/import' && request.method === 'POST') {
    const denied = requireUser()
    if (denied) return denied
    const body = await parseBody(request)
    const collections = body?.collections || body
    if (!collections || !COLLECTIONS.every((name) => Array.isArray(collections[name]))) return json({ error: '备份文件不完整或格式错误' }, 400)
    await Promise.all(COLLECTIONS.map((name) => putRecords(kv, name, collections[name])))
    await audit(kv, user, '导入业务备份并覆盖当前数据', '已完成', 'warn')
    return json({ ok: true, collections: Object.fromEntries(COLLECTIONS.map((name) => [name, collections[name].length])) })
  }

  if (path === 'maintenance/reset' && request.method === 'POST') {
    const denied = requireUser()
    if (denied) return denied
    await Promise.all(COLLECTIONS.map((name) => putRecords(kv, name, initialRecords(name))))
    await audit(kv, testAdministrator, '恢复系统初始数据', '已完成', 'warn')
    return json({ ok: true, collections: Object.fromEntries(COLLECTIONS.map((name) => [name, initialRecords(name).length])) })
  }

  const recordMatch = path.match(/^records\/([^/]+)$/)
  if (!recordMatch || !COLLECTIONS.includes(recordMatch[1])) return json({ error: 'Not found' }, 404)
  const collection = recordMatch[1]
  const denied = requireUser()
  if (denied) return denied

  if (request.method === 'GET') return json({ records: await getRecords(kv, collection) })
  if (request.method === 'PUT') {
    const body = await parseBody(request)
    if (!Array.isArray(body?.records)) return json({ error: 'records must be an array' }, 400)
    await putRecords(kv, collection, body.records)
    await audit(kv, user, `保存${collection}数据`, '已保存', collection === 'users' ? 'warn' : 'info')
    return json({ ok: true, count: body.records.length })
  }

  return json({ error: 'Method not allowed' }, 405)
}
