import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LANGUAGES, STRINGS, type Language, type StringKey } from './strings'

const KEY = 'phonemail:language'

type Translate = (key: StringKey, vars?: Record<string, string | number>) => string

interface LanguageContextValue {
  language: Language | null | undefined
  setLanguage: (language: Language | null) => void
  t: Translate
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const isLanguage = (value: string | null): value is Language => LANGUAGES.some((l) => l.code === value)

export function deviceLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase()
  return LANGUAGES.find((l) => locale.startsWith(l.code))?.code ?? 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setState] = useState<Language | null | undefined>(undefined)

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setState(isLanguage(v) ? v : null))
      .catch(() => setState(null))
  }, [])

  const setLanguage = useCallback((next: Language | null) => {
    setState(next)
    const write = next ? AsyncStorage.setItem(KEY, next) : AsyncStorage.removeItem(KEY)
    write.catch(() => {})
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      let text = STRINGS[language ?? 'en'][key]
      for (const [name, value] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, String(value))
      return text
    },
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

export const useT = () => useLanguage().t
