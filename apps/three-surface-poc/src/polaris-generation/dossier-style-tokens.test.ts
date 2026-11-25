import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const HERE = new URL('.', import.meta.url);
const RAW_NUMBER = /(?<![a-z0-9_.-])[-+]?(?:\d+(?:\.\d+)?|\.\d+)/iu;
const DECLARATION = /(?:^|[;{])\s*([a-z][a-z-]*|--[a-z][a-z0-9-]*)\s*:\s*([^;{}]*)/giu;
const CONDITIONAL = /@(?:media|container)\b([^{}]*)\{/giu;
const QUERY_CLAUSE = /\(([^)]*)\)/gu;
const DIMENSION_PREFIX = /^\s*(?:min-|max-)?(?:width|height)\s*[:<>]=?\s*/iu;
const CSS_VARIABLE = /var\(--[a-z0-9-]+\)/giu;
const QUOTED = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gu;
// The opaque <named-color> keywords from CSS Color 4 §6.1. Transparent is a
// separate fixed color in §6.3. Contextual colors follow their existing CSS roles.
// https://www.w3.org/TR/css-color-4/#named-colors
const NAMED_COLORS = new Set(`
  aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
  cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid
  mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream
  mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise
  palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown
  salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
  teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen
`.trim().split(/\s+/u));
const SLOT = /__slot_(\d+)__/gu;

function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gu,
    part => part.startsWith('/*') ? ' ' : part);
}

function looksLikeStylesheet(text: string): boolean {
  const beginning = text.trimStart().replace(/^(?:__slot_\d+__\s*)+/u, '');
  return /^[.#@:\[*a-z]/iu.test(beginning) && /\{\s*(?:--)?[a-z][\w-]*\s*:/iu.test(beginning)
    && !/^[^{}]*<(?:[a-z]+[\s>]|!doctype)/iu.test(beginning);
}

function stylesIn(text: string): readonly string[] {
  const blocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/giu)].map(match => match[1]!);
  const inline = [...text.matchAll(/\sstyle=(?:"([^"]*)"|'([^']*)')/giu)].map(match => match[1] ?? match[2]!);
  return looksLikeStylesheet(text) ? [text, ...blocks, ...inline] : [...blocks, ...inline];
}

function literalExpression(expression: ts.Expression): string | null {
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) return expression.text;
  if (ts.isPrefixUnaryExpression(expression) && ts.isNumericLiteral(expression.operand)) return expression.getText();
  return null;
}

function joinedString(node: ts.Node): node is ts.BinaryExpression {
  return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken;
}

function stringParts(node: ts.Node): { elements: readonly ts.Expression[]; separator: string } | undefined {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
  const { expression: receiver, name } = node.expression;
  if (name.text === 'concat' && (ts.isStringLiteralLike(receiver) || ts.isTemplateExpression(receiver))) {
    return { elements: [receiver, ...node.arguments], separator: '' };
  }
  if (name.text !== 'join') return;
  const array = receiver;
  if (!ts.isArrayLiteralExpression(array) || node.arguments.length > 1) return;
  const argument = node.arguments[0];
  if (argument !== undefined && !ts.isStringLiteralLike(argument)) return;
  return { elements: array.elements, separator: argument?.text ?? ',' };
}

function sourceText(node: ts.Expression, expressions: ts.Expression[]): string {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return sourceText(node.expression, expressions);
  if (joinedString(node)) return sourceText(node.left, expressions) + sourceText(node.right, expressions);
  const array = stringParts(node);
  if (array !== undefined) return array.elements.map(element => sourceText(element, expressions)).join(array.separator);
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) {
      text += `__slot_${expressions.length}__${span.literal.text}`;
      expressions.push(span.expression);
    }
    return text;
  }
  const slot = `__slot_${expressions.length}__`;
  expressions.push(node);
  return slot;
}

function knownStylesheet(node: ts.Expression, isToken: (value: ts.Expression) => boolean): boolean {
  if (ts.isStringLiteralLike(node)) return true;
  if (ts.isTemplateExpression(node)) return node.templateSpans.every(span => isToken(span.expression) || computedFigureWidth(span.expression, isToken));
  if (ts.isParenthesizedExpression(node)) return knownStylesheet(node.expression, isToken);
  if (joinedString(node)) return knownStylesheet(node.left, isToken) && knownStylesheet(node.right, isToken);
  const composed = stringParts(node);
  if (composed !== undefined) return composed.elements.every(part => knownStylesheet(part, isToken));

  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
      || node.expression.name.text !== 'join' || node.arguments.length !== 1
      || !ts.isStringLiteralLike(node.arguments[0]!) || node.arguments[0]!.text !== '') return false;
  const map = node.expression.expression;
  if (!ts.isCallExpression(map) || !ts.isPropertyAccessExpression(map.expression)
      || map.expression.name.text !== 'map' || map.arguments.length !== 1) return false;
  const widths = map.expression.expression;
  const callback = map.arguments[0]!;
  return ts.isPropertyAccessExpression(widths) && widths.name.text === 'figureFormWidths' && isToken(widths)
    && ts.isArrowFunction(callback) && ts.isTemplateExpression(callback.body) && knownStylesheet(callback.body, isToken);
}

function joinedSelectors(node: ts.Expression, name: string, separator: string): ts.Identifier | undefined {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
      || node.expression.name.text !== 'join' || !ts.isIdentifier(node.expression.expression)
      || node.expression.expression.text !== name || node.arguments.length !== 1) return;
  const argument = node.arguments[0]!;
  if (ts.isStringLiteralLike(argument) && argument.text === separator) return node.expression.expression;
}

function optionalRangeSelectors(node: ts.Expression): ts.Identifier | undefined {
  if (!ts.isConditionalExpression(node) || !ts.isStringLiteralLike(node.whenTrue) || node.whenTrue.text !== '') return;
  const template = node.whenFalse;
  if (!ts.isTemplateExpression(template) || template.head.text !== ',' || template.templateSpans.length !== 1) return;
  const span = template.templateSpans[0]!;
  if (span.literal.text === '') return joinedSelectors(span.expression, 'rules', ',');
}

// Each selector carrier starts empty. Its only writes are the existing
// citation-position producers, which cannot supply arbitrary declaration text.
const sourceRules = [
  'rules.length === 0',
  "rules.join(',')",
  'if (numbered !== undefined)\n    for (const rule of numbered.styles)\n        rules.push(rule);',
];
const sourceContinuations = [
  "continuationRules.join('')",
  'continuationRules.push(`#exact-text:has([id="${target}"]:target)>.source-continuation[data-citation-target="${target}"]{display:block}`)',
];
const sourceLineRules = [
  'return { markup, styles };',
  'styles.push(`#exact-text:has([id="${target}"]:target) [data-quote-start="${first.start}"]>.cited-span:nth-child(n+${from + 1}):nth-child(-n+${through})`)',
];
const printSyntax = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function syntax(node: ts.Node): string {
  return printSyntax.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile());
}

function sourceRangeFeed(iterator: ts.Expression, checker: ts.TypeChecker): boolean {
  if (!ts.isPropertyAccessExpression(iterator) || !ts.isIdentifier(iterator.expression)) return false;
  const range = checker.getSymbolAtLocation(iterator.expression)?.valueDeclaration;
  if (range === undefined || !ts.isVariableDeclaration(range) || range.initializer === undefined
      || !ts.isConditionalExpression(range.initializer) || !ts.isCallExpression(range.initializer.whenFalse)
      || !ts.isIdentifier(range.initializer.whenFalse.expression)) return false;
  const renderer = checker.getSymbolAtLocation(range.initializer.whenFalse.expression)?.declarations?.[0];
  if (renderer === undefined || !ts.isImportSpecifier(renderer)) return false;
  const imported = renderer.parent.parent.parent;
  return (renderer.propertyName ?? renderer.name).text === 'drawSourceLines'
    && ts.isImportDeclaration(imported) && ts.isStringLiteral(imported.moduleSpecifier)
    && imported.moduleSpecifier.text === './dossier-source-lines.js'
    && syntax(range) === 'numbered = rows === undefined ? undefined : drawSourceLines(rows, citedLines.get(source.sourceId), escape)';
}

function knownSelectorArray(
  identifier: ts.Identifier, checker: ts.TypeChecker, expectedUses: readonly string[],
): boolean {
  const symbol = checker.getSymbolAtLocation(identifier);
  const declaration = symbol?.valueDeclaration;
  if (declaration === undefined || !ts.isVariableDeclaration(declaration)
      || (declaration.parent.flags & ts.NodeFlags.Const) === 0
      || declaration.initializer === undefined || !ts.isArrayLiteralExpression(declaration.initializer)
      || declaration.initializer.elements.length !== 0) return false;

  const name = declaration.name;
  const observedUses: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) && node !== name) {
      const parent = node.parent;
      const binding = ts.isShorthandPropertyAssignment(parent)
        ? checker.getShorthandAssignmentValueSymbol(parent) : checker.getSymbolAtLocation(node);
      if (binding === symbol) {
        let context = parent;
        if (ts.isPropertyAccessExpression(parent) || ts.isShorthandPropertyAssignment(parent)) context = parent.parent;
        if (ts.isObjectLiteralExpression(context) && ts.isReturnStatement(context.parent)) context = context.parent;
        if (node.text === 'rules' && ts.isCallExpression(context) && ts.isPropertyAccessExpression(context.expression)
            && context.expression.name.text === 'push' && ts.isExpressionStatement(context.parent)
            && ts.isForOfStatement(context.parent.parent) && ts.isIfStatement(context.parent.parent.parent)) {
          if (!sourceRangeFeed(context.parent.parent.expression, checker)) {
            observedUses.push('unrecognized citation range carrier');
          }
          context = context.parent.parent.parent;
        }
        observedUses.push(syntax(context));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(declaration.getSourceFile());
  return observedUses.length === expectedUses.length && expectedUses.every(use => observedUses.includes(use));
}

function knownSourceLeafStyles(
  node: ts.Expression, isToken: (value: ts.Expression) => boolean, checker: ts.TypeChecker,
): boolean {
  if (!ts.isConditionalExpression(node) || !ts.isStringLiteralLike(node.whenTrue) || node.whenTrue.text !== '') return false;
  const stylesheet = node.whenFalse;
  if (!joinedString(stylesheet) || !ts.isIdentifier(stylesheet.left) || stylesheet.left.text !== 'SOURCE_LINES_CSS'
      || !ts.isTemplateExpression(stylesheet.right)) return false;
  // The range selectors and continuation rules carry the source leaf's
  // existing line identities through the otherwise static stylesheet.
  return stylesheet.right.templateSpans.every(({ expression }) => {
    if (isToken(expression)) return true;
    const rules = optionalRangeSelectors(expression);
    if (rules !== undefined) return knownSelectorArray(rules, checker, sourceRules);
    const continuations = joinedSelectors(expression, 'continuationRules', '');
    return continuations !== undefined && knownSelectorArray(continuations, checker, sourceContinuations);
  });
}

function selectedStylesheet(
  node: ts.VariableDeclaration, isToken: (value: ts.Expression) => boolean, checker: ts.TypeChecker,
): boolean {
  if (!ts.isIdentifier(node.name) || node.initializer === undefined) return true;
  const name = node.name.text;
  const value = node.initializer;
  if (name === 'styles') {
    const filename = node.getSourceFile().fileName;
    if (filename === 'dossier-site.ts') return knownSourceLeafStyles(value, isToken, checker);
    if (filename === 'dossier-source-lines.ts') return knownSelectorArray(node.name, checker, sourceLineRules);
  }
  if (name === 'LOCAL_REFLOW_CSS') {
    // The literal per-page table contributes only its stylesheet column.
    if (!ts.isNewExpression(value) || !ts.isIdentifier(value.expression) || value.expression.text !== 'Map'
        || value.arguments?.length !== 1 || !ts.isArrayLiteralExpression(value.arguments[0]!)) return false;
    return value.arguments[0]!.elements.every(row => ts.isArrayLiteralExpression(row) && row.elements.length === 2
      && ts.isStringLiteralLike(row.elements[0]!) && knownStylesheet(row.elements[1]!, isToken));
  }
  if (name === 'mapWidthQuery') return ts.isArrowFunction(value) && ts.isTemplateExpression(value.body) && knownStylesheet(value.body, isToken);
  return !name.endsWith('_CSS') || knownStylesheet(value, isToken);
}

function computedFigureWidth(expression: ts.Expression, isToken: (value: ts.Expression) => boolean): boolean {
  const template = expression.parent.parent;
  if (!ts.isIdentifier(expression) || !ts.isTemplateExpression(template) || !ts.isArrowFunction(template.parent)) return false;
  const arrow = template.parent;
  const parameter = arrow.parameters[0]?.name;
  if (arrow.parameters.length !== 1 || parameter === undefined || !ts.isIdentifier(parameter) || parameter.text !== expression.text) return false;
  const parent = arrow.parent;
  if (ts.isVariableDeclaration(parent)) return ts.isIdentifier(parent.name) && parent.name.text === 'mapWidthQuery';
  if (!ts.isCallExpression(parent) || !ts.isPropertyAccessExpression(parent.expression) || parent.expression.name.text !== 'map') return false;
  const widths = parent.expression.expression;
  return ts.isPropertyAccessExpression(widths) && widths.name.text === 'figureFormWidths' && isToken(widths);
}

function tokenBinding(file: ts.SourceFile, checker: ts.TypeChecker): (expression: ts.Expression) => boolean {
  const importName = file.statements.flatMap(statement => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
        || statement.moduleSpecifier.text !== './dossier-style-tokens.js' || statement.importClause?.isTypeOnly) return [];
    const named = statement.importClause?.namedBindings;
    return named !== undefined && ts.isNamedImports(named) ? named.elements : [];
  }).find(element => !element.isTypeOnly && (element.propertyName ?? element.name).text === 'DOSSIER_STYLE');
  if (importName === undefined) return () => false;

  const binding = checker.getSymbolAtLocation(importName.name);
  return expression => {
    if (binding === undefined || !ts.isPropertyAccessExpression(expression)) return false;
    let root = expression.expression;
    while (ts.isPropertyAccessExpression(root)) root = root.expression;
    return ts.isIdentifier(root) && checker.getSymbolAtLocation(root) === binding;
  };
}

function rawStyles(source: string, filename = 'dossier-site.ts'): readonly string[] {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  // Resolve lexical bindings inside this one inspected file. The guard never
  // loads dependencies or the source of imported modules.
  const options = { noLib: true, noResolve: true, types: [] };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = requested => requested === filename ? file : undefined;
  const checker = ts.createProgram([filename], options, host).getTypeChecker();
  const isToken = tokenBinding(file, checker);
  const problems: string[] = [];
  function scan(text: string, expressions: readonly ts.Expression[] = []): void {
    const authorValue = (value: string, context: string): string => {
      return value.replace(SLOT, (_, slot: string) => {
        const expression = expressions[Number(slot)];
        if (expression === undefined) return ' unbound-expression ';
        if (isToken(expression)) return '';
        if (context === 'presentation threshold' && computedFigureWidth(expression, isToken)) return '';
        return literalExpression(expression) ?? ' unbound-expression ';
      }).replace(CSS_VARIABLE, ' ').replace(QUOTED, ' ').toLowerCase();
    };

    for (const fragment of stylesIn(withoutComments(text))) {
      const css = withoutComments(fragment);
      for (const match of css.matchAll(DECLARATION)) {
        const property = match[1]!.toLowerCase();
        const value = match[2]!;
        const residual = authorValue(value, property);
        const words = residual.match(/[a-z_-][a-z0-9_-]*/gu) ?? [];
        const rawColor = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/iu.test(residual)
          || words.some(word => word === 'transparent' || NAMED_COLORS.has(word));
        if (rawColor || RAW_NUMBER.test(residual) || residual.includes('unbound-expression')) problems.push(`${property}: ${value}`);
      }
      for (const rule of css.matchAll(CONDITIONAL)) {
        for (const match of rule[1]!.matchAll(QUERY_CLAUSE)) {
          const condition = match[1]!.replace(DIMENSION_PREFIX, '');
          const value = authorValue(condition, 'presentation threshold');
          if (RAW_NUMBER.test(value) || value.includes('unbound-expression')) problems.push(`presentation threshold: ${condition}`);
        }
      }
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && !selectedStylesheet(node, isToken, checker)) {
      problems.push(`unsupported stylesheet assembly: ${node.name.getText(file)}`);
    }
    if (ts.isTemplateExpression(node) || ts.isStringLiteralLike(node) || joinedString(node) || (ts.isExpression(node) && stringParts(node) !== undefined)) {
      const expressions: ts.Expression[] = [];
      scan(sourceText(node, expressions), expressions);
      for (const expression of expressions) visit(expression);
    } else {
      ts.forEachChild(node, visit);
    }
  }
  visit(file);
  return problems;
}

describe('dossier stylesheet authoring', () => {
  it('keeps literal visual values in the dossier token module', () => {
    // The inherited preview and design-token preludes belong to their shared
    // consumers. Every dossier sibling, including new suppliers, is checked.
    const issues = readdirSync(HERE).filter(file =>
      /^dossier-(?!style-tokens\.ts$).+\.ts$/u.test(file) && !/\.(?:test|testkit)\.ts$/u.test(file))
      .flatMap(file => rawStyles(readFileSync(new URL(file, HERE), 'utf8'), file).map(issue => `${file}: ${issue}`));
    expect(issues).toEqual([]);
  });

  it.each([
    ['hex palette value', 'const css = ".source-line{color:#842133}"', 'color: #842133'],
    ['root palette value', 'const css = ":root{--theme-accent:purple}"', '--theme-accent: purple'],
    ['palette value in a joined rule', 'const css = ":root{color:inherit;" + "--theme-accent:purple}"', '--theme-accent: purple'],
    ['named palette value', 'const css = ".source-line{background:rebeccapurple}"', 'background: rebeccapurple'],
    ['named accent color', 'const css = ".field{accent-color:rebeccapurple}"', 'accent-color: rebeccapurple'],
    ['named caret color', 'const css = ".field{caret-color:red}"', 'caret-color: red'],
    ['gradient stop color', 'const css = ".field{background-image:linear-gradient(red,blue)}"', 'background-image: linear-gradient(red,blue)'],
    ['transparent border color', 'const css = ".field{border-left-color:transparent}"', 'border-left-color: transparent'],
    ['transparent mixing color', 'const css = ".field{color:color-mix(in srgb,var(--hint),transparent)}"', 'color: color-mix(in srgb,var(--hint),transparent)'],
    ['spacing after a CSS comment', 'const css = ".field{/* inset override */padding:17px}"', 'padding: 17px'],
    ['concat-assembled spacing', "const css = '.field'.concat('{', 'padding:17px', '}')", 'padding: 17px'],
    ['unrecognized stylesheet builder', 'const SOURCE_LINES_CSS = buildCss("padding", "17px")', 'unsupported stylesheet assembly: SOURCE_LINES_CSS'],
    ['unrecognized source leaf builder', 'const styles = local === undefined ? "" : SOURCE_LINES_CSS + buildCss("padding", "17px") + `.leaf{display:block}`', 'unsupported stylesheet assembly: styles'],
    ['array-assembled spacing', "const css = ['.field', '{', 'padding:17px', '}'].join('')", 'padding: 17px'],
    ['type size', 'const css = ".reading-order{font-size:17px}"', 'font-size: 17px'],
    ['nested rule spacing', 'const css = "@media(max-width:\${breakpoint}){.reading-order{margin:.3rem}}"', 'margin: .3rem'],
    ['responsive threshold', 'const css = "@media(max-width:731px){.reading-order{display:block}}"', 'presentation threshold: 731px'],
    ['reversed range', 'const css = "@media (731px <= width){.reading-order{display:block}}"', 'presentation threshold: 731px <= width'],
    ['inline color', 'const cell = `<td style="color:rgb(88 0 0)">Value</td>`', 'color: rgb(88 0 0)'],
    ['unbound threshold alias', 'const width = 731; const css = `@container (width < ${width}px){.figure{display:block}}`', 'presentation threshold: __slot_0__px'],
    ['dynamic source-line declaration', 'const css = base + ` .source-line:nth-child(${line}){box-shadow:inset 17px}`', 'box-shadow: inset 17px'],
    ['raw interpolated color', 'const css = `.source-line{color:${"red"}}`', 'color: __slot_0__'],
    ['raw interpolation', 'const css = `.source-line{padding:${3}px}`', 'padding: __slot_0__px'],
  ])('rejects a literal %s', (_, source, expected) => {
    expect(rawStyles(source)).toContain(expected);
  });

  it('resolves a shadowing parameter independently of the imported token', () => {
    const source = [
      "import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';",
      'const reference = `.field{padding:${tokens.spacing.small}}`;',
      'const shadow = (tokens = { spacing: { small: "47px" } }) => `.field{padding:${tokens.spacing.small}}`;',
    ].join('\n');
    expect(rawStyles(source)).toEqual(['padding: __slot_0__']);
  });

  it('examines each condition of a compound threshold', () => {
    const source = [
      "import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';",
      'const css = `@media (min-width:${tokens.length.mobile}) and (max-height:731px){.reading-order{display:block}}`;',
    ].join('\n');
    expect(rawStyles(source)).toEqual(['presentation threshold: 731px']);
  });

  it('leaves token expressions, selector indices, non-style HTML and declared figure geometry independent', () => {
    const source = [
      "import { DOSSIER_STYLE as tokens } from './dossier-style-tokens.js';",
      'const mapWidthQuery = (width: number) => `@container (width < ${width}px){.figure[data-id="card-12"]:nth-child(5n+2){gap:${tokens.spacing.small};color:var(--h2)}}`;',
      'const svg = `<rect width="246" height="73">`;',
      'const css = `.field{background:no-repeat;background-image:none;content:"/* green */"}`;',
    ].join('\n');
    expect(rawStyles(source)).toEqual([]);
  });
});
