import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { performance } from 'perf_hooks';
import type { RenderHtmlOptions, RenderedHtmlArtifact } from '../types/renderer.types';
import type { HTMLNodeSnapshot } from '../types/converter.types';
import { saveScreenshot } from '../utils/file-manager';
import { logger } from '../utils/logger';

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

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
  'box-shadow',
  'opacity',
  'flex-direction',
  'justify-content',
  'align-items',
  'align-content',
  'gap',
  'row-gap',
  'column-gap',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'overflow',
  'overflow-x',
  'overflow-y',
  'transform',
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

  public async capture(
    htmlContent: string,
    options: RenderHtmlOptions = {},
  ): Promise<PlaywrightCaptureArtifact> {
    const start = performance.now();
    const width = options.width ?? DEFAULT_WIDTH;
    const height = options.height ?? DEFAULT_HEIGHT;
    const browser = await this.getBrowser();
    const context = await browser.newContext({ viewport: { width, height } });
    const waitUntil = options.waitUntil ?? 'load';

    let screenshotPath: string | undefined;

    try {
      const page = await context.newPage();
      await page.setContent(htmlContent, { waitUntil });
      await page.waitForTimeout(50);

      const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      const domSnapshot = await page.content();

      const rootSnapshotRaw = await page.evaluate(
        ({ styleKeys }) => {
          const keys = styleKeys as string[];
          let counter = 0;
          const nextId = () => `node-${counter++}`;

          const extract = (element: any, parentId?: string): Record<string, unknown> => {
            const id = nextId();
            const computed = window.getComputedStyle(element);
            const styles: Record<string, string> = {};
            keys.forEach((key) => {
              styles[key] = computed.getPropertyValue(key);
            });

            const rect = element.getBoundingClientRect();
            const attributes: Record<string, string> = {};
            const attrList = Array.from(element.attributes ?? []) as Attr[];
            attrList.forEach((attr) => {
              attributes[attr.name] = attr.value;
            });

            const childElements = Array.from(element.children);

            return {
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
              children: childElements.map((child) => extract(child, id)),
            };
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
              children: [],
            };
          }

          return extract(document.body, undefined);
        },
        { styleKeys: STYLE_PROPERTIES },
      );

      const rootSnapshot = rootSnapshotRaw as unknown as HTMLNodeSnapshot;

      if (options.enableScreenshot !== false) {
        try {
          const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
          screenshotPath = await saveScreenshot(screenshotBuffer);
        } catch (error) {
          logger.warn('Failed to capture screenshot via Playwright', { error });
        }
      }

      const duration = performance.now() - start;
      logger.info('Captured HTML via Playwright', { width, height, elementCount, duration });

      return {
        domSnapshot,
        rootSnapshot,
        screenshotPath,
        elementCount,
        metadata: {
          url: page.url(),
          title: await page.title(),
          viewport: { width, height },
          processingTimeMs: duration,
        },
      };
    } finally {
      await context.close();
    }
  }
}

const engine = new PlaywrightCaptureEngine();

export const captureHtmlWithPlaywright = (
  htmlContent: string,
  options?: RenderHtmlOptions,
): Promise<PlaywrightCaptureArtifact> => engine.capture(htmlContent, options);


