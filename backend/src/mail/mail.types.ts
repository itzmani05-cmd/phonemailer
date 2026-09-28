export const MAIL_FOLDERS = [
  'inbox',
  'sent',
  'drafts',
  'archive',
  'spam',
  'trash',
] as const;
export type MailFolder = (typeof MAIL_FOLDERS)[number];

export type MailCategory = 'primary' | 'social' | 'promotions';

export interface AttachmentMeta {
  filename: string | null;
  contentType: string;
  size: number;
}

export interface InboundMail {
  envelope: { from: string | null; to: string[] };
  messageId: string | null;
  inReplyTo?: string | null;
  subject: string;
  from: string;
  to?: string[];
  cc?: string[];
  date: string;
  text: string;
  html: string | null;
  listUnsubscribe?: boolean;
  attachments: (AttachmentMeta & { content?: string })[];
}

export interface Mail {
  id: string;
  direction: 'in' | 'out';
  folder: MailFolder;
  category: MailCategory;
  labels: string[];
  read: boolean;
  starred: boolean;
  snoozedUntil: string | null;
  receivedAt: string;
  envelope: { from: string | null; to: string[] };
  messageId: string | null;
  inReplyTo: string | null;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  date: string;
  text: string;
  html: string | null;
  attachments: AttachmentMeta[];
  size: number;
}

export interface Label {
  name: string;
  color: string;
}
