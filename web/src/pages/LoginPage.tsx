import { setToken } from '../auth/session'
import { PhoneOtpForm } from '../components/PhoneOtpForm'
import { useT } from '../i18n'
import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const t = useT()
  return (
    <AuthLayout
      title={t('web.loginTitle')}
      subtitle={t('welcome.tagline')}
      footer={<a href="/register">{t('web.registerLink')}</a>}
    >
      <PhoneOtpForm
        onVerified={(result) => setToken(result.accessToken)}
        aboveButton={
          <p className="auth-terms">
            {t('web.agree')}{' '}
            <a href="/terms" target="_blank" rel="noreferrer">
              {t('web.terms')}
            </a>
          </p>
        }
      />
    </AuthLayout>
  )
}
