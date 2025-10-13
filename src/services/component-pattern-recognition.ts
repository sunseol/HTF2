import type { HTMLNodeSnapshot } from '../types/converter.types';
import type { FigmaNodeData } from '../types/figma.types';
import { logger } from '../utils/logger';

export interface ComponentPattern {
  type: 'button' | 'card' | 'navigation' | 'form' | 'icon' | 'input' | 'avatar' | 'badge' | 'dialog' | 'dropdown' | 'unknown';
  confidence: number;
  variant?: string;
  properties?: Record<string, any>;
}

export interface RecognizedComponent {
  nodeId: string;
  pattern: ComponentPattern;
  children?: RecognizedComponent[];
}

/**
 * Recognize button patterns
 */
const recognizeButton = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { tagName, classes, attributes, styles } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check HTML semantics
  if (tagName === 'button' || attributes.role === 'button' || attributes.type === 'button') {
    const variant =
      /primary|cta/.test(classString) ? 'primary' :
      /secondary/.test(classString) ? 'secondary' :
      /ghost|text/.test(classString) ? 'ghost' :
      /outline/.test(classString) ? 'outline' :
      'default';

    return {
      type: 'button',
      confidence: 0.95,
      variant,
      properties: {
        size: /small|sm/.test(classString) ? 'small' : /large|lg/.test(classString) ? 'large' : 'medium',
        disabled: attributes.disabled !== undefined || attributes['aria-disabled'] === 'true',
      },
    };
  }

  // Check styling patterns
  if (/btn|button/.test(classString)) {
    const variant =
      /primary/.test(classString) ? 'primary' :
      /secondary/.test(classString) ? 'secondary' :
      'default';

    return {
      type: 'button',
      confidence: 0.85,
      variant,
    };
  }

  // Check CSS properties
  const cursor = styles.cursor?.trim();
  const hasPointer = cursor === 'pointer';
  const hasBackgroundColor = styles['background-color'] && styles['background-color'] !== 'transparent';
  const hasBorderRadius = parseFloat(styles['border-radius'] ?? '0') > 0;

  if (hasPointer && hasBackgroundColor && hasBorderRadius && snapshot.textContent) {
    return {
      type: 'button',
      confidence: 0.7,
      variant: 'default',
    };
  }

  return null;
};

/**
 * Recognize card patterns
 */
const recognizeCard = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { classes, styles, children } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check class names
  if (/card/.test(classString)) {
    return {
      type: 'card',
      confidence: 0.9,
      properties: {
        hasHeader: children.some(child => /header/.test(child.classes.join(' ').toLowerCase())),
        hasFooter: children.some(child => /footer/.test(child.classes.join(' ').toLowerCase())),
      },
    };
  }

  // Check layout patterns
  const hasBoxShadow = styles['box-shadow'] && styles['box-shadow'] !== 'none';
  const hasBorder = styles['border-width'] && parseFloat(styles['border-width']) > 0;
  const hasBorderRadius = parseFloat(styles['border-radius'] ?? '0') > 0;
  const hasBackground = styles['background-color'] && styles['background-color'] !== 'transparent';
  const hasPadding = parseFloat(styles['padding-top'] ?? '0') > 8;

  if ((hasBoxShadow || hasBorder) && hasBorderRadius && hasBackground && hasPadding && children.length >= 2) {
    return {
      type: 'card',
      confidence: 0.75,
      properties: {
        elevated: hasBoxShadow,
      },
    };
  }

  return null;
};

/**
 * Recognize navigation patterns
 */
const recognizeNavigation = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { tagName, classes, attributes, children } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check HTML semantics
  if (tagName === 'nav' || attributes.role === 'navigation') {
    return {
      type: 'navigation',
      confidence: 0.95,
      properties: {
        itemCount: children.length,
      },
    };
  }

  // Check class patterns
  if (/nav|menu|sidebar/.test(classString)) {
    const variant =
      /sidebar/.test(classString) ? 'sidebar' :
      /top|header/.test(classString) ? 'top' :
      /bottom|footer/.test(classString) ? 'bottom' :
      'default';

    return {
      type: 'navigation',
      confidence: 0.85,
      variant,
      properties: {
        itemCount: children.length,
      },
    };
  }

  return null;
};

/**
 * Recognize form patterns
 */
const recognizeForm = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { tagName, classes, attributes, children } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check HTML semantics
  if (tagName === 'form') {
    return {
      type: 'form',
      confidence: 0.95,
      properties: {
        fieldCount: children.filter(child =>
          child.tagName === 'input' ||
          child.tagName === 'textarea' ||
          child.tagName === 'select'
        ).length,
      },
    };
  }

  // Check class patterns
  if (/form/.test(classString)) {
    return {
      type: 'form',
      confidence: 0.8,
    };
  }

  return null;
};

/**
 * Recognize icon patterns
 */
const recognizeIcon = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { tagName, classes, attributes } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check SVG elements
  if (tagName === 'svg') {
    return {
      type: 'icon',
      confidence: 0.95,
      properties: {
        size: parseInt(attributes.width ?? '24') || 24,
      },
    };
  }

  // Check icon classes
  if (/icon|ico|svg/.test(classString)) {
    return {
      type: 'icon',
      confidence: 0.85,
    };
  }

  return null;
};

/**
 * Recognize input field patterns
 */
const recognizeInput = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { tagName, attributes, classes } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check HTML semantics
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    const inputType = attributes.type ?? 'text';
    return {
      type: 'input',
      confidence: 0.95,
      variant: inputType,
      properties: {
        placeholder: attributes.placeholder,
        required: attributes.required !== undefined,
      },
    };
  }

  // Check class patterns
  if (/input|field|textbox/.test(classString)) {
    return {
      type: 'input',
      confidence: 0.8,
    };
  }

  return null;
};

/**
 * Recognize avatar patterns
 */
const recognizeAvatar = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { classes, attributes, styles } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check class patterns
  if (/avatar|profile-pic|user-img/.test(classString) || attributes['data-avatar'] !== undefined) {
    const borderRadius = parseFloat(styles['border-radius'] ?? '0');
    const width = parseFloat(styles.width ?? '0');
    const isCircle = borderRadius >= width / 2;

    return {
      type: 'avatar',
      confidence: 0.9,
      variant: isCircle ? 'circle' : 'rounded',
      properties: {
        size: width,
      },
    };
  }

  return null;
};

/**
 * Recognize badge patterns
 */
const recognizeBadge = (snapshot: HTMLNodeSnapshot): ComponentPattern | null => {
  const { classes, styles, textContent } = snapshot;
  const classString = classes.join(' ').toLowerCase();

  // Check class patterns
  if (/badge|tag|label|chip/.test(classString)) {
    return {
      type: 'badge',
      confidence: 0.85,
      properties: {
        text: textContent,
      },
    };
  }

  // Check styling patterns
  const hasSmallPadding = parseFloat(styles['padding-left'] ?? '0') <= 12 && parseFloat(styles['padding-right'] ?? '0') <= 12;
  const hasSmallHeight = parseFloat(styles.height ?? '0') <= 32;
  const hasBorderRadius = parseFloat(styles['border-radius'] ?? '0') > 0;

  if (textContent && hasSmallPadding && hasSmallHeight && hasBorderRadius) {
    return {
      type: 'badge',
      confidence: 0.7,
    };
  }

  return null;
};

/**
 * Main recognition function
 */
export const recognizeComponentPattern = (snapshot: HTMLNodeSnapshot): ComponentPattern => {
  const recognizers = [
    recognizeButton,
    recognizeCard,
    recognizeNavigation,
    recognizeForm,
    recognizeIcon,
    recognizeInput,
    recognizeAvatar,
    recognizeBadge,
  ];

  for (const recognizer of recognizers) {
    const pattern = recognizer(snapshot);
    if (pattern && pattern.confidence >= 0.7) {
      return pattern;
    }
  }

  return {
    type: 'unknown',
    confidence: 0,
  };
};

/**
 * Recursively recognize components in a tree
 */
export const recognizeComponentsInTree = (rootSnapshot: HTMLNodeSnapshot): RecognizedComponent[] => {
  const recognized: RecognizedComponent[] = [];

  const traverse = (snapshot: HTMLNodeSnapshot): RecognizedComponent | null => {
    const pattern = recognizeComponentPattern(snapshot);

    if (pattern.type !== 'unknown' && pattern.confidence >= 0.7) {
      const component: RecognizedComponent = {
        nodeId: snapshot.id,
        pattern,
        children: [],
      };

      // Recursively process children
      snapshot.children.forEach(child => {
        const childComponent = traverse(child);
        if (childComponent) {
          component.children?.push(childComponent);
        }
      });

      return component;
    }

    // Continue traversing even if this node is not recognized
    snapshot.children.forEach(child => {
      const childComponent = traverse(child);
      if (childComponent) {
        recognized.push(childComponent);
      }
    });

    return null;
  };

  const rootComponent = traverse(rootSnapshot);
  if (rootComponent) {
    recognized.push(rootComponent);
  }

  logger.info(`Recognized ${recognized.length} component patterns`);
  return recognized;
};

/**
 * Apply component patterns to Figma nodes
 */
export const applyComponentPatternsToFigmaNodes = (
  nodes: FigmaNodeData[],
  recognizedComponents: RecognizedComponent[]
): FigmaNodeData[] => {
  const componentMap = new Map<string, ComponentPattern>();

  const buildMap = (components: RecognizedComponent[]) => {
    components.forEach(component => {
      componentMap.set(component.nodeId, component.pattern);
      if (component.children) {
        buildMap(component.children);
      }
    });
  };

  buildMap(recognizedComponents);

  return nodes.map(node => {
    const pattern = componentMap.get(node.id);
    if (pattern && pattern.type !== 'unknown') {
      return {
        ...node,
        meta: {
          ...node.meta,
          componentPattern: pattern,
        },
      };
    }
    return node;
  });
};
