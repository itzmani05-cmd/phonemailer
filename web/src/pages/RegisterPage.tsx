import type { OtpVerifyResult } from '@shared/mail'
import { useState } from 'react'
import { PhoneOtpForm } from '../components/PhoneOtpForm'
import { Icon } from '../components/Icon'
import { useT } from '../i18n'
import { AuthLayout } from './AuthLayout'

export function RegisterPage() {
  const t = useT()
  const [formKey, setFormKey] = useState(0)
  const [done, setDone] = useState<{ address: string; isNewUser: boolean } | null>(null)

  const onVerified = (result: OtpVerifyResult) => {
    setDone({ address: result.user.email, isNewUser: result.isNewUser })
    setFormKey((k) => k + 1)
  }

  return (
    <AuthLayout
      title={t('web.registerTitle')}
      subtitle={t('web.registerSubtitle')}
      footer={<a href="/">{t('web.goToMail')}</a>}
    >
      {done && (
        <div className="auth-success" role="status">
          <Icon name="checkCheck" size={20} />
          <div>
            <strong>
              {done.isNewUser
                ? t('web.created', { address: done.address })
                : t('web.exists', { address: done.address })}
            </strong>
            <span>{t('web.nextAccount')}</span>
          </div>
        </div>
      )}
      <PhoneOtpForm
        key={formKey}
        onVerified={onVerified}
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
