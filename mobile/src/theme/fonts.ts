// Per-weight entry points: importing the package root would bundle all 18 styles.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { fontFamily } from '@shared/theme'
import type { TextStyle } from 'react-native'

// Android can't pick weights from one family, so each weight is its own
// static font file registered under its own name (Inter_400Regular, ...).
export const fonts = {
  regular: `${fontFamily}_400Regular`,
  medium: `${fontFamily}_500Medium`,
  semibold: `${fontFamily}_600SemiBold`,
  bold: `${fontFamily}_700Bold`,
} as const

/** Passed to useFonts() in the root layout. */
export const fontAssets = {
  [fonts.regular]: Inter_400Regular,
  [fonts.medium]: Inter_500Medium,
  [fonts.semibold]: Inter_600SemiBold,
  [fonts.bold]: Inter_700Bold,
}

/** Maps a CSS-style fontWeight to the matching Inter face. */
export function fontForWeight(weight: TextStyle['fontWeight']): string {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight)
  if (w >= 700) return fonts.bold
  if (w >= 600) return fonts.semibold
  if (w >= 500) return fonts.medium
  return fonts.regular
}
