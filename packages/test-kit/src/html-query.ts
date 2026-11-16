/** Opening tags named `tag` in `html`, each as its raw text. A regular-expression scan for fixtures the tests wrote or the
 * daemon rendered, not an HTML parser: it does not read `>` inside an attribute value. */
export function tagsOf(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}(?=[\\s/>])[^>]*>`, 'gu'))].map((match) => match[0]);
}

/** The values of attribute `name` over every opening tag in `html` (double- or single-quoted). */
export function attributeValues(html: string, name: string): string[] {
  const values: string[] = [];
  for (const match of html.matchAll(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, 'gu'))) values.push(match[1] ?? match[2] ?? '');
  return values;
}
