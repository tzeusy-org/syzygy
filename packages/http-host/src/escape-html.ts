// Every interpolated value passes through here: observed-file content is
// untrusted. Escapes the five characters that can change HTML context,
// so escaped output is safe in both text and double-quoted attributes.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
