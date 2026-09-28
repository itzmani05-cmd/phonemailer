import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { DrawerProvider } from '@/components/Drawer'
import { AuthProvider, useAuth } from '@/data/auth'
import { MailProvider } from '@/data/MailProvider'
import { useOnboarded } from '@/data/onboarding'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'
import { fontAssets, fonts } from '@/theme/fonts'

void SplashScreen.preventAutoHideAsync()

function ThemedStack() {
  const { colors, scheme } = useTheme()
  const onboarded = useOnboarded()
  const signedIn = useAuth().status === 'signedIn'

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontFamily: fonts.semibold, fontWeight: 'normal' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="conversation/[address]" />
          <Stack.Screen name="mail/[id]" />
          <Stack.Screen name="folder/[view]" />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="help" options={{ headerShown: true, title: 'Help & Support' }} />
          <Stack.Screen name="identity" options={{ headerShown: true, title: 'My PhoneMail ID' }} />
          <Stack.Screen name="u/[phone]" options={{ headerShown: true, title: 'PhoneMail ID' }} />
          <Stack.Screen name="scan" options={{ headerShown: true, title: 'Scan PhoneMail ID' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && onboarded === false}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="verify" />
        </Stack.Protected>
        <Stack.Screen name="terms" options={{ headerShown: true, title: 'Terms & Conditions' }} />
      </Stack>
    </>
  )
}

function Gate() {
  const [fontsLoaded, fontError] = useFonts(fontAssets)
  const onboarded = useOnboarded()
  const { status } = useAuth()
  const ready = (fontsLoaded || !!fontError) && onboarded !== null && status !== 'loading'

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null
  return <ThemedStack />
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MailProvider>
          <DrawerProvider>
            <Gate />
          </DrawerProvider>
        </MailProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
