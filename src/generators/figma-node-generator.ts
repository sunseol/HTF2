import { FigmaNodeData } from '../types/figma.types';

export interface FigmaNodeTree extends FigmaNodeData {
  children: FigmaNodeTree[];
}

const buildChildrenMap = (nodes: FigmaNodeData[]): Map<string | undefined, FigmaNodeData[]> => {
  const map = new Map<string | undefined, FigmaNodeData[]>();
  nodes.forEach((node) => {
    const parentId = node.parentId;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(node);
  });
  return map;
};

const attachChildren = (
  node: FigmaNodeData,
  map: Map<string | undefined, FigmaNodeData[]>,
): FigmaNodeTree => {
  const children = map.get(node.id) ?? [];
  return {
    ...node,
    children: children.map((child) => attachChildren(child, map)),
  };
};

export const generateFigmaTree = (nodes: FigmaNodeData[]): FigmaNodeTree | undefined => {
  if (nodes.length === 0) return undefined;
  const map = buildChildrenMap(nodes);
  const rootCandidates = map.get(undefined) ?? [];
  if (rootCandidates.length === 0) {
    return attachChildren(nodes[0], map);
  }
  const root = rootCandidates[0];
  return attachChildren(root, map);
};
