import { types } from 'node:util';
import { SOURCE_ID_MAX_LENGTH, SOURCE_ID_MIN_LENGTH, SOURCE_ID_PATTERN } from './source-model.js';

// The one closed-schema builder and checker (syzygy-bpyt.8.5), shared by the dossier draft model (draft-model.ts), the
// provider stage schemas (provider-draft.ts), the rendered-design review (rendered-design.ts) and the local-agent draft,
// inventory and verdict schemas (polaris-dossier's draft-schema.ts). A schema here uses JSON Schema's own keywords, so
// a document is the schema itself; it admits plain strings only: markup-looking text stays inert, and renderers must
// escape it. Every value it checks is untrusted: only own, enumerable data properties of plain objects and arrays count,
// and a proxy, accessor or symbol key is refused.
export type Schema =
  | { readonly type: 'object'; readonly properties: Readonly<Record<string, Schema>>; readonly required: readonly string[]; readonly additionalProperties: false }
  | { readonly type: 'array'; readonly items: Schema; readonly minItems: number; readonly maxItems: number; readonly uniqueItems?: boolean; readonly description?: string }
  | { readonly type: 'string'; readonly minLength: number; readonly maxLength: number; readonly pattern?: string; readonly enum?: readonly string[] }
  | { readonly type: 'boolean' }
  | { readonly type: 'number'; readonly minimum: number; readonly maximum: number }
  | { readonly type: 'integer'; readonly minimum: number; readonly maximum: number }
  | { readonly oneOf: readonly Schema[] }
  | { readonly $ref: `#/$defs/${string}` };

/** A schema and the named definitions its `$ref`s point at. */
export interface SchemaWithDefs { readonly root: Schema; readonly defs: Readonly<Record<string, Schema>> }

// The string parts declare their arm: importers spread an `enum` into them, and an imported const keeps its declared type.
// Both are shared by reference across every schema built here, so they are frozen: an importer cannot move them all at once.
export const text: Extract<Schema, { type: 'string' }> = Object.freeze({ type: 'string', minLength: 1, maxLength: 8000 });
export const handle: Extract<Schema, { type: 'string' }> = Object.freeze({ type: 'string', minLength: SOURCE_ID_MIN_LENGTH, maxLength: SOURCE_ID_MAX_LENGTH, pattern: SOURCE_ID_PATTERN });
export const list = (items: Schema, minItems = 0, maxItems = 200): Extract<Schema, { type: 'array' }> => ({ type: 'array', items, minItems, maxItems });
/** A distinct list of handles. */
export const refs = (minItems = 1, maxItems = 200): Extract<Schema, { type: 'array' }> => ({ ...list(handle, minItems, maxItems), uniqueItems: true });
/** A closed object: every property is required except those named `optional`. */
export const object = (properties: Record<string, Schema>, optional: readonly string[] = []): Schema =>
  ({ type: 'object', properties, required: Object.keys(properties).filter((key) => !optional.includes(key)), additionalProperties: false });
/** Exactly `value`, bounded by its own length. */
export const one = (value: string): Schema => ({ type: 'string', minLength: 1, maxLength: value.length, enum: [value] });
/** One of `values`, bounded by the longest. */
export const choice = (values: readonly string[]): Schema => ({ type: 'string', minLength: 1, maxLength: Math.max(...values.map((v) => v.length)), enum: values });
export const ref = (name: string): Schema => ({ $ref: `#/$defs/${name}` });

/** A breach `checkShape` reports: the JSON path to repair and what is wrong there. */
export interface SchemaError { readonly path: string; readonly detail: string }

/** The code `check` throws for the first breach it meets. */
type FailureCode = 'invalid-disposition' | 'invalid-string' | 'invalid-boolean' | 'invalid-number' | 'invalid-integer' | 'invalid-structure'
  | 'invalid-property' | 'invalid-array' | 'duplicate-reference' | 'invalid-object' | 'invalid-fields';
interface Failure extends SchemaError { readonly code: FailureCode }

/** One walk. `firstFailure` is the throwing form `check` (limit 1); otherwise the walk collects up to `limit` breaches. */
interface Walk { readonly defs: SchemaWithDefs['defs']; readonly firstFailure: boolean; readonly limit: number; readonly failures: Failure[] }

const MAX_ERRORS = 50;

/** Throws the code of the first breach (`invalid-string`, `invalid-fields`, ...); a value that matches returns. */
export function check(schema: Schema, value: unknown): void {
  const walk: Walk = { defs: {}, firstFailure: true, limit: 1, failures: [] };
  visit(walk, schema, value, '$');
  if (walk.failures.length > 0) throw new Error(walk.failures[0]!.code);
}

/** Every breach, up to fifty, each naming the JSON path to repair. */
export function checkShape(schema: SchemaWithDefs, value: unknown): readonly SchemaError[] {
  const walk: Walk = { defs: schema.defs, firstFailure: false, limit: MAX_ERRORS, failures: [] };
  visit(walk, schema.root, value, '$');
  return walk.failures.map(({ path, detail }) => ({ path, detail }));
}

function fail(walk: Walk, code: FailureCode, path: string, detail: string): void {
  if (walk.failures.length < walk.limit) walk.failures.push({ code, path, detail });
}

function resolve(defs: SchemaWithDefs['defs'], schema: Schema): Schema {
  if (!('$ref' in schema)) return schema;
  const name = schema.$ref.slice('#/$defs/'.length);
  if (!Object.hasOwn(defs, name)) throw new Error(`draft-schema: no definition ${name}`);
  return defs[name]!;
}

// The two forms report differently, and each keeps its own report (syzygy-bpyt.8.5 preserves both byte for byte; a change
// to either changes what a gate says and is the owner's, GP-Q0). `check` names one code for any oneOf miss, reports a
// missing field before any field's own breach, and walks an object's fields in the value's order; `checkShape` names the
// form a value claims, and walks the schema's fields in the schema's order.
function visit(walk: Walk, reference: Schema, value: unknown, at: string): void {
  if (walk.failures.length >= walk.limit) return;
  const schema = resolve(walk.defs, reference);
  if ('$ref' in schema) throw new Error('draft-schema: a definition is itself a reference');
  if ('oneOf' in schema) {
    if (walk.firstFailure) {
      // `check` takes the first arm that passes, and an arm that throws, not only one that records a breach, is a miss:
      // the pre-dedup checker ran each arm as `try { check(arm, value); return; } catch {}`. Without the catch, an array
      // with a plain object's prototype whose items pass throws a TypeError from the repeat test instead of being refused
      // as `invalid-disposition` (R-GP-IMPL-CLOSED-SCHEMA-1 F1).
      for (const arm of schema.oneOf) {
        const found: Walk = { ...walk, failures: [] };
        try { visit(found, arm, value, at); } catch { continue; }
        if (found.failures.length === 0) return;
      }
      fail(walk, 'invalid-disposition', at, 'matches none of the permitted forms');
      return;
    }
    // `checkShape` walks every arm, even after one passes, as the pre-dedup `checkDraftShape` did, so an arm that throws
    // throws whatever arm passed before it (unreachable from parsed JSON; kept unchanged).
    const attempts = schema.oneOf.map((arm) => {
      const found: Walk = { ...walk, failures: [] };
      visit(found, arm, value, at);
      return { arm: resolve(walk.defs, arm), found: found.failures };
    });
    if (attempts.some((attempt) => attempt.found.length === 0)) return;
    // Report against the form the value names by its single-valued fields (label, basis, kind), or say it names none.
    const named = attempts.filter((attempt) => discriminatorsMatch(attempt.arm, value));
    if (named.length === 1) { for (const failure of named[0]!.found) fail(walk, failure.code, failure.path, failure.detail); return; }
    // A value naming no form, beside exactly one form that has no discriminator (the plain block among the v1.3 rich elements,
    // syzygy-mea.10.5), is that form when it carries none of the other forms' discriminating keys: report against it.
    const unnamed = attempts.filter((attempt) => singleValued(attempt.arm).length === 0);
    const keys = new Set(attempts.flatMap((attempt) => singleValued(attempt.arm).map(([key]) => key)));
    if (named.length === 0 && unnamed.length === 1 && keys.size > 0 && carriesNone(value, keys)) {
      for (const failure of unnamed[0]!.found) fail(walk, failure.code, failure.path, failure.detail);
      return;
    }
    fail(walk, 'invalid-disposition', at, `matches none of the permitted forms (${schema.oneOf.map((arm) => describeForm(resolve(walk.defs, arm))).join('; ')})`);
    return;
  }
  if (schema.type === 'string') {
    if (typeof value !== 'string') { fail(walk, 'invalid-string', at, 'must be a string'); return; }
    const length = [...value].length;
    if (length < schema.minLength || length > schema.maxLength) fail(walk, 'invalid-string', at, `must be ${schema.minLength} to ${schema.maxLength} characters; is ${length}`);
    else if (schema.enum && !schema.enum.includes(value)) fail(walk, 'invalid-string', at, `must be one of ${schema.enum.join(', ')}`);
    else if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) fail(walk, 'invalid-string', at, `must match ${schema.pattern}`);
    return;
  }
  if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') fail(walk, 'invalid-boolean', at, 'must be a boolean');
    return;
  }
  if (schema.type === 'number') {
    // Written as an inclusion so NaN, which fails every comparison, is refused with the infinities.
    if (typeof value !== 'number' || !(value >= schema.minimum && value <= schema.maximum)) fail(walk, 'invalid-number', at, `must be a number from ${schema.minimum} to ${schema.maximum}`);
    return;
  }
  if (schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < schema.minimum || value > schema.maximum) {
      fail(walk, 'invalid-integer', at, `must be an integer from ${schema.minimum} to ${schema.maximum}`);
    }
    return;
  }
  if (typeof value !== 'object' || value === null || types.isProxy(value)) { fail(walk, 'invalid-structure', at, `must be ${schema.type === 'array' ? 'an array' : 'an object'}`); return; }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !('value' in descriptors[key]!))) { fail(walk, 'invalid-property', at, 'carries a symbol key or an accessor'); return; }
  if (schema.type === 'array') {
    if (!Array.isArray(value) || Object.keys(descriptors).length !== value.length + 1) { fail(walk, 'invalid-array', at, 'must be an array'); return; }
    if (value.length < schema.minItems || value.length > schema.maxItems) fail(walk, 'invalid-array', at, `must hold ${schema.minItems} to ${schema.maxItems} items; holds ${value.length}`);
    for (let i = 0; i < value.length && walk.failures.length < walk.limit; i++) {
      const item = descriptors[String(i)];
      // A hole whose place a named key takes passes the key count. `check` refuses it; `checkShape` has always thrown a
      // TypeError on it (unreachable from parsed JSON), kept here unchanged and recorded as a follow-up.
      if (item === undefined && walk.firstFailure) { fail(walk, 'invalid-array', at, 'must be an array'); return; }
      visit(walk, schema.items, item!.value, `${at}[${i}]`);
    }
    // `check` stops at its first breach, before the repeat test; `checkShape` always makes it (on an array with a plain
    // object's prototype, `new Set` throws a TypeError, unreachable from parsed JSON and kept unchanged).
    if (walk.firstFailure && walk.failures.length > 0) return;
    if (schema.uniqueItems && new Set(value).size !== value.length) fail(walk, 'duplicate-reference', at, 'must not repeat an item');
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  const plain = prototype === Object.prototype || prototype === null;
  // An array whose prototype is a plain object's fails `check`'s field test (its `length` is no field), not its prototype test.
  if (Array.isArray(value) || !plain) { fail(walk, plain ? 'invalid-fields' : 'invalid-object', at, 'must be an object'); return; }
  const keys = Object.keys(descriptors);
  for (const key of keys) {
    if (!Object.hasOwn(schema.properties, key)) fail(walk, 'invalid-fields', `${at}.${key}`, 'is not a field of this form');
    else if (!descriptors[key]!.enumerable) fail(walk, 'invalid-fields', `${at}.${key}`, 'is not enumerable');
  }
  if (walk.firstFailure) {
    const missing = schema.required.find((key) => !Object.hasOwn(descriptors, key));
    if (missing !== undefined) fail(walk, 'invalid-fields', `${at}.${missing}`, 'is required');
    for (const key of keys) visit(walk, schema.properties[key]!, descriptors[key]!.value, `${at}.${key}`);
    return;
  }
  for (const key of Object.keys(schema.properties)) {
    if (Object.hasOwn(descriptors, key)) visit(walk, schema.properties[key]!, descriptors[key]!.value, `${at}.${key}`);
    else if (schema.required.includes(key)) fail(walk, 'invalid-fields', `${at}.${key}`, 'is required');
  }
}

function singleValued(arm: Schema): [string, string][] {
  if (!('type' in arm) || arm.type !== 'object') return [];
  return Object.entries(arm.properties).flatMap(([key, field]) =>
    'type' in field && field.type === 'string' && field.enum?.length === 1 ? [[key, field.enum[0]!] as [string, string]] : []);
}

function carriesNone(value: unknown, keys: ReadonlySet<string>): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || types.isProxy(value)) return false;
  return [...keys].every((key) => Object.getOwnPropertyDescriptor(value, key) === undefined);
}

function discriminatorsMatch(arm: Schema, value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || types.isProxy(value)) return false;
  const fixed = singleValued(arm);
  return fixed.length > 0 && fixed.every(([key, expected]) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && 'value' in descriptor && descriptor.value === expected;
  });
}

function describeForm(arm: Schema): string {
  const fixed = singleValued(arm);
  return fixed.length > 0 ? fixed.map(([key, expected]) => `${key} ${expected}`).join(', ') : 'unnamed';
}
