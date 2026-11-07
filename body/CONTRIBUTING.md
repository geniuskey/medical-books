# BodyBook 챕터 작성 가이드

빌드 과정 없는 정적 사이트다. `index.html` + `sims.html`(시뮬레이터 갤러리) + `chapters/<slug>.html` + 공통 `css/style.css`, `js/common.js`(전역 `BB`), `js/body.js`(생리 엔진, 전역 `BD`).
로컬 실행: `python -m http.server 8000` → http://localhost:8000 (file://로 열어도 동작하게 classic script만 쓴다. ES module 금지.)
배포: `npm ci && npm run build`(공통 도구 `@euiyun/book`)가 `.book-dist/`를 만들고 GitHub Actions가 Pages로 올린다.

## 기여물의 라이선스
실행 코드는 MIT, 본문·그림·문제·해설 등 교육 콘텐츠는 CC BY 4.0. 구분은 [라이선스 안내](LICENSE.md)를 따른다.

## 이 책이 무엇인가
"살아가는 지식" 갈래의 건강 분야 첫 권이다. 같은 분야의 다음 책(FitBook 운동 과학, FoodBook 영양, SleepBook 수면, MedBook 병원·약)이 **무엇을 할지**를 다룬다면, 이 책은 그 밑바닥인 **몸이 어떻게 돌아가는지**(생리학)를 다룬다. 심장, 혈관, 폐, 근육, 대사, 혈당, 신경, 호르몬, 콩팥, 체온.

대상은 생리학을 처음 보는 성인(대학생, 직장인, 운동을 시작한 사람, 고등학생도 읽을 수 있게). 사전 지식을 가정하지 않는다. 교과서의 대표 본보기는 Guyton·Hall *Textbook of Medical Physiology*, Boron·Boulpaep *Medical Physiology*, Silverthorn *Human Physiology: An Integrated Approach*, West *Respiratory Physiology: The Essentials*, Klabunde *Cardiovascular Physiology Concepts*, McArdle·Katch·Katch *Exercise Physiology*. 만져 보며 배우는 방식의 본보기는 Bartosz Ciechanowski의 글.

## 최우선 원칙: 시뮬레이터가 주인공이다
몸은 숫자로 돌아가는 기계지만 그 숫자들은 서로 묶여 있다. 심박수를 올리면 채울 시간이 줄고, 숨을 빨리 쉬면 이산화탄소가 빠져 혈관이 좁아지고, 덜 먹으면 몸이 덜 쓴다. 독자는 **손으로 돌려 보며** 그 묶임을 "본다". 그러므로:
- **장마다 시뮬레이터 7~10개.** 정적 그림은 장마다 1~3개(해부 구조도, 경로도, 비교표 그림처럼 조작이 의미 없을 때만). **해부 구조와 교과서식 경로도는 직접 그리지 않고 공개 자료를 먼저 찾는다**(아래 "그림과 3D 모델"). 직접 그리는 SVG는 이 책 고유의 숫자를 담은 도표처럼 공개 자료로 대신할 수 없을 때만. 글을 읽지 않고 시뮬레이터만 쓰는 사람이 많다(상단 "시뮬레이터만" 버튼, `sims.html` 갤러리).
- **모든 시뮬레이터는 혼자서 이해되어야 한다.** 캔버스 안에 축 이름·단위·범례·핵심 숫자를 직접 그린다. `.sim-note`는 "해볼 것: ① … ② … ③ …"과 모델의 가정을 담는다.
- 각 `.sim`에는 `id`와 `data-desc="갤러리 카드에 들어갈 한 문장"`이 반드시 있다. 장 끝의 큰 종합 시뮬레이터에는 `data-big`.
- **몸다운 시각 언어를 쓴다.** 이 책의 시각적 무기:
  - **환자 모니터**: 심전도·동맥압·산소 포화도·호흡 곡선은 `BD.monitor`로 어두운 화면(`.sim-view.monitor`)에, 채널 색 `BB.trace(1..4)`(초록 심전도, 빨강 동맥압, 하늘 SpO2, 노랑 호흡). 오른쪽에 큰 숫자. 실시간으로 흘러가는 화면(`BB.loop`)이면 더 좋다.
  - **움직이는 해부도**: `BD.heartDiagram`(네 방, 판막 열림·닫힘, 채움 정도, 전도 신호), `BD.body`(사람 실루엣과 장기, 장기를 눌러 선택), 혈관·폐포·근절·신경 단면을 캔버스로 직접. 피는 `BD.flowDots`로 흐르게 한다(속도는 유량에 비례).
  - **고리와 곡선 위 동작점**: 압력-부피 고리, 헤모글로빈 해리 곡선, 프랭크-스탈링 곡선, 길이-장력·힘-속도 곡선 위의 점을 끌어 움직인다.
  - **시간 기록**: 하루(코르티솔, 혈당, 체온), 몇 달(체중, 훈련), 몇 초(심장 주기), 몇 밀리초(활동 전위)를 같은 문법으로.
  - **계기판과 막대**: `BD.gauge`, `BB.bars`, `BB.donut`으로 에너지 장부, 혈류 배분, 체액 구획.
  - 애니메이션(`BB.loop`), 호버 정보 상자(`BB.tip`), 캔버스 직접 끌기(`BB.drag`)를 적극적으로. 슬라이더만 있는 시뮬레이터보다 **캔버스를 직접 누르고 끄는** 시뮬레이터를 우선한다. 끌 수 있는 것에는 손잡이(테두리 있는 원)를 그린다.
- 한 시뮬레이터는 **한 가지 질문**에 답한다. 컨트롤은 1~4개. 종합 시뮬레이터는 장 끝에 하나.
- 값을 끝까지 밀었을 때 **무너지는 모습**이 보여야 한다(심박수가 너무 빠르면 심박출량이 오히려 준다, 숨을 오래 참으면 포화도가 떨어진다, 혈당이 신장 역치를 넘으면 소변으로 샌다, 피드백이 늦으면 출렁인다, 더위에 땀이 증발하지 못하면 체온이 계속 오른다). 한계가 배울 점이다. 위험한 상황에는 경고색(`--bad`)과 짧은 경고 문구를 캔버스에 그린다.
- 결과는 숫자(`.sim-readout`)로도 함께 보여 준다. 정상 참고 범위를 옆에 함께 쓰면 더 좋다.
- 생리 계산은 **`BD`(생리 엔진)로 한다.** 장 안에서 같은 모델을 다시 만들지 않는다(장 고유의 작은 계산·그림은 직접 해도 된다). 무거운 계산(`BD.heart` 한 번 약 10 ms, `BD.heartSweep` 수십 점, `BD.hh` 수천 스텝)은 `BB.debounce`나 버튼으로.

## 글쓰기 원칙
- **한국어**. 생리학 용어는 처음 나올 때 `<span class="term">1회 박출량</span><span class="en">(Stroke volume)</span>`처럼 쓰고 한 문장으로 풀어 준다. 기호는 KaTeX(`\(CO = HR \times SV\)`).
- 문체는 평서문 "~다". 이모지 금지. 다른 장은 `<a href="heart.html">4장</a>`처럼 링크한다.
- **사람을 가리킬 때 성별 대명사(그, 그녀)를 쓰지 않는다.** 인물은 이름(다온)으로 부른다.
- 순서: 일상의 질문 → 직관(왜) → 시뮬레이터 → 원리(필요하면 수식) → 실제 수치·정상 범위 → 다온의 기록(케이스) → 핵심 정리 → 퀴즈.
- 글은 짧게. 시뮬레이터 바로 앞에서 "무엇을 움직여 볼지", 바로 뒤에서 "무엇을 봤는지"를 2~4문장으로 말한다. 한 절(section)에 문단 3~6개.
- 수식은 꼭 필요한 것만(장마다 1~4개), 대신 **기호마다 단위와 대표값**을 붙인다("1회 박출량 \(SV\) ≈ 70 mL").
- **수치 정책**: 정상값은 교과서에 흔히 실리는 건강한 성인 대표값(`BD.REF`)을 쓰고 '약', '~'를 붙인다. 검사 기준(혈압 분류, 공복 혈당, HbA1c)은 국내 진료 지침에서 흔히 쓰는 경계값을 쓰되 "기준은 학회·시기에 따라 다르다"를 장마다 한 번 말한다. 시뮬레이터 결과는 **교육용 모델**의 값임을 `.sim-note`에 밝힌다.
- **의학적 조언을 하지 않는다.** 진단·치료·약 용량을 권하지 않는다. 질환은 원리를 설명하는 예로만 다루고, 증상이 있으면 의료진과 상담하라는 문장을 질환을 다루는 장에 한 번 넣는다(`.health-note`). 위험한 실험(숨 참기 전 과호흡, 물 과음, 더위 속 운동)은 시뮬레이터로만 하고 실제로 하지 말라고 분명히 쓴다(`.callout.warn`).
- 특정 상품·브랜드·회사 이름을 쓰지 않는다(스마트워치, 혈당 측정기 같은 일반 명사는 괜찮다).
- **공통 파일(`js/*.js`, `css/style.css`)은 고치지 않는다.** 장 전용 스타일은 그 장 `<head>`의 `<style>`에, 장 전용 함수는 그 장 인라인 스크립트에. 엔진의 버그나 부족한 기능을 발견하면 장 안에서 우회하고, 보고한다.

## head 블록
각 챕터 `<head>`에는 아래 표식만 두고 `python3 tools/head.py <slug>`를 실행한다(인자 없이 실행하면 전체 장 + 사이트맵 + `index.html`의 JSON-LD를 갱신한다). 제목·번호는 `js/common.js`의 `CHAPTERS`에서 읽는다. `js/body.js`는 항상 함께 불러온다.
```html
<!doctype html>
<!-- Copyright (c) 2026 geniuskey and BodyBook contributors.
     Executable code: MIT (see ../LICENSE-MIT).
     Text, illustrations, questions and explanations: CC-BY-4.0 (see ../LICENSE.md). -->
<html lang="ko">
<head>
<!--head:start {"desc": "한 문장 설명(검색 결과에 보일 120자 안팎)"}-->
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
상단바·검색·챕터 목록·계통 띠·오른쪽 목차·h2 번호·이전/다음·푸터·퀴즈 동작·KaTeX 렌더·"시뮬레이터만" 모드·시뮬레이터 바로가기(#) 링크는 `common.js`가 자동으로 만든다. 직접 넣지 않는다.
"시뮬레이터만" 모드에서는 `section` 바로 아래의 `h2`, `.sim`, `.sim-group`만 보인다. 시뮬레이터를 `figure`나 다른 `div`로 감싸지 않는다(숨겨진다).

## 컴포넌트
- 시뮬레이터:
```html
<div class="sim" id="sim-x" data-desc="갤러리 카드용 한 문장: 무엇을 바꾸면 무엇이 보이는가">
  <div class="sim-head"><span class="sim-tag">SIMULATOR</span><h3>제목(질문형도 좋다)</h3></div>
  <div class="sim-body side">
    <div class="sim-view"><canvas id="x-cv"></canvas></div>   <!-- 환자 모니터면 class="sim-view monitor" -->
    <div class="sim-controls">
      <label class="ctrl"><span>이름 <output id="x-a-out"></output></span><input type="range" id="x-a" min="0" max="10" step="0.1" value="3"></label>
      <div class="seg" id="x-mode"><button data-value="a" class="on">A</button><button data-value="b">B</button></div>
      <label class="check"><input type="checkbox" id="x-c"> 옵션</label>
      <label class="ctrl"><span>선택</span><select id="x-s"><option value="a">A</option></select></label>
      <div class="btn-row"><button class="btn primary" id="x-go">실행</button><button class="btn" id="x-re">다시</button></div>
    </div>
  </div>
  <div class="info-panel" id="x-info">누른 장기·구간의 설명(선택)</div>
  <div class="sim-readout"><div class="stat"><span class="k">이름</span><span class="v" id="x-o-1">—</span></div></div>
  <div class="sim-note">해볼 것: ① … ② … ③ … (모델의 가정)</div>
</div>
```
  컨트롤이 없거나 캔버스를 직접 누르는 시뮬레이터는 `.sim-body`에서 `side`를 빼고 `.sim-view` 안에 `<span class="hint">끌어서 움직인다</span>`를 둔다. 범례는 `<div class="map-legend"><span><i style="background:var(--art)"></i>동맥혈</span></div>`(`.sim-body` 다음).
- 그림: `<figure class="diagram"><svg viewBox="0 0 480 300" role="img" aria-label="…">…</svg><figcaption><b>그림 제목.</b> 설명</figcaption></figure>`. SVG viewBox 폭은 420~520 정도(720이면 360px 화면에서 글자가 너무 작아진다). SVG 안에서는 `.lbl .lbl-dim .lbl-b .lbl-acc .lbl-acc2 .lbl-bad .t-mono .s-line .s-axis .s-acc .s-acc2 .s-dash .s-bad .s-ok .f-surface .f-elev .f-acc .f-acc2 .f-acc-soft .f-acc2-soft .f-ok-soft .f-warn-soft .f-bad-soft .f-bad .f-ok .f-warn` 클래스와 몸 전용 `.f-art .f-ven .s-art .s-ven .f-art-soft .f-ven-soft .f-organ .f-glu .f-ins .s-glu .s-ins .f-fat .f-carb .f-prot .f-water .f-nerve .s-nerve .f-heat`, 계통 색 `.seg-base .seg-circ .seg-resp .seg-musc .seg-meta .seg-reg`를 쓴다. 색을 직접 적지 않는다(다크 모드). 화살표 머리는 `<marker>`에 `fill="context-stroke"`. SVG는 `viewBox`만 주고 width/height 생략.
- 공개 그림: `<figure class="photo"><img src="../assets/figures/…webp" width="…" height="…" loading="lazy" decoding="async" alt="…"><figcaption><b>그림 제목.</b> 한국어 설명 <span class="fig-words">English 한국어 · …</span><span class="credit">그림: 원저작자, 출처 링크, 라이선스 링크.</span></figcaption></figure>`. 두 장을 나란히 놓을 때는 `<img>`들을 `<div class="fig-row">`로 감싼다. `fig-words`는 그림 속 영어 이름표를 한국어로 푸는 대응표다.
- 3D 해부 모델: `<div class="sim model3d" id="…" data-model="heart" data-orbit="0deg 80deg auto" data-desc="…">` 안에 `.sim-head`(`<span class="sim-tag three">3D MODEL</span>`), `.sim-body > .sim-view.model3d-view`, `.model3d-parts`(부위 버튼 `<button type="button" data-part="재질 이름" title="한 줄 설명">한국어 이름</button>`, `data-fade="a,b"` 반투명 버튼, `data-rotate`, `data-reset`), `.info-panel`, `.sim-note`(해볼 것 + `<span class="sim-credit">` 출처)를 둔다. 부위 이름(재질 이름)은 `tools/bp3d_models.py`의 그룹 `key`다. 이런 블록이 있는 장은 `tools/head.py`가 `js/anatomy3d.js`를 자동으로 불러온다. 갤러리에도 시뮬레이터처럼 실린다.
- 수식: `<div class="formula">$$…$$<div class="where">기호 설명</div></div>`, 문장 속은 `\(…\)`.
- 강조 상자: `.callout`, `.callout.tip`, `.callout.warn`, `.callout.deep`(첫 `<strong>`이 제목).
- 건강 안내: `<p class="health-note">이 장의 수치와 시뮬레이터는 원리를 보여 주기 위한 교육용 모델입니다. 증상이 있거나 검사 수치가 걱정되면 의료진과 상담하세요.</p>`
- 숫자 상자: `<div class="numbers"><div><b>10만 번</b><span>하루 심장 박동</span></div>…</div>`
- 표: `<div class="table-wrap"><table>…</table></div>`. 숫자 칸은 `class="num"`.
- 용어: `<span class="term">심박출량</span><span class="en">(Cardiac output)</span>`.
- 범례: `.legend`, `.pill`, `.ok-t` `.bad-t` `.warn-t`.
- 퀴즈: `<div class="quiz-q"><p>문제</p><div class="opts"><button class="opt">…</button><button class="opt" data-correct>정답</button></div><div class="quiz-exp">해설</div></div>` (장마다 4~5문항, 정답 위치를 섞는다. 계산 문제를 1~2개 넣는다).
- 다온의 기록(케이스 파일):
```html
<div class="casefile">
  <div class="tag"><b>CASE 다온</b><span>다온의 기록 · 4장</span></div>
  <h4>안정 시 1회 박출량 72 mL, 대회 속도에서는 107 mL</h4>
  <p>…이 장의 방법을 다온에게 적용한 결과…</p>
  <div class="clue"><div><b>이 장에서 확인한 것</b>…</div><div><b>아직 모르는 것</b>…</div><div><b>다음 단계</b>…</div></div>
</div>
```

## 그림과 3D 모델: 공개 자료 우선
- **출처는 저작자 표시(CC BY) 또는 퍼블릭 도메인만.** 비영리(NC)·변경 금지(ND)·동일조건(SA) 조건이 붙은 자료는 이 책(CC BY 4.0, 상업적 이용 허용)에 넣을 수 없다. 같은 책이라도 판마다 라이선스가 다를 수 있으니(OpenStax *Anatomy and Physiology* 1판은 CC BY 4.0, 2판은 CC BY-NC-SA 4.0) 쓰는 판의 라이선스를 직접 확인한다.
- 그림 하나 안에 제3자 저작물(캡션에 ©, "credit:", "Micrograph provided by …")이 섞여 있으면 그 그림을 쓰지 않거나 그 부분을 잘라 내고, 잘라 냈다고 캡션에 적는다.
- 지금 쓰는 출처: 그림은 [OpenStax *Anatomy and Physiology* 1판](https://openstax.org/details/books/anatomy-and-physiology)(CC BY 4.0), 3D 모델은 [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)(DBCLS, CC BY 4.0).
- 파일은 `assets/figures/`(WebP, 폭 1200px 이하)와 `assets/3d/`(glTF 바이너리, 모델 하나 1.5 MB 이하)에 두고, 새 파일을 넣으면 [assets/CREDITS.md](assets/CREDITS.md)에 출처·원본 쪽·변경 사항을 한 줄 더한다. 캡션의 `.credit`(그림)과 `.sim-credit`(3D)에도 원저작자, 출처 링크, 라이선스를 쓴다.
- 3D 모델을 새로 만들거나 고칠 때는 `tools/bp3d_models.py`의 `MODELS`에 그룹을 더하고 다시 생성한다(실행법은 파일 머리말). BodyParts3D에는 폐 실질, 갑상선 표면이 없다.

## 이어지는 케이스: 다온의 12주
모든 장은 같은 가상의 인물 한 명의 몸을 한 걸음씩 들여다본다. 각 장 끝(핵심 정리 앞)에 `.casefile` 하나를 넣고, **아래 표에서 자기 장에 해당하는 내용만** 다룬다. 뒤 장의 결론을 미리 말하지 않는다. 숫자는 `BD.DAON`과 엔진으로 직접 계산해서 쓴다(`node`에서 확인하는 법은 아래 "점검").

- 인물: 정다온(가상, 실제 인물과 무관). 34세, 키 175 cm, 몸무게 78 kg, 체지방 약 24 %, 사무직, 운동은 거의 하지 않았다. 공식 계산에는 남성 식을 쓴다. 건강검진: 안정 심박수 72 bpm, 혈압 128/82 mmHg, 공복 혈당 98 mg/dL, HbA1c 5.6 %. 운동 부하 검사로 잰 VO2max 38 mL/kg/min.
- 목표: **12주 뒤 가을 10 km 달리기 대회**(기온 24 °C, 습도 60 %). 지금 실력으로는 약 58분(젖산 역치 기준 `BD.racePlan(38, 0.6)`), 12주 훈련 뒤에는 약 50분(`BD.racePlan(43, 0.68)`)을 목표로 한다.
- 엔진으로 확인한 값:
```js
BD.bmi(78, 175)               // 25.5  · BD.bsa(78, 175) ≈ 1.94 m² · BD.tbw(78) ≈ 46.8 L(몸의 물) · 혈액 약 5.5 L(체중의 7 %)
BD.hrMax(34)                  // 184 bpm(Tanaka) · 카르보넨 구간(안정 72): Z1 128–139, Z2 139–151, Z3 151–162, Z4 162–173, Z5 173–184
BD.heart(BD.HEART_PRESETS.daon)  // SV ≈ 72 mL, CO ≈ 5.2 L/min, EDV 126, ESV 54, EF 0.57, 모델 혈압 약 123/85
BD.heart(BD.HEART_PRESETS.run)   // 대회 속도(HR 168): SV ≈ 107 mL, CO ≈ 18 L/min, EF 0.76, 혈압 약 147/72
BD.lungVolumes(175, 34, "m")  // VC 5.07 L, TLC 6.88, FRC 3.31, RV 1.81 · BD.spirometry({fvc: 5.07}) → FEV1 4.07 L, FEV1/FVC 0.80
BD.pao2()                     // PAO2 ≈ 102 mmHg · BD.satO2(95) ≈ 0.974 · CaO2 ≈ 19.9 mL/dL(Hb 15) · DO2 ≈ 1,070 mL/min(CO 5.4)
BD.ghk()                      // 휴지 막전위 ≈ −74 mV
BD.bmr(78, 175, 34)           // 1,709 kcal/day(Mifflin) · × PAL 1.4 = 2,392 kcal/day · 달리기 40분(9.8 MET) ≈ 510 kcal
BD.racePlan(38, 0.6)          // 79 % VO2max, 10.4 km/h, 약 58분, 그때 심박 약 161, 젖산 약 4 mmol/L, RER 약 0.90
BD.racePlan(43, 0.68)         // 83 % VO2max, 11.9 km/h, 약 50분
BD.glucose({kg: 78, gb: 98, meals: [{t: 30, g: 90}]})   // 점심 탄수화물 90 g: 최고 약 163 mg/dL(식후 34분), 약 3시간 뒤 공복 수준
//   + 식후 산책 exercise: [{t0: 45, t1: 75, x: 0.4}] → 최고 약 140 mg/dL
BD.weightSim({intake: 2392 - 300, palAt: () => 1.49, days: 84})   // 12주: 78 → 약 73.7 kg(지방 18.7 → 약 16.1 kg)
BD.thermo({minutes: 58, ta: 24, rh: 60, met: 804, wind: 2.9, clo: 0.3})  // 대회: 심부 체온 약 38.3 °C, 땀 약 0.6 L
```

| 장 | 이 장에서 다루는 것 |
|---|---|
| 01 몸이라는 기계 | 다온 소개와 12주 목표. 다온의 몸을 숫자로: BMI 25.5, 체표면적 1.94 m², 몸의 물 약 47 L, 혈액 약 5.5 L, 하루 심장 박동 약 10만 번(72 × 1,440), 호흡 약 2만 번. 질문: 이 몸이 10 km를 달리려면 무엇이 얼마나 바뀌어야 하는가. 책 전체가 순환 → 호흡 → 근육 → 에너지 → 조절 순서로 다온을 따라간다는 안내. |
| 02 항상성과 피드백 | 다온이 회의실 의자에서 벌떡 일어설 때 혈압이 잠깐 떨어졌다 돌아오는 것(`BD.baroLoop`, 기립)을 피드백 루프로 읽는다. 설정점·감지기·효과기. 같은 몸이 달릴 때는 설정점을 일부러 옮긴다(운동 중 압반사 재설정)는 예고. |
| 03 세포 | 다온의 근육 세포 휴지 막전위 −74 mV(GHK). 대회 중 땀으로 나트륨을 잃고 맹물만 많이 마시면 세포가 붓는다(`BD.cellVolume`) — 18장에서 다시. |
| 04 심장 | 안정 시 SV 약 72 mL, CO 약 5.2 L/min, EF 0.57. 대회 속도에서 SV 약 107 mL, CO 약 18 L/min: 수축력·정맥 환류·이완 속도가 함께 바뀐다. 압력-부피 고리 두 개를 겹쳐 본다. |
| 05 심장의 전기 | 다온의 검진 심전도: 정상 동리듬 72 bpm, PR 0.16 s, QRS 0.09 s. 12주 유산소 훈련 뒤 부교감 긴장이 늘어 안정 심박이 약 64로 내려가는 것(`BD.saNode`의 ach 증가)과 심박 변이 증가. |
| 06 혈관과 혈압 | 혈압 128/82 → 고혈압 전단계(`BD.bpClass`). 평균 동맥압 약 97 mmHg. 말초 저항과 동맥 탄성으로 본 원인, 규칙적 유산소 운동이 수축기 혈압을 약 5 mmHg 낮춘다는 연구 요약. 기립 시 압반사. |
| 07 심박수와 혈류 | 심박수 구간(카르보넨)을 다온의 숫자로 정한다. 대회 목표 심박 약 161(역치 근처). 심박수만 올리면 심박출량이 어디서 꺾이는지(`BD.heartSweep`), 달릴 때 혈류가 근육으로 옮겨 가는 배분. |
| 08 폐 | 예측 폐활량 VC 5.07 L, FEV1 4.07 L, FEV1/FVC 0.80(정상). 대회 속도의 분당 환기량 약 67 L/min: 1회 호흡량과 호흡수가 어떻게 나뉘는지, 사강 때문에 깊게 쉬는 편이 효율적인 이유. |
| 09 가스 교환 | PAO2 약 102 mmHg, SaO2 약 97 %, CaO2 약 20 mL/dL, 산소 운반량 약 1,070 mL/min(안정). 대회 속도에서는 모세혈관 통과 시간이 짧아져도 포화가 유지된다. 만약 대회가 해발 1,500 m라면 PAO2·포화도가 얼마나 떨어지는가. |
| 10 호흡 조절 | 정상 산염기(pH 7.40, PaCO2 40, HCO3 24). 숨 참기 실험(`BD.breathHold`)과 과호흡의 위험. 대회 막판 젖산이 쌓일 때 호흡이 거칠어지는 이유(대사성 산 → 환기 증가로 보상). |
| 11 근육 | 다온 허벅지 근육의 섬유 비율(약 반반), 달리기 속도에서 동원되는 운동 단위(`BD.motorUnits`)와 막판 스퍼트에서 큰 단위까지 동원되는 것. 힘-속도 곡선으로 본 보폭과 회전수. |
| 12 운동하는 몸 | VO2max 38, 젖산 역치 약 60 %(심박 약 139). 지금 10 km 약 58분. 12주 훈련 계획을 바니스터 모델(`BD.banister`)로 그려 보고, VO2max 43·역치 68 %가 되면 약 50분. 대회 전 1주의 가벼운 훈련(테이퍼)이 기록을 올리는 이유. |
| 13 에너지 대사 | 기초대사량 1,709 kcal(Mifflin), 하루 소비 약 2,392 kcal(PAL 1.4), 40분 달리기 약 510 kcal. 대회 속도의 RER 약 0.90 → 연료의 대부분이 탄수화물. 장기별 대사(뇌·간이 쉬는 동안에도 많이 쓴다). |
| 14 에너지 균형 | 하루 300 kcal 덜 먹고 주 3~4회 달리기(PAL 1.49): 12주 뒤 약 73.7 kg, 지방 약 2.6 kg 감소. 7,700 kcal = 1 kg 직선 예측과의 차이, 첫 주의 물 무게, 1년 뒤 정체기. |
| 15 혈당과 인슐린 | 공복 혈당 98(정상 상한 근처), HbA1c 5.6 %. 점심 탄수화물 90 g → 최고 약 163 mg/dL, 식후 30분 산책이면 약 140. 대회 전날 탄수화물 섭취와 근육 글리코겐. |
| 16 신경 | 출발 신호에 반응하는 시간(약 0.2 s)의 내역: 감각 → 판단 → 운동 명령 → 근육. 다리까지 약 1 m를 60 m/s로 가면 약 17 ms. 달리는 동안 교감 신경이 심장·혈관·땀샘을 한꺼번에 움직이는 방식. |
| 17 호르몬 | 대회 날 아침 코르티솔(하루 중 가장 높을 때)과 출발 직전 아드레날린. 늦게 자고 일찍 일어나면 리듬이 어떻게 밀리는가(`BD.hpa`). 갑상선 TSH 1.5 mU/L 정상. 훈련 스트레스와 회복. |
| 18 콩팥과 체액 | eGFR 약 120 mL/min. 대회 중 땀 약 0.6 L(더우면 1 L 이상) → 혈장 삼투압·ADH 상승, 소변 감소(`BD.waterBalance`). 땀 손실보다 훨씬 많이 맹물을 마시면 생기는 저나트륨혈증 위험. |
| 19 체온 조절 | 대회 조건(24 °C, 습도 60 %, 대회 속도 약 800 W): 심부 체온 약 38.3 °C, 땀 약 0.6 L. 30 °C·70 %라면 약 39.0 °C. 열지수, 더위 적응 2주가 바꾸는 것. |
| 20 인체 실험실 | 독자가 다온의 대회 날을 직접 돌린다(출발 → 10 km → 회복). 자기 숫자로도 넣어 본다. |
| 21 용어집 | 다온 없이 용어·정상 참고값과 종합 퀴즈. |

## JS 헬퍼 (`BB`, `js/common.js`)
- `BB.canvas(el|선택자, draw(ctx, w, h), {aspect, minHeight, maxHeight, height})` → `{redraw(), ctx, w, h, canvas}`. 리사이즈·테마 변경 시 자동으로 다시 그린다. draw 안에서 `BB.palette()`를 매번 다시 읽는다. w, h는 CSS px. 문자열은 `querySelector` 선택자이므로 `"#id"`로 넘긴다. 만들자마자 draw를 한 번 부르므로 draw가 읽는 상태와 컨트롤(`BB.range`, `BB.seg`)을 먼저 만든다. **draw 안에서 자기 반환값을 참조하지 않는다**(초기화 전 접근 오류). 폭이 좁으면(모바일 360px) 배치를 바꿔 높이를 키우고 싶을 때는 옵션에 `get height() { … }` getter를 넘긴다. `.sim-view.monitor` 안의 캔버스는 배경이 어둡게 칠해진다.
- `BB.drag(canvas|선택자, {start(x, y, e), move(x, y, e), end(), hover(x, y, e)})` 캔버스 위 누르기·끌기·호버(마우스·터치, CSS px). 누르는 순간 start와 move가 한 번씩 불린다. 클릭(선택)도 이것으로 처리한다. draw에서 계산한 배치(상자, 축 변환, 장기 위치)를 바깥 변수에 저장해 두고 hit-test 한다.
- `BB.tip(canvas)` → `{show(x, y, html), hide()}` 캔버스 위 호버 정보 상자. `canvas.addEventListener("pointerleave", tip.hide)`.
- `BB.chart(ctx, box|null, {x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xFmt, yFmt, xTicks, yTicks, series:[{data:[[x,y]], color, width, dash, fill}], vlines:[{x,color,label}], hlines:[{y,color,label}], points:[{x,y,color,r,label}], bands:[{x0,x1,color}]})` → `{X, Y, box}`. box를 생략하면 왼쪽 여백 58px. 좁은 화면에서는 box를 직접 준다.
- `BB.bars(ctx, box|null, {labels, stacks:[{label, color, data}], y, yFmt, yLabel, gap, hlines, highlight, valueFmt})` → `{X(i), Y, box, bw}` 누적 막대. `BB.donut(ctx, cx, cy, R, [{label, value, color}], {inner, center:{big, small}, labels, highlight})` → `{hit(x, y)}`.
- `BB.range(id, fmt, onInput)` → `get()`, `get.set(v)`. 출력은 `id + "-out"` 요소. `BB.seg(id, onChange)` → `get()`, `get.set(v)`. `BB.stat(id, html)`.
- `BB.loop(el, (dt, t) => {})` 화면에 보일 때만 도는 애니메이션(`stop()`, `start()`, `toggle()`, `running`).
- `BB.palette()` → `{bg, text, dim, faint, grid, axis, border, surface, accent, accent2, ok, warn, bad, red, green, blue, series}`, `BB.color(name)`(CSS 변수: `"art"` 동맥혈, `"ven"` 정맥혈, `"o2"`, `"co2"`, `"glu"` 포도당, `"ins"` 인슐린, `"fat"`, `"carb"`, `"prot"`, `"water"`, `"heat"`, `"nerve"`, `"tr-1"`…), `BB.trace(1..4)` 모니터 채널 색, `BB.segColor(key)` 계통 색(base circ resp musc meta reg), `BB.alpha(color, a)`, `BB.isDark()`, `BB.onTheme(cb)`.
- `BB.fmt(x, digits)`, `BB.pct(0.23)` → "23.0%", `BB.si(2.3e-6, "A")`, `BB.db(…)`.
- `BB.rrect(ctx, x, y, w, h, r)`, `BB.wrapText(ctx, text, x, y, maxW, lineH, maxLines)`.
- `BB.font(px, mono, weight)`: 고정폭(mono)은 숫자·영문에만. 한글은 자간이 벌어진다. `BB.rng(seed)`(0~1 난수 함수), `BB.randn()`, `BB.poisson(λ)`, `BB.erf`, `BB.debounce`, `BB.clamp/lerp/map`.
- `BB.CHAPTERS`, `BB.STAGES`.

## 생리 엔진 (`BD`, `js/body.js`)
모든 장이 같은 몸 모델과 같은 참고값을 쓰게 하는 공통 엔진이다. 단위는 생리학에서 흔히 쓰는 단위(mmHg, mL, L/min, mg/dL, °C, kcal, ms). 시뮬레이터 주석(`.sim-note`)에 모델의 가정을 밝힌다.

### 도구·참고값
- `BD.ode(f, y0, {t0, t1, dt, every})` RK4 → `{t, y, last, col(i)}`. `BD.delayLine(dt, tau, init)` → `{push(v) → τ 전 값}`. `BD.linspace`, `BD.logspace`, `BD.interp(xs, ys, x)`, `BD.mean`, `BD.sd`, `BD.sum`, `BD.hill(x, k, n)`, `BD.rng(seed)`, `BD.gauss(seed)`, `BD.erf`, `BD.firstOrder(y0, yInf, t, τ)`, `BD.kFromHalf(th)`.
- `BD.REF` 정상 참고값(hr 70, sv 70, co 5.0, sbp/dbp 120/80, map 93, edv 120, esv 50, ef 0.58, bloodVol 5.0, hct 0.45, hb 15, rr 12, vt 500, deadSpace 150, va 4.2, pao2 95, paco2 40, ph 7.40, hco3 24, sao2 0.97, vo2 250, vco2 200, gfr 125, rpf 650, rbf 1100, urine 1.5 L/day, posm 290, tcore 37, glucose 90, insulin 8, a1c 5.4, na 140, k 4.5, cortisolAM 15, tsh 1.5, ft4 16 pmol/L …). `BD.DAON` 케이스 인물.
- `BD.bmi(kg, cm)`, `BD.bsa(kg, cm)`(DuBois), `BD.mapOf(sbp, dbp)`, `BD.hrMax(age)`(Tanaka), `BD.tbw(kg, sex)`.

### 심장과 순환
- `BD.heart(opts)` 좌심실 시변 탄성 모델 + 닫힌 순환(1 ms 간격 마지막 한 박동). opts: `hr, emax(수축력 2.8), edA·edK(이완기 경직도 0.22·0.033), v0, rs(말초 저항 1.05), ca(동맥 탄성 1.35), cv, vs(유효 혈액량 440 = 앞부하), rmv, rao(대동맥판 저항), atrial(심방 수축 0~1), tscale(<1이면 수축·이완이 빨라짐), beats`. 반환: 배열 `t, plv, pao, pla, vlv, qao, qmv, e` + 요약 `edv, esv, sv, ef, co, sbp, dbp, map, pp, plaMean, lvedp, plvMax, esp, ivc, ivr, ejectT, events{mvClose, avOpen, avClose, mvOpen}, strokeWork(J), T`. 한 번 약 10~20 ms.
- `BD.HEART_PRESETS`: `rest, daon, athlete, run, hypertension, failure, stiff, stenosis, bleed`(각각 `name` 포함).
- `BD.heartSweep(hrs, opts)` → `[{hr, sv, co, edv, esv, map, sbp, dbp}]`. `BD.elastanceAct(tn)` 활성 곡선.
- `BD.windkessel({hr, sv, r, c, zc, beats})` → `{t, p, q, sbp, dbp, map, pp, tau}`.
- `BD.poiseuille(r_cm, L_cm, dP_mmHg, eta_cP)` 유량(mL/s), `BD.resistance(r, L, eta)`, `BD.series`, `BD.parallel`, `BD.viscosity(hct)`.
- `BD.baroLoop({tstop, dt, baro(반사 이득 0~2), delay, vol, events:[{t, kind: "stand"|"bleed"|"infuse"|"drug"|"exercise", value}]})` → `{t, map, sbp, dbp, hr, sv, co, tpr, preload, sym}`(초 단위, 안정 시 MAP 93, HR 70, SV 71).
- `BD.bpClass(sbp, dbp)` → `{key, label, level}`.
- `BD.saNode({slope, mdp, thr, ach(부교감 0~1), ne(교감 0~1)})` → `{v(t) mV, period, hr, t4}`(자극 없이 약 103 bpm, ach 0.5에서 약 65). `BD.ventricularAP(t, apd)` 심실 근육 활동 전위(mV).
- `BD.ecg({hr, rhythm: "sinus"|"af"|"avb1"|"avb2"|"avb3"|"pvc"|"vf"|"brady", duration, hrv, resp, pr, qrs, st, tAmp, noise, seed})` → `{v(t) mV, beats:[{r, type}], ps, rr}`. `BD.hrvStats(rr)` → `{sdnn, rmssd, hr}`.

### 호흡
- `BD.lungVolumes(cm, age, sex, vt)` → `{tlc, vc, rv, frc, erv, ic, irv, fev1, fvc, vt}`(L).
- `BD.spirometry({fvc, tau, kind: "normal"|"obstructive"|"restrictive", severity})` → `{t, v, flow, fev1, fvc, ratio, pef}`.
- `BD.breath({c, r, rr, vt, ie, frcPpl})` → `{t, v, flow, ppl, palv, vt, T, tau}`. `BD.lungPV(p, {medium: "air"|"saline", surfactant, dir})`. `BD.laplace(T, r_um)`.
- `BD.patm(h_m)`, `BD.pio2(pb, fio2)`, `BD.pao2(pb, fio2, paco2, r)`, `BD.paco2(vco2, va)`.
- `BD.satO2(po2, {ph, pco2, temp, dpg, coHb})`(Severinghaus + Kelman), `BD.p50(o)`, `BD.po2FromSat(s, o)`, `BD.o2Content(hb, sat, po2)`, `BD.o2Delivery(co, cao2)`.
- `BD.capillaryO2({pa, pv, transit, dl, hb, coHb})` → `{t, po2, sat, endPo2}`(정상은 약 0.3 s에 평형). `BD.o2Cascade({pb, fio2, paco2, aaGrad})` → `[{k, v}]`.
- `BD.ph(hco3, paco2)`, `BD.hco3For(ph, paco2)`, `BD.acidBase(ph, paco2, hco3)` → `{label, kind}`.
- `BD.ventDrive(paco2, pao2, {gain, hypoxic})` 분당 환기량(L/min). `BD.breathHold({hyper(시작 PaCO2), lung, vo2, vco2, limit, after})` → `{t, paco2, pao2, sao2, urge, breakAt, minSat}`.

### 세포
- `BD.nernst(z, co, ci, T)`, `BD.ghk({k, na, cl}, {ko, ki, nao, nai, clo, cli}, T)`, `BD.IONS`, `BD.diffTime(x_m, D, dims)`, `BD.fick(D, A, dC, dx)`, `BD.osmoticP(mosm)`, `BD.cellVolume(osm, osm0, b)`.

### 근육과 운동
- `BD.twitchTrain({freq, dur, tstop, t0, type: "fast"|"slow", fatigue, n})` → `{t, f, ca, stims, peak, tPeak}`(최대 강축 = 1, 단일 연축 약 0.36).
- `BD.lengthTension(sl_um)`, `BD.passiveTension(sl)`, `BD.SARC`, `BD.fv(f)` 힘 → 속도, `BD.forceAtV(v)` 속도 → 힘(신장 시 최대 약 1.6).
- `BD.motorUnits(drive, {n, range, rrMax})` → `{units:[{thr, force, rate, on, out, type}], total}`. `BD.FIBERS`.
- `BD.runVO2(kmh, grade)`, `BD.walkVO2`, `BD.speedForVO2`(ACSM), `BD.danielsVO2(v_m_per_min)`, `BD.danielsFrac(t_min)`, `BD.danielsSpeed(vo2)`, `BD.raceTime(vo2max, km)`(VO2max만 본 기록), `BD.racePlan(vo2max, lt, km)` → `{frac, vo2, kmh, time}`(젖산 역치 기준의 현실적인 기록).
- `BD.steady(x, {vo2max, lt, hrRest, hrMax, kg})` → `{vo2, hr, lactate, rer, fatFrac, ve}`(x = %VO2max 0~1.2).
- `BD.vo2Kinetics({rest, demand, tOn, tOff, tstop, tau, slow, tauOff})` → `{t, vo2, demand, deficit, epoc}`.
- `BD.energySystems(t)` → `{pcr, gly, ox, total}`, `BD.aerobicShare(D)`, `BD.pcrRecovery(t, tau, start)`.
- `BD.karvonen(frac, hrRest, hrMax)`, `BD.HR_ZONES`, `BD.banister(load[], {p0, k1, k2, tau1, tau2})` → `{fitness, fatigue, perf}`.

### 에너지와 체중
- `BD.bmr(kg, cm, age, sex, "mifflin"|"harris"|"katch", lbm)`, `BD.ORGANS`(장기 질량·대사율), `BD.METS`, `BD.metKcal(met, kg, h)`, `BD.weir(vo2L, vco2L)`(kcal/min), `BD.carbFrac(rq)`, `BD.MACRO`, `BD.tdee(bmr, pal)`, `BD.tef(g)`, `BD.kleiber(kg)`.
- `BD.weightSim({kg, fatFrac, cm, age, sex, pal, days, intake(숫자 또는 day → kcal), carbFrac, adapt, palAt(day)})` → `{day, bw, fat, lean, gly, ee, ei, linear, ei0}`(하루 간격).

### 혈당
- `BD.glucose({kg, gb, ib, si, sg, p2, n, gamma, first, meals:[{t, g, gi, fat}], insulin:[{t, u, long}], exercise:[{t0, t1, x}], tstop, dt})` 분 단위 → `{t, g, i, x, ra, uptake, peak, tPeak, auc, back}`. `BD.GLU`, `BD.GLU_PROFILES`(normal, ir, t2, t1).
- `BD.eag(a1c)`, `BD.a1cFromAvg(g)`, `BD.homa(g, i)`, `BD.glucoseClass(fpg)`, `BD.renalGlucose(plasma, {gfr, tm, sd})` → `{filtered, reabsorbed, excreted}`(mg/min).

### 신경
- `BD.hh({I(t), tstop, dt, gNa, gK, gL, temp, ttx, tea, every})` ms → `{t, v, m, h, n, ina, ik, spikes}`. `BD.conduction(d_um, myelin)`, `BD.FIBER_CLASSES`.
- `BD.lif(inputs[{t, w}], {tstop, thr, tau, tauSyn, refr})` → `{t, v, spikes}`(EPSP 하나 약 3.5 mV, 역치까지 15 mV).

### 호르몬
- `BD.pkBolus(doses[{t, amt}], th, tArr)`, `BD.pkOral(doses, th, thAbs, tArr)`, `BD.doseResponse(c, ec50, n, emax)`, `BD.occupancy(c, kd)`, `BD.HORMONES`(반감기 표).
- `BD.hpa({days, fb, delay, stress:[{t, dur, amp}], steroid, circ, adrenal})` 분 단위 → `{t, h, a, c, hour}`(코르티솔 오전 8시 약 16 µg/dL, 자정 약 3, ACTH 오전 약 35 pg/mL).
- `BD.pituitaryTSH(ft4, shift)`, `BD.thyroidFT4(tsh, gland, trab)`, `BD.hptEquilibrium(gland, trab, shift)` → `{ft4, tsh}`(정상 16 pmol/L, 1.5 mU/L), `BD.hptDynamics({days, gland(d), trab(d), dose(d)})` → `{day, ft4, tsh}`.
- `BD.feedback({sp, y0, base, gain, ki, delay, tau, kind: "neg"|"pos"|"open", dist(t), tstop, dt, umin, umax, ymin, ymax})` → `{t, y, u, d}` 일반 피드백 루프.

### 콩팥과 체액
- `BD.gfr({map, raff, reff, kf, pbs, pi, hct, autoreg})` → `{rbf, rpf, pgc, gfr, ff, net, piAvg}`(정상 GFR 약 124, RBF 1,100, FF 0.20).
- `BD.clearance(u, v, p)`, `BD.adh(posm, volDeficit)`, `BD.urineOsm(adh)`.
- `BD.waterBalance({kg, hours, drinks:[{t, ml, na}], sweat:[{t0, t1, mlh, na}], solute, insensible})` 분 단위 → `{t, posm, na, adh, uosm, urine(mL/min), tbw, thirst, cumUrine}`(물 1 L → 약 70분 뒤 소변 약 12 mL/min).

### 체온
- `BD.thermo({met(W), ta, rh, wind, clo, kg, cm, minutes, setpoint, sweatMax, schedule:[{t0, t1, met}], acclim, eff})` 분 단위 → `{t, core, skin, sweat(L/h), evap, dry, sbf, shiver, stored, loss, emax, set}`. `BD.heatIndex(tc, rh)`.

### 그리기
- `BD.monitor(ctx, box, {t:[t0, t1], traces:[{label, color, data: fn(t) | [[t, y]], range:[lo, hi], fill, width}], numerics:[{label, value, unit, color, alarm, sub}], sweep, gridDt})` → `{rows:[{X, Y, …}]}` 어두운 환자 모니터.
- `BD.body(ctx, cx, top, H, {organs: {heart: 색 | true, lungs, brain, liver, stomach, pancreas, adrenal, kidneys, gut, bladder, muscle, skin, thyroid}, labels, alpha, fill, stroke})` → 장기 위치(`{x, y, rx, ry, name}`) 사람 실루엣.
- `BD.heartDiagram(ctx, cx, cy, s, {lv, rv, la, ra(0~1 채움), mitral, tricuspid, aortic, pulmonic(열림), active: "atria"|"ventricles", wave(전도 0~1), labels})` 네 방 단면.
- `BD.gauge(ctx, cx, cy, r, value, {min, max, zones:[{to, color}], label, text})` 반원 계기판.
- `BD.flowDots(ctx, pts, phase, {color, gap, r})` 경로를 따라 흐르는 점.

## 점검
- `python3 tools/head.py <slug>` 로 head를 채운다.
- `python3 tools/check.py <slug>` (playwright 필요: `pip install playwright`). 넓은 화면·라이트와 360px·다크로 열어 콘솔 오류, 가로 넘침, 조작(슬라이더·버튼·끌기) 중 예외, 그려지지 않은 캔버스, id·data-desc 없는 시뮬레이터를 보고한다. `--shots 폴더`로 스크린샷을 남겨 **눈으로도 본다**(겹친 글자, 잘린 그림, 빈 그래프). **문제가 0이 될 때까지 고친다.**
- `python3 tools/sims.py` 로 갤러리 목록(`js/sims.js`)을 다시 만든다(data-desc 누락을 알려 준다).
- 엔진 값을 node로 확인할 때(저장소 `package.json`이 ES module이라 `require`가 안 된다):
```bash
node -e "const fs=require('fs');new Function(fs.readFileSync('js/body.js','utf8')).call(globalThis);const BD=globalThis.BD;console.log(BD.heart(BD.HEART_PRESETS.daon).sv)"
```
- 모바일(폭 360px)에서 가로 스크롤 금지. 캔버스 글자는 `BB.font()`로, 색은 `BB.palette()`·`BB.color()`로. 다크·라이트 모두 확인. 고정 색은 환자 모니터 화면(`BD.monitor`)처럼 실제로 어두운 경우에만.
