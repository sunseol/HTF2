import { FigmaEffect, FigmaNodeData, FigmaPaint } from "./figma.types";

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
  cssVariables?: Record<string, string>;
  globalCssVariables?: Record<string, string>;
  layoutInfo?: {
    isFlexContainer: boolean;
    isGridContainer: boolean;
  };
  imageData?: string; // base64 encoded image data
  isDownloadedImage?: boolean; // 다운로드된 이미지인지 구분
  children: HTMLNodeSnapshot[];
}

export interface StyleMappingResult {
  fills?: FigmaPaint[];
  fillToken?: string;
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
  strokeToken?: string;
  cornerRadius?: FigmaNodeData["cornerRadius"];
  effects?: FigmaEffect[];
  shadowToken?: string;
  layout?: {
    mode: "NONE" | "HORIZONTAL" | "VERTICAL";
    gap?: number;
    gapToken?: string;
    padding?: { top: number; right: number; bottom: number; left: number };
    paddingTokens?: { top: string; right: string; bottom: string; left: string };
    paddingRem?: { top?: number; right?: number; bottom?: number; left?: number };
    primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE" | "STRETCH";
    primaryAxisSizingMode?: "AUTO" | "FIXED";
    counterAxisSizingMode?: "AUTO" | "FIXED";
    primaryAxisAlignContent?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    layoutWrap?: "NO_WRAP" | "WRAP";
  };
  typography?: (FigmaNodeData["text"] & { token?: string; fontSizeRem?: number; lineHeightRem?: number }) | undefined;
  constraints?: FigmaNodeData["constraints"];
  overflowDirection?: FigmaNodeData["overflowDirection"];
  clipsContent?: boolean;
  layoutAlign?: "MIN" | "CENTER" | "MAX" | "STRETCH";
  layoutGrow?: number;
  layoutShrink?: number;
  layoutBasis?: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";
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
}

export interface ConversionMeta {
  errors: string[];
  warnings: string[];
  info: string[];
  assets: {
    images: Array<{ id: string; src: string; hash: string }>;
    fonts: string[];
  };
  tokens?: {
    static: unknown;
    detected: {
      colors?: string[];
      spacing?: string[];
      shadows?: string[];
      typography?: Array<Record<string, unknown>>;
    };
  };
  components?: unknown;
  quality?: unknown;
}

export interface ConversionResult {
  nodes: FigmaNodeData[];
  meta: ConversionMeta;
}

