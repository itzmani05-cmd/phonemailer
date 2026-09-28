import type { IconName } from '@shared/icons'
import { formatStorage, type MailView } from '@shared/mail'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'

const NAV: { view: MailView; label: string; icon: IconName }[] = [
  { view: 'inbox', label: 'Inbox', icon: 'inbox' },
  { view: 'starred', label: 'Starred', icon: 'star' },
  { view: 'snoozed', label: 'Snoozed', icon: 'clock' },
  { view: 'sent', label: 'Sent', icon: 'send' },
  { view: 'drafts', label: 'Drafts', icon: 'file' },
  { view: 'spam', label: 'Spam', icon: 'shield' },
  { view: 'trash', label: 'Trash', icon: 'trash' },
]

interface Props {
  view: MailView
  onViewChange: (view: MailView) => void
  counts: { inbox: number; drafts: number; spam: number }
  storageUsed: number
  storageQuota: number
  onCompose: () => void
}

export function Sidebar({
  view,
  onViewChange,
  counts,
  storageUsed,
  storageQuota,
  onCompose,
}: Props) {
  const countFor = (v: MailView) =>
    v === 'inbox' ? counts.inbox : v === 'drafts' ? counts.drafts : v === 'spam' ? counts.spam : 0

  const usedPct = storageQuota ? Math.min(100, (storageUsed / storageQuota) * 100) : 0

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">PhoneMail</span>
      </div>

      <button className="compose-button" onClick={onCompose}>
        <Icon name="pencil" size={18} />
        <span>Compose</span>
      </button>

      <nav className="nav" aria-label="Folders">
        {NAV.map((item) => {
          const count = countFor(item.view)
          const active = view === item.view
          return (
            <button
              key={item.view}
              className="nav-item"
              aria-current={active ? 'page' : undefined}
              onClick={() => onViewChange(item.view)}
            >
              <Icon name={item.icon} size={16} />
              <span className="nav-label">{item.label}</span>
              {count > 0 && (
                <span className={item.view === 'inbox' ? 'nav-badge' : 'nav-count'}>{count}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="storage">
        <div className="storage-title">Storage</div>
        <div className="storage-text">{formatStorage(storageUsed, storageQuota)}</div>
        <div
          className="storage-bar"
          role="progressbar"
          aria-valuenow={Math.round(usedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${Math.max(usedPct, 2)}%` }} />
        </div>
      </div>
    </aside>
  )
}
