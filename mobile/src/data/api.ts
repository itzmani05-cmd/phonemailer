import { createMailApi } from '@shared/mail'
import { API_URL } from './config'

let token: string | null = null

export function setApiToken(value: string | null) {
  token = value
}

export const api = createMailApi(API_URL, { getToken: () => token, client: 'mobile' })
