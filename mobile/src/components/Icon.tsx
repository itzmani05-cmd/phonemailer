import { icons, type IconName } from '@shared/icons'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

export type { IconName }

interface Props {
  name: IconName
  color: string
  size?: number
  /** Fill outline shapes (active star, active tab). */
  filled?: boolean
  strokeWidth?: number
}

/** Renders the shared icon set (shared/icons.ts) with react-native-svg. */
export function Icon({ name, color, size = 22, filled = false, strokeWidth = 2 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name].map((node, i) => {
        switch (node.t) {
          case 'path':
            return <Path key={i} d={node.d} fill={node.fill ? color : undefined} />
          case 'circle':
            return (
              <Circle key={i} cx={node.cx} cy={node.cy} r={node.r} fill={node.fill ? color : undefined} />
            )
          case 'rect':
            return (
              <Rect
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
    </Svg>
  )
}
