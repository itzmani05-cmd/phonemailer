import type { OutgoingAttachment, SendEmailRequest } from '@shared/mail'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { mailApi } from '../api/mail'
import type { ComposeDraft } from '../lib/reply'
import { AttachmentCard } from './AttachmentCard'
import { Icon } from './Icon'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_TOTAL_BYTES = 18 * 1024 * 1024

interface PendingFile extends OutgoingAttachment {
  size: number
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function RecipientInput({
  label,
  values,
  onChange,
  autoFocus,
  trailing,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  autoFocus?: boolean
  trailing?: ReactNode
}) {
  const [text, setText] = useState('')

  const commit = () => {
    const parts = text
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length) onChange([...values, ...parts.filter((p) => !values.includes(p))])
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ';', 'Tab'].includes(e.key) && text.trim()) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="compose-field">
      <span className="compose-label">{label}</span>
      <div className="recipients">
        {values.map((v) => (
          <span key={v} className="recipient-chip" data-invalid={!EMAIL_RE.test(v) || undefined}>
            {v}
            <button aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          aria-label={label}
        />
      </div>
      {trailing}
    </div>
  )
}

interface Props {
  draft: ComposeDraft
  onClose: () => void
  onSend: (email: SendEmailRequest) => Promise<unknown>
}

export function Compose({ draft, onClose, onSend }: Props) {
  const [to, setTo] = useState(draft.to)
  const [cc, setCc] = useState(draft.cc)
  const [bcc, setBcc] = useState<string[]>([])
  const [showCc, setShowCc] = useState(draft.cc.length > 0)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [files, setFiles] = useState<PendingFile[]>([])
  const [minimized, setMinimized] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const original = draft.forwardOf
    if (!original?.attachments.length) return
    let cancelled = false
    Promise.all(
      original.attachments.map(async (a, i) => {
        const blob = await (await fetch(mailApi.attachmentUrl(original.id, i))).blob()
        return {
          filename: a.filename ?? `attachment-${i + 1}`,
          contentType: a.contentType,
          size: a.size,
          content: await blobToBase64(blob),
        }
      }),
    )
      .then((loaded) => !cancelled && setFiles((prev) => [...loaded, ...prev]))
      .catch(() => !cancelled && setError('Couldn’t load the original attachments.'))
    return () => {
      cancelled = true
    }
  }, [draft.forwardOf])

  useEffect(() => {
    if (draft.inReplyTo) bodyRef.current?.setSelectionRange(0, 0)
  }, [draft.inReplyTo])

  const addFiles = async (list: FileList | null) => {
    if (!list) return
    const added = await Promise.all(
      [...list].map(async (f) => ({
        filename: f.name,
        contentType: f.type || 'application/octet-stream',
        size: f.size,
        content: await blobToBase64(f),
      })),
    )
    setFiles((prev) => [...prev, ...added])
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0)

  const send = async () => {
    const invalid = [...to, ...cc, ...bcc].find((a) => !EMAIL_RE.test(a))
    if (!to.length) return setError('Add at least one recipient.')
    if (invalid) return setError(`“${invalid}” isn’t a valid email address.`)
    if (totalSize > MAX_TOTAL_BYTES) return setError('Attachments are larger than 18 MB.')
    setSending(true)
    setError(null)
    try {
      await onSend({
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: subject.trim() || '(no subject)',
        text: body.trim() ? body : ' ',
        inReplyTo: draft.inReplyTo,
        attachments: files.length
          ? files.map(({ filename, contentType, content }) => ({ filename, contentType, content }))
          : undefined,
      })
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Sending failed.')
      setSending(false)
    }
  }

  const title = subject.trim() || 'New message'

  return (
    <div className="compose" data-minimized={minimized || undefined} role="dialog" aria-label={title}>
      <header className="compose-header" onClick={() => minimized && setMinimized(false)}>
        <span className="compose-title">{title}</span>
        <button
          className="icon-button"
          aria-label={minimized ? 'Expand' : 'Minimize'}
          onClick={(e) => {
            e.stopPropagation()
            setMinimized((m) => !m)
          }}
        >
          <Icon name={minimized ? 'chevronUp' : 'chevronDown'} size={18} />
        </button>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </header>

      {!minimized && (
        <>
          <RecipientInput
            label="To"
            values={to}
            onChange={setTo}
            autoFocus={!draft.to.length}
            trailing={
              !showCc && (
                <button className="link-button" onClick={() => setShowCc(true)}>
                  Cc/Bcc
                </button>
              )
            }
          />
          {showCc && (
            <>
              <RecipientInput label="Cc" values={cc} onChange={setCc} />
              <RecipientInput label="Bcc" values={bcc} onChange={setBcc} />
            </>
          )}
          <div className="compose-field">
            <input
              className="compose-subject"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <textarea
            ref={bodyRef}
            className="compose-body"
            value={body}
            autoFocus={draft.to.length > 0}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send()
            }}
          />

          {files.length > 0 && (
            <div className="compose-files">
              {files.map((f, i) => (
                <AttachmentCard
                  key={`${f.filename}-${i}`}
                  attachment={{ filename: f.filename, contentType: f.contentType ?? '', size: f.size }}
                  onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {error && <div className="compose-error">{error}</div>}

          <footer className="compose-footer">
            <button className="send-button" onClick={() => void send()} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
              <Icon name="send" size={18} />
            </button>
            <button
              className="icon-button"
              title="Attach files"
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="paperclip" />
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <span className="toolbar-spacer" />
            <button className="icon-button" title="Discard" onClick={onClose}>
              <Icon name="trash" />
            </button>
          </footer>
        </>
      )}
    </div>
  )
}
