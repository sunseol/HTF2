export type VisionSuggestionValue = string | number | boolean | Record<string, unknown> | Array<unknown>;

export interface VisionSuggestion {
  property: string;
  value: VisionSuggestionValue;
  confidence?: number;
  summary?: string;
}

export interface VisionAnnotationTarget {
  nodeId?: string;
  htmlTag?: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface VisionAnnotation {
  target: VisionAnnotationTarget;
  suggestions: VisionSuggestion[];
}

export interface VisionAnalysis {
  source: 'ai' | 'heuristic';
  model?: string;
  summary: string;
  annotations: VisionAnnotation[];
  issues?: string[];
  rawModelOutput?: unknown;
}
