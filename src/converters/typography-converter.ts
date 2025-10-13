import { FigmaPaint } from '../types/figma.types';
import { findTypographyToken, toRem } from '../config/design-tokens';

const parseFontSize = (value?: string): number | undefined => {
  if (!value) return undefined;
  const match = value.match(/(-?\d*\.?\d+)/);
  return match ? parseFloat(match[1]) : undefined;
};

const parseLineHeight = (value?: string, fontSize?: number): number | undefined => {
  if (!value) return undefined;
  if (value.endsWith('%')) {
    const percent = parseFloat(value) / 100;
    return fontSize ? fontSize * percent : undefined;
  }
  return parseFontSize(value);
};

const parseLetterSpacing = (value?: string, fontSize?: number): number | undefined => {
  if (!value) return undefined;
  if (value.endsWith('em')) {
    const em = parseFloat(value);
    return fontSize ? fontSize * em : undefined;
  }
  return parseFontSize(value);
};

const parseColorToPaint = (value?: string): FigmaPaint | undefined => {
  if (!value) return undefined;
  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const expandHex = (component: string) => component.length === 1 ? component + component : component;
    const r = parseInt(expandHex(hex.slice(0, hex.length >= 6 ? 2 : 1)), 16) / 255;
    const g = parseInt(expandHex(hex.slice(hex.length >= 6 ? 2 : 1, hex.length >= 6 ? 4 : 2)), 16) / 255;
    const b = parseInt(expandHex(hex.slice(hex.length >= 6 ? 4 : 2, hex.length >= 6 ? 6 : 3)), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { type: 'SOLID', color: { r, g, b, a } };
  }
  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const components = rgbMatch[1].split(',').map((component) => component.trim());
    const [r, g, b, aRaw] = components.map((component) => parseFloat(component));
    return {
      type: 'SOLID',
      color: {
        r: (r ?? 0) / 255,
        g: (g ?? 0) / 255,
        b: (b ?? 0) / 255,
        a: aRaw !== undefined ? aRaw : 1,
      },
    };
  }
  return undefined;
};

export interface TypographyConversionResult {
  characters: string;
  fontFamily?: string;
  fontSize?: number;
  fontSizeRem?: number;
  fontWeight?: number | string;
  fontStyle?: string;
  lineHeight?: number;
  lineHeightRem?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textCase?: 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'UNDERLINE' | 'STRIKETHROUGH';
  fills?: FigmaPaint[];
  token?: string;
}

export const convertTypography = (
  textContent: string,
  styles: Record<string, string>,
): TypographyConversionResult => {
  const fontFamilyRaw = styles['font-family'];
  const fontFamily = fontFamilyRaw?.split(',')[0]?.replace(/['\"]/g, '').trim();
  const fontSize = parseFontSize(styles['font-size']);
  const fontWeight = styles['font-weight'];
  const fontStyle = styles['font-style']?.toLowerCase();
  const lineHeight = parseLineHeight(styles['line-height'], fontSize);
  const letterSpacing = parseLetterSpacing(styles['letter-spacing'], fontSize);
  const textAlign = styles['text-align'];
  const colorPaint = parseColorToPaint(styles.color);
  const textTransform = styles['text-transform']?.toLowerCase();
  const textDecorationRaw = styles['text-decoration']?.toLowerCase();

  let textCase: TypographyConversionResult['textCase'];
  switch (textTransform) {
    case 'uppercase':
      textCase = 'UPPER';
      break;
    case 'lowercase':
      textCase = 'LOWER';
      break;
    case 'capitalize':
      textCase = 'TITLE';
      break;
    default:
      textCase = undefined;
  }

  let textDecoration: TypographyConversionResult['textDecoration'];
  if (textDecorationRaw?.includes('underline')) {
    textDecoration = 'UNDERLINE';
  } else if (textDecorationRaw?.includes('line-through')) {
    textDecoration = 'STRIKETHROUGH';
  }

  const textAlignHorizontal: TypographyConversionResult['textAlignHorizontal'] =
    textAlign === 'center' ? 'CENTER'
      : textAlign === 'right' ? 'RIGHT'
      : textAlign === 'justify' ? 'JUSTIFIED'
      : 'LEFT';

  const typographyToken = findTypographyToken(fontFamily, fontSize, fontWeight, lineHeight, letterSpacing);

  return {
    characters: textContent,
    fontFamily,
    fontSize,
    fontSizeRem: toRem(fontSize),
    fontWeight,
    fontStyle,
    lineHeight,
    lineHeightRem: toRem(lineHeight),
    letterSpacing,
    textAlignHorizontal,
    textCase,
    textDecoration,
    fills: colorPaint ? [colorPaint] : undefined,
    token: typographyToken?.name,
  };
};
