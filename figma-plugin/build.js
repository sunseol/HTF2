const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const codePath = path.join(distDir, 'code.js');
const uiSourcePath = path.join(__dirname, 'src', 'ui.html');
const uiDistPath = path.join(distDir, 'ui.html');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const uiHtml = fs.readFileSync(uiSourcePath, 'utf8');
const codeJs = fs.readFileSync(codePath, 'utf8');

const finalCode = codeJs.replace(
  '__html__',
  '`' + uiHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`'
);

fs.writeFileSync(codePath, finalCode);
fs.writeFileSync(uiDistPath, uiHtml);

console.log('Plugin bundled successfully!');
