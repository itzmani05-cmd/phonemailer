import type { StringKey } from '@shared/i18n/strings'
import { useT } from '../i18n'
import { AuthLayout } from './AuthLayout'

const SECTIONS: [StringKey, StringKey][] = [
  ['terms.accountTitle', 'terms.accountBody'],
  ['terms.useTitle', 'terms.useBody'],
  ['terms.dataTitle', 'terms.dataBody'],
  ['terms.changesTitle', 'terms.changesBody'],
]

export function TermsPage() {
  const t = useT()
  return (
    <AuthLayout title={t('terms.title')} subtitle={t('welcome.tagline')} footer={<a href="/">{t('web.goToMail')}</a>}>
      <div className="terms">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2>{t(title)}</h2>
            <p>{t(body)}</p>
          </section>
        ))}
      </div>
    </AuthLayout>
  )
}
