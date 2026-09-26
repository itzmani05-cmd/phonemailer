import {
  formatWithAgo,
  senderAddress,
  senderName,
  type Account,
  type Label,
  type Mail,
  type MailChanges,
  type MailFolder,
} from '@shared/mail'
import { labelColors, type LabelColor } from '@shared/theme'
import { useState } from 'react'
import { mailApi } from '../api/mail'
import type { ReplyMode } from '../lib/reply'
import { AttachmentCard } from './AttachmentCard'
import { Avatar } from './Avatar'
import { EmailFrame } from './EmailFrame'
import { Icon } from './Icon'
import { Menu, MenuItem } from './Menu'

const FOLDER_NAMES: Record<MailFolder, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  archive: 'Archive',
  spam: 'Spam',
  trash: 'Trash',
}

function snoozeOptions(now = new Date()) {
  const laterToday = new Date(now.getTime() + 3 * 3600_000)
  laterToday.setMinutes(0, 0, 0)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7))
  nextWeek.setHours(8, 0, 0, 0)
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return [
    { label: 'Later today', at: laterToday, hint: fmt(laterToday) },
    { label: 'Tomorrow', at: tomorrow, hint: fmt(tomorrow) },
    { label: 'Next week', at: nextWeek, hint: fmt(nextWeek) },
  ]
}

interface Props {
  mail: Mail | null
  account: Account | null
  labels: Label[]
  onBack: () => void
  onUpdate: (changes: MailChanges) => void
  onDeleteForever: () => void
  onReply: (mode: ReplyMode) => void
}

export function MailReader({
  mail,
  account,
  labels,
  onBack,
  onUpdate,
  onDeleteForever,
  onReply,
}: Props) {
  const [showDetails, setShowDetails] = useState(false)

  if (!mail) {
    return (
      <section className="reader-pane panel reader-empty">
        <Icon name="mail" size={44} strokeWidth={1.5} />
        <p>Select a message to read it</p>
      </section>
    )
  }

  const name = mail.direction === 'out' ? (account?.name ?? 'Me') : senderName(mail.from)
  const address = senderAddress(mail.from)
  const toMe =
    mail.direction === 'in' &&
    !!account &&
    mail.to.length === 1 &&
    mail.to[0].toLowerCase() === account.address.toLowerCase()
  const recipients = toMe ? 'to me' : `to ${mail.to.map((a) => a.split('@')[0]).join(', ')}`
  const inBin = mail.folder === 'trash' || mail.folder === 'spam'
  const multipleRecipients = mail.to.length + mail.cc.length > 1

  const toggleLabel = (labelName: string) =>
    onUpdate({
      labels: mail.labels.includes(labelName)
        ? mail.labels.filter((l) => l !== labelName)
        : [...mail.labels, labelName],
    })

  return (
    <section className="reader-pane panel" aria-label="Message">
      <div className="reader-toolbar">
        <button className="icon-button" title="Back" onClick={onBack}>
          <Icon name="arrowLeft" />
        </button>
        <span className="toolbar-gap" />
        {inBin ? (
          <>
            <button className="icon-button" title="Move to Inbox" onClick={() => onUpdate({ folder: 'inbox' })}>
              <Icon name="restore" />
            </button>
            <button className="icon-button" title="Delete forever" onClick={onDeleteForever}>
              <Icon name="trash" />
            </button>
          </>
        ) : (
          <>
            <button
              className="icon-button"
              title={mail.folder === 'archive' ? 'Move to Inbox' : 'Archive'}
              onClick={() =>
                onUpdate({ folder: mail.folder === 'archive' ? 'inbox' : 'archive' })
              }
            >
              <Icon name="archive" />
            </button>
            <button className="icon-button" title="Delete" onClick={() => onUpdate({ folder: 'trash' })}>
              <Icon name="trash" />
            </button>
          </>
        )}
        <span className="toolbar-divider" />
        <button className="icon-button" title="Mark as unread" onClick={() => onUpdate({ read: false })}>
          <Icon name="mail" />
        </button>
        {mail.folder !== 'spam' && mail.direction === 'in' && (
          <button className="icon-button" title="Report spam" onClick={() => onUpdate({ folder: 'spam' })}>
            <Icon name="shieldCheck" />
          </button>
        )}
        <Menu
          trigger={({ toggle }) => (
            <button className="icon-button" title="Snooze" onClick={toggle}>
              <Icon name="alarm" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="menu-heading">Snooze until…</div>
              {snoozeOptions().map((o) => (
                <MenuItem
                  key={o.label}
                  onSelect={() => {
                    onUpdate({ snoozedUntil: o.at.toISOString() })
                    close()
                  }}
                >
                  <span className="menu-grow">{o.label}</span>
                  <span className="menu-hint">{o.hint}</span>
                </MenuItem>
              ))}
              {mail.snoozedUntil && (
                <MenuItem
                  onSelect={() => {
                    onUpdate({ snoozedUntil: null })
                    close()
                  }}
                >
                  Unsnooze
                </MenuItem>
              )}
            </>
          )}
        </Menu>

        <span className="toolbar-spacer" />
        <button
          className="icon-button"
          data-starred={mail.starred || undefined}
          title={mail.starred ? 'Unstar' : 'Star'}
          onClick={() => onUpdate({ starred: !mail.starred })}
        >
          <Icon name="star" filled={mail.starred} />
        </button>
        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button className="icon-button" title="More" onClick={toggle}>
              <Icon name="moreVertical" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="menu-heading">Label as</div>
              {labels.map((l) => (
                <MenuItem key={l.name} checked={mail.labels.includes(l.name)} onSelect={() => toggleLabel(l.name)}>
                  <Icon name="check" size={16} className="menu-check" />
                  <span
                    className="label-swatch"
                    style={{ background: labelColors[l.color as LabelColor] ?? l.color }}
                  />
                  {l.name}
                </MenuItem>
              ))}
              <div className="menu-separator" />
              {mail.folder !== 'inbox' && mail.direction === 'in' && (
                <MenuItem
                  onSelect={() => {
                    onUpdate({ folder: 'inbox' })
                    close()
                  }}
                >
                  Move to Inbox
                </MenuItem>
              )}
              <MenuItem
                danger
                onSelect={() => {
                  onDeleteForever()
                  close()
                }}
              >
                Delete forever
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      <div className="reader-scroll">
        <div className="reader-heading">
          <h1 className="reader-subject">{mail.subject || '(no subject)'}</h1>
          <span className="chip">
            {FOLDER_NAMES[mail.folder]}
            {mail.folder === 'inbox' && (
              <button aria-label="Remove from Inbox" onClick={() => onUpdate({ folder: 'archive' })}>
                <Icon name="close" size={14} />
              </button>
            )}
          </span>
          {mail.labels.map((l) => (
            <span key={l} className="chip">
              {l}
              <button aria-label={`Remove label ${l}`} onClick={() => toggleLabel(l)}>
                <Icon name="close" size={14} />
              </button>
            </span>
          ))}
        </div>

        <div className="sender">
          <Avatar name={name} size={44} tone="primary" />
          <div className="sender-text">
            <div>
              <span className="sender-name">{name}</span>{' '}
              {mail.direction === 'in' && <span className="sender-address">&lt;{address}&gt;</span>}
            </div>
            <button className="sender-to" onClick={() => setShowDetails((s) => !s)}>
              {recipients}
              <Icon name={showDetails ? 'chevronUp' : 'chevronDown'} size={16} />
            </button>
            {showDetails && (
              <dl className="sender-details">
                <dt>from</dt>
                <dd>{mail.from}</dd>
                <dt>to</dt>
                <dd>{mail.to.join(', ')}</dd>
                {mail.cc.length > 0 && (
                  <>
                    <dt>cc</dt>
                    <dd>{mail.cc.join(', ')}</dd>
                  </>
                )}
                <dt>date</dt>
                <dd>{new Date(mail.date).toLocaleString()}</dd>
              </dl>
            )}
          </div>
          <time className="sender-date" dateTime={mail.date}>
            {formatWithAgo(mail.date)}
          </time>
          <button className="icon-button" title="Reply" onClick={() => onReply('reply')}>
            <Icon name="reply" />
          </button>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button className="icon-button" title="More" onClick={toggle}>
                <Icon name="moreVertical" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem onSelect={() => { onReply('reply'); close() }}>Reply</MenuItem>
                {multipleRecipients && (
                  <MenuItem onSelect={() => { onReply('replyAll'); close() }}>Reply all</MenuItem>
                )}
                <MenuItem onSelect={() => { onReply('forward'); close() }}>Forward</MenuItem>
              </>
            )}
          </Menu>
        </div>

        <div className="reader-body">
          {mail.html ? (
            <div className="email-canvas">
              <EmailFrame html={mail.html} />
            </div>
          ) : <div className="reader-text">{mail.text}</div>}
        </div>

        {mail.attachments.length > 0 && (
          <div className="attachments">
            <div className="attachments-title">
              {mail.attachments.length} attachment{mail.attachments.length > 1 ? 's' : ''}
            </div>
            <div className="attachments-list">
              {mail.attachments.map((a, i) => (
                <AttachmentCard key={i} attachment={a} href={mailApi.attachmentUrl(mail.id, i)} />
              ))}
            </div>
          </div>
        )}

        <div className="reply-actions">
          <button className="pill-button" onClick={() => onReply('reply')}>
            <Icon name="reply" />
            Reply
          </button>
          <button className="pill-button" onClick={() => onReply('replyAll')}>
            <Icon name="replyAll" />
            Reply all
          </button>
          <button className="pill-button" onClick={() => onReply('forward')}>
            <Icon name="forward" />
            Forward
          </button>
        </div>
      </div>
    </section>
  )
}
