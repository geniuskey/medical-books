# Copyright (c) 2026 geniuskey and AnatomyBook contributors. MIT (see ../LICENSE-MIT).
"""BodyParts3D 4.0 원본을 읽는 공통 모듈(모델 생성기와 해부 데이터 생성기가 함께 쓴다).

원본: BodyParts3D (© The Database Center for Life Science, CC BY 4.0)
      https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html 에서
      partof_BP3D_4.0_obj_99.zip, isa_BP3D_4.0_obj_99.zip, partof_element_parts.txt, isa_element_parts.txt 를 받아
      한 폴더(<bp3d>)에 풀어 둔다.
좌표: 원본은 mm, z 위(발바닥 근처가 0, 정수리 약 1,640), -y 앞(배쪽), -x 몸의 오른쪽.
선택 규칙(select): 'FMA123' 개념 id(그 개념에 속한 요소 전부), 'FMA123&정규식'(그 개념의 요소 중 이름이 맞는 것),
                  그 밖의 문자열은 요소 영어 이름에 대한 정규식(대소문자 무시).
"""
import os, re
from functools import lru_cache
import numpy as np
import trimesh

BP = None
IDX = {}
CONCEPT = {}


def init(bp):
    global BP
    BP = bp
    for d in ("partof_BP3D_4.0_obj_99", "isa_BP3D_4.0_obj_99"):
        for fn in sorted(os.listdir(os.path.join(bp, d))):
            if not fn.endswith(".obj") or fn[:-4] in IDX:
                continue
            name = None
            with open(os.path.join(bp, d, fn)) as f:
                for line in f:
                    if line.startswith("# English name"):
                        name = line.split(":", 1)[1].strip(); break
                    if not line.startswith("#"):
                        break
            IDX[fn[:-4]] = dict(name=name, path=os.path.join(bp, d, fn))
    for fn in ("partof_element_parts.txt", "isa_element_parts.txt"):
        for line in open(os.path.join(bp, fn)):
            p = line.rstrip("\n").split("\t")
            if len(p) == 3 and p[0].startswith("FMA"):
                CONCEPT.setdefault(p[0], set()).add(p[2])


def select(spec):
    out = set()
    for s in spec:
        if "&" in s:
            c, rx = s.split("&", 1)
            out |= {e for e in CONCEPT.get(c, set()) if e in IDX and re.search(rx, IDX[e]["name"] or "", re.I)}
        elif re.fullmatch(r"FMA\d+", s):
            out |= {e for e in CONCEPT.get(s, set()) if e in IDX}
        else:
            out |= {e for e, v in IDX.items() if v["name"] and re.search(s, v["name"], re.I)}
    return out


@lru_cache(maxsize=None)
def load(e):
    m = trimesh.load(IDX[e]["path"], force="mesh", process=False)
    return np.asarray(m.vertices, dtype=np.float64), np.asarray(m.faces, dtype=np.int64)


def groups_elements(groups):
    """그룹 목록 → [(그룹, 요소 목록)]. 먼저 맞는 그룹이 요소를 가져간다."""
    used, out = set(), []
    for g in groups:
        els = sorted(select(g["sel"]) - select(g.get("exclude", [])) - used)
        used |= set(els)
        out.append((g, els))
    return out


def merged(els, clip=None):
    V, F, off = [], [], 0
    for e in els:
        v, f = load(e)
        V.append(v); F.append(f + off); off += len(v)
    if not V:
        return None
    v, f = np.vstack(V), np.vstack(F)
    if clip is not None:  # 무게중심이 상자 안에 있는 면만 남긴다(mm, 원본 축)
        lo, hi = np.array(clip[0]), np.array(clip[1])
        c = v[f].mean(axis=1)
        f = f[np.all((c >= lo) & (c <= hi), axis=1)]
    return trimesh.Trimesh(v, f, process=True)
