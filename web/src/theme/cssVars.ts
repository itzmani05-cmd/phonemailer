import { darkColors, lightColors, webFontStack, type ThemeColors } from '@shared/theme'

const toVar = (key: string) => `--color-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

const declarations = (colors: ThemeColors) =>
  Object.entries(colors)
    .map(([key, value]) => `${toVar(key)}:${value};`)
    .join('')

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
