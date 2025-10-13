import AdmZip from "adm-zip";
import { convertHtmlToFigma } from "../converters/css-to-figma-mapper";
import { generateStyleSystem, staticDesignTokens } from "../generators/style-system-generator";
import { detectComponentPatterns } from "../generators/component-generator";
import { evaluateQuality } from "./quality-validator";
import type { ConversionResult } from "../types/converter.types";
import { ProcessingError } from "../utils/error-handler";
import { logger } from "../utils/logger";

interface H2DExtractionResult {
  html: string;
  tokens?: unknown;
  metadata?: Record<string, unknown>;
}

const extractFromArchive = (buffer: Buffer): H2DExtractionResult => {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) {
    throw new ProcessingError("H2D archive is empty", "BAD_REQUEST");
  }

  const htmlEntry = entries.find((entry) => /\.html$/i.test(entry.entryName));
  if (!htmlEntry) {
    throw new ProcessingError("H2D archive is missing an HTML entry", "BAD_REQUEST");
  }

  let html = htmlEntry.getData().toString("utf-8");

  const cssEntries = entries.filter((entry) => /\.css$/i.test(entry.entryName));
  if (cssEntries.length > 0) {
    const inlineStyles = cssEntries
      .map((entry) => entry.getData().toString("utf-8"))
      .join("\n");
    const styleTag = `<style>${inlineStyles}</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${styleTag}</head>`);
    } else {
      html = `${styleTag}${html}`;
    }
  }

  const tokensEntry = entries.find((entry) => /tokens\.json$/i.test(entry.entryName));
  let tokens: unknown;
  if (tokensEntry) {
    try {
      tokens = JSON.parse(tokensEntry.getData().toString("utf-8"));
    } catch (error) {
      logger.warn("Failed to parse tokens.json from H2D archive", { error });
    }
  }

  const metaEntry = entries.find((entry) => /meta\.json$/i.test(entry.entryName));
  let metadata: Record<string, unknown> | undefined;
  if (metaEntry) {
    try {
      metadata = JSON.parse(metaEntry.getData().toString("utf-8"));
    } catch (error) {
      logger.warn("Failed to parse meta.json from H2D archive", { error });
    }
  }

  return { html, tokens, metadata };
};

export interface ImportedH2DResult {
  conversion: ConversionResult;
  tokens?: unknown;
}

export const importH2DArchive = async (buffer: Buffer): Promise<ImportedH2DResult> => {
  const extracted = extractFromArchive(buffer);
  const conversion = convertHtmlToFigma(extracted.html);

  conversion.meta.info.push("Exact archive import (AI disabled)");
  if (extracted.metadata) {
    conversion.meta.info.push(`Archive metadata: ${JSON.stringify(extracted.metadata)}`);
  }

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

  return {
    conversion,
    tokens: extracted.tokens,
  };
};
