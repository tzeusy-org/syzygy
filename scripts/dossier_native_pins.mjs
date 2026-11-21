import { readFileSync } from 'node:fs';
import ts from 'typescript';

const sourceRoot = new URL('../packages/polaris-dossier/src/', import.meta.url);

// Read the runtime's literals without evaluating any product module or
// requiring a compiled runtime on this runner.
export function dossierNativePin(file, name) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, sourceRoot), 'utf8'), ts.ScriptTarget.Latest);
  const declarations = source.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === name);
  const initializer = declarations[0]?.initializer;
  if (declarations.length !== 1 || !initializer) throw new Error('missing pin declaration');
  if (ts.isCallExpression(initializer) && initializer.expression.getText(source) === 'Object.freeze'
    && initializer.arguments.length === 1 && ts.isObjectLiteralExpression(initializer.arguments[0])) {
    const entries = initializer.arguments[0].properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) throw new Error('nonliteral pin property');
      return [property.name.text, literal(property.initializer)];
    });
    if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error('duplicate pin property');
    return Object.fromEntries(entries);
  }
  return literal(initializer);
}

function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  throw new Error('nonliteral pin value');
}
