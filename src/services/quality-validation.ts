import type { HTMLNodeSnapshot } from '../types/converter.types';
import type { FigmaNodeData } from '../types/figma.types';
import { logger } from '../utils/logger';

export interface QualityMetrics {
  layoutAccuracy: number;
  colorAccuracy: number;
  typographyAccuracy: number;
  spacingAccuracy: number;
  overallScore: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'layout' | 'color' | 'typography' | 'spacing' | 'other';
  message: string;
  nodeId?: string;
  suggestedFix?: string;
}

/**
 * Validate layout accuracy
 */
const validateLayout = (original: HTMLNodeSnapshot, figmaNode: FigmaNodeData): { score: number; issues: QualityIssue[] } => {
  const issues: QualityIssue[] = [];
  let score = 100;

  // Check bounding box accuracy
  const widthDiff = Math.abs(original.boundingBox.width - figmaNode.boundingBox.width);
  const heightDiff = Math.abs(original.boundingBox.height - figmaNode.boundingBox.height);

  if (widthDiff > 5) {
    score -= 10;
    issues.push({
      severity: 'warning',
      category: 'layout',
      message: `Width mismatch: ${widthDiff.toFixed(2)}px difference`,
      nodeId: figmaNode.id,
      suggestedFix: `Adjust width to ${original.boundingBox.width}px`,
    });
  }

  if (heightDiff > 5) {
    score -= 10;
    issues.push({
      severity: 'warning',
      category: 'layout',
      message: `Height mismatch: ${heightDiff.toFixed(2)}px difference`,
      nodeId: figmaNode.id,
      suggestedFix: `Adjust height to ${original.boundingBox.height}px`,
    });
  }

  // Check flexbox/grid layout mapping
  const isFlexContainer = original.layoutInfo?.isFlexContainer;
  const isGridContainer = original.layoutInfo?.isGridContainer;
  const hasLayoutMode = figmaNode.layoutMode && figmaNode.layoutMode !== 'NONE';

  if ((isFlexContainer || isGridContainer) && !hasLayoutMode) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'layout',
      message: `Layout container not properly converted (${isFlexContainer ? 'flex' : 'grid'})`,
      nodeId: figmaNode.id,
      suggestedFix: 'Apply Auto Layout to this frame',
    });
  }

  // Check positioning
  if (original.styles.position === 'absolute' && figmaNode.layoutPositioning !== 'ABSOLUTE') {
    score -= 5;
    issues.push({
      severity: 'info',
      category: 'layout',
      message: 'Absolute positioning not preserved',
      nodeId: figmaNode.id,
    });
  }

  return { score: Math.max(0, score), issues };
};

/**
 * Validate color accuracy
 */
const validateColor = (original: HTMLNodeSnapshot, figmaNode: FigmaNodeData): { score: number; issues: QualityIssue[] } => {
  const issues: QualityIssue[] = [];
  let score = 100;

  // Check background color
  const hasBackgroundColor = original.styles['background-color'] && original.styles['background-color'] !== 'transparent';
  const hasFills = figmaNode.fills && figmaNode.fills.length > 0;

  if (hasBackgroundColor && !hasFills) {
    score -= 20;
    issues.push({
      severity: 'warning',
      category: 'color',
      message: 'Background color not applied',
      nodeId: figmaNode.id,
      suggestedFix: `Apply fill: ${original.styles['background-color']}`,
    });
  }

  // Check border color
  const hasBorderColor = original.styles['border-color'] && original.styles['border-color'] !== 'transparent';
  const hasStrokes = figmaNode.strokes && figmaNode.strokes.length > 0;

  if (hasBorderColor && !hasStrokes) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'color',
      message: 'Border color not applied',
      nodeId: figmaNode.id,
      suggestedFix: `Apply stroke: ${original.styles['border-color']}`,
    });
  }

  // Check text color
  if (original.textContent && original.styles.color) {
    const hasTextFills = figmaNode.text?.fills && figmaNode.text.fills.length > 0;
    if (!hasTextFills) {
      score -= 10;
      issues.push({
        severity: 'info',
        category: 'color',
        message: 'Text color not applied',
        nodeId: figmaNode.id,
      });
    }
  }

  return { score: Math.max(0, score), issues };
};

/**
 * Validate typography accuracy
 */
const validateTypography = (original: HTMLNodeSnapshot, figmaNode: FigmaNodeData): { score: number; issues: QualityIssue[] } => {
  const issues: QualityIssue[] = [];
  let score = 100;

  if (!original.textContent) {
    return { score: 100, issues: [] };
  }

  // Check font family
  const originalFontFamily = original.styles['font-family'];
  const figmaFontFamily = figmaNode.text?.fontFamily;

  if (originalFontFamily && !figmaFontFamily) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'typography',
      message: 'Font family not applied',
      nodeId: figmaNode.id,
      suggestedFix: `Apply font: ${originalFontFamily}`,
    });
  }

  // Check font size
  const originalFontSize = parseFloat(original.styles['font-size'] ?? '0');
  const figmaFontSize = figmaNode.text?.fontSize ?? 0;

  if (originalFontSize > 0) {
    const sizeDiff = Math.abs(originalFontSize - figmaFontSize);
    if (sizeDiff > 2) {
      score -= 10;
      issues.push({
        severity: 'warning',
        category: 'typography',
        message: `Font size mismatch: ${sizeDiff.toFixed(2)}px difference`,
        nodeId: figmaNode.id,
        suggestedFix: `Adjust font size to ${originalFontSize}px`,
      });
    }
  }

  // Check line height
  const originalLineHeight = parseFloat(original.styles['line-height'] ?? '0');
  const figmaLineHeight = figmaNode.text?.lineHeight ?? 0;

  if (originalLineHeight > 0) {
    const lineHeightDiff = Math.abs(originalLineHeight - figmaLineHeight);
    if (lineHeightDiff > 4) {
      score -= 5;
      issues.push({
        severity: 'info',
        category: 'typography',
        message: `Line height mismatch: ${lineHeightDiff.toFixed(2)}px difference`,
        nodeId: figmaNode.id,
      });
    }
  }

  return { score: Math.max(0, score), issues };
};

/**
 * Validate spacing accuracy
 */
const validateSpacing = (original: HTMLNodeSnapshot, figmaNode: FigmaNodeData): { score: number; issues: QualityIssue[] } => {
  const issues: QualityIssue[] = [];
  let score = 100;

  // Check padding
  const originalPaddingTop = parseFloat(original.styles['padding-top'] ?? '0');
  const originalPaddingRight = parseFloat(original.styles['padding-right'] ?? '0');
  const originalPaddingBottom = parseFloat(original.styles['padding-bottom'] ?? '0');
  const originalPaddingLeft = parseFloat(original.styles['padding-left'] ?? '0');

  const hasPadding = originalPaddingTop > 0 || originalPaddingRight > 0 || originalPaddingBottom > 0 || originalPaddingLeft > 0;
  const figmaPadding = figmaNode.padding;

  if (hasPadding && !figmaPadding) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'spacing',
      message: 'Padding not applied',
      nodeId: figmaNode.id,
      suggestedFix: `Apply padding: ${originalPaddingTop}/${originalPaddingRight}/${originalPaddingBottom}/${originalPaddingLeft}`,
    });
  } else if (hasPadding && figmaPadding) {
    const paddingDiffs = [
      Math.abs(originalPaddingTop - figmaPadding.top),
      Math.abs(originalPaddingRight - figmaPadding.right),
      Math.abs(originalPaddingBottom - figmaPadding.bottom),
      Math.abs(originalPaddingLeft - figmaPadding.left),
    ];

    const maxDiff = Math.max(...paddingDiffs);
    if (maxDiff > 4) {
      score -= 10;
      issues.push({
        severity: 'info',
        category: 'spacing',
        message: `Padding mismatch: up to ${maxDiff.toFixed(2)}px difference`,
        nodeId: figmaNode.id,
      });
    }
  }

  // Check gap (for flex/grid containers)
  const originalGap = parseFloat(original.styles.gap ?? '0');
  const figmaGap = figmaNode.itemSpacing ?? 0;

  if (originalGap > 0) {
    const gapDiff = Math.abs(originalGap - figmaGap);
    if (gapDiff > 4) {
      score -= 10;
      issues.push({
        severity: 'warning',
        category: 'spacing',
        message: `Gap mismatch: ${gapDiff.toFixed(2)}px difference`,
        nodeId: figmaNode.id,
        suggestedFix: `Adjust item spacing to ${originalGap}px`,
      });
    }
  }

  return { score: Math.max(0, score), issues };
};

/**
 * Main validation function
 */
export const validateConversion = (original: HTMLNodeSnapshot, figmaNode: FigmaNodeData): QualityMetrics => {
  const layoutResult = validateLayout(original, figmaNode);
  const colorResult = validateColor(original, figmaNode);
  const typographyResult = validateTypography(original, figmaNode);
  const spacingResult = validateSpacing(original, figmaNode);

  const allIssues = [
    ...layoutResult.issues,
    ...colorResult.issues,
    ...typographyResult.issues,
    ...spacingResult.issues,
  ];

  // Calculate overall score with weighted average
  const overallScore =
    layoutResult.score * 0.35 +
    colorResult.score * 0.25 +
    typographyResult.score * 0.2 +
    spacingResult.score * 0.2;

  return {
    layoutAccuracy: layoutResult.score,
    colorAccuracy: colorResult.score,
    typographyAccuracy: typographyResult.score,
    spacingAccuracy: spacingResult.score,
    overallScore: Math.round(overallScore),
    issues: allIssues,
  };
};

/**
 * Validate entire conversion tree
 */
export const validateConversionTree = (
  rootSnapshot: HTMLNodeSnapshot,
  figmaNodes: FigmaNodeData[]
): { metrics: QualityMetrics[]; summary: QualityMetrics } => {
  const nodeMap = new Map<string, FigmaNodeData>();
  figmaNodes.forEach(node => nodeMap.set(node.id, node));

  const metrics: QualityMetrics[] = [];

  const traverse = (snapshot: HTMLNodeSnapshot) => {
    const figmaNode = nodeMap.get(snapshot.id);
    if (figmaNode) {
      const nodeMetrics = validateConversion(snapshot, figmaNode);
      metrics.push(nodeMetrics);
    }

    snapshot.children.forEach(traverse);
  };

  traverse(rootSnapshot);

  // Calculate summary metrics
  const avgLayoutAccuracy = metrics.reduce((sum, m) => sum + m.layoutAccuracy, 0) / metrics.length;
  const avgColorAccuracy = metrics.reduce((sum, m) => sum + m.colorAccuracy, 0) / metrics.length;
  const avgTypographyAccuracy = metrics.reduce((sum, m) => sum + m.typographyAccuracy, 0) / metrics.length;
  const avgSpacingAccuracy = metrics.reduce((sum, m) => sum + m.spacingAccuracy, 0) / metrics.length;
  const avgOverallScore = metrics.reduce((sum, m) => sum + m.overallScore, 0) / metrics.length;

  const allIssues = metrics.flatMap(m => m.issues);

  const summary: QualityMetrics = {
    layoutAccuracy: Math.round(avgLayoutAccuracy),
    colorAccuracy: Math.round(avgColorAccuracy),
    typographyAccuracy: Math.round(avgTypographyAccuracy),
    spacingAccuracy: Math.round(avgSpacingAccuracy),
    overallScore: Math.round(avgOverallScore),
    issues: allIssues,
  };

  logger.info('Validation completed', {
    nodesValidated: metrics.length,
    overallScore: summary.overallScore,
    issuesFound: allIssues.length,
  });

  return { metrics, summary };
};

/**
 * Get quality grade based on score
 */
export const getQualityGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

/**
 * Generate quality report
 */
export const generateQualityReport = (summary: QualityMetrics): string => {
  const grade = getQualityGrade(summary.overallScore);

  const errorCount = summary.issues.filter(i => i.severity === 'error').length;
  const warningCount = summary.issues.filter(i => i.severity === 'warning').length;
  const infoCount = summary.issues.filter(i => i.severity === 'info').length;

  return `
Quality Validation Report
=========================
Overall Score: ${summary.overallScore}/100 (Grade: ${grade})

Detailed Scores:
- Layout Accuracy: ${summary.layoutAccuracy}/100
- Color Accuracy: ${summary.colorAccuracy}/100
- Typography Accuracy: ${summary.typographyAccuracy}/100
- Spacing Accuracy: ${summary.spacingAccuracy}/100

Issues Found: ${summary.issues.length}
- Errors: ${errorCount}
- Warnings: ${warningCount}
- Info: ${infoCount}

${summary.issues.length > 0 ? '\nTop Issues:\n' + summary.issues.slice(0, 10).map((issue, i) =>
  `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}${issue.suggestedFix ? `\n   Fix: ${issue.suggestedFix}` : ''}`
).join('\n') : ''}
`.trim();
};
