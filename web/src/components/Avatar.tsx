import { avatarColor, initials } from '@shared/mail'
import type { CSSProperties } from 'react'

interface Props {
  name: string
  size?: number
  tone?: 'auto' | 'primary' | 'account'
}

export function Avatar({ name, size = 36, tone = 'auto' }: Props) {
  const style: CSSProperties = { width: size, height: size, fontSize: size * 0.4 }
  if (tone === 'auto') Object.assign(style, avatarColor(name))
  return (
    <span className={`avatar avatar-${tone}`} style={style} aria-hidden>
      {initials(name).slice(0, 1)}
    </span>
  )
}
