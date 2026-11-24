// Compare static test calls in two checkouts without running either test file.
// Usage: node scripts/test-inventory.mjs <root with TypeScript> <before> <after> <relative test files...>
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [dependencyRoot, beforeRoot, afterRoot, ...files] = process.argv.slice(2);
if (!dependencyRoot || !beforeRoot || !afterRoot || files.length === 0) {
  process.stderr.write('Usage: node scripts/test-inventory.mjs <root with TypeScript> <before> <after> <relative test files...>\n');
  process.exit(2);
}
const ts = createRequire(resolve(dependencyRoot, 'package.json'))('typescript');
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function unwrap(expression) {
  let node = expression;
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
    node = node.expression;
  }
  return node;
}

function readTable(argument, source, checker) {
  if (!argument) return { text: '', rows: null };
  const reference = unwrap(argument);
  let expression = reference;
  if (ts.isIdentifier(reference)) {
    const declaration = checker.getSymbolAtLocation(reference)?.valueDeclaration;
    if (!declaration || !ts.isVariableDeclaration(declaration) ||
        declaration.getSourceFile() !== source || !declaration.initializer) {
      return { text: reference.text, rows: null };
    }
    expression = unwrap(declaration.initializer);
  }
  const print = (node) => printer.printNode(ts.EmitHint.Expression, node, source);
  if (!ts.isArrayLiteralExpression(expression) || expression.elements.some(
    (row) => ts.isSpreadElement(row) || ts.isOmittedExpression(row),
  )) {
    return { text: print(expression), rows: null };
  }
  const rows = expression.elements.map(print);
  return { text: JSON.stringify(rows), rows };
}

function inventory(root, file) {
  const path = resolve(root, file);
  const program = ts.createProgram([path], { allowJs: true, noLib: true, noResolve: true, types: [] });
  const source = program.getSourceFile(path);
  if (!source || program.getSyntacticDiagnostics(source).length) {
    throw new Error(`Cannot parse test file ${path}`);
  }
  const checker = program.getTypeChecker();
  const calls = new Map();
  const occurrences = new Map();
  const callName = (node) => node && ts.isStringLiteralLike(node) ? node.text : node?.getText(source) ?? '';

  function walk(node, parents) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const text = callee.getText(source);
      const template = ts.isCallExpression(callee) ? callee.expression.getText(source) : '';
      if (text === 'describe' || template === 'describe.each') {
        const path = [...parents, callName(node.arguments[0])];
        for (const argument of node.arguments) walk(argument, path);
        return;
      }
      const each = template === 'it.each' || template === 'test.each';
      if (text === 'it' || text === 'test' || each) {
        const name = [...parents, callName(node.arguments[0])].join(' > ');
        const occurrence = (occurrences.get(name) ?? 0) + 1;
        occurrences.set(name, occurrence);
        calls.set(JSON.stringify([name, occurrence]), {
          name,
          occurrence,
          callback: node.arguments[1]?.getText(source) ?? '',
          options: node.arguments.slice(2).map((argument) => argument.getText(source)),
          table: each ? readTable(callee.arguments[0], source, checker) : null,
        });
        return;
      }
    }
    ts.forEachChild(node, (child) => walk(child, parents));
  }

  walk(source, []);
  return calls;
}

function identity(call) {
  return { name: call.name, occurrence: call.occurrence };
}

function compare(before, after) {
  const result = { matched: 0, added: [], removed: [], changed: [], unknownRows: [] };
  for (const [key, next] of after) {
    const prior = before.get(key);
    if (!prior) {
      result.added.push(identity(next));
      continue;
    }
    result.matched++;
    const callback = prior.callback !== next.callback;
    const options = JSON.stringify(prior.options) !== JSON.stringify(next.options);
    const table = prior.table?.text !== next.table?.text;
    const plain = prior.table === null && next.table === null;
    const comparable = prior.table?.rows && next.table?.rows && prior.table.rows.length === next.table.rows.length;
    if (!plain && !comparable) result.unknownRows.push(identity(next));
    if (!callback && !options && !table) continue;

    let changedRows = null;
    if (comparable) {
      changedRows = next.table.rows.flatMap((row, index) =>
        callback || options || row !== prior.table.rows[index] ? [index + 1] : [],
      );
    }
    result.changed.push({
      ...identity(next), callback, options, table, changedRows,
      changedInstances: plain ? 1 : changedRows?.length ?? null,
    });
  }
  for (const [key, prior] of before) {
    if (!after.has(key)) result.removed.push(identity(prior));
  }
  return result;
}

const result = {
  matchedCalls: 0,
  addedCalls: 0,
  removedCalls: 0,
  changedCalls: 0,
  knownChangedInstances: 0,
  unknownChangedInstanceCalls: 0,
  unknownRowComparisons: 0,
  files: Object.create(null),
};
for (const file of new Set(files)) {
  const delta = compare(inventory(beforeRoot, file), inventory(afterRoot, file));
  result.matchedCalls += delta.matched;
  result.addedCalls += delta.added.length;
  result.removedCalls += delta.removed.length;
  result.changedCalls += delta.changed.length;
  result.unknownRowComparisons += delta.unknownRows.length;
  for (const item of delta.changed) {
    if (item.changedInstances === null) result.unknownChangedInstanceCalls++;
    else result.knownChangedInstances += item.changedInstances;
  }
  result.files[file] = delta;
}
result.changedInstances = result.unknownChangedInstanceCalls === 0 && result.unknownRowComparisons === 0
  ? `~${result.knownChangedInstances}`
  : 'Unknown';
console.log(JSON.stringify(result, null, 2));
