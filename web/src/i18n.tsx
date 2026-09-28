import { LANGUAGES, STRINGS, type Language, type StringKey } from '@shared/i18n/strings'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const KEY = 'phonemail:language'

type Translate = (key: StringKey, vars?: Record<string, string | number>) => string

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Translate
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const isLanguage = (value: string | null): value is Language => LANGUAGES.some((l) => l.code === value)

function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(KEY)
    if (isLanguage(stored)) return stored
  } catch {
    return 'en'
  }
  const browser = navigator.language.toLowerCase()
  return LANGUAGES.find((l) => browser.startsWith(l.code))?.code ?? 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setState] = useState<Language>(initialLanguage)

  const setLanguage = useCallback((next: Language) => {
    setState(next)
    document.documentElement.lang = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      return
    }
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      let text = STRINGS[language][key]
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
