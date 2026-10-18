/**
 * Ocean AI guardrail rules (local ESLint plugin). They keep the four component pages consistent:
 *
 *   ocean/import-boundaries   features import only from src/components, src/design, src/lib,
 *                             src/layout and their own folder; shared code never imports features.
 *   ocean/no-raw-colors       no hex colours outside src/design (use tokens).
 *   ocean/no-arbitrary-tailwind  no Tailwind arbitrary values like p-[13px] or text-[#123456].
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const FEATURE_SHARED = ['components', 'design', 'lib', 'layout', 'assets'];

function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Resolve an import to a path relative to src/, or null for packages. */
function resolveImport(source, filename) {
  if (source.startsWith('@/')) return source.slice(2);
  if (source.startsWith('.')) {
    const abs = path.resolve(path.dirname(filename), source);
    const rel = toPosix(path.relative(SRC, abs));
    return rel.startsWith('..') ? null : rel;
  }
  return null;
}

function fileArea(filename) {
  const rel = toPosix(path.relative(SRC, filename));
  if (rel.startsWith('..')) return null;
  const [top, second] = rel.split('/');
  if (top === 'features' && second && second.includes('.')) return { kind: 'registry' };
  if (top === 'features' && second) return { kind: 'feature', name: second };
  return { kind: 'shared', top };
}

const importBoundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep feature folders isolated and shared code independent of features.' },
    schema: [],
    messages: {
      crossFeature:
        'Features may import only from src/components, src/design, src/lib, src/layout or their own folder. "{{source}}" is outside. Need something shared? Ask for it in components/ui (see CONTRIBUTING.md).',
      sharedImportsFeature:
        'Shared code (src/{{top}}) must not import from a feature or page ("{{source}}"). Pass data in through props or the registry.',
    },
  },
  create(context) {
    const area = fileArea(context.filename);
    if (!area || area.kind === 'registry') return {};

    function check(node, source) {
      if (typeof source !== 'string') return;
      const target = resolveImport(source, context.filename);
      if (target === null) return;
      const [top, second] = target.split('/');

      if (area.kind === 'feature') {
        const ownFolder = top === 'features' && second === area.name;
        if (!ownFolder && !FEATURE_SHARED.includes(top)) {
          context.report({ node, messageId: 'crossFeature', data: { source } });
        }
        return;
      }
      const sharedLayer = ['components', 'design', 'lib', 'layout'].includes(area.top);
      if (sharedLayer && ['features', 'pages', 'app'].includes(top)) {
        context.report({
          node,
          messageId: 'sharedImportsFeature',
          data: { source, top: area.top },
        });
      }
    }

    return {
      ImportDeclaration: (node) => check(node.source, node.source.value),
      ExportNamedDeclaration: (node) => node.source && check(node.source, node.source.value),
      ExportAllDeclaration: (node) => check(node.source, node.source.value),
      ImportExpression: (node) =>
        node.source.type === 'Literal' && check(node.source, node.source.value),
    };
  },
};

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const RGB = /\b(?:rgba?|hsla?)\(/;

function stringRule({ test, messageId, message, description }) {
  return {
    meta: {
      type: 'problem',
      docs: { description },
      schema: [],
      messages: { [messageId]: message },
    },
    create(context) {
      const visit = (node, value) => {
        if (typeof value === 'string' && test(value)) context.report({ node, messageId });
      };
      return {
        Literal: (node) => visit(node, node.value),
        TemplateElement: (node) => visit(node, node.value.raw),
        JSXText: (node) => visit(node, node.value),
      };
    },
  };
}

const noRawColors = stringRule({
  description: 'Disallow hex / rgb() colours outside src/design.',
  messageId: 'rawColor',
  message:
    'Raw colour value. Use a token from src/design/tokens.ts (Tailwind class such as text-navy, or `colors.navy`).',
  test: (value) => HEX.test(value) || RGB.test(value),
});

// Tailwind arbitrary syntax, checked per class token:
//   p-[13px]  hover:text-[#123]  -mt-[2px]   (arbitrary value)
//   [mask-type:luminance]                    (arbitrary property)
//   [&>li]:p-2  has-[:checked]:bg-navy       (arbitrary variant)
const ARBITRARY_TOKEN = [
  /^(?:[\w-]+:)*!?-?[a-z][\w-]*-\[[^\]]+\]$/,
  /^(?:[\w-]+:)*\[[a-z-]+:[^\]]+\]$/,
  /^[\w-]*\[[^\]]+\]:/,
];

const noArbitraryTailwind = stringRule({
  description: 'Disallow Tailwind arbitrary values in feature code.',
  messageId: 'arbitrary',
  message:
    'Tailwind arbitrary value. Use the token scale (e.g. p-4, text-sm, h-map-md). If a size is missing, ask for a new token.',
  test: (value) => value.split(/\s+/).some((token) => ARBITRARY_TOKEN.some((re) => re.test(token))),
});

export default {
  meta: { name: 'eslint-plugin-ocean' },
  rules: {
    'import-boundaries': importBoundaries,
    'no-raw-colors': noRawColors,
    'no-arbitrary-tailwind': noArbitraryTailwind,
  },
};
