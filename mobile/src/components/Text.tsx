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

function withAppFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {}
  if (flat.fontFamily) return style
  return [style, { fontFamily: fontForWeight(flat.fontWeight), fontWeight: 'normal' }]
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withAppFont(style)} />
}

export function TextInput({ style, ref, ...props }: TextInputProps & { ref?: Ref<RNTextInput> }) {
  return <RNTextInput ref={ref} {...props} style={withAppFont(style)} />
}
