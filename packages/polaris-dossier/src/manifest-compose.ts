import { FieldWalk, member, resolveFaults, type MNode, type Recognized } from './manifest-model.js';
import { isWorkflowPath } from './manifest-workflow.js';
import { readYaml } from './manifest-yaml.js';

/** Rule `compose-file` version 1 (REQ-polaris-generation-034 version 2.12, syzygy-3efd.26): every blob whose basename is exactly one of
 * the Compose specification's default file names or their override names, and whose path is not a workflow path, read as YAML 1.2 under
 * the core schema, one document whose root is a mapping, by the reader `github-actions-workflow` uses (`manifest-yaml.ts`, which refuses
 * an anchor, an alias, an explicit tag, a merge key and a second document as beyond it, so a Compose file using `<<: *defaults` is
 * Unknown at this version). It reads `services` (a mapping of mappings: one `service` fact per key) and, in each service, `image` (a
 * string: one `service-image`), `ports` (a sequence: one `service-port` per element, a string as written, a plain integer by its text, a
 * mapping by its `target` and optional `published`, written `<published>:<target>`) and `depends_on` (a sequence of strings or a mapping:
 * one `service-depends-on` per string or key, whether or not it names a service of the file). A root that is not a mapping, null
 * included, is `field-type`. A value such as `nginx:${TAG}` is taken as written, never interpolated. It states declared topology only:
 * never that a service runs or is reachable. Pure. */

export const COMPOSE_BASENAMES: readonly string[] = [
  'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml',
  'compose.override.yaml', 'compose.override.yml', 'docker-compose.override.yaml', 'docker-compose.override.yml',
];

const basenameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);
export const isComposeBasename = (path: string): boolean => COMPOSE_BASENAMES.includes(basenameOf(path));
export const isComposePath = (path: string): boolean => isComposeBasename(path) && !isWorkflowPath(path);

/** The mappings the recognizer reads: the root, `services`, each service, each port mapping and each `depends_on` mapping. */
const isRead = (p: readonly string[]): boolean => p.length === 0 || (p.length === 1 && p[0] === 'services') || (p.length === 2 && p[0] === 'services')
  || (p.length === 4 && p[0] === 'services' && p[2] === 'ports' && p[3] === '#') || (p.length === 3 && p[0] === 'services' && p[2] === 'depends_on');

export function recognizeCompose(text: string): Recognized {
  return resolveFaults(readYaml(text), isRead, true, (root) => {
    const walk = new FieldWalk();
    if (!walk.is(root, 'map')) return walk;
    const services = member(root, 'services');
    if (services === undefined || !walk.is(services.value, 'map')) return walk;
    for (const entry of services.value.entries) {
      const service = walk.keyOf(entry.key);
      if (service === undefined) continue;
      walk.add('service', entry.lines, service);
      if (!walk.is(entry.value, 'map')) continue;
      const image = member(entry.value, 'image');
      if (image !== undefined && walk.is(image.value, 'string')) walk.add('service-image', image.lines, service, image.value.value);
      const ports = member(entry.value, 'ports');
      if (ports !== undefined && walk.is(ports.value, 'array')) {
        for (const item of ports.value.items) {
          if (item.kind === 'map') {
            const target = member(item, 'target');
            if (target === undefined) { walk.fieldType = true; continue; }
            const targetText = portText(walk, target.value);
            const published = member(item, 'published');
            const publishedText = published === undefined ? undefined : portText(walk, published.value);
            if (targetText === undefined || (published !== undefined && publishedText === undefined)) continue;
            walk.add('service-port', item.lines, service, publishedText === undefined ? targetText : `${publishedText}:${targetText}`);
          } else {
            const port = portText(walk, item);
            if (port !== undefined) walk.add('service-port', item.lines, service, port);
          }
        }
      }
      const dependsOn = member(entry.value, 'depends_on');
      if (dependsOn === undefined) continue;
      const value = dependsOn.value;
      if (value.kind === 'map') {
        for (const dependency of value.entries) { const to = walk.keyOf(dependency.key); if (to !== undefined) walk.add('service-depends-on', dependency.lines, service, to); }
      } else if (walk.is(value, 'array')) {
        for (const item of value.items) if (walk.is(item, 'string')) walk.add('service-depends-on', item.lines, service, item.value);
      }
    }
    return walk;
  });
}

/** A port element, `target` or `published`: a string as written, or a plain scalar the core schema resolves to an integer, by its text. */
function portText(walk: FieldWalk, node: MNode): string | undefined {
  if (node.kind === 'string') return node.value;
  if (node.kind === 'other' && node.int !== undefined) return node.int;
  walk.is(node, 'string');
  return undefined;
}
