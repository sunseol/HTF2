import { FigmaEffect, FigmaNodeData, FigmaPaint } from './figma.types';

export interface DOMRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HTMLNodeSnapshot {
  id: string;
  parentId?: string;
  tagName: string;
  attributes: Record<string, string>;
  classes: string[];
  textContent: string | null;
  boundingBox: DOMRectLike;
  styles: Record<string, string>;
  children: HTMLNodeSnapshot[];
}

export interface StyleMappingResult {
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  cornerRadius?: FigmaNodeData['cornerRadius'];
  effects?: FigmaEffect[];
  layout?: {
    mode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    gap?: number;
    padding?: { top: number; right: number; bottom: number; left: number };
  };
  typography?: FigmaNodeData['text'];
  constraints?: FigmaNodeData['constraints'];
  overflowDirection?: FigmaNodeData['overflowDirection'];
  clipsContent?: boolean;
}

export interface ConversionMeta {
  errors: string[];
  warnings: string[];
  info: string[];
  assets: {
    images: Array<{ id: string; src: string; hash: string }>;
    fonts: string[];
  };
}

export interface ConversionResult {
  nodes: FigmaNodeData[];
  meta: ConversionMeta;
}
