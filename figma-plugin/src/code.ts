// Figma Plugin Main Code
// This runs in the Figma plugin sandbox

figma.showUI(__html__, { width: 400, height: 700 });

interface FigmaNodeData {
  id: string;
  parentId?: string;
  type: 'FRAME' | 'TEXT' | 'VECTOR' | 'IMAGE';
  name?: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  cornerRadius?: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
  effects?: any[];
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  overflowDirection?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH' | 'NONE';
  clipsContent?: boolean;
  text?: {
    characters: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    fills?: any[];
  };
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
  meta?: any;
}

interface ConversionResponse {
  nodes: FigmaNodeData[];
  vision?: any;
  meta?: any;
  quality?: any;
}

// Map to store created nodes by ID
const nodeMap = new Map<string, SceneNode>();
const nodeDataMap = new Map<string, FigmaNodeData>();

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'convert') {
    try {
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Sending request to backend...' });

      // Call backend API
      const response = await fetch(`${msg.apiUrl}/render-html-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent: msg.htmlContent,
          options: msg.options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data: ConversionResponse = await response.json();

      figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });

      // Create Figma nodes from the response
      await createFigmaNodes(data.nodes);

      figma.ui.postMessage({
        type: 'conversion-complete',
        data: data,
      });

      figma.notify(`??Successfully created ${data.nodes.length} Figma nodes!`);
    } catch (error: any) {
      console.error('Conversion error:', error);
      figma.ui.postMessage({
        type: 'conversion-error',
        error: error.message || 'Unknown error occurred',
      });
      figma.notify(`??Error: ${error.message}`, { error: true });
    }
  } else if (msg.type === 'import-file') {
    figma.notify('File import not yet supported. Please paste HTML directly.', { timeout: 3000 });
  }
};

async function createFigmaNodes(nodes: FigmaNodeData[]): Promise<void> {
  nodeMap.clear();
  nodeDataMap.clear();
  nodes.forEach((node) => nodeDataMap.set(node.id, node));

  // Sort nodes by dependency (parents first)
  const sortedNodes = topologicalSort(nodes);

  // Create nodes in order
  for (const nodeData of sortedNodes) {
    await createNode(nodeData);
  }

  // Focus on the root nodes
  const rootNodes = Array.from(nodeMap.values()).filter(
    (node) => !nodes.find((n) => n.id === (node as any).parentId)
  );

  if (rootNodes.length > 0) {
    figma.currentPage.selection = rootNodes;
    figma.viewport.scrollAndZoomIntoView(rootNodes);
  }
}

function topologicalSort(nodes: FigmaNodeData[]): FigmaNodeData[] {
  const sorted: FigmaNodeData[] = [];
  const visited = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (node.parentId) {
      visit(node.parentId);
    }

    visited.add(nodeId);
    sorted.push(node);
  }

  nodes.forEach((node) => visit(node.id));

  return sorted;
}

async function createNode(nodeData: FigmaNodeData): Promise<SceneNode | null> {
  let node: SceneNode | null = null;

  try {
    if (nodeData.type === 'TEXT') {
      node = await createTextNode(nodeData);
    } else if (nodeData.type === 'FRAME') {
      node = createFrameNode(nodeData);
    }

    if (!node) return null;

    // Set common properties
    node.name = nodeData.name || nodeData.type.toLowerCase();

    // Store in map
    nodeMap.set(nodeData.id, node);

    const parentNode = nodeData.parentId ? nodeMap.get(nodeData.parentId) : undefined;
    const parentData = nodeData.parentId ? nodeDataMap.get(nodeData.parentId) : undefined;

    if (parentNode && 'appendChild' in parentNode) {
      parentNode.appendChild(node);
    } else {
      figma.currentPage.appendChild(node);
    }

    applyPosition(node, nodeData, parentData);

    return node;
  } catch (error) {
    console.error(`Error creating node ${nodeData.id}:`, error);
    return null;
  }}

function applyPosition(node: SceneNode, nodeData: FigmaNodeData, parentData?: FigmaNodeData) {
  const parentLayoutMode = parentData?.layoutMode && parentData.layoutMode !== 'NONE';

  if (parentLayoutMode) {
    return;
  }

  const offsetX = parentData ? parentData.boundingBox.x : 0;
  const offsetY = parentData ? parentData.boundingBox.y : 0;
  const layoutNode = node as SceneNode & LayoutMixin;

  layoutNode.x = nodeData.boundingBox.x - offsetX;
  layoutNode.y = nodeData.boundingBox.y - offsetY;
}

function createFrameNode(nodeData: FigmaNodeData): FrameNode {  const frame = figma.createFrame();

  // Size
  frame.resize(
    Math.max(nodeData.boundingBox.width, 1),
    Math.max(nodeData.boundingBox.height, 1)
  );

  // Fills
  if (nodeData.fills && nodeData.fills.length > 0) {
    frame.fills = convertFills(nodeData.fills);
  }

  // Strokes
  if (nodeData.strokes && nodeData.strokes.length > 0) {
    frame.strokes = convertFills(nodeData.strokes);
  }

  if (nodeData.strokeWeight !== undefined) {
    frame.strokeWeight = nodeData.strokeWeight;
  }

  if (nodeData.strokeAlign) {
    frame.strokeAlign = nodeData.strokeAlign;
  }

  // Corner radius
  if (nodeData.cornerRadius !== undefined) {
    if (typeof nodeData.cornerRadius === 'number') {
      frame.cornerRadius = nodeData.cornerRadius;
    } else {
      frame.topLeftRadius = nodeData.cornerRadius.topLeft;
      frame.topRightRadius = nodeData.cornerRadius.topRight;
      frame.bottomRightRadius = nodeData.cornerRadius.bottomRight;
      frame.bottomLeftRadius = nodeData.cornerRadius.bottomLeft;
    }
  }

  // Effects
  if (nodeData.effects && nodeData.effects.length > 0) {
    frame.effects = convertEffects(nodeData.effects);
  }

  // Auto Layout
  if (nodeData.layoutMode && nodeData.layoutMode !== 'NONE') {
    frame.layoutMode = nodeData.layoutMode;

    if (nodeData.itemSpacing !== undefined) {
      frame.itemSpacing = nodeData.itemSpacing;
    }

    if (nodeData.padding) {
      frame.paddingTop = nodeData.padding.top;
      frame.paddingRight = nodeData.padding.right;
      frame.paddingBottom = nodeData.padding.bottom;
      frame.paddingLeft = nodeData.padding.left;
    }
  }

  // Overflow
  if (nodeData.overflowDirection) {
    // Note: Figma doesn't have direct overflow property, using clipsContent
    frame.clipsContent = nodeData.overflowDirection === 'NONE';
  }

  if (nodeData.clipsContent !== undefined) {
    frame.clipsContent = nodeData.clipsContent;
  }

  return frame;
}

async function createTextNode(nodeData: FigmaNodeData): Promise<TextNode> {
  const text = figma.createText();

  // Load font before mutating text properties
  const fontFamily = nodeData.text?.fontFamily || 'Inter';
  const fontWeight = normalizeFontWeight(nodeData.text?.fontWeight);
  let fontName: FontName = { family: fontFamily, style: fontWeight };

  try {
    await figma.loadFontAsync(fontName);
  } catch (error) {
    // Fallback to Inter Regular if requested font is unavailable
    fontName = { family: 'Inter', style: 'Regular' };
    await figma.loadFontAsync(fontName);
  }

  text.fontName = fontName;

  // Text content
  text.characters = nodeData.text?.characters || '';

  // Size
  if (nodeData.boundingBox.width > 0) {
    text.resize(nodeData.boundingBox.width, nodeData.boundingBox.height || 100);
  }

  // Font size
  if (nodeData.text?.fontSize) {
    text.fontSize = nodeData.text.fontSize;
  }

  // Line height
  if (nodeData.text?.lineHeight) {
    if (nodeData.text.lineHeight < 10) {
      // Relative line height (e.g., 1.6)
      text.lineHeight = { value: nodeData.text.lineHeight * 100, unit: 'PERCENT' };
    } else {
      // Absolute line height (e.g., 24px)
      text.lineHeight = { value: nodeData.text.lineHeight, unit: 'PIXELS' };
    }
  }

  // Letter spacing
  if (nodeData.text?.letterSpacing) {
    text.letterSpacing = { value: nodeData.text.letterSpacing, unit: 'PIXELS' };
  }

  // Text alignment
  if (nodeData.text?.textAlignHorizontal) {
    text.textAlignHorizontal = nodeData.text.textAlignHorizontal;
  }

  if (nodeData.text?.textAlignVertical) {
    text.textAlignVertical = nodeData.text.textAlignVertical;
  }

  // Text fills
  if (nodeData.text?.fills && nodeData.text.fills.length > 0) {
    text.fills = convertFills(nodeData.text.fills);
  }

  return text;
}

function normalizeFontWeight(weight?: number | string): string {
  if (!weight) return 'Regular';

  const weightMap: Record<string, string> = {
    '100': 'Thin',
    '200': 'Extra Light',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Semi Bold',
    '700': 'Bold',
    '800': 'Extra Bold',
    '900': 'Black',
    'normal': 'Regular',
    'bold': 'Bold',
  };

  return weightMap[weight.toString()] || 'Regular';
}

function convertFills(fills: any[]): Paint[] {
  return fills.map((fill) => {
    if (fill.type === 'SOLID') {
      return {
        type: 'SOLID',
        color: {
          r: fill.color.r,
          g: fill.color.g,
          b: fill.color.b,
        },
        opacity: fill.color.a !== undefined ? fill.color.a : (fill.opacity || 1),
      } as SolidPaint;
    } else if (fill.type === 'GRADIENT_LINEAR') {
      return {
        type: 'GRADIENT_LINEAR',
        gradientStops: fill.gradientStops.map((stop: any) => ({
          position: stop.position,
          color: {
            r: stop.color.r,
            g: stop.color.g,
            b: stop.color.b,
            a: stop.color.a !== undefined ? stop.color.a : 1,
          },
        })),
        gradientTransform: calculateGradientTransform(fill.gradientHandlePositions || []),
      } as GradientPaint;
    }

    // Default fallback
    return {
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0 },
      opacity: 1,
    } as SolidPaint;
  });
}

function calculateGradientTransform(handles: any[]): Transform {
  if (handles.length < 2) {
    return [[1, 0, 0], [0, 1, 0]];
  }

  const start = handles[0];
  const end = handles[1];

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return [[1, 0, 0], [0, 1, 0]];
  }

  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    [cos * length, -sin * length, start.x],
    [sin * length, cos * length, start.y],
  ];
}

function convertEffects(effects: any[]): Effect[] {
  const result: Effect[] = [];

  for (const effect of effects) {
    if (effect.type === 'DROP_SHADOW') {
      result.push({
        type: 'DROP_SHADOW',
        color: {
          r: effect.color?.r || 0,
          g: effect.color?.g || 0,
          b: effect.color?.b || 0,
          a: effect.color?.a || 0.25,
        },
        offset: {
          x: effect.offset?.x || 0,
          y: effect.offset?.y || 0,
        },
        radius: effect.radius || 4,
        visible: effect.visible !== false,
        blendMode: 'NORMAL',
      } as DropShadowEffect);
    } else if (effect.type === 'INNER_SHADOW') {
      result.push({
        type: 'INNER_SHADOW',
        color: {
          r: effect.color?.r || 0,
          g: effect.color?.g || 0,
          b: effect.color?.b || 0,
          a: effect.color?.a || 0.25,
        },
        offset: {
          x: effect.offset?.x || 0,
          y: effect.offset?.y || 0,
        },
        radius: effect.radius || 4,
        visible: effect.visible !== false,
        blendMode: 'NORMAL',
      } as InnerShadowEffect);
    } else if (effect.type === 'LAYER_BLUR') {
      result.push({
        type: 'LAYER_BLUR',
        radius: effect.radius || 4,
        visible: effect.visible !== false,
      } as BlurEffect);
    }
  }

  return result;
}

