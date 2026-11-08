/* Copyright (c) 2026 geniuskey and AnatomyBook contributors. MIT. */
/* AnatomyBook 데이터 회귀 검사: 해부 데이터의 형태와 상식적인 범위, AT 도구의 계산, 장의 인라인 스크립트 문법, 3D 모델 key. */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const ctx = { window: {} };
ctx.BB = { clamp: (x, a, b) => Math.min(b, Math.max(a, x)) };
vm.createContext(ctx);
for (const f of ["js/atlas-data.js", "js/sections-data.js", "js/atlas.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const AT = ctx.window.AT, D = ctx.window.AT_DATA, S = ctx.window.AT_SECTIONS;

// 1) 구조 데이터의 형태
const keys = new Set();
for (const p of D.parts) {
  assert(!keys.has(p.k), "중복 key " + p.k); keys.add(p.k);
  assert(p.ko && p.en && p.sys && p.n > 0, "필드 누락 " + p.k);
  assert(p.vol > 0 && p.area > 0, "부피·겉넓이 " + p.k);
  for (let i = 0; i < 3; i++) assert(p.lo[i] <= p.c[i] + 1 && p.c[i] <= p.hi[i] + 1, "무게중심이 경계 상자 밖 " + p.k);
}
// 2) 상식적인 범위(한 성인 남성 모델)
const B = AT.body;
assert(B.height > 1500 && B.height < 1900, "키 " + B.height);
assert(B.vol > 50 && B.vol < 90, "몸의 부피 " + B.vol);
const range = (k, lo, hi) => { const v = AT.part(k).vol; assert(v >= lo && v <= hi, `${k} 부피 ${v} mL가 ${lo}~${hi} 밖`); };
range("brain", 900, 1700); range("liver", 800, 2200); range("kidney_r", 80, 250); range("femur", 250, 700); range("lens", 0.1, 0.5); range("stomach", 100, 1500);
assert(AT.part("heart").c[0] > 0, "심장 무게중심은 정중선 왼쪽(+x)");
assert(AT.part("liver").c[0] < 0, "간 무게중심은 정중선 오른쪽(−x)");
assert(AT.heightOf("kidney_r") < AT.heightOf("kidney_l"), "오른쪽 콩팥이 더 낮다");
assert(AT.size("femur")[2] / B.height > 0.22 && AT.size("femur")[2] / B.height < 0.3, "넙다리뼈/키 비율");
// 척추뼈는 아래로 갈수록 대체로 커진다(목뼈 < 등뼈 < 허리뼈의 평균)
const avg = (ks) => ks.reduce((s, k) => s + AT.part(k).vol, 0) / ks.length;
assert(avg(["c3", "c4", "c5", "c6", "c7"]) < avg(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12"]));
assert(avg(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12"]) < avg(["l1", "l2", "l3", "l4", "l5"]));
// 3) AT 도구
assert.equal(Math.round(AT.dist([0, 0, 0], [3, 4, 0])), 5);
assert.deepEqual(Array.from(AT.relation([0, 0, 0], [0, 0, 100])), ["위쪽(상)"]);
assert.deepEqual(Array.from(AT.relation([10, 0, 0], [80, 0, 0])), ["가쪽(외측)"]);
assert.deepEqual(Array.from(AT.relation([0, 0, 0], [0, -50, 0])), ["앞쪽(전)"]);
assert.equal(AT.fmtLen(1719), "1.72 m"); assert.equal(AT.fmtVol(1500), "1.50 L");
// 지도와 단면
for (const view of ["front", "side"]) for (const k of Object.keys(D.mapNames)) assert(D.maps[view][k] && D.maps[view][k].length, `지도 ${view}/${k}`);
for (const plane of ["axial", "coronal", "sagittal"]) {
  assert.equal(S[plane].levels.length, S[plane].slices.length);
  for (const sl of S[plane].slices) for (const g of sl) { assert(g[0] >= 0 && g[0] < S.groups.length); for (const r of g[1]) assert(r.length >= 6 && r.length % 2 === 0); }
}
const T = AT.sectionFit({ x: 0, y: 0, w: 690, h: 320 }, "axial", { pad: 0 });
assert.equal(AT.hitSection(T, "axial", 1000, T.X(-60), T.Y(-88)).k, "kidney", "오른쪽 콩팥 높이의 가로면 히트");
const bodyArea = AT.sectionArea("axial", 1000, "body");
assert(bodyArea > 40000 && bodyArea < 90000, "배 높이 몸 단면 넓이 " + bodyArea);
// 4) 장: 인라인 스크립트 문법, JSON-LD, 3D 모델 key가 실제 모델 그룹에 있는지
const models = fs.readFileSync(path.join(root, "tools/bp3d_models.py"), "utf8");
const groupKeys = {}; let cur = null;
for (const line of models.split("\n")) {
  const m = line.match(/^    "(\w+)": dict\(groups=\[/); if (m) { cur = m[1]; groupKeys[cur] = new Set(); continue; }
  if (cur) for (const g of line.matchAll(/(?:dict\(key|M\()=?"?(\w+)"/g)) groupKeys[cur].add(g[1]);
}
let inline = 0, blocks = 0;
for (const name of fs.readdirSync(path.join(root, "chapters"))) {
  const src = fs.readFileSync(path.join(root, "chapters", name), "utf8");
  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/src\s*=/.test(m[1]) || !m[2].trim()) continue;
    if (/application\/ld\+json/.test(m[1])) JSON.parse(m[2]); else { new vm.Script(m[2], { filename: name }); inline++; }
  }
  for (const m of src.matchAll(/<div class="sim model3d"[^>]*data-model="(\w+)"[^>]*>([\s\S]*?)<div class="info-panel/g)) {
    blocks++;
    assert(groupKeys[m[1]], `${name}: 없는 모델 ${m[1]}`);
    assert(fs.existsSync(path.join(root, "assets/3d", m[1] + ".glb")), `${name}: assets/3d/${m[1]}.glb 없음`);
    for (const p of m[2].matchAll(/data-(?:part|fade)="([\w,]+)"/g)) for (const k of p[1].split(",")) assert(groupKeys[m[1]].has(k), `${name}: 모델 ${m[1]}에 없는 부위 ${k}`);
  }
}
console.log(JSON.stringify({ parts: D.parts.length, models: Object.keys(groupKeys).length, model3dBlocks: blocks, inlineScripts: inline, bodyVolL: B.vol }));
