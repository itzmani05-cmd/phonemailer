import type { IconName } from '@shared/icons'
import { senderName, type Account, type Mail } from '@shared/mail'
import { useState } from 'react'
import type { ThemePreference } from '../theme/useThemePreference'
import { Avatar } from './Avatar'
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
  filters: SearchFilters
  onFiltersChange: (f: SearchFilters) => void
  account: Account | null
  notifications: Mail[]
  onOpenMail: (mail: Mail) => void
  theme: ThemePreference
  onThemeChange: (t: ThemePreference) => void
  onMenu: () => void
}

const THEMES: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'system', label: 'System', icon: 'monitor' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
]

export function TopBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  account,
  notifications,
  onOpenMail,
  theme,
  onThemeChange,
  onMenu,
}: Props) {
  const [copied, setCopied] = useState(false)
  const activeFilters = Object.values(filters).filter(Boolean).length

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
          placeholder="Search emails, contacts, or keywords..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      <div className="topbar-right">
        {account && (
          <button
            className="address-pill"
            onClick={() => void copyAddress()}
            title={copied ? 'Copied' : 'Copy your PhoneMail address'}
            aria-label={copied ? 'Address copied' : `Copy address ${account.address}`}
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
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" size={20} />
              {notifications.length > 0 && <span className="bell-dot" />}
            </button>
          )}
        >
          {(close) => (
            <div className="notifications">
              <div className="menu-heading">Notifications</div>
              {notifications.length === 0 ? (
                <p className="menu-empty">You’re all caught up.</p>
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

        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button
              className="icon-button topbar-icon"
              onClick={toggle}
              aria-label="Settings"
              title="Settings"
            >
              <Icon name="settings" size={20} />
            </button>
          )}
        >
          {() => (
            <>
              <div className="menu-heading">Theme</div>
              {THEMES.map((t) => (
                <MenuItem key={t.id} checked={theme === t.id} onSelect={() => onThemeChange(t.id)}>
                  <Icon name={t.icon} size={16} />
                  {t.label}
                  <Icon name="check" size={16} className="menu-check menu-item-end" />
                </MenuItem>
              ))}
            </>
          )}
        </Menu>

        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button
              className="avatar-button"
              onClick={toggle}
              aria-label="Account"
              title={account?.name ?? 'Account'}
            >
              <Avatar name={account?.name ?? '?'} size={34} tone="account" />
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
              {account && (
                <MenuItem
                  onSelect={() => {
                    void copyAddress()
                    setTimeout(close, 600)
                  }}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={16} />
                  {copied ? 'Copied' : 'Copy address'}
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </div>
    </header>
  )
}
