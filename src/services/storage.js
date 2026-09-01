const APP_NAMESPACE = 'factory-chain'
const APP_VERSION = '2026-08-product-v5-compact-demo'
const API_TIMEOUT = 1800
const listSubscribers = new Map()

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
