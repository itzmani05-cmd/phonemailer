import { FILE_BADGE, fileColor, fileKind, formatBytes, type MailAttachment } from '@shared/mail'
import { Icon } from './Icon'

export function FileBadge({ filename, contentType }: { filename: string | null; contentType: string }) {
  const kind = fileKind(filename, contentType)
  return (
    <span className="file-badge" style={{ background: fileColor(kind) }} aria-hidden>
      {FILE_BADGE[kind]}
    </span>
  )
}

interface Props {
  attachment: MailAttachment
  href?: string
  onRemove?: () => void
}

export function AttachmentCard({ attachment, href, onRemove }: Props) {
  const name = attachment.filename ?? 'Untitled'
  return (
    <div className="attachment-card">
      <FileBadge filename={attachment.filename} contentType={attachment.contentType} />
      <div className="attachment-info">
        <span className="attachment-name" title={name}>
          {name}
        </span>
        <span className="attachment-size">{formatBytes(attachment.size)}</span>
      </div>
      <div className="attachment-actions">
        {href && (
          <a className="icon-button" href={href} download={name} title={`Download ${name}`}>
            <Icon name="download" size={20} />
          </a>
        )}
        {onRemove && (
          <button className="icon-button" onClick={onRemove} aria-label={`Remove ${name}`}>
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
