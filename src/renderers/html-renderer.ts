import { JSDOM } from 'jsdom';
import { performance } from 'perf_hooks';
import { RenderHtmlOptions, RenderedHtmlArtifact } from '../types/renderer.types';
import { logger } from '../utils/logger';

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

export const renderHtmlFromString = async (
  htmlContent: string,
  options: RenderHtmlOptions = {},
): Promise<RenderedHtmlArtifact> => {
  const start = performance.now();
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  const dom = new JSDOM(htmlContent, {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    resources: 'usable',
    url: 'https://local.preview/',
  });

  const window = dom.window;
  Object.assign(window, { innerWidth: width, innerHeight: height });

  await new Promise((resolve) => setTimeout(resolve, 0));

  const document = window.document;
  const elementCount = document.querySelectorAll('*').length;
  const serialized = dom.serialize();
  const duration = performance.now() - start;

  logger.info('Rendered HTML snapshot', { width, height, elementCount, duration });

  return {
    domSnapshot: serialized,
    elementCount,
    metadata: {
      title: document.title,
      url: window.location.href,
      viewport: { width, height },
      processingTimeMs: duration,
    },
  };
};
