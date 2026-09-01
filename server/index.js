const fs = require('node:fs')
const http = require('node:http')
const crypto = require('node:crypto')
const path = require('node:path')
const { URL } = require('node:url')
const seedData = require('./seed-data')

const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const dataDir = path.join(__dirname, 'data')
const backupDir = path.join(dataDir, 'backups')
const port = Number(process.env.PORT || 8787)
const allowedCollections = new Set(Object.keys(seedData))
const tokenSecret = process.env.AUTH_SECRET || 'factory-chain-local-secret'
const tokenTtlMs = 12 * 60 * 60 * 1000

fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(backupDir, { recursive: true })

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  })
  res.end(JSON.stringify(payload))
}

function sendUnauthorized(res) {
  sendJson(res, 401, { error: '请先登录后再操作' })
}

function sendNotFound(res) {
  sendJson(res, 404, { error: 'Not found' })
}

function collectionFile(collection) {
  if (!allowedCollections.has(collection)) return null
  return path.join(dataDir, `${collection}.json`)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function ensureSeedData() {
  for (const collection of allowedCollections) {
    const file = collectionFile(collection)
    if (!file || fs.existsSync(file)) continue
    writeCollection(collection, clone(seedData[collection]))
  }
}

function readBody(req, limit = 5_000_000) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > limit) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!body) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function readCollection(collection) {
  const file = collectionFile(collection)
  if (!file) return null
  if (!fs.existsSync(file) && seedData[collection]) {
    writeCollection(collection, clone(seedData[collection]))
  }
  if (!fs.existsSync(file)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

function writeCollection(collection, records) {
  const file = collectionFile(collection)
  if (!file) return false
  fs.writeFileSync(file, JSON.stringify(records, null, 2))
  return true
}

function signToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', tokenSecret).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [encoded, signature] = token.split('.')
  const expected = crypto.createHmac('sha256', tokenSecret).update(encoded).digest('base64url')
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload.exp || Date.now() > payload.exp) return null
    return payload
  } catch (error) {
    return null
  }
}

function currentUser(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return verifyToken(token)
}

function requireUser(req, res) {
  const user = currentUser(req)
  if (!user) sendUnauthorized(res)
  return user
}

function findLoginUser(phone) {
  const users = readCollection('users') || []
  return users.find((user) => user.phone === phone && user.status === '正常')
}

function audit(req, action, result = '已记录', tone = 'info', userOverride = null) {
  const user = userOverride || currentUser(req) || { name: '系统', phone: 'system' }
  const events = readCollection('auditEvents') || []
  const event = {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    user: user.name || user.phone || '系统',
    phone: user.phone || 'system',
    action,
    result,
    tone,
  }
  writeCollection('auditEvents', [event, ...events].slice(0, 200))
}

function readAllCollections() {
  const collections = {}
  for (const collection of allowedCollections) {
    collections[collection] = readCollection(collection) || []
  }
  return collections
}

function writeAllCollections(collections) {
  for (const collection of allowedCollections) {
    if (!Array.isArray(collections[collection])) {
      throw new Error(`${collection} must be an array`)
    }
  }

  for (const collection of allowedCollections) {
    writeCollection(collection, collections[collection])
  }
}

function backupCurrentData(reason = 'manual') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = path.join(backupDir, `${stamp}-${reason}.json`)
  const payload = {
    product: '工仓链',
    version: 1,
    createdAt: new Date().toISOString(),
    reason,
    collections: readAllCollections(),
  }
  fs.writeFileSync(file, JSON.stringify(payload, null, 2))
  return file
}

function validateBackupPayload(payload) {
  const collections = payload?.collections || payload
  if (!collections || typeof collections !== 'object') {
    throw new Error('Invalid backup payload')
  }

  for (const collection of allowedCollections) {
    if (collection === 'auditEvents' && !Array.isArray(collections[collection])) {
      collections[collection] = clone(seedData.auditEvents)
      continue
    }
    if (!Array.isArray(collections[collection])) {
      throw new Error(`${collection} is missing or invalid`)
    }
  }

  return collections
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return true
  }

  if (url.pathname === '/api/health') {
    const collections = readAllCollections()
    sendJson(res, 200, {
      ok: true,
      product: '工仓链',
      collections: Object.fromEntries(
        Object.entries(collections).map(([collection, records]) => [collection, records.length]),
      ),
      time: new Date().toISOString(),
    })
    return true
  }

  if (url.pathname === '/api/backup' && req.method === 'GET') {
    if (!requireUser(req, res)) return true
    audit(req, '导出业务备份', '已完成', 'info')
    sendJson(res, 200, {
      product: '工仓链',
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: readAllCollections(),
    })
    return true
  }

  if (url.pathname === '/api/backup/import' && req.method === 'POST') {
    if (!requireUser(req, res)) return true
    const body = await readBody(req, 20_000_000)
    const collections = validateBackupPayload(body)
    const backupFile = backupCurrentData('before-import')
    writeAllCollections(collections)
    audit(req, '导入业务备份并覆盖当前数据', '已完成', 'warn')
    sendJson(res, 200, {
      ok: true,
      backupFile: path.basename(backupFile),
      collections: Object.fromEntries(
        Object.entries(collections).map(([collection, records]) => [collection, records.length]),
      ),
    })
    return true
  }

  if (url.pathname === '/api/maintenance/reset' && req.method === 'POST') {
    if (!requireUser(req, res)) return true
    const backupFile = backupCurrentData('before-reset')
    writeAllCollections(clone(seedData))
    audit(req, '恢复系统初始数据', '已完成', 'warn')
    sendJson(res, 200, {
      ok: true,
      backupFile: path.basename(backupFile),
      collections: Object.fromEntries(
        Object.entries(seedData).map(([collection, records]) => [collection, records.length]),
      ),
    })
    return true
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req)
    const phone = String(body?.phone || '')
    const password = String(body?.password || '')
    const loginUser = findLoginUser(phone)
    if (loginUser && password === '123456') {
      const userPayload = {
        id: loginUser.id,
        phone: loginUser.phone,
        name: loginUser.name,
        role: loginUser.role,
        level: loginUser.level,
        exp: Date.now() + tokenTtlMs,
      }
      audit(req, `${loginUser.name} 登录系统`, '已登录', 'ok', loginUser)
      sendJson(res, 200, {
        token: signToken(userPayload),
        user: {
          id: loginUser.id,
          phone: loginUser.phone,
          role: loginUser.role,
          name: loginUser.name,
          level: loginUser.level,
        },
      })
      return true
    }
    sendJson(res, 401, { error: '手机号或密码错误' })
    return true
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const user = requireUser(req, res)
    if (!user) return true
    sendJson(res, 200, { user })
    return true
  }

  const match = url.pathname.match(/^\/api\/records\/([^/]+)$/)
  if (!match) return false

  const collection = match[1]
  if (!collectionFile(collection)) {
    sendJson(res, 400, { error: 'Unknown collection' })
    return true
  }

  if (req.method === 'GET') {
    if (!requireUser(req, res)) return true
    const records = readCollection(collection)
    if (!records) {
      sendJson(res, 404, { error: 'Collection is not initialized' })
      return true
    }
    sendJson(res, 200, { records })
    return true
  }

  if (req.method === 'PUT') {
    const user = requireUser(req, res)
    if (!user) return true
    const body = await readBody(req)
    if (!Array.isArray(body?.records)) {
      sendJson(res, 400, { error: 'records must be an array' })
      return true
    }
    writeCollection(collection, body.records)
    audit(req, `保存${collection}数据`, '已保存', collection === 'users' ? 'warn' : 'info', user)
    sendJson(res, 200, { ok: true, count: body.records.length })
    return true
  }

  sendJson(res, 405, { error: 'Method not allowed' })
  return true
}

function safeStaticPath(urlPathname) {
  const requested = decodeURIComponent(urlPathname === '/' ? '/index.html' : urlPathname)
  const normalized = path.normalize(requested).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(distDir, normalized)
  if (!filePath.startsWith(distDir)) return null
  return filePath
}

function serveStatic(req, res, url) {
  let filePath = safeStaticPath(url.pathname)
  if (!filePath) {
    sendNotFound(res)
    return
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html')
  }

  if (!fs.existsSync(filePath)) {
    sendJson(res, 503, { error: '请先运行 npm run build 生成 dist 目录' })
    return
  }

  const ext = path.extname(filePath)
  res.writeHead(200, {
    'content-type': mimeTypes[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
  })
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`)
  try {
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url)
      if (handled) return
    }
    serveStatic(req, res, url)
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error' })
  }
})

ensureSeedData()

server.listen(port, '0.0.0.0', () => {
  console.log(`工仓链服务已启动，端口：${port}`)
})
