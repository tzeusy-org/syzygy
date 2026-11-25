import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const HERE = new URL('.', import.meta.url);
const RAW_NUMBER = /(?<![a-z0-9_.-])[-+]?(?:\d+(?:\.\d+)?|\.\d+)/iu;
const DECLARATION = /(?:^|[;{])\s*([a-z][a-z-]*|--[a-z][a-z0-9-]*)\s*:\s*([^;{}]*)/giu;
const CONDITIONAL = /@(?:media|container)\s*(?:[^{}]*?\b)?\((?:min-|max-)?(?:width|height)\s*[:<>]=?\s*([^)]*)\)/giu;
const CSS_VARIABLE = /var\(--[a-z0-9-]+\)/giu;
const QUOTED = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gu;
const COLOR_PROPERTY = /^(?:(?:border|outline)(?:-(?:(?:top|right|bottom|left|inline|block)(?:-(?:color|width|style))?|color|width|style))?|(?:background|text-decoration)(?:-color)?|color|fill|stroke|box-shadow|text-shadow|--[a-z0-9-]+)$/u;
const COLOR_KEYWORDS = new Set([
  'auto', 'none', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
  'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'hidden',
  'underline', 'overline', 'line-through', 'blink', 'wavy', 'color-mix', 'in', 'srgb',
]);
const TOKEN_REFERENCE = /^tokens(?:\.[a-z]\w*){1,2}$/iu;
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

function sourceText(node: ts.Expression, expressions: ts.Expression[]): string {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (joinedString(node)) return sourceText(node.left, expressions) + sourceText(node.right, expressions);
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

function computedFigureWidth(expression: ts.Expression, file: ts.SourceFile): boolean {
  const template = expression.parent.parent;
  if (!ts.isTemplateExpression(template) || !ts.isArrowFunction(template.parent)) return false;
  const arrow = template.parent;
  if (arrow.parameters.length !== 1 || arrow.parameters[0]!.name.getText(file) !== expression.getText(file)) return false;
  const parent = arrow.parent;
  return (ts.isCallExpression(parent) && parent.expression.getText(file) === 'tokens.figureFormWidths.map')
    || (ts.isVariableDeclaration(parent) && parent.name.getText(file) === 'mapWidthQuery');
}

function rawStyles(source: string): readonly string[] {
  const file = ts.createSourceFile('dossier-style.ts', source, ts.ScriptTarget.Latest, true);
  const importsTokens = file.statements.some(statement => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)
        || statement.moduleSpecifier.text !== './dossier-style-tokens.js') return false;
    const named = statement.importClause?.namedBindings;
    return named !== undefined && ts.isNamedImports(named)
      && named.elements.some(element => element.propertyName?.text === 'DOSSIER_STYLE' && element.name.text === 'tokens');
  });
  const problems: string[] = [];
  function scan(text: string, expressions: readonly ts.Expression[] = []): void {
    const authorValue = (value: string, context: string): string => {
      return value.replace(SLOT, (_, slot: string) => {
        const expression = expressions[Number(slot)];
        if (expression === undefined) return ' unbound-expression ';
        if (importsTokens && TOKEN_REFERENCE.test(expression.getText(file))) return '';
        if (context === 'presentation threshold' && computedFigureWidth(expression, file)) return '';
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
      for (const match of css.matchAll(CONDITIONAL)) {
        const value = authorValue(match[1]!, 'presentation threshold');
        if (RAW_NUMBER.test(value) || value.includes('unbound-expression')) problems.push(`presentation threshold: ${match[1]}`);
      }
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isTemplateExpression(node) || ts.isStringLiteralLike(node) || joinedString(node)) {
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
    ['type size', 'const css = ".reading-order{font-size:17px}"', 'font-size: 17px'],
    ['nested rule spacing', 'const css = "@media(max-width:\${breakpoint}){.reading-order{margin:.3rem}}"', 'margin: .3rem'],
    ['responsive threshold', 'const css = "@media(max-width:731px){.reading-order{display:block}}"', 'presentation threshold: 731px'],
    ['inline color', 'const cell = `<td style="color:rgb(88 0 0)">Value</td>`', 'color: rgb(88 0 0)'],
    ['unbound threshold alias', 'const width = 731; const css = `@container (width < ${width}px){.figure{display:block}}`', 'presentation threshold: __slot_0__px'],
    ['dynamic source-line declaration', 'const css = base + ` .source-line:nth-child(${line}){box-shadow:inset 17px}`', 'box-shadow: inset 17px'],
    ['raw interpolated color', 'const css = `.source-line{color:${"red"}}`', 'color: __slot_0__'],
    ['raw interpolation', 'const css = `.source-line{padding:${3}px}`', 'padding: __slot_0__px'],
  ])('rejects a literal %s', (_, source, expected) => {
    expect(rawStyles(source)).toContain(expected);
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
