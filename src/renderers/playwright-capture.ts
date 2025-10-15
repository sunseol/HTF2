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
    const elementTagName = el.tagName.toLowerCase();
    
    if (elementTagName === 'img') {
      // ?�제 ?��?지 ?�기 ?�인
      const naturalWidth = el.naturalWidth;
      const naturalHeight = el.naturalHeight;
      const displayWidth = el.offsetWidth;
      const displayHeight = el.offsetHeight;
      
      // CSS�??�기가 지?�된 경우
      const computedStyle = window.getComputedStyle(el);
      const cssWidth = computedStyle.width;
      const cssHeight = computedStyle.height;
      
      // 최종 ?�기 결정
      let finalWidth = displayWidth;
      let finalHeight = displayHeight;
      
      // CSS ?�기가 ?��? ?�위�?지?�된 경우
      if (cssWidth && cssWidth !== 'auto' && cssWidth.includes('px')) {
        finalWidth = parseFloat(cssWidth);
      }
      if (cssHeight && cssHeight !== 'auto' && cssHeight.includes('px')) {
        finalHeight = parseFloat(cssHeight);
      }
      
      // 비율 ?��? ?�인
      if (naturalWidth > 0 && naturalHeight > 0) {
        const naturalRatio = naturalWidth / naturalHeight;
        const displayRatio = finalWidth / finalHeight;
        
        // 비율???�게 ?�른 경우 ?�본 비율�?조정
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
    
    if (elementTagName === 'svg') {
      // SVG ?�기???�제 ?�더�??�기�??�용 (가???�확)
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
    // 부�??�소???�크�??�프??고려
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
    
    // ?�확???�치 계산
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

    // ?�확???�기?�??�치 계산
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
      permissions: [], // 모든 권한 비활?�화
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

      const domStabilityConfig = {
        maxWaitMs: options.domStabilityMaxWaitMs ?? 8000,
        intervalMs: options.domStabilityIntervalMs ?? 250,
        tolerance: options.domStabilityTolerance ?? 20,
        stableIterations: options.domStabilityStableIterations ?? 3,
      };

      const minDomElementCount = options.domMinElementCount ?? 300;
      const extraDomWaitBudgetMs = options.domAdditionalWaitMs ?? 5000;

      const waitForDomStability = async (initialCount: number): Promise<{ stabilized: boolean; finalCount: number }> => {
        const maxChecks = Math.max(1, Math.floor(domStabilityConfig.maxWaitMs / domStabilityConfig.intervalMs));
        let previousCount = initialCount;
        let finalCount = initialCount;
        let stableSamples = 0;

        for (let attempt = 0; attempt < maxChecks; attempt += 1) {
          await page.waitForTimeout(domStabilityConfig.intervalMs);
          const currentCount = await page.evaluate(() => document.querySelectorAll('*').length);
          finalCount = currentCount;
          const delta = Math.abs(currentCount - previousCount);

          logger.debug('DOM stability probe', {
            attempt: attempt + 1,
            currentCount,
            previousCount,
            delta,
            tolerance: domStabilityConfig.tolerance,
            stableSamples,
    });

          if (delta <= domStabilityConfig.tolerance) {
            stableSamples += 1;
            if (stableSamples >= domStabilityConfig.stableIterations) {
              return { stabilized: true, finalCount: currentCount };
            }
          } else {
            stableSamples = 0;
          }

          previousCount = currentCount;
        }

        return { stabilized: false, finalCount };
      };

      const runDomStabilityCheck = async (label: string, initialCount: number): Promise<number> => {
        const { stabilized, finalCount } = await waitForDomStability(initialCount);
        if (stabilized) {
          logger.info(`${label} DOM element count stabilized`, { elementCount: finalCount });
        } else {
          logger.warn(`${label} DOM stability window elapsed before counts stabilized`, {
            elementCount: finalCount,
            config: domStabilityConfig,
    });
        }
        return finalCount;
      };

      // 브라?��? 콘솔 로그�?Node.js 로거�??�달
      page.on('console', msg => {
        const text = msg.text();
        // Google 로고 관??로그�?출력
        if (text.includes('[Google Logo]') || text.includes('[SVG')) {
          logger.info(`[Browser Console] ${text}`);
        }
    });

      // Permissions Policy 강제 ?�용
      await page.addInitScript(() => {
        // Permissions Policy 메�? ?�그 추�?
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Permissions-Policy';
        meta.content = 'camera=(), microphone=(), clipboard-write=(), display-capture=()';
        document.head.appendChild(meta);
    });

      await page.waitForTimeout(50);

      const initialElementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      logger.info('Initial DOM element count observed', { elementCount: initialElementCount });

      let elementCount = await runDomStabilityCheck('Initial', initialElementCount);


      // Skip waiting for images to avoid hanging
      logger.info('Skipping image wait to avoid hanging');

      // Scroll through the page to load all content and lazy-loaded elements
      logger.info('Scrolling through page to load all content...');
      try {
        await page.evaluate(async () => {
          // Get full page height
          const getScrollHeight = () => Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );

          let previousHeight = 0;
          let currentHeight = getScrollHeight();
          const scrollStep = 800; // Scroll 800px at a time
          let scrollPosition = 0;

          // Scroll down gradually to trigger lazy loading
          while (scrollPosition < currentHeight) {
            window.scrollTo(0, scrollPosition);
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait for lazy loading
            scrollPosition += scrollStep;

            // Check if page height increased (lazy loaded content)
            previousHeight = currentHeight;
            currentHeight = getScrollHeight();
          }

          // Scroll to bottom to ensure everything is loaded
          window.scrollTo(0, currentHeight);
          await new Promise(resolve => setTimeout(resolve, 200));

          // Scroll back to top
          window.scrollTo(0, 0);
          await new Promise(resolve => setTimeout(resolve, 100));
    });
        logger.info('Page scrolling completed');
      } catch (error) {
        logger.warn('Failed to scroll page', { error });
      }

      const postScrollElementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      if (postScrollElementCount !== elementCount) {
        logger.info('DOM element count after scroll', {
          before: elementCount,
          after: postScrollElementCount,
          delta: postScrollElementCount - elementCount,
    });
      } else {
        logger.debug('DOM element count unchanged after scroll', { elementCount: postScrollElementCount });
      }
      elementCount = await runDomStabilityCheck('Post-scroll', postScrollElementCount);

      if (elementCount < minDomElementCount && extraDomWaitBudgetMs > 0) {
        let remainingWaitMs = extraDomWaitBudgetMs;
        while (elementCount < minDomElementCount && remainingWaitMs > 0) {
          const waitChunk = Math.min(500, remainingWaitMs);
          await page.waitForTimeout(waitChunk);
          remainingWaitMs -= waitChunk;
          const currentCount = await page.evaluate(() => document.querySelectorAll('*').length);
          if (currentCount !== elementCount) {
            elementCount = await runDomStabilityCheck('Extended', currentCount);
          }
        }

        if (elementCount < minDomElementCount) {
          logger.warn('DOM element count remained below expected minimum', {
            elementCount,
            minDomElementCount,
    });
        } else {
          logger.info('DOM element count increased above minimum after extended wait', { elementCount });
        }
      }

      const domSnapshot = await page.content();

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

          // SVG ?��???image ?�소?�도 처리
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

      // ?��?지 ?�크린샷 캡처 (개선??
      logger.info('Capturing image screenshots...');
      try {
        const imageElements = await page.$$('img, svg');
        logger.info(`Found ${imageElements.length} image elements to capture`);

        // 모든 ?��?지 캡처 (?�능 개선???�해 병렬 처리)
        const capturePromises = imageElements.map(async (element, index) => {
          try {
            const tmpId = await element.evaluate((el: any) => el.dataset.tmpId);
            if (!tmpId) return null;

            // ?��?지가 보이?��? ?�인
            const isVisible = await element.evaluate((el: any) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return rect.width > 0 && rect.height > 0 &&
                     style.display !== 'none' &&
                     style.visibility !== 'hidden';
    });

            if (!isVisible) {
              logger.debug('Skipping invisible image', { tmpId, index });
              return null;
            }

            const screenshot = await Promise.race([
              element.screenshot({ type: 'png', omitBackground: false }),
              new Promise<Buffer>((_, reject) =>
                setTimeout(() => reject(new Error('Screenshot timeout')), 8000)
              )
            ]);
            const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
            logger.debug('Captured image screenshot', { tmpId, size: screenshot.length, index: index + 1 });
            return { tmpId, dataUrl };
          } catch (error) {
            logger.debug('Failed to capture image screenshot', { error: (error as Error).message, index: index + 1 });
            return null;
          }
    });

        const results = await Promise.all(capturePromises);
        results.forEach(result => {
          if (result) {
            imageScreenshots.set(result.tmpId, result.dataUrl);
          }
    });

        logger.info(`Captured ${imageScreenshots.size} image screenshots out of ${imageElements.length} total`);
      } catch (error) {
        logger.warn('Image screenshot capture failed', { error: (error as Error).message });
      }

      // ===== 1?�계: SVG ?�버�?- ?�제 ?�기 ?�인 =====
      logger.info('?�� Debugging SVG sizes...');
      const svgDebugInfo = await page.evaluate(() => {
        const svgs = document.querySelectorAll('svg');
        return Array.from(svgs).slice(0, 10).map(svg => {
          const rect = svg.getBoundingClientRect();
          const parentRect = svg.parentElement?.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(svg);
          const parentComputedStyle = svg.parentElement ? window.getComputedStyle(svg.parentElement) : null;

          return {
            classes: Array.from(svg.classList).join(' '),
            svgRect: { width: rect.width, height: rect.height },
            svgComputed: { width: computedStyle.width, height: computedStyle.height },
            svgAttributes: {
              width: svg.getAttribute('width'),
              height: svg.getAttribute('height'),
              viewBox: svg.getAttribute('viewBox')
            },
            parentRect: parentRect ? { width: parentRect.width, height: parentRect.height } : null,
            parentComputed: parentComputedStyle ? { width: parentComputedStyle.width, height: parentComputedStyle.height } : null,
            parentTag: svg.parentElement?.tagName,
            parentClasses: svg.parentElement ? Array.from(svg.parentElement.classList).join(' ') : ''
          };
    });
    });

      // �?SVG�?개별?�으�?로깅 (??가?�성 ?�게)
      logger.info(`?�� Found ${svgDebugInfo.length} SVG elements to analyze`);
      svgDebugInfo.forEach((svg, index) => {
        logger.info(`SVG #${index + 1}:`, {
          classes: svg.classes || '(no class)',
          svgSize: `${svg.svgRect.width}x${svg.svgRect.height}`,
          parentSize: svg.parentRect ? `${svg.parentRect.width}x${svg.parentRect.height}` : 'no parent',
          parentTag: svg.parentTag || 'no parent',
          computedStyle: svg.svgComputed,
          attributes: svg.svgAttributes
    });
    });

      logger.info('Starting DOM snapshot extraction...');
      logger.info('Progress: DOM extraction started');

      // Set timeout for page.evaluate to avoid hanging
      page.setDefaultTimeout(10000); // 10 seconds max

      const rootSnapshotRaw = await Promise.race([
        page.evaluate(
          ({ styleKeys }) => {
          const keys = styleKeys as string[];
          let counter = 0;

          // SVG ?��???image ?�소?�도 ?�냅?�에 ?�함
          const svgImageElements = document.querySelectorAll('svg image');
          svgImageElements.forEach((el: any) => {
            if (!el.dataset.tmpId) {
              el.dataset.tmpId = `svg-img-${counter++}-${Math.random().toString(36).substr(2, 9)}`;
            }
    });
          const nextId = () => `node-${counter++}`;

          // Get body element's offset for coordinate normalization
          // Use scrollHeight to get full document height instead of viewport height
          const bodyRect = document.body.getBoundingClientRect();
          const bodyOffsetX = bodyRect.left;
          const bodyOffsetY = bodyRect.top;

          // Get full document dimensions
          const fullWidth = Math.max(
            document.body.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth
          );
          const fullHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );

          console.log('[Playwright] Body offset:', {
            x: bodyOffsetX,
            y: bodyOffsetY,
            width: fullWidth,
            height: fullHeight,
            viewportWidth: bodyRect.width,
            viewportHeight: bodyRect.height
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

            // SVG �??��?지 ?�소???�제 ?�더�??�기 ?�인
            let actualWidth = rect.width;
            let actualHeight = rect.height;

            const elemTag = element.tagName && element.tagName.toLowerCase();

            // For body element, use full document dimensions instead of viewport
            if (elemTag === 'body') {
              console.log('[Playwright] Body element detected - applying full dimensions:', {
                viewportWidth: rect.width,
                viewportHeight: rect.height,
                fullWidth,
                fullHeight
    });
              actualWidth = fullWidth;
              actualHeight = fullHeight;
            }

            if (elemTag === 'svg') {
              // SVG??getBoundingClientRect()�??�뢰 (가???�확)
              // 브라?��?가 ?��? ?�확???�더�??�기�??�고 ?�음
              actualWidth = rect.width;
              actualHeight = rect.height;

              // ?? ?�기가 0?�거???�무 ?��? 경우?�만 ?��?방법 ?�용
              if (actualWidth <= 0 || actualHeight <= 0) {
                const computedStyle = window.getComputedStyle(element);
                const cssWidth = computedStyle.width;
                const cssHeight = computedStyle.height;
                const svgWidth = element.getAttribute('width');
                const svgHeight = element.getAttribute('height');

                if (cssWidth && cssWidth !== 'auto' && cssWidth.includes('px')) {
                  actualWidth = parseFloat(cssWidth);
                }
                if (cssHeight && cssHeight !== 'auto' && cssHeight.includes('px')) {
                  actualHeight = parseFloat(cssHeight);
                }

                if (actualWidth <= 0 && svgWidth && !svgWidth.includes('%')) {
                  actualWidth = parseFloat(svgWidth);
                }
                if (actualHeight <= 0 && svgHeight && !svgHeight.includes('%')) {
                  actualHeight = parseFloat(svgHeight);
                }
              }
            } else if (elemTag === 'img') {
              // IMG ?�소???�제 ?�기 ?�인
              const computedStyle = window.getComputedStyle(element);
              const cssWidth = computedStyle.width;
              const cssHeight = computedStyle.height;

              // CSS�??�기가 ?�정??경우
              if (cssWidth && cssWidth !== 'auto' && cssWidth.includes('px')) {
                actualWidth = parseFloat(cssWidth);
              }
              if (cssHeight && cssHeight !== 'auto' && cssHeight.includes('px')) {
                actualHeight = parseFloat(cssHeight);
              }

              // 최소 ?�기 보장
              if (actualWidth < 1) actualWidth = rect.width || 1;
              if (actualHeight < 1) actualHeight = rect.height || 1;
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
            const elementTagName = element.tagName.toLowerCase();

            if (elementTagName === 'img' || elementTagName === 'svg') {
              // Get the temporary ID from dataset
              const tmpId = element.dataset?.tmpId;
              if (tmpId) {
                // Store the ID so we can match it later
                attributes['data-tmp-id'] = tmpId;
                
                // ?�확???��?지 ?�보 추�?
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
                const tagNameLower = element.tagName.toLowerCase();

                const pullValueFromInput = () => {
                  const value = (element as HTMLInputElement).value ?? element.getAttribute('value') ?? '';
                  const aria = element.getAttribute('aria-label') ?? '';
                  const placeholder = element.getAttribute('placeholder') ?? '';
                  return value || placeholder || aria || '';
                };

                if (tagNameLower === 'input') {
                  const inputType = (element.getAttribute('type') || '').toLowerCase();
                  const candidate = pullValueFromInput().trim();
                  if (candidate) {
                    if (['submit', 'button', 'reset'].includes(inputType)) {
                      return candidate;
                    }
                    if ((element as HTMLInputElement).value?.trim()) {
                      return candidate;
                    }
                  }
                }

                if (tagNameLower === 'textarea') {
                  const value = (element as HTMLTextAreaElement).value ?? element.getAttribute('value') ?? '';
                  const placeholder = element.getAttribute('placeholder') ?? element.getAttribute('aria-label') ?? '';
                  const candidate = (value || placeholder).trim();
                  if (candidate) {
                    return candidate;
                  }
                }

                let rawText = (element.textContent ?? '').trim();

                if (!rawText && (tagNameLower === 'button' || tagNameLower === 'input' || element.getAttribute('role') === 'button')) {
                  rawText = (
                    element.textContent?.trim()
                    || (element as HTMLInputElement).value
                    || element.getAttribute('value')
                    || element.getAttribute('aria-label')
                    || element.getAttribute('title')
                    || ''
                  ).trim();
                }

                if (!rawText) return null;

                const unwantedTexts = [
                  'google app',
                  'html import',
                  'loading...'
                ];

                const isUnwanted = unwantedTexts.some(unwanted =>
                  rawText.toLowerCase().includes(unwanted.toLowerCase())
                );

                if (isUnwanted) return null;

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
        setTimeout(() => reject(new Error('DOM snapshot extraction timeout')), options.domSnapshotTimeoutMs ?? 25000)
      )
      ]);

      const rootSnapshot = rootSnapshotRaw as unknown as HTMLNodeSnapshot;
      logger.info('Progress: DOM extraction completed');

      // ===== 2?�계: Google 로고 최종 ?�기 ?�인 =====
      const findGoogleLogoInSnapshot = (snapshot: any): any => {
        if (snapshot.classes && snapshot.classes.includes('lnXdpd')) {
          return snapshot;
        }
        for (const child of snapshot.children || []) {
          const found = findGoogleLogoInSnapshot(child);
          if (found) return found;
        }
        return null;
      };

      const googleLogoSnapshot = findGoogleLogoInSnapshot(rootSnapshot);
      if (googleLogoSnapshot) {
        logger.info('?�� [Google Logo] Found in snapshot:', {
          nodeId: googleLogoSnapshot.id,
          tagName: googleLogoSnapshot.tagName,
          classes: googleLogoSnapshot.classes,
          boundingBox: googleLogoSnapshot.boundingBox,
          attributes: {
            width: googleLogoSnapshot.attributes?.width,
            height: googleLogoSnapshot.attributes?.height,
            viewBox: googleLogoSnapshot.attributes?.viewBox
          }
    });
      } else {
        logger.warn('?�� [Google Logo] NOT FOUND in snapshot!');
      }

      // Fix body element bounding box to use full page dimensions
      const fullPageDimensions = await page.evaluate(() => {
        return {
          fullWidth: Math.max(
            document.body.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.scrollWidth,
            document.documentElement.offsetWidth
          ),
          fullHeight: Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          )
        };
    });

      logger.info('Full page dimensions calculated', fullPageDimensions);

      // Apply full page dimensions to body element
      if (rootSnapshot.tagName === 'body') {
        logger.info('Applying full page dimensions to body element', {
          before: rootSnapshot.boundingBox,
          after: {
            x: 0,
            y: 0,
            width: fullPageDimensions.fullWidth,
            height: fullPageDimensions.fullHeight
          }
    });

        rootSnapshot.boundingBox = {
          x: 0,
          y: 0,
          width: fullPageDimensions.fullWidth,
          height: fullPageDimensions.fullHeight
        };
      }

      // ?��?지 ?�운로드 ?�행 (?�?�아??증�?)
      logger.info('Starting image download process...');
      logger.info('Progress: Image download started');
      const downloadedImages = await Promise.race([
        this.imageDownloadService.downloadImagesFromSnapshot(rootSnapshot),
        new Promise<Map<string, any>>((_, reject) =>
          setTimeout(() => reject(new Error('Image download timeout')), 15000)
        )
      ]).catch((error) => {
        logger.warn('Image download failed or timed out', { error: (error as Error).message });
        return new Map<string, any>();
    });
      logger.info('Progress: Image download completed');
      logger.info(`Downloaded ${downloadedImages.size} images`);
      
      // ?�운로드???��?지�??�냅?�에 ?�용 (개선??
      let appliedCount = 0;
      const applyDownloadedImages = (snapshot: HTMLNodeSnapshot) => {
        // img ?�그 처리
        if (snapshot.tagName === 'img' && snapshot.attributes?.src) {
          const src = snapshot.attributes.src;
          const downloadedImage = downloadedImages.get(src);

          if (downloadedImage?.success && downloadedImage.data) {
            snapshot.imageData = downloadedImage.data;
            snapshot.isDownloadedImage = true;
            appliedCount++;
            logger.debug('Applied downloaded image', {
              src: src.substring(0, 50),
              format: downloadedImage.format,
              nodeId: snapshot.id,
              size: downloadedImage.data.length
    });
          } else if (src.startsWith('http')) {
            logger.debug('Image download not available', {
              src: src.substring(0, 50),
              success: downloadedImage?.success,
              nodeId: snapshot.id
    });
          }
        }

        // SVG ?��???image ?�소 처리
        if (snapshot.tagName === 'svg') {
          const findAndApplySvgImages = (svgSnapshot: HTMLNodeSnapshot) => {
            let foundSvgImage = false;
            svgSnapshot.children.forEach((child: HTMLNodeSnapshot) => {
              if (child.tagName === 'image') {
                const href = child.attributes?.href || child.attributes?.['xlink:href'];
                if (href && href.startsWith('http')) {
                  const downloadedImage = downloadedImages.get(href);

                  if (downloadedImage?.success && downloadedImage.data) {
                    // SVG ?��? ?��?지�?부�?SVG???�용
                    svgSnapshot.imageData = downloadedImage.data;
                    svgSnapshot.isDownloadedImage = true;
                    foundSvgImage = true;
                    appliedCount++;
                    logger.debug('Applied downloaded SVG image', {
                      href: href.substring(0, 50),
                      format: downloadedImage.format,
                      size: downloadedImage.data.length
    });
                  }
                }
              }
              // ?��??�으�??�식 ?�드?�도 처리
              if (!foundSvgImage) {
                findAndApplySvgImages(child);
              }
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
              // background-image�?별도 ?��?지 ?�드�?변??
              snapshot.imageData = downloadedImage.data;
              snapshot.isDownloadedImage = true;
              appliedCount++;
              logger.debug('Applied downloaded background image', {
                url: urlMatch[1].substring(0, 50),
                size: downloadedImage.data.length
    });
            }
          }
        }

        // ?�식 ?�드?�도 처리
        snapshot.children.forEach(applyDownloadedImages);
      };

      applyDownloadedImages(rootSnapshot);
      logger.info(`Applied ${appliedCount} downloaded images to snapshots`);

      // 기존 ?��?지 ?�크린샷 ?�용 (?�본 SVG�?
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
        
        // SVG ?��???image ?�소?�도 처리
        if (snapshot.tagName === 'svg') {
          snapshot.children.forEach((child: HTMLNodeSnapshot) => {
            if (child.tagName === 'image') {
              const childTmpId = child.attributes['data-tmp-id'];
              if (childTmpId && imageScreenshots.has(childTmpId)) {
                // SVG ?��? ?��?지�?부�?SVG???�용
                snapshot.imageData = imageScreenshots.get(childTmpId);
                snapshot.isDownloadedImage = false;
                
                // SVG ?��? ?��?지???�치�?부�?SVG??반영
                // child???�치가 부�?SVG ?�에?�의 ?��? ?�치?��?�??��? 고려
                const childX = child.boundingBox.x;
                const childY = child.boundingBox.y;
                const childWidth = child.boundingBox.width;
                const childHeight = child.boundingBox.height;
                
                // 부�?SVG???�기�??�식 ?��?지 ?�기??맞춤 (?�요??경우)
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
      
      // ?�?�아???�러??경우 ??구체?�인 메시지 ?�공
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





