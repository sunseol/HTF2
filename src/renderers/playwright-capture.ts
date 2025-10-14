import { chromium } from 'playwright';
import type { Browser, BrowserContext, ElementHandle, Page } from 'playwright';
import { performance } from 'perf_hooks';
import type { RenderHtmlOptions, RenderedHtmlArtifact } from '../types/renderer.types';
import type { HTMLNodeSnapshot } from '../types/converter.types';
import { saveScreenshot } from '../utils/file-manager';
import { logger } from '../utils/logger';
import { ImageDownloadService } from '../services/image-download-service';

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_NAVIGATION_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ?? 15000);
const IMAGE_LOAD_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_IMAGE_TIMEOUT ?? 5000);
const SVG_IMAGE_LOAD_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_SVG_IMAGE_TIMEOUT ?? 3000);

const STYLE_PROPERTIES = [
  'display',
  'position',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-align',
  'border',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'border-color',
  'border-width',
  'border-style',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'box-shadow',
  'opacity',
  'flex-direction',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'flex-wrap',
  'gap',
  'row-gap',
  'column-gap',
  'place-items',
  'place-content',
  'place-self',
  'grid-template-columns',
  'grid-template-rows',
  'grid-template-areas',
  'grid-auto-columns',
  'grid-auto-rows',
  'grid-auto-flow',
  'grid-column',
  'grid-row',
  'grid-column-start',
  'grid-column-end',
  'grid-row-start',
  'grid-row-end',
  'grid-area',
  'white-space',
  'text-decoration',
  'text-overflow',
  'word-wrap',
  'word-break',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
  'transform',
  'transform-origin',
  'transition',
  'animation',
  'visibility',
  'cursor',
  'pointer-events',
];

const waitForImages = async (page: Page): Promise<void> => {
  try {
    await page.evaluate(
      ({ imageTimeout, svgTimeout }) => {
        const waitForImage = (img: HTMLImageElement, timeout: number) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              resolve();
              return;
            }

            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              img.removeEventListener('load', finish);
              img.removeEventListener('error', finish);
              resolve();
            };

            img.addEventListener('load', finish, { once: true });
            img.addEventListener('error', finish, { once: true });
            setTimeout(finish, timeout);
          });

        const waitForSvgImage = (svg: SVGElement, timeout: number) =>
          new Promise<void>((resolve) => {
            const image = svg.querySelector('image');
            if (!image) {
              resolve();
              return;
            }

            const href = (image as SVGImageElement).href?.baseVal ?? '';
            if (!href) {
              resolve();
              return;
            }

            const linkedImage = new Image();
            linkedImage.crossOrigin = 'anonymous';
            linkedImage.src = href;

            if (linkedImage.complete && linkedImage.naturalWidth > 0 && linkedImage.naturalHeight > 0) {
              resolve();
              return;
            }

            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              linkedImage.removeEventListener('load', finish);
              linkedImage.removeEventListener('error', finish);
              resolve();
            };

            linkedImage.addEventListener('load', finish, { once: true });
            linkedImage.addEventListener('error', finish, { once: true });
            setTimeout(finish, timeout);
          });

        const waitPromises: Promise<void>[] = [];
        document.querySelectorAll('img').forEach((img) => {
          waitPromises.push(waitForImage(img, imageTimeout));
        });
        document.querySelectorAll('svg').forEach((svg) => {
          waitPromises.push(waitForSvgImage(svg, svgTimeout));
        });

        return Promise.all(waitPromises).then(() => undefined);
      },
      { imageTimeout: IMAGE_LOAD_TIMEOUT_MS, svgTimeout: SVG_IMAGE_LOAD_TIMEOUT_MS },
    );
  } catch (error) {
    logger.warn('Failed while waiting for inline images to load', { error });
  }
};

const getAccurateImageSize = async (element: ElementHandle<Element>): Promise<{width: number, height: number}> => {
  return await element.evaluate((el: any) => {
    const tagName = el.tagName.toLowerCase();
    
    if (tagName === 'img') {
      // 실제 이미지 크기 확인
      const naturalWidth = el.naturalWidth;
      const naturalHeight = el.naturalHeight;
      const displayWidth = el.offsetWidth;
      const displayHeight = el.offsetHeight;
      
      // CSS로 크기가 지정된 경우
      const computedStyle = window.getComputedStyle(el);
      const cssWidth = computedStyle.width;
      const cssHeight = computedStyle.height;
      
      // 최종 크기 결정
      let finalWidth = displayWidth;
      let finalHeight = displayHeight;
      
      // CSS 크기가 픽셀 단위로 지정된 경우
      if (cssWidth && cssWidth !== 'auto' && cssWidth.includes('px')) {
        finalWidth = parseFloat(cssWidth);
      }
      if (cssHeight && cssHeight !== 'auto' && cssHeight.includes('px')) {
        finalHeight = parseFloat(cssHeight);
      }
      
      // 비율 유지 확인
      if (naturalWidth > 0 && naturalHeight > 0) {
        const naturalRatio = naturalWidth / naturalHeight;
        const displayRatio = finalWidth / finalHeight;
        
        // 비율이 크게 다른 경우 원본 비율로 조정
        if (Math.abs(naturalRatio - displayRatio) > 0.1) {
          if (finalWidth > finalHeight) {
            finalHeight = finalWidth / naturalRatio;
          } else {
            finalWidth = finalHeight * naturalRatio;
          }
        }
      }
      
      return { width: finalWidth, height: finalHeight };
    }
    
    if (tagName === 'svg') {
      // SVG 크기는 실제 렌더링 크기만 사용 (가장 정확)
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    
    // 기본 경우
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
};

const getAccurateImagePosition = async (element: ElementHandle<Element>): Promise<{x: number, y: number}> => {
  return await element.evaluate((el: any) => {
    // 부모 요소의 스크롤 오프셋 고려
    let offsetX = 0;
    let offsetY = 0;
    
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      offsetX += parent.scrollLeft || 0;
      offsetY += parent.scrollTop || 0;
      parent = parent.parentElement;
    }
    
    const rect = el.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    
    // 정확한 위치 계산
    const x = rect.left - bodyRect.left + offsetX;
    const y = rect.top - bodyRect.top + offsetY;
    
    return { x, y };
  });
};

const captureImageElementWithInfo = async (
  element: ElementHandle<Element>,
  elementId: string,
): Promise<AccurateImageInfo | null> => {
  try {
    // Check if element is visible and has dimensions
    const isVisible = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }

      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!isVisible) {
      logger.debug('Skipping invisible image', { elementId });
      return null;
    }

    // 정확한 크기와 위치 계산
    const [accurateSize, accuratePosition, elementInfo] = await Promise.all([
      getAccurateImageSize(element),
      getAccurateImagePosition(element),
      element.evaluate((el: any) => ({
        tagName: el.tagName.toLowerCase(),
        src: el.src || el.href || null
      }))
    ]);

    if (accurateSize.width <= 0 || accurateSize.height <= 0) {
      logger.debug('Skipping image with invalid size', { elementId, size: accurateSize });
      return null;
    }

    // Try to capture the screenshot
    const screenshot = await element.screenshot({ type: 'png', omitBackground: false });
    const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
    
    const imageInfo: AccurateImageInfo = {
      elementId,
      dataUrl,
      width: accurateSize.width,
      height: accurateSize.height,
      x: accuratePosition.x,
      y: accuratePosition.y,
      tagName: elementInfo.tagName,
      src: elementInfo.src
    };

    logger.debug('Successfully captured image with accurate info', { 
      elementId, 
      size: screenshot.length,
      imageInfo
    });
    
    return imageInfo;
  } catch (error: any) {
    logger.debug('Failed to capture image element screenshot', { elementId, error: error.message });
    return null;
  }
};

const captureImageElement = async (
  element: ElementHandle<Element>,
  elementId: string,
): Promise<string | null> => {
  const imageInfo = await captureImageElementWithInfo(element, elementId);
  return imageInfo?.dataUrl || null;
};

export interface PlaywrightCaptureArtifact extends RenderedHtmlArtifact {
  rootSnapshot: HTMLNodeSnapshot;
}

export interface AccurateImageInfo {
  elementId: string;
  dataUrl: string;
  width: number;
  height: number;
  x: number;
  y: number;
  tagName: string;
  src?: string;
}

class PlaywrightCaptureEngine {
  private browserPromise?: Promise<Browser>;
  private imageDownloadService = new ImageDownloadService();

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium.launch({ headless: true });
      this.browserPromise
        .then((browser) => {
          process.once('exit', () => {
            void browser.close();
          });
        })
        .catch((error) => {
          logger.error('Failed to launch Playwright browser', { error });
          throw error;
        });
    }
    return this.browserPromise;
  }

  private async capturePage(
    pagePromiseFactory: (context: BrowserContext, navigationTimeout: number) => Promise<{ page: import('playwright').Page; description: Record<string, any> }>,
    options: RenderHtmlOptions,
  ): Promise<PlaywrightCaptureArtifact> {
    const start = performance.now();
    const width = options.width ?? DEFAULT_WIDTH;
    const height = options.height ?? DEFAULT_HEIGHT;
    
    logger.info('capturePage: Starting page capture', { width, height });
    
    const browser = await this.getBrowser();
    logger.info('capturePage: Browser obtained');
    
    const navigationTimeout = options.navigationTimeoutMs ?? DEFAULT_NAVIGATION_TIMEOUT_MS;
    logger.info('capturePage: Navigation timeout set', { navigationTimeout });
    const context = await browser.newContext({
      viewport: { width, height },
      ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? true,
      permissions: [], // 모든 권한 비활성화
      extraHTTPHeaders: {
        'Permissions-Policy': 'camera=(), microphone=(), clipboard-write=(), display-capture=()'
      }
    });
    context.setDefaultNavigationTimeout(navigationTimeout);
    context.setDefaultTimeout(navigationTimeout);
    logger.info('capturePage: Context created and configured');

    let screenshotPath: string | undefined;

    try {
      logger.info('capturePage: Calling pagePromiseFactory');
      const { page, description } = await pagePromiseFactory(context, navigationTimeout);
      logger.info('capturePage: Page factory completed', { description });
      page.setDefaultNavigationTimeout(navigationTimeout);
      page.setDefaultTimeout(navigationTimeout);
      
      // Permissions Policy 강제 적용
      await page.addInitScript(() => {
        // Permissions Policy 메타 태그 추가
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Permissions-Policy';
        meta.content = 'camera=(), microphone=(), clipboard-write=(), display-capture=()';
        document.head.appendChild(meta);
      });
      
      await page.waitForTimeout(50);

      const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      const domSnapshot = await page.content();

      // Skip waiting for images to avoid hanging
      logger.info('Skipping image wait to avoid hanging');

      // Assign temporary IDs to all image elements FIRST (in a single evaluation context)
      logger.info('Assigning temporary IDs to image elements...');
      try {
        await page.evaluate(() => {
          const imageElements = document.querySelectorAll('img, svg');
          imageElements.forEach((el: any, index: number) => {
            if (!el.dataset.tmpId) {
              el.dataset.tmpId = `img-${index}-${Math.random().toString(36).substr(2, 9)}`;
            }
          });

          // SVG 내부의 image 요소들도 처리
          const svgImageElements = document.querySelectorAll('svg image');
          svgImageElements.forEach((el: any, index: number) => {
            if (!el.dataset.tmpId) {
              el.dataset.tmpId = `svg-img-${index}-${Math.random().toString(36).substr(2, 9)}`;
            }
          });
        });
        logger.info('Successfully assigned temporary IDs');
      } catch (error) {
        logger.warn('Failed to assign temporary IDs', { error });
      }

      const imageScreenshots = new Map<string, string>();
      const accurateImageInfo = new Map<string, AccurateImageInfo>();

      // 이미지 스크린샷 캡처 (간소화)
      logger.info('Capturing image screenshots...');
      try {
        const imageElements = await page.$$('img, svg');
        logger.info(`Found ${imageElements.length} image elements to capture`);
        
        // 최대 5개만 캡처하여 성능 우선 (중요한 이미지만)
        const maxImages = Math.min(imageElements.length, 5);
        for (let i = 0; i < maxImages; i++) {
          const element = imageElements[i];
          try {
            const tmpId = await element.evaluate((el: any) => el.dataset.tmpId);
            if (tmpId) {
              const screenshot = await Promise.race([
                element.screenshot({ type: 'png', omitBackground: false }),
                new Promise<Buffer>((_, reject) => 
                  setTimeout(() => reject(new Error('Screenshot timeout')), 3000)
                )
              ]);
              const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
              imageScreenshots.set(tmpId, dataUrl);
              logger.info('Captured image screenshot', { tmpId, size: screenshot.length, index: i + 1 });
            }
          } catch (error) {
            logger.warn('Failed to capture image screenshot', { error: (error as Error).message, index: i + 1 });
          }
        }
        
        logger.info(`Captured ${imageScreenshots.size} image screenshots`);
      } catch (error) {
        logger.warn('Image screenshot capture failed', { error: (error as Error).message });
      }

      logger.info('Starting DOM snapshot extraction...');
      logger.info('Progress: DOM extraction started');

      // Set timeout for page.evaluate to avoid hanging
      page.setDefaultTimeout(10000); // 10 seconds max

      const rootSnapshotRaw = await Promise.race([
        page.evaluate(
          ({ styleKeys }) => {
          const keys = styleKeys as string[];
          let counter = 0;

          // SVG 내부의 image 요소들도 스냅샷에 포함
          const svgImageElements = document.querySelectorAll('svg image');
          svgImageElements.forEach((el: any) => {
            if (!el.dataset.tmpId) {
              el.dataset.tmpId = `svg-img-${counter++}-${Math.random().toString(36).substr(2, 9)}`;
            }
          });
          const nextId = () => `node-${counter++}`;

          // Get body element's offset for coordinate normalization
          const bodyRect = document.body.getBoundingClientRect();
          const bodyOffsetX = bodyRect.left;
          const bodyOffsetY = bodyRect.top;

          console.log('[Playwright] Body offset:', {
            x: bodyOffsetX,
            y: bodyOffsetY,
            width: bodyRect.width,
            height: bodyRect.height
          });

          // Extract CSS variables from :root
          const extractCssVariables = (): Record<string, string> => {
            const cssVars: Record<string, string> = {};
            const rootStyles = window.getComputedStyle(document.documentElement);

            // Get all CSS variables from :root
            for (let i = 0; i < rootStyles.length; i++) {
              const propertyName = rootStyles[i];
              if (propertyName.startsWith('--')) {
                cssVars[propertyName] = rootStyles.getPropertyValue(propertyName).trim();
              }
            }

            return cssVars;
          };

          const extract = (element: any, parentId?: string): Record<string, unknown> => {
            const id = nextId();
            const computed = window.getComputedStyle(element);
            const styles: Record<string, string> = {};
            keys.forEach((key) => {
              styles[key] = computed.getPropertyValue(key);
            });

            // Extract CSS variables used in this element
            const cssVariables: Record<string, string> = {};
            for (let i = 0; i < computed.length; i++) {
              const propertyName = computed[i];
              if (propertyName.startsWith('--')) {
                cssVariables[propertyName] = computed.getPropertyValue(propertyName).trim();
              }
            }

            // Get precise bounding box with sub-pixel precision
            const rect = element.getBoundingClientRect();

            // SVG 요소의 경우 실제 렌더링 크기 확인
            let actualWidth = rect.width;
            let actualHeight = rect.height;

            if (element.tagName && element.tagName.toLowerCase() === 'svg') {
              // SVG 크기 계산 개선
              const computedStyle = window.getComputedStyle(element);
              const cssWidth = computedStyle.width;
              const cssHeight = computedStyle.height;
              
              // SVG의 원본 크기 속성 확인
              const svgWidth = element.getAttribute('width');
              const svgHeight = element.getAttribute('height');
              const viewBox = element.getAttribute('viewBox');
              
              // CSS 크기가 명시적으로 설정된 경우 우선 사용
              if (cssWidth && cssWidth !== 'auto' && cssWidth.includes('px')) {
                actualWidth = parseFloat(cssWidth);
              } else if (svgWidth && !svgWidth.includes('%')) {
                actualWidth = parseFloat(svgWidth);
              }
              
              if (cssHeight && cssHeight !== 'auto' && cssHeight.includes('px')) {
                actualHeight = parseFloat(cssHeight);
              } else if (svgHeight && !svgHeight.includes('%')) {
                actualHeight = parseFloat(svgHeight);
              }
              
              // viewBox가 있는 경우 비율 계산
              if (viewBox && actualWidth > 0 && actualHeight > 0) {
                const viewBoxValues = viewBox.split(/[\s,]+/).map((v: string) => parseFloat(v));
                if (viewBoxValues.length >= 4) {
                  const [, , vbWidth, vbHeight] = viewBoxValues;
                  if (vbWidth > 0 && vbHeight > 0) {
                    const aspectRatio = vbWidth / vbHeight;
                    const currentAspectRatio = actualWidth / actualHeight;
                    
                    // 비율이 맞지 않으면 높이를 기준으로 너비 조정
                    if (Math.abs(currentAspectRatio - aspectRatio) > 0.1) {
                      actualWidth = actualHeight * aspectRatio;
                    }
                  }
                }
              }
              
              // 최소 크기 보장 (너무 작으면 기본값 사용)
              if (actualWidth < 1) actualWidth = rect.width || 20;
              if (actualHeight < 1) actualHeight = rect.height || 20;
              
              // 최종 크기는 계산된 값과 실제 렌더링 크기 중 더 큰 값 사용
              actualWidth = Math.max(actualWidth, rect.width);
              actualHeight = Math.max(actualHeight, rect.height);
            }

            // Normalize coordinates relative to body element
            const normalizedX = rect.left - bodyOffsetX;
            const normalizedY = rect.top - bodyOffsetY;
            const attributes: Record<string, string> = {};
            const attrList = Array.from(element.attributes ?? []) as Attr[];
            attrList.forEach((attr) => {
              attributes[attr.name] = attr.value;
            });

            // Get the temporary ID we assigned to image elements
            let imageData: string | undefined;
            let accurateImageInfo: any = undefined;
            const tagName = element.tagName.toLowerCase();

            if (tagName === 'img' || tagName === 'svg') {
              // Get the temporary ID from dataset
              const tmpId = element.dataset?.tmpId;
              if (tmpId) {
                // Store the ID so we can match it later
                attributes['data-tmp-id'] = tmpId;
                
                // 정확한 이미지 정보 추가
                const accurateInfo = (window as any).accurateImageInfo?.get(tmpId);
                if (accurateInfo) {
                  accurateImageInfo = {
                    width: accurateInfo.width,
                    height: accurateInfo.height,
                    x: accurateInfo.x,
                    y: accurateInfo.y,
                    tagName: accurateInfo.tagName,
                    src: accurateInfo.src
                  };
                }
              }
            }

            const childElements = Array.from(element.children);

            // Detect if element uses flexbox or grid
            const isFlexContainer = computed.display === 'flex' || computed.display === 'inline-flex';
            const isGridContainer = computed.display === 'grid' || computed.display === 'inline-grid';

            const result: Record<string, unknown> = {
              id,
              parentId,
              tagName: element.tagName.toLowerCase(),
              attributes,
              classes: Array.from(element.classList),
              textContent: childElements.length === 0 ? (() => {
                const rawText = (element.textContent ?? '').trim();
                if (!rawText) return null;

                // 불필요한 텍스트 필터링
                const unwantedTexts = [
                  '구글 앱', 'Google 앱', 'google app',
                  'HTML Import', 'HTML Import',
                  'Loading...', '로딩 중...'
                ];

                const isUnwanted = unwantedTexts.some(unwanted =>
                  rawText.toLowerCase().includes(unwanted.toLowerCase())
                );

                if (isUnwanted) return null;

                // 버튼 텍스트 정확도 향상
                if (element.tagName === 'button' || element.tagName === 'input' || element.getAttribute('role') === 'button') {
                  // 버튼의 경우 정확한 텍스트 유지
                  const buttonText = element.textContent?.trim() || element.getAttribute('value') || element.getAttribute('aria-label') || rawText;
                  return buttonText;
                }

                // 일반 텍스트의 경우 공백 정리
                return rawText.replace(/\s+/g, ' ').trim();
              })() : null,
              boundingBox: {
                x: normalizedX,
                y: normalizedY,
                width: actualWidth,
                height: actualHeight,
              },
              styles,
              cssVariables: Object.keys(cssVariables).length > 0 ? cssVariables : undefined,
              layoutInfo: {
                isFlexContainer,
                isGridContainer,
              },
              children: childElements.map((child) => extract(child, id)),
            };

            if (imageData) {
              result.imageData = imageData;
            }

            if (accurateImageInfo) {
              result.accurateImageInfo = accurateImageInfo;
            }

            return result;
          };

          if (!document.body) {
            return {
              id: 'node-0',
              parentId: undefined,
              tagName: 'body',
              attributes: {},
              classes: [],
              textContent: null,
              boundingBox: { x: 0, y: 0, width: 0, height: 0 },
              styles: {},
              cssVariables: {},
              layoutInfo: { isFlexContainer: false, isGridContainer: false },
              children: [],
              globalCssVariables: extractCssVariables(),
            };
          }

          const result = extract(document.body, undefined);
          (result as any).globalCssVariables = extractCssVariables();
          return result;
        },
        { styleKeys: STYLE_PROPERTIES },
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DOM snapshot extraction timeout')), 3000)
      )
      ]);

      const rootSnapshot = rootSnapshotRaw as unknown as HTMLNodeSnapshot;
      logger.info('Progress: DOM extraction completed');

      // 이미지 다운로드 실행
      logger.info('Starting image download process...');
      logger.info('Progress: Image download started');
      const downloadedImages = await Promise.race([
        this.imageDownloadService.downloadImagesFromSnapshot(rootSnapshot),
        new Promise<Map<string, any>>((_, reject) => 
          setTimeout(() => reject(new Error('Image download timeout')), 5000)
        )
      ]);
      logger.info('Progress: Image download completed');
      logger.info(`Downloaded ${downloadedImages.size} images`);
      
      // 다운로드된 이미지를 스냅샷에 적용
      let appliedCount = 0;
      const applyDownloadedImages = (snapshot: HTMLNodeSnapshot) => {
        // img 태그 처리
        if (snapshot.tagName === 'img' && snapshot.attributes?.src) {
          const src = snapshot.attributes.src;
          const downloadedImage = downloadedImages.get(src);
          
          if (downloadedImage?.success && downloadedImage.data) {
            snapshot.imageData = downloadedImage.data;
            snapshot.isDownloadedImage = true;
            appliedCount++;
            logger.info('Applied downloaded image', { src: src.substring(0, 50), format: downloadedImage.format, nodeId: snapshot.id });
          } else {
            logger.warn('Failed to apply downloaded image', { src: src.substring(0, 50), success: downloadedImage?.success, nodeId: snapshot.id });
          }
        }
        
        // SVG 내부의 image 요소 처리
        if (snapshot.tagName === 'svg') {
          const findAndApplySvgImages = (svgSnapshot: HTMLNodeSnapshot) => {
            svgSnapshot.children.forEach((child: HTMLNodeSnapshot) => {
              if (child.tagName === 'image' && child.attributes?.href) {
                const href = child.attributes.href;
                const downloadedImage = downloadedImages.get(href);
                
                if (downloadedImage?.success && downloadedImage.data) {
                  // SVG 내부 이미지를 부모 SVG에 적용
                  svgSnapshot.imageData = downloadedImage.data;
                  svgSnapshot.isDownloadedImage = true;
                  logger.debug('Applied downloaded SVG image', { href, format: downloadedImage.format });
                }
              }
              // 재귀적으로 자식 노드들도 처리
              findAndApplySvgImages(child);
            });
          };
          
          findAndApplySvgImages(snapshot);
        }
        
        // CSS background-image 처리
        if (snapshot.styles?.['background-image']) {
          const bgImage = snapshot.styles['background-image'];
          const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          
          if (urlMatch && urlMatch[1].startsWith('http')) {
            const downloadedImage = downloadedImages.get(urlMatch[1]);
            
            if (downloadedImage?.success && downloadedImage.data) {
              // background-image를 별도 이미지 노드로 변환
              snapshot.imageData = downloadedImage.data;
              snapshot.isDownloadedImage = true;
              logger.debug('Applied downloaded background image', { url: urlMatch[1] });
            }
          }
        }
        
        // 자식 노드들도 처리
        snapshot.children.forEach(applyDownloadedImages);
      };

      applyDownloadedImages(rootSnapshot);
      logger.info(`Applied ${appliedCount} downloaded images to snapshots`);

      // 기존 이미지 스크린샷 적용 (원본 SVG만)
      let appliedScreenshots = 0;
      const applyImageData = (snapshot: HTMLNodeSnapshot) => {
        const tmpId = snapshot.attributes['data-tmp-id'];
        if (tmpId && imageScreenshots.has(tmpId)) {
          const screenshotData = imageScreenshots.get(tmpId);
          if (screenshotData) {
            snapshot.imageData = screenshotData;
            snapshot.isDownloadedImage = false;
            appliedScreenshots++;
            logger.info('Applied image screenshot', { 
              nodeId: snapshot.id, 
              tmpId,
              tagName: snapshot.tagName,
              dataLength: screenshotData.length
            });
          }
          // Clean up the temporary ID
          delete snapshot.attributes['data-tmp-id'];
        }
        
        // SVG 내부의 image 요소들도 처리
        if (snapshot.tagName === 'svg') {
          snapshot.children.forEach((child: HTMLNodeSnapshot) => {
            if (child.tagName === 'image') {
              const childTmpId = child.attributes['data-tmp-id'];
              if (childTmpId && imageScreenshots.has(childTmpId)) {
                // SVG 내부 이미지를 부모 SVG에 적용
                snapshot.imageData = imageScreenshots.get(childTmpId);
                snapshot.isDownloadedImage = false;
                
                // SVG 내부 이미지의 위치를 부모 SVG에 반영
                // child의 위치가 부모 SVG 내에서의 상대 위치이므로 이를 고려
                const childX = child.boundingBox.x;
                const childY = child.boundingBox.y;
                const childWidth = child.boundingBox.width;
                const childHeight = child.boundingBox.height;
                
                // 부모 SVG의 크기를 자식 이미지 크기에 맞춤 (필요한 경우)
                if (childWidth > 0 && childHeight > 0) {
                  snapshot.boundingBox = {
                    ...snapshot.boundingBox,
                    width: Math.max(snapshot.boundingBox.width, childWidth),
                    height: Math.max(snapshot.boundingBox.height, childHeight)
                  };
                }
                
                logger.debug('Applied SVG internal image to parent', { 
                  childId: child.id, 
                  parentId: snapshot.id,
                  tmpId: childTmpId,
                  childPosition: { x: childX, y: childY, width: childWidth, height: childHeight },
                  parentSize: { width: snapshot.boundingBox.width, height: snapshot.boundingBox.height }
                });
              }
            }
          });
        }
        
        snapshot.children.forEach(applyImageData);
      };
      applyImageData(rootSnapshot);
      logger.info(`Applied ${appliedScreenshots} image screenshots to snapshots`);

      logger.info(`Captured ${imageScreenshots.size} SVG screenshots and downloaded ${downloadedImages.size} images`);

      if (options.enableScreenshot !== false) {
        try {
          const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
          screenshotPath = await saveScreenshot(screenshotBuffer);
        } catch (error) {
          logger.warn('Failed to capture screenshot via Playwright', { error });
        }
      }

      const duration = performance.now() - start;
      logger.info('Playwright capture completed', { width, height, elementCount, duration, ...description });

      const viewport = { width, height };
      const metadata = {
        url: description.url ?? '',
        title: description.title ?? '',
        viewport,
        processingTimeMs: duration,
      };

      await page.close();

      return {
        domSnapshot,
        rootSnapshot,
        screenshotPath,
        elementCount,
        metadata,
      };
    } catch (error) {
      logger.error('Playwright capture failed', { error });
      
      // 타임아웃 에러인 경우 더 구체적인 메시지 제공
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Page rendering timeout: ${error.message}`);
      }
      
      throw error;
    } finally {
      await context.close();
    }
  }

  public async capture(htmlContent: string, options: RenderHtmlOptions = {}): Promise<PlaywrightCaptureArtifact> {
    const waitUntil = options.waitUntil ?? 'load';
    return this.capturePage(
      async (context, navigationTimeout) => {
        const page = await context.newPage();
        await page.setContent(htmlContent, { waitUntil, timeout: navigationTimeout });
        return { page, description: { source: 'html' } };
      },
      options,
    );
  }

  public async captureUrl(url: string, options: RenderHtmlOptions = {}): Promise<PlaywrightCaptureArtifact> {
    const waitUntil = options.waitUntil ?? 'networkidle';
    logger.info('captureUrl: Starting URL capture', { url, waitUntil });
    
    return this.capturePage(
      async (context, navigationTimeout) => {
        logger.info('captureUrl: Creating new page');
        const page = await context.newPage();
        
        logger.info('captureUrl: Navigating to URL', { url, waitUntil, timeout: navigationTimeout });
        await page.goto(url, { waitUntil, timeout: navigationTimeout });
        logger.info('captureUrl: Navigation completed successfully');
        
        const title = await page.title();
        logger.info('captureUrl: Page title retrieved', { title });
        
        return { page, description: { source: 'url', url, title } };
      },
      options,
    );
  }
}

const engine = new PlaywrightCaptureEngine();

export const captureHtmlWithPlaywright = (
  htmlContent: string,
  options?: RenderHtmlOptions,
): Promise<PlaywrightCaptureArtifact> => engine.capture(htmlContent, options ?? {});

export const captureUrlWithPlaywright = (
  url: string,
  options?: RenderHtmlOptions,
): Promise<PlaywrightCaptureArtifact> => engine.captureUrl(url, options ?? {});





