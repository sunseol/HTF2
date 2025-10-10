import { HtmlProcessingService } from '../src/services/html-processing-service';

const run = async () => {
  const html = `
  <html>
    <head>
      <title>Vision Chunk Demo</title>
      <style>
        body { width: 1200px; margin: 0 auto; padding: 48px; font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; }
        header { display: grid; grid-template-columns: 2fr 3fr; gap: 32px; align-items: center; background: linear-gradient(135deg, #312e81, #1e293b); padding: 32px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.6); }
        header h1 { margin: 0; font-size: 48px; }
        nav { display: flex; gap: 24px; justify-content: flex-end; }
        nav a { color: #cbd5f5; text-decoration: none; font-weight: 600; }
        .feature-grid { margin-top: 48px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .feature-card { background: rgba(30, 64, 175, 0.35); backdrop-filter: blur(12px); border-radius: 20px; padding: 24px; min-height: 220px; border: 1px solid rgba(148, 163, 184, 0.2); }
        .feature-card h3 { margin: 0 0 12px; font-size: 22px; }
        .feature-card ul { margin: 12px 0 0 18px; line-height: 20px; color: #cbd5f5; }
        .comparison { margin-top: 48px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; }
        .comparison section { background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 20px; padding: 24px; }
        .cta { margin-top: 48px; display: flex; align-items: center; justify-content: space-between; background: linear-gradient(120deg, #7c3aed, #2563eb); padding: 32px 36px; border-radius: 28px; }
        .cta button { background: #f8fafc; color: #1f2937; border-radius: 999px; padding: 16px 32px; border: none; font-weight: 700; font-size: 16px; cursor: pointer; }
      </style>
    </head>
    <body>
      <header>
        <div>
          <h1>Pixel-perfect Figma from Production HTML</h1>
          <p style="font-size:18px; color:#cbd5f5; margin:12px 0 0;">
            Automated layout understanding, design token mapping, and AI-guided adjustments ensure your exported Figma file feels lovingly handcrafted.
          </p>
        </div>
        <nav>
          <a href="#features">Features</a>
          <a href="#cases">Case Studies</a>
          <a href="#pricing">Pricing</a>
          <a href="#docs">Docs</a>
        </nav>
      </header>

      <section class="feature-grid" id="features">
        ${Array.from({ length: 12 }).map((_, idx) => `
          <article class="feature-card">
            <h3>Autonomy ${idx + 1}</h3>
            <p style="margin:0; line-height:22px;">Gemini Flash cross-checks rendered DOM, CSS, and heuristics to recommend overrides for spacing, typography, and component reuse.</p>
            <ul>
              <li>Keeps layout modes aligned with Flex & Auto Layout semantics.</li>
              <li>Highlights likely text styles and color tokens.</li>
              <li>Spots inconsistent corner radii or shadow stacks.</li>
            </ul>
          </article>
        `).join('\n')}
      </section>

      <section class="comparison" id="cases">
        <section>
          <h2 style="margin:0 0 16px;">Before</h2>
          <p>Raw HTML/CSS capture with inconsistent spacing, no shared styles, duplicated button variants, and missing color tokens.</p>
          <ul style="margin:16px 0 0 20px; color:#cbd5f5;">
            <li>7 unique blues applied to CTA buttons.</li>
            <li>Mixed px/rem font sizing.</li>
            <li>Absolute-positioned hero copy.</li>
          </ul>
        </section>
        <section>
          <h2 style="margin:0 0 16px;">After Gemini Guidance</h2>
          <p>Flash model groups similar sections, suggests Auto Layout conversions, and maps color/typography to reusable tokens.</p>
          <ul style="margin:16px 0 0 20px; color:#bbf7d0;">
            <li>2 canonical CTA variants with shared components.</li>
            <li>Text styles mapped to H1/H2/Body/Caption.</li>
            <li>Color tokens extracted into semantic palette.</li>
          </ul>
        </section>
      </section>

      <section class="cta" id="pricing">
        <div>
          <h2 style="margin:0; font-size:28px;">Ship perfect handoff files in minutes</h2>
          <p style="margin:12px 0 0; color:#e0f2fe;">Gemini Flash alignment ensures suggestions land in under 4 seconds, even on enterprise marketing pages.</p>
        </div>
        <button>Start 7-day Trial</button>
      </section>
    </body>
  </html>
  `;

  const service = new HtmlProcessingService();
  const result = await service.process({
    htmlContent: html,
    options: {
      mode: 'balanced',
      captureTimeoutMs: 3000,
      visionTimeoutMs: 3500,
      skipVision: false,
    },
  });

  console.log('Nodes:', result.nodes.length);
  console.log('Vision summary:', result.vision.summary);
  console.log('Annotations:', JSON.stringify(result.vision.annotations, null, 2));
  console.log('Meta info:', result.meta.info);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
