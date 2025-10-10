import { LayoutMode } from '../types/figma.types';

const parseCssLength = (value?: string): number | undefined => {
  if (!value) return undefined;
  const match = value.trim().match(/(-?\d*\.?\d+)(px)?/i);
  return match ? parseFloat(match[1]) : undefined;
};

const parsePaddingShorthand = (value?: string) => {
  if (!value) return undefined;
  const segments = value.trim().split(/\s+/).map(parseCssLength);
  if (segments.some((segment) => segment === undefined)) {
    return undefined;
  }
  switch (segments.length) {
    case 1:
      return { top: segments[0]!, right: segments[0]!, bottom: segments[0]!, left: segments[0]! };
    case 2:
      return { top: segments[0]!, right: segments[1]!, bottom: segments[0]!, left: segments[1]! };
    case 3:
      return { top: segments[0]!, right: segments[1]!, bottom: segments[2]!, left: segments[1]! };
    case 4:
      return { top: segments[0]!, right: segments[1]!, bottom: segments[2]!, left: segments[3]! };
    default:
      return undefined;
  }
};

export interface LayoutConversionResult {
  mode: LayoutMode;
  gap?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  overflowDirection?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH' | 'NONE';
  clipsContent?: boolean;
}

export const convertLayoutStyles = (styles: Record<string, string>): LayoutConversionResult | undefined => {
  const display = styles.display?.trim();
  const overflow = styles.overflow?.trim();
  const overflowX = styles['overflow-x']?.trim();
  const overflowY = styles['overflow-y']?.trim();

  let mode: LayoutMode = 'NONE';
  let gap: number | undefined;

  if (display === 'flex') {
    const direction = styles['flex-direction']?.trim() ?? 'row';
    mode = direction === 'column' ? 'VERTICAL' : 'HORIZONTAL';
    gap = parseCssLength(styles.gap ?? styles['row-gap'] ?? styles['column-gap']);
  }

  const paddingFromShorthand = parsePaddingShorthand(styles.padding);
  let paddingObject: LayoutConversionResult['padding'];
  if (paddingFromShorthand) {
    paddingObject = paddingFromShorthand;
  } else {
    const [top, right, bottom, left] = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']
      .map((key) => parseCssLength(styles[key]));
    if (top !== undefined && right !== undefined && bottom !== undefined && left !== undefined) {
      paddingObject = { top, right, bottom, left };
    }
  }

  const normalizeOverflow = (value?: string) => value?.split(/\s+/)[0];
  const o = normalizeOverflow(overflow);
  const ox = normalizeOverflow(overflowX);
  const oy = normalizeOverflow(overflowY);

  let overflowDirection: LayoutConversionResult['overflowDirection'];
  let clipsContent: boolean | undefined;

  const isHidden = (value?: string) => value === 'hidden' || value === 'clip';
  const isScrollable = (value?: string) => value === 'scroll' || value === 'auto';

  if (isHidden(o) || isHidden(ox) || isHidden(oy)) {
    clipsContent = true;
  }

  if (isScrollable(ox)) overflowDirection = 'HORIZONTAL';
  if (isScrollable(oy)) overflowDirection = overflowDirection === 'HORIZONTAL' ? 'BOTH' : 'VERTICAL';
  if (!overflowDirection) overflowDirection = 'NONE';

  if (mode === 'NONE' && !paddingObject && !clipsContent && overflowDirection === 'NONE') {
    return undefined;
  }

  return {
    mode,
    gap,
    padding: paddingObject,
    overflowDirection,
    clipsContent,
  };
};
