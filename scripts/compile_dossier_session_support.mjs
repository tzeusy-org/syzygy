import { transform } from 'esbuild';
import ts from 'typescript';

const supportRoot = 'packages/polaris-dossier/src/';
const bridge = `${supportRoot}session-bridge.ts`;
const mcp = `${supportRoot}session-mcp.ts`;

// Keep the existing transport and ordinary standalone build intact. Add the
// ordered-design catalogue hint and request-only bound at verified AST points.
function withOrderedDesignLimits(source) {
  const parsed = ts.createSourceFile(mcp, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const catalogues = parsed.statements
    .filter(statement => ts.isVariableStatement(statement)
      && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'SESSION_MCP_TOOLS');
  const init = catalogues.length === 1 ? catalogues[0].initializer : undefined;
  if (init === undefined || !ts.isCallExpression(init) || init.expression.getText(parsed) !== 'Object.freeze'
    || init.arguments.length !== 1 || !ts.isArrayLiteralExpression(init.arguments[0])) {
    throw new Error('unrecognized session MCP catalogue');
  }
  const descriptors = init.arguments[0].elements.filter(element => ts.isObjectLiteralExpression(element)
    && element.properties.some(property => ts.isPropertyAssignment(property) && property.name.getText(parsed) === 'name'
      && ts.isStringLiteral(property.initializer) && property.initializer.text === 'artifact_read'));
  const descriptor = descriptors[0];
  if (descriptors.length !== 1 || descriptor.properties.some(property => !ts.isPropertyAssignment(property)
    || !['name', 'description', 'inputSchema'].includes(property.name.getText(parsed)))
    || descriptor.properties.length !== 3 || new Set(descriptor.properties.map(property => property.name.getText(parsed))).size !== 3) {
    throw new Error('unrecognized artifact_read catalogue descriptor');
  }
  const ingressChecks = new Map();
  const findIngress = (functionName, kind, matches) => {
    const functions = parsed.statements.filter(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === functionName);
    const found = [];
    const visit = node => {
      if (matches(node)) found.push(node);
      ts.forEachChild(node, visit);
    };
    if (functions.length === 1) visit(functions[0]);
    if (found.length !== 1) throw new Error(`unrecognized ordered MCP ${kind} check`);
    ingressChecks.set(found[0], kind);
  };
  findIngress('handleRequest', 'request', node => ts.isCallExpression(node)
    && node.expression.getText(parsed) === 'boundedJson' && node.arguments.length === 2
    && node.arguments[0].getText(parsed) === 'request' && node.arguments[1].getText(parsed) === 'limits');
  findIngress('serveSessionMcp', 'framing', node => ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken
    && node.left.getText(parsed) === 'chunk.byteLength + partial.length' && node.right.getText(parsed) === 'limits.maxBytes');
  findIngress('serveSessionMcp', 'decode', node => ts.isCallExpression(node)
    && node.expression.getText(parsed) === 'decode' && node.arguments.length === 2
    && node.arguments[0].getText(parsed) === 'bytes.subarray(start, end)' && node.arguments[1].getText(parsed) === 'limits');
  const { factory } = ts;
  const requestBytes = () => factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier('Math'), 'min'), undefined, [
    factory.createPropertyAccessExpression(factory.createIdentifier('limits'), 'maxBytes'), factory.createNumericLiteral(2_097_152),
  ]);
  const requestLimits = () => factory.createObjectLiteralExpression([
    factory.createSpreadAssignment(factory.createIdentifier('limits')), factory.createPropertyAssignment('maxBytes', requestBytes()),
  ]);
  const meta = factory.createPropertyAssignment('_meta', factory.createObjectLiteralExpression([
    factory.createPropertyAssignment(factory.createStringLiteral('anthropic/maxResultSizeChars'), factory.createNumericLiteral(500000)),
  ]));
  const transformed = ts.transform(parsed, [context => file => {
    const visit = node => {
      if (node === descriptor) return factory.updateObjectLiteralExpression(descriptor, [...descriptor.properties, meta]);
      const ingress = ingressChecks.get(node);
      if (ingress === 'framing') return factory.updateBinaryExpression(node, node.left, node.operatorToken, requestBytes());
      if (ingress !== undefined) return factory.updateCallExpression(node, node.expression, node.typeArguments, [node.arguments[0], requestLimits()]);
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(file, visit);
  }]);
  try { return ts.createPrinter().printFile(transformed.transformed[0]); }
  finally { transformed.dispose(); }
}

/** Compile three standalone payloads from captured first-party source. */
export async function compileDossierSessionSupport(readInput) {
  const [bridgeSource, mcpSource] = await Promise.all([readInput(bridge), readInput(mcp)]);
  const sources = [
    ['support/session-bridge.js', bridgeSource.toString('utf8')],
    ['support/session-mcp.js', mcpSource.toString('utf8')],
    ['design-support/session-mcp.js', withOrderedDesignLimits(mcpSource.toString('utf8'))],
  ];
  const options = { loader: 'ts', format: 'esm', target: 'node24', sourcemap: false };
  return new Map(await Promise.all(sources.map(async ([name, source]) => {
    const bytes = Buffer.from((await transform(source, options)).code);
    if (bytes.length > 262_144) throw new Error('support output limit');
    return [name, bytes];
  })));
}
