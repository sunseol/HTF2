import { createCanvas, loadImage, Image as CanvasImage } from 'canvas';
import { logger } from '../utils/logger';

export interface SpriteImageInfo {
  id: string;
  originalUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageSpriteSheet {
  spriteImage: string; // base64 encoded PNG
  images: SpriteImageInfo[];
  totalWidth: number;
  totalHeight: number;
}

export class ImageSpriteService {
  /**
   * 여러 이미지들을 하나의 스프라이트 시트로 합치기
   * @param images - Map of image ID to base64 data
   * @returns ImageSpriteSheet with combined image and position info
   */
  async createSpriteSheet(images: Map<string, { data: string; width?: number; height?: number; originalUrl?: string }>): Promise<ImageSpriteSheet> {
    if (images.size === 0) {
      logger.warn('No images to create sprite sheet');
      return {
        spriteImage: '',
        images: [],
        totalWidth: 0,
        totalHeight: 0
      };
    }

    logger.info(`Creating sprite sheet from ${images.size} images`);

    // 1. 모든 이미지 로드 및 크기 계산
    const loadedImages: Array<{
      id: string;
      image: CanvasImage;
      width: number;
      height: number;
      originalUrl?: string;
    }> = [];

    for (const [id, imageInfo] of images.entries()) {
      try {
        const img = await loadImage(imageInfo.data);
        loadedImages.push({
          id,
          image: img,
          width: imageInfo.width || img.width,
          height: imageInfo.height || img.height,
          originalUrl: imageInfo.originalUrl
        });
      } catch (error) {
        logger.warn(`Failed to load image ${id}:`, error);
      }
    }

    if (loadedImages.length === 0) {
      logger.warn('No images could be loaded for sprite sheet');
      return {
        spriteImage: '',
        images: [],
        totalWidth: 0,
        totalHeight: 0
      };
    }

    // 2. 레이아웃 계산 (간단한 수평 배치 방식)
    // 더 효율적인 packing 알고리즘 사용 가능 (bin packing)
    const layout = this.calculateLayout(loadedImages);

    // 3. 캔버스 생성 및 이미지 배치
    const canvas = createCanvas(layout.totalWidth, layout.totalHeight);
    const ctx = canvas.getContext('2d');

    // 투명 배경
    ctx.clearRect(0, 0, layout.totalWidth, layout.totalHeight);

    // 각 이미지를 스프라이트 시트에 그리기
    const spriteImages: SpriteImageInfo[] = [];
    for (const item of layout.items) {
      ctx.drawImage(item.image, item.x, item.y, item.width, item.height);

      spriteImages.push({
        id: item.id,
        originalUrl: item.originalUrl,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      });

      logger.debug(`Placed image ${item.id} at (${item.x}, ${item.y}) with size ${item.width}x${item.height}`);
    }

    // 4. base64로 인코딩
    const spriteImageData = canvas.toDataURL('image/png');

    logger.info(`Sprite sheet created: ${layout.totalWidth}x${layout.totalHeight} with ${spriteImages.length} images`);

    return {
      spriteImage: spriteImageData,
      images: spriteImages,
      totalWidth: layout.totalWidth,
      totalHeight: layout.totalHeight
    };
  }

  /**
   * 이미지들의 레이아웃 계산
   * 간단한 수평-수직 타일링 방식 (더 효율적인 bin packing 알고리즘으로 대체 가능)
   */
  private calculateLayout(images: Array<{
    id: string;
    image: CanvasImage;
    width: number;
    height: number;
    originalUrl?: string;
  }>): {
    items: Array<{
      id: string;
      image: CanvasImage;
      x: number;
      y: number;
      width: number;
      height: number;
      originalUrl?: string;
    }>;
    totalWidth: number;
    totalHeight: number;
  } {
    // 크기 순으로 정렬 (큰 것부터)
    const sortedImages = [...images].sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      return areaB - areaA;
    });

    // 간단한 bin packing: 한 행에 배치하되, 너무 길어지면 다음 행으로
    const MAX_ROW_WIDTH = 4096; // 최대 행 너비
    const PADDING = 2; // 이미지 간 패딩

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    let maxWidth = 0;

    const items: Array<{
      id: string;
      image: CanvasImage;
      x: number;
      y: number;
      width: number;
      height: number;
      originalUrl?: string;
    }> = [];

    for (const img of sortedImages) {
      // 현재 행에 배치할 수 있는지 확인
      if (currentX + img.width > MAX_ROW_WIDTH && currentX > 0) {
        // 다음 행으로 이동
        currentX = 0;
        currentY += rowHeight + PADDING;
        rowHeight = 0;
      }

      items.push({
        id: img.id,
        image: img.image,
        x: currentX,
        y: currentY,
        width: img.width,
        height: img.height,
        originalUrl: img.originalUrl
      });

      currentX += img.width + PADDING;
      rowHeight = Math.max(rowHeight, img.height);
      maxWidth = Math.max(maxWidth, currentX);
    }

    const totalHeight = currentY + rowHeight;

    return {
      items,
      totalWidth: maxWidth,
      totalHeight
    };
  }

  /**
   * 스프라이트 시트에서 특정 이미지 영역을 추출
   * (디버깅/테스트용)
   */
  async extractFromSprite(
    spriteImageData: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<string> {
    const img = await loadImage(spriteImageData);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 스프라이트 시트에서 특정 영역만 그리기
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

    return canvas.toDataURL('image/png');
  }
}
