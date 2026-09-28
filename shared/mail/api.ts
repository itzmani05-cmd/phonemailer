import type {
  Account,
  AuthUser,
  Label,
  Mail,
  MailChanges,
  SendEmailRequest,
  SendEmailResult,
  OtpRequestResult,
  OtpVerifyResult,
} from './types'

export class ApiError extends Error {
  readonly status: number
  /** Seconds to wait, on 429 responses that include it */
  readonly retryAfter?: number

  constructor(status: number, message: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.retryAfter = retryAfter
  }
}

export interface MailApiOptions {
  /** Signed-in user's token, sent as `Authorization: Bearer …` when present. */
  getToken?: () => string | null
}

/** Backend client; web passes '/api' (Vite/nginx proxy), mobile passes the server URL. */
export function createMailApi(baseUrl: string, options: MailApiOptions = {}) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = options.getToken?.()
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      let retryAfter: number | undefined
      try {
        const body = (await res.json()) as { message?: string | string[]; retryAfter?: number }
        if (body.message) message = Array.isArray(body.message) ? body.message[0] : body.message
        retryAfter = body.retryAfter
      } catch {
        // non-JSON error body
      }
      throw new ApiError(res.status, message, retryAfter)
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

    /** Texts a 6-digit code. `phone` may be national (9876543210) or +91…. */
    requestOtp: (phone: string, countryCode = '+91') =>
      request<OtpRequestResult>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone, countryCode }),
      }),
    /** Signs in, creating the account on first use. */
    verifyOtp: (phone: string, code: string, countryCode = '+91') =>
      request<OtpVerifyResult>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code, countryCode }),
      }),
    me: () => request<{ user: AuthUser; account: Account }>('/auth/me'),
  }
}

export type MailApi = ReturnType<typeof createMailApi>
