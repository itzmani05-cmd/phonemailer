import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { parseIdentity } from '@/data/identity'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, spacing } from '@/theme/metrics'

export default function ScanScreen() {
  const { colors } = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [message, setMessage] = useState<string | null>(null)
  const handled = useRef(false)

  const onScan = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return
    const identity = parseIdentity(data)
    if (!identity) {
      setMessage('That QR code is not a PhoneMail ID.')
      return
    }
    handled.current = true
    router.replace({
      pathname: '/u/[phone]',
      params: identity.name ? { phone: identity.phone, name: identity.name } : { phone: identity.phone },
    })
  }

  if (!permission) return <View style={[styles.screen, { backgroundColor: '#000' }]} />

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: colors.surface }]}>
        <Icon name="scan" size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Scan a PhoneMail ID</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Allow camera access to scan someone&apos;s PhoneMail QR code and email them instantly.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={() => void requestPermission()}
            style={[styles.button, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Allow camera</Text>
          </Pressable>
        ) : (
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Camera access is off. Turn it on for PhoneMail in your phone&apos;s Settings.
          </Text>
        )}
      </SafeAreaView>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.overlayText}>{message ?? 'Point at a PhoneMail QR code'}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: font.headline, fontWeight: '700' },
  body: { fontSize: font.body, textAlign: 'center' },
  button: { marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  buttonLabel: { fontSize: font.body, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#ffffff', borderRadius: radius.md + 8 },
  overlayText: {
    color: '#ffffff',
    fontSize: font.body,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
})
