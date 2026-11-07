# 외부 자료 출처 (assets/)

이 폴더의 그림과 3D 모델은 BodyBook이 직접 그린 것이 아니라 자유 라이선스로 공개된 자료를 가져와 손질한 것이다.
BodyBook 본문(CC BY 4.0)과 같은 조건으로 다시 쓸 수 있지만, 쓸 때는 아래 원저작자 표시를 함께 유지해야 한다.

## 3D 해부 모델 (`3d/*.glb`)

- 원본: **BodyParts3D**, © The Database Center for Life Science (DBCLS), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  — <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/> (라이선스: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>)
- 원저작자가 요청한 표시: "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
- 변경 사항: BodyParts3D 4.0 OBJ(part-of, is-a 데이터)에서 부위를 골라 모델마다 묶고, 부위별로 색을 입히고,
  면 수를 줄이고(quadric decimation), 축을 glTF(Y 위)로 바꾸고, glTF 바이너리로 저장해 좌표를 양자화했다.
  생성 스크립트: `tools/bp3d_models.py`(MIT).
- 원본 데이터에 폐 실질과 갑상선 표면 모델이 없어 폐 모델은 기관지 나무와 폐혈관으로, 내분비 모델은 갑상선 없이 만들었다.
- 화면에 띄우는 뷰어는 Google의 [model-viewer](https://modelviewer.dev/)(Apache-2.0)를 CDN에서 불러온다.

| 파일 | 쓰는 장 |
|---|---|
| `3d/heart.glb` | 04 heart |
| `3d/vessels.glb` | 06 vessels |
| `3d/lungs.glb` | 08 lungs |
| `3d/muscles.glb` | 11 muscle |
| `3d/digestive.glb` | 15 glucose |
| `3d/nervous.glb` | 16 nerve |
| `3d/endocrine.glb` | 17 hormone |
| `3d/urinary.glb` | 18 kidney |
| `3d/body.glb` | 01 overview |

## 그림 (`figures/openstax-ap-*.webp`)

- 원본: **OpenStax, _Anatomy and Physiology_** (J. Gordon Betts 외, Rice University, 2013), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  — <https://openstax.org/details/books/anatomy-and-physiology>
- 원본 다운로드: <https://openstax.org/books/anatomy-and-physiology/pages/1-introduction>
- 이 책의 1판만 CC BY 4.0이다(2판은 CC BY-NC-SA 4.0이라 쓰지 않았다). 캡션에 제3자 저작권 표시(© 2012 University of Michigan Medical School 현미경 사진, credit: …)가 있는 그림은 쓰지 않거나 그 부분을 잘라 냈다.
- 그림 안의 영어 이름표는 원본 그대로 두고, 각 장의 캡션에 한국어 설명과 용어 대응표("그림 속 영어")를 붙였다.

| 파일 | 원본 그림 | 원본 쪽 | 쓰는 장 | 변경 |
|---|---|---|---|---|
| `figures/openstax-ap-1-3.webp` | 그림 1.3 Levels of Structural Organization of the Human Body | [1-2-structural-organization-of-the-human-body](https://openstax.org/books/anatomy-and-physiology/pages/1-2-structural-organization-of-the-human-body) | 01 overview | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-1-10.webp` | 그림 1.10 Negative Feedback Loop | [1-5-homeostasis](https://openstax.org/books/anatomy-and-physiology/pages/1-5-homeostasis) | 02 homeostasis | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-3-4.webp` | 그림 3.4 Cell Membrane | [3-1-the-cell-membrane](https://openstax.org/books/anatomy-and-physiology/pages/3-1-the-cell-membrane) | 03 cell | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-3-9.webp` | 그림 3.9 Sodium-Potassium Pump | [3-1-the-cell-membrane](https://openstax.org/books/anatomy-and-physiology/pages/3-1-the-cell-membrane) | 03 cell | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-10-5.webp` | 그림 10.5 The Sarcomere | [10-2-skeletal-muscle](https://openstax.org/books/anatomy-and-physiology/pages/10-2-skeletal-muscle) | 11 muscle | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-10-12.webp` | 그림 10.12 Muscle Metabolism | [10-3-muscle-fiber-contraction-and-relaxation](https://openstax.org/books/anatomy-and-physiology/pages/10-3-muscle-fiber-contraction-and-relaxation) | 12 exercise | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-12-8.webp` | 그림 12.8 Parts of a Neuron | [12-2-nervous-tissue](https://openstax.org/books/anatomy-and-physiology/pages/12-2-nervous-tissue) | 16 nerve | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-17-2.webp` | 그림 17.2 Endocrine System | [17-1-an-overview-of-the-endocrine-system](https://openstax.org/books/anatomy-and-physiology/pages/17-1-an-overview-of-the-endocrine-system) | 17 hormone | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-17-4.webp` | 그림 17.4 Binding of Lipid-Soluble Hormones | [17-2-hormones](https://openstax.org/books/anatomy-and-physiology/pages/17-2-hormones) | 17 hormone | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-17-5.webp` | 그림 17.5 Binding of Water-Soluble Hormones | [17-2-hormones](https://openstax.org/books/anatomy-and-physiology/pages/17-2-hormones) | 17 hormone | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-17-19.webp` | 그림 17.19 Homeostatic Regulation of Blood Glucose Levels | [17-9-the-endocrine-pancreas](https://openstax.org/books/anatomy-and-physiology/pages/17-9-the-endocrine-pancreas) | 15 glucose | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-19-4.webp` | 그림 19.4 Dual System of the Human Blood Circulation | [19-1-heart-anatomy](https://openstax.org/books/anatomy-and-physiology/pages/19-1-heart-anatomy) | 04 heart | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-19-18.webp` | 그림 19.18 Conduction System of the Heart | [19-2-cardiac-muscle-and-electrical-activity](https://openstax.org/books/anatomy-and-physiology/pages/19-2-cardiac-muscle-and-electrical-activity) | 05 ecg | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-19-23.webp` | 그림 19.23 Electrocardiogram | [19-2-cardiac-muscle-and-electrical-activity](https://openstax.org/books/anatomy-and-physiology/pages/19-2-cardiac-muscle-and-electrical-activity) | 05 ecg | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-19-35.webp` | 그림 19.35 Summary of Major Factors Influencing Cardiac Output | [19-4-cardiac-physiology](https://openstax.org/books/anatomy-and-physiology/pages/19-4-cardiac-physiology) | 07 flow | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-20-3.webp` | 그림 20.3 Structure of Blood Vessels | [20-1-structure-and-function-of-blood-vessels](https://openstax.org/books/anatomy-and-physiology/pages/20-1-structure-and-function-of-blood-vessels) | 06 vessels | WebP 변환, 폭 1200px 이하로 축소, 현미경 사진 (c) 잘라 냄 |
| `figures/openstax-ap-20-10.webp` | 그림 20.10 Systemic Blood Pressure | [20-2-blood-flow-blood-pressure-and-resistance](https://openstax.org/books/anatomy-and-physiology/pages/20-2-blood-flow-blood-pressure-and-resistance) | 06 vessels | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-22-10.webp` | 그림 22.10 Respiratory Zone | [22-1-organs-and-structures-of-the-respiratory-system](https://openstax.org/books/anatomy-and-physiology/pages/22-1-organs-and-structures-of-the-respiratory-system) | 08 lungs | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-22-13.webp` | 그림 22.13 Gross Anatomy of the Lungs | [22-2-the-lungs](https://openstax.org/books/anatomy-and-physiology/pages/22-2-the-lungs) | 08 lungs | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-22-16.webp` | 그림 22.16 Intrapulmonary and Intrapleural Pressure Relationships | [22-3-the-process-of-breathing](https://openstax.org/books/anatomy-and-physiology/pages/22-3-the-process-of-breathing) | 08 lungs | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-22-20.webp` | 그림 22.20 Respiratory Centers of the Brain | [22-3-the-process-of-breathing](https://openstax.org/books/anatomy-and-physiology/pages/22-3-the-process-of-breathing) | 10 breathing | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-22-21.webp` | 그림 22.21 Partial and Total Pressures of a Gas | [22-4-gas-exchange](https://openstax.org/books/anatomy-and-physiology/pages/22-4-gas-exchange) | 09 gas | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-22-22.webp` | 그림 22.22 External Respiration | [22-4-gas-exchange](https://openstax.org/books/anatomy-and-physiology/pages/22-4-gas-exchange) | 09 gas | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-24-20.webp` | 그림 24.20 Catabolic and Anabolic Pathways | [24-4-protein-metabolism](https://openstax.org/books/anatomy-and-physiology/pages/24-4-protein-metabolism) | 13 metabolism | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-24-23.webp` | 그림 24.23 Hypothalamus Controls Thermoregulation | [24-6-energy-and-heat-balance](https://openstax.org/books/anatomy-and-physiology/pages/24-6-energy-and-heat-balance) | 19 thermo | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-25-10.webp` | 그림 25.10 Blood Flow in the Nephron | [25-3-gross-anatomy-of-the-kidney](https://openstax.org/books/anatomy-and-physiology/pages/25-3-gross-anatomy-of-the-kidney) | 18 kidney | WebP 변환, 폭 1200px 이하로 축소 |
| `figures/openstax-ap-26-16.webp` | 그림 26.16 Respiratory Regulation of Blood pH | [26-4-acid-base-balance](https://openstax.org/books/anatomy-and-physiology/pages/26-4-acid-base-balance) | 10 breathing | WebP 변환, 폭 1200px 이하로 축소 |
