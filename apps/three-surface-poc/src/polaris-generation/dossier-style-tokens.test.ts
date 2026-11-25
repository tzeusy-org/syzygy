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
const COLOR_PROPERTY = /(?:^|-)color$|^(?:background|border(?:-[a-z-]+)?|outline|column-rule|text-decoration|text-emphasis|fill|stroke|box-shadow|text-shadow|--[a-z0-9-]+)$/u;
const COLOR_KEYWORDS = new Set([
  'auto', 'none', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
  'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'hidden',
  'underline', 'overline', 'line-through', 'blink', 'wavy', 'color-mix', 'in', 'srgb', 'collapse', 'separate',
]);
const SLOT = /__slot_(\d+)__/gu;

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

function joinedArray(node: ts.Node): { elements: readonly ts.Expression[]; separator: string } | undefined {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'join') return;
  const array = node.expression.expression;
  if (!ts.isArrayLiteralExpression(array) || node.arguments.length > 1) return;
  const argument = node.arguments[0];
  if (argument !== undefined && !ts.isStringLiteralLike(argument)) return;
  return { elements: array.elements, separator: argument?.text ?? ',' };
}

function sourceText(node: ts.Expression, expressions: ts.Expression[]): string {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return sourceText(node.expression, expressions);
  if (joinedString(node)) return sourceText(node.left, expressions) + sourceText(node.right, expressions);
  const array = joinedArray(node);
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

function tokenBinding(file: ts.SourceFile): (expression: ts.Expression) => boolean {
  const importName = file.statements.flatMap(statement => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
        || statement.moduleSpecifier.text !== './dossier-style-tokens.js' || statement.importClause?.isTypeOnly) return [];
    const named = statement.importClause?.namedBindings;
    return named !== undefined && ts.isNamedImports(named) ? named.elements : [];
  }).find(element => !element.isTypeOnly && (element.propertyName ?? element.name).text === 'DOSSIER_STYLE');
  if (importName === undefined) return () => false;

  // Only bind the source under inspection. No library or dependency needs to
  // be loaded to distinguish the exact import from a shadowing parameter.
  const options = { noLib: true, noResolve: true, types: [] };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = filename => filename === file.fileName ? file : undefined;
  const checker = ts.createProgram([file.fileName], options, host).getTypeChecker();
  const binding = checker.getSymbolAtLocation(importName.name);
  return expression => {
    if (binding === undefined || !ts.isPropertyAccessExpression(expression)) return false;
    let root = expression.expression;
    while (ts.isPropertyAccessExpression(root)) root = root.expression;
    return ts.isIdentifier(root) && checker.getSymbolAtLocation(root) === binding;
  };
}

function rawStyles(source: string): readonly string[] {
  const file = ts.createSourceFile('dossier-style.ts', source, ts.ScriptTarget.Latest, true);
  const isToken = tokenBinding(file);
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

    for (const css of stylesIn(text)) {
      for (const match of css.matchAll(DECLARATION)) {
        const property = match[1]!.toLowerCase();
        const value = match[2]!;
        const residual = authorValue(value, property);
        const words = residual.match(/[a-z][a-z-]*/gu) ?? [];
        const rawColor = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/iu.test(residual)
          || (COLOR_PROPERTY.test(property) && words.some(word => !COLOR_KEYWORDS.has(word)));
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
    if (ts.isTemplateExpression(node) || ts.isStringLiteralLike(node) || joinedString(node) || (ts.isExpression(node) && joinedArray(node) !== undefined)) {
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
      .flatMap(file => rawStyles(readFileSync(new URL(file, HERE), 'utf8')).map(issue => `${file}: ${issue}`));
    expect(issues).toEqual([]);
  });

  it.each([
    ['hex palette value', 'const css = ".source-line{color:#842133}"', 'color: #842133'],
    ['root palette value', 'const css = ":root{--theme-accent:purple}"', '--theme-accent: purple'],
    ['palette value in a joined rule', 'const css = ":root{color:inherit;" + "--theme-accent:purple}"', '--theme-accent: purple'],
    ['named palette value', 'const css = ".source-line{background:rebeccapurple}"', 'background: rebeccapurple'],
    ['named accent color', 'const css = ".field{accent-color:rebeccapurple}"', 'accent-color: rebeccapurple'],
    ['named caret color', 'const css = ".field{caret-color:red}"', 'caret-color: red'],
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
    ].join('\n');
    expect(rawStyles(source)).toEqual([]);
  });
});
