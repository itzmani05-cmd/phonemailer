import type { Ref } from 'react'
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native'
import { fontForWeight } from '@/theme/fonts'

// React Native has no global default font, so every Text/TextInput goes
// through these wrappers. Write `fontWeight` as usual; it is turned into the
// matching Inter face (and reset, so Android doesn't fake-bold it).
function withAppFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {}
  if (flat.fontFamily) return style
  return [style, { fontFamily: fontForWeight(flat.fontWeight), fontWeight: 'normal' }]
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withAppFont(style)} />
}

// React 19 passes `ref` as a regular prop to function components.
export function TextInput({ style, ref, ...props }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  return <RNTextInput ref={ref} {...props} style={withAppFont(style)} />
}
