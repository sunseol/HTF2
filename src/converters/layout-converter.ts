import { LayoutMode } from "../types/figma.types";
import { snapSpacing, SpacingToken, toRem } from "../config/design-tokens";

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

export interface GridLayoutInfo {
  templateColumns?: string;
  templateRows?: string;
  templateAreas?: string;
  autoColumns?: string;
  autoRows?: string;
  autoFlow?: string;
  columnGap?: number;
  rowGap?: number;
}

export interface LayoutConversionResult {
  mode: LayoutMode;
  gap?: number;
  gapToken?: SpacingToken;
  padding?: { top: number; right: number; bottom: number; left: number };
  paddingTokens?: { top: SpacingToken; right: SpacingToken; bottom: SpacingToken; left: SpacingToken };
  paddingRem?: { top?: number; right?: number; bottom?: number; left?: number };
  overflowDirection?: "HORIZONTAL" | "VERTICAL" | "BOTH" | "NONE";
  clipsContent?: boolean;
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE" | "STRETCH";
  primaryAxisSizingMode?: "AUTO" | "FIXED";
  counterAxisSizingMode?: "AUTO" | "FIXED";
  primaryAxisAlignContent?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  layoutWrap?: "NO_WRAP" | "WRAP";
  gridLayout?: GridLayoutInfo;
}

export const convertLayoutStyles = (styles: Record<string, string>): LayoutConversionResult | undefined => {
  const display = styles.display?.trim();
  const overflow = styles.overflow?.trim();
  const overflowX = styles["overflow-x"]?.trim();
  const overflowY = styles["overflow-y"]?.trim();

  let mode: LayoutMode = "NONE";
  let gap: number | undefined;
  let gapToken: SpacingToken | undefined;
  let primaryAxisAlignItems: LayoutConversionResult["primaryAxisAlignItems"];
  let counterAxisAlignItems: LayoutConversionResult["counterAxisAlignItems"];
  let primaryAxisAlignContent: LayoutConversionResult["primaryAxisAlignContent"];
  let layoutWrap: LayoutConversionResult["layoutWrap"];
  let primaryAxisSizingMode: LayoutConversionResult["primaryAxisSizingMode"];
  let counterAxisSizingMode: LayoutConversionResult["counterAxisSizingMode"];

  let gridLayout: GridLayoutInfo | undefined;

  // Check for centering patterns
  const isCentered = (
    (styles['margin-left'] === 'auto' && styles['margin-right'] === 'auto') ||
    (styles['text-align'] === 'center') ||
    (styles['align-items'] === 'center' && styles['justify-content'] === 'center')
  );

  if (display === "flex") {
    const direction = styles["flex-direction"]?.trim() ?? "row";
    mode = direction === "column" ? "VERTICAL" : "HORIZONTAL";
    const rawGap = parseCssLength(styles.gap ?? styles["row-gap"] ?? styles["column-gap"]);
    const snappedGap = snapSpacing(rawGap);
    gap = snappedGap?.value ?? rawGap;
    gapToken = snappedGap?.token;

    const mapPrimaryAlign = (value?: string): LayoutConversionResult["primaryAxisAlignItems"] => {
      if (!value) return undefined;
      switch (value) {
        case "flex-start":
        case "start":
          return "MIN";
        case "center":
          return "CENTER";
        case "flex-end":
        case "end":
          return "MAX";
        case "space-between":
        case "space-around":
        case "space-evenly":
          return "SPACE_BETWEEN";
        default:
          return undefined;
      }
    };

    const mapCounterAlign = (value?: string): LayoutConversionResult["counterAxisAlignItems"] => {
      if (!value) return undefined;
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
        case "baseline":
          return "BASELINE";
        default:
          return undefined;
      }
    };

    primaryAxisAlignItems = mapPrimaryAlign(styles["justify-content"]?.trim());
    counterAxisAlignItems = mapCounterAlign(styles["align-items"]?.trim());
    primaryAxisAlignContent = mapPrimaryAlign(styles["align-content"]?.trim());
    layoutWrap = styles["flex-wrap"]?.trim() && styles["flex-wrap"]?.trim() !== "nowrap" ? "WRAP" : undefined;

    const isExplicit = (value?: string) => {
      if (!value || value === "auto") return false;
      return true;
    };

    if (mode === "HORIZONTAL") {
      primaryAxisSizingMode = isExplicit(styles.width) ? "FIXED" : "AUTO";
      counterAxisSizingMode = isExplicit(styles.height) ? "FIXED" : "AUTO";
    } else if (mode === "VERTICAL") {
      primaryAxisSizingMode = isExplicit(styles.height) ? "FIXED" : "AUTO";
      counterAxisSizingMode = isExplicit(styles.width) ? "FIXED" : "AUTO";
    }
  } else if (display === "grid" || display === "inline-grid") {
    // CSS Grid support
    mode = "VERTICAL"; // Default to vertical for grid layouts

    const templateColumns = styles["grid-template-columns"]?.trim();
    const templateRows = styles["grid-template-rows"]?.trim();
    const templateAreas = styles["grid-template-areas"]?.trim();
    const autoColumns = styles["grid-auto-columns"]?.trim();
    const autoRows = styles["grid-auto-rows"]?.trim();
    const autoFlow = styles["grid-auto-flow"]?.trim();

    const columnGap = parseCssLength(styles["column-gap"] ?? styles.gap);
    const rowGap = parseCssLength(styles["row-gap"] ?? styles.gap);

    gridLayout = {
      templateColumns,
      templateRows,
      templateAreas,
      autoColumns,
      autoRows,
      autoFlow,
      columnGap,
      rowGap,
    };

    // Use the larger gap for the main gap value
    const maxGap = Math.max(columnGap ?? 0, rowGap ?? 0);
    const snappedGap = snapSpacing(maxGap);
    gap = snappedGap?.value ?? maxGap;
    gapToken = snappedGap?.token;

    // Map grid alignment to Figma alignment
    const mapGridAlign = (value?: string): LayoutConversionResult["primaryAxisAlignItems"] => {
      if (!value) return undefined;
      switch (value) {
        case "start":
          return "MIN";
        case "center":
          return "CENTER";
        case "end":
          return "MAX";
        case "space-between":
        case "space-around":
        case "space-evenly":
          return "SPACE_BETWEEN";
        default:
          return undefined;
      }
    };

    const mapGridItemAlign = (value?: string): LayoutConversionResult["counterAxisAlignItems"] => {
      if (!value) return undefined;
      switch (value) {
        case "start":
          return "MIN";
        case "center":
          return "CENTER";
        case "end":
          return "MAX";
        case "stretch":
          return "STRETCH";
        default:
          return undefined;
      }
    };

    primaryAxisAlignItems = mapGridAlign(styles["justify-content"]?.trim());
    counterAxisAlignItems = mapGridItemAlign(styles["align-items"]?.trim());
    primaryAxisAlignContent = mapGridAlign(styles["align-content"]?.trim());
  }

  const paddingFromShorthand = parsePaddingShorthand(styles.padding);
  let paddingObject: LayoutConversionResult["padding"];
  let paddingTokens: LayoutConversionResult["paddingTokens"];
  let paddingRem: LayoutConversionResult["paddingRem"];

  if (paddingFromShorthand) {
    paddingObject = paddingFromShorthand;
  } else {
    const [top, right, bottom, left] = ["padding-top", "padding-right", "padding-bottom", "padding-left"]
      .map((key) => parseCssLength(styles[key]));
    if (top !== undefined && right !== undefined && bottom !== undefined && left !== undefined) {
      paddingObject = { top, right, bottom, left };
    }
  }

  if (paddingObject) {
    const snappedTop = snapSpacing(paddingObject.top);
    const snappedRight = snapSpacing(paddingObject.right);
    const snappedBottom = snapSpacing(paddingObject.bottom);
    const snappedLeft = snapSpacing(paddingObject.left);

    paddingObject = {
      top: snappedTop?.value ?? paddingObject.top,
      right: snappedRight?.value ?? paddingObject.right,
      bottom: snappedBottom?.value ?? paddingObject.bottom,
      left: snappedLeft?.value ?? paddingObject.left,
    };

    paddingTokens = {
      top: snappedTop?.token ?? "spacing-0",
      right: snappedRight?.token ?? "spacing-0",
      bottom: snappedBottom?.token ?? "spacing-0",
      left: snappedLeft?.token ?? "spacing-0",
    };

    paddingRem = {
      top: toRem(paddingObject.top),
      right: toRem(paddingObject.right),
      bottom: toRem(paddingObject.bottom),
      left: toRem(paddingObject.left),
    };
  }

  const normalizeOverflow = (value?: string) => value?.split(/\s+/)[0];
  const o = normalizeOverflow(overflow);
  const ox = normalizeOverflow(overflowX);
  const oy = normalizeOverflow(overflowY);

  let overflowDirection: LayoutConversionResult["overflowDirection"];
  let clipsContent: boolean | undefined;

  const isHidden = (value?: string) => value === "hidden" || value === "clip";
  const isScrollable = (value?: string) => value === "scroll" || value === "auto";

  if (isHidden(o) || isHidden(ox) || isHidden(oy)) {
    clipsContent = true;
  }

  if (isScrollable(ox)) overflowDirection = "HORIZONTAL";
  if (isScrollable(oy)) overflowDirection = overflowDirection === "HORIZONTAL" ? "BOTH" : "VERTICAL";
  if (!overflowDirection) overflowDirection = "NONE";

  if (mode === "NONE" && !paddingObject && !clipsContent && overflowDirection === "NONE") {
    return undefined;
  }

  return {
    mode,
    gap,
    gapToken,
    padding: paddingObject,
    paddingTokens,
    paddingRem,
    overflowDirection,
    clipsContent,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    primaryAxisSizingMode,
    counterAxisSizingMode,
    primaryAxisAlignContent,
    layoutWrap,
    gridLayout,
  };
};
