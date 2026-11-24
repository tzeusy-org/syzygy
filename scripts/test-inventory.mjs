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

function isExpressionWrapper(node) {
  return ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node);
}

function unwrap(expression) {
  let node = expression;
  while (isExpressionWrapper(node)) node = node.expression;
  return node;
}

function literalPrimitive(expression) {
  const node = unwrap(expression);
  return ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword;
}

function hasPrimitiveTuples(table) {
  return table.elements.every((row) => {
    const tuple = unwrap(row);
    return ts.isArrayLiteralExpression(tuple) && tuple.elements.every(literalPrimitive);
  });
}

function isTupleBinding(pattern) {
  return ts.isArrayBindingPattern(pattern) && pattern.elements.every((item) =>
    ts.isOmittedExpression(item) || (ts.isIdentifier(item.name) && !item.initializer && !item.dotDotDotToken),
  );
}

function isTupleProjection(call) {
  if (!ts.isCallExpression(call) || call.arguments.length !== 1) return false;
  const project = call.arguments[0];
  if (!ts.isArrowFunction(project) || project.parameters.length !== 1 || !ts.isIdentifier(project.body)) return false;
  const parameter = project.parameters[0];
  return !parameter.initializer && !parameter.dotDotDotToken && isTupleBinding(parameter.name) &&
    parameter.name.elements.some((item) => !ts.isOmittedExpression(item) && item.name.text === project.body.text);
}

function tableConsumer(reference, table, source) {
  let use = reference;
  while (isExpressionWrapper(use.parent) && use.parent.expression === use) use = use.parent;
  const enclosing = use.parent;
  if (ts.isCallExpression(enclosing) && enclosing.arguments[0] === use &&
      ts.isCallExpression(enclosing.parent) && enclosing.parent.expression === enclosing) {
    const callee = enclosing.expression.getText(source);
    return callee === 'it.each' || callee === 'test.each';
  }
  // These two tuple reads pass neither the table nor a mutable row value onward.
  if (ts.isPropertyAccessExpression(enclosing) && enclosing.expression === use && enclosing.name.text === 'map') {
    return isTupleProjection(enclosing.parent) && hasPrimitiveTuples(table);
  }
  if (!ts.isForOfStatement(enclosing) || enclosing.expression !== use) return false;
  const binding = enclosing.initializer;
  return ts.isVariableDeclarationList(binding) && (binding.flags & ts.NodeFlags.Const) !== 0 &&
    binding.declarations.length === 1 && isTupleBinding(binding.declarations[0].name) && hasPrimitiveTuples(table);
}

function lexicalSymbol(reference, checker) {
  const { parent } = reference;
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === reference) {
    return checker.getShorthandAssignmentValueSymbol(parent);
  }
  if (ts.isExportSpecifier(parent)) return checker.getExportSpecifierLocalTargetSymbol(parent);
  return checker.getSymbolAtLocation(reference);
}

function readTable(argument, source, checker, references) {
  if (!argument) return { text: '', rows: null };
  const reference = unwrap(argument);
  let expression = reference;
  let binding = null;
  if (ts.isIdentifier(reference)) {
    const symbol = lexicalSymbol(reference, checker);
    const declaration = symbol?.valueDeclaration;
    if (!declaration || !ts.isVariableDeclaration(declaration) ||
        declaration.getSourceFile() !== source || !declaration.initializer) {
      return { text: reference.text, rows: null };
    }
    expression = unwrap(declaration.initializer);
    binding = { symbol, declaration };
  }
  const print = (node) => printer.printNode(ts.EmitHint.Expression, node, source);
  if (!ts.isArrayLiteralExpression(expression) || expression.elements.some(
    (row) => ts.isSpreadElement(row) || ts.isOmittedExpression(row),
  )) {
    return { text: print(expression), rows: null };
  }
  const rows = expression.elements.map(print);
  const text = JSON.stringify(rows);
  if (binding) {
    const { symbol, declaration } = binding;
    const list = declaration.parent;
    const statement = list.parent;
    const stable = symbol.declarations.length === 1 && (list.flags & ts.NodeFlags.Const) !== 0 &&
      (!ts.isVariableStatement(statement) || (ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export) === 0) &&
      references.get(reference.text).every((use) => use === declaration.name ||
        lexicalSymbol(use, checker) !== symbol || tableConsumer(use, expression, source));
    if (!stable) return { text, rows: null };
  }
  return { text, rows };
}

function inventory(root, file) {
  const path = resolve(root, file);
  const program = ts.createProgram([path], { allowJs: true, noLib: true, noResolve: true, types: [] });
  const source = program.getSourceFile(path);
  if (!source || program.getSyntacticDiagnostics(source).length) {
    throw new Error(`Cannot parse test file ${path}`);
  }
  const checker = program.getTypeChecker();
  const references = new Map();
  function collectReferences(node) {
    if (ts.isIdentifier(node)) {
      const sameName = references.get(node.text);
      if (sameName) sameName.push(node);
      else references.set(node.text, [node]);
    }
    ts.forEachChild(node, collectReferences);
  }
  collectReferences(source);
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
          table: each ? readTable(callee.arguments[0], source, checker, references) : null,
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
