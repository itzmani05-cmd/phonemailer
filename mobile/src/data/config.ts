import Constants from 'expo-constants'

const BACKEND_PORT = 3000

/**
 * EXPO_PUBLIC_API_URL wins. Otherwise reuse the host the dev server is on
 * (e.g. 192.168.1.5:8081 -> http://192.168.1.5:3000), so a physical phone
 * on the same Wi-Fi reaches the backend without extra setup.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return `http://${host ?? 'localhost'}:${BACKEND_PORT}`
}

export const API_URL = resolveApiUrl()
