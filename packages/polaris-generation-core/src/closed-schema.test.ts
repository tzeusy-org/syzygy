import { describe, expect, it } from 'vitest';
import { check, checkShape, handle, list, object, one, ref, refs, text, type SchemaWithDefs } from './closed-schema.js';
import { checkDraftShape, localDraftSchema } from '../../polaris-dossier/src/draft-schema.js';
import { disposition, validateDraftRecord } from './draft-model.js';

// The one closed-schema checker's hardening against untrusted values, in both of its forms (syzygy-bpyt.8.5): `check` throws
// the first breach's code, `checkShape` lists breaches by path. Expected codes and messages are literals.

const record = object({ id: handle, note: text, ids: refs() });
const shape = { root: record, defs: {} };
const good = (): Record<string, unknown> => ({ id: 'a1', note: 'Note.', ids: ['s1'] });
const code = (value: unknown): string => { try { check(record, value); return 'ok'; } catch (error) { return (error as Error).message; } };

describe('closed-schema checker', () => {
  it('admits a plain record', () => {
    expect(code(good())).toBe('ok');
    expect(checkShape(shape, good())).toEqual([]);
  });

  it('refuses a symbol key, an accessor and a proxy', () => {
    const symbol = { ...good(), [Symbol('s')]: 1 };
    const accessor = Object.defineProperty(good(), 'note', { get: () => 'Note.', enumerable: true });
    expect([code(symbol), code(accessor), code(new Proxy(good(), {}))]).toEqual(['invalid-property', 'invalid-property', 'invalid-structure']);
    expect(checkShape(shape, symbol)).toEqual([{ path: '$', detail: 'carries a symbol key or an accessor' }]);
  });

  it('refuses a class instance and a non-enumerable field', () => {
    class Holder { id = 'a1'; note = 'Note.'; ids = ['s1']; }
    const hidden = Object.defineProperty(good(), 'note', { value: 'Note.', enumerable: false });
    expect([code(new Holder()), code(hidden)]).toEqual(['invalid-object', 'invalid-fields']);
    expect(checkShape(shape, new Holder())).toEqual([{ path: '$', detail: 'must be an object' }]);
    expect(checkShape(shape, hidden)).toEqual([{ path: '$.note', detail: 'is not enumerable' }]);
  });

  it('check refuses a hole a named key stands in for', () => {
    const ids: unknown[] = ['s1', 's2']; delete ids[0]; (ids as unknown as Record<string, unknown>)['x'] = 1;
    expect(code({ ...good(), ids })).toBe('invalid-array');
  });

  it('check stops at its first breach: before the repeat test, and a missing field before a field breach', () => {
    const arrayLike = Object.setPrototypeOf([1], Object.prototype) as unknown;
    expect(code({ ...good(), ids: arrayLike })).toBe('invalid-string');
    expect(code({ note: 3, ids: ['s1'] })).toBe('invalid-fields');
    expect(checkShape(shape, { note: 3, ids: ['s1'] })).toEqual([{ path: '$.id', detail: 'is required' }, { path: '$.note', detail: 'must be a string' }]);
  });

  it('check walks the value\'s field order; checkShape the schema\'s', () => {
    const both = { ids: [], note: '', id: 'a1' };
    expect(code(both)).toBe('invalid-array');
    expect(checkShape(shape, both)).toEqual([
      { path: '$.note', detail: 'must be 1 to 8000 characters; is 0' },
      { path: '$.ids', detail: 'must hold 1 to 200 items; holds 0' },
    ]);
    expect(checkShape({ root: list(text, 0, 2), defs: {} }, ['a', 'a', 'a'])).toEqual([{ path: '$', detail: 'must hold 0 to 2 items; holds 3' }]);
  });

  it('refuses an array that carries a named key beside its items', () => {
    const ids = Object.assign(['s1'], { x: 1 });
    expect(code({ ...good(), ids })).toBe('invalid-array');
    expect(checkShape(shape, { ...good(), ids })).toEqual([{ path: '$.ids', detail: 'must be an array' }]);
  });

  // R-GP-IMPL-CLOSED-SCHEMA-1 F1: the pre-dedup `check` ran each oneOf arm under `try {} catch {}`, so an arm that throws
  // is a miss. Outside a oneOf the same throw escapes, as it always has.
  const protoArr = (items: unknown[]): unknown => Object.setPrototypeOf([...items], Object.prototype);
  const thrown = (f: () => unknown): string => { try { f(); return 'ok'; } catch (error) { return `${(error as Error).constructor.name}: ${(error as Error).message}`; } };

  it('check counts an arm that throws as a miss', () => {
    expect(thrown(() => check(disposition, { kind: 'produced', assetIds: protoArr(['a1']) }))).toBe('Error: invalid-disposition');
    expect(thrown(() => check(disposition, { kind: 'omitted', reason: 'r', references: protoArr(['a1']) }))).toBe('Error: invalid-disposition');
    expect(thrown(() => check(record, { ...good(), ids: protoArr(['s1']) }))).toMatch(/^TypeError: /);
  });

  it('checkShape walks every arm, so a later arm that throws throws even after an earlier arm passes', () => {
    const plainList = list(handle, 1);
    expect(thrown(() => checkShape({ root: { oneOf: [plainList, refs()] }, defs: {} }, protoArr(['a1'])))).toMatch(/^TypeError: /);
    expect(thrown(() => checkShape({ root: { oneOf: [refs(), plainList] }, defs: {} }, protoArr(['a1'])))).toMatch(/^TypeError: /);
  });

  it('checkShape names no form for a proxy, whatever its target claims', () => {
    const forms = { root: { oneOf: [object({ kind: one('a'), n: text }), object({ kind: one('b'), m: text })] }, defs: {} };
    expect(checkShape(forms, new Proxy({ kind: 'a', n: 3 }, {}))).toEqual([{ path: '$', detail: 'matches none of the permitted forms (kind a; kind b)' }]);
    expect(checkShape(forms, { kind: 'a', n: 3 })).toEqual([{ path: '$.n', detail: 'must be a string' }]);
  });

  it('freezes the shared string parts', () => {
    expect([Object.isFrozen(text), Object.isFrozen(handle)]).toEqual([true, true]);
  });

  // syzygy-mea.10.5: a value naming no form beside one undiscriminated form reports against it; forms reached by $ref are named.
  describe('a choice beside one undiscriminated form', () => {
    const plain = object({ id: handle, note: text });
    const boxed = object({ kind: one('box'), id: handle });
    const choiceShape: SchemaWithDefs = { root: { oneOf: [ref('plain'), ref('boxed')] }, defs: { plain, boxed } };
    it('reports a plain value\'s own breach', () => {
      expect(checkShape(choiceShape, { id: 'a1' })).toEqual([{ path: '$.note', detail: 'is required' }]);
    });
    it('names every form, resolving references, when the value carries another form\'s key', () => {
      expect(checkShape(choiceShape, { kind: 'crate', id: 'a1' })).toEqual([{ path: '$', detail: 'matches none of the permitted forms (unnamed; kind box)' }]);
      // The shared diagnostic now lists the actual local and provider forms too. The provider's throwing caller still refuses with
      // its existing code; the rendered-output golden cannot establish either caller's diagnostic behavior.
      const local = localDraftSchema({ pinnedRevision: 'a'.repeat(40), maxQuestions: 1 });
      const invalid = { kind: 'crate', assetIds: ['core-ideas'] };
      const detail = 'matches none of the permitted forms (kind produced; kind omitted; kind unresolved)';
      expect(checkDraftShape({ root: ref('disposition'), defs: local.defs }, invalid)).toEqual([{ path: '$', detail }]);
      expect(checkShape({ root: disposition, defs: {} }, invalid)).toEqual([{ path: '$', detail }]);
      const provider = { title: 'Server', introduction: { id: 'intro', text: 'Introduction.', sourceIds: ['s1'] },
        sections: [{ id: 'core-ideas', title: 'Core ideas', paragraphs: [{ id: 'p1', text: 'A command.', sourceIds: ['s1'], children: [] }], disposition: invalid }],
        diagrams: [], deepDives: [], unresolved: [] };
      expect(thrown(() => validateDraftRecord(provider))).toBe('Error: invalid-disposition');
      const accepted = { kind: 'produced', assetIds: ['core-ideas'] };
      expect(checkDraftShape({ root: ref('disposition'), defs: local.defs }, accepted)).toEqual([]);
      expect(checkShape({ root: disposition, defs: {} }, accepted)).toEqual([]);
      provider.sections[0]!.disposition = accepted;
      expect(validateDraftRecord(provider)).toEqual(provider);
    });
    it('reports a named form\'s breach', () => {
      expect(checkShape(choiceShape, { kind: 'box', id: 'a1', extra: 1 })).toEqual([{ path: '$.extra', detail: 'is not a field of this form' }]);
    });
    it('keeps the bare refusal when two forms are undiscriminated', () => {
      const twin: SchemaWithDefs = { root: { oneOf: [ref('plain'), ref('plain'), ref('boxed')] }, defs: { plain, boxed } };
      expect(checkShape(twin, { id: 'a1' })).toEqual([{ path: '$', detail: 'matches none of the permitted forms (unnamed; unnamed; kind box)' }]);
    });
  });
});
