import { counterpart, formatFullDate, type Mail } from '@shared/mail'

export type ReplyMode = 'reply' | 'replyAll' | 'forward'

export interface ComposeDraft {
  to: string[]
  cc: string[]
  subject: string
  body: string
  inReplyTo?: string
  forwardOf?: Mail
}

export const EMPTY_DRAFT: ComposeDraft = { to: [], cc: [], subject: '', body: '' }

function prefixed(prefix: string, subject: string) {
  return subject.toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`
}

function quote(mail: Mail) {
  const quoted = mail.text
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
  return `\n\nOn ${formatFullDate(mail.date)}, ${mail.from} wrote:\n${quoted}`
}

export function replyDraft(mail: Mail, mode: ReplyMode, ownAddress?: string): ComposeDraft {
  const me = ownAddress?.toLowerCase()
  if (mode === 'forward') {
    return {
      to: [],
      cc: [],
      subject: prefixed('Fwd:', mail.subject),
      body: `\n\n---------- Forwarded message ---------\nFrom: ${mail.from}\nDate: ${formatFullDate(mail.date)}\nSubject: ${mail.subject}\nTo: ${mail.to.join(', ')}\n\n${mail.text}`,
      forwardOf: mail,
    }
  }
  const primary = mail.direction === 'out' ? mail.to : [counterpart(mail).address]
  const cc =
    mode === 'replyAll'
      ? [...mail.to, ...mail.cc].filter(
          (a) => a.toLowerCase() !== me && !primary.includes(a.toLowerCase()),
        )
      : []
  return {
    to: primary,
    cc,
    subject: prefixed('Re:', mail.subject),
    body: quote(mail),
    inReplyTo: mail.messageId ?? undefined,
  }
}
