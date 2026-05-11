import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, readdirSync, rmSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = `file://${join(__dirname, 'screens.html')}`
const outDir = join(__dirname, '..', '..', 'screenshots')
mkdirSync(outDir, { recursive: true })

// Clean up old screenshots from previous runs
const existing = readdirSync(outDir).filter(f => f.endsWith('.png'))
existing.forEach(f => rmSync(join(outDir, f)))
if (existing.length) console.log(`Removed ${existing.length} old screenshot(s)\n`)

// Original design dimensions (matches screens.html)
const ORIG_W = 430
const ORIG_H = 932

// All 4 required Apple App Store sizes
const SIZES = [
  { label: '5.5inch', w: 1242, h: 2208, dpr: 3 }, // iPhone 8 Plus / 7 Plus
  { label: '6.1inch', w: 1170, h: 2532, dpr: 3 }, // iPhone 12/13/14 (6.1")
  { label: '6.5inch', w: 1284, h: 2778, dpr: 3 }, // iPhone 14/15 Plus, 13/12 Pro Max
  { label: '6.9inch', w: 1290, h: 2796, dpr: 3 }, // iPhone 15/16 Pro Max
]

const SCREENS = [
  { id: 's1', name: '1-home' },
  { id: 's2', name: '2-tasks' },
  { id: 's3', name: '3-school' },
  { id: 's4', name: '4-calendar' },
  { id: 's5', name: '5-import' },
]

const browser = await puppeteer.launch({ headless: 'new' })

for (const size of SIZES) {
  const vpW = size.w / size.dpr   // logical CSS width
  const vpH = size.h / size.dpr   // logical CSS height
  const scaleX = vpW / ORIG_W
  const scaleY = vpH / ORIG_H

  console.log(`Rendering ${size.label} (${size.w}×${size.h}) — viewport ${vpW}×${vpH} @${size.dpr}x`)

  const page = await browser.newPage()
  await page.setViewport({ width: vpW, height: vpH, deviceScaleFactor: size.dpr })
  await page.goto(htmlPath, { waitUntil: 'networkidle0' })

  // Wait for web fonts
  await page.evaluate(() => document.fonts.ready)

  // Wrap each .screen's children and apply a scale transform so the
  // original 430×932 design fits exactly into the target CSS dimensions.
  await page.evaluate((origW, origH, tW, tH, sX, sY) => {
    document.querySelectorAll('.screen').forEach(screen => {
      const wrapper = document.createElement('div')
      wrapper.style.cssText = [
        `width:${origW}px`,
        `height:${origH}px`,
        `transform:scale(${sX},${sY})`,
        `transform-origin:top left`,
        `position:relative`,
        `flex-shrink:0`,
      ].join(';')
      while (screen.firstChild) wrapper.appendChild(screen.firstChild)
      screen.appendChild(wrapper)
      screen.style.width  = tW + 'px'
      screen.style.height = tH + 'px'
      screen.style.overflow = 'hidden'
      screen.style.flexShrink = '0'
    })
  }, ORIG_W, ORIG_H, vpW, vpH, scaleX, scaleY)

  for (const screen of SCREENS) {
    const el = await page.$(`#${screen.id}`)
    if (!el) {
      console.warn(`  ⚠  #${screen.id} not found — skipping`)
      continue
    }
    const filename = `screenshot-${screen.name}-${size.label}.png`
    await el.screenshot({ path: join(outDir, filename) })
    console.log(`  ✓  ${filename}`)
  }

  await page.close()
  console.log()
}

await browser.close()

// Print summary
console.log('─'.repeat(52))
console.log(`All ${SIZES.length * SCREENS.length} screenshots saved to:`)
console.log(outDir)
console.log()
console.log('Size summary:')
for (const s of SIZES) {
  console.log(`  ${s.label.padEnd(9)} ${s.w}×${s.h}  (${SCREENS.length} files)`)
}
