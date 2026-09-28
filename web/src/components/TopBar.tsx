import { senderName, type Account, type Mail } from '@shared/mail'
import { useState } from 'react'
import { signOut } from '../auth/session'
import { useT } from '../i18n'
import { AccountAvatar, Avatar } from './Avatar'
import { Icon } from './Icon'
import { Menu, MenuItem } from './Menu'

export interface SearchFilters {
  unread: boolean
  starred: boolean
  attachments: boolean
}

interface Props {
  query: string
  onQueryChange: (q: string) => void
  account: Account | null
  notifications: Mail[]
  onOpenMail: (mail: Mail) => void
  onOpenSettings: () => void
  onMenu: () => void
}

export function TopBar({ query, onQueryChange, account, notifications, onOpenMail, onOpenSettings, onMenu }: Props) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (!account) return
    try {
      await navigator.clipboard.writeText(account.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
    }
  }

  return (
    <header className="topbar">
      <button className="icon-button topbar-menu" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" />
      </button>

      <label className="search">
        <Icon name="search" size={20} />
        <input
          type="search"
          placeholder={t('web.search')}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      <div className="topbar-right">
        {account && (
          <button
            className="address-pill"
            onClick={() => void copyAddress()}
            title={copied ? t('web.copied') : t('web.copyAddress')}
            aria-label={copied ? t('web.copied') : `${t('web.copyAddress')} ${account.address}`}
          >
            <span className="online-dot" aria-hidden />
            <span className="address-text">{account.address}</span>
            <Icon name={copied ? 'check' : 'copy'} size={17} className="address-pill-icon" />
          </button>
        )}

        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button
              className="icon-button topbar-icon bell"
              onClick={toggle}
              aria-label={t('web.notifications')}
              title={t('web.notifications')}
            >
              <Icon name="bell" size={20} />
              {notifications.length > 0 && <span className="bell-dot" />}
            </button>
          )}
        >
          {(close) => (
            <div className="notifications">
              <div className="menu-heading">{t('web.notifications')}</div>
              {notifications.length === 0 ? (
                <p className="menu-empty">{t('web.caughtUp')}</p>
              ) : (
                notifications.slice(0, 6).map((m) => (
                  <MenuItem
                    key={m.id}
                    onSelect={() => {
                      onOpenMail(m)
                      close()
                    }}
                  >
                    <Avatar name={senderName(m.from)} size={18} />
                    <span className="notification-text">
                      <strong>{senderName(m.from)}</strong>
                      <span>{m.subject || '(no subject)'}</span>
                    </span>
                  </MenuItem>
                ))
              )}
            </div>
          )}
        </Menu>

        <button
          className="icon-button topbar-icon"
          onClick={onOpenSettings}
          aria-label={t('web.settingsTitle')}
          title={t('web.settingsTitle')}
        >
          <Icon name="settings" size={20} />
        </button>

        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button className="avatar-button" onClick={toggle} aria-label="Account" title={account?.name ?? 'Account'}>
              <AccountAvatar account={account} size={34} />
            </button>
          )}
        >
          {(close) => (
            <>
              {account && (
                <div className="menu-profile">
                  <strong>{account.name}</strong>
                  <span>{account.address}</span>
                </div>
              )}
              <MenuItem
                onSelect={() => {
                  onOpenSettings()
                  close()
                }}
              >
                <Icon name="settings" size={16} />
                {t('web.settingsTitle')}
              </MenuItem>
              {account && (
                <MenuItem
                  onSelect={() => {
                    void copyAddress()
                    setTimeout(close, 600)
                  }}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={16} />
                  {copied ? t('web.copied') : t('web.copyAddress')}
                </MenuItem>
              )}
              <div className="menu-separator" />
              <MenuItem danger onSelect={signOut}>
                <Icon name="logout" size={16} />
                {t('menu.signOut')}
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </header>
  )
}
