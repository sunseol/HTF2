import { FigmaColor, FigmaEffect } from '../types/figma.types';
import { shadowTokens } from '../config/design-tokens';

export interface EffectConversionResult {
  effects: FigmaEffect[];
  token?: string;
}

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
  let working = shadow.trim();
  if (!working || working === 'none') return undefined;

  let inset = false;
  if (/\binset\b/i.test(working)) {
    inset = true;
    working = working.replace(/\binset\b/gi, '').trim();
  }

  let colorToken: string | undefined;
  const colorMatch = working.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
  if (colorMatch) {
    colorToken = colorMatch[1];
    const before = working.slice(0, colorMatch.index ?? 0);
    const after = working.slice((colorMatch.index ?? 0) + colorMatch[1].length);
    working = `${before} ${after}`.trim();
  }

  const lengthTokens = working.split(/\s+/).filter(Boolean);
  if (lengthTokens.length < 2) return undefined;

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

const distanceScore = (a: Required<Pick<FigmaEffect, 'offset' | 'radius' | 'spread'>> & { color?: FigmaColor }, b: { offsetX: number; offsetY: number; blur: number; spread: number; color: string; opacity: number }) => {
  const colorHex = a.color ? `#${[a.color.r, a.color.g, a.color.b].map((component) => Math.round(component * 255).toString(16).padStart(2, '0')).join('')}` : '#000000';
  const hexLower = colorHex.toLowerCase();
  const score =
    Math.abs((a.offset?.x ?? 0) - b.offsetX) +
    Math.abs((a.offset?.y ?? 0) - b.offsetY) +
    Math.abs((a.radius ?? 0) - b.blur) * 0.25 +
    Math.abs((a.spread ?? 0) - b.spread) * 0.25 +
    (hexLower === b.color.toLowerCase() ? 0 : 20);
  return score;
};

const matchShadowToken = (effects: FigmaEffect[]): string | undefined => {
  if (effects.length === 0) return undefined;
  let bestToken: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  shadowTokens.forEach((token) => {
    if (token.layers.length !== effects.length) {
      return;
    }
    let tokenScore = 0;
    for (let index = 0; index < token.layers.length; index += 1) {
      const layer = token.layers[index];
      const effect = effects[index];
      if (!effect.offset || effect.radius === undefined) {
        tokenScore = Number.POSITIVE_INFINITY;
        break;
      }
      tokenScore += distanceScore({
        offset: effect.offset,
        radius: effect.radius ?? 0,
        spread: effect.spread ?? 0,
        color: effect.color,
      }, layer);
    }
    if (tokenScore < bestScore) {
      bestScore = tokenScore;
      bestToken = token.name;
    }
  });

  return bestScore < 25 ? bestToken : undefined;
};

export const convertEffects = (styles: Record<string, string>): EffectConversionResult | undefined => {
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

  if (effects.length === 0) {
    return undefined;
  }

  return {
    effects,
    token: matchShadowToken(effects),
  };
};
