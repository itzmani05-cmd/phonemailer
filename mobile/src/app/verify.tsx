import { ApiError, formatPhone } from '@shared/mail'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HeaderButton } from '@/components/HeaderButton'
import { Text, TextInput } from '@/components/Text'
import { api } from '@/data/api'
import { useAuth } from '@/data/auth'
import { completeOnboarding } from '@/data/onboarding'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

const CODE_LENGTH = 6

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Can’t reach PhoneMail. Check your connection.'
}

export default function VerifyScreen() {
  const { colors } = useTheme()
  const { signIn } = useAuth()
  const params = useLocalSearchParams<{ phone: string; resendIn?: string }>()
  const phone = params.phone ?? ''
  const input = useRef<RNTextInput>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [wait, setWait] = useState(() => Number(params.resendIn ?? 30))

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const verify = async (value: string) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await api.verifyOtp(phone, value)
      await completeOnboarding()
      await signIn(result)
    } catch (err) {
      setError(errorMessage(err))
      setCode('')
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    setError(null)
    if (digits.length === CODE_LENGTH && !busy) void verify(digits)
  }

  const resend = async () => {
    if (wait > 0 || busy) return
    setError(null)
    setNotice(null)
    setCode('')
    try {
      const res = await api.requestOtp(phone)
      setWait(res.resendIn)
      setNotice('We sent you a new code.')
    } catch (err) {
      if (err instanceof ApiError && err.retryAfter) setWait(err.retryAfter)
      setError(errorMessage(err))
    }
    input.current?.focus()
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.welcome }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <HeaderButton icon="arrowLeft" label="Change number" onPress={() => router.back()} color={colors.text} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Enter the code</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We texted a {CODE_LENGTH}-digit code to{' '}
            <Text style={{ color: colors.text, fontWeight: '600' }}>{formatPhone(phone, '91')}</Text>
          </Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.link, { color: colors.primary }]}>Wrong number?</Text>
          </Pressable>

          <Pressable style={styles.boxes} onPress={() => input.current?.focus()} accessible={false}>
            {Array.from({ length: CODE_LENGTH }, (_, i) => {
              const active = i === code.length && !busy
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    {
                      backgroundColor: colors.surface,
                      borderColor: error
                        ? colors.danger
                        : active
                          ? colors.primary
                          : colors.borderStrong,
                    },
                  ]}
                >
                  <Text style={[styles.digit, { color: colors.text }]}>{code[i] ?? ''}</Text>
                </View>
              )
            })}
            <TextInput
              ref={input}
              value={code}
              onChangeText={onChange}
              editable={!busy}
              autoFocus
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              importantForAutofill="yes"
              maxLength={CODE_LENGTH}
              caretHidden
              accessibilityLabel="Verification code"
              style={styles.hiddenInput}
            />
          </Pressable>

          <View style={styles.status}>
            {busy ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.textMuted }]}>Verifying…</Text>
              </View>
            ) : error ? (
              <Text style={[styles.statusText, { color: colors.danger }]}>{error}</Text>
            ) : notice ? (
              <Text style={[styles.statusText, { color: colors.textMuted }]}>{notice}</Text>
            ) : null}
          </View>

          <Pressable onPress={() => void resend()} disabled={wait > 0} accessibilityRole="button" hitSlop={8}>
            <Text
              style={[
                styles.resend,
                { color: wait > 0 ? colors.textSubtle : colors.primary },
              ]}
            >
              {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, '0')}` : 'Resend code'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: font.body + 1, marginTop: spacing.sm, lineHeight: 23 },
  link: { fontSize: font.body, fontWeight: '600', marginTop: spacing.sm },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl * 1.5 },
  box: {
    width: 48,
    height: 58,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 24, fontWeight: '600' },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' },
  status: { minHeight: 44, justifyContent: 'center', marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { fontSize: font.small + 1 },
  resend: { fontSize: font.body, fontWeight: '600' },
})
