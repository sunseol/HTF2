import { FigmaNodeData } from '../types/figma.types';

export interface ComponentDefinition {
  key: string;
  name: string;
  instances: FigmaNodeData[];
}

const serializeNodeStructure = (node: FigmaNodeData): string => {
  return JSON.stringify({
    type: node.type,
    name: node.name,
    fills: node.fills,
    strokes: node.strokes,
    text: node.text?.characters,
  });
};

export const detectComponentPatterns = (nodes: FigmaNodeData[]): ComponentDefinition[] => {
  const buckets = new Map<string, ComponentDefinition>();

  nodes.forEach((node) => {
    const signature = serializeNodeStructure(node);
    if (!buckets.has(signature)) {
      buckets.set(signature, {
        key: signature,
        name: node.name ?? `Component-${buckets.size + 1}`,
        instances: [],
      });
    }
    buckets.get(signature)!.instances.push(node);
  });

  return Array.from(buckets.values()).filter((component) => component.instances.length > 1);
};
