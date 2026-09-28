import { StyleSheet, View } from 'react-native'
import { useT } from '@/i18n/LanguageProvider'
import type { StringKey } from '@/i18n/strings'
import { useTheme } from '@/theme/ThemeProvider'
import { font, spacing } from '@/theme/metrics'
import { Text } from './Text'

const SECTIONS: [StringKey, StringKey][] = [
  ['terms.accountTitle', 'terms.accountBody'],
  ['terms.useTitle', 'terms.useBody'],
  ['terms.dataTitle', 'terms.dataBody'],
  ['terms.changesTitle', 'terms.changesBody'],
]

export function TermsSections() {
  const { colors } = useTheme()
  const t = useT()
  return (
    <View style={styles.sections}>
      {SECTIONS.map(([title, body]) => (
        <View key={title}>
          <Text style={[styles.heading, { color: colors.text }]}>{t(title)}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>{t(body)}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  heading: { fontSize: font.title, fontWeight: '600', marginBottom: spacing.xs },
  body: { fontSize: font.body, lineHeight: 22 },
})
