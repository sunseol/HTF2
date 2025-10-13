import { captureHtmlWithPlaywright, captureUrlWithPlaywright } from '../renderers/playwright-capture';
import type { PlaywrightCaptureArtifact } from '../renderers/playwright-capture';
import { convertSnapshotToFigma, convertHtmlToFigma } from '../converters/css-to-figma-mapper';
import { generateStyleSystem, staticDesignTokens } from '../generators/style-system-generator';
import { detectComponentPatterns } from '../generators/component-generator';
import { evaluateQuality } from './quality-validator';
import type { ConversionResult } from '../types/converter.types';
import type { VisionAnalysis } from '../types/vision.types';
import { convertWithCodeToDesign } from './code-to-design-service';
import { logger } from '../utils/logger';
import { ProcessingError } from '../utils/error-handler';

interface ExactReplicaMetaOptions {
  processingTimeMs?: number;
  viewport?: { width: number; height: number };
  screenshotPath?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  fallbackReason?: string;
}

const buildMeta = (
  conversion: ConversionResult,
  styleTokens: ReturnType<typeof generateStyleSystem>,
  options: ExactReplicaMetaOptions,
) => ({
  ...conversion.meta,
  render: {
    elementCount: conversion.nodes.length,
    processingTimeMs: options.processingTimeMs ?? 0,
    screenshotPath: options.screenshotPath,
    viewport: options.viewport,
    waitUntil: options.waitUntil,
    fallbackReason: options.fallbackReason,
  },
  tokens: {
    static: staticDesignTokens,
    detected: {
      colors: styleTokens.colorTokens,
      spacing: styleTokens.spacingTokens,
      shadows: styleTokens.shadowTokens,
      typography: styleTokens.textStyles.map((style) => ({
        name: style.name,
        token: style.token,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      })),
    },
  },
  components: detectComponentPatterns(conversion.nodes),
  quality: evaluateQuality(conversion.nodes),
});

const exactVision: VisionAnalysis = {
  source: 'heuristic',
  summary: 'Exact replica pipeline without AI vision',
  annotations: [],
  issues: ['Vision disabled'],
};

const normalizeUrl = (input: string): string => {
  if (!input) {
    return input;
  }

  const trimmed = input.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    new URL(candidate);
    return candidate;
  } catch {
    return trimmed;
  }
};

const PLAYWRIGHT_DEFAULT_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT ?? 45000);

const buildExactReplicaResponse = (
  capture: PlaywrightCaptureArtifact,
  metaInfoLabel: string,
  metaOptions: Pick<ExactReplicaMetaOptions, 'waitUntil' | 'fallbackReason'>,
) => {
  const conversion = convertSnapshotToFigma(capture.rootSnapshot);
  conversion.meta.info.push(metaInfoLabel);

  const styleTokens = generateStyleSystem(conversion.nodes);
  const meta = buildMeta(conversion, styleTokens, {
    processingTimeMs: capture.metadata.processingTimeMs,
    viewport: capture.metadata.viewport,
    screenshotPath: capture.screenshotPath,
    ...metaOptions,
  });

  return {
    nodes: conversion.nodes,
    vision: exactVision,
    meta,
  };
};

export const renderExactFromHtml = async (html: string, viewport?: { width: number; height: number }) => {
  const external = await convertWithCodeToDesign({ html });
  const conversion = external ?? convertHtmlToFigma(html);
  conversion.meta.info.push(external ? 'Converted via code.to.design' : 'Exact replica fallback (local converter)');
  const styleTokens = generateStyleSystem(conversion.nodes);
  const meta = buildMeta(conversion, styleTokens, { viewport });
  return {
    nodes: conversion.nodes,
    vision: exactVision,
    meta,
  };
};

interface RenderUrlOptions {
  viewport?: { width: number; height: number };
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  navigationTimeoutMs?: number;
}

export const renderExactFromUrl = async (
  url: string,
  options: RenderUrlOptions = {},
) => {
  const originalUrl = url;
  const targetUrl = normalizeUrl(url);

  if (targetUrl !== originalUrl) {
    logger.info('Normalized URL for exact capture', { originalUrl, targetUrl });
  }

  const baseLog: Record<string, unknown> = {
    url: targetUrl,
    viewport: options.viewport,
  };
  if (targetUrl !== originalUrl) {
    baseLog.originalUrl = originalUrl;
  }
  logger.info('Running exact replica capture', baseLog);

  const waitUntil = options.waitUntil ?? 'networkidle';
  const navigationTimeoutMs = options.navigationTimeoutMs ?? PLAYWRIGHT_DEFAULT_TIMEOUT_MS;
  const baseCaptureOptions = {
    width: options.viewport?.width,
    height: options.viewport?.height,
    enableScreenshot: true,
    ignoreHTTPSErrors: true,
    navigationTimeoutMs,
  } as const;

  const attemptCapture = (waitFor: 'load' | 'domcontentloaded' | 'networkidle') =>
    captureUrlWithPlaywright(targetUrl, {
      ...baseCaptureOptions,
      waitUntil: waitFor,
    });

  const attemptHtmlFallback = async (
    primaryError: unknown,
    stage: 'primary' | 'domcontentloaded',
  ) => {
    const fallbackLog: Record<string, unknown> = { url: targetUrl, stage };
    if (targetUrl !== originalUrl) {
      fallbackLog.originalUrl = originalUrl;
    }
    logger.warn('Exact replica capture falling back to HTML download', fallbackLog);

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const fallbackResult = await renderExactFromHtml(html, options.viewport);
      const infoLabel = stage === 'domcontentloaded'
        ? 'Exact URL capture fallback (HTML download after Playwright fallback failure)'
        : 'Exact URL capture fallback (HTML download)';
      fallbackResult.meta.info.push(infoLabel);
      fallbackResult.meta.render = {
        ...(fallbackResult.meta.render ?? {
          elementCount: fallbackResult.nodes.length,
          processingTimeMs: 0,
          viewport: options.viewport,
        }),
        fallbackReason: stage === 'domcontentloaded'
          ? 'playwright-domcontentloaded-failed'
          : 'playwright-primary-failed',
      };
      return fallbackResult;
    } catch (fallbackError) {
      const fallbackErrorLog: Record<string, unknown> = {
        url: targetUrl,
        stage,
        error: fallbackError,
      };
      if (targetUrl !== originalUrl) {
        fallbackErrorLog.originalUrl = originalUrl;
      }
      logger.error('Exact replica HTML download fallback failed', fallbackErrorLog);

      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new ProcessingError(
        `Playwright capture failed (${primaryMessage}). HTML fallback also failed (${fallbackMessage}).`,
        'RENDER_FAILED',
        {
          url: targetUrl,
          originalUrl,
          waitUntil,
          timeoutMs: navigationTimeoutMs,
          stage,
        },
      );
    }
  };

  try {
    const capture = await attemptCapture(waitUntil);
    return buildExactReplicaResponse(capture, 'Exact URL capture (AI disabled)', {
      waitUntil,
    });
  } catch (error) {
    const failureLog: Record<string, unknown> = {
      url: targetUrl,
      waitUntil,
      timeoutMs: navigationTimeoutMs,
      error,
    };
    if (targetUrl !== originalUrl) {
      failureLog.originalUrl = originalUrl;
    }
    logger.warn('Exact replica capture failed', failureLog);

    if (waitUntil === 'networkidle') {
      try {
        const fallbackWaitUntil: 'domcontentloaded' = 'domcontentloaded';
        const capture = await attemptCapture(fallbackWaitUntil);
        return buildExactReplicaResponse(capture, 'Exact URL capture fallback (domcontentloaded)', {
          waitUntil: fallbackWaitUntil,
          fallbackReason: 'networkidle timeout',
        });
      } catch (retryError) {
        const retryErrorLog: Record<string, unknown> = {
          url: targetUrl,
          error: retryError,
        };
        if (targetUrl !== originalUrl) {
          retryErrorLog.originalUrl = originalUrl;
        }
        logger.error('Exact replica fallback capture failed', retryErrorLog);
        return attemptHtmlFallback(retryError, 'domcontentloaded');
      }
    }

    return attemptHtmlFallback(error, 'primary');
  }
};

export const renderExactFromSnapshot = async (
  html: string,
  options: { viewport?: { width: number; height: number } } = {},
) => {
  const capture = await captureHtmlWithPlaywright(html, {
    width: options.viewport?.width,
    height: options.viewport?.height,
    enableScreenshot: true,
    waitUntil: 'load',
  });

  return buildExactReplicaResponse(capture, 'Exact HTML snapshot (AI disabled)', {
    waitUntil: 'load',
  });
};
