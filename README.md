# MedicalBooks · 의학·건강 교과서 서가

심장과 혈관, 폐와 산소, 혈당과 호르몬, 운동과 체중까지. 가상 인체를 직접 움직이며 배우는 한국어 인터랙티브 의학·건강 교과서를 한 저장소에서 관리합니다. 홈은 MoneyBooks·SemiBooks의 책장·검색·실습·읽는 순서 구성을 따릅니다.

서비스 주소: **https://medical.euiyun.com/** · 책 한 권의 홈은 **`/{slug}/`**, 각 장은 **`/{slug}/chapters/{chapter}.html`**입니다.

## 수록 책

| 경로 | 책 | 서가 분야 | 처음 가져온 곳 |
|---|---|---|---|
| `/body/` | BodyBook · 몸의 원리 교과서 | 몸의 원리 | `geniuskey/bodybook` |

준비 중인 책은 `roadmap.json`에 적습니다(지금은 비어 있음). 새 책을 이 저장소에서 쓰면 `book.json`의 `books`와 `shared/js/shelf.js`의 서가 분야를 함께 늘립니다.

## 구성

```text
index.html, shelf.css                  서가 홈: 책장·검색, 대표 실험, 읽는 순서
catalog.js                            생성된 책 목록(직접 수정하지 않음)
book.json                             서가 메타데이터, 각 책의 book.json 목록
roadmap.json                          준비 중인 책
migration/books.json                  책마다 slug·서가 정보(표지 motif·색·서가 분야)와 원본 저장소, 주소 바꾸기 규칙
migration/import-state.json           가져온 파일의 원본 커밋과 해시
shared/js/shelf.js                    서가 홈의 책장 렌더링·필터
shared/js/covers.js                   SVG 책 표지(geniuskey/books 포털 코드)
shared/js/book-shell.js               모든 책 상단 바·서랍의 ‘의학 서가’ 연결
shared/img/sims/                      홈 ‘직접 해보기’의 시뮬레이터 화면
{slug}/                               각 책의 본문, 계산 엔진, 3D 모델·그림(assets/), 책별 회귀 검사(scripts/)
tools/import-books.py                 개별 저장소에서 가져오기(원본은 읽기만 함, 이 저장소의 수정은 덮어쓰지 않음)
tools/sync-catalog.py                 catalog.js 생성(migration/books.json + roadmap.json, 장·시뮬레이터 수는 소스에서 셈)
tools/sync-sitemap.py                 루트 사이트맵 생성
tools/build.mjs                       정적 배포물(.book-dist/) 생성, 분석 태그 추가
tools/check.py                        메타데이터·링크 정적 검사
tools/factcheck.cjs                   각 책의 scripts/*.cjs 회귀 검사 실행
tools/browser-check.cjs               데스크톱·모바일 브라우저 검사(Playwright)
tools/og.mjs                          서가 공유 이미지 og.png 생성(Playwright)
```

## 실행과 배포

```bash
npm ci
npm test
npm run build
python3 -m http.server 8000 --directory .book-dist
node tools/browser-check.cjs            # Playwright 필요(PW_PATH 또는 ../book 체크아웃)
```

배포물은 `.book-dist/`입니다. GitHub Pages의 Source를 GitHub Actions로 설정하고 커스텀 도메인 `medical.euiyun.com`과 DNS를 연결합니다. `main`에 push하거나 Deploy Book 워크플로를 실행하면 검사·빌드 후 배포합니다. 이 저장소의 CNAME 설정만으로 DNS나 GitHub 설정이 자동으로 바뀌지는 않습니다.

BodyBook은 가져올 때의 canonical·Open Graph·구조화 데이터와 CDN 의존성(model-viewer 등)을 그대로 씁니다(주소만 `medical.euiyun.com/body/`로 바꿈). 책 안의 `tools/` 스크립트는 개별 저장소 시절의 도구로, 서가 빌드에는 쓰지 않습니다.

책·장·시뮬레이터 수가 바뀌면 `npm run catalog`, `npm run sitemap`, `node tools/og.mjs`로 목록과 공유 이미지를 갱신합니다.

## 가져온 책

BodyBook은 2026-11-07에 개별 저장소에서 `tools/import-books.py --write`로 가져왔습니다. 지금부터는 이 저장소에서 직접 고칩니다. 가져올 때 바꾼 것은 다음뿐입니다.

- 옛 주소(`https://bodybook.euiyun.com/`)를 `https://medical.euiyun.com/body/`로 바꾸고, 본문 링크는 `/body/…` 같은 사이트 안 경로로 바꿨습니다.
- 다른 서가로 옮겨 간 책의 옛 주소를 새 주소로 바꿨습니다(`migration/books.json`의 `pathAliases`): MoneyBook → `money.euiyun.com/money/`, CarBook → `system.euiyun.com/car/`, SensorBook → `semi.euiyun.com/sensor/`, AIBook → `computing.euiyun.com/ai/`.
- 쪽마다 `shared/css/book-shell.css`·`shared/js/book-shell.js`를 붙여 상단 바의 ‘전체 책’ 버튼을 ‘의학 서가’로 바꿨습니다. Cloudflare 비컨은 지우고 빌드가 분석 태그를 붙입니다.
- 테마 저장 키를 `medical-theme`으로 바꿨습니다. 책의 `book.json`은 서가 주소·저장소·`basePath`로 바꿨습니다.

원본 저장소를 지우기 전까지는 `npm run import:check`로 원본과 달라진 곳을 확인할 수 있습니다. 원본을 지운 뒤에는 MathBooks처럼 `tools/import-books.py`와 `migration/import-state.json`을 지우고, 서가 정보가 든 `migration/books.json`만 남깁니다.

## 라이선스

코드는 MIT, 교육 콘텐츠는 CC BY 4.0입니다. [라이선스 안내](LICENSE.md)와 BodyBook의 저작권 표시, `body/assets/CREDITS.md`를 참고하세요. 시뮬레이터 수치는 교육용 근사 모델이며 의학적 진단·치료를 대신하지 않습니다.
