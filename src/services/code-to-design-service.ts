import { promises as fs } from "fs";
import crypto from "crypto";
import { captureHtmlWithPlaywright, captureUrlWithPlaywright } from "../renderers/playwright-capture";
import { convertHtmlToFigma, convertSnapshotToFigma } from "../converters/css-to-figma-mapper";
import type { ConversionResult } from "../types/converter.types";
import { generateStyleSystem, staticDesignTokens } from "../generators/style-system-generator";
import { detectComponentPatterns } from "../generators/component-generator";
import { evaluateQuality } from "./quality-validator";
import { logger } from "../utils/logger";

export interface CodeToDesignRequest {
  html?: string;
  url?: string;
  viewport?: { width: number; height: number };
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
}

type HtmlConversionRequest = CodeToDesignRequest & { html: string };
type UrlConversionRequest = CodeToDesignRequest & { url: string };

const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };
const DEFAULT_HTML_WAIT_UNTIL: NonNullable<CodeToDesignRequest["waitUntil"]> = "load";
const DEFAULT_URL_WAIT_UNTIL: NonNullable<CodeToDesignRequest["waitUntil"]> = "networkidle";

const computeFileHash = async (filePath: string): Promise<string | undefined> => {
  try {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  } catch (error) {
    logger.warn("Failed to compute screenshot hash", { filePath, error });
    return undefined;
  }
};

const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    // eslint-disable-next-line no-new
    new URL(candidate);
    return candidate;
  } catch {
    return trimmed;
  }
};

const enrichConversionMeta = async (
  conversion: ConversionResult,
  context: {
    label: string;
    url?: string;
    viewport?: { width: number; height: number };
    screenshotPath?: string;
    notes?: string[];
  },
): Promise<void> => {
  conversion.meta.info.push(context.label);
  if (context.url) {
    conversion.meta.info.push(`Source URL: ${context.url}`);
  }
  if (context.viewport) {
    conversion.meta.info.push(`Viewport: ${context.viewport.width}x${context.viewport.height}`);
  }
  (context.notes ?? []).forEach((note) => conversion.meta.info.push(note));

  const styleSystem = generateStyleSystem(conversion.nodes);

  conversion.meta.tokens = {
    static: staticDesignTokens,
    detected: {
      colors: styleSystem.colorTokens,
      spacing: styleSystem.spacingTokens,
      shadows: styleSystem.shadowTokens,
      typography: styleSystem.textStyles.map((style) => ({
        name: style.name,
        token: style.token,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      })),
    },
  };

  conversion.meta.components = detectComponentPatterns(conversion.nodes);
  conversion.meta.quality = evaluateQuality(conversion.nodes);

  if (context.screenshotPath) {
    const hash = await computeFileHash(context.screenshotPath);
    conversion.meta.assets.images.push({
      id: `screenshot-${conversion.meta.assets.images.length + 1}`,
      src: context.screenshotPath,
      hash: hash ?? "",
    });
  }
};

const convertFromHtml = async (payload: HtmlConversionRequest): Promise<ConversionResult> => {
  const viewport = payload.viewport ?? DEFAULT_VIEWPORT;
  const waitUntil = payload.waitUntil ?? DEFAULT_HTML_WAIT_UNTIL;

  try {
    const capture = await captureHtmlWithPlaywright(payload.html, {
      width: viewport.width,
      height: viewport.height,
      waitUntil,
      enableScreenshot: true,
    });

    const conversion = convertSnapshotToFigma(capture.rootSnapshot);
    await enrichConversionMeta(conversion, {
      label: "Local code-to-design (Playwright snapshot)",
      viewport: capture.metadata.viewport,
      screenshotPath: capture.screenshotPath,
      url: payload.url,
    });
    return conversion;
  } catch (error) {
    logger.warn("Local code-to-design Playwright capture failed; falling back to JSDOM renderer", { error });
    const conversion = convertHtmlToFigma(payload.html);
    await enrichConversionMeta(conversion, {
      label: "Local code-to-design fallback (JSDOM renderer)",
      viewport,
      url: payload.url,
      notes: ["Playwright capture unavailable; used JSDOM snapshot"],
    });
    return conversion;
  }
};

const downloadHtmlFallback = async (url: string): Promise<string | undefined> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn("HTML download fallback failed (non-200 response)", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      return undefined;
    }
    return await response.text();
  } catch (error) {
    logger.warn("HTML download fallback failed (network error)", { url, error });
    return undefined;
  }
};

const convertFromUrl = async (payload: UrlConversionRequest): Promise<ConversionResult | undefined> => {
  const normalizedUrl = normalizeUrl(payload.url);
  const viewport = payload.viewport ?? DEFAULT_VIEWPORT;
  const waitUntil = payload.waitUntil ?? DEFAULT_URL_WAIT_UNTIL;

  const attemptCapture = async (wait: NonNullable<CodeToDesignRequest["waitUntil"]>) => {
    const capture = await captureUrlWithPlaywright(normalizedUrl, {
      width: viewport.width,
      height: viewport.height,
      waitUntil: wait,
      enableScreenshot: true,
    });
    const conversion = convertSnapshotToFigma(capture.rootSnapshot);
    await enrichConversionMeta(conversion, {
      label: wait === waitUntil
        ? "Local code-to-design (URL snapshot)"
        : "Local code-to-design (URL snapshot fallback)",
      viewport: capture.metadata.viewport,
      screenshotPath: capture.screenshotPath,
      url: normalizedUrl,
      notes: wait === waitUntil ? undefined : [`Fallback waitUntil mode: ${wait}`],
    });
    return conversion;
  };

  try {
    return await attemptCapture(waitUntil);
  } catch (primaryError) {
    logger.warn("Primary Playwright URL capture failed in code-to-design pipeline", {
      url: normalizedUrl,
      waitUntil,
      error: primaryError,
    });

    const fallbackWaitUntil: NonNullable<CodeToDesignRequest["waitUntil"]> = waitUntil === "networkidle"
      ? "domcontentloaded"
      : "load";

    try {
      return await attemptCapture(fallbackWaitUntil);
    } catch (fallbackError) {
      logger.warn("Fallback Playwright URL capture failed in code-to-design pipeline", {
        url: normalizedUrl,
        waitUntil: fallbackWaitUntil,
        error: fallbackError,
      });
    }
  }

  const htmlSource = payload.html ?? await downloadHtmlFallback(normalizedUrl);
  if (!htmlSource) {
    logger.error("Unable to convert URL; capture and HTML fallback both failed", { url: normalizedUrl });
    return undefined;
  }

  const conversion = await convertFromHtml({ ...payload, html: htmlSource, url: normalizedUrl });
  conversion.meta.info.push("URL capture fallback: used downloaded HTML content");
  return conversion;
};

export const convertWithCodeToDesign = async (
  payload: CodeToDesignRequest,
): Promise<ConversionResult | undefined> => {
  if (payload.url) {
    try {
      const urlConversion = await convertFromUrl(payload as UrlConversionRequest);
      if (urlConversion) {
        return urlConversion;
      }
    } catch (error) {
      logger.error("Local code-to-design URL conversion failed", { url: payload.url, error });
      return undefined;
    }
  }

  if (payload.html) {
    try {
      return await convertFromHtml(payload as HtmlConversionRequest);
    } catch (error) {
      logger.error("Local code-to-design HTML conversion failed", { error });
      return undefined;
    }
  }

  logger.warn("convertWithCodeToDesign called without html or url payload");
  return undefined;
};

export const convertHtmlWithExternalFallback = async (
  payload: CodeToDesignRequest,
): Promise<ConversionResult> => {
  const conversion = await convertWithCodeToDesign(payload);
  if (conversion) {
    return conversion;
  }

  if (!payload.html) {
    throw new Error("convertHtmlWithExternalFallback requires an html payload when local conversion fails");
  }

  const fallback = convertHtmlToFigma(payload.html);
  await enrichConversionMeta(fallback, {
    label: "Local code-to-design fallback (JSDOM renderer)",
    viewport: payload.viewport ?? DEFAULT_VIEWPORT,
    url: payload.url,
    notes: ["Local code-to-design pipeline returned no result"],
  });
  return fallback;
};

