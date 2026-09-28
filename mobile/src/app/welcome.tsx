import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/BrandLogo'
import { TermsSections } from '@/components/TermsSections'
import { Text } from '@/components/Text'
import { completeOnboarding } from '@/data/onboarding'
import { useLanguage } from '@/i18n/LanguageProvider'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function WelcomeScreen() {
  const { colors } = useTheme()
  const { t, setLanguage } = useLanguage()

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.welcome }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BrandLogo size={72} />
          <Text style={[styles.title, { color: colors.text }]}>{t('welcome.title')}</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>{t('welcome.tagline')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{t('terms.title')}</Text>
          <TermsSections />
        </View>
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Text style={[styles.note, { color: colors.textMuted }]}>{t('welcome.agreeNote')}</Text>
        <Pressable
          onPress={() => void completeOnboarding()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? colors.primaryHover : colors.primary }]}
        >
          <Text style={[styles.primaryText, { color: colors.onPrimary }]}>{t('welcome.agree')}</Text>
        </Pressable>
        <Pressable onPress={() => setLanguage(null)} accessibilityRole="button" style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: colors.primary }]}>{t('welcome.changeLanguage')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xl * 1.5 },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center', letterSpacing: -0.4 },
  tagline: { fontSize: font.body + 1, marginTop: spacing.sm, textAlign: 'center' },
  card: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xl, gap: spacing.lg },
  cardTitle: { fontSize: font.headline - 2, fontWeight: '700' },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  note: { fontSize: font.small, textAlign: 'center', marginBottom: spacing.md, lineHeight: 19 },
  primary: { height: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: font.title, fontWeight: '600' },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  secondaryText: { fontSize: font.body, fontWeight: '600' },
})
