# HTML to Figma Conversion - 테스트 가이드

## 목차
- [서버 실행](#서버-실행)
- [테스트 방법](#테스트-방법)
  - [방법 1: curl (CLI)](#방법-1-curl-cli)
  - [방법 2: PowerShell](#방법-2-powershell-windows)
  - [방법 3: HTML 파일 업로드](#방법-3-html-파일-업로드)
  - [방법 4: VSCode REST Client](#방법-4-vscode-rest-client-추천)
  - [방법 5: Postman](#방법-5-postman)
- [API 엔드포인트](#api-엔드포인트)
- [응답 구조](#응답-구조)
- [테스트 시나리오](#테스트-시나리오)
- [문제 해결](#문제-해결)

---

## 서버 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm run build
npm start
```

서버가 정상적으로 실행되면 다음 메시지가 표시됩니다:
```
Server listening on http://localhost:4000
```

---

## 테스트 방법

### 방법 1: curl (CLI)

#### 1-1. Health Check
```bash
curl http://localhost:4000/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-11T02:32:36.668Z"
}
```

#### 1-2. 간단한 HTML 테스트
```bash
curl -X POST http://localhost:4000/render-html-text \
  -H "Content-Type: application/json" \
  -d "{\"htmlContent\":\"<div style='width:200px;height:100px;background:#ff0000;border-radius:10px;'></div>\"}"
```

#### 1-3. 복잡한 HTML 테스트
```bash
curl -X POST http://localhost:4000/render-html-text \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "htmlContent": "<div style='display:flex;flex-direction:column;gap:20px;padding:30px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.3);width:400px;'><h1 style='color:white;font-size:32px;font-weight:bold;margin:0;'>Welcome</h1><p style='color:rgba(255,255,255,0.9);font-size:16px;line-height:1.6;margin:0;'>This is a test with auto layout, gradient background, and shadow effects.</p><button style='background:#fff;color:#667eea;padding:12px 24px;border-radius:8px;border:none;font-weight:600;'>Click Me</button></div>",
  "options": {
    "mode": "quality",
    "enableScreenshot": true
  }
}
EOF
```

---

### 방법 2: PowerShell (Windows)

#### 2-1. Health Check
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" | Select-Object -ExpandProperty Content
```

#### 2-2. HTML 테스트
```powershell
$body = @{
    htmlContent = "<div style='width:300px;height:200px;background:#3498db;border-radius:15px;display:flex;align-items:center;justify-content:center;'><span style='color:white;font-size:24px;font-weight:bold;'>Hello World</span></div>"
    options = @{
        mode = "quality"
        enableScreenshot = $true
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/render-html-text" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

#### 2-3. 결과 JSON 파일로 저장
```powershell
$result = Invoke-RestMethod -Uri "http://localhost:4000/render-html-text" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

$result | ConvertTo-Json -Depth 10 | Out-File -FilePath "result.json" -Encoding UTF8
```

---

### 방법 3: HTML 파일 업로드

#### 3-1. 테스트 HTML 파일 생성

**test-page.html:**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 40px;
            background: #f0f0f0;
            font-family: Arial, sans-serif;
        }
        .container {
            width: 800px;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        h1 {
            color: #2c3e50;
            font-size: 36px;
            margin: 0;
        }
        .badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        .content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .card {
            background: #f8f9fa;
            padding: 24px;
            border-radius: 12px;
            border-left: 4px solid #3498db;
        }
        .card h2 {
            color: #34495e;
            font-size: 20px;
            margin: 0 0 12px 0;
        }
        .card p {
            color: #7f8c8d;
            line-height: 1.6;
            margin: 0;
        }
        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 30px;
        }
        .btn {
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            border: none;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-secondary {
            background: white;
            color: #3498db;
            border: 2px solid #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Design System</h1>
            <div class="badge">Premium</div>
        </div>
        <div class="content">
            <div class="card">
                <h2>Card Title 1</h2>
                <p>This is a card with auto layout, background color, and border styling.</p>
            </div>
            <div class="card">
                <h2>Card Title 2</h2>
                <p>Testing nested flex containers with gap and padding properties.</p>
            </div>
        </div>
        <div class="button-group">
            <button class="btn btn-primary">Primary Action</button>
            <button class="btn btn-secondary">Secondary Action</button>
        </div>
    </div>
</body>
</html>
```

#### 3-2. 파일 업로드

**Bash/curl:**
```bash
curl -X POST http://localhost:4000/render-html-file \
  -F "htmlFile=@test-page.html"
```

**PowerShell:**
```powershell
$filePath = "test-page.html"
$uri = "http://localhost:4000/render-html-file"

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileEnc = [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($fileBytes)

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"htmlFile`"; filename=`"test-page.html`"",
    "Content-Type: text/html$LF",
    $fileEnc,
    "--$boundary--$LF"
) -join $LF

Invoke-RestMethod -Uri $uri -Method Post -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyLines
```

---

### 방법 4: VSCode REST Client (추천)

#### 4-1. REST Client 확장 설치
VSCode Marketplace에서 "REST Client" 검색 후 설치

#### 4-2. `test-requests.http` 파일 생성

```http
### Health Check
GET http://localhost:4000/health

### Server Info
GET http://localhost:4000/info

### Simple Box Test
POST http://localhost:4000/render-html-text
Content-Type: application/json

{
  "htmlContent": "<div style='width:200px;height:100px;background:#ff0000;border-radius:10px;'></div>"
}

### Auto Layout Test
POST http://localhost:4000/render-html-text
Content-Type: application/json

{
  "htmlContent": "<div style='display:flex;gap:10px;padding:20px;'><div style='width:50px;height:50px;background:red;border-radius:8px;'></div><div style='width:50px;height:50px;background:blue;border-radius:8px;'></div><div style='width:50px;height:50px;background:green;border-radius:8px;'></div></div>",
  "options": {
    "mode": "balanced"
  }
}

### Gradient & Shadow Test
POST http://localhost:4000/render-html-text
Content-Type: application/json

{
  "htmlContent": "<div style='width:400px;height:300px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.3);padding:30px;display:flex;flex-direction:column;gap:15px;'><h1 style='color:white;font-size:32px;margin:0;'>Dashboard</h1><p style='color:rgba(255,255,255,0.9);font-size:16px;'>Welcome back to your workspace</p></div>",
  "options": {
    "mode": "quality",
    "enableScreenshot": true
  }
}

### Typography Test
POST http://localhost:4000/render-html-text
Content-Type: application/json

{
  "htmlContent": "<div style='padding:40px;background:#ffffff;'><h1 style='font-size:36px;font-weight:bold;color:#2c3e50;margin:0 0 16px 0;'>Heading 1</h1><h2 style='font-size:28px;font-weight:600;color:#34495e;margin:0 0 12px 0;'>Heading 2</h2><p style='font-size:16px;line-height:1.6;color:#7f8c8d;margin:0;'>This is a paragraph with proper line height and letter spacing for readability.</p></div>"
}

### Fast Mode (No Screenshot)
POST http://localhost:4000/render-html-text
Content-Type: application/json

{
  "htmlContent": "<div style='width:300px;height:200px;background:#3498db;'></div>",
  "options": {
    "mode": "fast",
    "skipVision": true
  }
}
```

#### 4-3. 사용 방법
- 각 요청 위에 `Send Request` 링크 클릭
- 또는 `Ctrl+Alt+R` (Windows) / `Cmd+Alt+R` (Mac)

---

### 방법 5: Postman

#### 5-1. 새 Request 생성

**설정:**
- **Method**: `POST`
- **URL**: `http://localhost:4000/render-html-text`

#### 5-2. Headers 설정
```
Content-Type: application/json
```

#### 5-3. Body (raw, JSON)

**예시 1: 기본 테스트**
```json
{
  "htmlContent": "<div style='width:200px;height:100px;background:#ff0000;'></div>"
}
```

**예시 2: 고급 테스트**
```json
{
  "htmlContent": "<div style='display:flex;flex-direction:column;gap:20px;padding:30px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:20px;width:400px;box-shadow:0 10px 30px rgba(0,0,0,0.3);'><h1 style='color:white;font-size:32px;font-weight:bold;margin:0;'>Welcome</h1><p style='color:rgba(255,255,255,0.9);font-size:16px;line-height:1.6;margin:0;'>This is a test with auto layout, gradient, and shadows.</p><button style='background:#fff;color:#667eea;padding:12px 24px;border-radius:8px;border:none;font-weight:600;'>Action</button></div>",
  "options": {
    "mode": "quality",
    "enableScreenshot": true,
    "width": 1920,
    "height": 1080
  }
}
```

#### 5-4. 파일 업로드

**설정:**
- **Method**: `POST`
- **URL**: `http://localhost:4000/render-html-file`
- **Body**: `form-data`
- **Key**: `htmlFile` (type: File)
- **Value**: 업로드할 HTML 파일 선택

---

## API 엔드포인트

### 1. Health Check
```
GET /health
```

**응답:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-11T02:32:36.668Z"
}
```

### 2. Server Info
```
GET /info
```

**응답:**
```json
{
  "name": "HTML to Figma conversion prototype",
  "version": "0.1.0",
  "environment": "development"
}
```

### 3. HTML 텍스트 렌더링
```
POST /render-html-text
Content-Type: application/json
```

**Request Body:**
```json
{
  "htmlContent": "<div>...</div>",
  "filename": "optional-name.html",
  "options": {
    "enableScreenshot": true,
    "width": 1920,
    "height": 1080,
    "waitUntil": "load",
    "mode": "balanced",
    "captureTimeoutMs": 3500,
    "visionTimeoutMs": 3000,
    "skipVision": false
  }
}
```

**Options 설명:**
- `mode`: `"fast"` | `"balanced"` | `"quality"` (기본: `"balanced"`)
  - `fast`: JSDOM만 사용, 스크린샷 없음
  - `balanced`: Playwright 사용, 기본 타임아웃
  - `quality`: 최대 품질, 긴 타임아웃
- `enableScreenshot`: 스크린샷 캡처 여부 (기본: `true` for balanced/quality)
- `width`/`height`: 뷰포트 크기 (기본: 1920x1080)
- `waitUntil`: `"load"` | `"domcontentloaded"` | `"networkidle"`
- `skipVision`: AI Vision 분석 스킵 (기본: `false`)

### 4. HTML 파일 업로드
```
POST /render-html-file
Content-Type: multipart/form-data
```

**Form Data:**
- `htmlFile`: HTML 파일

---

## 응답 구조

### 성공 응답 (200 OK)

```json
{
  "nodes": [
    {
      "id": "uuid-123",
      "parentId": null,
      "type": "FRAME",
      "name": "div",
      "boundingBox": {
        "x": 0,
        "y": 0,
        "width": 400,
        "height": 300
      },
      "fills": [
        {
          "type": "GRADIENT_LINEAR",
          "gradientStops": [
            {
              "position": 0,
              "color": { "r": 0.4, "g": 0.49, "b": 0.91, "a": 1 }
            },
            {
              "position": 1,
              "color": { "r": 0.46, "g": 0.29, "b": 0.63, "a": 1 }
            }
          ],
          "gradientHandlePositions": [
            { "x": 0, "y": 0 },
            { "x": 1, "y": 0 },
            { "x": 0, "y": 1 }
          ]
        }
      ],
      "strokes": [],
      "cornerRadius": 20,
      "effects": [
        {
          "type": "DROP_SHADOW",
          "offset": { "x": 0, "y": 10 },
          "radius": 30,
          "color": { "r": 0, "g": 0, "b": 0, "a": 0.3 },
          "visible": true
        }
      ],
      "layoutMode": "VERTICAL",
      "itemSpacing": 20,
      "padding": {
        "top": 30,
        "right": 30,
        "bottom": 30,
        "left": 30
      },
      "meta": {
        "htmlTag": "div",
        "classes": [],
        "attributes": {}
      }
    }
  ],
  "vision": {
    "source": "ai",
    "model": "gemini-2.5-flash",
    "summary": "Analyzed HTML structure and applied AI-driven layout optimizations",
    "annotations": [
      {
        "target": {
          "nodeId": "uuid-123",
          "htmlTag": "div"
        },
        "suggestions": [
          {
            "property": "layoutMode",
            "value": "VERTICAL",
            "confidence": 0.85,
            "summary": "Container uses vertical flex layout"
          }
        ]
      }
    ],
    "issues": []
  },
  "meta": {
    "errors": [],
    "warnings": [],
    "info": [
      "Converted 5 nodes",
      "Applied 3 AI-driven adjustments"
    ],
    "assets": {
      "images": [],
      "fonts": ["Arial"]
    },
    "render": {
      "elementCount": 5,
      "processingTimeMs": 1234,
      "screenshotPath": "uploads/screenshots/1728612756668-abc123.png"
    },
    "figmaTreeSummary": {
      "nodeCount": 5,
      "componentCount": 0
    }
  },
  "quality": {
    "accuracyScore": 0.95,
    "notes": []
  }
}
```

### 에러 응답

**400 Bad Request:**
```json
{
  "error": "htmlContent is required",
  "code": "BAD_REQUEST"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error"
}
```

---

## 테스트 시나리오

### 시나리오 1: 기본 박스
**목적:** 기본 크기, 배경색 테스트

```json
{
  "htmlContent": "<div style='width:100px;height:100px;background:#ff0000;'></div>"
}
```

**검증 포인트:**
- `boundingBox.width === 100`
- `boundingBox.height === 100`
- `fills[0].type === 'SOLID'`
- `fills[0].color.r === 1`

---

### 시나리오 2: Border Radius
**목적:** 모서리 둥글기 테스트

```json
{
  "htmlContent": "<div style='width:150px;height:150px;background:#3498db;border-radius:20px;'></div>"
}
```

**검증 포인트:**
- `cornerRadius === 20`

---

### 시나리오 3: Auto Layout (Flexbox)
**목적:** Flex 컨테이너 → Auto Layout 변환 테스트

```json
{
  "htmlContent": "<div style='display:flex;flex-direction:column;gap:15px;padding:20px;'><div style='width:100px;height:50px;background:red;'></div><div style='width:100px;height:50px;background:blue;'></div></div>"
}
```

**검증 포인트:**
- `layoutMode === 'VERTICAL'`
- `itemSpacing === 15`
- `padding.top === 20`

---

### 시나리오 4: Gradient
**목적:** Linear Gradient 변환 테스트

```json
{
  "htmlContent": "<div style='width:200px;height:100px;background:linear-gradient(to right, #ff0000, #0000ff);'></div>"
}
```

**검증 포인트:**
- `fills[0].type === 'GRADIENT_LINEAR'`
- `fills[0].gradientStops.length === 2`

---

### 시나리오 5: Box Shadow
**목적:** 그림자 효과 변환 테스트

```json
{
  "htmlContent": "<div style='width:150px;height:150px;background:white;box-shadow:0 10px 30px rgba(0,0,0,0.3);'></div>"
}
```

**검증 포인트:**
- `effects[0].type === 'DROP_SHADOW'`
- `effects[0].offset.y === 10`
- `effects[0].radius === 30`

---

### 시나리오 6: Typography
**목적:** 텍스트 스타일 변환 테스트

```json
{
  "htmlContent": "<div style='padding:20px;'><h1 style='font-size:32px;font-weight:bold;color:#2c3e50;'>Title</h1><p style='font-size:16px;line-height:1.6;color:#7f8c8d;'>Body text</p></div>"
}
```

**검증 포인트:**
- `text.fontSize === 32` (h1)
- `text.fontWeight === 'bold'`
- `text.lineHeight` (계산된 값)

---

### 시나리오 7: Nested Flex (복잡한 레이아웃)
**목적:** 중첩된 Flex 컨테이너 테스트

```json
{
  "htmlContent": "<div style='display:flex;flex-direction:column;gap:20px;'><div style='display:flex;gap:10px;'><div style='width:50px;height:50px;background:red;'></div><div style='width:50px;height:50px;background:blue;'></div></div><div style='width:100px;height:30px;background:green;'></div></div>"
}
```

**검증 포인트:**
- 부모 `layoutMode === 'VERTICAL'`
- 자식 `layoutMode === 'HORIZONTAL'`
- 중첩 구조 유지

---

### 시나리오 8: AI Vision 테스트
**목적:** Gemini Vision API 분석 테스트

```json
{
  "htmlContent": "<div style='display:flex;flex-direction:column;gap:20px;padding:30px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:20px;width:400px;'><h1 style='color:white;font-size:32px;'>Dashboard</h1></div>",
  "options": {
    "mode": "quality",
    "enableScreenshot": true
  }
}
```

**검증 포인트:**
- `vision.source === 'ai'`
- `vision.annotations.length > 0`
- `vision.model === 'gemini-2.5-flash'`

---

## 문제 해결

### 서버가 시작되지 않음

**증상:**
```
Error: listen EADDRINUSE: address already in use :::4000
```

**해결:**
```bash
# 포트를 사용 중인 프로세스 찾기 (Windows)
netstat -ano | findstr :4000

# 프로세스 종료
taskkill /PID <PID> /F

# 또는 다른 포트 사용
PORT=4001 npm run dev
```

---

### Playwright 설치 오류

**증상:**
```
browserType.launch: Executable doesn't exist
```

**해결:**
```bash
npx playwright install chromium
```

---

### Gemini API 오류

**증상:**
```
Vision model failed, using heuristic fallback
```

**해결:**
1. `.env` 파일 확인
```
GEMINI_API_KEY=your-actual-api-key
```

2. API 키 유효성 확인
3. 네트워크 연결 확인

---

### 타임아웃 오류

**증상:**
```
Playwright capture unavailable, falling back to JSDOM renderer
```

**해결:**
```json
{
  "options": {
    "captureTimeoutMs": 10000,
    "visionTimeoutMs": 10000
  }
}
```

---

### 메모리 부족

**증상:**
```
JavaScript heap out of memory
```

**해결:**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

---

## 추가 리소스

- **프로젝트 구조:** `docs/ARCHITECTURE.md`
- **API 레퍼런스:** `docs/API_REFERENCE.md`
- **개발 가이드:** `docs/DEVELOPMENT.md`

---

## 문의 및 이슈 리포트

문제가 발생하거나 개선 사항이 있으면 GitHub Issues에 등록해주세요.
