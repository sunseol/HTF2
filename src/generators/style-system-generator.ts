import { FigmaNodeData, FigmaPaint } from '../types/figma.types';
import { designTokens, findColorToken } from '../config/design-tokens';

interface StyleSystem {
  colors: Record<string, FigmaPaint>;
  colorTokens: string[];
  textStyles: Array<{
    name: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    token?: string;
  }>;
  spacingTokens: string[];
  shadowTokens: string[];
}

export const generateStyleSystem = (nodes: FigmaNodeData[]): StyleSystem => {
  const colors = new Map<string, FigmaPaint>();
  const colorTokens = new Set<string>();
  const spacingTokens = new Set<string>();
  const shadowTokens = new Set<string>();
  const textStyles: StyleSystem['textStyles'] = [];

  nodes.forEach((node) => {
    node.fills?.forEach((paint) => {
      if (paint.type === 'SOLID' && paint.color) {
        const key = `${paint.color.r}-${paint.color.g}-${paint.color.b}-${paint.color.a ?? 1}`;
        if (!colors.has(key)) {
          colors.set(key, paint);
        }
        const hex = `${Math.round(paint.color.r * 255).toString(16).padStart(2, '0')}${Math.round(paint.color.g * 255).toString(16).padStart(2, '0')}${Math.round(paint.color.b * 255).toString(16).padStart(2, '0')}`;
        const token = findColorToken(`#${hex}`);
        if (token) {
          colorTokens.add(token);
        }
      }
    });

    if (node.meta?.tokens?.colors?.fillToken) {
      colorTokens.add(node.meta.tokens.colors.fillToken);
    }
    if (node.meta?.tokens?.colors?.textToken) {
      colorTokens.add(node.meta.tokens.colors.textToken);
    }

    if (node.text) {
      const name = node.name ?? `TextStyle-${textStyles.length + 1}`;
      const existing = textStyles.find((style) => style.name === name);
      if (!existing) {
        textStyles.push({
          name,
          fontFamily: node.text.fontFamily,
          fontSize: node.text.fontSize,
          fontWeight: node.text.fontWeight,
          token: node.meta?.tokens?.typography?.token,
        });
      }
    }

    const spacingToken = node.meta?.tokens?.spacing;
    if (spacingToken?.gapToken) {
      spacingTokens.add(spacingToken.gapToken);
    }
    if (spacingToken?.paddingTokens) {
      Object.values(spacingToken.paddingTokens).forEach((token) => {
        if (token) spacingTokens.add(token);
      });
    }

    if (node.meta?.tokens?.shadows?.token) {
      shadowTokens.add(node.meta.tokens.shadows.token);
    }
  });

  return {
    colors: Object.fromEntries(colors.entries()),
    colorTokens: Array.from(colorTokens),
    textStyles,
    spacingTokens: Array.from(spacingTokens),
    shadowTokens: Array.from(shadowTokens),
  };
};

export const staticDesignTokens = designTokens;

