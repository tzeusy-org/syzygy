import { createHash } from 'node:crypto';

/** The identifier git gives a blob with these bytes (SHA-1 over `blob <length>\0` and the bytes). */
export function gitBlobId(bytes: Uint8Array | string): string {
  const body = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes;
  return createHash('sha1').update(`blob ${body.byteLength}\0`).update(body).digest('hex');
}
