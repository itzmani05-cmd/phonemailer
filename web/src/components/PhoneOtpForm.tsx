import { ApiError, formatPhone, type OtpVerifyResult } from '@shared/mail'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { publicApi } from '../api/mail'
import { useT } from '../i18n'

const CODE_LENGTH = 6
const MAIL_DOMAIN = import.meta.env.VITE_MAIL_DOMAIN ?? 'phonemail.com'

function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

const isValidMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits)

const grouped = (digits: string) => (digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits)

interface Props {
  onVerified: (result: OtpVerifyResult) => Promise<void> | void
  aboveButton?: ReactNode
}

export function PhoneOtpForm({ onVerified, aboveButton }: Props) {
  const t = useT()
  const [digits, setDigits] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const phoneInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const message = (err: unknown) => (err instanceof ApiError ? err.message : t('common.offline'))

  const sendCode = async () => {
    if (!isValidMobile(digits)) {
      setError(digits.length === 10 ? t('signIn.errStart') : t('signIn.errLength'))
      phoneInput.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await publicApi.requestOtp(digits)
      setWait(res.resendIn)
      setSent(true)
      setNotice(null)
      setTimeout(() => codeInput.current?.focus())
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
        setWait(err.retryAfter)
        setSent(true)
        setTimeout(() => codeInput.current?.focus())
      } else {
        setError(message(err))
      }
    } finally {
      setBusy(false)
    }
  }

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH) {
      codeInput.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await publicApi.verifyOtp(digits, value)
      await onVerified(result)
    } catch (err) {
      setError(message(err))
      setCode('')
      codeInput.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (wait > 0 || busy) return
    setCode('')
    await sendCode()
    setNotice(t('verify.newCode'))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    void (sent ? verify() : sendCode())
  }

  const changeNumber = () => {
    setSent(false)
    setCode('')
    setError(null)
    setNotice(null)
    setTimeout(() => phoneInput.current?.focus())
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field-label">{t('signIn.label')}</span>
        <span className="phone-field" data-disabled={sent || undefined}>
          <span className="dial-code">+91</span>
          <input
            ref={phoneInput}
            value={grouped(digits)}
            onChange={(e) => {
              setDigits(nationalDigits(e.target.value))
              setError(null)
            }}
            placeholder="98765 43210"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            disabled={sent}
            aria-invalid={!!error && !sent}
          />
        </span>
      </label>

      <label className="field">
        <span className="field-label">{t('web.otpLabel')}</span>
        <input
          ref={codeInput}
          className="otp-field"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
            setCode(value)
            setError(null)
            if (value.length === CODE_LENGTH && !busy) void verify(value)
          }}
          placeholder="• • • • • •"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          disabled={!sent || busy}
        />
      </label>

      <div className="auth-status" aria-live="polite">
        {error ? (
          <p className="auth-error">{error}</p>
        ) : sent ? (
          <p>{notice ?? t('web.otpHint', { phone: formatPhone(digits, '91') })}</p>
        ) : isValidMobile(digits) ? (
          <p>
            {t('signIn.addressWillBe')} <strong>
              {digits}@{MAIL_DOMAIN}
            </strong>
          </p>
        ) : (
          <p>{t('signIn.codeHint')}</p>
        )}
        {sent && (
          <p className="auth-links">
            <button type="button" className="link-button" onClick={() => void resend()} disabled={wait > 0 || busy}>
              {wait > 0 ? t('verify.resendIn', { time: `0:${String(wait).padStart(2, '0')}` }) : t('verify.resend')}
            </button>
            <button type="button" className="link-button" onClick={changeNumber} disabled={busy}>
              {t('verify.changeNumber')}
            </button>
          </p>
        )}
      </div>

      {aboveButton}

      <button type="submit" className="primary-button" disabled={busy}>
        {busy ? <span className="spinner" aria-label={t('verify.verifying')} /> : t('common.next')}
      </button>
    </form>
  )
}
