import type { HTMLNodeSnapshot } from './converter.types';

export interface RenderHtmlOptions {
  width?: number;
  height?: number;
  enableScreenshot?: boolean;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface RenderedHtmlArtifact {
  domSnapshot: string;
  screenshotPath?: string;
  elementCount: number;
  rootSnapshot?: HTMLNodeSnapshot;
  metadata: {
    url?: string;
    title?: string;
    viewport: { width: number; height: number };
    processingTimeMs: number;
  };
}

