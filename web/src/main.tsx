import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { injectThemeVars } from './theme/cssVars'
import { applyTheme, readStoredTheme } from './theme/useThemePreference'

injectThemeVars()
applyTheme(readStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
