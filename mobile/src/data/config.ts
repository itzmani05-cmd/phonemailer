import Constants from 'expo-constants'

const BACKEND_PORT = 3000

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return `http://${host ?? 'localhost'}:${BACKEND_PORT}`
}

export const API_URL = resolveApiUrl()

export const MAIL_DOMAIN = process.env.EXPO_PUBLIC_MAIL_DOMAIN ?? 'phonemail.com'
