import type { OutgoingAttachment } from '@shared/mail'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { Linking, Platform } from 'react-native'
import { api } from './api'

export interface PickedFile extends OutgoingAttachment {
  size: number
}

export const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024

async function readBase64(uri: string): Promise<string> {
  return new File(uri).base64()
}

/** "Photos & Videos" */
export async function pickMedia(): Promise<PickedFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    base64: true,
    quality: 0.9,
  })
  if (result.canceled) return []
  return Promise.all(
    result.assets.map(async (a, i) => ({
      filename: a.fileName ?? `photo-${Date.now()}-${i + 1}.jpg`,
      contentType: a.mimeType ?? 'image/jpeg',
      size: a.fileSize ?? 0,
      content: a.base64 ?? (await readBase64(a.uri)),
    })),
  )
}

/** "Files" and "Google Drive" (the system picker lists Drive as a source). */
export async function pickDocuments(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true })
  if (result.canceled) return []
  return Promise.all(
    result.assets.map(async (a) => ({
      filename: a.name,
      contentType: a.mimeType ?? 'application/octet-stream',
      size: a.size ?? 0,
      content: a.base64 ?? (await readBase64(a.uri)),
    })),
  )
}

/** "Scan Document": photograph a page with the camera. */
export async function scanDocument(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) throw new Error('Camera permission is needed to scan documents.')
  const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.85 })
  if (result.canceled) return []
  const a = result.assets[0]
  return [
    {
      filename: `Scan_${new Date().toISOString().slice(0, 10)}.jpg`,
      contentType: a.mimeType ?? 'image/jpeg',
      size: a.fileSize ?? 0,
      content: a.base64 ?? (await readBase64(a.uri)),
    },
  ]
}

/** Opens the attachment URL; the OS browser handles the download/preview. */
export function openAttachment(mailId: string, index: number) {
  const url = api.attachmentUrl(mailId, index)
  if (Platform.OS === 'web') window.open(url, '_blank')
  else void Linking.openURL(url)
}
