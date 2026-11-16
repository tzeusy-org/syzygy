const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

/**
 * The bytes as text, or `undefined` when they are not well-formed UTF-8. A leading byte-order mark is
 * dropped, as the default decoder drops it; a decoder that must keep it (`ignoreBOM`) is its own call.
 */
export function decodeUtf8(bytes: Uint8Array): string | undefined {
  try {
    return STRICT_UTF8.decode(bytes);
  } catch {
    return undefined;
  }
}
