/** Mirrors backend/src/mail/mail.types.ts (GET /mail). */
export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash'
export type MailCategory = 'primary' | 'social' | 'promotions'

export interface MailAttachment {
  filename: string | null
  contentType: string
  size: number
}

export interface Mail {
  id: string
  direction: 'in' | 'out'
  folder: MailFolder
  category: MailCategory
  labels: string[]
  read: boolean
  starred: boolean
  snoozedUntil: string | null
  receivedAt: string
  envelope: { from: string | null; to: string[] }
  messageId: string | null
  inReplyTo: string | null
  subject: string
  from: string
  to: string[]
  cc: string[]
  date: string
  text: string
  html: string | null
  attachments: MailAttachment[]
  size: number
}

export interface MailChanges {
  read?: boolean
  starred?: boolean
  folder?: MailFolder
  labels?: string[]
  snoozedUntil?: string | null
}

/** @deprecated use MailChanges */
export type MailFlags = MailChanges

export interface Label {
  name: string
  color: string
}

export interface Account {
  name: string
  /** National number, digits only (also the address local part) */
  phone: string
  /** e.g. '91'; empty when not configured */
  countryCode: string
  address: string
  storageQuotaBytes: number
}

export interface AuthUser {
  id: string
  /** E.164, e.g. +919876543210 */
  phone: string | null
  /** <phone>@<domain> */
  email: string
  name: string | null
}

export interface OtpRequestResult {
  success: true
  /** Normalized E.164 number the code was sent to */
  phone: string
  /** Seconds until the code expires */
  expiresIn: number
  /** Seconds before another code can be requested */
  resendIn: number
}

export interface OtpVerifyResult {
  success: true
  accessToken: string
  tokenType: 'Bearer'
  /** Token lifetime in seconds */
  expiresIn: number
  /** True the first time this number signs in */
  isNewUser: boolean
  user: AuthUser
  account: Account
}

export interface OutgoingAttachment {
  filename: string
  contentType?: string
  /** base64 */
  content: string
}

export interface SendEmailRequest {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  text?: string
  html?: string
  inReplyTo?: string
  attachments?: OutgoingAttachment[]
}

export interface SendEmailResult {
  id: string
  messageId: string
  accepted: string[]
  rejected: string[]
}
