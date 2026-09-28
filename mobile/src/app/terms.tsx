import { Stack } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { TermsSections } from '@/components/TermsSections'
import { useT } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { spacing } from '@/theme/metrics'

export default function TermsScreen() {
  const { colors } = useTheme()
  const t = useT()
  return (
    <ScrollView style={{ backgroundColor: colors.surface }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('terms.title') }} />
      <TermsSections />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl },
})
