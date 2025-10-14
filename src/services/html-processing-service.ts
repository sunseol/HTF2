import { renderHtmlFromString } from '../renderers/html-renderer';
import { captureHtmlWithPlaywright } from '../renderers/playwright-capture';
import { convertHtmlToFigma, convertSnapshotToFigma } from '../converters/css-to-figma-mapper';
import { generateFigmaTree } from '../generators/figma-node-generator';
import { generateStyleSystem, staticDesignTokens } from '../generators/style-system-generator';
import { detectComponentPatterns } from '../generators/component-generator';
import { withTimeout, TimeoutError } from '../utils/async-utils';
import { logger } from '../utils/logger';
import { ProcessingError } from '../utils/error-handler';
import type { ConversionResult, HTMLNodeSnapshot } from '../types/converter.types';
import type { RenderHtmlOptions } from '../types/renderer.types';
import type { FigmaNodeData, FigmaPaint } from '../types/figma.types';
import type { VisionAnalysis } from '../types/vision.types';
import { analyzeCapture } from './ai-enhancement-service';
import { ImageSpriteService, ImageSpriteSheet } from './image-sprite-service';

export interface HtmlProcessingRequest {
  htmlContent: string;
  filename?: string;
  options?: {
    enableScreenshot?: boolean;
    width?: number;
    height?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    mode?: 'fast' | 'balanced' | 'quality';
    captureTimeoutMs?: number;
    visionTimeoutMs?: number;
    skipVision?: boolean;
  };
}

export interface HtmlProcessingResponse {
  nodes: ConversionResult['nodes'];
  meta: ConversionResult['meta'] & {
    render: {
      elementCount: number;
      processingTimeMs: number;
      screenshotPath?: string;
    };
    figmaTreeSummary?: {
      nodeCount: number;
      componentCount: number;
    };
    spriteSheet?: ImageSpriteSheet;
  };
  vision: VisionAnalysis;
}

const applyVisionAnnotations = (nodes: FigmaNodeData[], vision: VisionAnalysis): number => {
  if (!vision.annotations?.length) return 0;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const matchByBounds = (targetBounds?: { x: number; y: number; width: number; height: number }) => {
    if (!targetBounds) return undefined;
    const tolerance = 4;
    return nodes.find((node) => {
      const dx = Math.abs(node.boundingBox.x - targetBounds.x);
      const dy = Math.abs(node.boundingBox.y - targetBounds.y);
      const dw = Math.abs(node.boundingBox.width - targetBounds.width);
      const dh = Math.abs(node.boundingBox.height - targetBounds.height);
      return dx < tolerance && dy < tolerance && dw < tolerance && dh < tolerance;
    });
  };

  let applied = 0;

  vision.annotations.forEach((annotation) => {
    const candidate = annotation.target.nodeId
      ? nodeMap.get(annotation.target.nodeId)
      : matchByBounds(annotation.target.bounds);

    if (!candidate) return;

    annotation.suggestions.forEach((suggestion) => {
      const { property, value, confidence, summary } = suggestion;
      let handled = false;

      switch (property) {
        case 'layoutMode':
          if (value === 'VERTICAL' || value === 'HORIZONTAL' || value === 'NONE') {
            candidate.layoutMode = value;
            handled = true;
          }
          break;
        case 'itemSpacing':
          if (typeof value === 'number') {
            candidate.itemSpacing = value;
            handled = true;
          }
          break;
        case 'padding':
          if (typeof value === 'object' && value !== null) {
            candidate.padding = value as { top: number; right: number; bottom: number; left: number };
            handled = true;
          }
          break;
        case 'fills':
          if (Array.isArray(value)) {
            candidate.fills = value as FigmaPaint[];
            handled = true;
          }
          break;
        case 'cornerRadius':
          if (typeof value === 'number') {
            candidate.cornerRadius = value;
            handled = true;
          }
          break;
        case 'fontSize':
        case 'text.fontSize':
          if (candidate.text && typeof value === 'number') {
            candidate.text.fontSize = value;
            handled = true;
          }
          break;
        case 'fontWeight':
        case 'text.fontWeight':
          if (candidate.text && (typeof value === 'number' || typeof value === 'string')) {
            candidate.text.fontWeight = value as number | string;
            handled = true;
          }
          break;
        case 'text.characters':
          if (candidate.text && typeof value === 'string') {
            candidate.text.characters = value;
            handled = true;
          }
          break;
        default:
          break;
      }

      candidate.meta = candidate.meta ?? {};
      candidate.meta.aiInsights = candidate.meta.aiInsights ?? [];
      candidate.meta.aiInsights.push({
        property,
        value,
        confidence,
        summary,
        source: vision.source,
      });

      if (handled) {
        applied += 1;
      }
    });
  });

  return applied;
};

export class HtmlProcessingService {
  private spriteService = new ImageSpriteService();

  async process(request: HtmlProcessingRequest): Promise<HtmlProcessingResponse> {
    if (!request.htmlContent) {
      throw new ProcessingError('htmlContent is required', 'BAD_REQUEST');
    }

    const options = request.options ?? {};
    const mode = options.mode ?? 'balanced';
    const captureTimeoutMs = options.captureTimeoutMs ?? (mode === 'fast' ? 1500 : mode === 'quality' ? 6000 : 3500);
    const visionTimeoutMs = options.visionTimeoutMs ?? (mode === 'fast' ? 800 : mode === 'quality' ? 6000 : 3000);
    const allowVisionModel = !options.skipVision;
    const enableScreenshot = options.enableScreenshot ?? mode !== 'fast';

    const rendererOptions: RenderHtmlOptions = {
      enableScreenshot,
      width: options.width,
      height: options.height,
      waitUntil: options.waitUntil,
    };

    let conversion: ConversionResult | undefined;
    let elementCount = 0;
    let processingTimeMs = 0;
    let screenshotPath: string | undefined;
    let rootSnapshot = undefined as Parameters<typeof analyzeCapture>[0]['rootSnapshot'];

    let captureSuccess = false;

    if (mode !== 'fast') {
      try {
        const capture = await withTimeout(
          captureHtmlWithPlaywright(request.htmlContent, rendererOptions),
          captureTimeoutMs,
          'playwright-capture',
        );
        conversion = convertSnapshotToFigma(capture.rootSnapshot);
        elementCount = capture.elementCount;
        processingTimeMs = capture.metadata.processingTimeMs;
        screenshotPath = capture.screenshotPath;
        rootSnapshot = capture.rootSnapshot;
        captureSuccess = true;
      } catch (error) {
        const logPayload = error instanceof TimeoutError
          ? { timeoutMs: captureTimeoutMs }
          : { error };
        logger.warn('Playwright capture unavailable, falling back to JSDOM renderer', logPayload);
      }
    }

    if (!captureSuccess) {
      const renderArtifact = await renderHtmlFromString(request.htmlContent, rendererOptions);
      conversion = convertHtmlToFigma(renderArtifact.domSnapshot);
      elementCount = renderArtifact.elementCount;
      processingTimeMs = renderArtifact.metadata.processingTimeMs;
      screenshotPath = renderArtifact.screenshotPath;
    }

    if (!conversion) {
      throw new ProcessingError('Failed to convert HTML content', 'PROCESSING_ERROR');
    }

    if (mode === 'fast') {
      conversion.meta.info.push('Fast mode: skipped Playwright capture');
    } else if (!captureSuccess) {
      conversion.meta.info.push('Playwright capture unavailable; used JSDOM fallback');
    }

    // 이미지 수집 및 스프라이트 시트 생성
    let spriteSheet: ImageSpriteSheet | undefined;
    if (rootSnapshot) {
      // 1. 모든 이미지 수집
      const imageMap = new Map<string, { data: string; width?: number; height?: number; originalUrl?: string }>();

      const collectImages = (snap: HTMLNodeSnapshot) => {
        if (snap.imageData && snap.imageData.length > 0) {
          // accurateImageInfo가 있으면 우선 사용
          const width = snap.accurateImageInfo?.width || snap.boundingBox?.width;
          const height = snap.accurateImageInfo?.height || snap.boundingBox?.height;

          imageMap.set(snap.id, {
            data: snap.imageData,
            width,
            height,
            originalUrl: snap.attributes?.src || snap.accurateImageInfo?.src
          });
        }
        snap.children.forEach(collectImages);
      };

      collectImages(rootSnapshot);

      logger.info(`Collected ${imageMap.size} images for sprite sheet`);

      // 2. 스프라이트 시트 생성 (현재는 비활성화 - 개별 이미지가 더 정확함)
      // if (imageMap.size > 0) {
      //   try {
      //     spriteSheet = await this.spriteService.createSpriteSheet(imageMap);
      //     logger.info(`Created sprite sheet: ${spriteSheet.totalWidth}x${spriteSheet.totalHeight}`);
      //   } catch (error) {
      //     logger.error('Failed to create sprite sheet:', error);
      //   }
      // }

      // 3. 이미지 데이터를 노드에 적용 (스프라이트 위치 정보 포함)
      const applyImageDataToNodes = (nodes: FigmaNodeData[], snapshot: HTMLNodeSnapshot) => {
        return nodes.map(node => {
          // 해당 노드의 스냅샷 찾기
          const findSnapshot = (snap: HTMLNodeSnapshot, targetId: string): HTMLNodeSnapshot | null => {
            if (snap.id === targetId) return snap;
            for (const child of snap.children) {
              const found = findSnapshot(child, targetId);
              if (found) return found;
            }
            return null;
          };

          const nodeSnapshot = findSnapshot(snapshot, node.id);
          if (nodeSnapshot) {
            node.meta = node.meta || {};

            // 스프라이트 시트 위치 정보 찾기
            const spriteInfo = spriteSheet?.images.find(img => img.id === node.id);

            if (spriteInfo) {
              node.meta.spriteInfo = {
                x: spriteInfo.x,
                y: spriteInfo.y,
                width: spriteInfo.width,
                height: spriteInfo.height,
                originalUrl: spriteInfo.originalUrl
              };

              logger.debug('Applied sprite info to node', {
                nodeId: node.id,
                nodeName: node.name,
                spritePosition: { x: spriteInfo.x, y: spriteInfo.y },
                spriteSize: { width: spriteInfo.width, height: spriteInfo.height }
              });
            }

            // 이미지 데이터 추가 (fallback용)
            if (nodeSnapshot.imageData) {
              // snapshot에 저장
              node.meta.snapshot = {
                imageData: nodeSnapshot.imageData,
                isDownloadedImage: nodeSnapshot.isDownloadedImage,
                tagName: nodeSnapshot.tagName,
                attributes: nodeSnapshot.attributes
              };
              
              // meta.imageData에도 직접 저장 (플러그인 호환성)
              node.meta.imageData = nodeSnapshot.imageData;

              logger.info('Applied image data to node', {
                nodeId: node.id,
                nodeName: node.name,
                hasImageData: !!nodeSnapshot.imageData,
                isDownloadedImage: nodeSnapshot.isDownloadedImage,
                imageDataLength: nodeSnapshot.imageData?.length
              });
            } else {
              logger.warn('No image data found for node', {
                nodeId: node.id,
                nodeName: node.name,
                tagName: nodeSnapshot.tagName,
                hasImageData: !!nodeSnapshot.imageData
              });
            }

            // 정확한 이미지 정보 추가
            if (nodeSnapshot.accurateImageInfo) {
              node.meta.accurateImageInfo = nodeSnapshot.accurateImageInfo;
              logger.debug('Applied accurate image info to node', {
                nodeId: node.id,
                accurateInfo: nodeSnapshot.accurateImageInfo
              });
            }
          }

          return node;
        });
      };

      conversion.nodes = applyImageDataToNodes(conversion.nodes, rootSnapshot);
    }

    const figmaTree = generateFigmaTree(conversion.nodes);
    const styleSystem = generateStyleSystem(conversion.nodes);
    const components = detectComponentPatterns(conversion.nodes);

    const vision = await analyzeCapture({
      screenshotPath,
      rootSnapshot,
      nodes: conversion.nodes,
    }, {
      allowModel: allowVisionModel,
      timeoutMs: visionTimeoutMs,
    });

    if (!allowVisionModel) {
      conversion.meta.info.push('AI vision heuristics used (model disabled)');
    } else if (vision.source === 'heuristic') {
      conversion.meta.info.push('AI vision heuristics used (model fallback)');
    }

    const appliedCount = applyVisionAnnotations(conversion.nodes, vision);
    if (appliedCount > 0) {
      conversion.meta.info.push(`Applied ${appliedCount} AI-driven adjustments`);
    }

    logger.info('Completed HTML processing', {
      elementCount,
      nodeCount: conversion.nodes.length,
      components: components.length,
      appliedAiSuggestions: appliedCount,
    });

    return {
      nodes: conversion.nodes,
      vision,
      meta: {
        ...conversion.meta,
        assets: {
          ...conversion.meta.assets,
          fonts: Array.from(
            new Set([
              ...conversion.meta.assets.fonts,
              ...styleSystem.textStyles
                .map((style) => style.fontFamily ?? '')
                .filter(Boolean),
            ]),
          ),
        },
        render: {
          elementCount,
          processingTimeMs,
          screenshotPath,
        },
        figmaTreeSummary: figmaTree
          ? { nodeCount: conversion.nodes.length, componentCount: components.length }
          : undefined,
        spriteSheet,
      },
    };
  }
}








