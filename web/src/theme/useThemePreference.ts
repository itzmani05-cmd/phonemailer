import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'phonemail:theme'

export function readStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
  }
  return 'system'
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  if (preference === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', preference)
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredTheme)

  useEffect(() => {
    applyTheme(preference)
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
    }
  }, [preference])

  return [preference, setPreference] as const
}
