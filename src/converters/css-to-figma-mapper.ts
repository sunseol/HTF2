import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import type { FigmaNodeData, FigmaPaint } from '../types/figma.types';
import type { ConversionResult, HTMLNodeSnapshot, StyleMappingResult } from '../types/converter.types';
import { convertEffects } from './effect-converter';
import { convertLayoutStyles } from './layout-converter';
import { convertTypography } from './typography-converter';

const parseInlineStyles = (style?: string): Record<string, string> => {
  if (!style) return {};
  return style
    .split(';')
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
  return { type: 'SOLID', color: { r, g, b, a } };
};

const rgbToPaint = (value: string): FigmaPaint | undefined => {
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return undefined;
  const parts = match[1].split(',').map((part) => part.trim());
  const [r, g, b, aRaw] = parts;
  const parseComponent = (component?: string) => {
    if (!component) return 0;
    return component.includes('%') ? parseFloat(component) / 100 : parseFloat(component) / 255;
  };
  return {
    type: 'SOLID',
    color: {
      r: parseComponent(r),
      g: parseComponent(g),
      b: parseComponent(b),
      a: aRaw !== undefined ? parseFloat(aRaw) : 1,
    },
  };
};

const createFillPaints = (styles: Record<string, string>): FigmaPaint[] | undefined => {
  const fills: FigmaPaint[] = [];
  const backgroundColor = styles['background-color'];
  const background = styles.background;

  if (backgroundColor && backgroundColor !== 'transparent') {
    const paint = hexToPaint(backgroundColor) ?? rgbToPaint(backgroundColor);
    if (paint) fills.push(paint);
  }

  if (background && background.includes('linear-gradient')) {
    const gradientMatch = background.match(/linear-gradient\(([^)]+)\)/i);
    if (gradientMatch) {
      const [, gradientBody] = gradientMatch;
      const segments = gradientBody.split(',').map((segment) => segment.trim());
      const gradientStops: Array<{ position: number; color: NonNullable<FigmaPaint['color']> }> = [];

      segments.slice(1).forEach((segment) => {
        const [colorToken, positionToken] = segment.split(/\s+(?=\d)/);
        const paint = colorToken ? hexToPaint(colorToken) ?? rgbToPaint(colorToken) : undefined;
        if (!paint || !paint.color) return;
        const position = positionToken ? parseFloat(positionToken) / 100 : gradientStops.length === 0 ? 0 : 1;
        gradientStops.push({ position, color: paint.color });
      });

      if (gradientStops.length > 0) {
        fills.push({
          type: 'GRADIENT_LINEAR',
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

  return fills.length > 0 ? fills : undefined;
};

const createStrokePaints = (styles: Record<string, string>): FigmaPaint[] | undefined => {
  const borderColor = styles['border-color'] ?? styles['border'];
  if (!borderColor || borderColor === 'none') return undefined;
  const paint = hexToPaint(borderColor) ?? rgbToPaint(borderColor);
  return paint ? [paint] : undefined;
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
  const classes = (attributes.class ?? '').split(/\s+/).filter(Boolean);
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

const mapStylesToFigma = (snapshot: HTMLNodeSnapshot): StyleMappingResult => {
  const fills = createFillPaints(snapshot.styles);
  const strokes = createStrokePaints(snapshot.styles);
  const effects = convertEffects(snapshot.styles);
  const layout = convertLayoutStyles(snapshot.styles);
  const typography = snapshot.textContent ? convertTypography(snapshot.textContent, snapshot.styles) : undefined;
  const borderRadius = parseNumeric(snapshot.styles['border-radius']);

  return {
    fills,
    strokes,
    effects,
    layout,
    typography,
    cornerRadius: borderRadius,
    clipsContent: layout?.clipsContent,
    overflowDirection: layout?.overflowDirection,
  };
};

const toFigmaNode = (snapshot: HTMLNodeSnapshot, styles: StyleMappingResult): FigmaNodeData => {
  const nodeType: FigmaNodeData['type'] = snapshot.textContent ? 'TEXT' : 'FRAME';
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
    effects: styles.effects,
    layoutMode: styles.layout?.mode,
    itemSpacing: styles.layout?.gap,
    padding: styles.layout?.padding,
    overflowDirection: styles.overflowDirection,
    clipsContent: styles.clipsContent,
    cornerRadius: styles.cornerRadius,
    text: styles.typography,
    meta: {
      htmlTag: snapshot.tagName,
      classes: snapshot.classes,
      attributes: snapshot.attributes,
    },
  };
};

const convertSnapshotTree = (rootSnapshot: HTMLNodeSnapshot): ConversionResult => {
  const queue: HTMLNodeSnapshot[] = [rootSnapshot];
  const nodes: FigmaNodeData[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const mapping = mapStylesToFigma(current);
    const node = toFigmaNode(current, mapping);
    nodes.push(node);
    queue.unshift(...current.children);
  }

  return {
    nodes,
    meta: {
      assets: { images: [], fonts: [] },
      errors: [],
      warnings: [],
      info: [`Converted ${nodes.length} nodes`],
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

