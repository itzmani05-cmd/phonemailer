import AsyncStorage from '@react-native-async-storage/async-storage'
import { themes, type ColorScheme, type ThemeColors } from '@shared/theme'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useColorScheme } from 'react-native'

export type ThemePreference = 'system' | ColorScheme

const STORAGE_KEY = 'phonemail:theme'

interface ThemeContextValue {
  colors: ThemeColors
  scheme: ColorScheme
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark') setPreferenceState(v)
      })
      .catch(() => {})
  }, [])

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p)
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {})
  }

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference

  const value = useMemo(
    () => ({ colors: themes[scheme], scheme, preference, setPreference }),
    [scheme, preference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
