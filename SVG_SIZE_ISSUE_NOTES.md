# SVG 로고 크기 문제 해결 시도 기록

## 문제 상황
- **증상**: SVG 로고가 20px x 20px로 매우 작게 렌더링됨
- **구조**: DIV(부모) → SVG(자식) 구조에서, DIV 크기는 정확하나 SVG 크기가 너무 작음
- **영향받는 요소**: Google 로고(node-34), 기타 SVG 아이콘들
- **위치**: `src/renderers/playwright-capture.ts`의 DOM 스냅샷 추출 로직

## 진단 결과

### 로그 분석
```
node-34 (Google 로고): "width":20,"height":20
node-22 (SVG 아이콘): "width":20,"height":20
기타 SVG들: 대부분 20px x 20px 또는 24px x 24px
```

### 근본 원인
`playwright-capture.ts`의 `page.evaluate()` 내부에서:
1. SVG 요소에 대해 `getBoundingClientRect()` 호출
2. CSS width/height, SVG attributes, viewBox 등을 확인
3. 최종적으로 `rect.width`, `rect.height`와 비교하여 더 큰 값 사용
4. **문제**: SVG의 `getBoundingClientRect()`가 이미 20px를 반환하고 있음

## 시도한 해결 방법 #1: 부모 컨테이너 크기 확인 ❌ 실패

### 접근 방식
```typescript
// playwright-capture.ts:728-756
if ((actualWidth <= 30 || actualHeight <= 30) && element.parentElement) {
  const parentRect = element.parentElement.getBoundingClientRect();
  const parentWidth = parentRect.width;
  const parentHeight = parentRect.height;

  // 부모 크기가 SVG보다 크면 부모 크기 사용
  if (parentWidth > actualWidth && parentWidth >= 30 && parentWidth <= 600) {
    actualWidth = parentWidth;
  }
  if (parentHeight > actualHeight && parentHeight >= 30 && parentHeight <= 600) {
    actualHeight = parentHeight;
  }
}
```

### 왜 실패했는가
1. **console.log 디버깅이 나타나지 않음**: 조건문이 실행되지 않았거나, 브라우저 컨텍스트의 console.log가 Node.js 로그로 전달되지 않음
2. **결과물 변화 없음**: 여전히 20px x 20px로 출력됨
3. **가능한 원인들**:
   - 부모 요소도 실제로 20px일 가능성 (사용자가 말한 "DIV 크기는 정확하다"는 것이 실제 렌더링과 다를 수 있음)
   - `page.evaluate()` 내부의 코드는 브라우저 컨텍스트에서 실행되므로, console.log가 Node.js 서버 로그로 전달되지 않음
   - 조건이 너무 제한적이어서 트리거되지 않음

## 핵심 문제점

### 1. 브라우저 컨텍스트 vs Node.js 컨텍스트
```typescript
const rootSnapshotRaw = await page.evaluate(({ styleKeys }) => {
  // 이 안의 코드는 브라우저에서 실행됨
  // console.log는 브라우저 콘솔로만 출력됨
  // Node.js 서버 로그에는 나타나지 않음
});
```

### 2. 실제 DOM 구조 불명확
- 사용자는 "DIV 크기는 정확한데 SVG가 작다"고 했지만
- 실제로 브라우저에서 `getBoundingClientRect()`를 호출했을 때 부모 DIV의 크기가 얼마인지 확인 안 됨
- Google 페이지의 실제 DOM 구조를 직접 확인하지 않고 추측으로 코드 작성

### 3. 디버깅의 어려움
- `page.evaluate()` 내부에서 실행되는 코드는 디버깅이 어려움
- console.log가 서버 로그에 나타나지 않아 실제로 코드가 실행되는지 확인 불가
- 서버 재시작 후에도 이전 요청의 로그만 보이고 새 요청 로그가 안 보임

## 교훈 및 다음 단계를 위한 제안

### ❌ 하지 말아야 할 것
1. **추측으로 코드 작성하지 말기**: 실제 DOM 구조를 확인하지 않고 "부모가 크다"는 가정만으로 코드 작성
2. **console.log에만 의존하지 말기**: `page.evaluate()` 내부의 console.log는 Node.js 로그에 나타나지 않음
3. **조건을 너무 제한적으로 만들지 말기**: `>= 30 && <= 600` 같은 임의의 제한은 예상치 못한 경우를 놓칠 수 있음

### ✅ 다음에 시도해볼 방법

#### 1. 실제 브라우저에서 직접 확인
```javascript
// 브라우저 개발자 도구에서 직접 실행
const logo = document.querySelector('.lnXdpd'); // Google 로고
console.log('SVG:', logo.getBoundingClientRect());
console.log('Parent:', logo.parentElement.getBoundingClientRect());
```

#### 2. Playwright의 evaluate 결과를 Node.js로 반환
```typescript
const debugInfo = await page.evaluate(() => {
  const svgs = document.querySelectorAll('svg');
  return Array.from(svgs).map(svg => ({
    class: svg.className,
    svgSize: svg.getBoundingClientRect(),
    parentSize: svg.parentElement?.getBoundingClientRect(),
    computedStyle: window.getComputedStyle(svg).width
  }));
});
logger.info('SVG Debug Info:', debugInfo);
```

#### 3. 스크린샷과 실제 크기 비교
- Playwright로 캡처한 SVG 스크린샷의 실제 픽셀 크기 확인
- `element.screenshot()` 결과의 Buffer 크기와 이미지 dimensions 비교

#### 4. CSS 크기 우선 사용 고려
```typescript
// computedStyle.width가 '272px' 같은 값일 수 있음
const computedWidth = window.getComputedStyle(element).width;
if (computedWidth && computedWidth !== 'auto') {
  actualWidth = parseFloat(computedWidth);
}
```

#### 5. 스크린샷 기반 크기 사용
```typescript
// 이미 캡처한 스크린샷의 실제 크기를 사용
const screenshot = await element.screenshot();
const imageSize = await getImageDimensions(screenshot); // PNG 헤더 파싱
actualWidth = imageSize.width;
actualHeight = imageSize.height;
```

## 코드 변경 히스토리

### 변경된 파일
- `src/renderers/playwright-capture.ts:728-756`

### 변경 내용
- SVG 크기가 30px 이하일 때 부모 컨테이너 크기 확인하는 로직 추가
- 디버그 로깅 추가 (하지만 출력 안 됨)

### 롤백 필요 여부
- ✅ **롤백 권장**: 이 코드는 작동하지 않으므로 제거하거나 개선 필요
- 현재 코드는 실행되지 않거나 효과가 없으므로 불필요한 복잡성만 추가

## 결론

이 접근 방식은 다음 이유로 실패했습니다:

1. **검증되지 않은 가정**: 부모 DIV가 정말 더 큰지 확인하지 않음
2. **디버깅 불가능**: 브라우저 컨텍스트의 console.log를 사용해 디버깅 시도했으나 Node.js 로그에 나타나지 않음
3. **결과 없음**: 실제 출력 크기는 여전히 20px x 20px

**다음 시도 시에는 반드시 실제 브라우저 DOM을 직접 확인하고, evaluate 결과를 Node.js로 반환하여 로깅하는 방식을 사용해야 합니다.**

---

생성일: 2025-10-15
작성자: Claude Code
상태: 해결 실패 - 추가 조사 필요
dsd