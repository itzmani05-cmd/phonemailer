import { useSyncExternalStore } from 'react'

const KEY = 'phonemail:token'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

let token = read()

export const getToken = () => token

export function setToken(next: string | null) {
  token = next
  try {
    if (next) localStorage.setItem(KEY, next)
    else localStorage.removeItem(KEY)
  } catch {
  }
  listeners.forEach((l) => l())
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  token = e.newValue
  listeners.forEach((l) => l())
})

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useToken = () => useSyncExternalStore(subscribe, getToken)

export const signOut = () => setToken(null)
