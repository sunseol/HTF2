import { logger } from '../utils/logger';

export interface SvgToPngResult {
  success: boolean;
  pngData?: string; // base64 encoded PNG data
  error?: string;
}

export class SvgToPngService {
  /**
   * SVG를 PNG로 변환
   */
  async convertSvgToPng(svgData: string): Promise<SvgToPngResult> {
    try {
      // SVG 데이터가 유효한지 확인
      if (!svgData || !svgData.includes('<svg')) {
        return { success: false, error: 'Invalid SVG data' };
      }

      logger.debug('Converting SVG to PNG', { svgLength: svgData.length });

      // SVG를 Canvas로 렌더링하여 PNG로 변환
      const canvas = this.createCanvasFromSvg(svgData);
      if (!canvas) {
        return { success: false, error: 'Failed to create canvas from SVG' };
      }

      // Canvas를 PNG로 변환
      const pngDataUrl = canvas.toDataURL('image/png');
      const base64Data = pngDataUrl.split(',')[1]; // data:image/png;base64, 부분 제거

      logger.debug('SVG converted to PNG successfully', { 
        originalLength: svgData.length,
        pngLength: base64Data.length 
      });

      return {
        success: true,
        pngData: `data:image/png;base64,${base64Data}`
      };
    } catch (error) {
      logger.warn('SVG to PNG conversion failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * SVG를 Canvas로 렌더링
   */
  private createCanvasFromSvg(svgData: string): HTMLCanvasElement | null {
    try {
      // SVG 문자열을 DOM 요소로 변환
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) {
        return null;
      }

      // SVG 크기 추출
      const width = parseInt(svgElement.getAttribute('width') || '100');
      const height = parseInt(svgElement.getAttribute('height') || '100');
      const viewBox = svgElement.getAttribute('viewBox');
      
      let finalWidth = width;
      let finalHeight = height;
      
      // viewBox가 있으면 비율 계산
      if (viewBox) {
        const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
        if (vbWidth && vbHeight) {
          const aspectRatio = vbWidth / vbHeight;
          if (width && height) {
            // 지정된 크기 사용
            finalWidth = width;
            finalHeight = height;
          } else {
            // viewBox 비율로 크기 계산
            finalWidth = Math.max(width || 100, 100);
            finalHeight = finalWidth / aspectRatio;
          }
        }
      }

      // Canvas 생성
      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      // SVG를 이미지로 변환
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      return new Promise<HTMLCanvasElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
          URL.revokeObjectURL(svgUrl);
          resolve(canvas);
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve(null);
        };
        img.src = svgUrl;
      });
    } catch (error) {
      logger.warn('Canvas creation failed', { error: error.message });
      return null;
    }
  }
}
