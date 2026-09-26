import type { IconName } from '@shared/icons'
import {
  counterpart,
  formatListDate,
  previewText,
  type Mail,
  type MailCategory,
  type MailView,
} from '@shared/mail'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Menu, MenuItem } from './Menu'

export const PAGE_SIZE = 50

const TABS: { id: MailCategory; label: string; icon: IconName }[] = [
  { id: 'primary', label: 'Primary', icon: 'square' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'promotions', label: 'Promotions', icon: 'tag' },
]

type SelectPreset = 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred'

interface Props {
  view: MailView
  showTabs: boolean
  category: MailCategory
  onCategoryChange: (c: MailCategory) => void
  mails: Mail[] // current page
  total: number
  page: number
  onPageChange: (page: number) => void
  selectedId: string | null
  checked: Set<string>
  onCheckedChange: (ids: Set<string>) => void
  loading: boolean
  error: string | null
  emptyText: string
  onOpen: (mail: Mail) => void
  onRefresh: () => void
  onBulk: (action: 'archive' | 'trash' | 'read' | 'unread' | 'restore' | 'delete') => void
  onMarkAllRead: () => void
}

export function MailList(props: Props) {
  const {
    view,
    showTabs,
    category,
    onCategoryChange,
    mails,
    total,
    page,
    onPageChange,
    selectedId,
    checked,
    onCheckedChange,
    loading,
    error,
    emptyText,
    onOpen,
    onRefresh,
    onBulk,
    onMarkAllRead,
  } = props

  const allChecked = mails.length > 0 && mails.every((m) => checked.has(m.id))
  const someChecked = checked.size > 0
  const first = total === 0 ? 0 : page * PAGE_SIZE + 1
  const last = Math.min(total, (page + 1) * PAGE_SIZE)
  const inTrash = view === 'trash' || view === 'spam'

  const select = (preset: SelectPreset) => {
    const pick: Record<SelectPreset, (m: Mail) => boolean> = {
      all: () => true,
      none: () => false,
      read: (m) => m.read,
      unread: (m) => !m.read,
      starred: (m) => m.starred,
      unstarred: (m) => !m.starred,
    }
    onCheckedChange(new Set(mails.filter(pick[preset]).map((m) => m.id)))
  }

  const toggle = (id: string) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onCheckedChange(next)
  }

  return (
    <section className="list-pane panel" aria-label="Messages">
      {showTabs && (
        <div className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={category === tab.id}
              className="tab"
              onClick={() => onCategoryChange(tab.id)}
            >
              <Icon name={tab.icon} size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="list-toolbar">
        <div className="select-all">
          <input
            type="checkbox"
            className="checkbox"
            aria-label="Select all"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked && !allChecked
            }}
            onChange={() => select(allChecked ? 'none' : 'all')}
          />
          <Menu
            trigger={({ toggle: t }) => (
              <button className="select-caret" onClick={t} aria-label="Select options">
                <Icon name="chevronDown" size={16} />
              </button>
            )}
          >
            {(close) =>
              (['all', 'none', 'read', 'unread', 'starred', 'unstarred'] as const).map((p) => (
                <MenuItem
                  key={p}
                  onSelect={() => {
                    select(p)
                    close()
                  }}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </MenuItem>
              ))
            }
          </Menu>
        </div>

        {someChecked ? (
          <div className="bulk-actions">
            {inTrash ? (
              <>
                <button className="icon-button" title="Move to Inbox" onClick={() => onBulk('restore')}>
                  <Icon name="restore" />
                </button>
                <button className="icon-button" title="Delete forever" onClick={() => onBulk('delete')}>
                  <Icon name="trash" />
                </button>
              </>
            ) : (
              <>
                <button className="icon-button" title="Archive" onClick={() => onBulk('archive')}>
                  <Icon name="archive" />
                </button>
                <button className="icon-button" title="Delete" onClick={() => onBulk('trash')}>
                  <Icon name="trash" />
                </button>
              </>
            )}
            <button className="icon-button" title="Mark as read" onClick={() => onBulk('read')}>
              <Icon name="mail" />
            </button>
            <button className="icon-button" title="Mark as unread" onClick={() => onBulk('unread')}>
              <Icon name="mailDot" />
            </button>
          </div>
        ) : (
          <>
            <button className="icon-button" title="Refresh" onClick={onRefresh}>
              <Icon name="refresh" />
            </button>
            <Menu
              trigger={({ toggle: t }) => (
                <button className="icon-button" title="More" onClick={t}>
                  <Icon name="moreVertical" />
                </button>
              )}
            >
              {(close) => (
                <MenuItem
                  onSelect={() => {
                    onMarkAllRead()
                    close()
                  }}
                >
                  Mark all as read
                </MenuItem>
              )}
            </Menu>
          </>
        )}

        <div className="pager">
          <span>
            {first}–{last} of {total}
          </span>
          <button
            className="icon-button"
            aria-label="Newer"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            className="icon-button"
            aria-label="Older"
            disabled={last >= total}
            onClick={() => onPageChange(page + 1)}
          >
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>

      {error && <div className="banner">{error}</div>}

      <ul className="mail-list">
        {loading && mails.length === 0 && <li className="list-empty">Loading…</li>}
        {!loading && mails.length === 0 && <li className="list-empty">{emptyText}</li>}

        {mails.map((mail) => {
          const person = counterpart(mail)
          const name = mail.direction === 'out' ? `To: ${person.name}` : person.name
          const unread = !mail.read
          return (
            <li key={mail.id}>
              <div
                className="mail-row"
                role="button"
                tabIndex={0}
                aria-selected={mail.id === selectedId}
                data-unread={unread || undefined}
                data-checked={checked.has(mail.id) || undefined}
                onClick={() => onOpen(mail)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(mail)
                }}
              >
                <input
                  type="checkbox"
                  className="checkbox"
                  aria-label={`Select message from ${person.name}`}
                  checked={checked.has(mail.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggle(mail.id)}
                />
                <Avatar name={person.name} size={36} />
                <div className="row-body">
                  <div className="row-top">
                    <span className="row-from">{name}</span>
                    {mail.attachments.length > 0 && (
                      <Icon name="paperclip" size={18} className="row-clip" />
                    )}
                    <time className="row-date" dateTime={mail.receivedAt}>
                      {formatListDate(mail.receivedAt)}
                    </time>
                  </div>
                  <div className="row-subject">
                    {mail.starred && <Icon name="star" size={14} filled className="row-star" />}
                    {mail.subject || '(no subject)'}
                  </div>
                  <div className="row-snippet">{previewText(mail, 140)}</div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
