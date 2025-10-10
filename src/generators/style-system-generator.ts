import { FigmaNodeData, FigmaPaint } from '../types/figma.types';

interface StyleSystem {
  colors: Record<string, FigmaPaint>;
  textStyles: Array<{ name: string; fontFamily?: string; fontSize?: number; fontWeight?: number | string }>;
}

export const generateStyleSystem = (nodes: FigmaNodeData[]): StyleSystem => {
  const colors = new Map<string, FigmaPaint>();
  const textStyles: StyleSystem['textStyles'] = [];

  nodes.forEach((node) => {
    node.fills?.forEach((paint) => {
      if (paint.type === 'SOLID' && paint.color) {
        const key = `${paint.color.r}-${paint.color.g}-${paint.color.b}-${paint.color.a ?? 1}`;
        if (!colors.has(key)) {
          colors.set(key, paint);
        }
      }
    });

    if (node.text) {
      const name = node.name ?? `TextStyle-${textStyles.length + 1}`;
      const existing = textStyles.find((style) => style.name === name);
      if (!existing) {
        textStyles.push({
          name,
          fontFamily: node.text.fontFamily,
          fontSize: node.text.fontSize,
          fontWeight: node.text.fontWeight,
        });
      }
    }
  });

  return {
    colors: Object.fromEntries(colors.entries()),
    textStyles,
  };
};
