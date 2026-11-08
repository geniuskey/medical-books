# 외부 자료 출처 (assets/, js/atlas-data.js, js/sections-data.js)

이 책의 3D 모델과 해부 데이터는 AnatomyBook이 직접 그린 것이 아니라 자유 라이선스로 공개된 자료를 손질하고 계산한 것이다.
AnatomyBook 본문(CC BY 4.0)과 같은 조건으로 다시 쓸 수 있지만, 쓸 때는 아래 원저작자 표시를 함께 유지해야 한다.

## 원본

- **BodyParts3D 4.0**, © The Database Center for Life Science (DBCLS), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  — <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/> (라이선스: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>)
- 원저작자가 요청한 표시: "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
- 쓴 파일: `partof_BP3D_4.0_obj_99.zip`, `isa_BP3D_4.0_obj_99.zip`, `partof_element_parts.txt`, `isa_element_parts.txt`(그리고 13장의 설명을 위해 `*_parts_list_e.txt`, `*_inclusion_relation_list.txt`)
- 화면에 띄우는 3D 뷰어는 Google의 [model-viewer](https://modelviewer.dev/)(Apache-2.0)를 CDN에서 불러온다.

## 3D 모델 (`3d/*.glb`, 생성: `tools/bp3d_models.py`, MIT)

변경 사항: BodyParts3D 4.0 OBJ에서 부위를 골라 모델마다 묶고(같은 이름의 조각은 먼저 맞는 그룹이 가져감), 일부는 몸의 오른쪽 절반이나 높이 범위로 잘라 내고, 부위별로 색을 입히고, 면 수를 줄이고(quadric decimation), 축을 glTF(Y 위)로 바꾸고, glTF 바이너리로 저장해 좌표를 양자화했다.

| 파일 | 내용 | 쓰는 장 |
|---|---|---|
| `3d/systems.glb` | 몸 전체(계통별) | 01, 12, 13 |
| `3d/skeleton.glb` | 뼈대(부위별) | 02, 13 |
| `3d/skull.glb` | 머리뼈(뼈 하나하나) | 03 |
| `3d/spine.glb` | 척주, 척추원반 | 03 |
| `3d/ribcage.glb` | 가슴우리 | 03 |
| `3d/upperlimb.glb` | 오른팔의 뼈와 근육 | 04 |
| `3d/hand.glb` | 오른손의 뼈 | 04, 06 |
| `3d/shoulder.glb` | 오른쪽 어깨관절과 돌림근띠 | 04, 06 |
| `3d/lowerlimb.glb` | 오른다리의 뼈와 근육 | 05 |
| `3d/foot.glb` | 오른발의 뼈 | 05, 06 |
| `3d/knee.glb` | 오른쪽 무릎 | 05, 06 |
| `3d/trunkmuscles.glb` | 몸통과 목의 근육 | 07 |
| `3d/larynx.glb` | 후두 | 07 |
| `3d/thorax.glb` | 가슴 안 | 08, 12 |
| `3d/abdomen.glb` | 배 안 | 09, 12 |
| `3d/pelvis.glb` | 골반 안(남성) | 09 |
| `3d/brain.glb` | 뇌의 겉 | 10 |
| `3d/braindeep.glb` | 뇌의 속, 뇌실 | 10 |
| `3d/eye.glb` | 오른쪽 눈 | 10 |
| `3d/arteries.glb` | 동맥 | 11 |
| `3d/veins.glb` | 정맥 | 11 |

## 해부 데이터 (`../js/atlas-data.js`, `../js/sections-data.js`, 생성: `tools/bp3d_atlas.py`, MIT)

변경 사항: BodyParts3D 4.0 OBJ에서 계산했다.
- 구조별 부피·겉넓이·무게중심·경계 상자: 고른 조각을 합친 메시에서(같은 이름의 조각이 part-of와 is-a에 겹치면 하나만). 메시가 닫혀 있지 않은 구조는 부피가 어림값이다(`watertight: false`).
- 몸의 부피와 옆면 겉넓이: 피부 메시를 2 mm마다 가로로 잘라 바깥 윤곽의 넓이와 둘레를 쌓았다.
- 몸 지도: 면 수를 줄인 메시를 앞(x, z)·옆(y, z)으로 투영해 합친 윤곽을 단순화했다.
- 단면: 가로면(z, 10 mm 간격), 관상면(y), 시상면(x)으로 잘라 단순화한 다각형. 피부는 바깥 윤곽만 채웠다. 원본에 폐 실질이 없어 **"폐" 단면은 좌우 기관지 나무의 볼록 껍질로 어림한 영역**이다.
