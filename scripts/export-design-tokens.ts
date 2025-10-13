import fs from "fs";
import path from "path";
import { designTokens, BASE_FONT_SIZE, toRem } from "../src/config/design-tokens";

const outDir = path.resolve(__dirname, "..", "dist");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const cssLines: string[] = [":root {"];

Object.entries(designTokens.spacing).forEach(([token, px]) => {
  cssLines.push(`  --${token}: ${px}px;`);
  const rem = toRem(px) ?? px / BASE_FONT_SIZE;
  cssLines.push(`  --${token}-rem: ${rem}rem;`);
});

designTokens.typography.forEach((token) => {
  cssLines.push(`  --type-${token.name}-font-size: ${token.fontSize}px;`);
  cssLines.push(`  --type-${token.name}-font-size-rem: ${toRem(token.fontSize) ?? token.fontSize / BASE_FONT_SIZE}rem;`);
  cssLines.push(`  --type-${token.name}-line-height: ${token.lineHeight}px;`);
  cssLines.push(`  --type-${token.name}-line-height-rem: ${toRem(token.lineHeight) ?? token.lineHeight / BASE_FONT_SIZE}rem;`);
  cssLines.push(`  --type-${token.name}-font-weight: ${token.fontWeight};`);
  cssLines.push(`  --type-${token.name}-letter-spacing: ${token.letterSpacing}px;`);
});

Object.entries(designTokens.colors).forEach(([token, value]) => {
  cssLines.push(`  --color-${token}: ${value};`);
});

designTokens.shadows.forEach((token) => {
  const shadowValue = token.layers
    .map((layer) => {
      const rgb = layer.color.replace(/^#/, "");
      const r = parseInt(rgb.slice(0, 2), 16);
      const g = parseInt(rgb.slice(2, 4), 16);
      const b = parseInt(rgb.slice(4, 6), 16);
      const spread = layer.spread ? `${layer.spread}px` : "0px";
      return `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${spread} rgba(${r}, ${g}, ${b}, ${layer.opacity})`;
    })
    .join(", ");
  cssLines.push(`  --shadow-${token.name}: ${shadowValue};`);
});

cssLines.push("}");

const cssOutputPath = path.join(outDir, "design-tokens.css");
fs.writeFileSync(cssOutputPath, `${cssLines.join("\n")}\n`, "utf-8");

const jsonOutputPath = path.join(outDir, "design-tokens.json");
fs.writeFileSync(jsonOutputPath, JSON.stringify(designTokens, null, 2), "utf-8");

console.log(`Exported design tokens to ${cssOutputPath} and ${jsonOutputPath}`);
