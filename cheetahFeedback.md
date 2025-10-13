이미지 미수집과 검은 프레임 문제를 해결하기 위해 코드를 분석 중입니다.


[4 tools called]

이미지 미수집과 검은 프레임 문제의 원인과 해결 방안을 정리했습니다.

## 문제 분석

### 1. 이미지 처리 문제
- 외부 이미지 로딩 실패
- Base64 인코딩 오류
- 이미지 크기 계산 오류
- SVG 처리 누락

### 2. 검은 프레임 생성 원인
- 빈 이미지 노드 처리 실패
- 배경색 누락
- 크기 계산 오류(0x0)
- 플레이스홀더 처리 미흡

## 해결 방안

### Phase 1: 이미지 처리 강화 (즉시 적용)

#### 1.1 이미지 로딩 안정화
```typescript
// src/renderers/playwright-capture.ts 개선
const waitForImages = async (page: Page) => {
  // 더 강력한 이미지 로딩 대기
  await page.evaluate(() => {
    return Promise.all([
      // 모든 이미지 로딩 대기
      ...Array.from(document.images).map(img => 
        new Promise(resolve => {
          if (img.complete) {
            resolve(img);
          } else {
            img.onload = img.onerror = resolve;
            // 타임아웃 추가
            setTimeout(() => resolve(img), 5000);
          }
        })
      ),
      // SVG 로딩 대기
      ...Array.from(document.querySelectorAll('svg')).map(svg =>
        new Promise(resolve => {
          if (svg.querySelector('image')) {
            const img = svg.querySelector('image') as HTMLImageElement;
            if (img.complete) {
              resolve(svg);
            } else {
              img.onload = img.onerror = resolve;
              setTimeout(() => resolve(svg), 3000);
            }
          } else {
            resolve(svg);
          }
        })
      )
    ]);
  });
};
```

#### 1.2 이미지 캡처 개선
```typescript
// 더 안정적인 이미지 캡처
const captureImageElement = async (element: ElementHandle, elementId: string) => {
  try {
    const boundingBox = await element.boundingBox();
    if (!boundingBox || boundingBox.width <= 0 || boundingBox.height <= 0) {
      return null;
    }

    // 이미지가 실제로 로드되었는지 확인
    const isLoaded = await element.evaluate((el: any) => {
      if (el.tagName === 'IMG') {
        return el.complete && el.naturalWidth > 0;
      }
      if (el.tagName === 'SVG') {
        return el.getBoundingClientRect().width > 0;
      }
      return true;
    });

    if (!isLoaded) {
      return null;
    }

    // 스크린샷 캡처
    const screenshot = await element.screenshot({ 
      type: 'png',
      omitBackground: false // 배경 포함
    });
    
    return {
      id: elementId,
      data: `data:image/png;base64,${screenshot.toString('base64')}`,
      width: boundingBox.width,
      height: boundingBox.height
    };
  } catch (error) {
    console.warn(`Failed to capture image ${elementId}:`, error);
    return null;
  }
};
```

### Phase 2: 검은 프레임 방지 (즉시 적용)

#### 2.1 이미지 노드 생성 개선
```typescript
// figma-plugin/src/code.ts 개선
async function createImageNode(nodeData: FigmaNodeData): Promise<RectangleNode> {
  const rect = figma.createRectangle();
  
  // 기본 크기 설정 (최소 1px)
  const width = Math.max(nodeData.boundingBox.width, 1);
  const height = Math.max(nodeData.boundingBox.height, 1);
  
  rect.resize(width, height);
  
  // 이미지 데이터가 있는 경우
  if (nodeData.meta?.imageData?.imageData) {
    try {
      // Base64 이미지 데이터를 Figma 이미지로 변환
      const imageData = nodeData.meta.imageData.imageData;
      const image = await figma.createImageAsync(imageData);
      
      // 이미지로 채우기
      rect.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL',
        imageTransform: [[1, 0, 0], [0, 1, 0]]
      }];
    } catch (error) {
      console.warn('Failed to create image fill:', error);
      // 실패 시 플레이스홀더 사용
      rect.fills = [{
        type: 'SOLID',
        color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }
      }];
    }
  } else {
    // 이미지 데이터가 없는 경우 플레이스홀더
    rect.fills = [{
      type: 'SOLID',
      color: { r: 0.95, g: 0.95, b: 0.95, a: 1 }
    }];
    
    // 플레이스홀더 텍스트 추가
    const text = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    text.characters = 'Image';
    text.fontSize = 12;
    text.fills = [{
      type: 'SOLID',
      color: { r: 0.6, g: 0.6, b: 0.6, a: 1 }
    }];
    
    // 텍스트 중앙 정렬
    text.x = width / 2 - text.width / 2;
    text.y = height / 2 - text.height / 2;
    
    rect.appendChild(text);
  }
  
  return rect;
}
```

#### 2.2 빈 프레임 방지
```typescript
// 빈 프레임 생성 방지
function createFrameNode(nodeData: FigmaNodeData): FrameNode {
  const frame = figma.createFrame();
  
  // 최소 크기 보장
  const width = Math.max(nodeData.boundingBox.width, 1);
  const height = Math.max(nodeData.boundingBox.height, 1);
  
  frame.resize(width, height);
  
  // 배경색 설정 (투명하지 않게)
  if (nodeData.fills && nodeData.fills.length > 0) {
    frame.fills = convertFills(nodeData.fills);
  } else {
    // 기본 배경색 설정
    frame.fills = [{
      type: 'SOLID',
      color: { r: 1, g: 1, b: 1, a: 1 } // 흰색 배경
    }];
  }
  
  // 자식이 없는 경우 최소 크기 보장
  if (!nodeData.children || nodeData.children.length === 0) {
    if (width < 10 || height < 10) {
      frame.resize(Math.max(width, 10), Math.max(height, 10));
    }
  }
  
  return frame;
}
```

### Phase 3: 이미지 처리 서비스 개선

#### 3.1 이미지 검증 및 보정
```typescript
// src/services/image-processing-service.ts 개선
export const validateAndCorrectImage = (imageInfo: ImageInfo): ImageInfo => {
  // 크기 검증
  if (imageInfo.width <= 0 || imageInfo.height <= 0) {
    // 기본 크기 설정
    if (imageInfo.isIcon) {
      imageInfo.width = imageInfo.height = 24;
    } else if (imageInfo.isLogo) {
      imageInfo.width = 120;
      imageInfo.height = 40;
    } else {
      imageInfo.width = 100;
      imageInfo.height = 100;
    }
  }
  
  // 이미지 데이터 검증
  if (!imageInfo.imageData) {
    // 플레이스홀더 생성
    imageInfo.imageData = generatePlaceholderImage(imageInfo.width, imageInfo.height);
  }
  
  return imageInfo;
};

const generatePlaceholderImage = (width: number, height: number): string => {
  // 간단한 플레이스홀더 이미지 생성
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // 배경
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // 테두리
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    // 텍스트
    ctx.fillStyle = '#999';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Image', width / 2, height / 2);
  }
  
  return canvas.toDataURL();
};
```

### Phase 4: 에러 처리 및 로깅 강화

#### 4.1 이미지 처리 에러 핸들링
```typescript
// 이미지 처리 중 에러 발생 시 대체 처리
export const processImagesWithFallback = async (
  rootSnapshot: HTMLNodeSnapshot
): Promise<ImageInfo[]> => {
  try {
    const images = processImagesInTree(rootSnapshot);
    
    // 각 이미지 검증 및 보정
    return images.map(validateAndCorrectImage);
  } catch (error) {
    logger.error('Image processing failed:', error);
    
    // 빈 배열 반환하여 계속 진행
    return [];
  }
};
```

#### 4.2 플러그인에서 이미지 생성 실패 시 대체
```typescript
// figma-plugin/src/code.ts 개선
async function createImageNode(nodeData: FigmaNodeData): Promise<RectangleNode> {
  try {
    return await createImageNodeInternal(nodeData);
  } catch (error) {
    console.warn('Image node creation failed, using placeholder:', error);
    
    // 플레이스홀더 생성
    const rect = figma.createRectangle();
    const width = Math.max(nodeData.boundingBox.width, 50);
    const height = Math.max(nodeData.boundingBox.height, 50);
    
    rect.resize(width, height);
    rect.fills = [{
      type: 'SOLID',
      color: { r: 0.9, g: 0.9, b: 0.9, a: 1 }
    }];
    
    // 플레이스홀더 텍스트
    const text = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    text.characters = 'Image Placeholder';
    text.fontSize = 10;
    text.fills = [{
      type: 'SOLID',
      color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    }];
    
    text.x = width / 2 - text.width / 2;
    text.y = height / 2 - text.height / 2;
    rect.appendChild(text);
    
    return rect;
  }
}
```

## 구현 우선순위

### 즉시 적용 (1-2일)
1. 이미지 로딩 대기 로직 강화
2. 검은 프레임 방지 로직 추가
3. 플레이스홀더 이미지 생성

### 단기 목표 (1주)
1. 이미지 검증 및 보정 시스템
2. 에러 처리 강화
3. 로깅 개선

### 중기 목표 (2-3주)
1. 이미지 캐싱 시스템
2. 다양한 이미지 포맷 지원
3. 이미지 최적화

이렇게 적용하면 이미지 미수집과 검은 프레임 문제를 줄일 수 있습니다.