import type { IconName } from '@shared/icons'
import { LANGUAGES, type StringKey } from '@shared/i18n/strings'
import { ApiError, formatPhone, type Account } from '@shared/mail'
import { useRef, useState, type FormEvent } from 'react'
import { mailApi } from '../api/mail'
import { signOut } from '../auth/session'
import { useLanguage } from '../i18n'
import type { ThemePreference } from '../theme/useThemePreference'
import { AccountAvatar } from './Avatar'
import { Icon } from './Icon'

const THEMES: { id: ThemePreference; label: StringKey; icon: IconName }[] = [
  { id: 'system', label: 'settings.system', icon: 'monitor' },
  { id: 'light', label: 'settings.light', icon: 'sun' },
  { id: 'dark', label: 'settings.dark', icon: 'moon' },
]

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 3 * 1024 * 1024

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

interface Props {
  account: Account | null
  onAccountChange: (account: Account) => void
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  onClose: () => void
}

export function Settings({ account, onAccountChange, theme, onThemeChange, onClose }: Props) {
  const { language, setLanguage, t } = useLanguage()
  const photoInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState<string | null>(null)
  const [alias, setAlias] = useState('')
  const [busy, setBusy] = useState<'photo' | 'name' | 'alias' | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [nameState, setNameState] = useState<'idle' | 'saved'>('idle')
  const [aliasError, setAliasError] = useState<string | null>(null)

  const shownName = name ?? (account && account.name !== account.phone ? account.name : '')
  const domain = account?.address.split('@')[1] ?? ''

  const run = async (kind: 'photo' | 'name' | 'alias', action: () => Promise<Account>) => {
    setBusy(kind)
    try {
      onAccountChange(await action())
      return null
    } catch (err) {
      return err instanceof ApiError ? err.message : t('common.offline')
    } finally {
      setBusy(null)
    }
  }

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(null)
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoError(t('web.photoType'))
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError(t('web.photoTooBig'))
    const content = await readBase64(file)
    setPhotoError(await run('photo', () => mailApi.setAvatar({ contentType: file.type, content })))
  }

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    if (name === null) return
    const error = await run('name', () => mailApi.updateAccount({ name }))
    if (error) return alert(error)
    setName(null)
    setNameState('saved')
    setTimeout(() => setNameState('idle'), 1500)
  }

  const addAlias = async (e: FormEvent) => {
    e.preventDefault()
    const value = alias.trim()
    if (!value) return
    const error = await run('alias', () => mailApi.addAlias(value))
    setAliasError(error)
    if (!error) setAlias('')
  }

  const removeAlias = async (address: string) => {
    if (!confirm(t('aliases.remove', { address }))) return
    setAliasError(await run('alias', () => mailApi.removeAlias(address)))
  }

  return (
    <section className="settings panel" aria-label={t('web.settingsTitle')}>
      <header className="settings-header">
        <button className="icon-button" onClick={onClose} aria-label={t('web.back')} title={t('web.back')}>
          <Icon name="arrowLeft" />
        </button>
        <h1>{t('web.settingsTitle')}</h1>
      </header>

      <div className="settings-body">
        <h2 className="settings-title">{t('settings.profile')}</h2>
        <div className="settings-card">
          <div className="settings-photo">
            <AccountAvatar account={account} size={88} />
            <div className="settings-photo-actions">
              <input
                ref={photoInput}
                type="file"
                accept={PHOTO_TYPES.join(',')}
                hidden
                onChange={(e) => {
                  void uploadPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button className="text-button" onClick={() => photoInput.current?.click()} disabled={!!busy}>
                {busy === 'photo' ? '…' : t('profile.changePhoto')}
              </button>
              {!!account?.avatarVersion && (
                <button
                  className="text-button danger"
                  onClick={() => void run('photo', () => mailApi.removeAvatar()).then(setPhotoError)}
                  disabled={!!busy}
                >
                  {t('profile.removePhoto')}
                </button>
              )}
              {photoError && <p className="settings-error">{photoError}</p>}
            </div>
          </div>

          <form className="settings-row" onSubmit={(e) => void saveName(e)}>
            <label className="settings-label" htmlFor="settings-name">
              {t('profile.name')}
            </label>
            <input
              id="settings-name"
              className="settings-input"
              value={shownName}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profile.namePlaceholder')}
              maxLength={50}
            />
            {name !== null ? (
              <button type="submit" className="text-button" disabled={busy === 'name'}>
                {t('profile.save')}
              </button>
            ) : nameState === 'saved' ? (
              <span className="settings-muted">{t('profile.saved')}</span>
            ) : null}
          </form>

          <div className="settings-row">
            <span className="settings-label">{t('profile.phone')}</span>
            <span>{account?.phone ? formatPhone(account.phone, account.countryCode) : '—'}</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">{t('profile.address')}</span>
            <span>{account?.address ?? '—'}</span>
          </div>
        </div>

        <h2 className="settings-title">{t('settings.aliases')}</h2>
        <div className="settings-card">
          {account?.aliases.length ? (
            account.aliases.map((address) => (
              <div key={address} className="settings-row">
                <Icon name="mail" size={18} />
                <span className="settings-grow">{address}</span>
                <button
                  className="icon-button"
                  onClick={() => void removeAlias(address)}
                  disabled={!!busy}
                  aria-label={t('aliases.remove', { address })}
                  title={t('common.remove')}
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            ))
          ) : (
            <div className="settings-row settings-muted">{t('aliases.empty')}</div>
          )}
          <form className="settings-row" onSubmit={(e) => void addAlias(e)}>
            <input
              className="settings-input settings-grow"
              value={alias}
              onChange={(e) => {
                setAlias(e.target.value.replace(/\s/g, '').toLowerCase())
                setAliasError(null)
              }}
              placeholder={t('aliases.placeholder')}
              maxLength={30}
              aria-label={t('settings.aliases')}
            />
            <span className="settings-muted">@{domain}</span>
            <button type="submit" className="text-button" disabled={!alias.trim() || busy === 'alias'}>
              {t('aliases.add')}
            </button>
          </form>
        </div>
        <p className={aliasError ? 'settings-error' : 'settings-hint'}>{aliasError ?? t('aliases.hint')}</p>

        <h2 className="settings-title">{t('settings.language')}</h2>
        <div className="settings-card settings-options" role="radiogroup">
          {LANGUAGES.map((l) => (
            <label key={l.code} className="settings-option">
              <input
                type="radio"
                name="language"
                checked={language === l.code}
                onChange={() => setLanguage(l.code)}
              />
              <span>{l.name}</span>
              {l.name !== l.english && <span className="settings-muted">{l.english}</span>}
            </label>
          ))}
        </div>

        <h2 className="settings-title">{t('settings.appearance')}</h2>
        <div className="settings-card settings-options" role="radiogroup">
          {THEMES.map((option) => (
            <label key={option.id} className="settings-option">
              <input
                type="radio"
                name="theme"
                checked={theme === option.id}
                onChange={() => onThemeChange(option.id)}
              />
              <Icon name={option.icon} size={18} />
              <span>{t(option.label)}</span>
            </label>
          ))}
        </div>

        <button className="signout-button" onClick={signOut}>
          <Icon name="logout" size={18} />
          {t('menu.signOut')}
        </button>
      </div>
    </section>
  )
}
