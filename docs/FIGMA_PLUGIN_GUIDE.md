# HTML to Figma Plugin - 완전 가이드

Figma 플러그인을 사용하여 HTML/CSS를 Figma 내에서 직접 변환하는 방법을 설명합니다.

---

## 📋 목차

1. [개요](#개요)
2. [설치](#설치)
3. [사용 방법](#사용-방법)
4. [UI 가이드](#ui-가이드)
5. [사용 예제](#사용-예제)
6. [고급 기능](#고급-기능)
7. [문제 해결](#문제-해결)
8. [개발 가이드](#개발-가이드)

---

## 개요

### 플러그인 아키텍처

```
┌─────────────────┐         ┌──────────────────┐
│  Figma Plugin   │ ◄─────► │  Backend Server  │
│   (UI + Code)   │  HTTP   │  (localhost:4000)│
└─────────────────┘         └──────────────────┘
        │                            │
        │                            ├─ HTML Rendering (Playwright)
        ├─ Figma API                 ├─ CSS → Figma 변환
        ├─ Node 생성                 ├─ AI Vision (Gemini)
        └─ Auto Layout               └─ Quality 검증
```

### 주요 기능

1. **HTML → Figma 실시간 변환**
   - HTML/CSS 붙여넣기
   - 자동 Figma 노드 생성
   - Auto Layout 적용

2. **CSS 완벽 지원**
   - Solid Color, Gradient
   - Border Radius, Box Shadow
   - Flexbox → Auto Layout
   - Typography (font, size, weight, line-height)

3. **AI 품질 개선**
   - Gemini Vision API 통합
   - 스크린샷 기반 분석
   - Heuristic 폴백

---

## 설치

### 사전 요구사항

- **Figma Desktop 앱** (필수)
  - [다운로드](https://www.figma.com/downloads/)
  - 웹 버전에서는 플러그인 개발 불가
- **Node.js** 16+ (백엔드용)
- **백엔드 서버** 실행 중

### Step 1: 백엔드 서버 실행

```bash
# 터미널 1: 백엔드 서버
cd C:\Users\keduall\HTF2
npm run dev
```

**확인:**
```bash
curl http://localhost:4000/health
# {"status":"ok","timestamp":"..."}
```

### Step 2: 플러그인 설치

#### 옵션 A: 개발 모드 (추천)

1. **Figma Desktop 앱** 실행
2. 아무 파일이나 열기 (또는 새 파일 생성)
3. 메뉴 → `Plugins` → `Development` → `Import plugin from manifest...`
4. 파일 선택: `C:\Users\keduall\HTF2\figma-plugin\manifest.json`
5. 완료!

#### 옵션 B: 다시 빌드 후 설치

플러그인 코드를 수정한 경우:

```bash
cd C:\Users\keduall\HTF2\figma-plugin
npm run build
```

Figma에서:
1. `Plugins` → `Development` → `HTML to Figma Converter` (이미 설치된 경우)
2. 또는 위의 **옵션 A** 반복

---

## 사용 방법

### 기본 사용 흐름

```
1. Figma에서 플러그인 실행
   ↓
2. HTML 코드 입력 또는 예제 선택
   ↓
3. 옵션 설정 (Mode, Screenshot, AI Vision)
   ↓
4. "Convert to Figma" 버튼 클릭
   ↓
5. Figma 캔버스에 레이어 생성
```

### Step-by-Step 가이드

#### 1. 플러그인 실행

**Figma Desktop 앱에서:**
- `Plugins` → `Development` → `HTML to Figma Converter`

**단축키:**
- Windows: `Ctrl + Alt + P` → "HTML to Figma" 검색
- Mac: `Cmd + Option + P` → "HTML to Figma" 검색

#### 2. HTML 입력

**방법 A: 직접 입력**

텍스트 영역에 HTML 붙여넣기:

```html
<div style="width:200px;height:100px;background:#3498db;border-radius:10px;"></div>
```

**방법 B: 예제 사용**

플러그인 상단의 링크 클릭:
- **Simple Box** - 기본 박스
- **Card Layout** - 카드 (Auto Layout)
- **Button Group** - 버튼 3개 (Horizontal Layout)

#### 3. 설정 조정

**API Settings:**
- Backend URL: `http://localhost:4000` (기본값)

**Conversion Options:**

| Mode | 속도 | 품질 | 스크린샷 | AI Vision |
|------|-----|------|---------|----------|
| Fast | 빠름 | 낮음 | ❌ | ❌ |
| Balanced | 중간 | 중간 | ✅ | ⚠️ |
| Quality | 느림 | 높음 | ✅ | ✅ |

**체크박스:**
- ✅ Enable Screenshot: Playwright 렌더링 활성화
- ✅ Skip AI Vision: AI 분석 건너뛰기 (더 빠름)

#### 4. 변환 실행

**"Convert to Figma"** 버튼 클릭

**진행 상황:**
1. ⏳ "Sending request to backend..."
2. ⏳ "Creating Figma nodes..."
3. ✓ "Successfully created N Figma nodes!"

#### 5. 결과 확인

**Figma 캔버스:**
- 새 레이어가 자동 생성됨
- 생성된 노드가 자동 선택됨
- 뷰포트가 자동으로 포커스

**통계 정보:**
- **Nodes Created**: 5
- **Processing Time**: 582ms
- **Accuracy Score**: 95%
- **AI Suggestions**: 2

---

## UI 가이드

### 플러그인 UI 구조

```
┌─────────────────────────────────────┐
│ HTML to Figma                       │  ← 헤더
│ Convert HTML/CSS to Figma with AI  │
├─────────────────────────────────────┤
│ HTML Content                        │
│ [Simple Box] [Card] [Buttons]      │  ← 예제 링크
│ ┌─────────────────────────────────┐ │
│ │ <div style="...">               │ │  ← 텍스트 영역
│ │ </div>                          │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ API Settings                        │
│ Backend URL: [localhost:4000]      │  ← API 설정
├─────────────────────────────────────┤
│ Conversion Options                  │
│ Mode: ◉ Fast  ◉ Balanced ◯ Quality │  ← 모드 선택
│ ☑ Enable Screenshot                │
│ ☐ Skip AI Vision                   │  ← 옵션
├─────────────────────────────────────┤
│ [  Convert to Figma  ]             │  ← 메인 버튼
│ [  Import HTML File  ]             │  ← 파일 가져오기
├─────────────────────────────────────┤
│ ⏳ Processing...                    │  ← 로더
├─────────────────────────────────────┤
│ ✓ Success message                  │  ← 상태 메시지
├─────────────────────────────────────┤
│ Nodes Created: 5                   │
│ Processing Time: 582ms             │  ← 통계
│ Accuracy Score: 95%                │
│ AI Suggestions: 2                  │
└─────────────────────────────────────┘
```

### 상태 메시지

| 아이콘 | 색상 | 의미 |
|-------|-----|------|
| ⏳ | 파랑 | 진행 중 |
| ✓ | 초록 | 성공 |
| ✗ | 빨강 | 에러 |
| ⚠ | 노랑 | 경고 |

---

## 사용 예제

### 예제 1: 간단한 박스

**입력:**
```html
<div style="width:200px;height:100px;background:#3498db;border-radius:10px;"></div>
```

**Figma 결과:**
```
Frame
├─ Width: 200px
├─ Height: 100px
├─ Fill: #3498db
└─ Corner Radius: 10px
```

**소요 시간:** ~50ms (Fast 모드)

---

### 예제 2: Auto Layout 카드

**입력:**
```html
<div style="display:flex;flex-direction:column;gap:16px;padding:24px;
     background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);
     width:300px;">
  <h2 style="font-size:20px;font-weight:bold;color:#2c3e50;margin:0;">
    Card Title
  </h2>
  <p style="font-size:14px;color:#7f8c8d;margin:0;line-height:1.6;">
    This is a description with proper line height for readability.
  </p>
  <button style="background:#3498db;color:white;padding:10px 20px;
                 border:none;border-radius:6px;font-weight:600;">
    Action
  </button>
</div>
```

**Figma 결과:**
```
Frame (Auto Layout VERTICAL)
├─ Width: 300px
├─ Gap: 16px
├─ Padding: 24px
├─ Fill: white
├─ Corner Radius: 12px
├─ Effect: Drop Shadow (0, 4, 12, rgba(0,0,0,0.1))
├─ Text (h2)
│  ├─ Characters: "Card Title"
│  ├─ Font Size: 20px
│  ├─ Font Weight: Bold
│  └─ Fill: #2c3e50
├─ Text (p)
│  ├─ Characters: "This is a description..."
│  ├─ Font Size: 14px
│  ├─ Line Height: 1.6
│  └─ Fill: #7f8c8d
└─ Text (button)
   ├─ Characters: "Action"
   ├─ Fill: #3498db (Background)
   ├─ Text Fill: white
   ├─ Padding: 10px 20px
   └─ Corner Radius: 6px
```

**소요 시간:** ~200ms (Balanced 모드)

---

### 예제 3: Gradient + Shadow

**입력:**
```html
<div style="width:400px;height:300px;
     background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
     border-radius:20px;
     box-shadow:0 10px 30px rgba(0,0,0,0.3);
     padding:40px;
     display:flex;
     flex-direction:column;
     justify-content:center;">
  <h1 style="color:white;font-size:36px;font-weight:bold;margin:0;">
    Welcome
  </h1>
</div>
```

**Figma 결과:**
```
Frame (Auto Layout VERTICAL)
├─ Width: 400px
├─ Height: 300px
├─ Fill: Linear Gradient (135°)
│  ├─ Stop 0: #667eea (0%)
│  └─ Stop 1: #764ba2 (100%)
├─ Corner Radius: 20px
├─ Effect: Drop Shadow
│  ├─ Offset: (0, 10)
│  ├─ Radius: 30
│  └─ Color: rgba(0,0,0,0.3)
├─ Padding: 40px
└─ Text (h1)
   ├─ Characters: "Welcome"
   ├─ Font Size: 36px
   ├─ Font Weight: Bold
   └─ Fill: white
```

**소요 시간:** ~600ms (Quality 모드, AI Vision 포함)

---

### 예제 4: 복잡한 레이아웃

**입력:**
```html
<div style="display:flex;flex-direction:column;gap:20px;padding:30px;
     width:500px;background:#f9f9f9;border-radius:16px;">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <h1 style="font-size:24px;font-weight:bold;color:#2c3e50;margin:0;">
      Dashboard
    </h1>
    <span style="background:#667eea;color:white;padding:6px 12px;
                 border-radius:20px;font-size:12px;font-weight:600;">
      Premium
    </span>
  </div>

  <!-- Content -->
  <div style="display:flex;flex-direction:column;gap:12px;">
    <div style="background:white;padding:16px;border-radius:8px;
                border-left:4px solid #3498db;">
      <h3 style="font-size:16px;font-weight:600;color:#34495e;margin:0 0 8px 0;">
        Card 1
      </h3>
      <p style="font-size:13px;color:#7f8c8d;margin:0;line-height:1.5;">
        Content text
      </p>
    </div>

    <div style="background:white;padding:16px;border-radius:8px;
                border-left:4px solid #e74c3c;">
      <h3 style="font-size:16px;font-weight:600;color:#34495e;margin:0 0 8px 0;">
        Card 2
      </h3>
      <p style="font-size:13px;color:#7f8c8d;margin:0;line-height:1.5;">
        Content text
      </p>
    </div>
  </div>

  <!-- Actions -->
  <div style="display:flex;gap:12px;">
    <button style="flex:1;background:#3498db;color:white;padding:12px;
                   border:none;border-radius:8px;font-weight:600;">
      Primary
    </button>
    <button style="flex:1;background:white;color:#3498db;padding:12px;
                   border:2px solid #3498db;border-radius:8px;font-weight:600;">
      Secondary
    </button>
  </div>
</div>
```

**Figma 결과:**
- **13개 노드** 생성
- **3개 Auto Layout** 컨테이너
- **AI가 2개 컴포넌트 패턴 감지** (Card 1, Card 2)
- **처리 시간:** ~800ms

---

## 고급 기능

### 1. Backend URL 변경

다른 포트나 원격 서버 사용:

```
Backend URL: http://192.168.1.100:5000
```

또는:

```
Backend URL: https://api.example.com
```

**참고:** `manifest.json`의 `networkAccess.allowedDomains`에 추가 필요

### 2. 모드별 최적화

#### Fast 모드
```json
{
  "mode": "fast",
  "skipVision": true
}
```
- **용도:** 빠른 프로토타이핑, 개발
- **속도:** ~50ms
- **제한:** JSDOM만 사용, 일부 크기 계산 부정확

#### Balanced 모드
```json
{
  "mode": "balanced",
  "enableScreenshot": true,
  "skipVision": false
}
```
- **용도:** 일반적인 사용
- **속도:** ~300ms
- **특징:** Playwright 렌더링, 정확한 크기

#### Quality 모드
```json
{
  "mode": "quality",
  "enableScreenshot": true,
  "skipVision": false
}
```
- **용도:** 최종 결과물, 프로덕션
- **속도:** ~600ms
- **특징:** AI Vision, 최대 품질

### 3. 결과 해석

#### 통계 정보

**Nodes Created: 5**
- 생성된 Figma 노드 수

**Processing Time: 582ms**
- 전체 변환 소요 시간

**Accuracy Score: 95%**
- 변환 정확도 (0.0 ~ 1.0)
- 0.9 이상: 우수
- 0.7 ~ 0.9: 양호
- 0.7 미만: 일부 누락 가능

**AI Suggestions: 2**
- AI가 적용한 개선 사항 수

#### Quality Notes

```json
{
  "notes": [
    "4 nodes are missing explicit width/height"
  ]
}
```

이는 Fast 모드 사용 시 발생합니다. Balanced/Quality 모드로 해결됩니다.

---

## 문제 해결

### 플러그인 관련

#### Q: 플러그인이 메뉴에 나타나지 않음

**A:**
1. **Figma Desktop 앱** 사용 중인지 확인 (웹 버전 불가)
2. `manifest.json` 경로 확인
3. Figma 재시작
4. 플러그인 다시 import

#### Q: "Cannot read property 'showUI' of undefined"

**A:**
- `code.ts`가 제대로 컴파일되었는지 확인
```bash
cd figma-plugin
npm run build
```
- `dist/code.js` 파일 존재 확인

#### Q: UI가 빈 화면으로 표시됨

**A:**
- `ui.html`이 제대로 번들되었는지 확인
- 브라우저 콘솔에서 에러 확인 (Figma → `Plugins` → `Development` → `Open Console`)

---

### 백엔드 관련

#### Q: "Backend returned 404" 에러

**A:**
1. 백엔드 서버 실행 중인지 확인
```bash
curl http://localhost:4000/health
```

2. 포트가 맞는지 확인
```bash
netstat -ano | findstr :4000
```

3. Backend URL 설정 확인 (플러그인 UI)

#### Q: "Network request failed"

**A:**
1. `manifest.json`의 `networkAccess` 확인
```json
{
  "networkAccess": {
    "allowedDomains": [
      "http://localhost:4000"
    ]
  }
}
```

2. Figma Desktop 앱 재시작

#### Q: Timeout 에러 (AI Vision)

**A:**
- 정상 작동입니다! Heuristic 폴백이 자동으로 작동합니다.
- 결과물에는 영향 없음
- 더 긴 timeout 원하면 `.env` 수정:
```
GEMINI_TIMEOUT_MS=10000
```

---

### 변환 결과 관련

#### Q: 폰트가 "Inter Regular"로 표시됨

**A:**
- 해당 폰트가 Figma에 설치되어 있어야 합니다
- 폰트 이름이 정확한지 확인 (예: "Arial", "Helvetica")

#### Q: 크기가 0으로 표시됨

**A:**
- Fast 모드 사용 시 발생 가능
- **해결:** Balanced 또는 Quality 모드 사용
- HTML에 명시적 width/height 지정

#### Q: Auto Layout이 적용되지 않음

**A:**
- `display: flex` 사용했는지 확인
- 부모 요소에 `display: flex` 있어야 함
- 예제:
```html
<div style="display:flex;flex-direction:column;gap:10px;">
  <div>Child 1</div>
  <div>Child 2</div>
</div>
```

#### Q: Gradient가 표시되지 않음

**A:**
- 문법 확인:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```
- 각도, 색상, 위치 모두 필요

---

## 개발 가이드

### 프로젝트 구조

```
figma-plugin/
├── manifest.json              # Figma 플러그인 설정
├── package.json
├── tsconfig.json
├── build.js                   # 번들 스크립트
├── src/
│   ├── code.ts               # 메인 플러그인 로직
│   └── ui.html               # UI (HTML/CSS/JS)
└── dist/                     # 빌드 결과물
    ├── code.js
    ├── code.d.ts
    └── ui.html (embedded in code.js)
```

### 빌드 과정

1. **TypeScript 컴파일**
```bash
tsc
# src/code.ts → dist/code.js
```

2. **UI HTML 번들링**
```bash
node build.js
# dist/code.js에 ui.html 내용 삽입
# __html__ 플레이스홀더 대체
```

3. **최종 결과**
```javascript
// dist/code.js
figma.showUI(`<!DOCTYPE html>...`, { width: 400, height: 700 });
```

### 개발 워크플로우

#### 1. Watch 모드

```bash
cd figma-plugin
npm run watch
```

코드 변경 시 자동 재컴파일

#### 2. Figma에서 테스트

1. 코드 수정 후 저장
2. Figma에서 플러그인 다시 실행
3. 변경 사항 확인

**팁:** Figma를 재시작할 필요 없이 플러그인만 다시 실행하면 최신 코드가 적용됩니다.

#### 3. 디버깅

**플러그인 코드 (code.ts):**
```typescript
console.log('Debug message');
```

**UI 코드 (ui.html):**
```javascript
console.log('UI debug message');
```

**콘솔 확인:**
- Figma → `Plugins` → `Development` → `Open Console`

### 코드 수정 예제

#### UI 색상 변경

**파일:** `src/ui.html`

```css
button {
  background: #18a0fb; /* 기본 파랑 */
  background: #e74c3c; /* 빨강으로 변경 */
}
```

빌드:
```bash
npm run build
```

#### 새 기능 추가

**파일:** `src/code.ts`

```typescript
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'new-feature') {
    // 새 기능 구현
    figma.notify('New feature!');
  }
};
```

**파일:** `src/ui.html`

```javascript
document.getElementById('new-btn').addEventListener('click', () => {
  parent.postMessage({
    pluginMessage: { type: 'new-feature' }
  }, '*');
});
```

---

## 참고 자료

### Figma Plugin API

- [공식 문서](https://www.figma.com/plugin-docs/)
- [Plugin API 타입 정의](https://www.figma.com/plugin-docs/api/api-overview/)
- [샘플 플러그인](https://github.com/figma/plugin-samples)

### 백엔드 API

- [API 레퍼런스](../docs/API_REFERENCE.md)
- [테스트 가이드](../docs/TESTING_GUIDE.md)
- [아키텍처](../docs/ARCHITECTURE.md)

### 커뮤니티

- [Figma Community](https://www.figma.com/community)
- [Figma Plugin Discord](https://discord.gg/figma)

---

**마지막 업데이트:** 2025-10-11
