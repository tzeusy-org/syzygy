import { createHash } from 'node:crypto';

/** Lowercase hex SHA-256 of the bytes, or of the UTF-8 bytes of the text. */
export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
