import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { DrawerProvider } from '@/components/Drawer'
import { MailProvider } from '@/data/MailProvider'
import { useOnboarded } from '@/data/onboarding'
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider'
import { fontAssets, fonts } from '@/theme/fonts'

// Keep the splash screen up until Inter and the onboarding flag are ready.
void SplashScreen.preventAutoHideAsync()

function ThemedStack() {
  const { colors, scheme } = useTheme()
  const onboarded = useOnboarded()

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
        <Stack.Protected guard={onboarded === true}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="conversation/[address]" />
          <Stack.Screen name="mail/[id]" />
          <Stack.Screen name="folder/[view]" />
          <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="help" options={{ headerShown: true, title: 'Help & Support' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded === false}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

function Gate() {
  const [fontsLoaded, fontError] = useFonts(fontAssets)
  const onboarded = useOnboarded()
  const ready = (fontsLoaded || !!fontError) && onboarded !== null

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  // On a font error, render anyway with the system font rather than hang on the splash.
  if (!ready) return null
  return <ThemedStack />
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MailProvider>
        <DrawerProvider>
          <Gate />
        </DrawerProvider>
      </MailProvider>
    </ThemeProvider>
  )
}
