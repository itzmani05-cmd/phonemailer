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

/** Payload POSTed by the mail-server for every received message. */
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
  /** 'in' = received, 'out' = sent from this mailbox */
  direction: 'in' | 'out';
  folder: MailFolder;
  category: MailCategory;
  labels: string[];
  read: boolean;
  starred: boolean;
  /** ISO time; hidden from the inbox (shown under Snoozed) until then */
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
  /** Approximate bytes used, for the storage meter */
  size: number;
}

export interface Label {
  name: string;
  color: string;
}
