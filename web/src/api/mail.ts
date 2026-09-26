import { createMailApi } from '@shared/mail'

export const mailApi = createMailApi(import.meta.env.VITE_API_URL ?? '/api')
