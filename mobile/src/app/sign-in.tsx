import { ApiError } from '@shared/mail'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/BrandLogo'
import { Text, TextInput } from '@/components/Text'
import { api } from '@/data/api'
import { MAIL_DOMAIN } from '@/data/config'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

/** Only India is supported for now (the backend validates the same way). */
const COUNTRY = { flag: '🇮🇳', dialCode: '+91' }

/** Digits of the national number: drops a pasted +91 / leading 0, max 10. */
function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

const isValidMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits)

/** "98765 43210" */
const grouped = (digits: string) =>
  digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits

export default function SignInScreen() {
  const { colors } = useTheme()
  const [digits, setDigits] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = isValidMobile(digits)
  const inputError =
    touched && !valid
      ? digits.length === 10
        ? 'Indian mobile numbers start with 6, 7, 8 or 9'
        : 'Enter your 10-digit mobile number'
      : null

  const next = async () => {
    setTouched(true)
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.requestOtp(digits, COUNTRY.dialCode)
      router.push({ pathname: '/verify', params: { phone: digits, resendIn: String(res.resendIn) } })
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
        // A code was sent moments ago: go enter it instead of blocking.
        router.push({ pathname: '/verify', params: { phone: digits, resendIn: String(err.retryAfter) } })
      } else {
        setError(err instanceof ApiError ? err.message : 'Can’t reach PhoneMail. Check your connection.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.welcome }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BrandLogo size={72} />
            <Text style={[styles.title, { color: colors.text }]}>Welcome to PhoneMail</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Your phone number is your email address.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Mobile number</Text>
          <View
            style={[
              styles.field,
              {
                backgroundColor: colors.surface,
                borderColor: inputError ? colors.danger : colors.borderStrong,
              },
            ]}
          >
            <View style={[styles.country, { borderRightColor: colors.border }]}>
              <Text style={styles.flag}>{COUNTRY.flag}</Text>
              <Text style={[styles.dialCode, { color: colors.text }]}>{COUNTRY.dialCode}</Text>
            </View>
            <TextInput
              value={grouped(digits)}
              onChangeText={(t) => {
                setDigits(nationalDigits(t))
                setError(null)
              }}
              onBlur={() => digits.length > 0 && setTouched(true)}
              onSubmitEditing={() => void next()}
              placeholder="98765 43210"
              placeholderTextColor={colors.textSubtle}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="go"
              autoFocus
              accessibilityLabel="Mobile number"
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          {inputError ? (
            <Text style={[styles.hint, { color: colors.danger }]}>{inputError}</Text>
          ) : valid ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Your email address will be{' '}
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {digits}@{MAIL_DOMAIN}
              </Text>
            </Text>
          ) : (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              We’ll text you a 6-digit code to verify it.
            </Text>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          <View style={styles.spacer} />

          <Pressable
            onPress={() => void next()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !valid || busy }}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: pressed ? colors.primaryHover : colors.primary,
                opacity: valid ? 1 : 0.5,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.primaryText, { color: colors.onPrimary }]}>Continue</Text>
            )}
          </Pressable>

          <Text style={[styles.terms, { color: colors.textMuted }]}>
            By continuing, you agree to our{' '}
            <Text
              onPress={() => router.push('/terms')}
              accessibilityRole="link"
              style={{ color: colors.primary, fontWeight: '600' }}
            >
              Terms & Conditions
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xl * 2 },
  header: { alignItems: 'center', marginBottom: spacing.xl * 1.5 },
  title: { fontSize: 26, fontWeight: '700', marginTop: spacing.xl, letterSpacing: -0.4 },
  subtitle: { fontSize: font.body + 1, marginTop: spacing.sm, textAlign: 'center' },
  label: { fontSize: font.small, fontWeight: '600', marginBottom: spacing.sm, marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderWidth: 1.5,
    borderRadius: radius.md + 2,
    overflow: 'hidden',
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  flag: { fontSize: 20 },
  dialCode: { fontSize: font.title, fontWeight: '600' },
  input: { flex: 1, height: '100%', paddingHorizontal: spacing.lg, fontSize: 19, letterSpacing: 1 },
  hint: { fontSize: font.small, marginTop: spacing.sm, marginLeft: spacing.xs },
  errorBox: { borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.lg },
  errorText: { fontSize: font.small, fontWeight: '500' },
  spacer: { flex: 1, minHeight: spacing.xl },
  primary: { height: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: font.title, fontWeight: '600' },
  terms: { fontSize: font.small, textAlign: 'center', marginTop: spacing.lg, lineHeight: 19 },
})
