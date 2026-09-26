import type { Account, Label, Mail, MailChanges, SendEmailRequest } from '@shared/mail'
import { useCallback, useEffect, useState } from 'react'
import { mailApi } from '../api/mail'

const POLL_MS = 5000

export function useMailbox() {
  const [mails, setMails] = useState<Mail[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setMails(await mailApi.list())
      setError(null)
    } catch {
      setError('Can’t reach the server. Retrying…')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    mailApi.labels().then(setLabels).catch(() => {})
    mailApi.account().then(setAccount).catch(() => {})
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const updateMany = useCallback(
    async (ids: string[], changes: MailChanges) => {
      const set = new Set(ids)
      setMails((prev) => prev.map((m) => (set.has(m.id) ? { ...m, ...changes } : m)))
      try {
        await Promise.all(ids.map((id) => mailApi.update(id, changes)))
      } catch {
        void refresh()
      }
    },
    [refresh],
  )

  const update = useCallback(
    (id: string, changes: MailChanges) => updateMany([id], changes),
    [updateMany],
  )

  /** Permanent delete (used from Trash). */
  const removeMany = useCallback(
    async (ids: string[]) => {
      const set = new Set(ids)
      setMails((prev) => prev.filter((m) => !set.has(m.id)))
      try {
        await Promise.all(ids.map((id) => mailApi.remove(id)))
      } catch {
        void refresh()
      }
    },
    [refresh],
  )

  const send = useCallback(
    async (email: SendEmailRequest) => {
      const result = await mailApi.send(email)
      void refresh()
      return result
    },
    [refresh],
  )

  const createLabel = useCallback(async (label: Label) => {
    const created = await mailApi.createLabel(label)
    setLabels((prev) => [...prev, created])
    return created
  }, [])

  return {
    mails,
    labels,
    account,
    loading,
    error,
    refresh,
    update,
    updateMany,
    removeMany,
    send,
    createLabel,
  }
}

export type Mailbox = ReturnType<typeof useMailbox>
