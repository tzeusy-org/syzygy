// Usage: node reader_probe.mjs <clone>: what PR 554's write reader and import() visitor read for candidate reader-row sources (to draft rows).
import { createRequire } from 'node:module';
const ts = createRequire(`${process.argv[2]}/package.json`)('typescript');
function propertyWritesOf(name, source) {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false);
  const writes = [];
  const targets = (node) =>
    ts.isArrayLiteralExpression(node) ? node.elements.flatMap((element) => targets(ts.isSpreadElement(element) ? element.expression : element))
      : ts.isObjectLiteralExpression(node) ? node.properties.flatMap((property) =>
        ts.isPropertyAssignment(property) ? targets(property.initializer) : ts.isSpreadAssignment(property) ? targets(property.expression) : [])
      : ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken ? targets(node.left)
      : ts.isParenthesizedExpression(node) ? targets(node.expression)
      : [node];
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      && targets(node.left).some((target) => ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target))) writes.push(node.getText(file));
    ts.forEachChild(node, visit);
  };
  visit(file);
  return writes;
}
function importCallsOf(name, source) {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false);
  const calls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) calls.push(node.getText(file));
    ts.forEachChild(node, visit);
  };
  visit(file);
  return calls;
}
const writes = ['({ value: Object.freeze } = { value: (bytes) => bytes });', '(Object.freeze) = (value) => value;', '[...Object.prototype.values] = [];',
  '({ value: [Object.freeze] } = { value: [(bytes) => bytes] });', '[Object.freeze = (value) => value] = [];', '({ freeze } = Object);'];
const imports = ["export const value = () => import ('node:crypto');", "const value = 'node:f' + 's';\nvoid import (value);", "void import/**/('node:fs');",
  "void import\n('node:fs');", "const meta = import.meta.url;"];
console.log(JSON.stringify({ writes: writes.map((s) => [s, propertyWritesOf('c.ts', s)]), imports: imports.map((s) => [s, importCallsOf('c.ts', s)]) }, null, 1));
