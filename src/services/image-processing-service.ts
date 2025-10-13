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
  const { attributes, classes, styles } = snapshot;
  const classString = classes.join(' ').toLowerCase();
  const alt = attributes.alt?.toLowerCase() || '';
  const src = attributes.src?.toLowerCase() || '';

  // Check class names
  if (/logo|brand/.test(classString)) {
    return true;
  }

  // Check alt text
  if (/logo|brand/.test(alt)) {
    return true;
  }

  // Check src path
  if (/logo|brand/.test(src)) {
    return true;
  }

  // Check size - logos are typically medium-sized
  const width = parseFloat(styles.width ?? '0');
  const height = parseFloat(styles.height ?? '0');
  if (width > 50 && width < 300 && height > 20 && height < 150) {
    // Check if it's in the header or top area
    const y = snapshot.boundingBox.y;
    if (y < 100) {
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

  return {
    nodeId: snapshot.id,
    src,
    alt,
    width,
    height,
    isLogo,
    isIcon,
    isSvg,
    imageData: snapshot.imageData, // Pass through base64 image data from Playwright
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
      logger.debug('Found image:', {
        src: imageInfo.src?.substring(0, 50),
        alt: imageInfo.alt,
        width: imageInfo.width,
        height: imageInfo.height,
        isLogo: imageInfo.isLogo,
        isIcon: imageInfo.isIcon,
        hasImageData: !!imageInfo.imageData,
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
      },
    } as any;

    // For logos and icons, ensure proper sizing
    let enhancedNode = { ...node, meta: enhancedMeta };

    if (imageInfo.isLogo) {
      // Logos should maintain aspect ratio
      const aspectRatio = imageInfo.width / imageInfo.height;
      if (aspectRatio > 0) {
        enhancedNode.boundingBox = {
          ...enhancedNode.boundingBox,
          width: imageInfo.width,
          height: imageInfo.height,
        };
      }
    }

    if (imageInfo.isIcon) {
      // Icons should be standard sizes (16, 20, 24, 32)
      const standardSizes = [16, 20, 24, 32, 48];
      const closestSize = standardSizes.reduce((prev, curr) =>
        Math.abs(curr - imageInfo.width) < Math.abs(prev - imageInfo.width) ? curr : prev
      );

      enhancedNode.boundingBox = {
        ...enhancedNode.boundingBox,
        width: closestSize,
        height: closestSize,
      };
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
