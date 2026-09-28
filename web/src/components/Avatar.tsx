import { avatarColor, initials, type Account } from '@shared/mail'
import type { CSSProperties } from 'react'
import { mailApi } from '../api/mail'

interface Props {
  name: string
  size?: number
  tone?: 'auto' | 'primary' | 'account'
  src?: string | null
}

export function Avatar({ name, size = 36, tone = 'auto', src }: Props) {
  const style: CSSProperties = { width: size, height: size, fontSize: size * 0.4 }
  if (src) return <img className="avatar avatar-img" src={src} style={style} alt="" />
  if (tone === 'auto') Object.assign(style, avatarColor(name))
  return (
    <span className={`avatar avatar-${tone}`} style={style} aria-hidden>
      {initials(name).slice(0, 1)}
    </span>
  )
}

export function AccountAvatar({ account, size = 34 }: { account: Account | null; size?: number }) {
  const src = account?.avatarVersion ? mailApi.avatarUrl(account.avatarVersion) : null
  return <Avatar name={account?.name ?? '?'} size={size} tone="account" src={src} />
}
