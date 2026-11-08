// AnatomyBook 표지(covers.js의 skeleton)에 쓰는 그림 좌표를 책의 BodyParts3D 데이터에서 만든다.
// Usage: node tools/anatomy-cover.mjs   (anatomy/js/atlas-data.js·sections-data.js가 바뀌면 다시 돌린다)
// - 왼쪽: 앞에서 본 몸의 윤곽(skin)과 뼈(머리뼈에는 눈구멍을 뚫는다)
// - 오른쪽 화면: 여섯 높이(머리·가슴·배·골반·허벅지·종아리)의 가로 단면을 CT 밝기(AT.CT와 같은 값)별로 묶은 경로
// 좌표는 표지 viewBox(200×130)를 Q 단위로 나눈 정수이고(그릴 때 scale(Q)), 경로는 상대 좌표로 줄여 쓴다.
// 결과는 shared/js/covers.js의 `const ANATOMY = …;` 한 줄을 바꾼다.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const window = {};
for (const f of ['atlas-data.js', 'sections-data.js']) new Function('window', readFileSync(join(root, 'anatomy/js', f), 'utf8'))(window);
const D = window.AT_DATA, S = window.AT_SECTIONS, F = D.maps.front;

const Q = 0.5;                                   // 좌표 단위(표지 viewBox 단위)
const LEVELS = [1560, 1220, 1060, 880, 620, 300]; // 단면 높이(mm): 뇌와 뇌실, 심장과 폐, 간·위·콩팥, 엉덩뼈 날개, 넙다리, 종아리
const FIG = { cx: 40, top: 6, height: 118 };     // 몸: 가운데 x, 정수리 y, 키(viewBox 단위)
const PANEL = [78, 34, 118, 62];                 // CT 화면 x, y, 너비, 높이
const PAD = 4;                                   // 화면 안 여백
// CT 밝기(0 공기 ~ 1 뼈): anatomy/js/atlas.js의 AT.CT와 같다
const CT = { body: 0.24, lung: 0.03, blood: 0.6, muscle: 0.46, bone: 0.96, disc: 0.5, brain: 0.5, ventricle: 0.34, eye: 0.4, cord: 0.52, heart: 0.56, artery: 0.8, vein: 0.7,
  airway: 0.02, esophagus: 0.45, liver: 0.56, gallbladder: 0.36, stomach: 0.47, spleen: 0.55, pancreas: 0.5, kidney: 0.58, adrenal: 0.5,
  smallint: 0.48, largeint: 0.42, bladder: 0.36, prostate: 0.48 };
// 단순화 허용 오차와 버릴 넓이(viewBox 단위). 근육·뇌 주름처럼 자잘한 경계는 더 거칠게 줄인다.
const TOL = { skin: 0.3, ribcage: 0.35, spine: 0.4, bone: 0.3, slice: 0.4, muscle: 0.75, brain: 0.6, body: 0.45, smallint: 0.6, largeint: 0.6 };
const MIN_AREA = { figure: 0.3, slice: 0.6, muscle: 1.6, brain: 1.2, bone: 0.5 };

const area = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1]; return a / 2; };
function simplify(pts, tol) { // Douglas–Peucker
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-9;
  let at = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / len; if (d > max) { max = d; at = i; } }
  return max <= tol ? [a, b] : simplify(pts.slice(0, at + 1), tol).slice(0, -1).concat(simplify(pts.slice(at), tol));
}
// 닫힌 고리 하나 → "M x y l dx dy …z" (Q 단위 정수). 너무 작으면 버린다.
function ring(pts, tol, minArea) {
  if (Math.abs(area(pts)) < minArea) return '';
  let far = 0;
  pts.forEach((p, i) => { if (Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) > Math.hypot(pts[far][0] - pts[0][0], pts[far][1] - pts[0][1])) far = i; });
  const loop = pts.concat([pts[0]]);
  const q = simplify(loop.slice(0, far + 1), tol).slice(0, -1).concat(simplify(loop.slice(far), tol)).slice(0, -1)
    .map(([x, y]) => [Math.round(x / Q), Math.round(y / Q)])
    .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
  if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
  if (q.length < 3 || Math.abs(area(q)) * Q * Q < minArea / 2) return '';
  let d = `M${q[0][0]} ${q[0][1]}l`;
  for (let i = 1; i < q.length; i++) {
    const x = q[i][0] - q[i - 1][0], y = q[i][1] - q[i - 1][1];
    d += (i > 1 && x >= 0 ? ' ' : '') + x + (y >= 0 ? ' ' : '') + y;
  }
  return d + 'z';
}
const pairs = (flat, fx, fy) => { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([fx(flat[i]), fy(flat[i + 1])]); return p; };
const rings = (list, fx, fy, tol, minArea) => list.map((r) => ring(pairs(r, fx, fy), tol, minArea)).join('');

// 앞모습: x(오른쪽 −) → 화면 가로, z(위 +) → 화면 세로
let lo = Infinity, hi = -Infinity, top = -Infinity, bottom = Infinity;
F.skin.forEach((r) => { for (let i = 0; i < r.length; i += 2) { lo = Math.min(lo, r[i]); hi = Math.max(hi, r[i]); top = Math.max(top, r[i + 1]); bottom = Math.min(bottom, r[i + 1]); } });
const s = FIG.height / (top - bottom);
const X = (x) => FIG.cx + (x - (lo + hi) / 2) * s, Y = (z) => FIG.top + (top - z) * s;
const skin = rings(F.skin, X, Y, TOL.skin, MIN_AREA.figure);
// 눈구멍: 눈알 중심에 너비 40 mm·높이 34 mm의 타원 구멍. 머리뼈 윤곽과 반대로 돌려 nonzero 채우기에서 비게 한다.
const cranium = F.skull.map((r) => pairs(r, X, Y)).reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
const eye = D.parts.find((p) => p.k === 'eyeball').c, skullSign = Math.sign(area(cranium));
const orbit = (cx) => { const p = Array.from({ length: 10 }, (_, i) => [X(cx) + 20 * s * Math.cos((i * Math.PI) / 5), Y(eye[2] + 2) + 17 * s * Math.sin((i * Math.PI) / 5)]); return Math.sign(area(p)) === skullSign ? p.reverse() : p; };
const bones = ['skull', 'spine', 'ribcage', 'armbones_r', 'armbones_l', 'pelvis', 'legbones_r', 'legbones_l']
  .map((k) => rings(F[k], X, Y, TOL[k] ?? TOL.bone, MIN_AREA.figure)).join('') + [eye[0], -eye[0]].map((x) => ring(orbit(x), 0.1, 0)).join('');

// 가로 단면: 몸의 오른쪽이 화면 왼쪽, 앞이 위(AT.drawSection과 같은 방향). 모든 단면을 같은 배율로 그린다.
const index = (z) => S.axial.levels.reduce((b, L, i) => (Math.abs(L - z) < Math.abs(S.axial.levels[b] - z) ? i : b), 0);
const box = [Infinity, Infinity, -Infinity, -Infinity];
LEVELS.forEach((z) => S.axial.slices[index(z)].forEach(([, list]) => list.forEach((r) => { for (let i = 0; i < r.length; i += 2) {
  box[0] = Math.min(box[0], r[i]); box[2] = Math.max(box[2], r[i]); box[1] = Math.min(box[1], r[i + 1]); box[3] = Math.max(box[3], r[i + 1]);
} })));
const cs = Math.min((PANEL[2] - 2 * PAD) / (box[2] - box[0]), (PANEL[3] - 2 * PAD) / (box[3] - box[1]));
const SX = (x) => PANEL[0] + PANEL[2] / 2 + (x - (box[0] + box[2]) / 2) * cs, SY = (y) => PANEL[1] + PANEL[3] / 2 + (y - (box[1] + box[3]) / 2) * cs;
const slices = LEVELS.map((z) => {
  const i = index(z), layers = [];
  S.axial.slices[i].forEach(([g, list]) => {
    const k = S.groups[g].k, v = CT[k] ?? 0.45, d = rings(list, SX, SY, TOL[k] ?? TOL.slice, MIN_AREA[k] ?? MIN_AREA.slice);
    if (!d) return;
    const last = layers[layers.length - 1];
    if (last && last[0] === v) last[1] += d; else layers.push([v, d]); // 아래층부터, 같은 밝기가 이어지면 합친다
  });
  return { z: S.axial.levels[i], y: +Y(S.axial.levels[i]).toFixed(1), layers };
});

const data = { q: Q, fig: [+X(lo).toFixed(1), +X(hi).toFixed(1)], panel: PANEL, skin, bones, slices };
const file = join(root, 'shared/js/covers.js'), src = readFileSync(file, 'utf8');
const line = /^ {2}const ANATOMY = .*;$/m;
if (!line.test(src)) throw new Error('shared/js/covers.js에 `  const ANATOMY = …;` 줄이 없습니다');
writeFileSync(file, src.replace(line, () => `  const ANATOMY = ${JSON.stringify(data)};`));
const bytes = JSON.stringify(data).length;
console.log(`covers.js ANATOMY: ${(bytes / 1024).toFixed(1)} KB, levels ${slices.map((x) => x.z).join(' ')} mm, slice scale ${cs.toFixed(3)}`);
