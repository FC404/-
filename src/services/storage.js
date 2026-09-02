const APP_NAMESPACE = 'factory-chain'
const APP_VERSION = '2026-08-product-v5-compact-demo'
const API_TIMEOUT = 1800
const listSubscribers = new Map()
const LOCAL_TEST_COLLECTIONS = [
  'orders',
  'materials',
  'materialCategories',
  'customers',
  'users',
  'warehouseRecords',
  'warehouseInboundRecords',
  'warehouseOutboundRecords',
]

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function apiBase() {
  if (!isBrowser()) return ''
  const configured = import.meta.env?.VITE_API_BASE
  if (configured) return configured.replace(/\/$/, '')
  if (window.location.port === '5173') return 'http://127.0.0.1:8787/api'
  return '/api'
}

function keyOf(name) {
  return `${APP_NAMESPACE}:${APP_VERSION}:${name}`
}

function currentSession() {
  if (!isBrowser()) return null
  try {
    return JSON.parse(sessionStorage.getItem('factory-chain-auth') || 'null')
  } catch (error) {
    return null
  }
}

function apiHeaders(extra = {}) {
  const session = currentSession()
  return {
    ...extra,
    ...(session?.token ? { authorization: `Bearer ${session.token}` } : {}),
  }
}

function clone(value) {
  // List records can be Vue proxies. JSON serialization deliberately strips
  // reactivity before broadcasting them to another page module.
  return JSON.parse(JSON.stringify(value))
}

export function loadList(name, seed = []) {
  try {
    if (!isBrowser()) return clone(seed)
    const raw = localStorage.getItem(keyOf(name))
    if (!raw) return clone(seed)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : clone(seed)
  } catch (error) {
    return clone(seed)
  }
}

export function saveList(name, records) {
  if (!isBrowser()) return
  localStorage.setItem(keyOf(name), JSON.stringify(records))
  notifyList(name, records)
  pushList(name, records)
}

export function subscribeList(name, listener) {
  if (!listSubscribers.has(name)) listSubscribers.set(name, new Set())
  const subscribers = listSubscribers.get(name)
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

export function loadValue(name, fallback = null) {
  try {
    if (!isBrowser()) return fallback
    const raw = localStorage.getItem(keyOf(name))
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

export function saveValue(name, value) {
  if (!isBrowser()) return
  localStorage.setItem(keyOf(name), JSON.stringify(value))
}

export function clearProductData() {
  if (!isBrowser()) return
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`${APP_NAMESPACE}:`))
    .forEach((key) => localStorage.removeItem(key))
}

export function exportLocalTestData() {
  if (!isBrowser()) throw new Error('当前环境无法导出浏览器测试数据')

  const collections = Object.fromEntries(LOCAL_TEST_COLLECTIONS.map((name) => [name, loadList(name, [])]))
  return {
    product: '工仓链',
    format: 'browser-local-test-data',
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      origin: window.location.origin,
      storage: 'localStorage',
    },
    collections,
    mobile: {
      warehouseRecords: loadRawLocalValue('mobile-warehouse-records', []),
      stock: loadRawLocalValue('mobile-demo-stock', null),
    },
  }
}

export function importLocalTestData(payload) {
  if (!isBrowser()) throw new Error('当前环境无法导入浏览器测试数据')
  if (payload?.format !== 'browser-local-test-data' || payload?.version !== 1 || !payload?.collections) {
    throw new Error('不是有效的工仓链本机测试数据文件')
  }

  const summary = {}
  LOCAL_TEST_COLLECTIONS.forEach((name) => {
    const incoming = payload.collections[name]
    if (!Array.isArray(incoming)) return
    const merged = mergeRecords(loadList(name, []), incoming)
    saveList(name, merged.records)
    summary[name] = merged.added
  })

  if (Array.isArray(payload.mobile?.warehouseRecords)) {
    const current = loadRawLocalValue('mobile-warehouse-records', [])
    const merged = mergeRecords(Array.isArray(current) ? current : [], payload.mobile.warehouseRecords)
    localStorage.setItem('mobile-warehouse-records', JSON.stringify(merged.records))
    summary.mobileWarehouseRecords = merged.added
  }
  if (payload.mobile?.stock !== null && payload.mobile?.stock !== undefined) {
    localStorage.setItem('mobile-demo-stock', String(payload.mobile.stock))
  }

  return summary
}

export async function hydrateList(name, targetRef, seed = []) {
  const base = apiBase()
  if (!base) return

  try {
    const response = await fetchWithTimeout(`${base}/records/${name}`, {
      method: 'GET',
      headers: apiHeaders({ accept: 'application/json' }),
    })

    if (response.status === 404) {
      const currentRecords = Array.isArray(targetRef.value) ? targetRef.value : clone(seed)
      await pushList(name, currentRecords)
      return
    }

    if (!response.ok) return
    const payload = await response.json()
    if (!Array.isArray(payload.records)) return

    targetRef.value = payload.records
    localStorage.setItem(keyOf(name), JSON.stringify(payload.records))
    notifyList(name, payload.records)
  } catch (error) {
    // Local storage remains the offline fallback when the API is unavailable.
  }
}

function notifyList(name, records) {
  const subscribers = listSubscribers.get(name)
  if (!subscribers) return
  subscribers.forEach((listener) => listener(clone(records)))
}

function loadRawLocalValue(name, fallback) {
  try {
    const raw = localStorage.getItem(name)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

function mergeRecords(currentRecords, incomingRecords) {
  const current = Array.isArray(currentRecords) ? clone(currentRecords) : []
  const incoming = Array.isArray(incomingRecords) ? clone(incomingRecords) : []
  const positions = new Map(current.filter((record) => record?.id).map((record, index) => [String(record.id), index]))
  let added = 0

  incoming.forEach((record) => {
    const id = record?.id ? String(record.id) : ''
    if (!id || !positions.has(id)) {
      current.push(record)
      if (id) positions.set(id, current.length - 1)
      added += 1
      return
    }
    current[positions.get(id)] = { ...current[positions.get(id)], ...record }
  })

  return { records: current, added }
}

export async function loginWithApi(phone, password) {
  const base = apiBase()
  if (!base) return null

  try {
    const response = await fetchWithTimeout(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    if (response.status === 401) {
      return { authFailed: true }
    }
    if (!response.ok) return null
    return response.json()
  } catch (error) {
    return null
  }
}

export async function getServerHealth() {
  const base = apiBase()
  if (!base) return null

  try {
    const response = await fetchWithTimeout(`${base}/health`, {
      method: 'GET',
      headers: apiHeaders({ accept: 'application/json' }),
    })
    if (!response.ok) return null
    return response.json()
  } catch (error) {
    return null
  }
}

export async function exportBackup() {
  const base = apiBase()
  if (!base) throw new Error('服务端地址不可用')
  const response = await fetchWithTimeout(`${base}/backup`, {
    method: 'GET',
    headers: apiHeaders({ accept: 'application/json' }),
  })
  if (!response.ok) throw new Error('导出备份失败')
  return response.json()
}

export async function importBackup(payload) {
  const base = apiBase()
  if (!base) throw new Error('服务端地址不可用')
  const response = await fetchWithTimeout(`${base}/backup/import`, {
    method: 'POST',
    headers: apiHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || '导入备份失败')
  return result
}

export async function resetServerData() {
  const base = apiBase()
  if (!base) throw new Error('服务端地址不可用')
  const response = await fetchWithTimeout(`${base}/maintenance/reset`, {
    method: 'POST',
    headers: apiHeaders({ accept: 'application/json' }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || '重置数据失败')
  return result
}

export async function getAuditEvents() {
  const base = apiBase()
  if (!base) return null

  try {
    const response = await fetchWithTimeout(`${base}/records/auditEvents`, {
      method: 'GET',
      headers: apiHeaders({ accept: 'application/json' }),
    })
    if (!response.ok) return null
    const payload = await response.json()
    return Array.isArray(payload.records) ? payload.records : null
  } catch (error) {
    return null
  }
}

async function pushList(name, records) {
  const base = apiBase()
  if (!base) return

  try {
    await fetchWithTimeout(`${base}/records/${name}`, {
      method: 'PUT',
      headers: apiHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ records }),
    })
  } catch (error) {
    // Writes stay in local storage and can sync again after the API is running.
  }
}

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), API_TIMEOUT)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    window.clearTimeout(timer)
  })
}
