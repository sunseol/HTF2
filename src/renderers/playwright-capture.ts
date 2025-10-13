import { chromium } from 'playwright';
import type { Browser, BrowserContext } from 'playwright';
import { performance } from 'perf_hooks';
import type { RenderHtmlOptions, RenderedHtmlArtifact } from '../types/renderer.types';
import type { HTMLNodeSnapshot } from '../types/converter.types';
import { saveScreenshot } from '../utils/file-manager';
import { logger } from '../utils/logger';

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_NAVIGATION_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ?? 45000);

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

export interface PlaywrightCaptureArtifact extends RenderedHtmlArtifact {
  rootSnapshot: HTMLNodeSnapshot;
}

class PlaywrightCaptureEngine {
  private browserPromise?: Promise<Browser>;

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
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => {
              img.onload = img.onerror = resolve;
            }))
        );
      });

      // Assign temporary IDs to all image elements FIRST (in a single evaluation context)
      await page.evaluate(() => {
        const imageElements = document.querySelectorAll('img, svg');
        imageElements.forEach((el: any, index: number) => {
          if (!el.dataset.tmpId) {
            el.dataset.tmpId = `img-${index}-${Math.random().toString(36).substr(2, 9)}`;
          }
        });
      });

      // Capture screenshots of all images
      const imageElements = await page.$$('img, svg');
      const imageScreenshots = new Map<string, string>();

      for (const element of imageElements) {
        try {
          const boundingBox = await element.boundingBox();
          if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
            // Take a screenshot of just this element
            const screenshot = await element.screenshot({ type: 'png' });
            const base64 = screenshot.toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;

            // Get the temporary ID we assigned earlier
            const elementId = await element.evaluate((el: any) => el.dataset.tmpId);

            if (elementId) {
              imageScreenshots.set(elementId, dataUrl);
            }
          }
        } catch (error) {
          // Skip elements that can't be captured
          console.warn('Could not capture element screenshot:', error);
        }
      }

      const rootSnapshotRaw = await page.evaluate(
        ({ styleKeys }) => {
          const keys = styleKeys as string[];
          let counter = 0;
          const nextId = () => `node-${counter++}`;

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
              textContent: childElements.length === 0 ? (element.textContent ?? '').trim() || null : null,
              boundingBox: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
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

      // Apply image screenshots to the snapshot tree
      const applyImageData = (snapshot: HTMLNodeSnapshot) => {
        const tmpId = snapshot.attributes['data-tmp-id'];
        if (tmpId && imageScreenshots.has(tmpId)) {
          snapshot.imageData = imageScreenshots.get(tmpId);
          // Clean up the temporary ID
          delete snapshot.attributes['data-tmp-id'];
        }
        snapshot.children.forEach(applyImageData);
      };
      applyImageData(rootSnapshot);

      logger.info(`Captured ${imageScreenshots.size} image screenshots`);

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





