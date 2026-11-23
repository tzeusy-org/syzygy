import { FieldWalk, member, type Recognized } from './manifest-model.js';
import { isComposeBasename } from './manifest-compose.js';
import { isWorkflowPath } from './manifest-workflow.js';
import { readYaml } from './manifest-yaml.js';

/** Rule `kubernetes-manifest` version 1 (REQ-polaris-generation-034, infrastructure recognizers, syzygy-3efd.26): every blob whose basename ends in
 * `.yaml` or `.yml` after at least one other character, at least one of whose directory segments (never its basename) is one of
 * `KUBERNETES_DIRECTORIES`, none of whose directory segments is `templates` (a Helm chart's templates are Go templates, not YAML), and that
 * is neither a workflow path nor a `compose-file` candidate. It is read as a YAML 1.2 stream of one or more documents under the core
 * schema (`manifest-yaml.ts` reads several documents for this recognizer alone; it refuses an anchor, an alias, an explicit tag and a merge
 * key as beyond it). A document whose root is null, is not a mapping, or is a mapping lacking `apiVersion` or `kind` is no Kubernetes
 * object and yields nothing; every other document, whose `apiVersion` and `kind` must be strings and whose `metadata`, where present, must
 * be a mapping with a string `name`, yields one `kubernetes-object` fact, its kind and its name (null where absent), spanning the document's
 * own content lines. No other member, `apiVersion` included, gives a fact a value. Pure. */

export const KUBERNETES_DIRECTORIES: readonly string[] = ['k8s', 'kubernetes', 'kube', 'manifests', 'deploy', 'deployment', 'deployments', 'kustomize'];

export function isKubernetesPath(path: string): boolean {
  const segments = path.split('/');
  const basename = segments[segments.length - 1]!;
  const directories = segments.slice(0, -1);
  if (!/^.+\.(?:yaml|yml)$/u.test(basename)) return false;
  if (!directories.some((segment) => KUBERNETES_DIRECTORIES.includes(segment)) || directories.includes('templates')) return false;
  return !isWorkflowPath(path) && !isComposeBasename(path);
}

/** The mappings the recognizer reads: each document's root and its `metadata`. */
const isRead = (p: readonly string[]): boolean => p.length === 0 || (p.length === 1 && p[0] === 'metadata');

export function recognizeKubernetes(text: string): Recognized {
  const parsed = readYaml(text, true);
  if (parsed.duplicates.some(isRead)) return { ok: false, parseFault: 'duplicate-key' };
  if (parsed.syntax || parsed.duplicates.length > 0) return { ok: false, parseFault: 'syntax' };
  const walk = new FieldWalk();
  for (const root of parsed.documents ?? []) {
    if (root === null || root.kind !== 'map') continue;
    const apiVersion = member(root, 'apiVersion'), kind = member(root, 'kind');
    if (apiVersion === undefined || kind === undefined) continue;
    const apiOk = walk.is(apiVersion.value, 'string');
    if (!walk.is(kind.value, 'string') || !apiOk) continue;
    let name: string | null = null;
    const metadata = member(root, 'metadata');
    if (metadata !== undefined) {
      if (!walk.is(metadata.value, 'map')) continue;
      const named = member(metadata.value, 'name');
      if (named !== undefined) { if (!walk.is(named.value, 'string')) continue; name = named.value.value; }
    }
    walk.add('kubernetes-object', root.lines, kind.value.value, name);
  }
  if (walk.fieldType) return { ok: false, parseFault: 'field-type' };
  if (parsed.beyond || walk.beyond) return { ok: false, parseFault: 'beyond-reader' };
  return { ok: true, facts: walk.facts };
}
