export type FigmaPaintType = "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "IMAGE";

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
  imageData?: string;
  imageUrl?: string;
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
}

export type FigmaEffectType = "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";

export interface FigmaEffect {
  type: FigmaEffectType;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
}

export type LayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";

export interface FigmaNodeData {
  id: string;
  parentId?: string;
  type: "FRAME" | "TEXT" | "VECTOR" | "IMAGE";
  name?: string;
  visible?: boolean;
  boundingBox: { x: number; y: number; width: number; height: number };
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
  cornerRadius?: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
  effects?: FigmaEffect[];
  layoutMode?: LayoutMode;
  itemSpacing?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE" | "STRETCH";
  primaryAxisSizingMode?: "AUTO" | "FIXED";
  counterAxisSizingMode?: "AUTO" | "FIXED";
  primaryAxisAlignContent?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  layoutWrap?: "NO_WRAP" | "WRAP";
  layoutAlign?: "MIN" | "CENTER" | "MAX" | "STRETCH";
  layoutGrow?: number;
  layoutShrink?: number;
  layoutBasis?: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  layoutGrids?: Array<{ pattern: "COLUMNS" | "ROWS"; sectionSize: number; gutterSize: number }>;
  overflowDirection?: "HORIZONTAL" | "VERTICAL" | "BOTH" | "NONE";
  clipsContent?: boolean;
  text?: {
    characters: string;
    fontFamily?: string;
    fontSize?: number;
    fontSizeRem?: number;
    fontWeight?: number | string;
    fontStyle?: string;
    lineHeight?: number;
    lineHeightRem?: number;
    letterSpacing?: number;
    textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
    textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
    textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
    textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
    fills?: FigmaPaint[];
    token?: string;
  };
  constraints?: {
    horizontal: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
    vertical: "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
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
    tokens?: {
      spacing?: {
        gapToken?: string;
        paddingTokens?: { top?: string; right?: string; bottom?: string; left?: string };
        gapRem?: number;
        paddingRem?: { top?: number; right?: number; bottom?: number; left?: number };
      };
      typography?: { token?: string; fontSizeRem?: number; lineHeightRem?: number };
      shadows?: { token?: string };
      colors?: { fillToken?: string; strokeToken?: string; textToken?: string };
      actions?: { role?: string; recommendedRatio?: number; iconSize?: number };
    };
    imageData?: any;
    snapshot?: any;
    accurateImageInfo?: {
      width: number;
      height: number;
      x: number;
      y: number;
      tagName: string;
      src?: string;
    };
    spriteInfo?: {
      x: number;
      y: number;
      width: number;
      height: number;
      originalUrl?: string;
    };
  };
}


