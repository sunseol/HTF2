import type { HTMLNodeSnapshot } from '../types/converter.types';
import type { FigmaNodeData } from '../types/figma.types';
import { logger } from '../utils/logger';

export interface ImageInfo {
  nodeId: string;
  src: string;
  alt?: string;
  width: number;
  height: number;
  isLogo?: boolean;
  isIcon?: boolean;
  isSvg?: boolean;
  isDownloadedImage?: boolean; // 다운로드된 이미지인지 구분
  imageData?: string; // base64 encoded image data
}

export interface ProcessedImage {
  nodeId: string;
  originalSrc: string;
  processedSrc?: string;
  width: number;
  height: number;
  type: 'raster' | 'svg' | 'icon';
  vectorized?: boolean;
}

/**
 * Detect if an image is a logo based on various heuristics
 */
const isLogoImage = (snapshot: HTMLNodeSnapshot): boolean => {
  const { attributes, classes, styles, id } = snapshot;
  const classString = classes.join(' ').toLowerCase();
  const alt = attributes.alt?.toLowerCase() || '';
  const src = attributes.src?.toLowerCase() || '';
  const idString = (id || '').toLowerCase();

  // Check class names
  if (/logo|brand/.test(classString)) {
    return true;
  }

  // Check alt text
  if (/logo|brand|google/.test(alt)) {
    return true;
  }

  // Check src path
  if (/logo|brand/.test(src)) {
    return true;
  }

  // Check ID
  if (/logo|brand/.test(idString)) {
    return true;
  }

  // Check size - logos are typically medium-sized
  const width = snapshot.boundingBox.width;
  const height = snapshot.boundingBox.height;

  // Google 로고는 보통 중간 크기 (50-400px 너비)
  if (width > 50 && width < 400 && height > 20 && height < 200) {
    // Check if it's in the header or top area (페이지 상단 300px 이내)
    const y = snapshot.boundingBox.y;
    if (y < 300) {
      return true;
    }
  }

  return false;
};

/**
 * Detect if an image is an icon
 */
const isIconImage = (snapshot: HTMLNodeSnapshot): boolean => {
  const { attributes, classes, styles } = snapshot;
  const classString = classes.join(' ').toLowerCase();
  const alt = attributes.alt?.toLowerCase() || '';

  // Check class names
  if (/icon|ico/.test(classString)) {
    return true;
  }

  // Check alt text
  if (/icon/.test(alt)) {
    return true;
  }

  // Check size - icons are typically small
  const width = parseFloat(styles.width ?? '0');
  const height = parseFloat(styles.height ?? '0');
  if (width <= 48 && height <= 48 && width > 0 && height > 0) {
    return true;
  }

  return false;
};

/**
 * Extract image information from snapshot
 */
export const extractImageInfo = (snapshot: HTMLNodeSnapshot): ImageInfo | null => {
  if (snapshot.tagName !== 'img' && snapshot.tagName !== 'svg') {
    return null;
  }

  const src = snapshot.attributes.src || snapshot.attributes['data-src'] || '';
  const alt = snapshot.attributes.alt;
  const width = snapshot.boundingBox.width;
  const height = snapshot.boundingBox.height;

  const isLogo = isLogoImage(snapshot);
  const isIcon = isIconImage(snapshot);
  const isSvg = snapshot.tagName === 'svg';

  // 다운로드된 이미지인지 확인
  const isDownloadedImage = !!snapshot.imageData && snapshot.imageData.startsWith('data:image/');

  // 원본 SVG인지 확인 (다운로드된 이미지가 아닌 경우)
  const isOriginalSvg = isSvg && !isDownloadedImage;

  // SVG 내부에 image 요소가 있는지 확인
  const hasSvgImage = isSvg && snapshot.children.some(child => child.tagName === 'image');

  // 로고인 경우 크기 로깅
  if (isLogo) {
    logger.debug('Logo detected with size:', {
      nodeId: snapshot.id,
      src: src?.substring(0, 50),
      alt,
      width,
      height,
      boundingBox: snapshot.boundingBox,
      hasImageData: !!snapshot.imageData,
      imageDataLength: snapshot.imageData?.length
    });
  }

  return {
    nodeId: snapshot.id,
    src: src || (isOriginalSvg ? 'svg-element' : '') || (hasSvgImage ? 'svg-with-image' : ''),
    alt,
    width,
    height,
    isLogo,
    isIcon,
    isSvg: isOriginalSvg, // 원본 SVG만 true
    isDownloadedImage, // 다운로드된 이미지 플래그
    imageData: snapshot.imageData,
  };
};

/**
 * Process images in the tree and collect them
 */
export const processImagesInTree = (rootSnapshot: HTMLNodeSnapshot): ImageInfo[] => {
  const images: ImageInfo[] = [];

  const traverse = (snapshot: HTMLNodeSnapshot) => {
    const imageInfo = extractImageInfo(snapshot);
    if (imageInfo) {
      images.push(imageInfo);

      // 모든 이미지 상세 정보 로깅
      logger.info('🖼️  Image found:', {
        nodeId: imageInfo.nodeId,
        tagName: snapshot.tagName,
        src: imageInfo.src?.substring(0, 80),
        alt: imageInfo.alt,
        width: imageInfo.width,
        height: imageInfo.height,
        position: { x: snapshot.boundingBox.x, y: snapshot.boundingBox.y },
        isLogo: imageInfo.isLogo,
        isIcon: imageInfo.isIcon,
        hasImageData: !!imageInfo.imageData,
        imageDataLength: imageInfo.imageData?.length || 0,
        classes: snapshot.classes.join(' '),
        id: snapshot.id
      });
    }

    snapshot.children.forEach(traverse);
  };

  traverse(rootSnapshot);

  const withData = images.filter(i => i.imageData).length;
  logger.info(`Found ${images.length} images (${images.filter(i => i.isLogo).length} logos, ${images.filter(i => i.isIcon).length} icons, ${withData} with image data)`);

  return images;
};

/**
 * Enhance image nodes in Figma conversion
 */
export const enhanceImageNodes = (
  nodes: FigmaNodeData[],
  images: ImageInfo[]
): FigmaNodeData[] => {
  const imageMap = new Map<string, ImageInfo>();
  images.forEach(img => imageMap.set(img.nodeId, img));

  return nodes.map(node => {
    const imageInfo = imageMap.get(node.id);
    if (!imageInfo) {
      return node;
    }

    // Enhance meta information
    const enhancedMeta = {
      ...node.meta,
      imageData: {
        src: imageInfo.src,
        alt: imageInfo.alt,
        isLogo: imageInfo.isLogo,
        isIcon: imageInfo.isIcon,
        isSvg: imageInfo.isSvg,
        isDownloadedImage: imageInfo.isDownloadedImage,
        imageData: imageInfo.imageData,
      },
    } as any;

    // For logos and icons, ensure proper sizing
    let enhancedNode = { ...node, meta: enhancedMeta };

    if (imageInfo.isLogo) {
      // Logos maintain their original size from the browser
      logger.debug('Logo detected, keeping original size', {
        nodeId: imageInfo.nodeId,
        width: imageInfo.width,
        height: imageInfo.height
      });
    }

    if (imageInfo.isIcon) {
      // Icons maintain their original size from the browser
      logger.debug('Icon detected, keeping original size', {
        nodeId: imageInfo.nodeId,
        width: imageInfo.width,
        height: imageInfo.height
      });
    }

    return enhancedNode;
  });
};

/**
 * Generate placeholder for missing images
 */
export const generateImagePlaceholder = (imageInfo: ImageInfo): FigmaNodeData => {
  const isLogo = imageInfo.isLogo;
  const isIcon = imageInfo.isIcon;

  let name = 'Image';
  if (isLogo) name = 'Logo';
  else if (isIcon) name = 'Icon';
  if (imageInfo.alt) name = imageInfo.alt;

  return {
    id: imageInfo.nodeId,
    type: 'FRAME',
    name,
    boundingBox: {
      x: 0,
      y: 0,
      width: imageInfo.width,
      height: imageInfo.height,
    },
    fills: [{
      type: 'SOLID',
      color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
    }],
    strokes: [{
      type: 'SOLID',
      color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
    }],
    strokeWeight: 1,
    cornerRadius: isIcon ? imageInfo.width / 4 : 4,
    meta: {
      htmlTag: 'img',
      classes: [],
      attributes: {
        src: imageInfo.src,
        alt: imageInfo.alt || '',
      },
    } as any,
  };
};
