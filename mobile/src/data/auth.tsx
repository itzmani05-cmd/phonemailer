import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AuthUser, OtpVerifyResult } from '@shared/mail'
import * as SecureStore from 'expo-secure-store'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Platform } from 'react-native'
import { setApiToken } from './api'

const TOKEN_KEY = 'phonemail.token'
const USER_KEY = 'phonemail.user'

// The token lives in the Keychain / Keystore; SecureStore has no web implementation.
const storage =
  Platform.OS === 'web'
    ? {
        get: (k: string) => AsyncStorage.getItem(k),
        set: (k: string, v: string) => AsyncStorage.setItem(k, v),
        remove: (k: string) => AsyncStorage.removeItem(k),
      }
    : {
        get: (k: string) => SecureStore.getItemAsync(k),
        set: (k: string, v: string) => SecureStore.setItemAsync(k, v),
        remove: (k: string) => SecureStore.deleteItemAsync(k),
      }

interface AuthContextValue {
  /** 'loading' until the stored session has been read */
  status: 'loading' | 'signedOut' | 'signedIn'
  token: string | null
  user: AuthUser | null
  signIn: (result: OtpVerifyResult) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)])
      .then(([t, u]) => {
        if (t && u) {
          setApiToken(t)
          setToken(t)
          setUser(JSON.parse(u) as AuthUser)
          setStatus('signedIn')
        } else {
          setStatus('signedOut')
        }
      })
      .catch(() => setStatus('signedOut'))
  }, [])

  const signIn = useCallback(async (result: OtpVerifyResult) => {
    setApiToken(result.accessToken)
    setToken(result.accessToken)
    setUser(result.user)
    setStatus('signedIn')
    await Promise.all([
      storage.set(TOKEN_KEY, result.accessToken),
      storage.set(USER_KEY, JSON.stringify(result.user)),
    ]).catch(() => {})
  }, [])

  const signOut = useCallback(async () => {
    setApiToken(null)
    setToken(null)
    setUser(null)
    setStatus('signedOut')
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({ status, token, user, signIn, signOut }),
    [status, token, user, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
