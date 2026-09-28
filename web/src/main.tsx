import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LanguageProvider } from './i18n'
import { Root } from './Root'
import { injectThemeVars } from './theme/cssVars'
import { applyTheme, readStoredTheme } from './theme/useThemePreference'

injectThemeVars()
applyTheme(readStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <Root />
    </LanguageProvider>
  </StrictMode>,
)
