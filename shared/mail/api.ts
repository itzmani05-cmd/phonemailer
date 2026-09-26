import type {
  Account,
  Label,
  Mail,
  MailChanges,
  SendEmailRequest,
  SendEmailResult,
} from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Backend client; web passes '/api' (Vite/nginx proxy), mobile passes the server URL. */
export function createMailApi(baseUrl: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    })
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const body = (await res.json()) as { message?: string | string[] }
        if (body.message) message = Array.isArray(body.message) ? body.message[0] : body.message
      } catch {
        // non-JSON error body
      }
      throw new ApiError(res.status, message)
    }
    return (res.status === 204 ? undefined : await res.json()) as T
  }

  return {
    list: () => request<Mail[]>('/mail'),
    update: (id: string, changes: MailChanges) =>
      request<Mail>(`/mail/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    /** Permanent delete; move to Trash with update(id, { folder: 'trash' }) first. */
    remove: (id: string) => request<void>(`/mail/${id}`, { method: 'DELETE' }),
    attachmentUrl: (id: string, index: number) => `${baseUrl}/mail/${id}/attachments/${index}`,

    labels: () => request<Label[]>('/labels'),
    createLabel: (label: Label) =>
      request<Label>('/labels', { method: 'POST', body: JSON.stringify(label) }),

    account: () => request<Account>('/account'),

    send: (email: SendEmailRequest) =>
      request<SendEmailResult>('/email/send', { method: 'POST', body: JSON.stringify(email) }),
  }
}

export type MailApi = ReturnType<typeof createMailApi>
