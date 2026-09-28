import { requireOptionalNativeModule } from 'expo'

interface PhoneHintNative {
  requestPhoneNumber(): Promise<string | null>
}

const native = requireOptionalNativeModule<PhoneHintNative>('PhoneHint')

export const phoneHintAvailable = native !== null

export async function requestPhoneNumber(): Promise<string | null> {
  if (!native) return null
  try {
    return await native.requestPhoneNumber()
  } catch {
    return null
  }
}
