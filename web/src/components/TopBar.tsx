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

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
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
      // clipboard blocked; nothing else to do
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
        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button
              type="button"
              className="search-filter"
              data-active={activeFilters > 0 || undefined}
              onClick={toggle}
              aria-label="Search filters"
            >
              <Icon name="sliders" size={20} />
            </button>
          )}
        >
          {() => (
            <>
              <div className="menu-heading">Show only</div>
              {(
                [
                  ['unread', 'Unread'],
                  ['starred', 'Starred'],
                  ['attachments', 'Has attachment'],
                ] as const
              ).map(([key, label]) => (
                <MenuItem
                  key={key}
                  checked={filters[key]}
                  onSelect={() => onFiltersChange({ ...filters, [key]: !filters[key] })}
                >
                  <Icon name="check" size={16} className="menu-check" />
                  {label}
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
      </label>

      <div className="topbar-right">
        {account && (
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button className="address-pill" onClick={toggle}>
                <span className="online-dot" aria-label="Connected" />
                <span className="address-text">{account.address}</span>
                <Icon name="chevronDown" size={18} />
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="menu-heading">Your PhoneMail address</div>
                <div className="menu-address">{account.address}</div>
                <MenuItem
                  onSelect={() => {
                    void copyAddress()
                    setTimeout(close, 600)
                  }}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={16} />
                  {copied ? 'Copied' : 'Copy address'}
                </MenuItem>
              </>
            )}
          </Menu>
        )}

        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button className="icon-button bell" onClick={toggle} aria-label="Notifications">
              <Icon name="bell" size={22} />
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
                    <Avatar name={senderName(m.from)} size={28} />
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
            <button className="user-button" onClick={toggle}>
              <Avatar name={account?.name ?? '?'} size={36} tone="account" />
              <span className="user-name">{account?.name ?? ''}</span>
              <Icon name="chevronDown" size={18} />
            </button>
          )}
        >
          {() => (
            <>
              {account && (
                <div className="menu-profile">
                  <strong>{account.name}</strong>
                  <span>{account.address}</span>
                </div>
              )}
              <div className="menu-heading">Theme</div>
              {THEMES.map((t) => (
                <MenuItem key={t.id} checked={theme === t.id} onSelect={() => onThemeChange(t.id)}>
                  <Icon name="check" size={16} className="menu-check" />
                  {t.label}
                </MenuItem>
              ))}
            </>
          )}
        </Menu>
      </div>
    </header>
  )
}
