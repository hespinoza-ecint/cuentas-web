/**
 * Genera los PNG del manifest y el icono de iOS desde los SVG de public/.
 * Se ejecuta a mano cuando cambie la identidad visual:
 *
 *   node scripts/gen-icons.mjs
 *
 * Requiere chromium de Playwright (ya instalado para los E2E).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const PUBLIC = resolve(process.cwd(), 'public')

const JOBS = [
  { svg: 'icon.svg', size: 192, out: 'icon-192.png' },
  { svg: 'icon.svg', size: 512, out: 'icon-512.png' },
  { svg: 'maskable-icon.svg', size: 512, out: 'maskable-icon-512.png' },
  // iOS ignora el manifest para el icono de inicio: usa este PNG de 180.
  { svg: 'icon.svg', size: 180, out: 'apple-touch-icon.png' },
]

const browser = await chromium.launch()
const page = await browser.newPage()

for (const job of JOBS) {
  const svg = readFileSync(resolve(PUBLIC, job.svg), 'utf8')
  await page.setViewportSize({ width: job.size, height: job.size })
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}svg{display:block;width:${job.size}px;height:${job.size}px}</style>${svg}`,
  )
  const buffer = await page.screenshot({
    clip: { x: 0, y: 0, width: job.size, height: job.size },
  })
  writeFileSync(resolve(PUBLIC, job.out), buffer)
  console.log(`OK ${job.out} (${job.size}px)`)
}

await browser.close()
