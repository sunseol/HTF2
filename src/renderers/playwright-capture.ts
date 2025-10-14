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
const DEFAULT_NAVIGATION_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ?? 45000);
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

const captureImageElement = async (
  element: ElementHandle<Element>,
  elementId: string,
): Promise<string | null> => {
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

    const boundingBox = await element.boundingBox();
    if (!boundingBox || boundingBox.width <= 0 || boundingBox.height <= 0) {
      logger.debug('Skipping image with invalid bounding box', { elementId });
      return null;
    }

    // Try to capture the screenshot
    const screenshot = await element.screenshot({ type: 'png', omitBackground: false });
    const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
    logger.debug('Successfully captured image', { elementId, size: screenshot.length });
    return dataUrl;
  } catch (error: any) {
    logger.debug('Failed to capture image element screenshot', { elementId, error: error.message });
    return null;
  }
};

export interface PlaywrightCaptureArtifact extends RenderedHtmlArtifact {
  rootSnapshot: HTMLNodeSnapshot;
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
    const browser = await this.getBrowser();
    const navigationTimeout = options.navigationTimeoutMs ?? DEFAULT_NAVIGATION_TIMEOUT_MS;
    const context = await browser.newContext({
      viewport: { width, height },
      ignoreHTTPSErrors: options.ignoreHTTPSErrors ?? true,
    });
    context.setDefaultNavigationTimeout(navigationTimeout);
    context.setDefaultTimeout(navigationTimeout);

    let screenshotPath: string | undefined;

    try {
      const { page, description } = await pagePromiseFactory(context, navigationTimeout);
      page.setDefaultNavigationTimeout(navigationTimeout);
      page.setDefaultTimeout(navigationTimeout);
      await page.waitForTimeout(50);

      const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      const domSnapshot = await page.content();

      // Wait for images to load
      await waitForImages(page);

      // Assign temporary IDs to all image elements FIRST (in a single evaluation context)
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

      // Capture screenshots of all images
      const imageElements = await page.$$('img, svg');
      const imageScreenshots = new Map<string, string>();

      for (const element of imageElements) {
        try {
          const elementId = await element.evaluate((el: any) => el.dataset?.tmpId ?? null);
          if (!elementId) {
            continue;
          }
          const dataUrl = await captureImageElement(element, elementId);
          if (dataUrl) {
            imageScreenshots.set(elementId, dataUrl);
          }
        } catch (error) {
          logger.warn('Could not capture element screenshot', { error });
        }
      }

      // SVG 내부의 image 요소들도 캡처
      const svgImageElements = await page.$$('svg image');
      for (const element of svgImageElements) {
        try {
          const elementId = await element.evaluate((el: any) => el.dataset?.tmpId ?? null);
          if (!elementId) {
            continue;
          }
          
          // SVG 내부 이미지를 캡처하려면 부모 SVG를 캡처해야 함
          const parentSvg = await element.evaluateHandle((el: any) => el.closest('svg'));
          if (parentSvg) {
            const parentId = await parentSvg.evaluate((el: any) => el.dataset?.tmpId ?? null);
            if (parentId) {
              const dataUrl = await captureImageElement(parentSvg, elementId);
              if (dataUrl) {
                imageScreenshots.set(elementId, dataUrl);
                logger.debug('Captured SVG internal image', { elementId, parentId });
              }
            }
          }
        } catch (error) {
          logger.warn('Could not capture SVG internal image', { error });
        }
      }

      const rootSnapshotRaw = await page.evaluate(
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
              const originalWidth = actualWidth;
              const originalHeight = actualHeight;

              // width/height 속성 직접 확인
              const widthAttr = element.getAttribute('width');
              const heightAttr = element.getAttribute('height');

              if (widthAttr && heightAttr) {
                const w = parseFloat(widthAttr);
                const h = parseFloat(heightAttr);
                if (!isNaN(w) && !isNaN(h) && w > actualWidth) {
                  actualWidth = w;
                  actualHeight = h;
                }
              }

              // viewBox 속성 확인
              const viewBoxAttr = element.getAttribute('viewBox');
              if (viewBoxAttr) {
                const viewBoxParts = viewBoxAttr.split(/\s+/);
                if (viewBoxParts.length === 4) {
                  const vbWidth = parseFloat(viewBoxParts[2]);
                  const vbHeight = parseFloat(viewBoxParts[3]);
                  if (!isNaN(vbWidth) && !isNaN(vbHeight) && vbWidth > actualWidth) {
                    actualWidth = vbWidth;
                    actualHeight = vbHeight;
                  }
                }
              }

              // 크기가 변경된 경우 로깅
              if (actualWidth !== originalWidth || actualHeight !== originalHeight) {
                console.log('[Playwright] SVG size adjusted:', {
                  id: id,
                  original: { width: originalWidth, height: originalHeight },
                  adjusted: { width: actualWidth, height: actualHeight },
                  position: { x: rect.left, y: rect.top },
                  viewBox: viewBoxAttr,
                  widthAttr: widthAttr,
                  heightAttr: heightAttr
                });
              }
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
            const tagName = element.tagName.toLowerCase();

            if (tagName === 'img' || tagName === 'svg') {
              // Get the temporary ID from dataset
              const tmpId = element.dataset?.tmpId;
              if (tmpId) {
                // Store the ID so we can match it later
                attributes['data-tmp-id'] = tmpId;
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
      );

      const rootSnapshot = rootSnapshotRaw as unknown as HTMLNodeSnapshot;

      // 이미지 다운로드 실행
      logger.info('Starting image download process...');
      const downloadedImages = await this.imageDownloadService.downloadImagesFromSnapshot(rootSnapshot);
      
      // 다운로드된 이미지를 스냅샷에 적용
      const applyDownloadedImages = (snapshot: HTMLNodeSnapshot) => {
        // img 태그 처리
        if (snapshot.tagName === 'img' && snapshot.attributes?.src) {
          const src = snapshot.attributes.src;
          const downloadedImage = downloadedImages.get(src);
          
          if (downloadedImage?.success && downloadedImage.data) {
            snapshot.imageData = downloadedImage.data;
            snapshot.isDownloadedImage = true;
            logger.debug('Applied downloaded image', { src, format: downloadedImage.format });
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

      // 기존 이미지 스크린샷 적용 (원본 SVG만)
      const applyImageData = (snapshot: HTMLNodeSnapshot) => {
        const tmpId = snapshot.attributes['data-tmp-id'];
        if (tmpId && imageScreenshots.has(tmpId)) {
          const screenshotData = imageScreenshots.get(tmpId);
          if (screenshotData) {
            // SVG 스크린샷을 PNG로 변환
            if (snapshot.tagName === 'svg' && screenshotData.startsWith('data:image/svg')) {
              // SVG 스크린샷을 PNG로 변환하는 로직
              try {
                // SVG 데이터 추출
                const svgData = screenshotData.split(',')[1];
                const decodedSvg = Buffer.from(svgData, 'base64').toString('utf-8');
                
                // 간단한 SVG to PNG 변환 (실제로는 더 복잡한 로직 필요)
                // 여기서는 스크린샷 데이터를 그대로 사용
                snapshot.imageData = screenshotData;
                snapshot.isDownloadedImage = false;
                
                logger.debug('Applied SVG screenshot', { 
                  nodeId: snapshot.id, 
                  tmpId,
                  svgLength: decodedSvg.length 
                });
              } catch (error) {
                logger.warn('SVG screenshot processing failed', { error: error.message });
                snapshot.imageData = screenshotData;
                snapshot.isDownloadedImage = false;
              }
            } else {
              snapshot.imageData = screenshotData;
              snapshot.isDownloadedImage = false;
            }
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
    return this.capturePage(
      async (context, navigationTimeout) => {
        const page = await context.newPage();
        await page.goto(url, { waitUntil, timeout: navigationTimeout });
        return { page, description: { source: 'url', url, title: await page.title() } };
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





