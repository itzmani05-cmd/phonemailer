import { createMailApi } from '@shared/mail'
import { getToken } from '../auth/session'

const baseUrl = import.meta.env.VITE_API_URL ?? '/api'

export const mailApi = createMailApi(baseUrl, { client: 'web', getToken })

export const publicApi = createMailApi(baseUrl, { client: 'web' })
