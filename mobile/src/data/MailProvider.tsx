import {
  ApiError,
  type Account,
  type Label,
  type Mail,
  type MailChanges,
  type SendEmailRequest,
} from '@shared/mail'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import { api } from './api'
import { useAuth } from './auth'
import { API_URL } from './config'

const POLL_MS = 5000

interface MailContextValue {
  mails: Mail[]
  labels: Label[]
  account: Account | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  update: (id: string, changes: MailChanges) => Promise<void>
  updateMany: (ids: string[], changes: MailChanges) => Promise<void>
  /** Permanent delete (from Trash). */
  removeMany: (ids: string[]) => Promise<void>
  send: (email: SendEmailRequest) => Promise<void>
}

const MailContext = createContext<MailContextValue | null>(null)

export function MailProvider({ children }: { children: ReactNode }) {
  const { status, token, signOut } = useAuth()
  const signedIn = status === 'signedIn'
  // Tagged with the session token that loaded them, so signing in as someone
  // else never shows the previous user's mailbox, even for a moment.
  const [inbox, setInbox] = useState<{ owner: string | null; mails: Mail[] }>({
    owner: null,
    mails: [],
  })
  const [profile, setProfile] = useState<{ owner: string | null; account: Account | null }>({
    owner: null,
    account: null,
  })
  const [labels, setLabels] = useState<Label[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const mails = await api.list()
      setInbox({ owner: token, mails })
      setError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void signOut()
        return
      }
      setError(`Can’t reach the server at ${API_URL}. Retrying…`)
    }
  }, [token, signOut])

  const mails = useMemo(
    () => (signedIn && inbox.owner === token ? inbox.mails : []),
    [signedIn, inbox, token],
  )
  const account = signedIn && profile.owner === token ? profile.account : null
  const loading = signedIn && inbox.owner !== token && !error
  const setMails = useCallback(
    (update: (prev: Mail[]) => Mail[]) =>
      setInbox((prev) => ({ ...prev, mails: update(prev.mails) })),
    [],
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  /**
   * Confirms the session with the server and loads its mailbox profile.
   * An expired token or deleted account (401) signs the app out.
   */
  const checkSession = useCallback(async () => {
    try {
      const { account: a } = await api.me()
      setProfile({ owner: token, account: a })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) void signOut()
    }
  }, [token, signOut])

  useEffect(() => {
    if (!signedIn) return
    api.labels().then(setLabels).catch(() => {})
  }, [signedIn, token])

  // Poll only while signed in and the app is in the foreground.
  useEffect(() => {
    if (!signedIn) return
    let timer: ReturnType<typeof setInterval> | undefined
    // On launch and each return to the foreground: re-check the session, then poll.
    const start = () => {
      void checkSession()
      void load()
      timer ??= setInterval(() => void load(), POLL_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = undefined
    }
    start()
    const sub = AppState.addEventListener('change', (state) =>
      state === 'active' ? start() : stop(),
    )
    return () => {
      stop()
      sub.remove()
    }
  }, [load, checkSession, signedIn])

  const updateMany = useCallback(
    async (ids: string[], changes: MailChanges) => {
      const set = new Set(ids)
      setMails((prev) => prev.map((m) => (set.has(m.id) ? { ...m, ...changes } : m)))
      try {
        await Promise.all(ids.map((id) => api.update(id, changes)))
      } catch {
        void load()
      }
    },
    [load, setMails],
  )

  const update = useCallback(
    (id: string, changes: MailChanges) => updateMany([id], changes),
    [updateMany],
  )

  const removeMany = useCallback(
    async (ids: string[]) => {
      const set = new Set(ids)
      setMails((prev) => prev.filter((m) => !set.has(m.id)))
      try {
        await Promise.all(ids.map((id) => api.remove(id)))
      } catch {
        void load()
      }
    },
    [load, setMails],
  )

  const send = useCallback(
    async (email: SendEmailRequest) => {
      await api.send(email)
      void load()
    },
    [load],
  )

  const value = useMemo(
    () => ({
      mails,
      labels,
      account,
      loading,
      refreshing,
      error,
      refresh,
      update,
      updateMany,
      removeMany,
      send,
    }),
    [mails, labels, account, loading, refreshing, error, refresh, update, updateMany, removeMany, send],
  )

  return <MailContext.Provider value={value}>{children}</MailContext.Provider>
}

export function useMail() {
  const ctx = useContext(MailContext)
  if (!ctx) throw new Error('useMail must be used inside <MailProvider>')
  return ctx
}
