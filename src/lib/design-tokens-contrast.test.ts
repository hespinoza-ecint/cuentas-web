import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Las pruebas corren en Node: se lee el CSS tal cual para validar sus tokens.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/*
 * Guardia de contraste (fase 20): calcula el contraste WCAG 2.1 real de los
 * pares de tokens que la interfaz usa (texto AA 4.5:1, componentes 3:1) en
 * modo claro y oscuro. Si se cambia un color en src/index.css, esta prueba
 * dice exactamente que par falla y con que razon.
 */

function parseTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  const pattern = /--color-([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g
  for (const match of block.matchAll(pattern)) {
    tokens[match[1]] = match[2]
  }
  return tokens
}

function lightTokens(): Record<string, string> {
  const start = css.indexOf('@theme {')
  const end = css.indexOf('\n}', start)
  return parseTokens(css.slice(start, end))
}

function darkTokens(): Record<string, string> {
  const start = css.indexOf('\n.dark {')
  const end = css.indexOf('\n}', start + 1)
  // Los tokens que el modo oscuro no redefine heredan del modo claro.
  return { ...lightTokens(), ...parseTokens(css.slice(start, end)) }
}

function channel(value: number): number {
  const s = value / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

interface Pair {
  fg: string
  bg: string
  min: number
  label: string
}

const TEXT = 4.5
const UI = 3

const PAIRS: Pair[] = [
  { fg: 'ink', bg: 'canvas', min: TEXT, label: 'texto primario sobre el fondo' },
  { fg: 'ink', bg: 'surface', min: TEXT, label: 'texto primario sobre tarjetas' },
  { fg: 'ink-secondary', bg: 'canvas', min: TEXT, label: 'texto de apoyo sobre el fondo' },
  { fg: 'ink-secondary', bg: 'surface', min: TEXT, label: 'texto de apoyo sobre tarjetas' },
  { fg: 'ink-muted', bg: 'canvas', min: TEXT, label: 'texto tenue sobre el fondo' },
  { fg: 'ink-muted', bg: 'surface', min: TEXT, label: 'texto tenue sobre tarjetas' },
  { fg: 'ink-muted', bg: 'surface-subtle', min: TEXT, label: 'texto tenue sobre hover' },
  { fg: 'on-brand', bg: 'brand', min: TEXT, label: 'texto del boton primario' },
  { fg: 'brand', bg: 'surface', min: TEXT, label: 'enlaces sobre tarjetas' },
  { fg: 'brand', bg: 'canvas', min: TEXT, label: 'enlaces sobre el fondo' },
  { fg: 'brand-ink', bg: 'brand-soft', min: TEXT, label: 'navegacion activa' },
  { fg: 'on-accent', bg: 'danger-solid', min: TEXT, label: 'texto del boton de peligro' },
  { fg: 'danger', bg: 'surface', min: TEXT, label: 'mensajes de error sobre tarjetas' },
  { fg: 'danger', bg: 'canvas', min: TEXT, label: 'mensajes de error sobre el fondo' },
  { fg: 'success', bg: 'surface', min: TEXT, label: 'exito sobre tarjetas' },
  { fg: 'warning', bg: 'surface', min: TEXT, label: 'aviso sobre tarjetas' },
  { fg: 'info', bg: 'surface', min: TEXT, label: 'info sobre tarjetas' },
  { fg: 'income', bg: 'surface', min: TEXT, label: 'montos de ingreso' },
  { fg: 'expense', bg: 'surface', min: TEXT, label: 'montos de gasto' },
  { fg: 'success-ink', bg: 'success-soft', min: TEXT, label: 'alerta de exito' },
  { fg: 'danger-ink', bg: 'danger-soft', min: TEXT, label: 'alerta de error' },
  { fg: 'warning-ink', bg: 'warning-soft', min: TEXT, label: 'alerta de aviso' },
  { fg: 'info-ink', bg: 'info-soft', min: TEXT, label: 'alerta informativa' },
  { fg: 'on-inverse-muted', bg: 'inverse', min: TEXT, label: 'texto secundario sobre inverse' },
  { fg: 'line-strong', bg: 'surface', min: UI, label: 'bordes de campos' },
  { fg: 'line-strong', bg: 'canvas', min: UI, label: 'bordes sobre el fondo' },
  { fg: 'focus', bg: 'surface', min: UI, label: 'anillo de foco sobre tarjetas' },
  { fg: 'focus', bg: 'canvas', min: UI, label: 'anillo de foco sobre el fondo' },
  { fg: 'chart-line', bg: 'surface', min: UI, label: 'linea de la grafica' },
  { fg: 'chart-line', bg: 'canvas', min: UI, label: 'linea de la grafica sobre el fondo' },
]

describe('contraste del sistema de color', () => {
  for (const [theme, tokens] of [
    ['claro', lightTokens()],
    ['oscuro', darkTokens()],
  ] as const) {
    it(`modo ${theme}: todos los pares cumplen WCAG AA`, () => {
      const failures: string[] = []
      for (const pair of PAIRS) {
        const fg = tokens[pair.fg]
        const bg = tokens[pair.bg]
        expect(fg, `falta el token --color-${pair.fg} (${theme})`).toBeDefined()
        expect(bg, `falta el token --color-${pair.bg} (${theme})`).toBeDefined()
        const ratio = contrast(fg, bg)
        if (ratio + 0.005 < pair.min) {
          failures.push(
            `${pair.label}: ${pair.fg} (${fg}) sobre ${pair.bg} (${bg}) = ${ratio.toFixed(2)}:1 (minimo ${pair.min}:1)`,
          )
        }
      }
      expect(failures).toEqual([])
    })
  }
})
