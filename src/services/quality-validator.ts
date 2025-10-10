import { FigmaNodeData } from '../types/figma.types';

export interface QualityReport {
  accuracyScore: number;
  notes: string[];
}

export const evaluateQuality = (nodes: FigmaNodeData[]): QualityReport => {
  if (nodes.length === 0) {
    return {
      accuracyScore: 0,
      notes: ['No nodes generated'],
    };
  }

  const missingSizes = nodes.filter((node) => node.boundingBox.width === 0 || node.boundingBox.height === 0);
  const textNodesWithoutContent = nodes.filter((node) => node.type === 'TEXT' && !node.text?.characters);

  const deductions = missingSizes.length * 0.05 + textNodesWithoutContent.length * 0.1;
  const accuracyScore = Math.max(0, 1 - deductions);

  const notes: string[] = [];
  if (missingSizes.length > 0) {
    notes.push(`${missingSizes.length} nodes are missing explicit width/height`);
  }
  if (textNodesWithoutContent.length > 0) {
    notes.push(`${textNodesWithoutContent.length} text nodes have no characters`);
  }

  return {
    accuracyScore,
    notes,
  };
};
