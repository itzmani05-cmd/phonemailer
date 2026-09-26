/** `"Alice Smith" <alice@x.com>` -> `Alice Smith`; bare address -> address. */
export function senderName(from: string): string {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/)
  if (match) return match[1].trim() || match[2]
  return from.trim() || 'Unknown sender'
}

export function senderAddress(from: string): string {
  return from.match(/<([^>]+)>/)?.[1] ?? from.trim()
}

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function snippet(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

export function formatListDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** List preview: plain text, or the HTML body with tags stripped for HTML-only mail. */
export function previewText(mail: { text: string; html: string | null }, max = 120): string {
  if (mail.text.trim()) return snippet(mail.text, max)
  const stripped = (mail.html ?? '')
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
  return snippet(stripped, max)
}

const DAY = 24 * 60 * 60 * 1000

function isYesterday(date: Date, now = new Date()) {
  return new Date(now.getTime() - DAY).toDateString() === date.toDateString()
}

/** Mobile lists: "10:24 AM" today, "Yesterday", "Jan 20" this year, else with the year. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (isYesterday(date)) return 'Yesterday'
  return formatListDate(iso)
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "10:24 AM (2 hours ago)" for today, otherwise "Nov 28, 10:24 AM (3 days ago)". */
export function formatWithAgo(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const mins = Math.max(0, Math.round((now - date.getTime()) / 60000))
  const ago =
    mins < 1
      ? 'just now'
      : mins < 60
        ? `${mins} minute${mins === 1 ? '' : 's'} ago`
        : mins < 60 * 24
          ? `${Math.round(mins / 60)} hour${Math.round(mins / 60) === 1 ? '' : 's'} ago`
          : `${Math.round(mins / 1440)} day${Math.round(mins / 1440) === 1 ? '' : 's'} ago`
  const when =
    date.toDateString() === new Date(now).toDateString()
      ? formatTime(iso)
      : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${formatTime(iso)}`
  return `${when} (${ago})`
}

/** "Yesterday, 8:01 AM" / "Jan 20, 2026, 8:01 AM" (mobile email details). */
export function formatDetailDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return `Today, ${formatTime(iso)}`
  if (isYesterday(date, now)) return `Yesterday, ${formatTime(iso)}`
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Chat day separators: "Today", "Yesterday", "Mon, Jan 20". */
export function formatDay(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return 'Today'
  if (isYesterday(date, now)) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

/** "+91 98765 43210" for a 10-digit number with country code. */
export function formatPhone(phone: string, countryCode = ''): string {
  const digits = phone.replace(/\D/g, '')
  const grouped = digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits
  return countryCode ? `+${countryCode} ${grouped}` : grouped
}

/** "2.4 GB of 15 GB used" */
export function formatStorage(used: number, quota: number): string {
  const gb = (n: number) => {
    const v = n / 1024 ** 3
    return v >= 10 || Number.isInteger(v) ? `${Math.round(v)} GB` : `${v.toFixed(1)} GB`
  }
  const usedLabel = used < 1024 ** 3 ? formatBytes(used) : gb(used)
  return `${usedLabel} of ${gb(quota)} used`
}

/** Chat bubbles: drop the quoted history ("On … wrote:" and "> " lines) from replies. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const cut = lines.findIndex(
    (l, i) =>
      /^On .+wrote:\s*$/.test(l.trim()) ||
      /^-{2,}\s*(Forwarded|Original) message/i.test(l.trim()) ||
      (l.startsWith('>') && lines.slice(i).every((r) => !r.trim() || r.startsWith('>'))),
  )
  return (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim()
}
