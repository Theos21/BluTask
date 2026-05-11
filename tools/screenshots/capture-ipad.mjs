import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, readdirSync, rmSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = `file://${join(__dirname, 'screens-ipad.html')}`
const outDir = join(__dirname, '..', '..', 'screenshots')
mkdirSync(outDir, { recursive: true })

// Remove old iPad screenshots
const old = readdirSync(outDir).filter(f => f.includes('ipad'))
old.forEach(f => rmSync(join(outDir, f)))
if (old.length) console.log(`Removed ${old.length} old iPad screenshot(s)\n`)

const ORIG_W = 1032
const ORIG_H = 1376

const SIZES = [
  { label: 'ipad-13inch',   w: 2064, h: 2752, dpr: 2 }, // 13" iPad Pro M4
  { label: 'ipad-12.9inch', w: 2048, h: 2732, dpr: 2 }, // 12.9" iPad Pro
]

const SCREENS = [
  { id: 'ip1', name: '1-home' },
  { id: 'ip2', name: '2-school' },
  { id: 'ip3', name: '3-tasks' },
]

const browser = await puppeteer.launch({ headless: 'new' })

for (const size of SIZES) {
  const vpW = size.w / size.dpr
  const vpH = size.h / size.dpr
  const scaleX = vpW / ORIG_W
  const scaleY = vpH / ORIG_H

  console.log(`Rendering ${size.label} (${size.w}×${size.h}) — viewport ${vpW}×${vpH} @${size.dpr}x`)

  const page = await browser.newPage()
  await page.setViewport({ width: vpW, height: vpH, deviceScaleFactor: size.dpr })
  await page.goto(htmlPath, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)

  await page.evaluate((oW, oH, tW, tH, sX, sY) => {
    document.querySelectorAll('.screen').forEach(screen => {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = `width:${oW}px;height:${oH}px;transform:scale(${sX},${sY});transform-origin:top left;position:relative;flex-shrink:0;`
      while (screen.firstChild) wrapper.appendChild(screen.firstChild)
      screen.appendChild(wrapper)
      screen.style.width = tW + 'px'
      screen.style.height = tH + 'px'
      screen.style.overflow = 'hidden'
    })
  }, ORIG_W, ORIG_H, vpW, vpH, scaleX, scaleY)

  for (const screen of SCREENS) {
    const el = await page.$(`#${screen.id}`)
    if (!el) { console.warn(`  ⚠  #${screen.id} not found`); continue }
    const filename = `screenshot-${screen.name}-${size.label}.png`
    await el.screenshot({ path: join(outDir, filename) })
    console.log(`  ✓  ${filename}`)
  }

  await page.close()
  console.log()
}

await browser.close()

// Verify dimensions
import { readFileSync } from 'fs'
console.log('─'.repeat(52))
console.log(`All ${SIZES.length * SCREENS.length} iPad screenshots saved to:`)
console.log(outDir)
console.log()
console.log('Verified dimensions:')
for (const size of SIZES) {
  const buf = readFileSync(join(outDir, `screenshot-1-home-${size.label}.png`))
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20)
  console.log(`  ${size.label.padEnd(16)} ${w}×${h}`)
}
