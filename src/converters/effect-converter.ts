import { FigmaColor, FigmaEffect } from '../types/figma.types';

const parseColor = (value?: string): FigmaColor | undefined => {
  if (!value) return undefined;
  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      const [r, g, b] = hex.split('').map((char) => parseInt(char + char, 16) / 255);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }
  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const [r, g, b, a] = rgbMatch[1]
      .split(',')
      .map((component) => component.trim())
      .map((component) => (component.includes('%') ? (parseFloat(component) / 100) * 255 : parseFloat(component)));
    return {
      r: (r ?? 0) / 255,
      g: (g ?? 0) / 255,
      b: (b ?? 0) / 255,
      a: a !== undefined ? a : 1,
    };
  }
  return undefined;
};

const parseLength = (value?: string): number => {
  if (!value) return 0;
  const match = value.match(/(-?\d*\.?\d+)/);
  return match ? parseFloat(match[1]) : 0;
};

const parseSingleShadow = (shadow: string): FigmaEffect | undefined => {
  const tokens = shadow.trim().split(/\s+/);
  if (tokens.length < 3) return undefined;

  let inset = false;
  let colorToken: string | undefined;
  const lengthTokens: string[] = [];

  tokens.forEach((token) => {
    if (token === 'inset') {
      inset = true;
      return;
    }
    if (token.startsWith('#') || token.startsWith('rgb')) {
      colorToken = token;
      return;
    }
    lengthTokens.push(token);
  });

  const [offsetXRaw, offsetYRaw, blurRaw, spreadRaw] = lengthTokens;
  const offset = { x: parseLength(offsetXRaw), y: parseLength(offsetYRaw) };
  const radius = parseLength(blurRaw);
  const spread = spreadRaw ? parseLength(spreadRaw) : undefined;
  const color = parseColor(colorToken ?? '#000000');

  return {
    type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
    offset,
    radius,
    spread,
    color,
    visible: true,
  };
};

export const convertEffects = (styles: Record<string, string>): FigmaEffect[] | undefined => {
  const effects: FigmaEffect[] = [];
  const boxShadow = styles['box-shadow'];
  const filter = styles.filter;

  if (boxShadow && boxShadow !== 'none') {
    const shadowStrings = boxShadow.split(/,(?![^\(]*\))/);
    shadowStrings.forEach((shadow) => {
      const parsed = parseSingleShadow(shadow);
      if (parsed) effects.push(parsed);
    });
  }

  if (filter && filter.includes('blur')) {
    const blurMatch = filter.match(/blur\(([^)]+)\)/);
    if (blurMatch) {
      const radius = parseLength(blurMatch[1]);
      effects.push({
        type: 'LAYER_BLUR',
        radius,
        visible: true,
      });
    }
  }

  return effects.length > 0 ? effects : undefined;
};
