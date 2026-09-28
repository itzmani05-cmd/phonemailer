import { counterpart, formatDetailDate, type Mail } from '@shared/mail'

export const replySubject = (subject: string) =>
  /^re:/i.test(subject) ? subject : `Re: ${subject || '(no subject)'}`

export const isReply = (mail: Mail) => !!mail.inReplyTo || /^re:/i.test(mail.subject)

export function wasRepliedTo(mail: Mail, mails: Mail[]): boolean {
  if (!mail.messageId) return false
  return mails.some((m) => m.direction === 'out' && m.inReplyTo === mail.messageId)
}

export function traditionalReplyParams(mail: Mail) {
  const to = mail.direction === 'out' ? mail.to.join(',') : counterpart(mail).address
  const quoted = mail.text
    .trim()
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  return {
    to,
    subject: replySubject(mail.subject),
    body: `\n\nOn ${formatDetailDate(mail.date)}, ${mail.from} wrote:\n${quoted}`,
    inReplyTo: mail.messageId ?? undefined,
    locked: '1',
  }
}
