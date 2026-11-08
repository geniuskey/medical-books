/* Copyright (c) 2026 geniuskey and AnatomyBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   데이터(js/atlas-data.js, js/sections-data.js)는 BodyParts3D(© The Database Center for Life Science, CC BY 4.0)에서 계산했다. */
/* ==========================================================================
   AnatomyBook 해부 데이터 도구 — 전역 객체 AT
   - 구조(part)마다 부피·겉넓이·무게중심·경계 상자를 찾고, 거리와 크기를 잰다.
   - 앞·옆에서 본 몸의 지도(윤곽)를 캔버스에 그리고, 누른 자리의 구조를 찾는다.
   - 가로면·관상면·시상면 단면을 CT처럼(회색조) 또는 색으로 칠하고, 누른 자리의 조직을 찾는다.
   좌표는 BodyParts3D 원본 그대로: mm, x −오른쪽/+왼쪽, y −앞/+뒤, z 위(발바닥 근처가 0).
   화면 규칙: 몸의 오른쪽이 화면 왼쪽(마주 보고 선 사람, CT를 발 쪽에서 올려다본 모습), 앞이 위(가로면)·왼쪽(옆모습, 시상면: 몸의 왼쪽에서 본 모습).
   ========================================================================== */
(function () {
  "use strict";
  var D = window.AT_DATA || { parts: [], maps: { front: {}, side: {} }, mapNames: {} };
  var AT = (window.AT = {});
  AT.DATA = D;
  AT.parts = D.parts;
  var byKey = {};
  D.parts.forEach(function (p) { byKey[p.k] = p; });

  /* ------------------------------------------------------------ 구조 찾기와 계산 */
  /** 구조 하나: AT.part("femur") → {k, ko, en, sys, n, vol(mL), area(cm²), c[x,y,z], lo, hi, watertight} */
  AT.part = function (k) { return byKey[k] || null; };
  /** 계통별 목록: "bone" | "muscle" | "organ" | "nerve" | "vessel" | "skin" */
  AT.bySys = function (sys) { return D.parts.filter(function (p) { return p.sys === sys; }); };
  /** 몸 전체: {height(mm), vol(L), area(m², 옆면만 쌓은 근삿값)} — 피부 껍질을 2 mm마다 잘라 쌓은 값 */
  var skin = byKey.skin || {};
  AT.body = { height: skin.height || 1719, vol: skin.bodyVol || 69.8, area: skin.outerArea || 1.64, top: (skin.hi || [0, 0, 1641])[2], bottom: (skin.lo || [0, 0, -78])[2] };
  function xyz(a) { return Array.isArray(a) ? a : (byKey[a] ? byKey[a].c : [0, 0, 0]); }
  /** 두 구조(무게중심) 또는 두 좌표 사이의 거리(mm) */
  AT.dist = function (a, b) { var p = xyz(a), q = xyz(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
  /** 경계 상자 크기 [좌우, 앞뒤, 위아래](mm) */
  AT.size = function (k) { var p = byKey[k]; return p ? [p.hi[0] - p.lo[0], p.hi[1] - p.lo[1], p.hi[2] - p.lo[2]] : [0, 0, 0]; };
  /** 발바닥에서 잰 높이(mm): 좌표 z를 몸의 맨 아래(약 −78)를 0으로 옮긴다 */
  AT.heightOf = function (a) { return xyz(a)[2] - AT.body.bottom; };
  /** 밀도(g/mL)를 곱한 대략의 무게(g). 뼈 약 1.9(피질·해면 평균, 마른 뼈가 아닌 살아 있는 뼈), 근육 1.06, 장기 1.05 */
  AT.DENSITY = { bone: 1.9, muscle: 1.06, organ: 1.05, nerve: 1.04, vessel: 1.05, skin: 1.1 };
  AT.mass = function (k) { var p = byKey[k]; return p ? p.vol * (AT.DENSITY[p.sys] || 1) : 0; };
  AT.fmtVol = function (ml) { return ml >= 1000 ? (ml / 1000).toFixed(ml >= 10000 ? 0 : 2) + " L" : ml >= 10 ? Math.round(ml) + " mL" : ml.toFixed(1) + " mL"; };
  AT.fmtLen = function (mm) { return mm >= 1000 ? (mm / 1000).toFixed(2) + " m" : mm >= 100 ? (mm / 10).toFixed(0) + " cm" : mm >= 10 ? (mm / 10).toFixed(1) + " cm" : Math.round(mm) + " mm"; };
  /** 방향 이름: 좌표 a에서 본 b의 위치를 해부학 용어로(한국어) */
  AT.relation = function (a, b, tol) {
    var p = xyz(a), q = xyz(b), t = tol == null ? 15 : tol, out = [];
    if (q[2] - p[2] > t) out.push("위쪽(상)"); else if (p[2] - q[2] > t) out.push("아래쪽(하)");
    if (p[1] - q[1] > t) out.push("앞쪽(전)"); else if (q[1] - p[1] > t) out.push("뒤쪽(후)");
    var mp = Math.abs(p[0]), mq = Math.abs(q[0]);
    if (Math.abs(mq - mp) > t) out.push(mq < mp ? "안쪽(내측)" : "가쪽(외측)");
    return out.length ? out : ["거의 같은 자리"];
  };

  /* ------------------------------------------------------------ 색 */
  // 해부 구조의 고정 색(실제 조직을 흉내 낸 색이라 라이트·다크 모두 같은 색을 쓴다. 배경과 대비가 있는 중간 밝기)
  AT.COLORS = {
    skin: "#d9b49a", body: "#d9b49a", bone: "#e6d6ad", disc: "#8fc0e0", muscle: "#c4574a", brain: "#e8b4a6", ventricle: "#4fb3e8",
    eye: "#9ccfe8", cord: "#e8c75a", heart: "#b8463c", blood: "#7a1f2a", lung: "#c9d6e3", artery: "#e0463a", vein: "#4466cc", airway: "#7a8aa0", esophagus: "#d98a7a",
    liver: "#8f3b32", gallbladder: "#5aa05a", stomach: "#e2867a", spleen: "#7c3a5a", pancreas: "#e8c24f", kidney: "#a9554b",
    kidneys: "#a9554b", adrenal: "#e5a033", smallint: "#e9a888", largeint: "#b9805f", bladder: "#e0b860", prostate: "#d98fb0",
    skull: "#e6d6ad", spine: "#d9c08a", ribcage: "#e6cf9c", pelvis: "#e0b48a", armbones_r: "#cfd9a0", armbones_l: "#cfd9a0",
    legbones_r: "#d9b08f", legbones_l: "#d9b08f", aorta: "#e0463a", thymus: "#9fc26a",
  };
  // CT 회색조(하운스필드 값을 흉내 낸 밝기 0~1): 공기 0, 지방 0.22, 물·장기 0.42~0.5, 근육 0.46, 조영된 혈관 0.75, 뼈 0.95
  AT.CT = {
    body: 0.24, lung: 0.03, blood: 0.6, muscle: 0.46, bone: 0.96, disc: 0.5, brain: 0.5, ventricle: 0.34, eye: 0.4, cord: 0.52, heart: 0.56, artery: 0.8, vein: 0.7,
    airway: 0.02, esophagus: 0.45, liver: 0.56, gallbladder: 0.36, stomach: 0.47, spleen: 0.55, pancreas: 0.5, kidney: 0.58, adrenal: 0.5,
    smallint: 0.48, largeint: 0.42, bladder: 0.36, prostate: 0.48,
  };
  AT.gray = function (v) { var c = Math.round(BB.clamp(v, 0, 1) * 235 + 10); return "rgb(" + c + "," + c + "," + c + ")"; };

  /* ------------------------------------------------------------ 지도(앞·옆 윤곽) */
  // view: "front"(앞모습: 가로 = x) | "side"(몸의 왼쪽에서 본 옆모습, 앞이 화면 왼쪽: 가로 = y)
  var AX = { front: 0, side: 1 };
  AT.mapNames = D.mapNames || {};
  AT.mapKeys = function (view) { return Object.keys((D.maps || {})[view || "front"] || {}); };
  function ringsBounds(list) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    list.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { b[0] = Math.min(b[0], r[i]); b[2] = Math.max(b[2], r[i]); b[1] = Math.min(b[1], r[i + 1]); b[3] = Math.max(b[3], r[i + 1]); } });
    return b;
  }
  /**
   * 화면 변환: AT.fit(box, ext, {pad, flipY}) → {X(u), Y(v), s, inv(px, py) → [u, v], box}
   * ext = [u0, v0, u1, v1](mm). flipY(기본 true)면 v가 클수록 화면 위(z 위).
   */
  AT.fit = function (box, ext, o) {
    o = o || {};
    var pad = o.pad == null ? 10 : o.pad, flipY = o.flipY !== false;
    var w = box.w - 2 * pad, h = box.h - 2 * pad, eu = ext[2] - ext[0], ev = ext[3] - ext[1];
    var s = Math.min(w / eu, h / ev), ox = box.x + pad + (w - eu * s) / 2, oy = box.y + pad + (h - ev * s) / 2;
    var T = {
      s: s, box: box, ext: ext,
      X: function (u) { return ox + (u - ext[0]) * s; },
      Y: function (v) { return flipY ? oy + (ext[3] - v) * s : oy + (v - ext[1]) * s; },
      inv: function (px, py) { return [ext[0] + (px - ox) / s, flipY ? ext[3] - (py - oy) / s : ext[1] + (py - oy) / s]; },
    };
    return T;
  };
  /** 지도 전체가 들어갈 변환(몸 전체 또는 keys 구조들의 범위) */
  AT.mapFit = function (box, view, o) {
    o = o || {};
    var keys = o.keys || ["skin"], all = [];
    keys.forEach(function (k) { all = all.concat(D.maps[view][k] || []); });
    var b = ringsBounds(all), m = o.margin == null ? 20 : o.margin;
    if (o.zRange) { b[1] = o.zRange[0]; b[3] = o.zRange[1]; }
    return AT.fit(box, [b[0] - m, b[1] - m, b[2] + m, b[3] + m], o);
  };
  /** 3D 좌표 → 지도 화면 좌표 */
  AT.mapPoint = function (T, view, p) { p = xyz(p); return [T.X(p[AX[view]]), T.Y(p[2])]; };
  function pathRings(ctx, T, rings, swap) {
    ctx.beginPath();
    rings.forEach(function (r) {
      for (var i = 0; i < r.length; i += 2) {
        var x = T.X(swap ? r[i + 1] : r[i]), y = T.Y(swap ? r[i] : r[i + 1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    });
  }
  /**
   * 지도 그리기: AT.drawMap(ctx, T, view, {layers, colors, alpha, highlight, dim, stroke, skin})
   * layers: 그릴 구조 key 배열(앞에서부터 아래층). 기본: 몸 윤곽 + 뼈 + 장기.
   */
  AT.drawMap = function (ctx, T, view, o) {
    o = o || {};
    var P = BB.palette(), maps = D.maps[view] || {};
    var layers = o.layers || ["skin", "skull", "spine", "ribcage", "pelvis", "armbones_r", "armbones_l", "legbones_r", "legbones_l", "brain", "heart", "liver", "stomach", "kidneys"];
    layers.forEach(function (k) {
      var rings = maps[k]; if (!rings) return;
      var col = (o.colors && o.colors[k]) || AT.COLORS[k] || P.accent;
      var hi = o.highlight && (o.highlight === k || (Array.isArray(o.highlight) && o.highlight.indexOf(k) >= 0));
      var dim = o.highlight && !hi && k !== "skin";
      pathRings(ctx, T, rings);
      if (k === "skin") {
        ctx.fillStyle = o.skin || BB.alpha(AT.COLORS.skin, BB.isDark() ? 0.18 : 0.28);
        ctx.fill("evenodd");
        ctx.strokeStyle = BB.alpha(P.text, 0.35); ctx.lineWidth = 1; ctx.stroke();
        return;
      }
      ctx.globalAlpha = dim ? 0.25 : (o.alpha == null ? 0.9 : o.alpha);
      ctx.fillStyle = col; ctx.fill("evenodd");
      ctx.globalAlpha = 1;
      if (hi || o.stroke) { ctx.strokeStyle = hi ? P.text : BB.alpha(P.text, 0.3); ctx.lineWidth = hi ? 2 : 0.8; ctx.stroke(); }
    });
  };
  function inside(rings, u, v) {
    var c = false;
    rings.forEach(function (r) {
      for (var i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
        var xi = r[2 * i], yi = r[2 * i + 1], xj = r[2 * j], yj = r[2 * j + 1];
        if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) c = !c;
      }
    });
    return c;
  }
  AT.inside = inside;
  /** 지도에서 누른 자리의 구조(위층부터). 없으면 null */
  AT.hitMap = function (T, view, px, py, layers) {
    var q = T.inv(px, py), maps = D.maps[view] || {};
    layers = (layers || AT.mapKeys(view)).slice().reverse();
    for (var i = 0; i < layers.length; i++) if (maps[layers[i]] && inside(maps[layers[i]], q[0], q[1])) return layers[i];
    return null;
  };

  /* ------------------------------------------------------------ 단면 */
  // plane: "axial"(가로면, 발 쪽에서 올려다봄: 가로 x, 세로 y·앞이 위) | "coronal"(관상면, 앞에서 봄: x, z) | "sagittal"(시상면, 몸의 왼쪽에서 봄·앞이 화면 왼쪽: y, z)
  // sections-data.js는 atlas.js 뒤에 불러오므로 쓸 때마다 읽는다
  var S = null;
  function sec() { return S || (S = window.AT_SECTIONS || null); }
  AT.hasSections = function () { return !!sec(); };
  AT.PLANES = { axial: "가로면", coronal: "관상면", sagittal: "시상면" };
  AT.sectionGroups = function () { return sec() ? S.groups : []; };
  AT.sectionLevels = function (plane) { return sec() ? S[plane].levels : []; };
  /** 가장 가까운 단면 번호 */
  AT.sectionIndex = function (plane, level) {
    var L = AT.sectionLevels(plane), best = 0;
    for (var i = 1; i < L.length; i++) if (Math.abs(L[i] - level) < Math.abs(L[best] - level)) best = i;
    return best;
  };
  /** 단면 하나: [{k, ko, rings}] (그리는 순서: 아래층부터) */
  AT.sectionAt = function (plane, level) {
    if (!sec()) return [];
    var i = AT.sectionIndex(plane, level);
    return (S[plane].slices[i] || []).map(function (g) { return { k: S.groups[g[0]].k, ko: S.groups[g[0]].ko, rings: g[1] }; });
  };
  /** 단면 평면의 화면 범위(몸 전체가 들어가는 고정 범위, mm) */
  AT.SECTION_EXT = { axial: [-345, -260, 345, 60], coronal: [-345, -90, 345, 1660], sagittal: [-260, -90, 60, 1660] };
  /** 단면용 화면 변환. 가로면은 y가 클수록 아래(앞이 위), 관상·시상면은 z가 클수록 위 */
  AT.sectionFit = function (box, plane, o) {
    o = o || {};
    var ext = o.ext || AT.SECTION_EXT[plane];
    return AT.fit(box, ext, { pad: o.pad, flipY: plane !== "axial" });
  };
  /**
   * 단면 그리기: AT.drawSection(ctx, T, plane, level, {mode: "ct"|"color", highlight, bg, labels})
   * mode "ct"는 어두운 바탕의 회색조(실제 CT처럼 공기는 검정, 뼈는 흰색), "color"는 구조별 색.
   * 반환: 그린 단면(hit-test에 쓴다).
   */
  AT.drawSection = function (ctx, T, plane, level, o) {
    o = o || {};
    var sec = AT.sectionAt(plane, level), ct = o.mode !== "color", P = BB.palette();
    if (o.bg !== false) {
      ctx.fillStyle = ct ? "#050608" : P.surface;
      ctx.fillRect(T.box.x, T.box.y, T.box.w, T.box.h);
    }
    sec.forEach(function (g) {
      pathRings(ctx, T, g.rings);
      var hi = o.highlight && o.highlight === g.k;
      if (ct) ctx.fillStyle = AT.gray(AT.CT[g.k] != null ? AT.CT[g.k] : 0.45);
      else ctx.fillStyle = g.k === "body" ? BB.alpha(AT.COLORS.skin, BB.isDark() ? 0.35 : 0.45) : (AT.COLORS[g.k] || P.accent);
      ctx.globalAlpha = o.highlight && !hi && g.k !== "body" ? 0.35 : 1;
      ctx.fill("evenodd");
      ctx.globalAlpha = 1;
      if (hi) { ctx.strokeStyle = ct ? "#ffd43b" : P.text; ctx.lineWidth = 2; ctx.stroke(); }
    });
    return sec;
  };
  /** 단면에서 누른 자리의 구조(위층부터): {k, ko} | null. 몸 안의 빈 곳(폐 등)은 {k: "air"} */
  AT.hitSection = function (T, plane, level, px, py) {
    var q = T.inv(px, py), sec = AT.sectionAt(plane, level);
    for (var i = sec.length - 1; i >= 0; i--) if (inside(sec[i].rings, q[0], q[1])) {
      if (sec[i].k === "body") return { k: "body", ko: "피부·피하 지방 등(데이터에 따로 없는 조직)" };
      return { k: sec[i].k, ko: sec[i].ko };
    }
    return null;
  };
  /** 단면 넓이(mm²): 한 구조의 다각형 넓이 합(evenodd: 구멍은 뺀다) */
  AT.sectionArea = function (plane, level, k) {
    var g = AT.sectionAt(plane, level).filter(function (x) { return x.k === k; })[0];
    if (!g) return 0;
    var rings = g.rings.map(function (r) { var a = 0; for (var i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) a += r[2 * j] * r[2 * i + 1] - r[2 * i] * r[2 * j + 1]; return { a: Math.abs(a / 2), r: r }; });
    // 다른 고리 안에 든 고리는 구멍으로 본다(짝수 겹은 더하고 홀수 겹은 뺀다)
    var total = 0;
    rings.forEach(function (x, i) {
      var depth = 0, r = x.r;
      rings.forEach(function (y, j) { if (i !== j && y.a > x.a && inside([y.r], r[0], r[1])) depth++; });
      total += depth % 2 ? -x.a : x.a;
    });
    return total;
  };

  /* ------------------------------------------------------------ 작은 그림 도구 */
  /** 축척 막대: AT.scaleBar(ctx, T, x, y, mm, label) */
  AT.scaleBar = function (ctx, T, x, y, mm, color) {
    var w = mm * T.s, P = BB.palette();
    ctx.strokeStyle = color || P.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.moveTo(x + w, y - 4); ctx.lineTo(x + w, y + 4); ctx.stroke();
    ctx.fillStyle = color || P.text; ctx.font = BB.font(11, true); ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(AT.fmtLen(mm), x + w / 2, y - 5);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  };
  /** 방향 표시(R/L/A/P/S/I): 화면 네 귀퉁이 대신 네 변 가운데 글자 */
  AT.orient = function (ctx, box, plane, color) {
    var lab = { axial: ["R", "L", "A", "P"], coronal: ["R", "L", "S", "I"], sagittal: ["A", "P", "S", "I"], front: ["R", "L", "S", "I"], side: ["A", "P", "S", "I"] }[plane];
    ctx.fillStyle = color || "#9aa6bf"; ctx.font = BB.font(12, true, 600); ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillText(lab[0], box.x + 10, box.y + box.h / 2); ctx.fillText(lab[1], box.x + box.w - 10, box.y + box.h / 2);
    ctx.fillText(lab[2], box.x + box.w / 2, box.y + 10); ctx.fillText(lab[3], box.x + box.w / 2, box.y + box.h - 10);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  };
})();
