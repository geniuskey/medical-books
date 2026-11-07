#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and BodyBook contributors. MIT (see ../LICENSE-MIT).
"""BodyParts3D OBJ -> assets/3d/*.glb (3D 해부 모델 생성기).

원본: BodyParts3D (© The Database Center for Life Science, CC BY 4.0)
      https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html 에서
      partof_BP3D_4.0_obj_99.zip, isa_BP3D_4.0_obj_99.zip, partof_element_parts.txt, isa_element_parts.txt 를 받아
      한 폴더(<bp3d>)에 풀어 둔다.
필요: pip install trimesh fast-simplification, npm i -g @gltf-transform/cli
실행: python3 tools/bp3d_models.py <bp3d> <임시폴더> [모델 ...]
      그다음 모델마다
      gltf-transform weld <임시폴더>/<모델>.raw.glb w.glb && gltf-transform quantize w.glb assets/3d/<모델>.glb
모델 하나는 그룹(부위)의 목록이다. 그룹 하나가 이름 붙은 재질 하나를 가진 메시 하나가 되고,
장의 3D 뷰어(js/anatomy3d.js)는 이 재질 이름(key)으로 부위를 켜고 끄거나 반투명하게 한다. 먼저 맞는 그룹이 요소를 가져간다.
"""
import json, re, sys, os
import numpy as np
import trimesh
import fast_simplification

BP, OUT = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])


def build_index():
    """요소 파일(FJxxxx.obj)마다 영어 이름과 경로."""
    idx = {}
    for d in ("partof_BP3D_4.0_obj_99", "isa_BP3D_4.0_obj_99"):
        for fn in sorted(os.listdir(os.path.join(BP, d))):
            if not fn.endswith(".obj") or fn[:-4] in idx:
                continue
            name = None
            with open(os.path.join(BP, d, fn)) as f:
                for line in f:
                    if line.startswith("# English name"):
                        name = line.split(":", 1)[1].strip(); break
                    if not line.startswith("#"):
                        break
            idx[fn[:-4]] = dict(name=name, path=os.path.join(BP, d, fn))
    return idx


IDX = build_index()

CONCEPT = {}
for fn in ("partof_element_parts.txt", "isa_element_parts.txt"):
    for line in open(os.path.join(BP, fn)):
        p = line.rstrip("\n").split("\t")
        if len(p) == 3 and p[0].startswith("FMA"):
            CONCEPT.setdefault(p[0], set()).add(p[2])


def select(spec):
    """spec: list of 'FMAxxx' concept ids or regex strings (matched to element names)."""
    out = set()
    for s in spec:
        if "&" in s:  # 'FMA123&regex': elements of a concept whose name matches
            c, rx = s.split("&", 1)
            out |= {e for e in CONCEPT.get(c, set()) if re.search(rx, IDX[e]["name"] or "", re.I)}
        elif re.fullmatch(r"FMA\d+", s):
            out |= CONCEPT.get(s, set())
        else:
            out |= {e for e, v in IDX.items() if v["name"] and re.search(s, v["name"], re.I)}
    return out


def load(e):
    m = trimesh.load(IDX[e]["path"], force="mesh", process=False)
    return np.asarray(m.vertices, dtype=np.float64), np.asarray(m.faces, dtype=np.int64)


def srgb2lin(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def build(name, groups, box=None):
    used, parts = set(), []
    for g in groups:
        els = sorted(select(g["sel"]) - select(g.get("exclude", [])) - used)
        used |= set(els)
        V, F, off = [], [], 0
        for e in els:
            v, f = load(e)
            V.append(v); F.append(f + off); off += len(v)
        if not V:
            print(f"  ! {name}/{g['key']}: no elements"); continue
        v, f = np.vstack(V), np.vstack(F)
        clip = g.get("clip", box)
        if clip is not None:  # keep faces whose centroid lies in the box (mm, BP3D axes)
            lo, hi = np.array(clip[0]), np.array(clip[1])
            c = v[f].mean(axis=1)
            f = f[np.all((c >= lo) & (c <= hi), axis=1)]
        m = trimesh.Trimesh(v, f, process=True)
        n0 = len(m.faces)
        if n0 > g["faces"]:
            vv, ff = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32),
                                                  target_reduction=1 - g["faces"] / n0)
            m = trimesh.Trimesh(vv, ff, process=True)
        parts.append((g, m))
        print(f"  {name}/{g['key']}: {len(els)} el, {n0} -> {len(m.faces)} faces")
    allv = np.vstack([m.vertices for _, m in parts])
    ctr = (allv.min(0) + allv.max(0)) / 2
    scene = trimesh.Scene()
    for g, m in parts:
        v = (m.vertices - ctr) * 0.001
        m.vertices = np.c_[v[:, 0], v[:, 2], -v[:, 1]]  # BP3D z-up, -y anterior -> glTF y-up, +z toward viewer
        col = list(srgb2lin(g["color"])) + [g.get("alpha", 1.0)]
        mat = trimesh.visual.material.PBRMaterial(
            name=g["key"], baseColorFactor=col, metallicFactor=0.0, roughnessFactor=g.get("rough", 0.55),
            alphaMode="BLEND" if g.get("alpha", 1.0) < 1 else "OPAQUE", doubleSided=g.get("alpha", 1.0) < 1)
        m.visual = trimesh.visual.TextureVisuals(material=mat)
        scene.add_geometry(m, node_name=g["key"], geom_name=g["key"])
    raw = os.path.join(OUT, f"{name}.raw.glb")
    scene.export(raw)
    return raw


ARTERY, VEIN = "#d4423a", "#3d63c4"
BONE = "#ece3cf"
BONES = ["FMA23876", r"^(Left|Right) (femur|tibia|fibula|humerus|radius|ulna|patella|calcaneus|talus|navicular|cuboid|(medial|intermediate|lateral) cuneiform|scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|\w+ meta(carpal|tarsal) bone)$", r"^(Proximal|Middle|Distal) phalanx of (left|right) "]
NOT_BONE = [r"choroid|cornea|iris$|lens$|sclera|vitreous|lacrimal gland|chamber of|Suspensory"]

MODELS = {
    "heart": dict(groups=[
        dict(key="coronary", sel=[r"coronary artery|interventricular branch of left|conus branch|Right conus artery|septal branch|ventricular branch of right coronary|marginal branch of right"], color="#ff4b3e", faces=9000),
        dict(key="cardiacvein", sel=[r"cardiac vein|Coronary sinus|marginal vein|interventricular vein|vein of left ventricle"], color="#4f7be0", faces=4000),
        dict(key="valves", sel=[r"valve|leaflet of|cusp of|papillary muscle"], color="#f4ead2", faces=7000),
        dict(key="ventricles", sel=[r"^Wall of ventricle$"], color="#b8463c", faces=22000),
        dict(key="ratrium", sel=[r"^Wall of right atrium$"], color="#7b7fc0", faces=8000),
        dict(key="latrium", sel=[r"^Wall of left atrium$"], color="#d4685e", faces=6000),
        dict(key="aorta", sel=[r"^Ascending aorta$|^Arch of aorta$|Brachiocephalic trunk|Left common carotid artery|Left subclavian artery"], color=ARTERY, faces=5000, clip=[(-60, -400, 1150), (40, 400, 1345)]),
        dict(key="pulmart", sel=[r"^Pulmonary trunk$|^(Right|Left) pulmonary artery$"], color="#5a73d8", faces=4000),
        dict(key="pulmvein", sel=[r"(superior|inferior) pulmonary vein$"], color="#e0574a", faces=3000),
        dict(key="venacava", sel=[r"^Superior vena cava$|^Inferior vena cava$"], color=VEIN, faces=3000, clip=[(-200, -400, 1172), (200, 400, 1330)]),
    ]),
    "lungs": dict(groups=[
        dict(key="airway", sel=["FMA7393", r"^Trachea$", "FMA7309&bronch", "FMA7310&bronch"], color="#ece2cc", faces=22000),
        dict(key="pulmart", sel=["FMA7309&artery", "FMA7310&artery", r"^Pulmonary trunk$|^(Right|Left) pulmonary artery$"], color="#4f6fd8", faces=16000),
        dict(key="pulmvein", sel=["FMA7309&vein", "FMA7310&vein", r"(superior|inferior) pulmonary vein$"], color="#e0574a", faces=16000),
        dict(key="heart", sel=[r"^Wall of (ventricle|right atrium|left atrium)$"], color="#b8463c", faces=6000),
        dict(key="diaphragm", sel=["FMA13295"], color="#c7705c", alpha=0.35, faces=6000),
        dict(key="ribs", sel=["FMA7480"], color=BONE, alpha=0.25, faces=14000),
    ]),
    "urinary": dict(groups=[
        dict(key="adrenal", sel=[r"adrenal gland$"], color="#e5b443", faces=3000),
        dict(key="kidneys", sel=[r"^(Right|Left) kidney$"], color="#a9554b", faces=10000),
        dict(key="ureters", sel=[r"^(Right|Left) ureter$"], color="#e2cf74", faces=3000),
        dict(key="bladder", sel=[r"^Urinary bladder$"], color="#e6bf72", faces=3000),
        dict(key="arteries", sel=[r"^Abdominal aorta$|^(Right|Left) renal artery$|^(Right|Left) common iliac artery$"], color=ARTERY, faces=5000),
        dict(key="veins", sel=[r"^Inferior vena cava$|^(Right|Left) renal vein$|^(Right|Left) common iliac vein$"], color=VEIN, faces=5000, clip=[(-300, -400, 780), (300, 400, 1150)]),
        dict(key="spine", sel=[r"(thoracic|lumbar) vertebra$|^Sacrum$", r"(Eleventh|Twelfth) rib"], exclude=[r"(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth) thoracic"], color=BONE, alpha=0.35, faces=8000),
    ]),
    "nervous": dict(groups=[
        dict(key="frontal", sel=[r"(superior|middle|inferior) frontal gyrus$"], color="#e8a37b", faces=8000),
        dict(key="motor", sel=[r"precentral gyrus$"], color="#e2715f", faces=3000),
        dict(key="sensory", sel=[r"postcentral gyrus$"], color="#5fa6d8", faces=3000),
        dict(key="parietal", sel=[r"superior parietal lobule$|supramarginal gyrus$|angular gyrus$"], color="#8dbbe0", faces=6000),
        dict(key="temporal", sel=[r"temporal gyrus$|fusiform gyrus$|parahippocampal gyrus$|hippocampus$|insula$|cingulate gyrus$"], color="#9ccb88", faces=8000),
        dict(key="occipital", sel=[r"occipital lobe$"], color="#c39cd8", faces=3000),
        dict(key="white", sel=[r"^White matter of (left|right) cerebral hemisphere$"], color="#f1ebdd", faces=8000),
        dict(key="cerebellum", sel=[r"^Cerebellum$"], color="#d98b8b", faces=8000),
        dict(key="brainstem", sel=[r"^(Midbrain|Pons|Medulla oblongata)$"], color="#e4c27a", faces=5000),
        dict(key="spinalcord", sel=["FMA7647"], color="#f0d690", faces=4000, clip=[(-300, -400, 1380), (300, 400, 2000)]),
    ]),
    "endocrine": dict(groups=[
        dict(key="hypothalamus", sel=[r"^Hypothalamus$|^Tuber cinereum$"], color="#ff5fa2", faces=2000),
        dict(key="pituitary", sel=[r"^Pituitary gland$"], color="#ff3d7f", faces=1500),
        dict(key="pineal", sel=[r"^Pineal body$"], color="#b47be0", faces=800),
        dict(key="thymus", sel=[r"lobe of thymus$"], color="#9fc26a", faces=2500),
        dict(key="adrenal", sel=[r"adrenal gland$"], color="#ffb627", faces=3000),
        dict(key="pancreas", sel=[r"^Pancreas$|^Parenchyma of pancreas$"], color="#f2cf5b", faces=4000),
        dict(key="testes", sel=[r"^(Right|Left) testis$"], color="#8aa6ea", faces=2000),
        dict(key="brain", sel=["FMA50801"], color="#e6c9bd", alpha=0.25, faces=9000),
        dict(key="kidneys", sel=[r"^(Right|Left) kidney$"], color="#a9554b", alpha=0.45, faces=4000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.12, faces=14000),
    ]),
    "digestive": dict(groups=[
        dict(key="esophagus", sel=[r"^Esophagus$"], color="#d98a7a", faces=3000),
        dict(key="stomach", sel=["FMA7148"], color="#e2867a", faces=6000),
        dict(key="liver", sel=["FMA7197"], exclude=[r"artery|vein|duct"], color="#8f3b32", faces=10000),
        dict(key="gallbladder", sel=[r"^Gallbladder$"], color="#5aa05a", faces=1500),
        dict(key="pancreas", sel=[r"^Pancreas$|^Parenchyma of pancreas$"], color="#f2cf5b", faces=4000),
        dict(key="duodenum", sel=[r"^Duodenum$"], color="#e7a98d", faces=3000),
        dict(key="smallint", sel=["FMA7200"], color="#efb79a", faces=14000),
        dict(key="largeint", sel=["FMA7201"], color="#c98d6e", faces=10000),
        dict(key="spleen", sel=[r"^Spleen$"], color="#7c3a5a", faces=2000),
    ]),
    "vessels": dict(groups=[
        dict(key="heart", sel=[r"^Wall of (ventricle|right atrium|left atrium)$"], color="#b8463c", faces=8000),
        dict(key="arteries", sel=["FMA45623", r"^(Ascending aorta|Arch of aorta|Pulmonary trunk)$"], exclude=[r"coronary|pulmonary artery|segmental artery"], color=ARTERY, faces=45000),
        dict(key="veins", sel=[r"vein$|vena cava|venous arch|venous plexus"], exclude=[r"pulmonary|cardiac|portal|hepatic|segmental|marginal vein|interventricular vein|Coronary sinus|vein of left ventricle"], color=VEIN, faces=35000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.1, faces=14000),
    ]),
    "body": dict(groups=[
        dict(key="brain", sel=["FMA50801"], color="#e6b8a8", faces=6000),
        dict(key="heart", sel=[r"^Wall of (ventricle|right atrium|left atrium)$"], color="#b8463c", faces=4000),
        dict(key="lungs", sel=["FMA7309&bronch", "FMA7393"], color="#e89aa6", faces=8000),
        dict(key="liver", sel=["FMA7197"], exclude=[r"artery|vein|duct"], color="#8f3b32", faces=4000),
        dict(key="stomach", sel=["FMA7148"], color="#e2867a", faces=2500),
        dict(key="intestine", sel=["FMA7200", "FMA7201"], color="#e6a888", faces=8000),
        dict(key="kidneys", sel=[r"^(Right|Left) kidney$"], color="#a9554b", faces=2000),
        dict(key="bladder", sel=[r"^Urinary bladder$"], color="#e6bf72", faces=1000),
        dict(key="skeleton", sel=BONES, exclude=NOT_BONE, color=BONE, faces=50000),
        dict(key="skin", sel=[r"^Skin$"], color="#d9b49a", alpha=0.16, faces=20000),
    ]),
    "muscles": dict(groups=[
        dict(key="skeleton", sel=BONES, exclude=NOT_BONE, color=BONE, faces=50000),
        dict(key="muscles", sel=["FMA5022"], color="#b54a3f", faces=90000, rough=0.45),
    ]),
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, spec in MODELS.items():
        if ONLY and name not in ONLY:
            continue
        print(name)
        build(name, spec["groups"], spec.get("box"))
