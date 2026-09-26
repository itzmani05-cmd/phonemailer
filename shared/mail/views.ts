import { avatarColors, fileColors, textOn, type FileKind } from '../theme/colors'
import { senderAddress, senderName } from './format'
import type { Mail, MailCategory } from './types'

/** Sidebar / drawer destinations. */
export type MailView =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'sent'
  | 'drafts'
  | 'spam'
  | 'trash'
  | `label:${string}`

export const VIEW_LABELS: Record<Exclude<MailView, `label:${string}`>, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  sent: 'Sent',
  drafts: 'Drafts',
  spam: 'Spam',
  trash: 'Trash',
}

export function viewTitle(view: MailView): string {
  return view.startsWith('label:') ? view.slice(6) : VIEW_LABELS[view as keyof typeof VIEW_LABELS]
}

export const isSnoozed = (m: Mail, now = Date.now()) =>
  !!m.snoozedUntil && Date.parse(m.snoozedUntil) > now

const isLive = (m: Mail) => m.folder !== 'trash' && m.folder !== 'spam'

export function inView(m: Mail, view: MailView, now = Date.now()): boolean {
  switch (view) {
    case 'inbox':
      return m.folder === 'inbox' && !isSnoozed(m, now)
    case 'starred':
      return m.starred && isLive(m)
    case 'snoozed':
      return isSnoozed(m, now) && isLive(m)
    case 'sent':
    case 'drafts':
    case 'spam':
    case 'trash':
      return m.folder === view
    default:
      return isLive(m) && m.labels.includes(view.slice(6))
  }
}

export function matchesQuery(m: Mail, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [m.subject, m.from, m.text, ...m.to, ...m.cc].some((field) =>
    field.toLowerCase().includes(q),
  )
}

export function viewCounts(mails: Mail[], now = Date.now()) {
  const inbox = mails.filter((m) => inView(m, 'inbox', now))
  return {
    inbox: inbox.filter((m) => !m.read).length,
    drafts: mails.filter((m) => m.folder === 'drafts').length,
    spam: mails.filter((m) => m.folder === 'spam' && !m.read).length,
  }
}

export function categoryOf(m: Mail): MailCategory {
  return m.category
}

// ---------- People ----------

export interface Person {
  name: string
  address: string
}

/** The other side of a message: the sender for received mail, the first recipient for sent. */
export function counterpart(m: Mail): Person {
  if (m.direction === 'out') {
    const address = m.to[0] ?? m.envelope.to[0] ?? ''
    return { name: address.split('@')[0] ?? address, address }
  }
  return { name: senderName(m.from), address: senderAddress(m.from).toLowerCase() }
}

export interface Conversation {
  person: Person
  messages: Mail[] // oldest first
  latest: Mail
  unread: number
}

/** Groups mail into chat-style threads per contact (newest conversation first). */
export function conversations(mails: Mail[]): Conversation[] {
  const byAddress = new Map<string, Mail[]>()
  const names = new Map<string, string>()
  for (const m of mails) {
    if (!isLive(m) || m.folder === 'drafts') continue
    const p = counterpart(m)
    if (!p.address) continue
    byAddress.set(p.address, [...(byAddress.get(p.address) ?? []), m])
    // Prefer a real display name from received mail over the address-derived one.
    if (m.direction === 'in' || !names.has(p.address)) names.set(p.address, p.name)
  }
  return [...byAddress.entries()]
    .map(([address, list]) => {
      const messages = [...list].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
      return {
        person: { address, name: names.get(address) ?? address },
        messages,
        latest: messages[messages.length - 1],
        unread: messages.filter((m) => m.direction === 'in' && !m.read).length,
      }
    })
    .sort((a, b) => b.latest.receivedAt.localeCompare(a.latest.receivedAt))
}

export interface Contact extends Person {
  count: number
  lastAt: string
}

export function contacts(mails: Mail[]): Contact[] {
  return conversations(mails).map((c) => ({
    ...c.person,
    count: c.messages.length,
    lastAt: c.latest.receivedAt,
  }))
}

// ---------- Visual helpers ----------

export function avatarColor(seed: string): { background: string; color: string } {
  let hash = 0
  for (const ch of seed.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const background = avatarColors[hash % avatarColors.length]
  return { background, color: textOn(background) }
}

export function fileKind(filename: string | null, contentType: string): FileKind {
  const ext = filename?.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf' || contentType === 'application/pdf') return 'pdf'
  if (contentType.startsWith('image/')) return 'image'
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return 'slides'
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return 'archive'
  return 'other'
}

export const FILE_BADGE: Record<FileKind, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  sheet: 'XLS',
  slides: 'PPT',
  image: 'IMG',
  archive: 'ZIP',
  other: 'FILE',
}

export function fileColor(kind: FileKind): string {
  return fileColors[kind]
}
