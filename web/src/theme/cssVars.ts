import { darkColors, lightColors, webFontStack, type ThemeColors } from '@shared/theme'

// textMuted -> --color-text-muted
const toVar = (key: string) => `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

const declarations = (colors: ThemeColors) =>
  Object.entries(colors)
    .map(([key, value]) => `${toVar(key)}:${value};`)
    .join('')

/**
 * Writes the shared color tokens and font stack as CSS custom properties, so
 * all CSS reads var(--color-*) / var(--font-sans) and never hard-codes them.
 * `data-theme` on <html> forces a scheme; otherwise the OS preference wins.
 */
export function injectThemeVars() {
  const css = `
:root{--font-sans:${webFontStack};color-scheme:light;${declarations(lightColors)}}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;${declarations(darkColors)}}}
:root[data-theme="dark"]{color-scheme:dark;${declarations(darkColors)}}
`
  const style = document.createElement('style')
  style.id = 'theme-vars'
  style.textContent = css
  document.head.prepend(style)
}
