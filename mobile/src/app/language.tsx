import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/BrandLogo'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { deviceLanguage, useLanguage } from '@/i18n/LanguageProvider'
import { LANGUAGES, STRINGS, type Language } from '@/i18n/strings'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function LanguageScreen() {
  const { colors } = useTheme()
  const { setLanguage } = useLanguage()
  const [selected, setSelected] = useState<Language>(deviceLanguage)
  const text = STRINGS[selected]

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.welcome }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BrandLogo size={72} />
          <Text style={[styles.title, { color: colors.text }]}>{text['language.title']}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{text['language.subtitle']}</Text>
        </View>

        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {LANGUAGES.map((l, i) => {
            const active = l.code === selected
            return (
              <Pressable
                key={l.code}
                onPress={() => setSelected(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={l.english}
                style={({ pressed }) => [
                  styles.option,
                  i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: colors.surfaceHover },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? colors.primary : colors.borderStrong }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.name, { color: colors.text }]}>{l.name}</Text>
                  {l.name !== l.english && (
                    <Text style={[styles.english, { color: colors.textMuted }]}>{l.english}</Text>
                  )}
                </View>
                {active && <Icon name="check" size={20} color={colors.primary} />}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={() => setLanguage(selected)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? colors.primaryHover : colors.primary }]}
        >
          <Text style={[styles.primaryText, { color: colors.onPrimary }]}>{text['common.next']}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xl * 2 },
  header: { alignItems: 'center', marginBottom: spacing.xl * 1.5 },
  title: { fontSize: 26, fontWeight: '700', marginTop: spacing.xl, textAlign: 'center' },
  subtitle: { fontSize: font.body + 1, marginTop: spacing.sm, textAlign: 'center' },
  list: { borderRadius: radius.md + 4, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg, minHeight: 64 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  optionText: { flex: 1 },
  name: { fontSize: font.title, fontWeight: '600' },
  english: { fontSize: font.small, marginTop: 1 },
  actions: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  primary: { height: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: font.title, fontWeight: '600' },
})
