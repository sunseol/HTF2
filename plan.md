문서가 매우 길어질 수 있어 한 번에 잘릴 수 있습니다. 아래에 “단일 문서”로 최대치까지 작성합니다. 이어서가 필요하면 “계속”이라고 하시면 즉시 이어서 붙여드립니다.

픽셀 퍼펙트 HTML → Figma 변환 시스템: 단일 설계·구현 문서
목표: 사용자가 HTML을 업로드하면 1920x1080 실제 브라우저 렌더링 결과를 기반으로 모든 시각 속성/레이아웃/자산을 수집하고, Figma 네이티브 요소(Frame/Text/Vector/Image)로 정확히 재현한다. AI는 품질 검증과 보정에 사용하며, 규칙 기반 파이프라인은 폴백으로만 동작한다.
핵심 원칙


실제 렌더링 기준: HTML 소스가 아니라 렌더링된 DOM/CSSOM 결과


완전 매핑: CSS → Figma 속성 커버리지 극대화, 누락 시 명시적 폴백


AI 우선 반영: Vision 응답이 오면 반드시 반영, 실패 시에만 룰 기반


추적 가능 로그: API 요청/응답/매핑/생성/검증 전체 경로 로그화



시스템 개요


구성


Capture Engine: Playwright(Chromium)로 1920x1080 렌더링 + 수집


Conversion Engine: CSS→Figma 매핑, 레이아웃 변환, 효과/자산/텍스트 처리


Generation Engine: Figma 네이티브 생성, 스타일/컴포넌트 등록


QA Engine: 스크린샷 비교, AI 품질검증, 개선 루프


Services: Express API, 파일 관리, 로깅, 세션 관리


데이터 플로우


HTML 업로드/텍스트 → 1920x1080 렌더 → 수집(JSON+스크린샷) → 매핑(JSON) → Figma 생성 → 품질검증(AI/비교) → 로그/리포트



프로젝트 구조


html-to-figma/
src/


renderers/


html-renderer.ts


converters/


css-to-figma-mapper.ts


layout-converter.ts


effect-converter.ts


typography-converter.ts


generators/


figma-node-generator.ts


style-system-generator.ts


component-generator.ts


services/


html-processing-service.ts


quality-validator.ts


ai-enhancement-service.ts


utils/


logger.ts


file-manager.ts


error-handler.ts


types/


renderer.types.ts


converter.types.ts


figma.types.ts


uploads/


screenshots/


assets/


logs/


temp/


package.json


README.md



환경 설정


package.json (요지)
dependencies: playwright, express, multer, winston, sharp, svgo, css-tree, cheerio, uuid


devDependencies: typescript, ts-node, nodemon



Capture Engine (1920x1080 렌더링 + 수집)


4.1 렌더러 주요 동작
Chromium headless 초기화 → viewport 1920x1080, deviceScaleFactor 1


file:// 경로로 HTML 로드, networkidle 대기


이미지/폰트 로드 대기, 애니메이션 settle


fullPage 스크린샷 저장


evaluate()로 DOM 전체 순회:


보이는 요소만 수집(rect > 0, display != none, visibility != hidden, opacity != 0)


boundingBox(x,y,width,height,top,left,right,bottom)


60개+ computed styles(레이아웃/Flex/Grid/박스모델/배경/테두리/텍스트/효과/변환/오버플로우 등)


자산: IMG(src/크기/alt), SVG(outerHTML/viewBox/size), background-image(url/size/position), gradient 값


메타: 페이지 타이틀/뷰포트/문서 크기/언어/메타태그/링크태그


계층/속성: parent/children, attributes


4.2 수집 결과 예시(요약)
elements: RenderedElement[]


pageInfo: viewport/documentSize/lang/charset/head


assets: images/svgs/backgrounds/fonts


screenshotPath



Conversion Engine (CSS→Figma 매핑)


5.1 매핑 기본 원칙
색/배경: SOLID/GRADIENT/Image Paint


테두리: strokes + strokeWeight + strokeAlign


모서리: cornerRadius/per-corner radii


효과: Effects(DROP_SHADOW/INNER_SHADOW/LAYER_BLUR/BACKGROUND_BLUR)


레이아웃: display:flex/grid → Auto Layout/constraints; gap→itemSpacing; padding 매핑


텍스트: fontFamily/fontSize/weight/lineHeight/letterSpacing/color/textAlign


변환: rotation/scale는 지원, skew/3D는 폴백 이미지


마스크/클리핑: clip-path/overflow hidden → mask/frame clip 근사


누락/불가: [TO_FIX] prefix, fallback 레이어/이미지 생성


5.2 주요 파서(예)
parseColorToFigmaPaint: rgb/rgba → SOLID, opacity 반영


parseLinearGradientToFigma: CSS linear-gradient → gradientStops/gradientTransform


parseBackgroundImgToFigma: url() → createImage paint(FILL/FIT/CROP/TILE)


parseBoxShadowToFigmaEffects: CSS box-shadow → Effect[]


parseFilter/BackdropFilter: blur/brightness 등 근사 적용


parseBorderToFigmaStrokes: border-width/color/style → strokes[]


parseBorderRadius: px→number 또는 per-corner 배열


layout-converter: flex/grid→AutoLayout; absolute→layoutPositioning/constraints


typography: fontFamily fallback 테이블, loadFont 전략, range 스타일(필요시)


5.3 매핑 결과 구조(FigmaNodeData)
type: FRAME | TEXT | VECTOR | IMAGE


boundingBox: x,y,width,height


fills, strokes, cornerRadius, effects


layoutMode, itemSpacing, paddingTop/Right/Bottom/Left


text: textContent, fontFamily, fontSize, weight, lineHeight, letterSpacing, color, align


assets: images/backgrounds/svgs


meta: htmlTag/classes/attrs


parentId/childrenIds



Generation Engine (Figma 네이티브 생성)


6.1 생성 원칙
FrameNode/TextNode/VectorNode/ImageNode로 정확 생성


Auto Layout/constraints/효과/페인트 속성 그대로 반영


컴포넌트화: 반복 패턴 감지 → Component+Variant로 등록


스타일 시스템: Local Colors/Text Styles/Effects 자동 등록


6.2 예시 생성 코드(요지)
type별 figma.createFrame/createText/createVector


node.x/y/resize


frame.layoutMode/itemSpacing/padding


node.fills/strokes/cornerRadius/effects


text.characters/fontName/fontSize/fills/lineHeight


image: figma.createImage(hash). then set fills with ImagePaint


6.3 폴백/에러 처리
미지원 효과: [TO_FIX] prefix 레이어, 붉은 반투명 fill, 설명 텍스트 child 추가


에러 throw 시 safe wrapper로 fallback 노드 생성


생성 실패/누락 속성은 로그에 상세 기록



QA Engine (품질 검증/개선)


7.1 스크린샷 비교
Figma 결과 스크린샷 ↔ 원본 렌더 스크린샷


픽셀 차/SSIM/영역별 오차/색상 분포 비교


점수화(0~1 또는 0~100)


7.2 AI 비전 개선(선택)
두 스크린샷 + 일부 매핑 결과를 Vision 모델에 전달


“차이점/누락/우선 개선 3가지/구체 수정” 리포트 수신


자동 수정 룰 적용(or 수동 확인 모드)


7.3 지속 개선 루프
세션별 메트릭 수집: success rate, average accuracy, fallback count, common errors


정기 리포트로 매핑 파서/생성/성능 튜닝



Express API (요약)


POST /render-html-file: multipart/form-data, htmlFile


응답: elements/pageInfo/assets/screenshot/stats


POST /render-html-text: JSON(htmlContent, filename?, options?)


GET /session/:id: 스크린샷/로그 존재 여부 확인


GET /health, GET /info



로깅/에러/파일 관리


winston로 combined/error 로그, 세션ID로 분류


각 단계(렌더/수집/매핑/생성/검증) 이벤트 기록


업로드/스크린샷/temp 파일 자동 정리(스케줄)



실행/테스트


서비스 시작: node/ts-node로 html-processing-service.ts main


curl 예시:


파일 업로드: curl -F "htmlFile=@test.html" http://localhost:4000/render-html-file


텍스트 업로드: curl -H "Content-Type: application/json" -d '{"htmlContent":"<html>...</html>"}' http://localhost:4000/render-html-text


응답 JSON: elementCount, pageInfo, assets, screenshot url, processingTime 등 확인



실패/이슈 대응


Vision 응답 미도착: timeout/에러를 명시 로그, fallback 분기 기록, 재시도 정책


매핑 누락: fills/effects/strokes undefined 방지, 폴백 paint/effect 부여


폰트 문제: 대체 폰트 테이블, letter-spacing/line-height 보정


성능: chunking, evaluate 최소화, 이미지 중복 hash, 병렬 처리 주의


보안/권한: file://만 처리 or sandbox 격리, 라이선스/저작권 명시



개발 우선순위/체크리스트


P0: 실제 렌더링 수집(1920x1080), CSS→Figma 매핑 커버리지, 네이티브 생성


P1: 스크린샷 비교/점수화, 로깅/세션 관리/에러 폴백


P2: 컴포넌트/Variant, 스타일 시스템 자동화


P3: AI Vision 개선 루프, 접근성/토큰 추출



샘플 스펙 매핑 표(발췌)


backgroundColor → fills(SOLID) + opacity


backgroundImage: linear-gradient → GRADIENT_LINEAR; url() → ImagePaint


border → strokes + strokeWeight + strokeAlign(INSIDE/OUTSIDE/CENTER 근사)


borderRadius → cornerRadius or per-corner


boxShadow → Effect(DROP/INNER), color/offset/radius/spread


filter: blur → LAYER_BLUR; brightness/contrast → 근사(폴백)


display:flex → layoutMode(HORIZONTAL/VERTICAL), gap→itemSpacing, padding→padding*


position:absolute → layoutPositioning=“ABSOLUTE” + constraints


fontFamily/size/weight/lineHeight/letterSpacing/color → Text props


clip-path/overflow → mask/frame clip(근사)



완료 정의(DoD)


임의의 HTML 파일 입력 시:


1920x1080 렌더 → 요소/자산/스타일 90%+ 수집


Figma 네이티브로 자동 생성, Auto Layout/효과/모서리 반영


시각 정확도(스크린샷 비교) 0.90+ (초기 목표)


실패/폴백/누락 로그가 모두 남고 재현 가능


문서/엔드포인트/예시로 재사용 가능



여기까지가 단일 문서의 전체본입니다.
필요 시 각 Stage의 코드 파일을 실제 프로젝트에 맞춰 세분화해 드리거나,


“CSS→Figma 파서”와 “Figma 생성기”를 완전 동작 가능한 코드 수준으로 더 길게 확장해 드릴 수 있습니다.


“계속”이라고 주시면 바로 이어서 “세부 코드 구현(파서/생성기/품질검증/A/B/에러 폴백)”을 붙여 드립니다.

