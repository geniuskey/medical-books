# AnatomyBook — 몸의 구조

뼈, 근육, 장기, 뇌, 혈관. 몸 안에는 무엇이 어디에 어떤 모양으로 있나.
실제 인체를 측정해 만든 3D 데이터베이스 [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)(DBCLS, CC BY 4.0)로 몸의 구조를 배우는 한국어 인터랙티브 해부학 교과서입니다. 3D 모델을 **돌려 보고**, CT처럼 **잘라 보고**, 부피와 거리를 **직접 재 봅니다**.

같은 서가의 [BodyBook](../body/)(몸의 원리, 생리학)과 짝을 이룹니다. BodyBook이 "몸이 어떻게 돌아가나"를 다룬다면 이 책은 "몸 안에 무엇이 어디에 있나"를 다룹니다.

배포 주소: https://medical.euiyun.com/anatomy/

## 실행
빌드 과정이 없는 정적 사이트입니다. 3D 모델은 브라우저가 file://에서 읽지 못하므로 서가 저장소 루트에서 웹 서버로 엽니다.

```bash
python3 -m http.server 8000   # → http://localhost:8000/anatomy/
```
KaTeX, model-viewer, 폰트는 CDN에서 불러오므로 인터넷 연결이 필요합니다.

## 데이터와 3D 모델
모든 해부 구조는 BodyParts3D 4.0(한 성인 남성의 몸, FMA 해부학 용어 체계로 이름 붙은 OBJ 조각 수천 개)에서 나왔습니다. 생성기는 원본을 받아 둔 폴더에서 다시 실행할 수 있습니다(실행법은 각 파일 머리말).

- `tools/bp3d.py` — 원본 읽기(요소 이름, FMA 개념 → 요소, 선택 규칙) 공통 모듈
- `tools/bp3d_models.py` — 부위별로 묶고 색을 입혀 면 수를 줄인 3D 모델 21개 → `assets/3d/*.glb`
- `tools/bp3d_atlas.py` — 구조 약 140개의 부피·겉넓이·무게중심·경계 상자, 앞·옆 윤곽(몸 지도) → `js/atlas-data.js`; 가로·관상·시상면 1 cm 간격 단면 → `js/sections-data.js`

원본에 없는 구조(폐 실질, 갑상선, 말초신경, 일부 배벽 근육, 꼬리뼈, 인대 대부분 등)와 계산의 한계는 [CONTRIBUTING.md](CONTRIBUTING.md)와 13장에 정리했습니다. 출처와 변경 사항은 [assets/CREDITS.md](assets/CREDITS.md).

## 구성

| 장 | 파일 | 주제 |
|---|---|---|
| 01 | chapters/language.html | 해부학의 언어: 해부학적 자세, 방향 용어, 세 단면, 체강, 좌표 |
| 02 | chapters/skeleton.html | 뼈대: 206개의 뼈, 뼈의 모양과 일, 뼈의 부피와 비율 |
| 03 | chapters/axial.html | 머리뼈, 척주, 가슴우리 |
| 04 | chapters/upperlimb.html | 팔과 손 |
| 05 | chapters/lowerlimb.html | 다리와 발 |
| 06 | chapters/joints.html | 관절과 움직임, 지렛대 |
| 07 | chapters/trunk.html | 몸통과 목의 근육, 후두, 근육 이름 짓기 |
| 08 | chapters/thorax.html | 가슴 안: 심장과 폐의 자리 |
| 09 | chapters/abdomen.html | 배와 골반 안 |
| 10 | chapters/brain.html | 뇌와 눈 |
| 11 | chapters/vessels.html | 혈관의 지도 |
| 12 | chapters/sections.html | 단면으로 보는 몸(CT처럼 잘라 보기) |
| 13 | chapters/data.html | 계산하는 해부학: BodyParts3D, 온톨로지, 부피·거리 계산, 데이터의 한계 |
| 14 | chapters/glossary.html | 용어집 & 종합 퀴즈 |

공통 코드
- `css/style.css` — 디자인 토큰(라이트/다크)
- `js/common.js` — 내비게이션, 검색, 시뮬레이터만 보기, 캔버스·차트·끌기 헬퍼, 전역 `BB`
- `js/atlas.js` — 해부 데이터 도구, 전역 `AT`(구조 찾기, 거리·크기, 몸 지도 그리기·누르기, 단면 그리기·누르기)
- `js/anatomy3d.js` — 3D 해부 모델 뷰어(`.sim.model3d`, model-viewer를 지연 로딩)
- `js/sims.js` — 시뮬레이터 갤러리 목록(자동 생성: `python3 tools/sims.py`)
- `tools/head.py` — 챕터 `<head>`·사이트맵·JSON-LD 생성기, `tools/check.py` — 페이지 점검기
- `scripts/verify-data.cjs` — 해부 데이터 회귀 검사(서가의 `npm test`가 실행)

챕터 작성 규칙, 3D 모델의 부위 key, `AT` API는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.
3D 모델과 수치는 한 사람의 몸에서 나온 교육용 자료이며, 진단·치료 같은 의학적 판단의 근거가 아닙니다.

## 라이선스
실행 코드는 MIT, 본문·그림·문제·해설은 CC BY 4.0, 3D 모델과 해부 데이터는 BodyParts3D(© The Database Center for Life Science, CC BY 4.0)의 원저작자 표시를 따릅니다. 자세한 구분은 [LICENSE.md](LICENSE.md).
