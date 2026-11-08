# BodyBook — 몸의 원리

심장, 폐, 근육, 호르몬. 몸은 어떻게 돌아가나.
심박수와 혈류, 호흡과 산소 운반, 근육의 힘, 에너지 대사 계산, 혈당과 인슐린, 호르몬 피드백 루프를 시뮬레이터로 직접 돌려 보며 배우는 한국어 인터랙티브 생리학 교과서입니다.
모든 장이 같은 생리 엔진(`js/body.js`)을 씁니다. 심장의 시변 탄성 모델, 압반사, 산소 해리 곡선, 폐 역학, 근육 수축, 운동 대사, 체중 동역학, 혈당-인슐린 최소 모델, 호지킨-헉슬리 신경, HPA·HPT 호르몬 축, 사구체 여과와 수분 균형, 체온 조절이 그 안에 들어 있습니다.
책 전체가 가상의 인물 한 명(정다온, 34세)이 12주 뒤 10 km 달리기 대회를 준비하는 과정을 계통별로 따라가고, 20장 실험실에서는 독자가 대회 날을 직접 돌려 봅니다.

글을 읽지 않고 시뮬레이터만 쓰는 독자를 위해 두 가지 길을 둡니다.
- **시뮬레이터 갤러리**(`sims.html`): 모든 시뮬레이터를 카드로 모아 검색하고 바로 엽니다.
- **시뮬레이터만 보기**: 챕터 상단 버튼 하나로 글·퀴즈를 숨기고 시뮬레이터만 남깁니다.

"살아가는 지식" 갈래의 건강 분야 첫 권입니다([MoneyBook](https://money.euiyun.com/money/)과 같은 갈래, 전체 목록은 [books.euiyun.com](https://books.euiyun.com/)).

배포 주소: https://medical.euiyun.com/body/

## 실행
빌드 과정이 없는 정적 사이트입니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```
`index.html`을 브라우저로 바로 열어도 동작합니다(3D 모델만은 브라우저가 file://에서 모델 파일을 읽지 못해 웹 서버로 열어야 보입니다). KaTeX, model-viewer, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 그림과 3D 모델
해부 구조는 직접 그리지 않고 자유 라이선스로 공개된 자료를 씁니다.
- **3D 해부 모델**: 일본 DBCLS의 [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)(CC BY 4.0)에서 부위를 골라 색을 입히고 가볍게 만든 12개 모델을 11개 장에 넣었습니다. 돌리고, 부위를 켜고 끄고, 벽을 반투명하게 해 안을 볼 수 있습니다.
- **해부·생리 그림**: [OpenStax *Anatomy and Physiology*](https://openstax.org/details/books/anatomy-and-physiology)(CC BY 4.0)의 그림 27개를 18개 장에 넣었습니다. 영어 이름표는 캡션의 "그림 속 영어"에서 한국어로 풉니다.
- 직접 그린 정적 그림은 이 책 고유의 숫자를 담은 도표(다온의 하루 에너지, 체액 구획 수치, 에너지 장부 등)만 남겼습니다. 시뮬레이터 안의 그림은 값에 따라 움직여야 하므로 계속 캔버스로 그립니다.

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/overview.html | 몸이라는 기계: 기관계 지도, 하루의 숫자, 몸의 구성, 크기와 대사 |
| 02 | chapters/homeostasis.html | 항상성과 피드백: 설정점, 음성·양성 피드백, 이득과 지연 |
| 03 | chapters/cell.html | 세포: 확산, 삼투, 나트륨-칼륨 펌프, 막전위 |
| 04 | chapters/heart.html | 심장: 심장 주기, 위거스 도표, 압력-부피 고리, 프랭크-스탈링 |
| 05 | chapters/ecg.html | 심장의 전기와 심전도: 동방결절, 자율신경, 전도, 부정맥 |
| 06 | chapters/vessels.html | 혈관과 혈압: 푸아죄유, 동맥 탄성, 혈압 측정, 압반사 |
| 07 | chapters/flow.html | 심박수와 혈류: 심박출량, 충만 시간, 혈류 배분, 심박 구간 |
| 08 | chapters/lungs.html | 폐: 호흡 역학, 폐활량 측정, 사강, 표면장력 |
| 09 | chapters/gas.html | 가스 교환과 산소 운반: 폐포 가스식, 확산, 헤모글로빈 |
| 10 | chapters/breathing.html | 호흡 조절과 산염기: 화학수용체, 숨 참기, pH |
| 11 | chapters/muscle.html | 근육: 교차다리, 연축과 강축, 길이-장력, 힘-속도, 운동 단위 |
| 12 | chapters/exercise.html | 운동하는 몸: 에너지 시스템, 산소 섭취 동역학, 젖산 역치, 훈련 |
| 13 | chapters/metabolism.html | 에너지 대사 계산: 기초대사량, METs, 호흡 교환율 |
| 14 | chapters/weight.html | 에너지 균형과 체중: 체중 동역학, 적응 열생성 |
| 15 | chapters/glucose.html | 혈당과 인슐린: 최소 모델, 인슐린 저항성, 당뇨병 |
| 16 | chapters/nerve.html | 신경: 활동 전위, 전도 속도, 시냅스, 반사, 자율신경 |
| 17 | chapters/hormone.html | 호르몬과 피드백 루프: HPA 축, 코르티솔, 갑상선, 반감기 |
| 18 | chapters/kidney.html | 콩팥과 체액: 사구체 여과, 청소율, 항이뇨 호르몬 |
| 19 | chapters/thermo.html | 체온 조절: 열 균형, 땀과 습도, 열사병, 발열 |
| 20 | chapters/lab.html | 인체 실험실: 모든 계통을 이은 가상 인체 |
| 21 | chapters/glossary.html | 용어집, 정상 참고값, 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크), 계통·모니터·생리 물질 색
- `js/common.js` — 내비게이션, 검색, 시뮬레이터만 보기, 캔버스·차트·막대·도넛·끌기 헬퍼, 전역 `BB`
- `js/body.js` — 생리 엔진, 전역 `BD`(참고값, 심장·순환·호흡·근육·운동·대사·혈당·신경·호르몬·콩팥·체온 모델, 환자 모니터·인체·심장 그림)
- `js/anatomy3d.js` — 3D 해부 모델 뷰어(`.sim.model3d`, model-viewer를 지연 로딩)
- `js/sims.js` — 시뮬레이터 갤러리 목록(자동 생성)
- `assets/3d/` — 3D 해부 모델(BodyParts3D, CC BY 4.0) 12개: 몸 전체, 심장, 혈관, 기관지·폐혈관, 호흡근, 호흡 조절, 골격근, 다리 근육, 소화 기관, 뇌, 내분비샘, 콩팥·요로
- `assets/figures/` — 해부·생리 그림(OpenStax *Anatomy and Physiology*, CC BY 4.0). 출처는 [assets/CREDITS.md](assets/CREDITS.md)
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기
- `tools/sims.py` — 갤러리 목록 생성기
- `tools/check.py` — 페이지 점검기(콘솔 오류, 가로 넘침, 조작 중 예외)
- `tools/shots.py` — 시뮬레이터·그림 스크린샷
- `tools/bp3d_models.py` — BodyParts3D 원본에서 `assets/3d/*.glb`를 만드는 생성기

챕터 작성 규칙과 엔진 API는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
시뮬레이터의 수치는 건강한 성인의 교과서 대표값과 교육용 근사 모델이며, 진단·치료·운동 처방 같은 의학적 조언이 아닙니다. 등장인물 다온은 가상의 인물입니다.

## 배포 (GitHub Pages)
저장소 루트가 사이트입니다. 시리즈 공통 빌드 도구 [`@euiyun/book`](https://github.com/geniuskey/book)이 `.book-dist/`를 만들고 GitHub Actions(`.github/workflows/pages.yml`)가 Pages로 배포합니다. `CNAME`에 `bodybook.euiyun.com`이 들어 있습니다.

```bash
npm ci && npm run build   # → .book-dist/
```

## 용어집과 본문 뜻풀이

용어 정의는 `js/glossary-data.js`의 `window.BOOK_GLOSSARY`에 저장합니다. 용어집과 본문 뜻풀이가 같은 데이터를 사용하며, 본문에서 용어에 마우스를 올리거나 키보드로 포커스하거나 모바일에서 탭하면 정의를 확인할 수 있습니다. 공통 동작과 스타일은 `js/glossary-tooltips.js`, `css/glossary-tooltips.css`입니다. 데이터 형식은 시리즈 공통 v1이며, 각 항목은 `ko`(이름), `en`(영문명), `abbr`(약어), `def`(정의), `chapters`(관련 장 목록)를 갖습니다. 이름이 반복되면 한 번만 표시하고, 묶음 항목은 가리킨 이름을 제목에 표시하며 구분에 필요한 비교 설명을 함께 제공합니다.

## 라이선스

Copyright (c) 2026 geniuskey and BodyBook contributors

| 적용 대상 | 라이선스 | 재사용 조건 |
|---|---|---|
| JS·CSS·Python·HTML의 실행 코드 | [MIT](LICENSE-MIT) | 수정·재배포·상업적 이용 가능. 저작권 및 라이선스 고지 유지 |
| 교재 본문·그림·문제·해설 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 수정·번역·재배포·상업적 이용 가능. 저작자·출처·라이선스 표시 및 변경 사실 명시 |
| `assets/`의 외부 그림·3D 모델 | CC BY 4.0(원저작자: OpenStax, DBCLS) | 위와 같고, 원저작자 표시를 함께 유지([assets/CREDITS.md](assets/CREDITS.md)) |

자세한 내용은 [라이선스 안내](LICENSE.md)를 참고하세요.
