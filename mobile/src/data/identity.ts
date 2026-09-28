import { Share } from 'react-native'
import { MAIL_DOMAIN } from './config'

export interface Identity {
  phone: string
  name?: string
}

const SCHEME = 'phonemailer'

export function identityLink({ phone, name }: Identity): string {
  const query = name && name !== phone ? `?name=${encodeURIComponent(name)}` : ''
  return `${SCHEME}://u/${phone}${query}`
}

export function identityAddress(phone: string): string {
  return `${phone}@${MAIL_DOMAIN}`
}

function nationalNumber(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  return /^[6-9]\d{9}$/.test(digits) ? digits : null
}

export function parseIdentity(data: string): Identity | null {
  const text = data.trim()

  const link = new RegExp(`^${SCHEME}://u/([^?#/]+)(?:\\?(.*))?$`, 'i').exec(text)
  if (link) {
    const phone = nationalNumber(decodeURIComponent(link[1]))
    if (!phone) return null
    const name = new URLSearchParams(link[2] ?? '').get('name')?.trim()
    return { phone, name: name || undefined }
  }

  const address = text.replace(/^mailto:/i, '').split('?')[0]
  const at = address.lastIndexOf('@')
  if (at > 0) {
    if (address.slice(at + 1).toLowerCase() !== MAIL_DOMAIN.toLowerCase()) return null
    const phone = nationalNumber(address.slice(0, at))
    return phone ? { phone } : null
  }

  const phone = nationalNumber(text)
  return phone ? { phone } : null
}

export function shareIdentity(identity: Identity) {
  const address = identityAddress(identity.phone)
  return Share.share({
    message: `Email me on PhoneMail: ${address}\n\nOpen my PhoneMail ID: ${identityLink(identity)}`,
  })
}
