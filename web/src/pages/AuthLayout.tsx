import { LANGUAGES } from '@shared/i18n/strings'
import type { ReactNode } from 'react'
import { BrandMark } from '../components/BrandMark'
import { useLanguage } from '../i18n'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className="auth-page">
      <main className="auth-card">
        <div className="auth-brand">
          <BrandMark size={56} />
          <span className="brand-name">PhoneMail</span>
        </div>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </main>
      <footer className="auth-footer">
        <select
          className="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as typeof language)}
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
        {footer}
      </footer>
    </div>
  )
}
