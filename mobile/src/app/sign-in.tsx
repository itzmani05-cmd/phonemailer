import { ApiError } from '@shared/mail'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
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
import { useT } from '@/i18n/LanguageProvider'
import { Icon } from '@/components/Icon'
import { phoneHintAvailable, requestPhoneNumber } from '../../modules/phone-hint'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

const COUNTRY = { flag: '🇮🇳', dialCode: '+91' }

function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

const isValidMobile = (digits: string) => /^[6-9]\d{9}$/.test(digits)

const grouped = (digits: string) =>
  digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits

export default function SignInScreen() {
  const { colors } = useTheme()
  const t = useT()
  const [digits, setDigits] = useState('')
  const [fromSim, setFromSim] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fillFromSim = async () => {
    const number = await requestPhoneNumber()
    if (!number) return
    setDigits(nationalDigits(number))
    setFromSim(true)
    setTouched(true)
    setError(null)
  }

  useEffect(() => {
    if (!phoneHintAvailable) return
    let active = true
    void requestPhoneNumber().then((number) => {
      if (!active || !number) return
      setDigits(nationalDigits(number))
      setFromSim(true)
      setTouched(true)
    })
    return () => {
      active = false
    }
  }, [])

  const valid = isValidMobile(digits)
  const inputError =
    touched && !valid
      ? digits.length === 10
        ? t('signIn.errStart')
        : t('signIn.errLength')
      : null

  const next = async () => {
    setTouched(true)
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.requestOtp(digits, COUNTRY.dialCode)
      router.push({
        pathname: '/verify',
        params: { phone: digits, resendIn: String(res.resendIn), channel: res.channel },
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
        router.push({ pathname: '/verify', params: { phone: digits, resendIn: String(err.retryAfter) } })
      } else {
        setError(err instanceof ApiError ? err.message : t('common.offline'))
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
            <Text style={[styles.title, { color: colors.text }]}>{t('signIn.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('signIn.subtitle')}</Text>
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>{t('signIn.label')}</Text>
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
              onChangeText={(value) => {
                setDigits(nationalDigits(value))
                setFromSim(false)
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
              autoFocus={!phoneHintAvailable}
              accessibilityLabel={t('signIn.label')}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          {inputError ? (
            <Text style={[styles.hint, { color: colors.danger }]}>{inputError}</Text>
          ) : valid ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {fromSim ? `${t('signIn.simFilled')} ` : ''}
              {t('signIn.addressWillBe')}{' '}
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {digits}@{MAIL_DOMAIN}
              </Text>
            </Text>
          ) : (
            <Text style={[styles.hint, { color: colors.textMuted }]}>{t('signIn.codeHint')}</Text>
          )}

          {phoneHintAvailable && (
            <Pressable
              onPress={() => void fillFromSim()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.simButton, pressed && { opacity: 0.7 }]}
            >
              <Icon name="phone" size={17} color={colors.primary} />
              <Text style={[styles.simText, { color: colors.primary }]}>{t('signIn.useSim')}</Text>
            </Pressable>
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
              <Text style={[styles.primaryText, { color: colors.onPrimary }]}>{t('common.continue')}</Text>
            )}
          </Pressable>

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
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    marginLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
  simText: { fontSize: font.body, fontWeight: '600' },
})
