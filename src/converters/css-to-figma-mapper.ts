import crypto from "crypto";
import { JSDOM } from "jsdom";
import type { FigmaNodeData, FigmaPaint, FigmaColor } from "../types/figma.types";
import type { ConversionResult, HTMLNodeSnapshot, StyleMappingResult } from "../types/converter.types";
import { convertEffects } from "./effect-converter";
import { convertLayoutStyles } from "./layout-converter";
import { convertTypography } from "./typography-converter";
import { findColorToken, toRem } from "../config/design-tokens";
import { logger } from "../utils/logger";

const parseInlineStyles = (style?: string): Record<string, string> => {
  if (!style) return {};
  return style
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, segment) => {
      const [prop, value] = segment.split(/:(.+)/);
      if (!prop || value === undefined) return acc;
      acc[prop.trim().toLowerCase()] = value.trim();
      return acc;
    }, {});
};

const hexToPaint = (value: string): FigmaPaint | undefined => {
  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
  if (!hexMatch) return undefined;
  const hex = hexMatch[1];
  const expand = (component: string) => (component.length === 1 ? component + component : component);
  const r = parseInt(expand(hex.slice(0, hex.length >= 6 ? 2 : 1)), 16) / 255;
  const g = parseInt(expand(hex.slice(hex.length >= 6 ? 2 : 1, hex.length >= 6 ? 4 : 2)), 16) / 255;
  const b = parseInt(expand(hex.slice(hex.length >= 6 ? 4 : 2, hex.length >= 6 ? 6 : 3)), 16) / 255;
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { type: "SOLID", color: { r, g, b, a } };
};

const rgbToPaint = (value: string): FigmaPaint | undefined => {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return undefined;
  const parts = match[1].split(",").map((part) => part.trim());
  const [r, g, b, aRaw] = parts;
  const parseComponent = (component?: string) => {
    if (!component) return 0;
    return component.includes("%") ? parseFloat(component) / 100 : parseFloat(component) / 255;
  };
  return {
    type: "SOLID",
    color: {
      r: parseComponent(r),
      g: parseComponent(g),
      b: parseComponent(b),
      a: aRaw !== undefined ? parseFloat(aRaw) : 1,
    },
  };
};

interface FillConversionResult {
  paints?: FigmaPaint[];
  token?: string;
}

const extractHexFromPaint = (paint?: FigmaPaint): string | undefined => {
  if (!paint?.color) return undefined;
  const { r, g, b } = paint.color;
  const hex = [r, g, b]
    .map((component) => Math.round(component * 255).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
};

const createFillPaints = (styles: Record<string, string>): FillConversionResult => {
  const fills: FigmaPaint[] = [];
  let token: string | undefined;

  const backgroundColor = styles["background-color"];
  const background = styles.background;

  if (backgroundColor && backgroundColor !== "transparent") {
    const paint = hexToPaint(backgroundColor) ?? rgbToPaint(backgroundColor);
    if (paint) {
      fills.push(paint);
      token = findColorToken(backgroundColor.toLowerCase()) ?? token;
    }
  }

  if (background && background.includes("linear-gradient")) {
    const gradientMatch = background.match(/linear-gradient\(([^)]+)\)/i);
    if (gradientMatch) {
      const [, gradientBody] = gradientMatch;
      const segments = gradientBody.split(",").map((segment) => segment.trim());
      const gradientStops: Array<{ position: number; color: NonNullable<FigmaPaint["color"]> }> = [];

      segments.slice(1).forEach((segment) => {
        const [colorToken, positionToken] = segment.split(/\s+(?=\d)/);
        const paint = colorToken ? hexToPaint(colorToken) ?? rgbToPaint(colorToken) : undefined;
        if (!paint || !paint.color) return;
        const position = positionToken ? parseFloat(positionToken) / 100 : gradientStops.length === 0 ? 0 : 1;
        gradientStops.push({ position, color: paint.color });
      });

      if (gradientStops.length > 0) {
        fills.push({
          type: "GRADIENT_LINEAR",
          gradientStops,
          gradientHandlePositions: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
        });
      }
    }
  }

  if (fills.length === 0) {
    return { paints: undefined, token: undefined };
  }

  if (!token) {
    token = findColorToken(extractHexFromPaint(fills[0]));
  }

  return { paints: fills, token };
};

interface StrokeConversionResult {
  paints?: FigmaPaint[];
  token?: string;
  weight?: number;
  align?: "INSIDE" | "OUTSIDE" | "CENTER";
}

const hasBorderStyle = (styles: Record<string, string>): boolean => {
  const styleKeys = ["border-style", "border-top-style", "border-right-style", "border-bottom-style", "border-left-style"];
  return styleKeys.some((key) => {
    const value = styles[key];
    return value && value !== "none";
  });
};

const parseBorderWidths = (styles: Record<string, string>): number[] => {
  const widthKeys = ["border-width", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width"];
  return widthKeys
    .map((key) => parseNumeric(styles[key]))
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
};

const createStrokePaints = (styles: Record<string, string>): StrokeConversionResult => {
  const splitCssValues = (value?: string): string[] => {
    if (!value) return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    const tokens: string[] = [];
    let current = '';
    let depth = 0;
    for (const char of trimmed) {
      if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth = Math.max(0, depth - 1);
      }
      if (char === ' ' && depth === 0) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current) {
      tokens.push(current);
    }
    return tokens;
  };

  const valueForSide = (values: string[], index: number): string | undefined => {
    if (values.length === 0) return undefined;
    if (values.length === 1) return values[0];
    if (values.length === 2) return index % 2 === 0 ? values[0] : values[1];
    if (values.length === 3) {
      if (index === 0) return values[0];
      if (index === 2) return values[2];
      return values[1];
    }
    return values[index] ?? values[0];
  };

  const borderWidthTokens = splitCssValues(styles['border-width']);
  const borderColorTokens = splitCssValues(styles['border-color']);
  const borderStyleTokens = splitCssValues(styles['border-style']);

  const sides = ['top', 'right', 'bottom', 'left'].map((side, index) => {
    const width = parseNumeric(styles[`border-${side}-width`]) ?? parseNumeric(valueForSide(borderWidthTokens, index)) ?? 0;
    const colorValue = styles[`border-${side}-color`] ?? valueForSide(borderColorTokens, index);
    const styleValue = (styles[`border-${side}-style`] ?? valueForSide(borderStyleTokens, index) ?? '').toLowerCase();
    const paint = colorValue ? hexToPaint(colorValue) ?? rgbToPaint(colorValue) : undefined;
    const alpha = paint?.color?.a ?? 1;
    return {
      width,
      colorValue,
      paint,
      style: styleValue,
      alpha,
    };
  });

  const visibleSides = sides.filter((side) => side.width > 0 && side.style && side.style !== 'none' && side.alpha > 0);
  if (visibleSides.length === 0) {
    return { paints: undefined, token: undefined, weight: undefined, align: undefined };
  }

  const maxWidth = Math.max(...visibleSides.map((side) => side.width));
  if (maxWidth <= 0) {
    return { paints: undefined, token: undefined, weight: undefined, align: undefined };
  }

  const chosenSide = visibleSides[0];
  const paint = chosenSide.paint ?? (() => {
    const fallback = styles["border-color"] ?? styles.border;
    return fallback ? hexToPaint(fallback) ?? rgbToPaint(fallback) : undefined;
  })();

  if (!paint || (paint.color?.a !== undefined && paint.color.a <= 0)) {
    return { paints: undefined, token: undefined, weight: undefined, align: undefined };
  }

  const borderColorTokenSource = chosenSide.colorValue ?? styles["border-color"] ?? styles.border ?? '';
  const token = borderColorTokenSource
    ? findColorToken(borderColorTokenSource.toLowerCase()) ?? findColorToken(extractHexFromPaint(paint))
    : findColorToken(extractHexFromPaint(paint));

  return {
    paints: [paint],
    token,
    weight: maxWidth,
    align: "CENTER",
  };
};

const parseNumeric = (value?: string): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/(-?\d*\.?\d+)/);
  return match ? parseFloat(match[1]) : undefined;
};

const deriveBoundingBox = (styles: Record<string, string>): { width: number; height: number } => {
  const width = parseNumeric(styles.width) ?? 0;
  const height = parseNumeric(styles.height) ?? 0;
  return { width, height };
};

const snapshotElement = (element: Element, parentId?: string): HTMLNodeSnapshot => {
  const id = crypto.randomUUID();
  const attributes = Array.from(element.attributes).reduce<Record<string, string>>((acc, attr) => {
    acc[attr.name] = attr.value;
    return acc;
  }, {});
  const styles = parseInlineStyles(attributes.style);
  const classes = (attributes.class ?? "").split(/\s+/).filter(Boolean);
  const boundingBox = { x: 0, y: 0, ...deriveBoundingBox(styles) };

  const children = Array.from(element.children).map((child) => snapshotElement(child, id));
  const textContent = element.childElementCount === 0 ? element.textContent?.trim() ?? null : null;

  return {
    id,
    parentId,
    tagName: element.tagName.toLowerCase(),
    attributes,
    classes,
    textContent,
    boundingBox,
    styles,
    children,
  };
};

const colorFromPaint = (paint?: FigmaPaint): string | undefined => {
  if (!paint || !paint.color) return undefined;
  const { r, g, b } = paint.color;
  return `#${[r, g, b].map((component) => Math.round(component * 255).toString(16).padStart(2, "0")).join("")}`;
};

const mapStylesToFigma = (snapshot: HTMLNodeSnapshot): StyleMappingResult => {
  const fillResult = createFillPaints(snapshot.styles);
  const strokeResult = createStrokePaints(snapshot.styles);
  const effectsResult = convertEffects(snapshot.styles);
  const layout = convertLayoutStyles(snapshot.styles);
  const typography = snapshot.textContent ? convertTypography(snapshot.textContent, snapshot.styles) : undefined;
  const borderRadius = parseNumeric(snapshot.styles["border-radius"]);

  let fills = fillResult.paints;
  let strokes = strokeResult.paints;
  let effects = effectsResult?.effects ? [...effectsResult.effects] : undefined;
  let shadowToken = effectsResult?.token;

  const textColorToken = typography?.fills && typography.fills.length > 0
    ? findColorToken(colorFromPaint(typography.fills[0]))
    : undefined;

  const tokens: NonNullable<StyleMappingResult["tokens"]> = {};

  const toLayoutAlign = (value?: string): StyleMappingResult["layoutAlign"] => {
    if (!value || value === "auto") return undefined;
    switch (value) {
      case "flex-start":
      case "start":
        return "MIN";
      case "center":
        return "CENTER";
      case "flex-end":
      case "end":
        return "MAX";
      case "stretch":
        return "STRETCH";
      default:
        return undefined;
    }
  };

  const parseFlexNumber = (value?: string): number | undefined => {
    if (!value) return undefined;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  let layoutAlign = toLayoutAlign(snapshot.styles["align-self"]?.trim());
  const layoutGrow = parseFlexNumber(snapshot.styles["flex-grow"]);
  const layoutShrink = parseFlexNumber(snapshot.styles["flex-shrink"]);
  const layoutBasis = parseNumeric(snapshot.styles["flex-basis"]);

  const positionRaw = snapshot.styles.position?.trim();
  const layoutPositioning = positionRaw === "absolute" || positionRaw === "fixed" ? "ABSOLUTE" : undefined;

  // Detect center alignment from margins or text-align
  if (!layoutAlign) {
    // margin: auto centering
    if (snapshot.styles["margin-left"] === "auto" && snapshot.styles["margin-right"] === "auto") {
      layoutAlign = "CENTER";
    }
    // Check if element looks centered based on position (for elements with explicit left/right positioning)
    else if (snapshot.styles["left"] && snapshot.styles["right"]) {
      const left = parseNumeric(snapshot.styles["left"]) ?? 0;
      const right = parseNumeric(snapshot.styles["right"]) ?? 0;
      // If left and right are equal, it's centered
      if (Math.abs(left - right) < 10) {
        layoutAlign = "CENTER";
      }
    }
    // Check transform: translateX(-50%) pattern (common for centering)
    else if (snapshot.styles["transform"]?.includes("translateX") && snapshot.styles["left"] === "50%") {
      layoutAlign = "CENTER";
    }
  }

  if (layout?.gapToken || layout?.paddingTokens) {
    tokens.spacing = {
      gapToken: layout?.gapToken,
      paddingTokens: layout?.paddingTokens,
      gapRem: toRem(layout?.gap),
      paddingRem: layout?.paddingRem,
    };
  }

  if (typography?.token) {
    tokens.typography = {
      token: typography.token,
      fontSizeRem: typography.fontSizeRem,
      lineHeightRem: typography.lineHeightRem,
    };
  }

  if (fillResult.token || strokeResult.token || textColorToken) {
    tokens.colors = {
      fillToken: fillResult.token,
      strokeToken: strokeResult.token,
      textToken: textColorToken,
    };
  }

  if (shadowToken) {
    tokens.shadows = { token: shadowToken };
  }

  const classesLower = snapshot.classes.map((cls) => cls.toLowerCase());
  const classString = classesLower.join(" ");

  const isButton = snapshot.tagName === "button"
    || snapshot.attributes.role === "button"
    || /btn|button/.test(classString);

  if (isButton) {
    const isPrimary = /primary/.test(classString) || /cta/.test(classString);
    const baseHeight = snapshot.boundingBox.height || typography?.lineHeight || 0;
    const targetRatio = isPrimary ? 1.4 : 1.2;
    if (baseHeight > 0) {
      const minimumWidth = Math.round(baseHeight * targetRatio);
      if (!Number.isNaN(minimumWidth) && minimumWidth > snapshot.boundingBox.width) {
        snapshot.boundingBox.width = minimumWidth;
      }
    }
    tokens.actions = {
      ...(tokens.actions ?? {}),
      role: isPrimary ? "primary" : "secondary",
      recommendedRatio: targetRatio,
    };
  }

  const isSvgElement = snapshot.tagName === "svg";
  const boundingWidth = snapshot.boundingBox?.width ?? 0;
  const boundingHeight = snapshot.boundingBox?.height ?? 0;
  const classIndicatesLogo = /logo/.test(classString);
  const classIndicatesIcon = /icon/.test(classString);
  const isSmallGraphic = (boundingWidth > 0 && boundingHeight > 0)
    ? Math.max(boundingWidth, boundingHeight) <= 96
    : true;
  const isIcon = !classIndicatesLogo && isSmallGraphic && (isSvgElement || classIndicatesIcon);
  const isRoundIcon = isIcon && /round|circle/.test(classString);
  if (isIcon) {
    const targetSize = isRoundIcon ? 24 : 20;
    snapshot.boundingBox.width = targetSize;
    snapshot.boundingBox.height = targetSize;
    tokens.actions = {
      ...(tokens.actions ?? {}),
      iconSize: targetSize,
    };
  }

  const isAvatar = /avatar/.test(classString) || snapshot.attributes["data-avatar"] !== undefined;
  if (isAvatar) {
    if (!strokes || strokes.length === 0) {
      const accentPaint = hexToPaint("#4f46e5");
      if (accentPaint) {
        strokes = [accentPaint];
      }
    }
    const dropShadow = {
      type: "DROP_SHADOW" as const,
      offset: { x: 0, y: 4 },
      radius: 12,
      spread: -2,
      color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.22 },
      visible: true,
    };
    const innerShadow = {
      type: "INNER_SHADOW" as const,
      offset: { x: 0, y: 2 },
      radius: 6,
      spread: 0,
      color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.16 },
      visible: true,
    };
    effects = effects ? [...effects, dropShadow, innerShadow] : [dropShadow, innerShadow];
    shadowToken = shadowToken ?? "elevation-sm";
    tokens.shadows = { token: shadowToken };
  }

  if (strokeResult.token) {
    tokens.colors = tokens.colors ?? {};
    tokens.colors.strokeToken = strokeResult.token;
  }

  const hasTokens = Object.keys(tokens).length > 0;

  return {
    fills,
    fillToken: fillResult.token,
    strokes,
    strokeToken: strokeResult.token,
    effects,
    shadowToken,
    layout,
    typography,
    cornerRadius: borderRadius,
    strokeWeight: strokeResult.weight,
    strokeAlign: strokeResult.align,
    clipsContent: layout?.clipsContent,
    overflowDirection: layout?.overflowDirection,
    layoutAlign,
    layoutGrow,
    layoutShrink,
    layoutBasis,
    layoutPositioning,
    tokens: hasTokens ? tokens : undefined,
  };
};

const toFigmaNode = (snapshot: HTMLNodeSnapshot, styles: StyleMappingResult): FigmaNodeData => {
  // Determine node type - check for images first
  let nodeType: FigmaNodeData["type"] = "FRAME";

  // Check if snapshot has image data
  const hasImageData = !!(snapshot.imageData && snapshot.imageData.startsWith('data:image/'));

  if (snapshot.textContent && !hasImageData) {
    nodeType = "TEXT";
  } else if ((snapshot.tagName === 'img' || snapshot.tagName === 'svg') && hasImageData) {
    // Only mark as IMAGE if we have actual image data
    nodeType = "IMAGE";
  } else if (snapshot.tagName === 'img' || snapshot.tagName === 'svg') {
    // SVG or IMG without image data stays as FRAME (will be processed later)
    nodeType = "FRAME";
  }

  const metaTokens = styles.tokens;

  // Enhanced meta information with CSS variables and layout info
  const enhancedMeta = {
    htmlTag: snapshot.tagName,
    classes: snapshot.classes,
    attributes: snapshot.attributes,
    tokens: metaTokens,
    cssVariables: snapshot.cssVariables,
    layoutInfo: snapshot.layoutInfo,
    gridLayout: (styles.layout as any)?.gridLayout,
    imageData: snapshot.imageData, // Pass through base64 image data
    isDownloadedImage: snapshot.isDownloadedImage, // Track if image was downloaded
  };

  return {
    id: snapshot.id,
    parentId: snapshot.parentId,
    type: nodeType,
    name: snapshot.attributes.id || snapshot.tagName,
    boundingBox: {
      x: snapshot.boundingBox.x,
      y: snapshot.boundingBox.y,
      width: snapshot.boundingBox.width,
      height: snapshot.boundingBox.height,
    },
    fills: styles.fills,
    strokes: styles.strokes,
    strokeWeight: styles.strokeWeight,
    strokeAlign: styles.strokeAlign,
    effects: styles.effects,
    layoutMode: styles.layout?.mode,
    itemSpacing: styles.layout?.gap,
    padding: styles.layout?.padding,
    primaryAxisAlignItems: styles.layout?.primaryAxisAlignItems,
    counterAxisAlignItems: styles.layout?.counterAxisAlignItems,
    primaryAxisSizingMode: styles.layout?.primaryAxisSizingMode,
    counterAxisSizingMode: styles.layout?.counterAxisSizingMode,
    primaryAxisAlignContent: styles.layout?.primaryAxisAlignContent,
    layoutWrap: styles.layout?.layoutWrap,
    overflowDirection: styles.overflowDirection,
    clipsContent: styles.clipsContent,
    cornerRadius: styles.cornerRadius,
    layoutAlign: styles.layoutAlign,
    layoutGrow: styles.layoutGrow,
    layoutShrink: styles.layoutShrink,
    layoutBasis: styles.layoutBasis,
    layoutPositioning: styles.layoutPositioning,
    text: styles.typography,
    meta: enhancedMeta,
  };
};

const NON_VISUAL_TAGS = new Set(['script', 'style', 'noscript', 'template', 'meta', 'link']);

const convertSnapshotTree = (rootSnapshot: HTMLNodeSnapshot): ConversionResult => {
  const queue: HTMLNodeSnapshot[] = [rootSnapshot];
  const nodes: FigmaNodeData[] = [];

  // Extract design tokens from global CSS variables
  const { extractDesignTokensFromCSSVariables } = require('../config/design-tokens');
  const extractedTokens = rootSnapshot.globalCssVariables
    ? extractDesignTokensFromCSSVariables(rootSnapshot.globalCssVariables)
    : undefined;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (NON_VISUAL_TAGS.has(current.tagName)) {
      continue;
    }
    const { width, height } = current.boundingBox;
    if (width === 0 && height === 0 && !current.textContent) {
      continue;
    }
    const mapping = mapStylesToFigma(current);
    const node = toFigmaNode(current, mapping);
    nodes.push(node);
    queue.unshift(...current.children);
  }

  // Process images
  const { processImagesInTree, enhanceImageNodes } = require('../services/image-processing-service');
  const images = processImagesInTree(rootSnapshot);
  const nodesWithImages = enhanceImageNodes(nodes, images);

  // Recognize component patterns
  const { recognizeComponentsInTree, applyComponentPatternsToFigmaNodes } = require('../services/component-pattern-recognition');
  const recognizedComponents = recognizeComponentsInTree(rootSnapshot);
  const nodesWithPatterns = applyComponentPatternsToFigmaNodes(nodesWithImages, recognizedComponents);

  // Count recognized components by type
  const componentCounts = recognizedComponents.reduce((acc: Record<string, number>, component: any) => {
    const type = component.pattern.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Validate conversion quality
  const { validateConversionTree, getQualityGrade, generateQualityReport } = require('../services/quality-validation');
  let { summary } = validateConversionTree(rootSnapshot, nodesWithPatterns);
  let qualityGrade = getQualityGrade(summary.overallScore);
  let qualityReport = generateQualityReport(summary);

  logger.info('Conversion quality validation (before correction)', {
    overallScore: summary.overallScore,
    grade: qualityGrade,
    issuesCount: summary.issues.length,
  });

  // Auto-correct issues if quality score is below threshold
  let correctedNodes = nodesWithPatterns;
  let corrections: Map<string, any[]> | undefined;

  if (summary.overallScore < 90 && summary.issues.length > 0) {
    const { autoCorrectTree } = require('../services/auto-correction');
    const correctionResult = autoCorrectTree(rootSnapshot, nodesWithPatterns, summary.issues);
    correctedNodes = correctionResult.nodes;
    corrections = correctionResult.corrections;

    // Re-validate after corrections
    const revalidated = validateConversionTree(rootSnapshot, correctedNodes);
    summary = revalidated.summary;
    qualityGrade = getQualityGrade(summary.overallScore);
    qualityReport = generateQualityReport(summary);

    logger.info('Auto-correction applied', {
      correctionsMade: corrections ? Array.from(corrections.values()).reduce((sum, c) => sum + c.length, 0) : 0,
      nodesAffected: corrections ? corrections.size : 0,
      newScore: summary.overallScore,
      newGrade: qualityGrade,
    });
  }

  return {
    nodes: correctedNodes,
    meta: {
      assets: { images: [], fonts: [] },
      errors: summary.issues.filter((i: any) => i.severity === 'error').map((i: any) => i.message),
      warnings: summary.issues.filter((i: any) => i.severity === 'warning').map((i: any) => i.message),
      info: [
        `Converted ${correctedNodes.length} nodes`,
        `Recognized ${recognizedComponents.length} components: ${Object.entries(componentCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
        `Quality Score: ${summary.overallScore}/100 (Grade: ${qualityGrade})`,
        corrections ? `Auto-corrections applied: ${Array.from(corrections.values()).reduce((sum, c) => sum + c.length, 0)} changes to ${corrections.size} nodes` : '',
        ...summary.issues.filter((i: any) => i.severity === 'info').map((i: any) => i.message),
      ].filter(Boolean),
      tokens: extractedTokens ? {
        static: require('../config/design-tokens').designTokens,
        detected: {
          colors: Object.keys(extractedTokens.colors),
          spacing: Object.keys(extractedTokens.spacing),
          shadows: Object.keys(extractedTokens.shadows),
          typography: Object.keys(extractedTokens.typography).map(key => ({ [key]: extractedTokens.typography[key] })),
        },
      } : undefined,
      components: {
        recognized: recognizedComponents,
        counts: componentCounts,
      },
      quality: {
        summary,
        grade: qualityGrade,
        report: qualityReport,
        corrections: corrections ? Array.from(corrections.entries()).map(([nodeId, changes]) => ({
          nodeId,
          changes,
        })) : [],
      },
    },
  };
};

export const convertSnapshotToFigma = (rootSnapshot: HTMLNodeSnapshot): ConversionResult => convertSnapshotTree(rootSnapshot);

export const convertHtmlToFigma = (html: string): ConversionResult => {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const root = document.body;
  const rootSnapshot = snapshotElement(root);
  return convertSnapshotTree(rootSnapshot);
};

