import type { Conversation } from '@shared/mail'

export const isFavorite = (c: Conversation) => c.messages.some((m) => m.starred)
