#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and AnatomyBook contributors. MIT (see ../LICENSE-MIT).
"""BodyParts3D OBJ -> js/atlas-data.js, js/sections-data.js (계산하는 해부 데이터 생성기).

실행: python3 tools/bp3d_atlas.py <bp3d>      (필요: pip install trimesh fast-simplification shapely)
- atlas-data.js  : window.AT_DATA = {parts, maps, meta}
    parts: 구조마다 부피(mL), 겉넓이(cm²), 무게중심·경계 상자(mm), 요소 수, 계통
    maps : 앞(front: x,z)·옆(side: y,z)에서 본 윤곽(다각형, mm 정수)
- sections-data.js: window.AT_SECTIONS = {axial, coronal, sagittal}
    면마다 일정 간격의 단면 윤곽(그룹 번호와 다각형), CT처럼 칠하기 위한 그룹 색·이름
좌표는 원본 그대로(mm, z 위, -y 앞, -x 몸의 오른쪽).
"""
import json, os, re, sys
from collections import Counter
import numpy as np
import trimesh
import fast_simplification
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import bp3d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = lambda name: rf"^Right {name}$"

# key, 한국어, 영어, 계통, 선택 규칙 ------------------------------------------------------------
P = []
CLIP_RIGHT = {"eyeball", "scm"}  # 정중선 오른쪽(x < 0) 면만 남길 구조(원본의 오른쪽 조각에 왼쪽 면이 섞인 것)


def part(key, ko, en, sys_, *sel):
    P.append(dict(k=key, ko=ko, en=en, sys=sys_, sel=list(sel)))

# 뼈(짝이 있는 뼈는 오른쪽)
part("skull", "머리뼈(아래턱 제외)", "Skull", "bone", "FMA46565")
part("frontal", "이마뼈", "Frontal bone", "bone", r"^Frontal bone$")
part("parietal", "마루뼈", "Parietal bone", "bone", R("parietal bone"))
part("temporal", "관자뼈", "Temporal bone", "bone", R("temporal bone"))
part("occipital", "뒤통수뼈", "Occipital bone", "bone", r"^Occipital bone$")
part("sphenoid", "나비뼈", "Sphenoid bone", "bone", r"^Sphenoid bone$")
part("mandible", "아래턱뼈", "Mandible", "bone", r"^Mandible$")
part("hyoid", "목뿔뼈", "Hyoid bone", "bone", r"^Hyoid bone$")
for i, n in enumerate(["Atlas", "Axis", "Third cervical vertebra", "Fourth cervical vertebra", "Fifth cervical vertebra", "Sixth cervical vertebra", "Seventh cervical vertebra"], 1):
    part(f"c{i}", f"목뼈 C{i}" + (" (고리뼈)" if i == 1 else " (중쇠뼈)" if i == 2 else ""), n, "bone", rf"^{n}$")
ORD = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth"]
for i in range(12):
    part(f"t{i+1}", f"등뼈 T{i+1}", f"{ORD[i]} thoracic vertebra", "bone", rf"^{ORD[i]} thoracic vertebra$")
for i in range(5):
    part(f"l{i+1}", f"허리뼈 L{i+1}", f"{ORD[i]} lumbar vertebra", "bone", rf"^{ORD[i]} lumbar vertebra$")
part("sacrum", "엉치뼈", "Sacrum", "bone", r"^Sacrum$")
for i in range(12):
    part(f"rib{i+1}", f"{i+1}번 갈비뼈", f"{ORD[i]} rib", "bone", R(f"{ORD[i].lower()} rib"))
part("sternum", "복장뼈", "Sternum", "bone", r"^Manubrium$|^Body of sternum$|^Xiphoid process$")
part("clavicle", "빗장뼈", "Clavicle", "bone", R("clavicle"))
part("scapula", "어깨뼈", "Scapula", "bone", R("scapula"))
part("humerus", "위팔뼈", "Humerus", "bone", R("humerus"))
part("radius", "노뼈", "Radius", "bone", R("radius"))
part("ulna", "자뼈", "Ulna", "bone", R("ulna"))
for k, ko in [("scaphoid", "손배뼈"), ("lunate", "반달뼈"), ("triquetral", "세모뼈"), ("pisiform", "콩알뼈"), ("trapezium", "큰마름뼈"), ("trapezoid", "작은마름뼈"), ("capitate", "알머리뼈"), ("hamate", "갈고리뼈")]:
    part(k, ko, k.capitalize(), "bone", R(k))
part("metacarpals", "손허리뼈(5개)", "Metacarpals", "bone", r"^Right \w+ metacarpal bone$")
part("fingers", "손가락뼈(14개)", "Phalanges of hand", "bone", r"phalanx of right (thumb|index finger|middle finger|ring finger|little finger)$")
part("hipbone", "볼기뼈", "Hip bone", "bone", R("hip bone"))
part("femur", "넙다리뼈", "Femur", "bone", R("femur"))
part("patella", "무릎뼈", "Patella", "bone", R("patella"))
part("tibia", "정강뼈", "Tibia", "bone", R("tibia"))
part("fibula", "종아리뼈", "Fibula", "bone", R("fibula"))
part("talus", "목말뼈", "Talus", "bone", R("talus"))
part("calcaneus", "발꿈치뼈", "Calcaneus", "bone", R("calcaneus"))
part("navicular", "발배뼈", "Navicular", "bone", r"^Navicular bone of right foot$")
part("cuboid", "입방뼈", "Cuboid", "bone", R("cuboid bone"))
part("cuneiforms", "쐐기뼈(3개)", "Cuneiforms", "bone", r"^Right (medial|intermediate|lateral) cuneiform bone$")
part("metatarsals", "발허리뼈(5개)", "Metatarsals", "bone", r"^Right \w+ metatarsal bone$")
part("toes", "발가락뼈(14개)", "Phalanges of foot", "bone", r"phalanx of right (big toe|second toe|third toe|fourth toe|little toe)$")
part("teeth", "치아(28개)", "Teeth", "bone", "FMA12516")
part("disc_l4", "L4–L5 사이 원반", "Intervertebral disk of L4", "bone", r"^Intervertebral disk of fourth lumbar vertebra$")
# 근육(오른쪽)
for k, ko, en, rx in [
    ("deltoid", "어깨세모근", "Deltoid", r"part of right deltoid$"),
    ("pecmajor", "큰가슴근", "Pectoralis major", r"part of right pectoralis major$"),
    ("biceps", "위팔두갈래근", "Biceps brachii", r"head of right biceps brachii$"),
    ("triceps", "위팔세갈래근", "Triceps brachii", r"head of right triceps brachii$"),
    ("brachialis", "위팔근", "Brachialis", R("brachialis")),
    ("brachioradialis", "위팔노근", "Brachioradialis", R("brachioradialis")),
    ("supraspinatus", "가시위근", "Supraspinatus", R("supraspinatus")),
    ("infraspinatus", "가시아래근", "Infraspinatus", R("infraspinatus muscle")),
    ("subscapularis", "어깨밑근", "Subscapularis", R("subscapularis")),
    ("trapezius", "등세모근", "Trapezius", r"part of right trapezius$"),
    ("serratus", "앞톱니근", "Serratus anterior", R("serratus anterior")),
    ("scm", "목빗근", "Sternocleidomastoid", R("sternocleidomastoid")),
    ("diaphragm", "횡격막", "Diaphragm", r"^Diaphragm$"),
    ("extoblique", "배바깥빗근", "External oblique", R("external oblique")),
    ("psoas", "큰허리근", "Psoas major", R("psoas major")),
    ("iliacus", "엉덩근", "Iliacus", R("iliacus")),
    ("gmax", "큰볼기근", "Gluteus maximus", R("gluteus maximus")),
    ("gmed", "중간볼기근", "Gluteus medius", R("gluteus medius")),
    ("rectusfem", "넙다리곧은근", "Rectus femoris", R("rectus femoris")),
    ("vastlat", "가쪽넓은근", "Vastus lateralis", R("vastus lateralis")),
    ("vastmed", "안쪽넓은근", "Vastus medialis", R("vastus medialis")),
    ("vastint", "중간넓은근", "Vastus intermedius", R("vastus intermedius")),
    ("bicepsfem", "넙다리두갈래근", "Biceps femoris", r"head of right biceps femoris$"),
    ("semitend", "반힘줄근", "Semitendinosus", R("semitendinosus")),
    ("semimem", "반막근", "Semimembranosus", R("semimembranosus")),
    ("addmagnus", "큰모음근", "Adductor magnus", R("adductor magnus")),
    ("sartorius", "넙다리빗근", "Sartorius", R("sartorius")),
    ("gracilis", "두덩정강근", "Gracilis", R("gracilis")),
    ("gastroc", "장딴지근", "Gastrocnemius", r"head of right gastrocnemius$"),
    ("soleus", "가자미근", "Soleus", R("soleus")),
    ("tibant", "앞정강근", "Tibialis anterior", R("tibialis anterior")),
    ("erector", "척주세움근(오른쪽)", "Erector spinae", r"^Right (iliocostalis|longissimus)|^Right spinalis"),
]:
    part(k, ko, en, "muscle", rx)
# 장기·신경·혈관
for k, ko, en, s_, rx in [
    ("brain", "뇌 전체", "Brain", "nerve", "FMA50801"),
    ("cerebellum", "소뇌", "Cerebellum", "nerve", r"^Cerebellum$"),
    ("brainstem", "뇌줄기", "Brainstem", "nerve", r"^(Midbrain|Pons|Medulla oblongata)$"),
    ("thalamus", "시상(오른쪽)", "Thalamus", "nerve", R("thalamus")),
    ("hippocampus", "해마(오른쪽)", "Hippocampus", "nerve", R("hippocampus")),
    ("ventricles", "뇌실", "Ventricles", "nerve", r"lateral ventricle$|^Third ventricle$|^Fourth ventricle$|^Cerebral aqueduct$"),
    ("pituitary", "뇌하수체", "Pituitary gland", "nerve", r"^Pituitary gland$"),
    ("eyeball", "눈알(오른쪽)", "Eyeball", "nerve", r"^Right (sclera|cornea|vitreous body|lens)$|chamber of right eyeball"),
    ("lens", "수정체(오른쪽)", "Lens", "nerve", R("lens")),
    ("heart", "심장(벽)", "Heart", "organ", r"^Wall of (ventricle|right atrium|left atrium)$"),
    ("lv", "심실 벽", "Wall of ventricle", "organ", r"^Wall of ventricle$"),
    ("trachea", "기관", "Trachea", "organ", r"^Trachea$"),
    ("esophagus", "식도", "Esophagus", "organ", r"^Esophagus$"),
    ("thymus", "가슴샘", "Thymus", "organ", r"lobe of thymus$"),
    ("liver", "간", "Liver", "organ", "FMA7197"),
    ("gallbladder", "쓸개", "Gallbladder", "organ", r"^Gallbladder$"),
    ("stomach", "위", "Stomach", "organ", r"^Stomach$"),
    ("spleen", "지라", "Spleen", "organ", r"^Spleen$"),
    ("pancreas", "이자", "Pancreas", "organ", r"^Pancreas$"),
    ("duodenum", "샘창자", "Duodenum", "organ", r"^Duodenum$"),
    ("smallint", "작은창자", "Small intestine", "organ", "FMA7200"),
    ("largeint", "큰창자", "Large intestine", "organ", "FMA7201"),
    ("appendix", "막창자꼬리", "Appendix", "organ", r"^Appendix$"),
    ("rectum", "곧창자", "Rectum", "organ", r"^Rectum$"),
    ("kidney_r", "오른쪽 콩팥", "Right kidney", "organ", r"^Right kidney$"),
    ("kidney_l", "왼쪽 콩팥", "Left kidney", "organ", r"^Left kidney$"),
    ("adrenal_r", "오른쪽 부신", "Right adrenal gland", "organ", r"^Right adrenal gland$"),
    ("bladder", "방광", "Urinary bladder", "organ", r"^Urinary bladder$"),
    ("prostate", "전립샘", "Prostate", "organ", r"^Prostate$"),
    ("testis", "고환(오른쪽)", "Testis", "organ", R("testis")),
    ("tongue", "혀", "Tongue", "organ", r"^Tongue$"),
    ("aorta", "대동맥", "Aorta", "vessel", r"^Ascending aorta$|^Arch of aorta$|^Descending thoracic aorta$|^Descending aorta$|^Abdominal aorta$"),
    ("ivc", "아래대정맥", "Inferior vena cava", "vessel", r"^Inferior vena cava$"),
    ("svc", "위대정맥", "Superior vena cava", "vessel", r"^Superior vena cava$"),
    ("skin", "피부", "Skin", "skin", r"^Skin$"),
]:
    part(k, ko, en, s_, rx)

# 지도(앞·옆 윤곽) 그룹 -----------------------------------------------------------------------
MAP = [  # key, 한국어, 선택, 색 이름(css 변수 이름의 힌트)
    ("skin", "몸", [r"^Skin$"]),
    ("skull", "머리뼈", ["FMA46565", r"^Mandible$"]),
    ("spine", "척주", ["FMA13478", r"^Sacrum$"]),
    ("ribcage", "가슴우리", ["FMA7480", r"costal cartilage$|^Manubrium$|^Body of sternum$|^Xiphoid process$"]),
    ("armbones_r", "오른팔 뼈", [r"^Right (clavicle|scapula|humerus|radius|ulna)$", r"^Right (scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate)$", r"^Right \w+ metacarpal bone$", r"phalanx of right (thumb|index finger|middle finger|ring finger|little finger)$"]),
    ("armbones_l", "왼팔 뼈", [r"^Left (clavicle|scapula|humerus|radius|ulna)$", r"^Left (scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate)$", r"^Left \w+ metacarpal bone$", r"phalanx of left (thumb|index finger|middle finger|ring finger|little finger)$"]),
    ("pelvis", "골반", [r"^(Left|Right) hip bone$"]),
    ("legbones_r", "오른다리 뼈", [r"^Right (femur|patella|tibia|fibula|talus|calcaneus|cuboid bone|(medial|intermediate|lateral) cuneiform bone)$", r"^Navicular bone of right foot$", r"^Right \w+ metatarsal bone$", r"phalanx of right (big toe|second toe|third toe|fourth toe|little toe)$"]),
    ("legbones_l", "왼다리 뼈", [r"^Left (femur|patella|tibia|fibula|talus|calcaneus|cuboid bone|(medial|intermediate|lateral) cuneiform bone)$", r"^Navicular bone of left foot$", r"^Left \w+ metatarsal bone$", r"phalanx of left (big toe|second toe|third toe|fourth toe|little toe)$"]),
    ("brain", "뇌", ["FMA50801"]),
    ("heart", "심장", [r"^Wall of (ventricle|right atrium|left atrium)$"]),
    ("airway", "기관·기관지", ["FMA7393", r"^Trachea$", "FMA7309&bronch", "FMA7310&bronch"]),
    ("liver", "간", ["FMA7197"]),
    ("stomach", "위", [r"^Stomach$"]),
    ("spleen", "지라", [r"^Spleen$"]),
    ("pancreas", "이자", [r"^Pancreas$"]),
    ("gallbladder", "쓸개", [r"^Gallbladder$"]),
    ("kidneys", "콩팥", [r"^(Right|Left) kidney$"]),
    ("smallint", "작은창자", ["FMA7200"]),
    ("largeint", "큰창자", ["FMA7201", r"^Rectum$"]),
    ("bladder", "방광", [r"^Urinary bladder$"]),
    ("aorta", "대동맥", [r"^Ascending aorta$|^Arch of aorta$|^Descending thoracic aorta$|^Descending aorta$|^Abdominal aorta$"]),
    ("thymus", "가슴샘", [r"lobe of thymus$"]),
]

# 골격근 전체(근육 기관 + 근육 기관의 구역 + 기관의 갈래 + 등세모근의 부분). bp3d_models.MUSCLES와 같다.
MUSCLES = ["FMA5022", "FMA10474", "FMA45729", r"part of (left |right )?trapezius$"]

# 단면 그룹(CT처럼 칠할 때의 층: 뒤에 오는 것이 위에 그려진다) -------------------------------------
SEC = [
    ("body", "몸(피하 조직 등 데이터에 없는 조직)", [r"^Skin$"]),
    ("lung", "폐(기관지 나무로 어림)", ["FMA7309&bronch", "FMA7310&bronch"]),
    ("muscle", "근육", MUSCLES),
    ("bone", "뼈", bp3d_bones := ["FMA23876", r"^(Left|Right) (femur|tibia|fibula|humerus|radius|ulna|patella|calcaneus|talus|cuboid bone|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|(medial|intermediate|lateral) cuneiform bone|\w+ meta(carpal|tarsal) bone)$", r"^Navicular bone of", r"^(Proximal|Middle|Distal) phalanx of (left|right) ", r"costal cartilage$"]),
    ("disc", "추간판", [r"^Intervertebral disk"]),
    ("brain", "뇌", ["FMA50801"]),
    ("ventricle", "뇌실", [r"lateral ventricle$|^Third ventricle$|^Fourth ventricle$"]),
    ("eye", "눈", [r"(sclera|cornea)$|vitreous body$|chamber of (left|right) eyeball"]),
    ("cord", "척수(중심관 둘레로 어림)", ["FMA7647"]),
    ("heart", "심장 벽", [r"^Wall of (ventricle|right atrium|left atrium)$"]),
    ("blood", "심장 안의 피", [r"^Cavity of (left|right) (atrium|ventricle)$"]),
    ("artery", "큰 동맥", [r"^Ascending aorta$|^Arch of aorta$|^Descending thoracic aorta$|^Descending aorta$|^Abdominal aorta$|^Pulmonary trunk$|common carotid artery$|common iliac artery$|femoral artery$|subclavian artery$|brachial artery$"]),
    ("vein", "큰 정맥", [r"^Superior vena cava$|^Inferior vena cava$|brachiocephalic vein$|internal jugular vein$|common iliac vein$|femoral vein$|^Hepatic portal vein$|^Trunk of portal vein$|^Azygos vein$"]),
    ("airway", "기도", ["FMA7393", r"^Trachea$", "FMA7309&bronch", "FMA7310&bronch"]),
    ("esophagus", "식도", [r"^Esophagus$"]),
    ("liver", "간", ["FMA7197"]),
    ("gallbladder", "쓸개", [r"^Gallbladder$"]),
    ("stomach", "위", [r"^Stomach$"]),
    ("spleen", "지라", [r"^Spleen$"]),
    ("pancreas", "이자", [r"^Pancreas$"]),
    ("kidney", "콩팥", [r"^(Right|Left) kidney$"]),
    ("adrenal", "부신", [r"adrenal gland$"]),
    ("smallint", "작은창자", ["FMA7200"]),
    ("largeint", "큰창자", ["FMA7201", r"^Rectum$"]),
    ("bladder", "방광", [r"^Urinary bladder$"]),
    ("prostate", "전립샘", [r"^Prostate$"]),
]


def mesh_of(sel, exclude=(), faces=None, dedupe=True):
    els = sorted(bp3d.select(sel) - bp3d.select(list(exclude)))
    if dedupe:
        # 모양이 똑같은 요소(면 수와 경계 상자가 같은 것)만 하나로 친다. 이름으로 지우면 안 된다:
        # 소뇌·뇌줄기처럼 좌우 반쪽이, 창자·혈관처럼 여러 토막이 같은 이름을 쓴다.
        seen, keep = set(), []
        for e in els:
            v, f = bp3d.load(e)
            sig = (len(f), tuple(np.round(v.min(0)).astype(int)), tuple(np.round(v.max(0)).astype(int)))
            if sig in seen: continue
            seen.add(sig); keep.append(e)
        els = keep
    m = bp3d.merged(els)
    if m is None: return None, els
    if faces and len(m.faces) > faces:
        vv, ff = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - faces / len(m.faces))
        m = trimesh.Trimesh(vv, ff, process=True)
    return m, els


def metrics(p):
    excl = [r"artery|vein|duct|tributary|biliary"] if p["k"] == "liver" else []
    m, els = mesh_of(p["sel"], excl)
    if m is not None and p["k"] in CLIP_RIGHT:  # 원본의 "Right sclera"·"Right cornea" 조각에 왼쪽 눈까지 들어 있다
        c = m.triangles_center
        m = trimesh.Trimesh(m.vertices, m.faces[c[:, 0] < 0], process=True)
    if m is None:
        print("  ! no elements", p["k"]); return None
    out = dict(k=p["k"], ko=p["ko"], en=p["en"], sys=p["sys"], n=len(els))
    if p["k"] == "skin":  # 피부는 두께가 있는 껍질(겉면+속면): 몸의 부피는 단면을 쌓아 따로 잰다(body_metrics)
        out.update(body_metrics(m))
    vol = abs(m.volume) / 1000
    out["vol"] = round(vol, 1 if vol < 100 else 0)
    out["area"] = round(m.area / 100, 1 if m.area < 10000 else 0)
    out["watertight"] = bool(m.is_watertight)
    out["c"] = [round(x) for x in m.center_mass] if m.is_watertight else [round(x) for x in m.vertices.mean(0)]
    out["lo"] = [round(x) for x in m.bounds[0]]
    out["hi"] = [round(x) for x in m.bounds[1]]
    return out


def filled_outline(s, close=4.0):
    """단면 경로(닫히지 않은 것 포함)를 close mm 두께로 칠해 틈(눈·콧구멍 높이의 피부 구멍)을 메우고,
    바깥 윤곽 안쪽을 모두 채운 뒤 다시 깎아 원래 윤곽으로 되돌린다. 평면 좌표의 Polygon/MultiPolygon."""
    from shapely.geometry import LineString
    lines = [LineString(d) for d in s.discrete if len(d) >= 2]
    if not lines: return None
    fat = unary_union([l.buffer(close) for l in lines])
    geoms = [fat] if isinstance(fat, Polygon) else list(getattr(fat, "geoms", []))
    filled = unary_union([Polygon(g.exterior) for g in geoms if isinstance(g, Polygon)]).buffer(-close)
    # 눈 높이에서는 피부의 겉면과 속면이 눈꺼풀 틈으로 이어져 한 줄의 가는 고리가 된다(넓이가 거의 0).
    # 그런 조각은 볼록 껍질로 메운다(머리 단면은 거의 볼록하다). 보통 조각은 껍질의 35 % 이상을 채운다.
    parts = [filled] if isinstance(filled, Polygon) else list(getattr(filled, "geoms", []))
    out = []
    for g in parts:
        hull = g.convex_hull
        out.append(hull if g.area < 0.35 * hull.area else g)
    return unary_union(out)


def body_metrics(skin):
    """피부 껍질을 2 mm마다 가로로 잘라 바깥 윤곽이 감싼 넓이를 쌓는다(카발리에리 원리)."""
    dz = 2.0
    levels = list(np.arange(skin.bounds[0][2] + dz / 2, skin.bounds[1][2], dz))
    secs = skin.section_multiplane(plane_origin=np.zeros(3), plane_normal=np.array([0, 0, 1.0]), heights=levels)
    vol = side = 0.0
    for s in secs:
        if s is None: continue
        outer = filled_outline(s)
        if outer is None or outer.is_empty: continue
        vol += outer.area * dz
        side += outer.length * dz
    return dict(bodyVol=round(vol / 1e6, 1), outerArea=round(side / 1e6, 2), height=round(skin.bounds[1][2] - skin.bounds[0][2]))


def poly_coords(g, tol):
    g = g.simplify(tol, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(getattr(g, "geoms", []))
    out = []
    for pg in polys:
        if not isinstance(pg, Polygon) or pg.area < 4: continue
        rings = [pg.exterior] + list(pg.interiors)
        for i, ring in enumerate(rings):
            xy = np.round(np.asarray(ring.coords)[:-1]).astype(int)
            if len(xy) < 3: continue
            # 구멍은 음수 표식: 첫 값 앞에 0을 하나 둔다(그리기에서 evenodd로 칠한다)
            out.append(xy.flatten().tolist())
    return out


def silhouette(m, axes, tol=1.5):
    tri = m.vertices[m.faces][:, :, axes]
    polys = [Polygon(t) for t in tri if Polygon(t).area > 0.01]
    u = unary_union(polys).buffer(0.8).buffer(-0.8)
    return poly_coords(u, tol)


def lung_proxy():
    """원본에 폐 실질이 없어, 좌우 기관지 나무의 볼록 껍질을 폐의 어림으로 쓴다."""
    hulls = []
    for c in ("FMA7309&bronch", "FMA7310&bronch"):
        m, _ = mesh_of([c])
        hulls.append(m.convex_hull)
    return trimesh.util.concatenate(hulls)


def sections(mesh, normal, levels, axes, fill=False, grow=0.0):
    """면마다 단면 다각형. 평면 좌표를 세계 좌표로 되돌려 axes(두 축)로 투영한다."""
    from shapely.affinity import affine_transform
    out = {}
    try:
        secs = mesh.section_multiplane(plane_origin=np.zeros(3), plane_normal=normal, heights=levels)
    except Exception as e:
        print("   section failed", e); return out
    for i, s in enumerate(secs):
        if s is None: continue
        T = s.metadata["to_3D"]
        a, b = axes
        mat = [T[a, 0], T[a, 1], T[b, 0], T[b, 1], T[a, 3] + T[a, 2] * 0, T[b, 3]]
        if fill == "outline":  # 피부: 틈을 메운 바깥 윤곽
            g = filled_outline(s)
            if g is None or g.is_empty: continue
            u = affine_transform(g, mat)
        else:
            try:
                polys = s.polygons_full
            except Exception:
                continue
            if not len(polys): continue
            if fill: polys = [Polygon(p.exterior) for p in polys]
            u = unary_union([affine_transform(p.buffer(0), mat) for p in polys])
        if grow: u = u.buffer(grow)
        c = poly_coords(u, 1.2)
        if c: out[i] = c
    return out


if __name__ == "__main__":
    bp3d.init(sys.argv[1])
    print("parts")
    parts = [x for x in (metrics(p) for p in P) if x]
    print("maps")
    maps = {"front": {}, "side": {}}
    for key, ko, sel in MAP:
        m, _ = mesh_of(sel, [r"artery|vein|duct|tributary|biliary"] if key == "liver" else [], faces=20000 if key == "skin" else 6000)
        maps["front"][key] = silhouette(m, [0, 2])
        maps["side"][key] = silhouette(m, [1, 2])
        print("  ", key, sum(len(c) for c in maps["front"][key]) // 2, "pts")
    mapNames = {k: ko for k, ko, _ in MAP}
    data = dict(meta=dict(source="BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0",
                          units="mm(좌표), mL(부피), cm²(겉넓이)", axes="x: −오른쪽/+왼쪽, y: −앞/+뒤, z: 위(발바닥 근처 0)"),
                parts=parts, maps=maps, mapNames=mapNames)
    with open(os.path.join(ROOT, "js/atlas-data.js"), "w") as f:
        f.write("/* Generated by tools/bp3d_atlas.py. Data: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. */\n")
        f.write("window.AT_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("sections")
    planes = dict(axial=(np.array([0, 0, 1.0]), list(range(-60, 1640, 10)), (0, 1)),
                  coronal=(np.array([0, 1.0, 0]), list(range(-240, 50, 10)), (0, 2)),
                  sagittal=(np.array([1.0, 0, 0]), list(range(-330, 340, 10)), (1, 2)))
    secdata = dict(groups=[dict(k=k, ko=ko) for k, ko, _ in SEC])
    meshes = []
    for k, ko, sel in SEC:
        excl = [r"artery|vein|duct|tributary|biliary"] if k == "liver" else []
        if k == "lung":
            meshes.append(lung_proxy()); continue
        m, _ = mesh_of(sel, excl, faces=60000 if k in ("body", "muscle", "bone") else 12000)
        meshes.append(m)
    for pname, (normal, levels, axes) in planes.items():
        sl = [[] for _ in levels]
        for gi, m in enumerate(meshes):
            if m is None: continue
            k = SEC[gi][0]
            fill = "outline" if k == "body" else k == "lung"
            # 척수: 원본에는 가는 중심관만 있어 둘레 4 mm를 더해 지름 약 1 cm의 척수로 어림한다
            for i, c in sections(m, normal, levels, axes, fill, grow=4.0 if k == "cord" else 0.0).items():
                sl[i].append([gi] + [c])
        secdata[pname] = dict(levels=levels, slices=sl)
        print("  ", pname, sum(len(s) for s in sl), "group-slices")
    with open(os.path.join(ROOT, "js/sections-data.js"), "w") as f:
        f.write("/* Generated by tools/bp3d_atlas.py. Data: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. */\n")
        f.write("window.AT_SECTIONS = " + json.dumps(secdata, separators=(",", ":")) + ";\n")
    print("done")
