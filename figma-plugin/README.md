# HTML to Figma Plugin

Figma 플러그인으로 HTML/CSS를 Figma 레이어로 변환합니다. AI를 활용한 품질 개선 기능을 포함합니다.

## 기능

- **HTML → Figma 변환**: HTML/CSS를 Figma 레이어로 자동 변환
- **CSS 완벽 지원**: 60+ CSS 속성 → Figma 속성 매핑
- **Auto Layout**: Flexbox → Figma Auto Layout 자동 변환
- **Gradient & Shadow**: Linear Gradient, Box Shadow 완벽 지원
- **Typography**: 폰트, 크기, 굵기, 행간 등 텍스트 스타일 변환
- **AI Enhancement**: Gemini Vision API를 통한 품질 개선
- **실시간 미리보기**: Playwright를 통한 실제 렌더링

## 설치 방법

### 1. 백엔드 서버 실행

플러그인은 로컬 백엔드 서버와 통신합니다.

```bash
# 프로젝트 루트 디렉토리에서
cd C:\Users\keduall\HTF2
npm run dev
```

서버가 `http://localhost:4000`에서 실행됩니다.

### 2. Figma Desktop 앱에서 플러그인 설치

#### 방법 A: 개발 모드로 실행 (추천)

1. **Figma Desktop 앱** 실행 (웹 버전 아님!)
2. 파일 열기 또는 새 파일 생성
3. 메뉴: `Plugins` → `Development` → `Import plugin from manifest...`
4. `C:\Users\keduall\HTF2\figma-plugin\manifest.json` 선택
5. 플러그인이 설치됩니다!

#### 방법 B: 다시 실행하기

한 번 설치한 후:
1. `Plugins` → `Development` → `HTML to Figma Converter` 클릭

## 사용 방법

### 1. 플러그인 실행

1. Figma에서 `Plugins` → `Development` → `HTML to Figma Converter` 실행
2. 플러그인 UI가 나타납니다 (400x700px 창)

### 2. HTML 입력

#### 옵션 A: 직접 입력
텍스트 영역에 HTML 코드를 붙여넣습니다.

```html
<div style="width:200px;height:100px;background:#3498db;border-radius:10px;"></div>
```

#### 옵션 B: 예제 사용
- **Simple Box**: 기본 박스
- **Card Layout**: 카드 레이아웃 (Auto Layout)
- **Button Group**: 버튼 그룹

### 3. 옵션 설정

#### Backend URL
- 기본값: `http://localhost:4000`
- 변경 가능 (다른 포트 사용 시)

#### Mode
- **Fast**: 빠른 변환 (JSDOM, 스크린샷 없음)
- **Balanced** (기본): 균형 잡힌 품질 (Playwright)
- **Quality**: 최고 품질 (AI Vision 포함)

#### 옵션
- **Enable Screenshot**: 실제 렌더링 스크린샷 생성
- **Skip AI Vision**: AI 분석 건너뛰기 (더 빠름)

### 4. 변환 실행

**"Convert to Figma"** 버튼 클릭

### 5. 결과 확인

- Figma 캔버스에 레이어가 자동 생성됩니다
- 생성된 노드가 자동으로 선택됩니다
- 통계 정보 표시:
  - Nodes Created
  - Processing Time
  - Accuracy Score
  - AI Suggestions

## 사용 예제

### 예제 1: 기본 박스

```html
<div style="width:200px;height:100px;background:#ff0000;border-radius:10px;"></div>
```

**결과:**
- Frame (200x100px)
- Background: 빨강
- Corner Radius: 10px

---

### 예제 2: 카드 레이아웃 (Auto Layout)

```html
<div style="display:flex;flex-direction:column;gap:16px;padding:24px;
     background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);
     width:300px;">
  <h2 style="font-size:20px;font-weight:bold;color:#2c3e50;margin:0;">
    Card Title
  </h2>
  <p style="font-size:14px;color:#7f8c8d;margin:0;line-height:1.6;">
    This is a sample card layout.
  </p>
  <button style="background:#3498db;color:white;padding:10px 20px;
                 border:none;border-radius:6px;font-weight:600;">
    Action
  </button>
</div>
```

**결과:**
- Frame with Auto Layout (VERTICAL)
- Gap: 16px, Padding: 24px
- 3개 자식 노드 (h2, p, button)
- Drop Shadow 효과

---

### 예제 3: Gradient Background

```html
<div style="width:300px;height:200px;
     background:linear-gradient(135deg,#667eea,#764ba2);
     border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.3);"></div>
```

**결과:**
- Frame (300x200px)
- Linear Gradient (135도)
- Corner Radius: 20px
- Drop Shadow

---

### 예제 4: 버튼 그룹

```html
<div style="display:flex;gap:12px;padding:20px;">
  <button style="background:#3498db;color:white;padding:12px 24px;
                 border:none;border-radius:8px;font-weight:600;">
    Primary
  </button>
  <button style="background:white;color:#3498db;padding:12px 24px;
                 border:2px solid #3498db;border-radius:8px;font-weight:600;">
    Secondary
  </button>
  <button style="background:#e74c3c;color:white;padding:12px 24px;
                 border:none;border-radius:8px;font-weight:600;">
    Danger
  </button>
</div>
```

**결과:**
- Frame with Auto Layout (HORIZONTAL)
- Gap: 12px
- 3개 버튼 (Text 노드)

## 지원되는 CSS 속성

### Layout
- `width`, `height`
- `display: flex`
- `flex-direction: row | column`
- `gap`
- `padding`

### Background
- `background` (solid color)
- `background: linear-gradient(...)`

### Border
- `border-radius`
- `border` (as stroke)

### Effects
- `box-shadow` → DROP_SHADOW
- `text-shadow`

### Typography
- `font-size`
- `font-weight`
- `font-family`
- `line-height`
- `letter-spacing`
- `color` (text)
- `text-align`

## 문제 해결

### 플러그인이 나타나지 않음
1. **Figma Desktop 앱**을 사용하고 있는지 확인 (웹 버전 불가)
2. `manifest.json` 경로가 올바른지 확인
3. Figma 재시작

### "Backend returned 404" 에러
1. 백엔드 서버가 실행 중인지 확인
```bash
curl http://localhost:4000/health
```
2. Backend URL이 올바른지 확인 (기본: `http://localhost:4000`)

### 폰트가 올바르지 않음
- Figma에 해당 폰트가 설치되어 있어야 합니다
- 없으면 자동으로 "Inter Regular"로 폴백됩니다

### 느린 변환 속도
- **Mode: Fast** 또는 **Skip AI Vision** 옵션 사용
- Quality 모드는 ~500ms 소요 (AI 분석 포함)

### Network Access 에러
- `manifest.json`의 `networkAccess` 설정 확인
- Figma Desktop 앱이 최신 버전인지 확인

## 개발

### 빌드

```bash
cd figma-plugin
npm install
npm run build
```

### 개발 모드 (Watch)

```bash
npm run watch
```

코드가 변경될 때마다 자동으로 다시 컴파일됩니다.

### 프로젝트 구조

```
figma-plugin/
├── manifest.json         # Figma 플러그인 설정
├── src/
│   ├── code.ts          # 메인 플러그인 로직
│   └── ui.html          # 플러그인 UI
├── dist/                # 빌드 결과물
│   ├── code.js
│   └── ui.html
├── package.json
├── tsconfig.json
└── build.js             # 번들 스크립트
```

## 기술 스택

- **TypeScript**: 타입 안전성
- **Figma Plugin API**: Figma 노드 생성
- **Fetch API**: 백엔드 통신
- **HTML/CSS**: 플러그인 UI

## 라이센스

MIT

## 문의

이슈나 개선 사항이 있으면 GitHub Issues에 등록해주세요.
