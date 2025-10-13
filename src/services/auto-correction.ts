import type { HTMLNodeSnapshot } from '../types/converter.types';
import type { FigmaNodeData, FigmaPaint } from '../types/figma.types';
import type { QualityIssue } from './quality-validation';
import { logger } from '../utils/logger';

export interface CorrectionResult {
  corrected: boolean;
  changes: CorrectionChange[];
}

export interface CorrectionChange {
  property: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

/**
 * Auto-correct layout issues
 */
const correctLayoutIssues = (
  original: HTMLNodeSnapshot,
  figmaNode: FigmaNodeData,
  issues: QualityIssue[]
): CorrectionResult => {
  const changes: CorrectionChange[] = [];
  let corrected = false;

  issues.forEach(issue => {
    if (issue.category !== 'layout') return;

    // Fix width mismatch
    if (issue.message.includes('Width mismatch')) {
      const oldWidth = figmaNode.boundingBox.width;
      figmaNode.boundingBox.width = original.boundingBox.width;
      changes.push({
        property: 'boundingBox.width',
        oldValue: oldWidth,
        newValue: figmaNode.boundingBox.width,
        reason: 'Width adjusted to match original',
      });
      corrected = true;
    }

    // Fix height mismatch
    if (issue.message.includes('Height mismatch')) {
      const oldHeight = figmaNode.boundingBox.height;
      figmaNode.boundingBox.height = original.boundingBox.height;
      changes.push({
        property: 'boundingBox.height',
        oldValue: oldHeight,
        newValue: figmaNode.boundingBox.height,
        reason: 'Height adjusted to match original',
      });
      corrected = true;
    }

    // Fix layout mode not applied
    if (issue.message.includes('Layout container not properly converted')) {
      if (original.layoutInfo?.isFlexContainer) {
        const direction = original.styles['flex-direction']?.trim() ?? 'row';
        const oldMode = figmaNode.layoutMode;
        figmaNode.layoutMode = direction === 'column' ? 'VERTICAL' : 'HORIZONTAL';
        changes.push({
          property: 'layoutMode',
          oldValue: oldMode,
          newValue: figmaNode.layoutMode,
          reason: 'Applied Auto Layout for flex container',
        });
        corrected = true;
      } else if (original.layoutInfo?.isGridContainer) {
        const oldMode = figmaNode.layoutMode;
        figmaNode.layoutMode = 'VERTICAL';
        changes.push({
          property: 'layoutMode',
          oldValue: oldMode,
          newValue: figmaNode.layoutMode,
          reason: 'Applied Auto Layout for grid container',
        });
        corrected = true;
      }
    }

    // Fix absolute positioning
    if (issue.message.includes('Absolute positioning not preserved')) {
      const oldPositioning = figmaNode.layoutPositioning;
      figmaNode.layoutPositioning = 'ABSOLUTE';
      changes.push({
        property: 'layoutPositioning',
        oldValue: oldPositioning,
        newValue: figmaNode.layoutPositioning,
        reason: 'Applied absolute positioning',
      });
      corrected = true;
    }
  });

  return { corrected, changes };
};

/**
 * Parse color string to FigmaPaint
 */
const parseColorToPaint = (colorString: string): FigmaPaint | undefined => {
  // Handle hex colors
  const hexMatch = colorString.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const expand = (c: string) => (c.length === 1 ? c + c : c);
    const r = parseInt(expand(hex.slice(0, hex.length >= 6 ? 2 : 1)), 16) / 255;
    const g = parseInt(expand(hex.slice(hex.length >= 6 ? 2 : 1, hex.length >= 6 ? 4 : 2)), 16) / 255;
    const b = parseInt(expand(hex.slice(hex.length >= 6 ? 4 : 2, hex.length >= 6 ? 6 : 3)), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { type: 'SOLID', color: { r, g, b, a } };
  }

  // Handle rgb/rgba colors
  const rgbMatch = colorString.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(p => p.trim());
    const parseComponent = (component?: string) => {
      if (!component) return 0;
      return component.includes('%') ? parseFloat(component) / 100 : parseFloat(component) / 255;
    };
    return {
      type: 'SOLID',
      color: {
        r: parseComponent(parts[0]),
        g: parseComponent(parts[1]),
        b: parseComponent(parts[2]),
        a: parts[3] ? parseFloat(parts[3]) : 1,
      },
    };
  }

  return undefined;
};

/**
 * Auto-correct color issues
 */
const correctColorIssues = (
  original: HTMLNodeSnapshot,
  figmaNode: FigmaNodeData,
  issues: QualityIssue[]
): CorrectionResult => {
  const changes: CorrectionChange[] = [];
  let corrected = false;

  issues.forEach(issue => {
    if (issue.category !== 'color') return;

    // Fix background color not applied
    if (issue.message.includes('Background color not applied')) {
      const bgColor = original.styles['background-color'];
      if (bgColor && bgColor !== 'transparent') {
        const paint = parseColorToPaint(bgColor);
        if (paint) {
          const oldFills = figmaNode.fills;
          figmaNode.fills = [paint];
          changes.push({
            property: 'fills',
            oldValue: oldFills,
            newValue: figmaNode.fills,
            reason: `Applied background color: ${bgColor}`,
          });
          corrected = true;
        }
      }
    }

    // Fix border color not applied
    if (issue.message.includes('Border color not applied')) {
      const borderColor = original.styles['border-color'];
      if (borderColor && borderColor !== 'transparent') {
        const paint = parseColorToPaint(borderColor);
        if (paint) {
          const oldStrokes = figmaNode.strokes;
          figmaNode.strokes = [paint];
          changes.push({
            property: 'strokes',
            oldValue: oldStrokes,
            newValue: figmaNode.strokes,
            reason: `Applied border color: ${borderColor}`,
          });
          corrected = true;

          // Also apply border width
          const borderWidth = parseFloat(original.styles['border-width'] ?? '1');
          if (borderWidth > 0) {
            const oldStrokeWeight = figmaNode.strokeWeight;
            figmaNode.strokeWeight = borderWidth;
            changes.push({
              property: 'strokeWeight',
              oldValue: oldStrokeWeight,
              newValue: figmaNode.strokeWeight,
              reason: 'Applied border width',
            });
          }
        }
      }
    }

    // Fix text color not applied
    if (issue.message.includes('Text color not applied')) {
      const textColor = original.styles.color;
      if (textColor && original.textContent) {
        const paint = parseColorToPaint(textColor);
        if (paint && figmaNode.text) {
          const oldFills = figmaNode.text.fills;
          figmaNode.text.fills = [paint];
          changes.push({
            property: 'text.fills',
            oldValue: oldFills,
            newValue: figmaNode.text.fills,
            reason: `Applied text color: ${textColor}`,
          });
          corrected = true;
        }
      }
    }
  });

  return { corrected, changes };
};

/**
 * Auto-correct typography issues
 */
const correctTypographyIssues = (
  original: HTMLNodeSnapshot,
  figmaNode: FigmaNodeData,
  issues: QualityIssue[]
): CorrectionResult => {
  const changes: CorrectionChange[] = [];
  let corrected = false;

  if (!original.textContent || !figmaNode.text) {
    return { corrected, changes };
  }

  issues.forEach(issue => {
    if (issue.category !== 'typography') return;

    // Fix font family not applied
    if (issue.message.includes('Font family not applied')) {
      const fontFamily = original.styles['font-family']?.split(',')[0].trim().replace(/['"]/g, '');
      if (fontFamily) {
        const oldFontFamily = figmaNode.text?.fontFamily;
        if (figmaNode.text) {
          figmaNode.text.fontFamily = fontFamily;
          changes.push({
            property: 'text.fontFamily',
            oldValue: oldFontFamily,
            newValue: figmaNode.text.fontFamily,
            reason: `Applied font family: ${fontFamily}`,
          });
          corrected = true;
        }
      }
    }

    // Fix font size mismatch
    if (issue.message.includes('Font size mismatch')) {
      const fontSize = parseFloat(original.styles['font-size'] ?? '0');
      if (fontSize > 0 && figmaNode.text) {
        const oldFontSize = figmaNode.text.fontSize;
        figmaNode.text.fontSize = fontSize;
        changes.push({
          property: 'text.fontSize',
          oldValue: oldFontSize,
          newValue: figmaNode.text.fontSize,
          reason: `Adjusted font size to ${fontSize}px`,
        });
        corrected = true;
      }
    }

    // Fix line height mismatch
    if (issue.message.includes('Line height mismatch')) {
      const lineHeight = parseFloat(original.styles['line-height'] ?? '0');
      if (lineHeight > 0 && figmaNode.text) {
        const oldLineHeight = figmaNode.text.lineHeight;
        figmaNode.text.lineHeight = lineHeight;
        changes.push({
          property: 'text.lineHeight',
          oldValue: oldLineHeight,
          newValue: figmaNode.text.lineHeight,
          reason: `Adjusted line height to ${lineHeight}px`,
        });
        corrected = true;
      }
    }
  });

  return { corrected, changes };
};

/**
 * Auto-correct spacing issues
 */
const correctSpacingIssues = (
  original: HTMLNodeSnapshot,
  figmaNode: FigmaNodeData,
  issues: QualityIssue[]
): CorrectionResult => {
  const changes: CorrectionChange[] = [];
  let corrected = false;

  issues.forEach(issue => {
    if (issue.category !== 'spacing') return;

    // Fix padding not applied
    if (issue.message.includes('Padding not applied')) {
      const paddingTop = parseFloat(original.styles['padding-top'] ?? '0');
      const paddingRight = parseFloat(original.styles['padding-right'] ?? '0');
      const paddingBottom = parseFloat(original.styles['padding-bottom'] ?? '0');
      const paddingLeft = parseFloat(original.styles['padding-left'] ?? '0');

      const oldPadding = figmaNode.padding;
      figmaNode.padding = {
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft,
      };
      changes.push({
        property: 'padding',
        oldValue: oldPadding,
        newValue: figmaNode.padding,
        reason: 'Applied padding',
      });
      corrected = true;
    }

    // Fix padding mismatch
    if (issue.message.includes('Padding mismatch')) {
      const paddingTop = parseFloat(original.styles['padding-top'] ?? '0');
      const paddingRight = parseFloat(original.styles['padding-right'] ?? '0');
      const paddingBottom = parseFloat(original.styles['padding-bottom'] ?? '0');
      const paddingLeft = parseFloat(original.styles['padding-left'] ?? '0');

      const oldPadding = figmaNode.padding;
      figmaNode.padding = {
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft,
      };
      changes.push({
        property: 'padding',
        oldValue: oldPadding,
        newValue: figmaNode.padding,
        reason: 'Adjusted padding to match original',
      });
      corrected = true;
    }

    // Fix gap mismatch
    if (issue.message.includes('Gap mismatch')) {
      const gap = parseFloat(original.styles.gap ?? '0');
      if (gap > 0) {
        const oldGap = figmaNode.itemSpacing;
        figmaNode.itemSpacing = gap;
        changes.push({
          property: 'itemSpacing',
          oldValue: oldGap,
          newValue: figmaNode.itemSpacing,
          reason: `Adjusted gap to ${gap}px`,
        });
        corrected = true;
      }
    }
  });

  return { corrected, changes };
};

/**
 * Main auto-correction function
 */
export const autoCorrectNode = (
  original: HTMLNodeSnapshot,
  figmaNode: FigmaNodeData,
  issues: QualityIssue[]
): { node: FigmaNodeData; corrections: CorrectionChange[] } => {
  const relevantIssues = issues.filter(issue => issue.nodeId === figmaNode.id);

  if (relevantIssues.length === 0) {
    return { node: figmaNode, corrections: [] };
  }

  const allChanges: CorrectionChange[] = [];

  // Apply corrections in priority order
  const layoutResult = correctLayoutIssues(original, figmaNode, relevantIssues);
  allChanges.push(...layoutResult.changes);

  const colorResult = correctColorIssues(original, figmaNode, relevantIssues);
  allChanges.push(...colorResult.changes);

  const typographyResult = correctTypographyIssues(original, figmaNode, relevantIssues);
  allChanges.push(...typographyResult.changes);

  const spacingResult = correctSpacingIssues(original, figmaNode, relevantIssues);
  allChanges.push(...spacingResult.changes);

  if (allChanges.length > 0) {
    logger.info(`Auto-corrected ${allChanges.length} issues for node ${figmaNode.id}`);
  }

  return { node: figmaNode, corrections: allChanges };
};

/**
 * Auto-correct entire tree
 */
export const autoCorrectTree = (
  rootSnapshot: HTMLNodeSnapshot,
  figmaNodes: FigmaNodeData[],
  issues: QualityIssue[]
): { nodes: FigmaNodeData[]; corrections: Map<string, CorrectionChange[]> } => {
  const nodeMap = new Map<string, HTMLNodeSnapshot>();
  const corrections = new Map<string, CorrectionChange[]>();

  const buildNodeMap = (snapshot: HTMLNodeSnapshot) => {
    nodeMap.set(snapshot.id, snapshot);
    snapshot.children.forEach(buildNodeMap);
  };

  buildNodeMap(rootSnapshot);

  const correctedNodes = figmaNodes.map(figmaNode => {
    const originalSnapshot = nodeMap.get(figmaNode.id);
    if (!originalSnapshot) {
      return figmaNode;
    }

    const { node, corrections: nodeCorrections } = autoCorrectNode(originalSnapshot, figmaNode, issues);

    if (nodeCorrections.length > 0) {
      corrections.set(node.id, nodeCorrections);
    }

    return node;
  });

  const totalCorrections = Array.from(corrections.values()).reduce((sum, c) => sum + c.length, 0);
  logger.info(`Auto-correction completed: ${totalCorrections} corrections applied to ${corrections.size} nodes`);

  return { nodes: correctedNodes, corrections };
};
