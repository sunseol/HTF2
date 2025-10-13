// Figma Plugin Main Code
// This runs in the Figma plugin sandbox

figma.showUI(__html__, { width: 400, height: 700 });

interface FigmaNodeData {
  id: string;
  parentId?: string;
  type: 'FRAME' | 'TEXT' | 'VECTOR' | 'IMAGE';
  name?: string;
  visible?: boolean;
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
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' | 'STRETCH';
  primaryAxisSizingMode?: 'AUTO' | 'FIXED';
  counterAxisSizingMode?: 'AUTO' | 'FIXED';
  primaryAxisAlignContent?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  layoutGrow?: number;
  layoutShrink?: number;
  layoutBasis?: number;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  overflowDirection?: 'HORIZONTAL' | 'VERTICAL' | 'BOTH' | 'NONE';
  clipsContent?: boolean;
  text?: {
    characters: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontStyle?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
    textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
    textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
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
const imageHashCache = new Map<string, string>();

declare const atob: (data: string) => string;

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'convert') {
    try {
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Sending request to backend...' });
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
      await createFigmaNodes(data.nodes);
      figma.ui.postMessage({ type: 'conversion-complete', data });
      figma.notify(`Created ${data.nodes.length} Figma nodes.`);
    } catch (error: any) {
      console.error('Conversion error:', error);
      const message = error?.message || 'Unknown error occurred';
      figma.ui.postMessage({ type: 'conversion-error', error: message });
      figma.notify(`Error: ${message}`, { error: true });
    }
  } else if (msg.type === 'convert-exact-url') {
    try {
      if (!msg.url) {
        throw new Error('URL is required for exact conversion');
      }
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Rendering URL via exact pipeline...' });
      const response = await fetch(`${msg.apiUrl}/render-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: msg.url,
          viewport: msg.viewport,
          waitUntil: msg.waitUntil,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data: ConversionResponse = await response.json();
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
      await createFigmaNodes(data.nodes);
      figma.ui.postMessage({ type: 'conversion-complete', data });
      figma.notify(`Created ${data.nodes.length} nodes from exact replica.`);
    } catch (error: any) {
      console.error('Exact conversion error:', error);
      const message = error?.message || 'Unknown error occurred';
      figma.ui.postMessage({ type: 'conversion-error', error: message });
      figma.notify(`Error: ${message}`, { error: true });
    }
  } else if (msg.type === 'convert-h2d') {
    try {
      if (!msg.data) {
        throw new Error('H2D payload missing');
      }
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Importing H2D archive...' });
      const response = await fetch(`${msg.apiUrl}/import-h2d`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: msg.data, filename: msg.filename }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data: ConversionResponse = await response.json();
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
      await createFigmaNodes(data.nodes);
      figma.ui.postMessage({ type: 'conversion-complete', data });
      figma.notify(`Imported ${data.nodes.length} nodes from H2D archive.`);
    } catch (error: any) {
      console.error('H2D import error:', error);
      const message = error?.message || 'Unknown error occurred';
      figma.ui.postMessage({ type: 'conversion-error', error: message });
      figma.notify(`Error: ${message}`, { error: true });
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
    } else if (nodeData.type === 'IMAGE') {
      node = await createImageNode(nodeData);
    } else if (nodeData.type === 'FRAME') {
      node = createFrameNode(nodeData);
    }

    if (!node) return null;

    // Set common properties
    node.name = nodeData.name || nodeData.type.toLowerCase();

    if (typeof nodeData.visible === 'boolean') {
      node.visible = nodeData.visible;
    }

    if (nodeData.meta?.attributes?.role === 'screenshot' && 'locked' in node) {
      (node as SceneNode & { locked: boolean }).locked = true;
    }

    // Store in map
    nodeMap.set(nodeData.id, node);

    const parentNode = nodeData.parentId ? nodeMap.get(nodeData.parentId) : undefined;
    const parentData = nodeData.parentId ? nodeDataMap.get(nodeData.parentId) : undefined;

    if (parentNode && 'appendChild' in parentNode) {
      parentNode.appendChild(node);
    } else {
      figma.currentPage.appendChild(node);
    }

    applyLayoutParticipation(node, nodeData, parentData);
    applyPosition(node, nodeData, parentData);

    return node;
  } catch (error) {
    console.error(`Error creating node ${nodeData.id}:`, error);
    return null;
  }}

function applyPosition(node: SceneNode, nodeData: FigmaNodeData, parentData?: FigmaNodeData) {
  const parentLayoutMode = parentData?.layoutMode && parentData.layoutMode !== 'NONE';
  const isAbsolute = nodeData.layoutPositioning === 'ABSOLUTE';
  const layoutNode = node as SceneNode & LayoutMixin;

  // For absolute positioned elements, always set position
  if (isAbsolute && 'layoutPositioning' in layoutNode) {
    layoutNode.layoutPositioning = 'ABSOLUTE';
  }

  // Calculate position relative to parent
  const offsetX = parentData ? parentData.boundingBox.x : 0;
  const offsetY = parentData ? parentData.boundingBox.y : 0;

  // If parent has auto layout but child is not absolute, skip position setting
  // Figma auto layout will handle positioning
  if (parentLayoutMode && !isAbsolute) {
    return;
  }

  // Set position for:
  // 1. Nodes without auto layout parents
  // 2. Absolutely positioned nodes
  layoutNode.x = nodeData.boundingBox.x - offsetX;
  layoutNode.y = nodeData.boundingBox.y - offsetY;
}

function applyLayoutParticipation(node: SceneNode, nodeData: FigmaNodeData, parentData?: FigmaNodeData) {
  const layoutNode = node as SceneNode & LayoutMixin;

  if ('layoutPositioning' in layoutNode) {
    layoutNode.layoutPositioning = nodeData.layoutPositioning === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO';
  }

  if (!parentData || parentData.layoutMode === 'NONE') {
    return;
  }

  if (nodeData.layoutAlign) {
    layoutNode.layoutAlign = nodeData.layoutAlign;
  }

  if (nodeData.layoutGrow !== undefined) {
    layoutNode.layoutGrow = nodeData.layoutGrow;
  }

  if (nodeData.layoutShrink !== undefined && 'layoutShrink' in layoutNode) {
    (layoutNode as any).layoutShrink = nodeData.layoutShrink;
  }

  if (nodeData.layoutBasis !== undefined && 'layoutBasis' in layoutNode) {
    (layoutNode as any).layoutBasis = nodeData.layoutBasis;
  }
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

    if (nodeData.primaryAxisAlignItems) {
      frame.primaryAxisAlignItems = nodeData.primaryAxisAlignItems;
    }

    if (nodeData.counterAxisAlignItems) {
      // Figma API doesn't support STRETCH for counterAxisAlignItems
      // Map STRETCH to MAX as a reasonable fallback
      const alignValue = nodeData.counterAxisAlignItems === 'STRETCH' ? 'MAX' : nodeData.counterAxisAlignItems;
      frame.counterAxisAlignItems = alignValue;
    }

    if (nodeData.primaryAxisSizingMode) {
      frame.primaryAxisSizingMode = nodeData.primaryAxisSizingMode;
    }

    if (nodeData.counterAxisSizingMode) {
      frame.counterAxisSizingMode = nodeData.counterAxisSizingMode;
    }

    if (nodeData.layoutWrap) {
      frame.layoutWrap = nodeData.layoutWrap;
    }

    if (nodeData.primaryAxisAlignContent && 'primaryAxisAlignContent' in frame) {
      (frame as any).primaryAxisAlignContent = nodeData.primaryAxisAlignContent;
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

  if (nodeData.layoutPositioning === 'ABSOLUTE' && 'layoutPositioning' in frame) {
    frame.layoutPositioning = 'ABSOLUTE';
  }

  return frame;
}

async function createImageNode(nodeData: FigmaNodeData): Promise<RectangleNode> {
  const rect = figma.createRectangle();

  // Size
  rect.resize(
    Math.max(nodeData.boundingBox.width, 1),
    Math.max(nodeData.boundingBox.height, 1)
  );

  const imageSrc = nodeData.meta?.attributes?.src;
  const imageData = nodeData.meta?.imageData;
  const alt = nodeData.meta?.attributes?.alt;

  // Try to use actual image data if available
  if (imageData) {
    try {
      // Check if it's an SVG data URL
      const isSvg = imageData.startsWith('data:image/svg+xml');

      if (isSvg) {
        // For SVG, try to convert it to PNG first
        // Figma doesn't support SVG fills directly, so we need to rasterize
        try {
          const bytes = decodeBase64ToUint8Array(imageData);
          const image = figma.createImage(bytes);

          rect.fills = [{
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: 'FIT',
          }];

          rect.name = alt || 'SVG Image';
        } catch (svgError) {
          // SVG conversion failed, use placeholder
          console.warn('Could not convert SVG to image:', svgError);
          rect.fills = [{
            type: 'SOLID',
            color: { r: 0.95, g: 0.95, b: 0.95 },
          }];
          rect.name = alt || 'SVG (conversion failed)';
        }
      } else {
        // Regular image (PNG/JPG)
        const bytes = decodeBase64ToUint8Array(imageData);
        const image = figma.createImage(bytes);

        // Use image as fill
        rect.fills = [{
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: 'FIT',
        }];

        // Set name
        if (alt) {
          rect.name = alt;
        } else if (imageSrc) {
          const srcName = imageSrc.substring(imageSrc.lastIndexOf('/') + 1);
          rect.name = srcName.length > 30 ? srcName.substring(0, 30) : srcName;
        } else {
          rect.name = 'Image';
        }
      }
    } catch (error) {
      console.error('Failed to create image from data:', error);
      // Fallback to placeholder
      rect.fills = [{
        type: 'SOLID',
        color: { r: 0.9, g: 0.9, b: 0.9 },
      }];
      rect.name = alt || 'Image (load failed)';

      // Add warning text overlay
      rect.strokes = [{
        type: 'SOLID',
        color: { r: 0.9, g: 0.5, b: 0.1 },
      }];
      rect.strokeWeight = 2;
    }
  } else if (imageSrc) {
    // No image data available - create placeholder
    rect.fills = [{
      type: 'SOLID',
      color: { r: 0.9, g: 0.9, b: 0.9 },
    }];

    if (alt) {
      rect.name = `Image: ${alt}`;
    } else {
      rect.name = `Image: ${imageSrc.substring(imageSrc.lastIndexOf('/') + 1, imageSrc.lastIndexOf('/') + 30)}`;
    }

    // Add border to indicate it's a placeholder
    rect.strokes = [{
      type: 'SOLID',
      color: { r: 0.7, g: 0.7, b: 0.7 },
    }];
    rect.strokeWeight = 1;
  } else {
    // Fallback placeholder
    rect.fills = [{
      type: 'SOLID',
      color: { r: 0.85, g: 0.85, b: 0.85 },
    }];
    rect.name = 'Image (no src)';
    rect.strokes = [{
      type: 'SOLID',
      color: { r: 0.7, g: 0.7, b: 0.7 },
    }];
    rect.strokeWeight = 1;
  }

  // Check if it's a logo or icon from meta
  const isLogo = nodeData.meta?.imageData?.isLogo || nodeData.meta?.classes?.some((c: string) => /logo/i.test(c));
  const isIcon = nodeData.meta?.imageData?.isIcon || nodeData.meta?.classes?.some((c: string) => /icon/i.test(c));

  if (isIcon) {
    rect.cornerRadius = nodeData.boundingBox.width / 4;
  } else if (isLogo) {
    rect.cornerRadius = 4;
  }

  return rect;
}

async function createTextNode(nodeData: FigmaNodeData): Promise<TextNode> {
  const text = figma.createText();

  // Load font before mutating text properties
  const fontFamily = nodeData.text?.fontFamily || 'Inter';
  const fontWeight = normalizeFontWeight(nodeData.text?.fontWeight);
  const fontStyle = resolveFontStyle(fontWeight, nodeData.text?.fontStyle);
  let fontName: FontName = { family: fontFamily, style: fontStyle };

  try {
    await figma.loadFontAsync(fontName);
  } catch (error) {
    // Fallback to Inter with similar weight/style if requested font is unavailable
    const fallbackWeight = normalizeFontWeight(nodeData.text?.fontWeight);
    const fallbackStyle = resolveFontStyle(fallbackWeight, nodeData.text?.fontStyle);
    fontName = { family: 'Inter', style: fallbackStyle };
    try {
      await figma.loadFontAsync(fontName);
    } catch {
      fontName = { family: 'Inter', style: 'Regular' };
      await figma.loadFontAsync(fontName);
    }
  }

  text.fontName = fontName;

  // Text content
  text.characters = nodeData.text?.characters || '';

  // Font size (set before resizing)
  if (nodeData.text?.fontSize) {
    text.fontSize = nodeData.text.fontSize;
  }

  // Size - use auto-resize to prevent truncation
  if (nodeData.boundingBox.width > 0) {
    // Set text auto-resize to WIDTH_AND_HEIGHT first to get full dimensions
    text.textAutoResize = 'WIDTH_AND_HEIGHT';

    // Get the natural size of the text
    const naturalWidth = text.width;
    const naturalHeight = text.height;

    // If the bounding box width is larger than natural width, use fixed width
    if (nodeData.boundingBox.width >= naturalWidth) {
      text.textAutoResize = 'HEIGHT';
      text.resize(nodeData.boundingBox.width, text.height);
    }
    // Otherwise, let it auto-resize to show full text
    else {
      text.textAutoResize = 'WIDTH_AND_HEIGHT';
    }
  } else {
    // If no width specified, use auto-resize
    text.textAutoResize = 'WIDTH_AND_HEIGHT';
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

  if (nodeData.text?.textCase) {
    text.textCase = nodeData.text.textCase;
  }

  if (nodeData.text?.textDecoration) {
    text.textDecoration = nodeData.text.textDecoration;
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

function resolveFontStyle(weightStyle: string, fontStyle?: string): string {
  if (!fontStyle || fontStyle === 'normal') {
    return weightStyle;
  }

  const lowered = fontStyle.toLowerCase();
  if (lowered === 'italic' || lowered === 'oblique') {
    if (weightStyle.toLowerCase().includes('italic')) {
      return weightStyle;
    }
    if (weightStyle === 'Regular') {
      return 'Italic';
    }
    return `${weightStyle} Italic`;
  }

  return weightStyle;
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.includes(',') ? base64.split(',').pop()! : base64;
  const globalAtob = typeof globalThis !== 'undefined' && typeof (globalThis as any).atob === 'function'
    ? (globalThis as any).atob
    : undefined;

  if (globalAtob) {
    const binary = globalAtob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const cleaned = normalized.replace(/[^A-Za-z0-9+/=]/g, '');
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const output: number[] = [];
  let index = 0;

  while (index < cleaned.length) {
    const enc1 = base64Chars.indexOf(cleaned.charAt(index++));
    const enc2 = base64Chars.indexOf(cleaned.charAt(index++));
    const enc3 = base64Chars.indexOf(cleaned.charAt(index++));
    const enc4 = base64Chars.indexOf(cleaned.charAt(index++));

    if (enc1 < 0 || enc2 < 0) {
      break;
    }

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    output.push(chr1 & 0xff);

    if (enc3 >= 0 && enc3 < 64) {
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      output.push(chr2 & 0xff);

      if (enc4 >= 0 && enc4 < 64) {
        const chr3 = ((enc3 & 3) << 6) | enc4;
        output.push(chr3 & 0xff);
      }
    }
  }

  return new Uint8Array(output);
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
    } else if (fill.type === 'IMAGE') {
      const cacheKey = fill.imageRef ?? fill.imageData;
      let imageHash = cacheKey ? imageHashCache.get(cacheKey) : undefined;

      if (!imageHash) {
        if (!fill.imageData) {
          console.warn('Image fill missing imageData; skipping image fill');
          return {
            type: 'SOLID',
            color: { r: 0, g: 0, b: 0 },
            opacity: 0,
          } as SolidPaint;
        }

        const bytes = decodeBase64ToUint8Array(fill.imageData);
        const image = figma.createImage(bytes);
        imageHash = image.hash;
        if (cacheKey) {
          imageHashCache.set(cacheKey, imageHash);
        }
      }

      return {
        type: 'IMAGE',
        imageHash,
        scaleMode: fill.scaleMode ?? 'FILL',
      } as ImagePaint;
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






