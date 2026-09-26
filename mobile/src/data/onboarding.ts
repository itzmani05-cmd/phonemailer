import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

const KEY = 'phonemail:onboarded'

let cached: boolean | null = null
const listeners = new Set<(v: boolean) => void>()

export async function completeOnboarding() {
  cached = true
  listeners.forEach((l) => l(true))
  await AsyncStorage.setItem(KEY, '1').catch(() => {})
}

/** null while loading from storage. */
export function useOnboarded(): boolean | null {
  const [done, setDone] = useState<boolean | null>(cached)
  useEffect(() => {
    listeners.add(setDone)
    if (cached === null) {
      AsyncStorage.getItem(KEY)
        .then((v) => {
          cached = v === '1'
          setDone(cached)
        })
        .catch(() => setDone(false))
    }
    return () => {
      listeners.delete(setDone)
    }
  }, [])
  return done
}
