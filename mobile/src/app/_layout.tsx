import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { DrawerProvider } from '@/components/Drawer'
import { AuthProvider, useAuth } from '@/data/auth'
import { MailProvider } from '@/data/MailProvider'
import { useOnboarded } from '@/data/onboarding'
import { LanguageProvider, useLanguage } from '@/i18n/LanguageProvider'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'
import { fontAssets, fonts } from '@/theme/fonts'

void SplashScreen.preventAutoHideAsync()

function ThemedStack() {
  const { colors, scheme } = useTheme()
  const onboarded = useOnboarded()
  const signedIn = useAuth().status === 'signedIn'
  const { language, t } = useLanguage()

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
          <Stack.Screen name="settings" options={{ headerShown: true, title: t('menu.settings') }} />
          <Stack.Screen name="help" options={{ headerShown: true, title: t('menu.help') }} />
          <Stack.Screen name="identity" options={{ headerShown: true, title: t('screens.myId') }} />
          <Stack.Screen name="u/[phone]" options={{ headerShown: true, title: t('screens.id') }} />
          <Stack.Screen name="scan" options={{ headerShown: true, title: t('screens.scan') }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && !language}>
          <Stack.Screen name="language" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn && !!language && onboarded === false}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="verify" />
        </Stack.Protected>
        <Stack.Screen name="terms" options={{ headerShown: true, title: t('terms.title') }} />
      </Stack>
    </>
  )
}

function Gate() {
  const [fontsLoaded, fontError] = useFonts(fontAssets)
  const onboarded = useOnboarded()
  const { status } = useAuth()
  const { language } = useLanguage()
  const ready =
    (fontsLoaded || !!fontError) && onboarded !== null && status !== 'loading' && language !== undefined

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null
  return <ThemedStack />
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MailProvider>
            <DrawerProvider>
              <Gate />
            </DrawerProvider>
          </MailProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
