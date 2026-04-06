// Extracts the RFC 2822 Message-ID header from a raw email buffer.
// MailComposer always generates this header; if missing, falls back to empty string.
export const extractMessageIdFromBuffer = (messageBuffer: Buffer): string => {
  const headerSection = messageBuffer.toString('utf-8').split('\r\n\r\n')[0];

  const match = headerSection.match(/^Message-ID:\s*(.+)$/im);

  return match?.[1]?.trim() ?? '';
};
