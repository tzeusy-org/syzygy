// rev-521: every expected value in argv.test.ts's it.each tables, and the two direct expectations, must be made of literals only
// (object, array, string, number, true/false, a property name). Prints the population and any non-literal node. Usage: node literal_sweep.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const tree = path.resolve(process.argv[2]);
const ts = createRequire(path.join(tree, 'package.json'))('typescript');
const file = 'packages/polaris-dossier/src/argv.test.ts';
const src = ts.createSourceFile(file, fs.readFileSync(path.join(tree, file), 'utf8'), ts.ScriptTarget.Latest, true);
const LITERAL = new Set([ts.SyntaxKind.ObjectLiteralExpression, ts.SyntaxKind.ArrayLiteralExpression, ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.PropertyAssignment, ts.SyntaxKind.Identifier, ts.SyntaxKind.NoSubstitutionTemplateLiteral]);
const bad = [];
const check = (node, where) => {
  if (!LITERAL.has(node.kind)) bad.push(`${where}: ${ts.SyntaxKind[node.kind]} ${node.getText(src).slice(0, 60)}`);
  if (node.kind === ts.SyntaxKind.Identifier && !(node.parent && ts.isPropertyAssignment(node.parent) && node.parent.name === node)) bad.push(`${where}: identifier ${node.getText(src)}`);
  ts.forEachChild(node, (c) => check(c, where));
};
let rows = 0, direct = 0;
const visit = (n) => {
  // it.each<[...]>([ rows ])
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'each' && ts.isArrayLiteralExpression(n.arguments[0])) {
    for (const row of n.arguments[0].elements) { rows++; check(row.elements[row.elements.length - 1], `row ${src.getLineAndCharacterOfPosition(row.getStart(src)).line + 1}`); }
  }
  // expect(...).toEqual(<literal>) outside the tables
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'toEqual' && !ts.isIdentifier(n.arguments[0])) {
    direct++; check(n.arguments[0], `toEqual ${src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1}`);
  }
  ts.forEachChild(n, visit);
};
visit(src);
console.log(JSON.stringify({ tableRows: rows, directLiteralExpectations: direct, nonLiteral: bad }, null, 1));
