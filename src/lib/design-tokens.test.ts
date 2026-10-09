import { describe, expect, it } from 'vitest'

/*
 * Guardia del sistema de color (fase 19). Falla si en src vuelven:
 * - Utilidades con la paleta por defecto de Tailwind (bg-slate-500, text-red-600...).
 * - La variante `dark:` por componente (los tokens viven en src/index.css).
 * - Colores hexadecimales fijos en el codigo.
 * Los archivos de prueba quedan fuera del escaneo.
 */
const SOURCES = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.d.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const PALETTE_NAMES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'white',
  'black',
].join('|')

const RULES = [
  {
    label: 'utilidad de la paleta por defecto de Tailwind',
    pattern: new RegExp(
      `(?<![\\w-])(?:bg|text|border(?:-[trblxy])?|ring|divide|fill|stroke|from|to|via|outline|decoration|caret|accent|placeholder)-(?:${PALETTE_NAMES})(?:-\\d{2,3})?(?:/\\d+)?`,
    ),
  },
  { label: 'clase dark: por componente', pattern: /(?<![\w-])dark:/ },
  { label: 'color hexadecimal en codigo', pattern: /#[0-9a-fA-F]{3,8}\b/ },
]

describe('sistema de color', () => {
  it('no usa la paleta por defecto, dark: ni colores fijos', () => {
    const problems: string[] = []
    for (const [path, source] of Object.entries(SOURCES)) {
      if (/\.(test|spec)\.[jt]sx?$/.test(path)) {
        continue
      }
      source.split(/\r?\n/).forEach((line, index) => {
        for (const rule of RULES) {
          if (rule.pattern.test(line)) {
            problems.push(`${path}:${index + 1} usa ${rule.label}: ${line.trim()}`)
          }
        }
      })
    }
    expect(problems).toEqual([])
  })
})
