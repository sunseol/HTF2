process.env.VISION_CHUNK_CHAR_LIMIT = process.env.VISION_CHUNK_CHAR_LIMIT || '2000';
process.env.VISION_MAX_CHUNKS = process.env.VISION_MAX_CHUNKS || '3';
process.env.VISION_TIMEOUT_MS = process.env.VISION_TIMEOUT_MS || '4000';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

import { HtmlProcessingService } from '../src/services/html-processing-service';

const buildBody = () => {
  const sections = Array.from({ length: 6 }).map((_, idx) => `
    <section style="padding:24px; margin-bottom:24px; border-radius:16px; background:rgba(37,99,235,0.12);">
      <h2 style="margin:0 0 12px 0;">Chunk Scenario ${idx + 1}</h2>
      <p style="margin:0 0 12px 0; line-height:22px;">
        Gemini Flash 검증용 문단 ${idx + 1}. 레이아웃, 타이포그래피, 컴포넌트, 색상 맵핑 등을 설명하는 다소 긴 텍스트입니다. 반복 시드 ${Math.random()
          .toString(36)
          .slice(2)}.
      </p>
      <ul style="margin:0 0 0 20px;">
        <li>Flex → Auto Layout 추론</li>
        <li>CTA 버튼 변형 감지</li>
        <li>텍스트 스타일 정규화</li>
      </ul>
    </section>
  `);

  return sections.join('\n');
};

const html = `
<html>
  <head>
    <title>Gemini Smoke Test</title>
    <style>
      body { width: 960px; margin: 0 auto; padding: 40px; font-family: 'Pretendard', Arial, sans-serif; background: #0f172a; color: #e2e8f0; }
      h1 { font-size: 36px; margin-bottom: 24px; }
    </style>
  </head>
  <body>
    <h1>Gemini Vision Smoke</h1>
    ${buildBody()}
  </body>
</html>
`;

(async () => {
  const service = new HtmlProcessingService();
  const result = await service.process({
    htmlContent: html,
    options: {
      mode: 'balanced',
      captureTimeoutMs: 2000,
      visionTimeoutMs: 4000,
      skipVision: false,
    },
  });

  console.log('Gemini summary:', result.vision.summary);
  console.log('Annotations count:', result.vision.annotations.length);
  console.log('First annotation sample:', JSON.stringify(result.vision.annotations[0], null, 2));
  console.log('Meta info:', result.meta.info);
})();
