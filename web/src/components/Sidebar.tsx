import type { IconName } from '@shared/icons'
import { formatStorage, type Label, type MailView } from '@shared/mail'
import { labelColors, type LabelColor } from '@shared/theme'
import { useState, type FormEvent } from 'react'
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

const NEW_LABEL_COLORS = Object.keys(labelColors) as LabelColor[]

interface Props {
  view: MailView
  onViewChange: (view: MailView) => void
  counts: { inbox: number; drafts: number; spam: number }
  labels: Label[]
  onCreateLabel: (label: Label) => Promise<unknown>
  storageUsed: number
  storageQuota: number
  onCompose: () => void
}

export function Sidebar({
  view,
  onViewChange,
  counts,
  labels,
  onCreateLabel,
  storageUsed,
  storageQuota,
  onCompose,
}: Props) {
  const [labelsOpen, setLabelsOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [labelError, setLabelError] = useState<string | null>(null)

  const countFor = (v: MailView) =>
    v === 'inbox' ? counts.inbox : v === 'drafts' ? counts.drafts : v === 'spam' ? counts.spam : 0

  const submitLabel = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    try {
      await onCreateLabel({ name, color: NEW_LABEL_COLORS[labels.length % NEW_LABEL_COLORS.length] })
      setNewName('')
      setCreating(false)
      setLabelError(null)
    } catch (err) {
      setLabelError((err as Error).message)
    }
  }

  const usedPct = storageQuota ? Math.min(100, (storageUsed / storageQuota) * 100) : 0

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">PhoneMail</span>
      </div>

      <button className="compose-button" onClick={onCompose}>
        <Icon name="pencil" size={20} />
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
              <Icon name={item.icon} size={20} />
              <span className="nav-label">{item.label}</span>
              {count > 0 && (
                <span className={item.view === 'inbox' ? 'nav-badge' : 'nav-count'}>{count}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="labels">
        <button
          className="labels-header"
          onClick={() => setLabelsOpen((o) => !o)}
          aria-expanded={labelsOpen}
        >
          <span>LABELS</span>
          <Icon name={labelsOpen ? 'chevronUp' : 'chevronDown'} size={18} />
        </button>

        {labelsOpen && (
          <>
            {labels.map((label) => {
              const v: MailView = `label:${label.name}`
              return (
                <button
                  key={label.name}
                  className="nav-item label-item"
                  aria-current={view === v ? 'page' : undefined}
                  onClick={() => onViewChange(v)}
                >
                  <span
                    className="label-swatch"
                    style={{ background: labelColors[label.color as LabelColor] ?? label.color }}
                  />
                  <span className="nav-label">{label.name}</span>
                </button>
              )
            })}

            {creating ? (
              <form className="label-form" onSubmit={submitLabel}>
                <input
                  autoFocus
                  value={newName}
                  maxLength={40}
                  placeholder="Label name"
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
                />
                <button type="submit" className="icon-button" aria-label="Create label">
                  <Icon name="check" size={18} />
                </button>
                {labelError && <p className="label-error">{labelError}</p>}
              </form>
            ) : (
              <button className="nav-item" onClick={() => setCreating(true)}>
                <Icon name="plus" size={20} />
                <span className="nav-label">Create new label</span>
              </button>
            )}
          </>
        )}
      </div>

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
