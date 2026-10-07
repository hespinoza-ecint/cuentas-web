import { afterEach, describe, expect, it } from 'vitest'
import { effectiveTheme, setThemePreference } from './theme.ts'

describe('tema claro/oscuro', () => {
  afterEach(() => {
    setThemePreference('system')
    localStorage.removeItem('cuentas.theme')
  })

  it('aplica y persiste el modo oscuro', () => {
    setThemePreference('dark')

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('cuentas.theme')).toBe('dark')
    expect(effectiveTheme()).toBe('dark')
  })

  it('vuelve al modo claro y quita la clase', () => {
    setThemePreference('dark')
    setThemePreference('light')

    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('cuentas.theme')).toBe('light')
    expect(effectiveTheme()).toBe('light')
  })

  it('con preferencia "system" usa el sistema (jsdom no emula oscuro)', () => {
    setThemePreference('system')

    expect(effectiveTheme('system')).toBe('light')
    expect(effectiveTheme('dark')).toBe('dark')
  })
})
