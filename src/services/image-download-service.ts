import { logger } from '../utils/logger';

export interface ImageDownloadResult {
  success: boolean;
  data?: string; // base64 encoded image data
  format?: 'png' | 'jpg' | 'svg';
  originalUrl?: string;
  error?: string;
}

export class ImageDownloadService {
  private async downloadImage(url: string): Promise<ImageDownloadResult> {
    try {
      // URL 유효성 검사
      if (!url || !url.startsWith('http')) {
        return { success: false, error: 'Invalid URL' };
      }

      logger.debug('Downloading image', { url });

      // 이미지 다운로드
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000 // 10초 타임아웃
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      
      // Content-Type 확인
      const contentType = response.headers.get('content-type') || '';
      let format: 'png' | 'jpg' | 'svg' = 'png';
      
      if (contentType.includes('svg')) {
        format = 'svg';
      } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        format = 'jpg';
      }

      logger.debug('Image downloaded successfully', { url, format, size: base64.length });

      return {
        success: true,
        data: `data:image/${format};base64,${base64}`,
        format,
        originalUrl: url
      };
    } catch (error) {
      logger.warn('Image download failed', { url, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async downloadImagesFromSnapshot(snapshot: any): Promise<Map<string, ImageDownloadResult>> {
    const results = new Map<string, ImageDownloadResult>();
    
    const extractImageUrls = (node: any): string[] => {
      const urls: string[] = [];
      
      // img 태그의 src 속성
      if (node.tagName === 'img' && node.attributes?.src) {
        const src = node.attributes.src;
        if (src.startsWith('http')) {
          urls.push(src);
        }
      }
      
      // SVG 내부의 image 요소 처리
      if (node.tagName === 'svg') {
        // SVG 내부의 image 요소들 찾기
        const findSvgImages = (svgNode: any): string[] => {
          const svgUrls: string[] = [];
          
          // SVG 내부의 image 요소들 검사
          if (svgNode.children) {
            svgNode.children.forEach((child: any) => {
              if (child.tagName === 'image') {
                // href 또는 xlink:href 속성 확인
                const href = child.attributes?.href || child.attributes?.['xlink:href'];
                if (href && href.startsWith('http')) {
                  svgUrls.push(href);
                  logger.debug('Found SVG internal image URL', { href, nodeId: child.id });
                }
              }
              // 재귀적으로 자식 노드들도 검사
              svgUrls.push(...findSvgImages(child));
            });
          }
          
          return svgUrls;
        };
        
        urls.push(...findSvgImages(node));
      }
      
      // CSS background-image에서 URL 추출
      if (node.styles?.['background-image']) {
        const bgImage = node.styles['background-image'];
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1].startsWith('http')) {
          urls.push(urlMatch[1]);
        }
      }
      
      // 자식 노드들도 검사
      if (node.children) {
        node.children.forEach((child: any) => {
          urls.push(...extractImageUrls(child));
        });
      }
      
      return urls;
    };

    const imageUrls = extractImageUrls(snapshot);
    const uniqueUrls = [...new Set(imageUrls)];

    logger.info(`Found ${uniqueUrls.length} unique image URLs to download`);

    if (uniqueUrls.length === 0) {
      return results;
    }

    // 병렬로 이미지 다운로드 (최대 5개 동시)
    const batchSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      const downloadPromises = batch.map(async (url) => {
        const result = await this.downloadImage(url);
        return { url, result };
      });

      const batchResults = await Promise.all(downloadPromises);
      
      batchResults.forEach(({ url, result }) => {
        results.set(url, result);
      });

      logger.info(`Downloaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueUrls.length / batchSize)}`);
    }

    const successCount = Array.from(results.values()).filter(r => r.success).length;
    logger.info(`Downloaded ${successCount}/${results.size} images successfully`);
    
    return results;
  }
}
