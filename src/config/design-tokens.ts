export const BASE_FONT_SIZE = 16;

export const spacingScale = {
  'spacing-0': 0,
  'spacing-1': 4,
  'spacing-2': 8,
  'spacing-3': 12,
  'spacing-4': 16,
  'spacing-5': 24,
  'spacing-6': 32,
  'spacing-7': 40,
  'spacing-8': 48,
  'spacing-9': 64,
  'spacing-10': 80,
  'spacing-11': 96,
  'spacing-12': 120,
} as const;
export type SpacingToken = keyof typeof spacingScale;

const spacingValues = Object.values(spacingScale);

export const snapSpacing = (value?: number): { value: number; token: SpacingToken } | undefined => {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  const nearest = spacingValues.reduce((best, candidate) => {
    const currentDistance = Math.abs(candidate - value);
    const bestDistance = Math.abs(best - value);
    if (currentDistance < bestDistance) {
      return candidate;
    }
    if (currentDistance === bestDistance && candidate < best) {
      return candidate;
    }
    return best;
  }, spacingValues[0]);

  const tokenEntry = Object.entries(spacingScale).find(([, px]) => px === nearest);
  return tokenEntry ? { value: tokenEntry[1], token: tokenEntry[0] as SpacingToken } : undefined;
};

export const toRem = (px?: number): number | undefined => {
  if (px === undefined || Number.isNaN(px)) return undefined;
  return parseFloat((px / BASE_FONT_SIZE).toFixed(3));
};

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export const typographyTokens: TypographyToken[] = [
  { name: 'heading-xl', fontFamily: 'Inter', fontSize: 40, fontWeight: 700, lineHeight: 48, letterSpacing: -0.5 },
  { name: 'heading-lg', fontFamily: 'Inter', fontSize: 32, fontWeight: 700, lineHeight: 40, letterSpacing: -0.25 },
  { name: 'heading-md', fontFamily: 'Inter', fontSize: 24, fontWeight: 600, lineHeight: 32, letterSpacing: 0 },
  { name: 'heading-sm', fontFamily: 'Inter', fontSize: 20, fontWeight: 600, lineHeight: 28, letterSpacing: 0 },
  { name: 'body-lg', fontFamily: 'Inter', fontSize: 18, fontWeight: 500, lineHeight: 28, letterSpacing: 0 },
  { name: 'body-md', fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 24, letterSpacing: 0 },
  { name: 'body-sm', fontFamily: 'Inter', fontSize: 14, fontWeight: 400, lineHeight: 20, letterSpacing: 0 },
  { name: 'label-sm', fontFamily: 'Inter', fontSize: 12, fontWeight: 500, lineHeight: 16, letterSpacing: 0.4 },
];

export const findTypographyToken = (
  fontFamily?: string,
  fontSize?: number,
  fontWeight?: number | string,
  lineHeight?: number,
  letterSpacing?: number,
): TypographyToken | undefined => {
  if (!fontSize) return undefined;
  const normalizedWeight = typeof fontWeight === 'string' ? parseInt(fontWeight, 10) || (fontWeight === 'bold' ? 700 : 400) : fontWeight;
  return typographyTokens.reduce<TypographyToken | undefined>((best, token) => {
    if (fontFamily && token.fontFamily.toLowerCase() !== fontFamily.toLowerCase()) {
      return best;
    }
    const sizeDelta = Math.abs(token.fontSize - fontSize);
    const weightDelta = normalizedWeight ? Math.abs(token.fontWeight - normalizedWeight) : 0;
    const lineDelta = lineHeight ? Math.abs(token.lineHeight - lineHeight) : 0;
    const letterDelta = letterSpacing !== undefined ? Math.abs(token.letterSpacing - letterSpacing) : 0;
    const score = sizeDelta * 3 + weightDelta + lineDelta * 0.5 + letterDelta;
    if (!best) return token;
    const bestSizeDelta = Math.abs(best.fontSize - fontSize);
    const bestWeightDelta = normalizedWeight ? Math.abs(best.fontWeight - normalizedWeight) : 0;
    const bestLineDelta = lineHeight ? Math.abs(best.lineHeight - lineHeight) : 0;
    const bestLetterDelta = letterSpacing !== undefined ? Math.abs(best.letterSpacing - letterSpacing) : 0;
    const bestScore = bestSizeDelta * 3 + bestWeightDelta + bestLineDelta * 0.5 + bestLetterDelta;
    return score < bestScore ? token : best;
  }, undefined);
};

export interface ShadowLayer {
  type: 'drop' | 'inner';
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface ShadowToken {
  name: string;
  layers: ShadowLayer[];
}

export const shadowTokens: ShadowToken[] = [
  {
    name: 'elevation-xs',
    layers: [
      { type: 'drop', offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.05 },
    ],
  },
  {
    name: 'elevation-sm',
    layers: [
      { type: 'drop', offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: '#0b0d12', opacity: 0.12 },
      { type: 'drop', offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: '#0b0d12', opacity: 0.08 },
    ],
  },
  {
    name: 'elevation-md',
    layers: [
      { type: 'drop', offsetX: 0, offsetY: 8, blur: 24, spread: -4, color: '#0b0d12', opacity: 0.18 },
      { type: 'drop', offsetX: 0, offsetY: 4, blur: 12, spread: -2, color: '#0b0d12', opacity: 0.12 },
    ],
  },
  {
    name: 'elevation-lg',
    layers: [
      { type: 'drop', offsetX: 0, offsetY: 16, blur: 48, spread: -8, color: '#0b0d12', opacity: 0.2 },
      { type: 'drop', offsetX: 0, offsetY: 8, blur: 24, spread: -4, color: '#0b0d12', opacity: 0.14 },
    ],
  },
  {
    name: 'google-search-bar',
    layers: [
      { type: 'drop', offsetX: 0, offsetY: 1, blur: 6, spread: 0, color: '#202124', opacity: 0.15 },
    ],
  },
  {
    name: 'google-button-hover',
    layers: [
      { type: 'drop', offsetX: 0, offsetY: 1, blur: 1, spread: 0, color: '#000000', opacity: 0.1 },
    ],
  },
];

export const colorTokens = {
  'background-surface': '#0f172a',
  'background-elevated': '#111827',
  'accent-primary': '#4f46e5',
  'accent-secondary': '#0ea5e9',
  'text-primary': '#e2e8f0',
  'text-secondary': '#94a3b8',
  'border-muted': '#1e293b',
  'success': '#22c55e',
  'warning': '#facc15',
  'danger': '#f87171',
} as const;

export type ColorToken = keyof typeof colorTokens;

const colorEntries = Object.entries(colorTokens);

export const findColorToken = (hex?: string): ColorToken | undefined => {
  if (!hex) return undefined;
  const normalized = hex.toLowerCase();
  const exact = colorEntries.find(([, value]) => value.toLowerCase() === normalized);
  if (exact) return exact[0] as ColorToken;
  return undefined;
};

export const designTokens = {
  spacing: spacingScale,
  typography: typographyTokens,
  shadows: shadowTokens,
  colors: colorTokens,
};

// Auto-extract design tokens from CSS variables
export interface ExtractedDesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  typography: Record<string, any>;
  shadows: Record<string, string>;
}

export const extractDesignTokensFromCSSVariables = (cssVariables: Record<string, string>): ExtractedDesignTokens => {
  const extracted: ExtractedDesignTokens = {
    colors: {},
    spacing: {},
    typography: {},
    shadows: {},
  };

  Object.entries(cssVariables).forEach(([varName, value]) => {
    const name = varName.replace(/^--/, '');

    // Extract colors (hex, rgb, hsl)
    if (value.match(/^#[0-9a-fA-F]{3,8}$/) || value.match(/^rgb/) || value.match(/^hsl/)) {
      extracted.colors[name] = value;
    }
    // Extract spacing (px, rem, em)
    else if (value.match(/^\d+(\.\d+)?(px|rem|em)$/)) {
      const numValue = parseFloat(value);
      if (value.includes('rem')) {
        extracted.spacing[name] = numValue * BASE_FONT_SIZE;
      } else if (value.includes('em')) {
        extracted.spacing[name] = numValue * BASE_FONT_SIZE;
      } else {
        extracted.spacing[name] = numValue;
      }
    }
    // Extract shadows
    else if (value.includes('shadow') || value.match(/\d+px\s+\d+px/)) {
      extracted.shadows[name] = value;
    }
    // Extract typography properties
    else if (name.includes('font') || name.includes('text') || name.includes('line-height') || name.includes('letter-spacing')) {
      extracted.typography[name] = value;
    }
  });

  return extracted;
};

// Merge extracted tokens with static tokens
export const mergeDesignTokens = (extracted: ExtractedDesignTokens): typeof designTokens & { extracted: ExtractedDesignTokens } => {
  return {
    ...designTokens,
    extracted,
  };
};





