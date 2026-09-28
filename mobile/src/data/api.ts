import { createMailApi } from '@shared/mail'
import { API_URL } from './config'

let token: string | null = null

/** Called by AuthProvider; every request after this carries the token. */
export function setApiToken(value: string | null) {
  token = value
}

export const api = createMailApi(API_URL, { getToken: () => token })
