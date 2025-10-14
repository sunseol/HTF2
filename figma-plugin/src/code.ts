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

interface SpriteInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  originalUrl?: string;
}

interface ImageSpriteSheet {
  spriteImage: string;
  images: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    originalUrl?: string;
  }>;
  totalWidth: number;
  totalHeight: number;
}

interface ConversionResponse {
  nodes: FigmaNodeData[];
  vision?: any;
  meta?: any & {
    spriteSheet?: ImageSpriteSheet;
  };
  quality?: any;
}

// Map to store created nodes by ID
const nodeMap = new Map<string, SceneNode>();
const nodeDataMap = new Map<string, FigmaNodeData>();
const imageHashCache = new Map<string, string>();

// 스프라이트 시트 이미지 캐시
let spriteSheetImageHash: string | undefined;

declare const atob: (data: string) => string;

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'convert') {
    try {
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Sending request to backend...' });
      
      // 타임아웃이 있는 fetch 구현
      const response = await Promise.race([
        fetch(`${msg.apiUrl}/render-html-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            htmlContent: msg.htmlContent,
            options: msg.options,
          }),
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout: Backend took too long to respond')), 60000)
        )
      ]);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data: ConversionResponse = await response.json();
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
      await createFigmaNodes(data.nodes, data.meta?.spriteSheet);
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
      
      // 타임아웃이 있는 fetch 구현
      const response = await Promise.race([
        fetch(`${msg.apiUrl}/render-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: msg.url,
            viewport: msg.viewport,
            waitUntil: msg.waitUntil,
          }),
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout: Backend took too long to respond')), 60000)
        )
      ]);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const data: ConversionResponse = await response.json();
      figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
      await createFigmaNodes(data.nodes, data.meta?.spriteSheet);
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
      await createFigmaNodes(data.nodes, data.meta?.spriteSheet);
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

async function createFigmaNodes(nodes: FigmaNodeData[], spriteSheet?: ImageSpriteSheet): Promise<void> {
  nodeMap.clear();
  nodeDataMap.clear();
  spriteSheetImageHash = undefined;
  nodes.forEach((node) => nodeDataMap.set(node.id, node));

  // 스프라이트 시트 이미지가 있으면 미리 로드
  if (spriteSheet && spriteSheet.spriteImage) {
    try {
      const base64Data = spriteSheet.spriteImage.includes('base64,')
        ? spriteSheet.spriteImage.split('base64,')[1]
        : spriteSheet.spriteImage;

      const bytes = decodeBase64ToUint8Array(base64Data);
      const image = figma.createImage(bytes);
      spriteSheetImageHash = image.hash;

      console.log('Sprite sheet loaded:', {
        hash: spriteSheetImageHash,
        size: `${spriteSheet.totalWidth}x${spriteSheet.totalHeight}`,
        imageCount: spriteSheet.images.length
      });
    } catch (error) {
      console.error('Failed to load sprite sheet:', error);
    }
  }

  // Calculate the bounding box of all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach((node) => {
    minX = Math.min(minX, node.boundingBox.x);
    minY = Math.min(minY, node.boundingBox.y);
    maxX = Math.max(maxX, node.boundingBox.x + node.boundingBox.width);
    maxY = Math.max(maxY, node.boundingBox.y + node.boundingBox.height);
  });

  const containerWidth = maxX - minX;
  const containerHeight = maxY - minY;

  // Create a root container frame - ensure it's large enough to contain all content
  const rootContainer = figma.createFrame();
  rootContainer.name = 'HTML Import';
  // Add padding to ensure all content fits comfortably
  const finalWidth = Math.max(containerWidth + 40, 1920);
  const finalHeight = Math.max(containerHeight + 40, 100);
  rootContainer.resize(finalWidth, finalHeight);
  rootContainer.x = 0;
  rootContainer.y = 0;
  rootContainer.fills = []; // Transparent background
  rootContainer.clipsContent = false; // Don't clip content
  figma.currentPage.appendChild(rootContainer);

  // Sort nodes by dependency (parents first)
  const sortedNodes = topologicalSort(nodes);

  // Create nodes in order
  for (const nodeData of sortedNodes) {
    await createNode(nodeData, rootContainer, minX - 20, minY - 20); // Add 20px offset for padding
  }

  // Adjust layer order: bring image nodes to front
  const imageNodes: SceneNode[] = [];
  
  // Collect image nodes based on original node data
  nodeMap.forEach((node, nodeId) => {
    const nodeData = nodeDataMap.get(nodeId);
    if (nodeData && nodeData.type === 'IMAGE') {
      imageNodes.push(node);
    }
  });

  // Bring image nodes to front
  imageNodes.forEach((imageNode) => {
    try {
      // Use moveInParentOrder to bring to front
      const parent = imageNode.parent;
      if (parent && 'children' in parent) {
        // Move to the end of parent's children array (front layer)
        parent.appendChild(imageNode);
        console.log('Brought image node to front:', imageNode.name);
      }
    } catch (error) {
      console.warn('Failed to bring image node to front:', imageNode.name, error);
    }
  });

  console.log(`Layer order adjusted: ${imageNodes.length} image nodes brought to front`);

  // Focus on the root container
  figma.currentPage.selection = [rootContainer];
  figma.viewport.scrollAndZoomIntoView([rootContainer]);
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

async function createNode(nodeData: FigmaNodeData, rootContainer: FrameNode, offsetX: number, offsetY: number): Promise<SceneNode | null> {
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
      // Attach root nodes to the root container
      rootContainer.appendChild(node);
    }

    applyLayoutParticipation(node, nodeData, parentData);
    applyPosition(node, nodeData, parentData, offsetX, offsetY);

    return node;
  } catch (error) {
    console.error(`Error creating node ${nodeData.id}:`, error);
    return null;
  }}

function applyPosition(node: SceneNode, nodeData: FigmaNodeData, parentData?: FigmaNodeData, rootOffsetX: number = 0, rootOffsetY: number = 0) {
  const parentLayoutMode = parentData?.layoutMode && parentData.layoutMode !== 'NONE';
  const isAbsolute = nodeData.layoutPositioning === 'ABSOLUTE';
  const layoutNode = node as SceneNode & LayoutMixin;

  // Only set ABSOLUTE positioning if parent has auto layout (layoutMode !== 'NONE')
  if (isAbsolute && parentLayoutMode && 'layoutPositioning' in layoutNode) {
    layoutNode.layoutPositioning = 'ABSOLUTE';
  }

  // If parent has auto layout but child is not absolute, skip position setting
  // Figma auto layout will handle positioning
  if (parentLayoutMode && !isAbsolute) {
    return;
  }

  // Calculate position relative to parent or root
  let offsetX: number;
  let offsetY: number;

  // 정확한 이미지 위치 정보가 있으면 우선 사용
  if (nodeData.meta?.accurateImageInfo) {
    const accurateInfo = nodeData.meta.accurateImageInfo;
    offsetX = accurateInfo.x;
    offsetY = accurateInfo.y;
    console.log('Using accurate image position:', {
      id: nodeData.id,
      original: { x: nodeData.boundingBox.x, y: nodeData.boundingBox.y },
      accurate: { x: accurateInfo.x, y: accurateInfo.y }
    });
  } else {
    if (parentData) {
      // Position relative to parent
      offsetX = parentData.boundingBox.x;
      offsetY = parentData.boundingBox.y;
    } else {
      // Position relative to root container (apply global offset)
      offsetX = rootOffsetX;
      offsetY = rootOffsetY;
    }
  }

  // 정확한 위치 계산 - 반올림으로 픽셀 단위 정렬
  const finalX = Math.round(nodeData.boundingBox.x - offsetX);
  const finalY = Math.round(nodeData.boundingBox.y - offsetY);

  // Set position for:
  // 1. Nodes without auto layout parents
  // 2. Absolutely positioned nodes
  layoutNode.x = finalX;
  layoutNode.y = finalY;

  console.log('Applied position:', {
    id: nodeData.id,
    name: nodeData.name,
    type: nodeData.type,
    originalX: nodeData.boundingBox.x,
    originalY: nodeData.boundingBox.y,
    finalX,
    finalY,
    offsetX,
    offsetY
  });
}

function applyLayoutParticipation(node: SceneNode, nodeData: FigmaNodeData, parentData?: FigmaNodeData) {
  const layoutNode = node as SceneNode & LayoutMixin;

  // If parent doesn't exist or has no auto layout, set to AUTO and return early
  if (!parentData || parentData.layoutMode === 'NONE') {
    if ('layoutPositioning' in layoutNode) {
      layoutNode.layoutPositioning = 'AUTO';
    }
    return;
  }

  // Parent has auto layout - now we can set ABSOLUTE if needed
  if ('layoutPositioning' in layoutNode) {
    layoutNode.layoutPositioning = nodeData.layoutPositioning === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO';
  }

  if (nodeData.layoutAlign) {
    // Skip deprecated CENTER and MAX values - let Figma use its default behavior
    const alignValue = nodeData.layoutAlign;
    if (alignValue === 'MIN' || alignValue === 'STRETCH') {
      layoutNode.layoutAlign = alignValue;
    }
    // Don't set CENTER or MAX as they're deprecated
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

  // Fills - prevent large black frames
  if (nodeData.fills && nodeData.fills.length > 0) {
    const fills = convertFills(nodeData.fills);
    // Filter out solid black fills on large frames (likely body/html elements)
    const filteredFills = fills.filter(fill => {
      if (fill.type === 'SOLID' && nodeData.boundingBox.width > 1000 && nodeData.boundingBox.height > 500) {
        const color = fill.color;
        // Check if it's black or very dark
        const isBlack = color.r < 0.1 && color.g < 0.1 && color.b < 0.1;
        return !isBlack;
      }
      return true;
    });
    frame.fills = filteredFills.length > 0 ? filteredFills : [];
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

  // Only set ABSOLUTE positioning if not in an auto layout parent
  // This will be handled in applyPosition instead

  return frame;
}

async function createImageNode(nodeData: FigmaNodeData): Promise<RectangleNode | FrameNode> {
  const rect = figma.createRectangle();

  // SVG 크기 계산 개선
  let width = Math.max(nodeData.boundingBox.width, 1);
  let height = Math.max(nodeData.boundingBox.height, 1);

  // SVG인 경우 특별 처리
  const isSvg = nodeData.meta?.htmlTag === 'svg' || nodeData.meta?.imageData?.isSvg || nodeData.meta?.snapshot?.isSvg;
  const isLogo = nodeData.meta?.imageData?.isLogo || nodeData.meta?.imageInfo?.isLogo;
  
  if (isSvg) {
    if (isLogo) {
      // 로고 SVG는 상위 DIV 크기를 유지 (확대하지 않음)
      console.log('Logo SVG detected, keeping original size:', {
        id: nodeData.id,
        width,
        height,
        boundingBox: nodeData.boundingBox
      });
    } else {
      // 일반 SVG의 경우 최소 크기 보장
      width = Math.max(width, 20);
      height = Math.max(height, 20);
      
      // accurateImageInfo가 있으면 우선 사용 (더 정확한 크기)
      if (nodeData.meta?.accurateImageInfo) {
        const accurateInfo = nodeData.meta.accurateImageInfo;
        if (accurateInfo.width > 0 && accurateInfo.height > 0) {
          width = Math.max(accurateInfo.width, width);
          height = Math.max(accurateInfo.height, height);
          console.log('Using accurate SVG dimensions:', {
            id: nodeData.id,
            original: { width: nodeData.boundingBox.width, height: nodeData.boundingBox.height },
            accurate: { width: accurateInfo.width, height: accurateInfo.height },
            final: { width, height }
          });
        }
      }
      
      // 일반 SVG가 너무 작으면 기본 크기로 확대
      if (width < 30 || height < 30) {
        const scale = Math.max(30 / width, 30 / height);
        width *= scale;
        height *= scale;
        console.log('Scaled up small SVG:', {
          id: nodeData.id,
          original: { width: nodeData.boundingBox.width, height: nodeData.boundingBox.height },
          scaled: { width, height, scale }
        });
      }
    }
  } else {
    // 일반 이미지의 경우 accurateImageInfo 사용
    if (nodeData.meta?.accurateImageInfo) {
      const accurateInfo = nodeData.meta.accurateImageInfo;
      if (accurateInfo.width > 0 && accurateInfo.height > 0) {
        width = accurateInfo.width;
        height = accurateInfo.height;
        console.log('Using accurate image dimensions:', {
          id: nodeData.id,
          original: { width: nodeData.boundingBox.width, height: nodeData.boundingBox.height },
          accurate: { width: accurateInfo.width, height: accurateInfo.height }
        });
      }
    }
  }

  // 스프라이트 정보가 있으면 우선 사용
  const spriteInfo = nodeData.meta?.spriteInfo as SpriteInfo | undefined;
  if (spriteInfo) {
    width = Math.max(spriteInfo.width, 1);
    height = Math.max(spriteInfo.height, 1);
    console.log('Using sprite dimensions:', {
      id: nodeData.id,
      spriteSize: { width: spriteInfo.width, height: spriteInfo.height },
      spritePosition: { x: spriteInfo.x, y: spriteInfo.y }
    });
  }

  // Size
  rect.resize(width, height);

  const isLogoForDebug = nodeData.meta?.imageData?.isLogo;
  const isIconForDebug = nodeData.meta?.imageData?.isIcon;

  console.log('Image node size:', {
    id: nodeData.id,
    name: nodeData.name,
    width,
    height,
    isLogo: isLogoForDebug,
    isIcon: isIconForDebug,
    boundingBox: nodeData.boundingBox
  });

  const imageSrc = nodeData.meta?.attributes?.src;

  // imageData 추출 로직 - 여러 경로 시도
  let imageData: string | undefined;

  // 1. snapshot에서 직접 가져오기 (우선순위 1)
  if (nodeData.meta?.snapshot?.imageData) {
    imageData = nodeData.meta.snapshot.imageData;
  }
  // 2. meta.imageData가 객체인 경우 (ImageInfo 래핑)
  else if (nodeData.meta?.imageData && typeof nodeData.meta.imageData === 'object') {
    const imgObj = nodeData.meta.imageData as any;
    imageData = imgObj.imageData; // ImageInfo.imageData 필드
  }
  // 3. meta.imageData가 직접 문자열인 경우
  else if (nodeData.meta?.imageData && typeof nodeData.meta.imageData === 'string') {
    imageData = nodeData.meta.imageData;
  }
  // 4. attributes에서 직접 가져오기 (data URI)
  else if (nodeData.meta?.attributes?.src && nodeData.meta.attributes.src.startsWith('data:')) {
    imageData = nodeData.meta.attributes.src;
  }
  // 5. 백엔드에서 직접 전달된 이미지 데이터 확인
  else if (nodeData.meta?.imageData && typeof nodeData.meta.imageData === 'string' && nodeData.meta.imageData.startsWith('data:image/')) {
    imageData = nodeData.meta.imageData;
  }

  const alt = nodeData.meta?.attributes?.alt;

  // 이미지 타입 확인 - 여러 경로에서 확인 (중복 선언 제거)
  const isSvgImage = nodeData.meta?.imageData?.isSvg || nodeData.meta?.snapshot?.isSvg || nodeData.meta?.htmlTag === 'svg';
  const isDownloadedImage = nodeData.meta?.imageData?.isDownloadedImage || nodeData.meta?.snapshot?.isDownloadedImage;
  
  console.log('Creating image node:', {
    id: nodeData.id,
    name: nodeData.name,
    tagName: nodeData.meta?.htmlTag,
    src: imageSrc ? imageSrc.substring(0, 50) : 'no-src',
    isSvg: isSvgImage,
    isDownloadedImage,
    hasImageData: !!imageData,
    imageDataType: typeof imageData,
    imageDataLength: typeof imageData === 'string' ? imageData.length : 0,
    imageDataPrefix: typeof imageData === 'string' ? imageData.substring(0, 80) : (imageData ? JSON.stringify(imageData).substring(0, 200) : 'no-data'),
    metaKeys: nodeData.meta ? Object.keys(nodeData.meta) : [],
  });

  // 스프라이트 정보가 있더라도 개별 이미지 데이터를 사용
  // (Figma의 imageTransform으로 스프라이트 시트 일부만 표시하기는 어려움)

  // Try to use actual image data if available
  if (imageData && typeof imageData === 'string' && imageData.length > 0) {
    try {
      // Base64 데이터 추출
      let base64Data = imageData;

      // data:image/png;base64, 형식에서 base64 부분만 추출
      if (imageData.includes('base64,')) {
        base64Data = imageData.split('base64,')[1];
      } else if (imageData.includes(',')) {
        base64Data = imageData.split(',')[1];
      }

      // 공백 제거
      base64Data = base64Data.trim().replace(/\s/g, '');

      console.log('Processing image data:', {
        id: nodeData.id,
        name: nodeData.name,
        tagName: nodeData.meta?.htmlTag,
        originalLength: imageData.length,
        base64Length: base64Data.length,
        isSvg: isSvgImage,
        isDownloadedImage,
        dataPrefix: imageData.substring(0, 50),
        base64Prefix: base64Data.substring(0, 50)
      });

      // Base64 문자열 유효성 검사
      if (base64Data.length === 0) {
        throw new Error('Empty base64 data after extraction');
      }

      // 최소 길이 체크 (PNG 헤더 최소 크기)
      if (base64Data.length < 100) {
        throw new Error(`Base64 data too short: ${base64Data.length} chars`);
      }

      const bytes = decodeBase64ToUint8Array(base64Data);

      // 바이트 배열 유효성 검사
      if (bytes.length === 0) {
        throw new Error('Decoded bytes array is empty');
      }

      console.log('Decoded bytes:', {
        id: nodeData.id,
        byteLength: bytes.length,
        firstBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });

      const image = figma.createImage(bytes);

      // SVG인 경우 스케일 모드 개선
      const scaleMode = isSvgImage ? 'FILL' : 'FIT';
      
      rect.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: scaleMode,
      }];

      // Set name based on image type
      if (isSvgImage) {
        rect.name = alt || 'SVG Image';
        console.log('✓ SVG image created:', nodeData.id, 'hash:', image.hash, 'size:', bytes.length);
      } else if (isDownloadedImage) {
        rect.name = alt || 'Downloaded Image';
        console.log('✓ Downloaded image created:', nodeData.id, 'hash:', image.hash, 'size:', bytes.length);
      } else {
        rect.name = alt || (imageSrc ? imageSrc.split('/').pop()?.substring(0, 30) : 'Image') || 'Image';
        console.log('✓ Image created:', nodeData.id, 'hash:', image.hash, 'size:', bytes.length);
      }
    } catch (error: any) {
      console.error('Failed to create image from data:', {
        error: error.message,
        stack: error.stack,
        imageDataLength: typeof imageData === 'string' ? imageData.length : 0,
        imageDataStart: typeof imageData === 'string' ? imageData.substring(0, 100) : 'not a string',
        isSvg: isSvgImage,
        isDownloadedImage
      });
      
      // SVG 실패 시 텍스트로 대체
      if (isSvgImage) {
        rect.fills = [{
          type: 'SOLID',
          color: { r: 0.95, g: 0.95, b: 0.95 },
        }];
        
        // SVG 텍스트 추가
        const text = figma.createText();
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        text.characters = alt || 'SVG';
        text.fontSize = Math.min(width / 6, height / 2, 16); // 크기에 맞춰 폰트 크기 조정
        text.fills = [{
          type: 'SOLID',
          color: { r: 0.3, g: 0.3, b: 0.3 }
        }];
        
        // 텍스트 중앙 정렬
        text.x = width / 2 - text.width / 2;
        text.y = height / 2 - text.height / 2;
        
        // RectangleNode에는 appendChild가 없으므로 Frame으로 변경
        const frame = figma.createFrame();
        frame.resize(width, height);
        frame.fills = rect.fills;
        frame.appendChild(text);
        frame.name = alt || 'SVG (text fallback)';
        
        console.log('SVG fallback to text:', nodeData.id);
        
        return frame;
      } else {
        // 일반 이미지 실패 시 플레이스홀더
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
      const fileName = imageSrc ? imageSrc.substring(imageSrc.lastIndexOf('/') + 1, imageSrc.lastIndexOf('/') + 30) : 'unknown';
      rect.name = `Image: ${fileName}`;
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
  const isLogoForCorner = nodeData.meta?.imageData?.isLogo || nodeData.meta?.classes?.some((c: string) => /logo/i.test(c));
  const isIconForCorner = nodeData.meta?.imageData?.isIcon || nodeData.meta?.classes?.some((c: string) => /icon/i.test(c));

  if (isIconForCorner) {
    rect.cornerRadius = nodeData.boundingBox.width / 4;
  } else if (isLogoForCorner) {
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






