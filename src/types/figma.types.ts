export type FigmaPaintType = 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaPaint {
  type: FigmaPaintType;
  color?: FigmaColor;
  opacity?: number;
  gradientStops?: Array<{ position: number; color: FigmaColor }>;
  gradientHandlePositions?: Array<{ x: number; y: number }>;
  imageRef?: string;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}

export type FigmaEffectType = 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';

export interface FigmaEffect {
  type: FigmaEffectType;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
}

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

export interface FigmaNodeData {
  id: string;
  parentId?: string;
  type: 'FRAME' | 'TEXT' | 'VECTOR' | 'IMAGE';
  name?: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  cornerRadius?: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
  effects?: FigmaEffect[];
  layoutMode?: LayoutMode;
  itemSpacing?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  layoutGrids?: Array<{ pattern: 'COLUMNS' | 'ROWS'; sectionSize: number; gutterSize: number }>;
  overflowDirection?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH' | 'NONE';
  clipsContent?: boolean;
  text?: {
    characters: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    fills?: FigmaPaint[];
  };
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
  meta?: {
    htmlTag?: string;
    classes?: string[];
    id?: string;
    attributes?: Record<string, string>;
    aiInsights?: Array<{
      property: string;
      value: unknown;
      confidence?: number;
      summary?: string;
      source?: string;
    }>;
  };
}

