# BodyBook 라이선스

Copyright (c) 2026 geniuskey and BodyBook contributors

이 프로젝트는 실행 코드와 교육 콘텐츠에 서로 다른 라이선스를 적용합니다. 아래 구분은 파일 확장자가 아니라 해당 부분의 용도에 따릅니다.

| 적용 대상 | 라이선스 | 범위 |
|---|---|---|
| 실행 코드 | [MIT](LICENSE-MIT) | JS·CSS·Python, HTML의 구조·레이아웃·이벤트 처리 코드, 인라인 스크립트, 시뮬레이터 및 그림을 생성하는 프로그램 코드 |
| 교육 콘텐츠 | [CC BY 4.0](LICENSE-CC-BY-4.0) | 교재 본문·그림·문제·해설·용어 정의·교육용 표와 데이터, README 및 작성 가이드의 설명 문장, SVG 그림 및 이미지(`og.png`, `favicon.svg` 포함). 단 `assets/`의 외부 그림·3D 모델은 아래 "외부 자료"의 원저작자 표시를 따른다 |

`index.html`과 `chapters/*.html`에는 두 종류가 함께 있습니다. HTML 구조와 실행 코드는 MIT, 그 안의 본문·그림·문제·해설은 CC BY 4.0입니다. JS에 포함된 교육용 문장·용어·문제·해설도 CC BY 4.0이며, 이를 표시하거나 처리하는 코드는 MIT입니다. 그림을 생성하는 코드를 재사용할 때는 MIT를, 교재의 그림 자체를 복제하거나 수정할 때는 CC BY 4.0을 적용합니다. 문서 안의 실행 코드 예제는 MIT입니다.

## 재사용 조건

- **코드:** 수정·재배포·상업적 이용이 가능합니다. 코드의 복사본이나 상당 부분을 배포할 때는 저작권 고지와 MIT 라이선스 전문을 유지하세요.
- **콘텐츠:** 복제·수정·번역·재배포·상업적 이용이 가능합니다. 공유할 때는 저작자, 제공된 저작권 및 보증 부인 고지, 출처, CC BY 4.0 라이선스를 표시하고 변경 여부와 기존 변경 표시를 유지하세요. 조건의 상세 내용은 라이선스 전문을 따릅니다.

콘텐츠 출처 표시 예시:

> BodyBook — geniuskey 및 BodyBook 기여자, https://medical.euiyun.com/body/ (원본: https://github.com/geniuskey/bodybook). CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . 자료는 현 상태로 제공되며 보증하지 않습니다. 변경 사항: 한국어 본문 일부를 번역하고 그림을 수정함.

수정하지 않은 자료에는 변경 사항을 “변경 없음”으로 표시할 수 있습니다. 특정 챕터를 사용할 때는 해당 챕터의 출처 URL을 함께 표시하세요.

## 외부 자료

별도의 저작권·라이선스 표시가 있는 외부 자료는 그 표시를 따릅니다. CDN에서 불러오는 KaTeX, model-viewer, Pretendard, JetBrains Mono 등 제3자 라이브러리·폰트에는 각 원저작자의 라이선스가 적용됩니다.

`assets/` 폴더의 그림과 3D 모델은 BodyBook의 저작물이 아니라 아래 공개 자료를 손질한 것입니다. 둘 다 CC BY 4.0이라 같은 조건으로 다시 쓸 수 있지만, 원저작자 표시를 유지해야 합니다. 파일별 출처와 변경 사항은 [assets/CREDITS.md](assets/CREDITS.md)에 있습니다.

| 자료 | 원저작자 | 라이선스 |
|---|---|---|
| `assets/3d/*.glb` 3D 해부 모델 | BodyParts3D, © The Database Center for Life Science | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `assets/figures/openstax-ap-*.webp` 해부·생리 그림 | OpenStax, *Anatomy and Physiology*(Rice University) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

라이선스 공식 문서: [MIT](https://opensource.org/license/mit), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
