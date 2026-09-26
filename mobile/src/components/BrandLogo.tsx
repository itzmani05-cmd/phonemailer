import Svg, { Path } from 'react-native-svg'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

/** The PhoneMail app icon from the onboarding design: an "M" with a phone handset. */
export function BrandLogo({ size = 88 }: { size?: number }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.24, backgroundColor: colors.primary },
      ]}
    >
      <Svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 17.5V6.5l6 5.5 6-5.5"
          stroke={colors.onPrimary}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M16 6.5v4"
          stroke={colors.onPrimary}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <Path
          d="M21.2 17.4v1.4a1 1 0 0 1-1.1 1 9.7 9.7 0 0 1-4.2-1.5 9.5 9.5 0 0 1-2.9-2.9 9.7 9.7 0 0 1-1.5-4.2 1 1 0 0 1 1-1.1h1.4a1 1 0 0 1 1 .8c.1.5.2.9.3 1.4a1 1 0 0 1-.2 1l-.6.6a7.7 7.7 0 0 0 2.9 2.9l.6-.6a1 1 0 0 1 1-.2c.5.2.9.3 1.4.3a1 1 0 0 1 .9 1.1z"
          fill={colors.onPrimary}
        />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
})
