-- Per-user mailboxes: every Message row is one copy of an email in one
-- user's mailbox. Existing rows were sent mail, so they become the sender's
-- `out` copies in Sent (renames keep their data).

-- CreateEnum
CREATE TYPE "MailDirection" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "MailFolder" AS ENUM ('inbox', 'sent', 'drafts', 'archive', 'spam', 'trash');

-- CreateEnum
CREATE TYPE "MailCategory" AS ENUM ('primary', 'social', 'promotions');

-- Sender -> owner
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";
DROP INDEX "Message_senderId_createdAt_idx";
ALTER TABLE "Message" RENAME COLUMN "senderId" TO "ownerId";
ALTER TABLE "Message" RENAME COLUMN "smtpMessageId" TO "messageId";

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "content" BYTEA,
ADD COLUMN     "index" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "filename" DROP NOT NULL;

UPDATE "Attachment" a SET "index" = n.i
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "messageId" ORDER BY "id") - 1 AS i FROM "Attachment") n
WHERE a."id" = n."id";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "category" "MailCategory" NOT NULL DEFAULT 'primary',
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "direction" "MailDirection" NOT NULL DEFAULT 'out',
ADD COLUMN     "envelopeFrom" TEXT,
ADD COLUMN     "folder" "MailFolder" NOT NULL DEFAULT 'inbox',
ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

UPDATE "Message" m SET
  "folder" = 'sent',
  "read" = true,
  "date" = COALESCE(m."sentAt", m."createdAt"),
  "size" = octet_length(COALESCE(m."text", '')) + octet_length(COALESCE(m."html", ''))
    + COALESCE((SELECT SUM(a."size") FROM "Attachment" a WHERE a."messageId" = m."id"), 0);

ALTER TABLE "Message" ALTER COLUMN "direction" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Label_ownerId_name_key" ON "Label"("ownerId", "name");

-- CreateIndex
CREATE INDEX "Message_ownerId_createdAt_idx" ON "Message"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_ownerId_messageId_idx" ON "Message"("ownerId", "messageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
