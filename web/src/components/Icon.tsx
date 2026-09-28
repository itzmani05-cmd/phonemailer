import { icons, type IconName } from '@shared/icons'
import type { SVGProps } from 'react'

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  filled?: boolean
}

export function Icon({ name, size = 20, filled = false, strokeWidth = 2, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {icons[name].map((node, i) => {
        switch (node.t) {
          case 'path':
            return <path key={i} d={node.d} fill={node.fill ? 'currentColor' : undefined} />
          case 'circle':
            return (
              <circle
                key={i}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill={node.fill ? 'currentColor' : undefined}
              />
            )
          case 'rect':
            return (
              <rect
                key={i}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={node.rx}
              />
            )
        }
      })}
    </svg>
  )
}
