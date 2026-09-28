import { fileColors } from '@shared/theme'
import { Alert } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { pickDocuments, pickMedia, scanDocument, type PickedFile } from '@/data/attachments'
import { BottomSheet } from './BottomSheet'

function DriveGlyph() {
  return (
    <Svg width={26} height={24} viewBox="0 0 26 24">
      <Path d="M8.6 1h8.8l8 14h-8.8z" fill={fileColors.slides} />
      <Path d="M8.6 1 0.6 15l4.4 7.6 8-14z" fill={fileColors.sheet} />
      <Path d="M5 22.6h16l4.4-7.6h-16z" fill={fileColors.doc} />
    </Svg>
  )
}

interface Props {
  visible: boolean
  onClose: () => void
  onPicked: (files: PickedFile[]) => void
}

export function AttachmentPicker({ visible, onClose, onPicked }: Props) {
  const run = (pick: () => Promise<PickedFile[]>) => () => {
    pick()
      .then((files) => files.length && onPicked(files))
      .catch((err: Error) => Alert.alert('Couldn’t attach', err.message))
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add attachment"
      options={[
        { label: 'Photos & Videos', icon: 'image', onPress: run(pickMedia) },
        { label: 'Files', icon: 'file', onPress: run(pickDocuments) },
        { label: 'Scan Document', icon: 'scan', onPress: run(scanDocument) },
        { label: 'Google Drive', leading: <DriveGlyph />, onPress: run(pickDocuments) },
      ]}
    />
  )
}
