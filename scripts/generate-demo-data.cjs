const fs = require('node:fs')
const path = require('node:path')
const { generateDemoData } = require('../server/demo-data')

const dataDir = path.resolve(__dirname, '..', 'server', 'data')
const data = generateDemoData()

fs.mkdirSync(dataDir, { recursive: true })

for (const [collection, records] of Object.entries(data)) {
  fs.writeFileSync(path.join(dataDir, `${collection}.json`), JSON.stringify(records, null, 2))
}

console.log(
  Object.entries(data)
    .map(([collection, records]) => `${collection}:${records.length}`)
    .join(' '),
)
