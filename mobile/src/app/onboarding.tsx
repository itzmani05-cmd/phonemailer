import { useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/BrandLogo'
import { Icon, type IconName } from '@/components/Icon'
import { Text } from '@/components/Text'
import { completeOnboarding } from '@/data/onboarding'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'chatLines', title: 'Email, as easy as a chat', body: 'Use your phone number' },
  { icon: 'mail', title: 'Works with everyone', body: 'Send and receive real emails' },
  { icon: 'shieldCheck', title: 'Stay connected', body: 'Anywhere, anytime' },
]

const PAGES = [
  { key: 'welcome' },
  {
    key: 'address',
    title: 'Your number is your address',
    body: 'Anyone can email you at your phone number, from Gmail, Outlook or any other provider.',
    icon: 'phone' as IconName,
  },
  {
    key: 'chats',
    title: 'Conversations, not folders',
    body: 'Every contact gets a chat-style thread. Reply in one tap and attach photos or files.',
    icon: 'chat' as IconName,
  },
]

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [page, setPage] = useState(0)
  // Horizontal list items don't stretch vertically, so size pages to the list.
  const [height, setHeight] = useState(0)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width))

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.welcome }]}>
      <FlatList
        data={PAGES}
        horizontal
        pagingEnabled
        style={styles.pages}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(p) => p.key}
        renderItem={({ item }) => (
          <View style={[styles.page, { width, height }]}>
            {item.key === 'welcome' ? (
              <>
                <BrandLogo size={96} />
                <Text style={[styles.brand, { color: colors.text }]}>PhoneMail</Text>
                <Text style={[styles.tagline, { color: colors.text }]}>
                  Your phone number.{'\n'}Your email.
                </Text>
                <View style={styles.features}>
                  {FEATURES.map((f) => (
                    <View key={f.title} style={styles.feature}>
                      <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                        <Icon name={f.icon} size={22} color={colors.onPrimary} />
                      </View>
                      <View style={styles.featureText}>
                        <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                        <Text style={[styles.featureBody, { color: colors.textMuted }]}>{f.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={[styles.bigIcon, { backgroundColor: colors.primary }]}>
                  <Icon name={item.icon!} size={48} color={colors.onPrimary} />
                </View>
                <Text style={[styles.pageTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.pageBody, { color: colors.textMuted }]}>{item.body}</Text>
              </>
            )}
          </View>
        )}
      />

      <View style={styles.dots}>
        {PAGES.map((p, i) => (
          <View
            key={p.key}
            style={[styles.dot, { backgroundColor: i === page ? colors.primary : colors.borderStrong }]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void completeOnboarding()}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: pressed ? colors.primaryHover : colors.primary },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.primaryText, { color: colors.onPrimary }]}>Get Started</Text>
        </Pressable>
        <Pressable onPress={() => void completeOnboarding()} style={styles.secondary} accessibilityRole="button">
          <Text style={[styles.secondaryText, { color: colors.primary }]}>Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pages: { flex: 1 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl + 4 },
  brand: { fontSize: 34, fontWeight: '700', marginTop: spacing.xl, letterSpacing: -0.5 },
  tagline: { fontSize: 19, textAlign: 'center', lineHeight: 26, marginTop: spacing.md },
  features: { alignSelf: 'stretch', gap: spacing.xl, marginTop: spacing.xl * 1.6 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  featureIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: font.body + 1, fontWeight: '600' },
  featureBody: { fontSize: font.body, marginTop: 2 },
  bigIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: spacing.xl * 1.4 },
  pageBody: { fontSize: font.body + 1, textAlign: 'center', lineHeight: 23, marginTop: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.xl },
  dot: { width: 7, height: 7, borderRadius: 4 },
  actions: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  primary: { height: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: font.title, fontWeight: '600' },
  secondary: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  secondaryText: { fontSize: font.title, fontWeight: '500' },
})
