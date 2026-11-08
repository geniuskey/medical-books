# AnatomyBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `sims.html`(시뮬레이터 갤러리) + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`(전역 `BB`), `js/atlas.js`(해부 데이터 도구, 전역 `AT`), `js/atlas-data.js`(구조별 수치와 몸 지도), `js/sections-data.js`(단면), `js/anatomy3d.js`(3D 뷰어).
로컬 실행: 서가 저장소 루트에서 `python3 -m http.server 8000` → http://localhost:8000/anatomy/ (3D 모델은 웹 서버로 열어야 보인다. classic script만 쓴다. ES module 금지.)

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 3D 모델과 해부 데이터는 BodyParts3D(© DBCLS, CC BY 4.0)에서 만들었으므로 원저작자 표시를 유지한다. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 이 책이 무엇인가
같은 서가의 [BodyBook](../body/)이 **몸이 어떻게 돌아가는지**(생리학)를 다룬다면, 이 책은 **몸 안에 무엇이 어디에 어떤 모양으로 있는지**(해부학)를 다룬다. 뼈대, 팔다리, 관절, 몸통 근육, 가슴·배·골반의 장기, 뇌와 눈, 혈관, 단면 해부, 그리고 해부 데이터로 하는 계산.

이 책의 무기는 **BodyParts3D**다. 일본 라이프사이언스 통합 데이터베이스 센터(DBCLS)가 한 성인 남성의 몸을 3D로 만들고, 조각마다 해부학 용어 체계(FMA, Foundational Model of Anatomy)의 이름을 붙인 데이터베이스다. 해부학 용어가 구체적인 모양과 좌표를 가진 **계산 가능한 데이터**가 된다. 그래서 이 책은 그림을 보여 주는 데서 그치지 않고, 독자가 직접 **돌리고(3D), 자르고(단면), 잰다(부피·거리·높이)**.

대상은 해부학을 처음 보는 성인(대학생, 간호·보건·체육 계열 입문자, 운동하는 사람, 고등학생도 읽을 수 있게). 교과서의 대표 본보기는 Moore *Clinically Oriented Anatomy*, Gray's *Anatomy for Students*, Netter *Atlas of Human Anatomy*, Tortora *Principles of Anatomy and Physiology*, OpenStax *Anatomy and Physiology*. 만져 보며 배우는 방식의 본보기는 Bartosz Ciechanowski의 글.

## 최우선 원칙
### 1. 위치와 모양은 3D 모델로, 크기와 관계는 데이터로
- **장마다 3D 모델 2~4개 + 캔버스 시뮬레이터 4~7개.** 3D 모델은 아래 "3D 모델 목록"에서 고른다(새 모델이 필요하면 만들지 말고 보고한다). 같은 모델을 다른 장에서 다른 질문으로 다시 써도 된다(부위 버튼과 시점을 바꿔서).
- 캔버스 시뮬레이터는 **`AT`(해부 데이터)로 그린다.** 몸 지도(`AT.drawMap`), 단면(`AT.drawSection`), 부피·거리·높이 비교(`AT.part`, `AT.dist`, `AT.size`), 좌표 위의 점. 해부 구조를 손으로 그리지 않는다. 데이터에 없는 개념(관절 각도, 지렛대, 근육 이름 짓기 규칙, 방향 용어 퀴즈 등)은 캔버스에 단순한 도형으로 직접 그려도 된다.
- 각 `.sim`에는 `id`와 `data-desc="갤러리 카드에 들어갈 한 문장"`이 반드시 있다. 장 끝의 큰 종합 시뮬레이터에는 `data-big`.
- 한 시뮬레이터는 **한 가지 질문**에 답한다. "이 뼈는 저 뼈보다 얼마나 큰가", "배꼽 높이를 자르면 무엇이 보이나", "심장은 몸의 한가운데에 있나". 컨트롤은 1~4개. **캔버스를 직접 누르고 끄는** 시뮬레이터를 슬라이더만 있는 것보다 우선한다. 끌 수 있는 것에는 손잡이(테두리 있는 원)를 그린다.
- **모든 시뮬레이터는 혼자서 이해되어야 한다.** 캔버스 안에 축 이름·단위·범례·핵심 숫자와 방향 표시(`AT.orient`, R/L/A/P/S/I)를 직접 그린다. `.sim-note`는 "해볼 것: ① … ② … ③ …"과 데이터의 한계를 담는다.
- 결과는 숫자(`.sim-readout`)로도 보여 준다.

### 2. 숫자를 지어내지 않는다
- **이 모델의 값**(부피, 길이, 거리, 높이, 단면 넓이)은 반드시 `AT`로 계산해 쓴다. 글 속 숫자도 node로 계산해 확인한 값만 쓴다(아래 "점검"). 쓸 때는 "이 데이터의 모델에서"라고 밝힌다.
- **교과서의 일반값**(뼈 206개, 척추뼈 33개 안팎, 관절 가동 범위, 장기 무게 등)은 "약", "~"을 붙이고 흔히 실리는 대표값을 쓴다. 모델값과 교과서값이 다르면 **그 차이가 배울 점**이다(사람마다 다르다, 데이터에 빠진 부분이 있다, 메시가 닫혀 있지 않다).
- 데이터의 한계를 숨기지 않는다. BodyParts3D에는 **폐 실질, 갑상선, 말초신경(척수신경·팔신경얼기·궁둥신경 등), 배곧은근·배속빗근·배가로근·넓은등근, 얼굴 표정근, 꼬리뼈, 구불창자, 막창자, 간의 바깥 모양 일부, 인대와 반달연골 대부분, 여성 생식기관**이 없다. 갈비사이근은 한쪽만 있다. 목 부분의 속목동맥·바깥목동맥이 비어 있다. 이런 구조를 다룰 때는 OpenStax 그림 대신 글과 단순 도식으로 설명하고 "이 데이터에는 없다"고 쓴다.
- 단면의 "폐"는 실제 폐가 아니라 **좌우 기관지 나무의 볼록 껍질로 어림**한 것이다(단면 범례에 그렇게 쓴다). 단면의 "몸"은 피부 안쪽 전체(피하 지방 등 데이터에 따로 없는 조직)다.

### 3. 용어
- **한국어 우리말 해부학 용어**(대한해부학회 용어)를 주로 쓰고, 처음 나올 때 한자어와 영어를 붙인다: `<span class="term">넙다리뼈</span><span class="en">(대퇴골, Femur)</span>`. 이후에는 우리말만. 임상에서 한자어가 훨씬 흔한 것(척추, 심장, 간 등)은 그것을 쓴다.
- 방향 용어: 위쪽(상, superior)·아래쪽(하, inferior), 앞쪽(전, anterior)·뒤쪽(후, posterior), 안쪽(내측, medial)·가쪽(외측, lateral), 몸쪽(근위, proximal)·먼쪽(원위, distal), 얕은(천층, superficial)·깊은(심층, deep). 면: 가로면(수평면, transverse/axial), 관상면(이마면, coronal/frontal), 시상면(sagittal), 정중시상면(midsagittal).
- **좌우는 늘 그 사람(모델)의 좌우**다. 앞에서 본 그림과 CT 가로면에서는 몸의 오른쪽이 화면 왼쪽에 온다. 장마다 한 번은 짚어 준다.

## 글쓰기 원칙
- **한국어**. 문체는 평서문 "~다". 이모지 금지. 다른 장은 `<a href="axial.html">3장</a>`처럼 링크한다. BodyBook의 관련 장은 `<a href="../../body/chapters/heart.html">BodyBook 4장</a>`처럼 링크해도 된다(생리는 거기에 맡기고 이 책은 구조에 집중).
- **사람을 가리킬 때 성별 대명사(그, 그녀)를 쓰지 않는다.**
- 순서: 일상의 질문 → 3D 모델로 위치 잡기 → 시뮬레이터로 재고 비교하기 → 원리·구조의 이유 → 데이터로 확인하기 → 핵심 정리 → 퀴즈.
- 글은 짧게. 시뮬레이터 바로 앞에서 "무엇을 해 볼지", 바로 뒤에서 "무엇을 봤는지"를 2~4문장으로. 한 절(section)에 문단 3~6개.
- 이름을 외우게 하지 말고 **이유**를 말한다. 왜 넙다리뼈는 비스듬한가(무릎을 몸 중심선 아래로 모으려고), 왜 척주는 S자인가, 왜 오른쪽 콩팥이 더 낮은가(간이 위에 있어서), 왜 왼쪽 되돌이후두신경이 더 긴가.
- 이름의 뜻을 풀어 준다(라틴어·그리스어 어원, 우리말 이름의 뜻): "넙다리 = 넓적다리", "sternocleidomastoid = 복장뼈(sterno)·빗장뼈(cleido)·꼭지돌기(mastoid)에 붙는 근육".
- 수식은 꼭 필요한 것만(장마다 0~3개): 부피 쌓기(카발리에리), 지렛대, 거리. 기호마다 단위와 대표값을 붙인다.
- **의학적 조언을 하지 않는다.** 질환(골절, 디스크, 탈장 등)은 구조를 설명하는 예로만 다루고, 질환을 다루는 장에는 `.health-note`를 한 번 넣는다.
- 특정 상품·브랜드·회사 이름을 쓰지 않는다.
- **공통 파일(`js/*.js`, `css/style.css`)은 고치지 않는다.** 장 전용 스타일은 그 장 `<head>`의 `<style>`에, 장 전용 함수는 그 장 인라인 스크립트에. `AT`의 버그나 부족한 기능을 발견하면 장 안에서 우회하고, 보고한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py <slug>`를 실행한다(인자 없이 실행하면 전체 장 + 사이트맵 + `index.html`의 JSON-LD를 갱신한다). 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽는다. `js/atlas-data.js`와 `js/atlas.js`는 항상 함께 불러온다. 단면을 그리는 장은 `"libs": ["sections"]`를 넣는다(`js/sections-data.js`, 약 1.3 MB). 3D 모델 블록이 있으면 `js/anatomy3d.js`를 자동으로 불러온다.
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and AnatomyBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<!--head:start {"desc": "한 문장 설명(검색 결과에 보일 120자 안팎)", "libs": ["sections"]}-->
<!--head:end-->
<style> /* 이 장 전용 */ </style>
</head>
```

## 페이지 골격
```html
<body data-chapter="slug">
<main class="chapter">
  <header class="chapter-hero">
    <div class="eyebrow">Chapter NN</div><h1>제목</h1><p class="lead">…</p>
    <ul class="objectives"><li>…</li></ul>
  </header>
  <section id="영문-id"><h2>절 제목</h2> … </section>
  <section class="keypoints" id="summary"><h2>핵심 정리</h2><ol><li>…</li></ol></section>
  <section class="quiz-sec" id="quiz"><h2>확인 퀴즈</h2><div class="quiz"> … </div></section>
</main>
<script>(function () { "use strict"; /* 시뮬레이터 */ })();</script>
</body>
```
상단바·검색·챕터 목록·갈래 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더·"시뮬레이터만" 모드·시뮬레이터 바로가기(#) 링크는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.
"시뮬레이터만" 모드에서는 `section` 바로 아래의 `h2`, `.sim`, `.sim-group`만 보인다. 시뮬레이터를 `figure`나 다른 `div`로 감싸지 않는다(숨겨진다).

## 컴포넌트
- 3D 해부 모델:
```html
<div class="sim model3d" id="sim-xx-3d" data-model="skeleton" data-orbit="0deg 80deg auto" data-desc="갤러리 카드용 한 문장">
  <div class="sim-head"><span class="sim-tag three">3D MODEL</span><h3>제목</h3></div>
  <div class="sim-body">
    <div class="sim-view model3d-view"><span class="hint">끌어서 돌리고, 휠·두 손가락으로 확대한다</span></div>
  </div>
  <div class="model3d-parts"><button type="button" data-part="skull" title="한 줄 설명">머리뼈</button>…<span class="sep"></span><button type="button" data-rotate>자동 회전</button><button type="button" data-fade="a,b">… 반투명</button><button type="button" data-reset>처음 시점</button></div>
  <div class="info-panel">모델을 누르면 그 부위의 이름이 여기에 나온다.</div>
  <div class="sim-note">해볼 것: ① … ② … ③ … <span class="sim-credit">3D 모델: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D</a>, © The Database Center for Life Science, <a href="https://creativecommons.org/licenses/by/4.0/deed.ko">CC BY 4.0</a>. 부위별로 색을 입히고 면 수를 줄였다. 뷰어: model-viewer(Apache-2.0).</span></div>
</div>
```
  `data-part`는 아래 목록의 그룹 key다. 모델의 모든 그룹을 버튼으로 넣지 않아도 되지만, 넣지 않은 그룹은 끌 수 없다. `data-orbit`은 "좌우각 위아래각 거리": `0deg 80deg auto`가 정면, `90deg`는 몸의 왼쪽에서 본 옆모습, `180deg`는 뒤, `-90deg`는 오른쪽 옆모습. `data-rotate`를 `.sim`에 달면 처음부터 돈다.
- 캔버스 시뮬레이터:
```html
<div class="sim" id="sim-x" data-desc="갤러리 카드용 한 문장: 무엇을 바꾸면 무엇이 보이는가">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목(질문형도 좋다)</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv" class="drag"></canvas></div>
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <label class="ctrl"><span>선택</span><select id="x-s"><option value="a">A</option></select></label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="info-panel" id="x-info">누른 구조의 설명</div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (데이터의 출처와 한계)</div>
</div>
```
  끄는 캔버스에는 `class="drag"`를 단다(점검기가 끌어 본다). 컨트롤이 없거나 캔버스를 직접 누르는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">눌러서 고른다</span>`를 둔다. 범례는 `<div class="map-legend"><span><i style="background:#e6d6ad"></i>뼈</span></div>`(`.sim-body` 다음).
  단면이나 몸 지도를 그리는 시뮬레이터의 `.sim-note` 끝에는 `<span class="sim-credit">데이터: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/">BodyParts3D</a>, © The Database Center for Life Science, <a href="https://creativecommons.org/licenses/by/4.0/deed.ko">CC BY 4.0</a>에서 계산.</span>`을 붙인다.
- 그림: `<figure class="diagram"><svg viewBox="0 0 480 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG viewBox 폭은 420~520. SVG 안에서는 `.lbl .lbl-dim .lbl-b .lbl-acc .lbl-acc2 .lbl-bad .t-mono .s-line .s-axis .s-acc .s-acc2 .s-dash .s-bad .s-ok .f-surface .f-elev .f-acc .f-acc2 .f-acc-soft .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft .f-bad .f-ok .f-warn`와 `.f-art .f-ven .s-art .s-ven .f-art-soft .f-ven-soft .f-organ .f-nerve .s-nerve` 클래스를 쓴다(다크 모드 대응). 색을 직접 적지 않는다. 화살표 머리는 `<marker>`에 `fill="context-stroke"`. 해부 구조 그림은 SVG로 그리지 말고 3D 모델·몸 지도·단면을 쓴다. SVG는 개념도(방향 화살표, 관절 종류 모식도, 분류표)에만.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 건강 안내: `<p class="health-note">이 장의 모델과 수치는 한 사람의 몸을 측정한 공개 데이터에서 나온 교육용 자료입니다. 통증이나 증상이 있으면 의료진과 상담하세요.</p>`
- 숫자 상자: `<div class="numbers"><div><b>206개</b><span>성인의 뼈</span></div>…</div>`. 모델에서 계산한 값은 스크립트로 채워도 된다(`id`를 주고 `textContent`).
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 4~5문항, 정답 위치를 섞는다. 위치 문제와 데이터 읽기 문제를 1~2개 넣는다).
- **데이터로 확인하기**(각 장 끝, 핵심 정리 앞에 하나): 이 장의 질문 하나를 모델 데이터로 계산해 보여 준다.
```html
<div class="casefile">
  <div class="tag"><b>DATA</b><span>데이터로 확인하기 · 5장</span></div>
  <h4>넙다리뼈는 키의 약 25 %, 부피는 약 500 mL</h4>
  <p>…이 장의 방법을 모델 데이터에 적용한 결과(숫자는 AT로 계산해 스크립트로 채우거나 node로 확인한 값)…</p>
  <div class="clue"><div><b>데이터가 보여 준 것</b>…</div><div><b>데이터의 한계</b>…</div><div><b>다음 장에서</b>…</div></div>
</div>
```

## 3D 모델 목록 (`assets/3d/*.glb`, 생성: `tools/bp3d_models.py`)
짝이 있는 구조 가운데 "오른쪽"이라고 쓴 모델은 몸의 오른쪽만 들어 있다. (반) = 처음부터 반투명.

| 모델 | 그룹 key → 이름(권장 버튼 이름) |
|---|---|
| `systems` | brain 뇌, organs 장기(심장·기관지·위·창자·콩팥·방광·지라·이자), liver 간, arteries 동맥, skeleton 뼈대, muscles 근육, skin 피부(반) |
| `skeleton` | skull 머리뼈(아래턱·목뿔뼈 포함), discs 척추원반, spine 척주(엉치뼈 포함), thorax 가슴우리(갈비뼈·갈비연골·복장뼈), shoulder 어깨이음뼈(빗장뼈·어깨뼈), arm 팔뼈(위팔뼈·노뼈·자뼈), hand 손뼈, pelvis 볼기뼈, leg 다리뼈(넙다리뼈·무릎뼈·정강뼈·종아리뼈), foot 발뼈, skin 피부(반) |
| `skull` | frontal 이마뼈, parietal 마루뼈, temporal 관자뼈, occipital 뒤통수뼈, sphenoid 나비뼈, ethmoid 벌집뼈, zygomatic 광대뼈, maxilla 위턱뼈, facial 코뼈·눈물뼈·입천장뼈·보습뼈·아래코선반, mandible 아래턱뼈, teeth 치아(28개), hyoid 목뿔뼈 |
| `spine` | discs 척추원반, cervical 목뼈(7), thoracic 등뼈(12), lumbar 허리뼈(5), sacrum 엉치뼈, spinalcord 척수(원본은 중심관 모양), ribs 갈비뼈(반), pelvis 볼기뼈(반), skull 머리뼈(반) |
| `ribcage` | floating 뜬갈비뼈(11·12), falserib 거짓갈비뼈(8~10), truerib 참갈비뼈(1~7), costal 갈비연골, sternum 복장뼈, tspine 등뼈, girdle 빗장뼈·어깨뼈(반), diaphragm 횡격막(반) |
| `upperlimb`(오른쪽) | deltoid 어깨세모근, cuff 돌림근띠(가시위근·가시아래근·작은원근·어깨밑근), pectoral 가슴근(큰가슴근·작은가슴근·빗장밑근), armflex 위팔 앞 굽힘근(위팔두갈래근·위팔근·부리위팔근), armext 위팔 뒤 폄근(위팔세갈래근·팔꿈치근), forearmflex 아래팔 굽힘근, forearmext 아래팔 폄근(위팔노근·뒤침근 포함), handm 손의 근육, back 등·어깨 근육(반: 등세모근·마름근·어깨올림근·앞톱니근·큰원근), bones 팔의 뼈 |
| `lowerlimb`(오른쪽) | glutes 볼기근(큰·중간·작은), deepglute 깊은 볼기 근육(궁둥구멍근·쌍둥이근·폐쇄근·넙다리네모근), iliopsoas 엉덩허리근, quads 넙다리네갈래근, hamstrings 뒤넙다리근, adductors 모음근(두덩정강근·두덩근 포함), sartorius 넙다리빗근·넙다리근막긴장근·엉덩정강띠, calf 종아리 뒤 얕은 근육(장딴지근·가자미근·장딴지빗근·아킬레스힘줄), deepcalf 종아리 뒤 깊은 근육(뒤정강근·긴발가락굽힘근·긴엄지굽힘근·오금근), shin 정강이 앞 근육(앞정강근·긴발가락폄근·긴엄지폄근·셋째종아리근), fibular 종아리 가쪽 근육(긴·짧은종아리근), footm 발의 근육, bones 다리의 뼈 |
| `hand`(오른쪽) | scaphoid 손배뼈, lunate 반달뼈, triquetral 세모뼈, pisiform 콩알뼈, trapezium 큰마름뼈, trapezoid 작은마름뼈, capitate 알머리뼈, hamate 갈고리뼈, metacarpals 손허리뼈, proximal 첫마디뼈, middle 중간마디뼈, distal 끝마디뼈, forearm 노뼈·자뼈 끝(반) |
| `foot`(오른쪽) | talus 목말뼈, calcaneus 발꿈치뼈, navicular 발배뼈, cuboid 입방뼈, cuneiforms 쐐기뼈(3), metatarsals 발허리뼈, phalanges 발가락뼈(종자뼈 포함), tendon 아킬레스힘줄·긴발바닥인대, leg 정강뼈·종아리뼈 끝(반) |
| `shoulder`(오른쪽) | supraspinatus 가시위근, infraspinatus 가시아래근, teresminor 작은원근, subscapularis 어깨밑근, deltoid 어깨세모근(반), biceps 위팔두갈래근 위쪽, scapula 어깨뼈, clavicle 빗장뼈, humerus 위팔뼈 위쪽 |
| `knee`(오른쪽) | quads 넙다리네갈래근(반), hamstrings 뒤넙다리근(반), gastroc 장딴지근(반), popliteus 오금근, femur 넙다리뼈 아래쪽, patella 무릎뼈, tibia 정강뼈 위쪽, fibula 종아리뼈 위쪽 |
| `trunkmuscles` | erector 척주세움근, deepback 깊은 등근육(가로돌기가시근 무리 등), trapezius 등세모근, rhomboid 마름근·어깨올림근·위아래뒤톱니근, splenius 널판근·뒤통수밑근·목긴근, chest 가슴근·앞톱니근, abdominal 배바깥빗근·백색선(반), intercostal 갈비사이근(한쪽만), neck 목빗근·목갈비근, hyoidm 목뿔위·아래근·넓은목근, diaphragm 횡격막, skeleton 몸통뼈대(반) |
| `larynx` | thyroidc 방패연골, cricoid 반지연골, arytenoid 모뿔연골(잔뿔·쐐기연골 포함), epiglottis 후두덮개, hyoid 목뿔뼈, vocal 성대인대·탄력원뿔, membranes 방패목뿔막·인대(반), muscles 후두 근육, trachea 기관 위쪽 |
| `thorax` | heart 심장, aorta 대동맥과 큰 가지, pulmart 폐동맥, pulmvein 폐정맥, venacava 대정맥·팔머리정맥·홀정맥, airway 기관·기관지 나무, esophagus 식도, thymus 가슴샘, diaphragm 횡격막(반), ribs 가슴우리(반), spine 등뼈(반) |
| `abdomen` | liver 간, gallbladder 쓸개·쓸개관, stomach 위, spleen 지라, pancreas 이자, duodenum 샘창자, appendix 막창자꼬리, rectum 곧창자, smallint 작은창자, largeint 큰창자, kidneys 콩팥, adrenal 부신, ureters 요관, bladder 방광, aorta 배대동맥과 가지, ivc 아래대정맥, portal 문맥·지라정맥·위창자간막정맥, diaphragm 횡격막(반), skeleton 허리뼈·골반·아래 갈비뼈(반) |
| `pelvis`(남성) | bladder 방광, prostate 전립샘, seminal 정낭·정관, testis 고환·부고환, penis 음경, urethra 요도, rectum 곧창자, floor 골반바닥 근육(항문올림근 무리·꼬리근·바깥항문조임근), ureters 요관, vessels 엉덩동맥·정맥, bones 골반뼈(반) |
| `brain` | frontal 이마엽 이랑, motor 중심앞이랑(일차 운동겉질), sensory 중심뒤이랑(일차 체성감각겉질), parietal 마루엽, temporal 관자엽, occipital 뒤통수엽, limbic 띠이랑·섬엽, cerebellum 소뇌, brainstem 뇌줄기(중간뇌·다리뇌·숨뇌), nerves 시각신경·시각교차·눈 신경들, white 대뇌 백질 |
| `braindeep` | ventricles 뇌실, thalamus 시상(무릎체 포함), hypothalamus 시상하부·유두체·뇌하수체, caudate 꼬리핵, lentiform 렌즈핵(조가비핵·창백핵), hippocampus 해마·편도체, callosum 뇌들보·뇌활, capsule 속섬유막, brainstem 뇌줄기, cerebellum 소뇌(반), cortex 대뇌겉질(반) |
| `eye`(오른쪽) | cornea 각막(반), sclera 공막, iris 홍채·섬모체·맥락막, lens 수정체, vitreous 유리체·눈방(반), retina 망막, recti 곧은근 4개, obliques 빗근 2개, levator 눈꺼풀올림근·눈꺼풀판, opticnerve 시각신경, lacrimal 눈물샘·눈물길 |
| `arteries` | aorta 대동맥, coronary 관상동맥, headneck 머리·목·뇌의 동맥, upperlimb 팔의 동맥, visceral 내장 동맥(복강·창자간막·콩팥 등), lowerlimb 다리의 동맥, trunkwall 몸통벽 동맥(갈비사이·허리·배벽), other 그 밖의 동맥, heart 심장(반), skin 피부(반) |
| `veins` | cava 대정맥·팔머리정맥·홀정맥, headneck 목정맥, superficialup 팔의 얕은 정맥(노쪽피부·자쪽피부·팔오금중간정맥), deepup 팔의 깊은 정맥, superficiallow 다리의 얕은 정맥(큰·작은두렁정맥), deeplow 다리·골반의 깊은 정맥, portal 문맥계, other 그 밖의 정맥, heart 심장(반), skin 피부(반) |

## 해부 데이터 도구 (`AT`, `js/atlas.js`)
좌표는 BodyParts3D 원본 그대로: mm, x −오른쪽/+왼쪽, y −앞/+뒤, z 위(발바닥 근처 약 −78, 정수리 약 1,641). 몸의 키는 `AT.body.height`(약 1,719 mm).

### 구조와 계산
- `AT.parts` 구조 목록, `AT.part(k)` → `{k, ko, en, sys, n(요소 수), vol(mL), area(cm²), watertight, c:[x,y,z](무게중심), lo, hi(경계 상자)}`. 짝이 있는 뼈·근육은 **오른쪽**. `watertight: false`인 구조(간, 심장 벽, 큰창자 등)의 부피는 메시가 닫혀 있지 않아 어림값이다. `brain`의 경계 상자는 시각신경까지 포함해 앞뒤 길이가 실제보다 길다.
- 구조 key:
  - 뼈: `skull frontal parietal temporal occipital sphenoid mandible hyoid c1…c7 t1…t12 l1…l5 sacrum rib1…rib12 sternum clavicle scapula humerus radius ulna scaphoid lunate triquetral pisiform trapezium trapezoid capitate hamate metacarpals fingers hipbone femur patella tibia fibula talus calcaneus navicular cuboid cuneiforms metatarsals toes teeth disc_l4`
  - 근육: `deltoid pecmajor biceps triceps brachialis brachioradialis supraspinatus infraspinatus subscapularis trapezius serratus scm diaphragm extoblique psoas iliacus gmax gmed rectusfem vastlat vastmed vastint bicepsfem semitend semimem addmagnus sartorius gracilis gastroc soleus tibant erector`
  - 신경·장기·혈관: `brain cerebellum brainstem thalamus hippocampus ventricles pituitary eyeball lens heart lv trachea esophagus thymus liver gallbladder stomach spleen pancreas duodenum smallint largeint appendix rectum kidney_r kidney_l adrenal_r bladder prostate testis tongue aorta ivc svc skin`
- `AT.bySys("bone"|"muscle"|"organ"|"nerve"|"vessel"|"skin")`. "bone"에는 `teeth`(치아)와 `disc_l4`(척추원반)도 들어 있으니 뼈만 셀 때는 빼고, `skull`은 여러 머리뼈 조각을 묶은 열린 메시라 개별 머리뼈(`frontal` 등)와 겹친다.
- `AT.body` → `{height(mm), vol(L, 피부를 2 mm마다 잘라 쌓은 몸의 부피), area(m², 옆면만 쌓은 겉넓이 근삿값), top, bottom}`. `AT.part("skin").vol·area`는 두께가 있는 피부 껍질(겉면+속면)의 값이라 몸의 부피·겉넓이가 아니다(13장의 좋은 예).
- `AT.dist(a, b)` 두 구조(무게중심) 또는 두 좌표 `[x,y,z]` 사이의 거리(mm). `AT.size(k)` → `[좌우, 앞뒤, 위아래]` 경계 상자 크기(mm). `AT.heightOf(k)` 발바닥에서 잰 무게중심 높이(mm).
- `AT.mass(k)` 밀도(뼈 1.9, 근육 1.06, 장기 1.05 g/mL)를 곱한 어림 무게(g). `AT.DENSITY`.
- `AT.relation(a, b, tol)` a에서 본 b의 방향 → `["위쪽(상)", "앞쪽(전)", "가쪽(외측)"]`.
- `AT.fmtVol(mL)`, `AT.fmtLen(mm)`.

### 몸 지도(앞·옆 윤곽)
- 지도 key(`AT.mapKeys(view)`, 이름 `AT.mapNames[k]`): `skin skull spine ribcage armbones_r armbones_l pelvis legbones_r legbones_l brain heart airway liver stomach spleen pancreas gallbladder kidneys smallint largeint bladder aorta thymus`. view는 `"front"`(앞모습, 몸의 오른쪽이 화면 왼쪽) 또는 `"side"`(몸의 왼쪽에서 본 옆모습, 앞이 화면 왼쪽).
- `T = AT.mapFit(box, view, {keys, margin, zRange:[z0, z1], pad})` 화면 변환(`keys` 구조들이 다 들어가게, 기본은 몸 전체. `zRange`로 높이 범위만 확대). `T.X(u)`, `T.Y(z)`, `T.s`(px/mm), `T.inv(px, py)` → `[u, z]`.
- `AT.drawMap(ctx, T, view, {layers, colors, alpha, highlight, stroke, skin})` 그리기. layers는 아래층부터. highlight(key 또는 배열)는 나머지를 흐리게.
- `AT.hitMap(T, view, px, py, layers)` 누른 자리의 지도 key(위층부터) 또는 null.
- `AT.mapPoint(T, view, k | [x,y,z])` 구조의 무게중심(또는 좌표)을 화면 좌표로.

### 단면
- `AT.PLANES` = `{axial: "가로면", coronal: "관상면", sagittal: "시상면"}`. 범위·간격: 가로면 z = −60…1,630(10 mm), 관상면 y = −240…40(10 mm), 시상면 x = −330…330(10 mm).
- 그룹 key: `body`(피부 안쪽 전체), `lung`(기관지 나무로 어림한 폐), `muscle`, `bone`, `disc`, `brain`, `ventricle`, `eye`, `cord`(원본에는 가는 중심관만 있어 둘레 4 mm를 더한 어림), `heart`(벽), `blood`(심장 안의 피), `artery`(큰 동맥), `vein`(큰 정맥), `airway`, `esophagus`, `liver`, `gallbladder`, `stomach`, `spleen`, `pancreas`, `kidney`, `adrenal`, `smallint`, `largeint`, `bladder`, `prostate`.
- `T = AT.sectionFit(box, plane, {ext, pad})` 화면 변환(기본 범위 `AT.SECTION_EXT[plane]`, 확대하려면 `ext: [u0, v0, u1, v1]`). 가로면은 발 쪽에서 올려다본 모습(몸의 오른쪽이 화면 왼쪽, 앞이 위), 관상면은 앞에서 본 모습, 시상면은 몸의 왼쪽에서 본 모습(앞이 화면 왼쪽).
- `AT.drawSection(ctx, T, plane, level, {mode: "ct"|"color", highlight, bg})` 단면 칠하기. `"ct"`는 어두운 바탕의 회색조(공기·폐 검정, 지방 어두운 회색, 근육·장기 회색, 조영 혈관 밝은 회색, 뼈 흰색). `"color"`는 구조별 색(`AT.COLORS`). 반환: 그 단면의 `[{k, ko, rings}]`.
- `AT.hitSection(T, plane, level, px, py)` → `{k, ko}` 또는 null. `AT.sectionAt(plane, level)`, `AT.sectionIndex`, `AT.sectionLevels(plane)`, `AT.sectionArea(plane, level, k)`(mm²).
- 단면을 그리는 장은 head에 `"libs": ["sections"]`.

### 작은 도구
- `AT.scaleBar(ctx, T, x, y, mm, color)` 축척 막대. `AT.orient(ctx, box, plane|"front"|"side", color)` 네 변의 방향 글자.
- `AT.COLORS`(구조 색), `AT.CT`(회색조 밝기), `AT.gray(v)`, `AT.inside(rings, u, v)`.

## JS 헬퍼 (`BB`, `js/common.js`)
BodyBook과 같다.
- `BB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight, height})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `BB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자(`"#id"`). 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤을 먼저 만든다. **draw 안에서 자기 반환값을 참조하지 않는다.** 좁은 화면에서 높이를 바꾸려면 `get height() { … }` getter.
- `BB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 누르기·끌기·호버(CSS px). 누르는 순간 start와 move가 한 번씩 불린다. draw에서 계산한 변환(`T`)을 바깥 변수에 저장해 hit-test 한다.
- `BB.tip(canvas)` → `{show(x, y, html), hide()}` 호버 정보 상자. `canvas.addEventListener("pointerleave", tip.hide)`.
- `BB.chart(ctx, box|null, {x, y, logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data, color, width, dash, fill}], vlines, hlines, points, bands})` → `{X, Y, box}`. `BB.bars(ctx, box|null, {labels, stacks:[{label, color, data}], y, yFmt, yLabel, gap, hlines, highlight, valueFmt})` → `{X(i), Y, box, bw}`. `BB.donut(ctx, cx, cy, R, items, {inner, center, labels, highlight})`.
- `BB.range(id, fmt, onInput)` → `get()`, `get.set(v)`(출력은 `id + "-out"`). `BB.seg(id, onChange)` → `get()`, `get.set(v)`. `BB.stat(id, html)`.
- `BB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션.
- `BB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `BB.color(name)`(CSS 변수), `BB.alpha(color, a)`, `BB.isDark()`, `BB.onTheme(cb)`.
- `BB.fmt(x, digits)`, `BB.pct(0.23)`, `BB.rrect`, `BB.wrapText(ctx, text, x, y, maxW, lineH, maxLines)`, `BB.font(px, mono, weight)`(고정폭은 숫자·영문에만), `BB.clamp/lerp/map`, `BB.debounce`, `BB.rng(seed)`.
- `BB.CHAPTERS`, `BB.STAGES`.

## 장별 범위 (겹치지 않게)
| 장 | slug | 다루는 것 | 쓸 모델(예) |
|---|---|---|---|
| 01 | language | 해부학적 자세, 방향 용어 쌍, 세 단면, 몸의 부위·공간(머리·목·몸통·팔다리, 체강), 좌표로 보는 해부학(이 책의 좌표계), 좌우 규칙 | systems, skeleton + 지도·단면 |
| 02 | skeleton | 뼈대 전체: 몸통뼈대 80 / 팔다리뼈대 126, 뼈의 모양 분류(긴·짧은·납작·불규칙·종자뼈), 뼈가 하는 일, 뼈의 부피·무게 비교, 뼈 개수가 사람·나이마다 다른 이유, 뼈의 비율(넙다리뼈와 키) | skeleton, hand, foot |
| 03 | axial | 머리뼈(뇌머리뼈 8·얼굴뼈 14, 봉합·숫구멍은 글로), 척주(목7·등12·허리5·엉치·꼬리, 굽이, 척추뼈 크기가 아래로 커지는 이유: 데이터로 c1~l5 부피 그래프), 척추원반, 가슴우리(참·거짓·뜬갈비뼈, 복장뼈, 숨 쉴 때의 움직임) | skull, spine, ribcage |
| 04 | upperlimb | 어깨이음뼈, 위팔·아래팔·손의 뼈(손목뼈 8개), 어깨·위팔·아래팔·손의 근육 무리와 하는 일, 돌림근띠, 팔오금·손목굴은 글로 | upperlimb, hand, shoulder |
| 05 | lowerlimb | 골반(볼기뼈 셋의 합쳐짐), 넙다리뼈의 각도, 무릎·종아리·발의 뼈, 발의 아치, 엉덩이·넙다리·종아리 근육 무리, 걷기에 쓰는 근육 | lowerlimb, foot, knee |
| 06 | joints | 관절의 분류(섬유·연골·윤활), 윤활관절 여섯 가지 모양과 자유도, 움직임 용어(굽힘·폄·벌림·모음·돌림·휘돌림·엎침·뒤침 등), 관절 가동 범위, 지렛대(1·2·3종)와 근육의 힘팔, 어깨·무릎·엉덩관절의 안정성 | shoulder, knee, hand, foot |
| 07 | trunk | 척주세움근과 깊은 등근육, 등세모근·마름근, 가슴벽·배벽(배곧은근 등은 데이터에 없음을 밝힘), 횡격막의 구멍, 목의 근육과 목삼각, 후두(연골·성대), 근육 이름을 짓는 규칙(모양·위치·방향·갈래·붙는 곳·작용) | trunkmuscles, larynx |
| 08 | thorax | 가슴안의 구획(세로칸과 흉막안), 심장의 위치·각도·크기(왼쪽으로 3분의 2), 심장의 방과 큰 혈관, 기관과 기관지 나무(오른쪽이 더 굵고 곧다), 폐의 엽(데이터 한계), 식도·가슴샘·홀정맥, 가슴 단면 | thorax + 단면 |
| 09 | abdomen | 배의 아홉 구역·사분면, 간·쓸개·위·지라·이자·창자의 자리와 크기, 배막과 배막뒤 기관(콩팥·이자·샘창자), 오른쪽 콩팥이 낮은 이유, 문맥, 골반 안 장기와 골반바닥(남성 모델 데이터, 여성은 글로), 배 단면 | abdomen, pelvis + 지도·단면 |
| 10 | brain | 대뇌의 엽·고랑·이랑, 운동·감각 겉질, 깊은 구조(시상·바닥핵·해마·뇌들보·속섬유막), 뇌실과 뇌척수액, 소뇌·뇌줄기, 뇌 부피 데이터, 눈알의 층과 눈 근육 6개, 시각의 길(시각교차), 뇌 단면 | brain, braindeep, eye + 단면 |
| 11 | vessels | 동맥의 큰 줄기(대동맥활의 세 가지, 복강·창자간막·콩팥 동맥, 팔·다리 동맥의 이름 바뀜), 맥박 짚는 자리(지도 위), 관상동맥, 얕은 정맥(채혈하는 팔오금, 두렁정맥)과 깊은 정맥, 문맥계, 심장에서 손끝·발끝까지의 길이(데이터로) | arteries, veins, thorax + 지도 |
| 12 | sections | 세 단면과 영상의 방향 규칙(발 쪽에서 본다), 높이별 가로면 순례(뇌·눈·목·가슴·위배·배꼽·골반·넙다리), CT의 회색조(조직마다 밝기), 관상·시상면, 단면 넓이를 쌓아 부피 구하기(카발리에리), 3D와 단면 오가기 | systems, thorax, abdomen + 단면(대표 시뮬레이터) |
| 13 | data | BodyParts3D가 무엇인가(DBCLS, 한 성인 남성, part-of와 is-a 두 트리, FMA 개념 id, 요소 파일), 온톨로지(간 = 무엇의 일부인가), 메시로 부피·겉넓이·무게중심 계산, 닫힌 메시와 열린 메시, 피부 껍질 문제(몸의 부피를 단면으로), 데이터와 교과서값 비교, 데이터의 한계와 편향(한 사람, 남성, 빠진 구조), 재사용과 라이선스 | systems, skeleton + 데이터 표·그래프 |
| 14 | glossary | 용어집(이 책의 용어 120개 이상, 우리말·한자어·영어), 방향·단면 용어 연습, 종합 퀴즈 20문항 | — |

## 점검
- `python3 tools/head.py <slug>` 로 head를 채운다.
- `python3 tools/check.py <slug>` (playwright 필요: `pip install playwright && playwright install chromium`, 서가 루트에서 웹 서버 없이 file://로 연다 — 3D 모델은 file://에서 메시지만 보인다). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작 중 예외, 그려지지 않은 캔버스, id·data-desc 없는 시뮬레이터를 보고한다. `--shots 폴더`로 스크린샷을 남겨 **눈으로도 본다**. **문제가 0이 될 때까지 고친다.**
- `python3 tools/sims.py` 로 갤러리 목록(`js/sims.js`)을 다시 만든다.
- 글 속 숫자를 node로 확인할 때:
```bash
node -e "const fs=require('fs');const w={};new Function('window',fs.readFileSync('js/atlas-data.js','utf8'))(w);const D=w.AT_DATA;const p=k=>D.parts.find(x=>x.k===k);console.log(p('femur').vol, p('femur').hi[2]-p('femur').lo[2])"
```
  (AT의 계산 함수까지 쓰려면 `global.window={AT_DATA:...}; global.BB={clamp:(x,a,b)=>Math.min(b,Math.max(a,x))};` 뒤에 `js/atlas.js`를 `new Function`으로 실행한다.)
- 모바일(폭 360px)에서 가로 스크롤 금지. 캔버스 글자는 `BB.font()`로, 화면 색은 `BB.palette()`로. 다크·라이트 모두 확인. 해부 구조 색(`AT.COLORS`)과 CT 화면은 고정 색을 써도 된다.
