import {
  createMailApi,
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
import { API_URL } from './config'

const POLL_MS = 5000
export const api = createMailApi(API_URL)

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
  const [mails, setMails] = useState<Mail[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setMails(await api.list())
      setError(null)
    } catch {
      setError(`Can’t reach the server at ${API_URL}. Retrying…`)
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => {
    api.labels().then(setLabels).catch(() => {})
    api.account().then(setAccount).catch(() => {})
  }, [])

  // Poll only while the app is in the foreground.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const start = () => {
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
  }, [load])

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
    [load],
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
    [load],
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
