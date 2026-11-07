/* Copyright (c) 2026 geniuskey and BodyBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   BodyBook 생리 엔진 — 전역 객체 BD
   모든 장이 같은 몸 모델과 같은 참고값을 쓰게 하는 공통 엔진이다.
   단위는 생리학에서 흔히 쓰는 단위를 그대로 쓴다(mmHg, mL, L/min, mg/dL, °C, kcal).
   교육용 근사 모델이며 진단·치료에 쓰지 않는다.
   브라우저(window.BD)와 node(require)에서 모두 동작한다.
   ========================================================================== */
(function (root) {
  "use strict";
  const BD = {};

  /* ======================================================== 0. 수치 도구 */
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  BD.clamp = clamp;
  BD.lerp = (a, b, t) => a + (b - a) * t;
  BD.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  BD.logspace = (a, b, n) => BD.linspace(Math.log10(a), Math.log10(b), n).map((e) => Math.pow(10, e));
  BD.sum = (xs) => xs.reduce((s, x) => s + x, 0);
  BD.mean = (xs) => (xs.length ? BD.sum(xs) / xs.length : NaN);
  BD.sd = (xs) => { const m = BD.mean(xs); return Math.sqrt(BD.mean(xs.map((x) => (x - m) * (x - m)))); };
  /** 배열 보간: xs 오름차순 */
  BD.interp = function (xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] > x) hi = m; else lo = m; }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + (ys[hi] - ys[lo]) * t;
  };
  /** 시드 고정 난수 (mulberry32) → 0..1 */
  BD.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  BD.gauss = function (seed) { const r = BD.rng(seed); return function () { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }; };
  /** 힐 함수 x^n/(k^n + x^n) */
  BD.hill = (x, k, n) => (x <= 0 ? 0 : Math.pow(x, n) / (Math.pow(k, n) + Math.pow(x, n)));
  /**
   * 상미분방정식 적분(RK4). f(t, y) → dy/dt (배열).
   *   BD.ode(f, y0, {t0, t1, dt, every, onStep(t, y)}) → {t:[], y:[[...]], last}
   * every: 몇 스텝마다 기록할지(기본 1).
   */
  BD.ode = function (f, y0, o) {
    const n = y0.length, dt = o.dt, every = o.every || 1;
    let t = o.t0 || 0, y = y0.slice();
    const T = [t], Y = [y.slice()];
    const k1 = new Array(n), k2 = new Array(n), k3 = new Array(n), tmp = new Array(n);
    const steps = Math.round(((o.t1 || 0) - t) / dt);
    for (let s = 1; s <= steps; s++) {
      const a = f(t, y);
      for (let i = 0; i < n; i++) { k1[i] = a[i]; tmp[i] = y[i] + 0.5 * dt * a[i]; }
      const b = f(t + 0.5 * dt, tmp);
      for (let i = 0; i < n; i++) { k2[i] = b[i]; tmp[i] = y[i] + 0.5 * dt * b[i]; }
      const c = f(t + 0.5 * dt, tmp);
      for (let i = 0; i < n; i++) { k3[i] = c[i]; tmp[i] = y[i] + dt * c[i]; }
      const d = f(t + dt, tmp);
      for (let i = 0; i < n; i++) y[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + d[i]);
      t = (o.t0 || 0) + s * dt;
      if (o.clampFn) o.clampFn(y);
      if (o.onStep) o.onStep(t, y);
      if (s % every === 0 || s === steps) { T.push(t); Y.push(y.slice()); }
    }
    return { t: T, y: Y, last: y, col: (i) => Y.map((r) => r[i]) };
  };
  /** 오차 함수 (Abramowitz–Stegun 7.1.26) */
  const erf = (BD.erf = function (x) {
    const sg = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    return sg * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  });
  /** 지연 버퍼: 고정 dt로 값을 쌓고 τ 전의 값을 읽는다 */
  BD.delayLine = function (dt, tau, init) {
    const n = Math.max(1, Math.round(tau / dt));
    const buf = new Array(n).fill(init); let i = 0;
    return { push(v) { const old = buf[i]; buf[i] = v; i = (i + 1) % n; return old; }, peek() { return buf[i]; } };
  };
  /** 1차 지연 응답(시정수 τ)의 해석해 */
  BD.firstOrder = (y0, yInf, t, tau) => yInf + (y0 - yInf) * Math.exp(-t / tau);
  /** 반감기 ↔ 속도 상수 */
  BD.kFromHalf = (th) => Math.LN2 / th;
  BD.halfFromK = (k) => Math.LN2 / k;

  /* ======================================================== 1. 참고값과 케이스 인물 */
  /**
   * 건강한 성인(70 kg 안팎)의 대표 참고값. 교과서(Guyton·Hall, Boron·Boulpaep, West, Silverthorn)에
   * 흔히 실리는 값을 반올림했다. 실제 정상 범위는 검사실·나이·성별에 따라 다르다.
   */
  BD.REF = {
    hr: 70, sv: 70, co: 5.0, sbp: 120, dbp: 80, map: 93, cvp: 4, tpr: 18,      // bpm, mL, L/min, mmHg, mmHg·min/L
    edv: 120, esv: 50, ef: 0.58, bloodVol: 5.0, hct: 0.45, hb: 15,              // mL, L, g/dL
    rr: 12, vt: 500, deadSpace: 150, ve: 6.0, va: 4.2,                            // 회/분, mL, L/min
    pao2: 95, paco2: 40, ph: 7.40, hco3: 24, sao2: 0.97, pvo2: 40, svo2: 0.75,    // mmHg, mEq/L
    vo2: 250, vco2: 200, rq: 0.8,                                                 // mL/min
    gfr: 125, rpf: 650, rbf: 1100, urine: 1.5, posm: 290,                         // mL/min, L/day, mOsm/kg
    tcore: 37.0, tskin: 33.5,
    glucose: 90, insulin: 8, a1c: 5.4,                                            // mg/dL, µU/mL, %
    na: 140, k: 4.5, cl: 104, ca: 9.5,
    cortisolAM: 15, tsh: 1.5, ft4: 16,                                            // µg/dL, mU/L, pmol/L
    patm: 760,
  };
  /**
   * 이어지는 케이스: 정다온(가상의 인물, 실제 인물과 무관).
   * 34세, 키 175 cm, 몸무게 78 kg, 체지방 24 %, 사무직. 공식 계산은 남성 식을 쓴다.
   * 12주 뒤 가을 10 km 달리기 대회(기온 24 °C, 습도 60 %)를 목표로 훈련을 시작한다.
   */
  BD.DAON = {
    name: "다온", age: 34, sex: "m", height: 175, weight: 78, bodyFat: 0.24,
    restHr: 72, sbp: 128, dbp: 82, glucose: 98, a1c: 5.6, vo2max: 38,
    pal: 1.4, race: { km: 10, temp: 24, rh: 60, weeks: 12 },
  };
  BD.bmi = (kg, cm) => kg / Math.pow(cm / 100, 2);
  /** 체표면적(m², DuBois) */
  BD.bsa = (kg, cm) => 0.007184 * Math.pow(kg, 0.425) * Math.pow(cm, 0.725);
  /** 평균 동맥압(mmHg): 확장기 + 맥압/3 */
  BD.mapOf = (sbp, dbp) => dbp + (sbp - dbp) / 3;
  /** 최대 심박수(Tanaka 2001): 208 − 0.7 × 나이 */
  BD.hrMax = (age) => 208 - 0.7 * age;
  /** 몸의 수분: 체중의 약 60 %(남), 50 %(여). 지방 조직에는 물이 적다 */
  BD.tbw = (kg, sex = "m") => kg * (sex === "f" ? 0.5 : 0.6);

  /* ======================================================== 2. 심장: 시변 탄성 모델 */
  /**
   * 좌심실 시변 탄성(time-varying elastance) + 닫힌 순환(동맥 탄성함, 정맥·좌심방 저장소).
   *   Plv = a(t)·Emax·(Vlv − V0) + (1 − a(t))·Ped(Vlv), a(t)는 Stergiopulos 이중 힐 활성 곡선(0~1),
   *   Ped = A·(e^(k(V−V0)) − 1)은 이완기 압력-부피 관계(지수 곡선: 많이 채울수록 급격히 뻣뻣해진다)
   *   승모판·대동맥판은 한 방향 밸브(다이오드 + 저항). 심방 수축(atrial)은 이완기 끝에 좌심방 압력을 잠깐 올린다.
   * opts: hr(bpm 70), emax(mmHg/mL 2.8, 수축력), edA(0.3 mmHg)·edK(0.03 /mL, 이완기 경직도: 클수록 뻣뻣), v0(mL 10),
   *       rs(말초 저항 mmHg·s/mL 1.05), ca(동맥 탄성 mL/mmHg 1.35), cv(정맥 탄성 30), vs(유효 순환 혈액량 mL 440, 앞부하),
   *       rmv(승모판 저항 0.006), rao(대동맥판 저항 0.012), atrial(심방 수축 세기 0~1, 기본 1), beats(시뮬레이션 박동 수 8)
   * 반환: 마지막 한 박동의 1 ms 간격 기록 {t, plv, pao, pla, vlv, qao, qmv, e},
   *       요약 {edv, esv, sv, ef, co(L/min), sbp, dbp, map, pp, plaMean(평균 좌심방압), lvedp, plvMax(좌심실 최고압), esp(수축기말 압력), ivc·ivr(등용적 수축·이완 기간 s), ejectT, events{mvClose, avOpen, avClose, mvOpen}, strokeWork(J)}
   */
  BD.HEART = { hr: 70, emax: 2.8, edA: 0.22, edK: 0.033, v0: 10, rs: 1.05, ca: 1.35, cv: 30, vs: 440, rmv: 0.006, rao: 0.012, atrial: 1, beats: 10 };
  /** 자주 쓰는 상태(BD.heart에 넘긴다). run: 다온의 10 km 대회 속도(심박 168) */
  BD.HEART_PRESETS = {
    rest: { name: "안정", hr: 70 },
    daon: { name: "다온 안정", hr: 72, rs: 1.15 },
    athlete: { name: "지구력 선수 안정", hr: 48, vs: 480, emax: 3.0 },
    run: { name: "달리기(대회 속도)", hr: 168, emax: 5.5, vs: 700, rs: 0.32, tscale: 0.8, ca: 0.8 },
    hypertension: { name: "고혈압(말초 저항 증가)", hr: 72, rs: 1.7, ca: 0.9 },
    failure: { name: "수축 기능 저하 심부전(늘어난 심실)", hr: 90, emax: 0.9, vs: 620, edK: 0.022, v0: 40 },
    stiff: { name: "이완 기능 저하(뻣뻣한 심실)", hr: 72, edK: 0.05, vs: 560 },
    stenosis: { name: "대동맥판 협착", hr: 72, rao: 0.25, emax: 3.5 },
    bleed: { name: "출혈(혈액량 감소)", hr: 115, vs: 320, emax: 3.6, rs: 0.9 },
  };
  BD.elastanceAct = function (tn) {
    const a = Math.pow(tn / 0.7, 1.9), b = Math.pow(tn / 1.17, 21.9);
    return 1.553 * (a / (1 + a)) * (1 / (1 + b));
  };
  BD.heart = function (opts = {}) {
    const o = Object.assign({}, BD.HEART, opts);
    const dt = 1e-4, spb = Math.round(60 / o.hr / dt), T = spb * dt;      // 한 박동의 스텝 수(정수)로 시간을 센다
    const Tmax = (0.2 + 0.15 * T) * (o.tscale || 1);   // tscale < 1: 교감 신경이 수축·이완을 빠르게(이완 촉진)
    const nb = o.beats, steps = nb * spb;
    // 초기 상태: 유효 혈액량을 동맥·정맥·심실에 나눈다
    let vlv = 110, pa = 85;
    let pv = (o.vs - vlv - o.ca * pa) / o.cv;
    const rec = { t: [], plv: [], pao: [], pla: [], vlv: [], qao: [], qmv: [], e: [] };
    const startRec = (nb - 1) * spb;
    const atrialAmp = 4 * o.atrial;   // mmHg (a파)
    for (let s = 0; s < steps; s++) {
      const tc = (s % spb) * dt;
      const act = BD.elastanceAct(tc / Tmax);
      const pPass = o.edA * (Math.exp(o.edK * (vlv - o.v0)) - 1);
      const plv = act * o.emax * (vlv - o.v0) + (1 - act) * pPass;
      const E = act * o.emax + (1 - act) * o.edA * o.edK * Math.exp(o.edK * (vlv - o.v0));
      // 심방 수축: 다음 심실 수축 약 0.1 s 전에 정점
      const ta = T - 0.1, da = tc - ta;
      const pla = pv + atrialAmp * Math.exp(-(da * da) / (2 * 0.035 * 0.035)) + atrialAmp * Math.exp(-((tc + 0.1) * (tc + 0.1)) / (2 * 0.035 * 0.035));
      const qmv = pla > plv ? (pla - plv) / o.rmv : 0;
      const qao = plv > pa ? (plv - pa) / o.rao : 0;
      const qs = (pa - pv) / o.rs;
      vlv += dt * (qmv - qao);
      pa += (dt * (qao - qs)) / o.ca;
      pv += (dt * (qs - qmv)) / o.cv;
      if (s >= startRec && (s - startRec) % 10 === 0) {
        rec.t.push(tc); rec.plv.push(plv); rec.pao.push(pa); rec.pla.push(pla); rec.vlv.push(vlv); rec.qao.push(qao); rec.qmv.push(qmv); rec.e.push(E);
      }
    }
    const edv = Math.max(...rec.vlv), esv = Math.min(...rec.vlv), sv = edv - esv;
    const sbp = Math.max(...rec.pao), dbp = Math.min(...rec.pao);
    const map = BD.mean(rec.pao);
    // 판막 사건(마지막 박동 안의 시각, s)
    const ev = {};
    const n = rec.t.length;
    for (let i = 1; i < n; i++) {
      if (rec.qmv[i - 1] > 0 && rec.qmv[i] === 0 && ev.mvClose == null && rec.t[i] < 0.3) ev.mvClose = rec.t[i];
      if (rec.qao[i - 1] === 0 && rec.qao[i] > 0 && ev.avOpen == null) ev.avOpen = rec.t[i];
      if (rec.qao[i - 1] > 0 && rec.qao[i] === 0 && ev.avOpen != null && ev.avClose == null) ev.avClose = rec.t[i];
      if (rec.qmv[i - 1] === 0 && rec.qmv[i] > 0 && ev.avClose != null && ev.mvOpen == null) ev.mvOpen = rec.t[i];
    }
    if (ev.mvClose == null) ev.mvClose = 0;
    const iEdv = rec.vlv.indexOf(edv);
    return Object.assign(rec, {
      T, edv, esv, sv, ef: sv / edv, co: (sv * o.hr) / 1000, sbp, dbp, map, pp: sbp - dbp,
      plaMean: BD.mean(rec.pla), lvedp: rec.plv[iEdv], ivc: (ev.avOpen || 0) - (ev.mvClose || 0), ivr: (ev.mvOpen || 0) - (ev.avClose || 0),
      ejectT: (ev.avClose || 0) - (ev.avOpen || 0), events: ev, opts: o, plvMax: Math.max(...rec.plv),
      strokeWork: rec.plv.reduce((s, p, i) => (i ? s + p * (rec.vlv[i - 1] - rec.vlv[i]) : s), 0) * 1.333e-4, // J (mmHg·mL → J)
      esp: rec.plv[rec.vlv.indexOf(esv)],
    });
  };
  /** 심박수를 바꿔 가며 심박출량을 구한다(다른 값은 고정) → [{hr, sv, co, edv, map}] */
  BD.heartSweep = function (hrs, opts = {}) {
    return hrs.map((hr) => { const r = BD.heart(Object.assign({}, opts, { hr, beats: 8 })); return { hr, sv: r.sv, co: r.co, edv: r.edv, esv: r.esv, map: r.map, sbp: r.sbp, dbp: r.dbp }; });
  };

  /* ======================================================== 3. 혈관과 혈압 */
  /** 푸아죄유: 유량(mL/s) = π r⁴ ΔP / (8 η L). r, L은 cm, ΔP는 mmHg, η는 cP(혈액 약 3.5) */
  BD.poiseuille = function (r, L, dP, eta = 3.5) {
    const dyn = dP * 1333.22, etaP = eta * 0.01;     // dyn/cm², poise
    return (Math.PI * Math.pow(r, 4) * dyn) / (8 * etaP * L);
  };
  /** 저항(mmHg·s/mL) */
  BD.resistance = (r, L, eta = 3.5) => (8 * eta * 0.01 * L) / (Math.PI * Math.pow(r, 4)) / 1333.22;
  BD.series = (rs) => BD.sum(rs);
  BD.parallel = (rs) => 1 / BD.sum(rs.map((r) => 1 / r));
  /** 헤마토크릿에 따른 혈액 점도(상대값, 물 = 1). 경험식 */
  BD.viscosity = (hct) => 1 + 2.5 * hct + 7.35 * hct * hct * hct * 4;
  /**
   * 3요소 윈드케셀: 대동맥 유량 파형 Q(t)를 넣어 동맥압을 구한다.
   * opts: hr, sv(mL), r(말초 mmHg·s/mL 1.0), c(탄성 mL/mmHg 1.5), zc(특성 임피던스 0.05), ejectFrac(박출 시간 비율), beats
   * 반환: 마지막 박동 {t, p, q}, {sbp, dbp, map, pp}
   */
  BD.windkessel = function (opts = {}) {
    const o = Object.assign({ hr: 70, sv: 70, r: 1.0, c: 1.5, zc: 0.05, beats: 12, pv: 5 }, opts);
    const T = 60 / o.hr, te = Math.min(0.9 * T, 0.18 + 0.1 * T);
    const qmax = (o.sv * Math.PI) / (2 * te);
    const Q = (tc) => (tc < te ? qmax * Math.sin((Math.PI * tc) / te) : 0);
    const dt = 5e-4; let pc = 80;
    const out = { t: [], p: [], q: [] };
    const steps = Math.round((o.beats * T) / dt), rec0 = Math.round(((o.beats - 1) * T) / dt);
    for (let s = 0; s < steps; s++) {
      const tc = (s * dt) % T, q = Q(tc);
      pc += (dt * (q - (pc - o.pv) / o.r)) / o.c;
      if (s >= rec0 && s % 4 === 0) { out.t.push(tc); out.p.push(pc + o.zc * q); out.q.push(q); }
    }
    const sbp = Math.max(...out.p), dbp = Math.min(...out.p);
    return Object.assign(out, { sbp, dbp, map: BD.mean(out.p), pp: sbp - dbp, T, tau: o.r * o.c });
  };
  /**
   * 압반사와 순환의 덩어리 모델(초 단위). 평균 동맥압을 감지해 심박수·말초 저항·수축력·정맥 긴장을 조절한다.
   *   MAP = CO·TPR + CVP, CO = HR·SV, SV는 앞부하(유효 정맥 혈액량)·충만 시간·수축력·후부하에 따라 정해진다.
   * opts: tstop(s 120), dt(0.05), baro(반사 이득 0~2, 기본 1), delay(s 2), events: [{t, kind, value}]
   *   kind: "stand"(기립, value 1이면 일어섬 0이면 누움), "bleed"(mL 출혈), "infuse"(mL 수액), "drug"(혈관 확장: TPR 배율), "exercise"(0~1)
   * 반환: {t, map, sbp, dbp, hr, sv, co, tpr, preload, sym(교감 활성 0~1)}
   */
  BD.baroLoop = function (opts = {}) {
    const o = Object.assign({ tstop: 120, dt: 0.05, baro: 1, delay: 1.0, vol: 5000, setMap: 93, events: [] }, opts);
    const ev = o.events.slice().sort((a, b) => a.t - b.t);
    let vol = o.vol, stand = 0, standLag = 0, vasoDrug = 1, ex = 0;
    let sym = 0.5;                        // 교감 신경 활성(0 = 완전 부교감, 1 = 최대 교감, 안정 시 0.5)
    let mapNow = o.setMap;
    const delay = BD.delayLine(o.dt, o.delay, o.setMap);
    const out = { t: [], map: [], sbp: [], dbp: [], hr: [], sv: [], co: [], tpr: [], preload: [], sym: [] };
    const steps = Math.round(o.tstop / o.dt);
    let ei = 0;
    for (let s = 0; s <= steps; s++) {
      const t = s * o.dt;
      while (ei < ev.length && ev[ei].t <= t) {
        const e = ev[ei++];
        if (e.kind === "stand") stand = e.value;
        else if (e.kind === "bleed") vol -= e.value;
        else if (e.kind === "infuse") vol += e.value;
        else if (e.kind === "drug") vasoDrug = e.value;
        else if (e.kind === "exercise") ex = e.value;
      }
      standLag += ((stand - standLag) * o.dt) / 4;     // 다리로 피가 몰리는 데 몇 초
      // 감지(지연된 MAP) → 교감 활성(시그모이드, 설정점에서 0.5)
      const sensed = delay.push(mapNow);
      const symT = o.baro > 0 ? 1 / (1 + Math.exp((o.baro * (sensed - o.setMap - 22 * ex)) / 9)) : 0.5;   // 운동 중에는 설정점이 위로 재설정된다
      sym += ((symT - sym) * o.dt) / 4;
      const s1 = clamp(sym + 0.3 * ex, 0, 1.1);
      // 효과기: 교감 0.5에서 안정 시 값(HR 70, TPR 18, 수축력 1)
      const hr = 30 + 80 * s1 + 60 * ex;                       // bpm
      const tpr = ((8 + 20 * s1) * vasoDrug) / (1 + 1.9 * ex);  // mmHg·min/L, 운동 근육의 혈관 확장
      const contr = 0.7 + 0.6 * s1 + 0.55 * ex;
      const venTone = 0.85 + 0.3 * s1 + 0.3 * ex;             // 정맥 수축과 근육 펌프가 피를 심장으로
      const effVol = (vol - 3400) * venTone - 550 * standLag;  // 유효(stressed) 혈액량, mL
      const preload = clamp(effVol / 1600, 0.05, 1.8);
      const tFill = Math.max(0.04, 60 / hr - 0.3 + 0.04 * (s1 - 0.5));
      const fill = (1 - Math.exp(-tFill / 0.18)) / 0.96;
      const svRaw = 72 * Math.pow(preload, 0.75) * fill * contr;
      const afterload = Math.pow(o.setMap / Math.max(mapNow, 20), 0.3);
      const sv = clamp(svRaw * afterload, 5, 180);
      const co = (hr * sv) / 1000;
      mapNow += ((co * tpr + 4 - mapNow) * o.dt) / 0.8;
      const pp = clamp((sv / 1.6) * (0.8 + 0.4 * s1), 5, 120);
      if (s % 2 === 0) {
        out.t.push(t); out.map.push(mapNow); out.sbp.push(mapNow + (2 * pp) / 3); out.dbp.push(mapNow - pp / 3);
        out.hr.push(hr); out.sv.push(sv); out.co.push(co); out.tpr.push(tpr); out.preload.push(preload); out.sym.push(s1);
      }
    }
    return out;
  };
  /** 진료실 혈압 분류(대한고혈압학회 2026, mmHg; ACC/AHA 분류와 다름) */
  BD.bpClass = function (sbp, dbp) {
    if (sbp >= 160 || dbp >= 100) return { key: "h2", label: "고혈압 2기", level: 3 };
    if (sbp >= 140 || dbp >= 90) return { key: "h1", label: "고혈압 1기", level: 2 };
    if (sbp >= 130 || dbp >= 80) return { key: "pre", label: "고혈압 전단계", level: 1 };
    if (sbp >= 120) return { key: "elev", label: "주의 혈압", level: 0.5 };
    if (sbp < 90 || dbp < 60) return { key: "low", label: "저혈압 범위", level: 0.5 };
    return { key: "normal", label: "정상 혈압", level: 0 };
  };

  /* ======================================================== 4. 심장의 전기 */
  /**
   * 동방결절 세포의 막전위(교육용 조각 모델, mV).
   * 4기(느린 탈분극) 기울기 slope(mV/s), 최대 이완기 전위 mdp, 역치 thr. 자율신경: ach(부교감 0~1), ne(교감 0~1).
   * 반환: {v(t), period(s), hr}
   */
  BD.saNode = function (opts = {}) {
    const o = Object.assign({ slope: 55, mdp: -60, thr: -40, ach: 0, ne: 0 }, opts);
    const slope = o.slope * (1 + 1.2 * o.ne) * (1 - 0.7 * o.ach);
    const mdp = o.mdp - 10 * o.ach;
    const thr = o.thr - 3 * o.ne;
    const t4 = Math.max(0.05, (thr - mdp) / slope);
    const tUp = 0.04, tRep = 0.18 * (1 - 0.25 * o.ne);
    const period = t4 + tUp + tRep;
    const peak = 15;
    const v = function (t) {
      const tc = ((t % period) + period) % period;
      if (tc < t4) { const x = tc / t4; return mdp + (thr - mdp) * (x * 0.85 + 0.15 * x * x * x); }
      if (tc < t4 + tUp) { const x = (tc - t4) / tUp; return thr + (peak - thr) * (1 - Math.pow(1 - x, 2)); }
      const x = (tc - t4 - tUp) / tRep; return peak + (mdp - peak) * (1 - Math.pow(1 - x, 2.2));
    };
    return { v, period, hr: 60 / period, t4, slope, mdp, thr };
  };
  /** 심실 근육 세포의 활동 전위(0~4기, 교육용 조각 모델, mV). apd: 활동 전위 지속(s) */
  BD.ventricularAP = function (t, apd = 0.28) {
    if (t < 0) return -88;
    if (t < 0.002) return -88 + 118 * (t / 0.002);
    if (t < 0.01) return 30 - 25 * ((t - 0.002) / 0.008);
    const plat = apd * 0.72;
    if (t < plat) return 5 - 10 * ((t - 0.01) / (plat - 0.01));
    if (t < apd) { const x = (t - plat) / (apd - plat); return -5 - 83 * (1 - Math.pow(1 - x, 1.6)); }
    return -88;
  };
  /**
   * 합성 심전도(유도 II 비슷한 모양, mV). 박동마다 P·Q·R·S·T를 가우스 봉우리로 더한다.
   * opts: hr(bpm), rhythm("sinus" | "af" | "avb1" | "avb2" | "avb3" | "pvc" | "vf" | "brady" | "svt"), duration(s), hrv(박동 간격 흔들림 비율 0~0.15),
   *       resp(호흡성 동성 부정맥 0~1), pr(s 0.16), qrs(s 0.09), st(ST 이동 mV), tAmp(T파 배율), noise(mV), seed
   * 반환: {v(t), beats:[{r, p, type}], rr:[...], duration}
   */
  BD.ecg = function (opts = {}) {
    const o = Object.assign({ hr: 70, rhythm: "sinus", duration: 10, hrv: 0.03, resp: 0.4, respRate: 12, pr: 0.16, qrs: 0.09, st: 0, tAmp: 1, noise: 0.01, seed: 7, pvcEvery: 5, avbRatio: 4, atrialRate: 80, ventRate: 38 }, opts);
    const R = BD.rng(o.seed), G = BD.gauss(o.seed + 11);
    const beats = [], ps = [];
    const base = 60 / o.hr;
    const qtc = 0.40;
    let t = 0.35;
    if (o.rhythm === "avb3") {
      // 심방과 심실이 따로 뛴다
      for (let a = 0.2; a < o.duration + 1; a += 60 / o.atrialRate) ps.push(a);
      for (let v = 0.5; v < o.duration + 1; v += 60 / o.ventRate) beats.push({ r: v, type: "escape", wide: true });
    } else if (o.rhythm === "vf") {
      // 박동 구분이 없다
    } else {
      let k = 0, pr = o.pr;
      while (t < o.duration + 1) {
        let rr = base;
        if (o.rhythm === "af") rr = base * (0.55 + 0.9 * R());
        else rr = base * (1 + o.hrv * G() + o.resp * 0.06 * Math.sin((2 * Math.PI * t * o.respRate) / 60));
        if (o.rhythm === "brady") rr = Math.max(rr, 60 / 42);
        k++;
        if (o.rhythm === "pvc" && k % o.pvcEvery === 0) {
          beats.push({ r: t - base * 0.38, type: "pvc", wide: true, noP: true });
          t += base * 0.62 + base;            // 보상 휴지기
          continue;
        }
        if (o.rhythm === "avb2") {
          // 모비츠 1형(벤케바흐): PR이 점점 길어지다 QRS 하나가 빠진다
          const cyc = (k - 1) % o.avbRatio;
          pr = o.pr + 0.06 * cyc + 0.02 * cyc * cyc * 0.5;
          if (cyc === o.avbRatio - 1) { ps.push(t - 0.2); t += rr; continue; }
        }
        if (o.rhythm === "avb1") pr = Math.max(o.pr, 0.28);
        beats.push({ r: t, type: o.rhythm === "af" ? "af" : "sinus", pr });
        if (o.rhythm !== "af") ps.push(t - pr - o.qrs / 2 + 0.05 - 0.0);
        t += rr;
      }
    }
    const rr = beats.slice(1).map((b, i) => b.r - beats[i].r);
    const gau = (x, mu, s) => Math.exp(-((x - mu) * (x - mu)) / (2 * s * s));
    const v = function (tt) {
      let y = 0;
      if (o.rhythm === "vf") {
        y = 0.35 * Math.sin(2 * Math.PI * 4.6 * tt + 1.3 * Math.sin(0.7 * tt)) + 0.22 * Math.sin(2 * Math.PI * 6.9 * tt + 0.5) + 0.12 * Math.sin(2 * Math.PI * 2.3 * tt);
        return y * (0.7 + 0.3 * Math.sin(0.9 * tt));
      }
      for (const p of ps) { const d = tt - p; if (d > -0.1 && d < 0.1) y += 0.15 * gau(tt, p, 0.025); }
      const lo = tt - 0.7, hi = tt + 0.2;
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        if (b.r < lo || b.r > hi) continue;
        const rrb = i > 0 ? b.r - beats[i - 1].r : base;
        const qt = qtc * Math.sqrt(clamp(rrb, 0.3, 2.0));
        const w = b.wide ? 2.6 : o.qrs / 0.09;
        const sgn = b.type === "pvc" ? -1 : 1;
        y += -0.08 * gau(tt, b.r - 0.024 * w, 0.007 * w);
        y += (b.wide ? 1.4 : 1.15) * gau(tt, b.r, 0.010 * w) * (b.type === "pvc" ? 1 : 1);
        y += -0.22 * gau(tt, b.r + 0.026 * w, 0.009 * w);
        // ST 분절과 T파
        const tPeak = b.r + qt - 0.11;
        const stv = (b.type === "pvc" ? -0.15 : o.st);
        if (tt > b.r + 0.04 * w && tt < tPeak) y += stv * Math.min(1, (tt - b.r - 0.04 * w) / 0.02);
        const tA = (b.wide ? -0.35 : 0.3) * (b.type === "pvc" ? 1 : o.tAmp) * sgn;
        const tS = tt < tPeak ? 0.055 : 0.04;
        y += tA * gau(tt, tPeak, tS);
        if (tt >= tPeak && tt < tPeak + 0.15) y += stv * Math.max(0, 1 - (tt - tPeak) / 0.05);
      }
      if (o.rhythm === "af") y += 0.05 * Math.sin(2 * Math.PI * 6.2 * tt) + 0.03 * Math.sin(2 * Math.PI * 8.7 * tt + 1.1);
      if (o.noise) { const n = Math.sin(tt * 377) * 0.4 + Math.sin(tt * 1531.7) * 0.6; y += o.noise * n; }
      return y;
    };
    return { v, beats, ps, rr, duration: o.duration, opts: o };
  };
  /** 박동 간격 배열의 심박 변이 지표: SDNN(ms), RMSSD(ms), 평균 심박수 */
  BD.hrvStats = function (rr) {
    const ms = rr.map((x) => x * 1000);
    const d = ms.slice(1).map((x, i) => x - ms[i]);
    return { sdnn: BD.sd(ms), rmssd: Math.sqrt(BD.mean(d.map((x) => x * x))), hr: 60000 / BD.mean(ms) };
  };

  /* ======================================================== 5. 폐: 부피와 역학 */
  /**
   * 폐 부피 예측식(ERS 1993, 키 m, 나이, L). sex "m" | "f".
   * 반환 {tlc, vc, rv, frc, erv, ic, irv, fev1, fvc, vt}
   */
  BD.lungVolumes = function (cm = 175, age = 34, sex = "m", vt = 0.5) {
    const H = cm / 100;
    let tlc, vc, rv, frc, fev1;
    if (sex === "f") { vc = 4.66 * H - 0.024 * age - 3.28; tlc = 6.60 * H - 5.79; rv = 1.81 * H + 0.016 * age - 2.0; frc = 2.24 * H + 0.001 * age - 1.0; fev1 = 3.95 * H - 0.025 * age - 2.6; }
    else { vc = 6.10 * H - 0.028 * age - 4.65; tlc = 7.99 * H - 7.08; rv = 1.31 * H + 0.022 * age - 1.23; frc = 2.34 * H + 0.009 * age - 1.09; fev1 = 4.30 * H - 0.029 * age - 2.49; }
    tlc = vc + rv;   // 두 식이 어긋나지 않게 맞춘다
    const erv = frc - rv, ic = tlc - frc, irv = ic - vt;
    return { tlc, vc, rv, frc, erv, ic, irv, fev1, fvc: vc, vt };
  };
  /**
   * 강제 호기(폐활량 측정). 지수 감소 근사: V(t) = FVC·(1 − e^(−t/τ)).
   * kind: "normal" | "obstructive"(천식·COPD: τ가 길다) | "restrictive"(폐섬유화: FVC가 작다)
   * 반환 {t, v, flow, fev1, fvc, ratio, pef}
   */
  BD.spirometry = function (opts = {}) {
    const o = Object.assign({ fvc: 4.8, tau: 0.6, kind: "normal", severity: 0.5 }, opts);
    let fvc = o.fvc, tau = o.tau;
    if (o.kind === "obstructive") { tau *= 1 + 4 * o.severity; fvc *= 1 - 0.15 * o.severity; }
    if (o.kind === "restrictive") { fvc *= 1 - 0.55 * o.severity; tau *= 1 - 0.35 * o.severity; }
    const t = BD.linspace(0, 6, 301);
    const rise = 0.05;
    const v = t.map((x) => fvc * (1 - Math.exp(-Math.max(0, x - rise * 0.5) / tau)) * (x < rise ? (x / rise) * (x / rise) : 1));
    const flow = v.map((y, i) => (i ? (y - v[i - 1]) / (t[i] - t[i - 1]) : 0));
    const fev1 = BD.interp(t, v, 1.0), fvc6 = v[v.length - 1];
    return { t, v, flow, fev1, fvc: fvc6, ratio: fev1 / fvc6, pef: Math.max(...flow), tau };
  };
  /**
   * 한 번의 조용한 호흡(단일 구획 R-C 모델). 호흡근이 흉막강 압력을 만든다.
   * opts: c(폐 탄성도 L/cmH2O 0.2), r(기도 저항 cmH2O·s/L 2), rr(회/분), vt(L), ie(흡기:호기 시간 비), frcPpl(cmH2O −5)
   * 반환 {t, v(L, FRC 기준), flow(L/s), ppl, palv}
   */
  BD.breath = function (opts = {}) {
    const o = Object.assign({ c: 0.2, r: 2, rr: 12, vt: 0.5, ie: 0.5, frcPpl: -5, cycles: 3 }, opts);
    const T = 60 / o.rr, ti = (T * o.ie) / (1 + o.ie);
    // 근육 압력: 흡기 동안 사인 모양으로 증가, 호기는 수동
    const pmax = (o.vt / o.c) * 1.1;
    const pmus = (tc) => (tc < ti ? pmax * Math.sin((Math.PI / 2) * (tc / ti)) : pmax * Math.exp(-(tc - ti) / 0.15) * Math.cos(0));
    const dt = 0.002; let v = 0;
    const out = { t: [], v: [], flow: [], ppl: [], palv: [] };
    const steps = Math.round((o.cycles * T) / dt);
    for (let s = 0; s < steps; s++) {
      const t = s * dt, tc = t % T, pm = pmus(tc);
      const flow = (pm - v / o.c) / o.r;
      v += flow * dt;
      if (t >= (o.cycles - 1) * T && s % 5 === 0) {
        out.t.push(tc); out.v.push(v); out.flow.push(flow);
        out.ppl.push(o.frcPpl - pm + 0 * v);          // 흉막강: 근육이 당기는 만큼 더 음압
        out.palv.push(-flow * o.r);                    // 폐포: 흡기 때 음압, 호기 때 양압
      }
    }
    return Object.assign(out, { vt: Math.max(...out.v) - Math.min(...out.v), T, tau: o.r * o.c });
  };
  /** 폐 압력-부피 곡선(정적, L). 공기와 생리식염수, 표면활성제 결핍. dir: "in" | "out"(히스테리시스) */
  BD.lungPV = function (p, opts = {}) {
    const o = Object.assign({ rv: 1.4, tlc: 6.3, mid: 9, k: 3.2, medium: "air", surfactant: 1, dir: "in" }, opts);
    let mid = o.mid, k = o.k;
    if (o.medium === "saline") { mid = 3.2; k = 1.6; }
    else { mid += (1 - o.surfactant) * 10; if (o.dir === "out") mid -= 3.5 * o.surfactant; }
    return o.rv + (o.tlc - o.rv) / (1 + Math.exp(-(p - mid) / k));
  };
  /** 라플라스 법칙: 폐포 안쪽 압력(cmH2O) = 2T / r. T(dyn/cm), r(µm) */
  BD.laplace = (T, rUm) => (2 * T) / (rUm * 1e-4) / 980.665;

  /* ======================================================== 6. 가스 교환과 산소 운반 */
  /** 고도(m)의 대기압(mmHg), 국제 표준 대기 */
  BD.patm = (h) => 760 * Math.pow(1 - 2.25577e-5 * h, 5.25588);
  /** 흡입 산소 분압(mmHg): 수증기압 47 mmHg를 뺀다 */
  BD.pio2 = (pb = 760, fio2 = 0.21) => fio2 * (pb - 47);
  /** 폐포 가스식: PAO2 = PIO2 − PaCO2/R */
  BD.pao2 = (pb = 760, fio2 = 0.21, paco2 = 40, r = 0.8) => Math.max(0, BD.pio2(pb, fio2) - paco2 / r + (fio2 * paco2 * (1 - r)) / r);
  /** 폐포 환기와 PaCO2: PaCO2 = 0.863 × VCO2(mL/min) / VA(L/min) */
  BD.paco2 = (vco2 = 200, va = 4.2) => (0.863 * vco2) / Math.max(0.05, va);
  /**
   * 헤모글로빈 산소 포화도(0~1). Severinghaus 식 + Kelman 보정(가상 PO2).
   * ph, pco2, temp(°C), dpg(2,3-DPG 배율, 1 = 정상), coHb(일산화탄소헤모글로빈 비율: 왼쪽 이동)
   */
  BD.satO2 = function (po2, o = {}) {
    const ph = o.ph == null ? 7.4 : o.ph, pco2 = o.pco2 == null ? 40 : o.pco2, T = o.temp == null ? 37 : o.temp, dpg = o.dpg == null ? 1 : o.dpg;
    const coHb = o.coHb || 0;
    if (po2 <= 0) return 0;
    let pv = po2 * Math.pow(10, 0.024 * (37 - T) + 0.40 * (ph - 7.40) + 0.06 * Math.log10(40 / Math.max(1, pco2)));
    pv *= Math.pow(dpg, -0.35);
    pv *= 1 + 2.2 * coHb;                 // CO가 남은 헴의 산소 친화도를 높인다(왼쪽 이동)
    const s = 1 / (23400 / (pv * pv * pv + 150 * pv) + 1);
    return s * (1 - coHb);                // CO가 붙은 자리는 산소를 못 싣는다
  };
  /** P50(포화도 50 %가 되는 PO2, mmHg) */
  BD.p50 = function (o = {}) {
    const full = BD.satO2(500, o) || 1;
    let lo = 1, hi = 120;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (BD.satO2(m, o) / full < 0.5) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  /** 포화도에서 PO2를 역으로 */
  BD.po2FromSat = function (s, o = {}) {
    let lo = 0.1, hi = 700;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (BD.satO2(m, o) < s) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  /** 동맥 산소 함량(mL O2/dL) = 1.34·Hb·SaO2 + 0.003·PaO2 */
  BD.o2Content = (hb, sat, po2) => 1.34 * hb * sat + 0.003 * po2;
  /** 산소 운반량(mL/min) = CO(L/min) × CaO2 × 10 */
  BD.o2Delivery = (co, cao2) => co * cao2 * 10;
  /**
   * 폐 모세혈관을 지나는 동안의 PO2 상승(확산 제한). 함량 기반으로 적분한다.
   * opts: pa(폐포 PO2), pv(혼합 정맥 PO2 40), transit(통과 시간 s 0.75), dl(확산 능력 배율 1), hb
   * 반환 {t, po2, sat, endPo2}
   */
  BD.capillaryO2 = function (opts = {}) {
    const o = Object.assign({ pa: 100, pv: 40, transit: 0.75, dl: 1, hb: 15, coHb: 0 }, opts);
    const cap = (p) => BD.o2Content(o.hb, BD.satO2(p, { coHb: o.coHb }), p);
    let p = o.pv, c = cap(p);
    const dt = 0.002, k = 26 * o.dl;         // mL/dL/s/mmHg 비슷한 크기로 맞춘 확산 상수
    const out = { t: [0], po2: [p], sat: [BD.satO2(p, { coHb: o.coHb })] };
    for (let t = dt; t <= o.transit + 1e-9; t += dt) {
      c += (k * (o.pa - p) * dt) / 60;
      // 함량 → 분압(이분법)
      let lo = 0, hi = Math.max(o.pa, 1) + 1;
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (cap(m) < c) lo = m; else hi = m; }
      p = (lo + hi) / 2;
      out.t.push(t); out.po2.push(p); out.sat.push(BD.satO2(p, { coHb: o.coHb }));
    }
    return Object.assign(out, { endPo2: p });
  };
  /** 산소 운반 연쇄: 대기 → 흡입 → 폐포 → 동맥 → 모세혈관 → 미토콘드리아 (mmHg) */
  BD.o2Cascade = function (o = {}) {
    const pb = o.pb || 760, fio2 = o.fio2 || 0.21, paco2 = o.paco2 || 40, aa = o.aaGrad == null ? 8 : o.aaGrad;
    const pAir = fio2 * pb, pI = BD.pio2(pb, fio2), pA = BD.pao2(pb, fio2, paco2), pa = Math.max(0, pA - aa);
    return [{ k: "대기", v: pAir }, { k: "기도(가습)", v: pI }, { k: "폐포", v: pA }, { k: "동맥혈", v: pa }, { k: "모세혈관 끝", v: Math.min(pa, 40) }, { k: "세포", v: Math.min(pa, 20) }, { k: "미토콘드리아", v: Math.min(pa, 3) }];
  };

  /* ======================================================== 7. 호흡 조절과 산염기 */
  /** 헨더슨-하셀바흐: pH = 6.1 + log10(HCO3 / (0.03 × PaCO2)) */
  BD.ph = (hco3 = 24, paco2 = 40) => 6.1 + Math.log10(hco3 / (0.03 * paco2));
  /** pH를 맞추는 HCO3 */
  BD.hco3For = (ph, paco2) => 0.03 * paco2 * Math.pow(10, ph - 6.1);
  /** 산염기 판독(일차 장애 하나만 가정한 단순 판정) */
  BD.acidBase = function (ph, paco2, hco3) {
    const acid = ph < 7.35, alk = ph > 7.45;
    if (!acid && !alk) {
      if (paco2 > 45 && hco3 > 26) return { label: "정상 pH(보상된 장애 가능)", kind: "comp" };
      if (paco2 < 35 && hco3 < 22) return { label: "정상 pH(보상된 장애 가능)", kind: "comp" };
      return { label: "정상", kind: "normal" };
    }
    if (acid) return paco2 > 45 ? { label: "호흡성 산증", kind: "racid" } : { label: "대사성 산증", kind: "macid" };
    return paco2 < 35 ? { label: "호흡성 알칼리증", kind: "ralk" } : { label: "대사성 알칼리증", kind: "malk" };
  };
  /**
   * 화학 반사: 분당 환기량(L/min). CO2 반응 기울기 약 2 L/min/mmHg, 저산소가 기울기를 키운다.
   */
  BD.ventDrive = function (paco2, pao2 = 95, o = {}) {
    const g = o.gain == null ? 2.0 : o.gain;
    const hyp = 1 + (o.hypoxic == null ? 1 : o.hypoxic) * Math.max(0, 28 / Math.max(pao2 - 30, 4) - 0.35);
    return Math.max(0, 6 + g * hyp * (paco2 - 40) + (o.hypoxic == null ? 1 : o.hypoxic) * 8 * Math.max(0, (60 - pao2) / 30) ** 2);
  };
  /**
   * 숨 참기(초 단위). 폐에 남은 산소를 쓰고 CO2가 쌓인다. 숨 참기 전에 과호흡하면 시작 PaCO2가 낮다.
   * opts: hyper(과호흡 시작 PaCO2 mmHg, 기본 40), lung(숨 참을 때 폐 부피 L 5), vo2(mL/min 300), limit(참을 수 있는 충동 한계 1)
   * 반환 {t, paco2, pao2, sao2, urge, breakAt, minSat}
   */
  BD.breathHold = function (opts = {}) {
    const o = Object.assign({ hyper: 40, lung: 5, vo2: 300, vco2: 240, limit: 1, tmax: 240, pb: 760 }, opts);
    const pAlv = o.pb - 47;
    let fo2 = (BD.pao2(o.pb, 0.21, o.hyper) / pAlv);
    let pco2 = o.hyper;
    const out = { t: [], paco2: [], pao2: [], sao2: [], urge: [] };
    let breakAt = null, minSat = 1;
    const dt = 0.5;
    for (let t = 0; t <= o.tmax; t += dt) {
      // CO2: 폐와 혈액의 저장고로 쌓인다(처음 빨리, 뒤에는 천천히)
      const pv = 46 + (o.hyper - 40) * 0.6;
      const toward = (pv - pco2) * 0.05 * dt;
      pco2 += Math.max(toward, 0) + (dt * 4.2) / 60 * (o.vco2 / 240);
      // O2: 폐 안의 산소를 혈액이 가져간다
      fo2 = Math.max(0.005, fo2 - ((o.vo2 / 1000) * (dt / 60)) / o.lung);
      const po2 = fo2 * pAlv;
      const sat = BD.satO2(po2, { pco2 });
      if (breakAt == null) minSat = Math.min(minSat, sat);
      const urge = 0.08 * Math.max(0, pco2 - 38) * (1 + 1.5 * Math.max(0, (70 - po2) / 70)) / o.limit + 0.6 * Math.max(0, (60 - po2) / 60);
      out.t.push(t); out.paco2.push(pco2); out.pao2.push(po2); out.sao2.push(sat); out.urge.push(urge);
      if (breakAt == null && urge >= 1) { breakAt = t; }
      if (breakAt != null && t >= breakAt + (o.after == null ? 20 : o.after)) break;
    }
    return Object.assign(out, { breakAt, minSat });
  };

  /* ======================================================== 8. 세포: 확산, 삼투, 막전위 */
  /** 네른스트 전위(mV). z 이온 전하, co 바깥 농도, ci 안 농도, T °C */
  BD.nernst = (z, co, ci, T = 37) => ((8.314 * (T + 273.15)) / (z * 96485)) * Math.log(co / ci) * 1000;
  /** GHK 전압 식(mV). p: {k, na, cl} 투과도 비, c: {ko, ki, nao, nai, clo, cli} mM */
  BD.ghk = function (p = {}, c = {}, T = 37) {
    const P = Object.assign({ k: 1, na: 0.04, cl: 0.45 }, p);
    const C = Object.assign({ ko: 4.5, ki: 140, nao: 145, nai: 12, clo: 116, cli: 4.2 }, c);
    const num = P.k * C.ko + P.na * C.nao + P.cl * C.cli, den = P.k * C.ki + P.na * C.nai + P.cl * C.clo;
    return ((8.314 * (T + 273.15)) / 96485) * Math.log(num / den) * 1000;
  };
  BD.IONS = {
    na: { name: "Na⁺", z: 1, out: 145, in: 12 },
    k: { name: "K⁺", z: 1, out: 4.5, in: 140 },
    cl: { name: "Cl⁻", z: -1, out: 116, in: 4.2 },
    ca: { name: "Ca²⁺", z: 2, out: 1.2, in: 0.0001 },
  };
  /** 확산 시간(s) ≈ x² / (2D). x m, D m²/s(산소 물속 약 2e-9) */
  BD.diffTime = (x, D = 2e-9, dims = 1) => (x * x) / (2 * dims * D);
  /** 피크의 확산 법칙: 플럭스 = D·A·ΔC/Δx */
  BD.fick = (D, A, dC, dx) => (D * A * dC) / dx;
  /** 삼투압(mmHg) = 오스몰 농도(mOsm/L) × 19.3 */
  BD.osmoticP = (mosm) => mosm * 19.3;
  /** 세포 부피(보일-반트호프): 바깥 오스몰 농도 osm에서 V/V0. b: 삼투에 반응하지 않는 부피 비율 */
  BD.cellVolume = (osm, osm0 = 290, b = 0.3) => b + (1 - b) * (osm0 / osm);

  /* ======================================================== 9. 근육 */
  /**
   * 자극 열차에 대한 근육의 힘(정규화, 최대 강축 = 1). 칼슘 일시 증가 → 힘(1차 지연).
   * opts: freq(Hz), dur(s 자극 지속), tstop(s), type("fast" | "slow"), fatigue(0~1: 피로가 쌓이는 속도)
   * 반환 {t, f, ca, stims, peak, tPeak}
   */
  BD.twitchTrain = function (opts = {}) {
    const o = Object.assign({ freq: 10, dur: 0.6, tstop: 1.0, t0: 0.05, type: "fast", fatigue: 0, n: null }, opts);
    const tc = o.type === "slow" ? { ca: 0.06, f: 0.075, k: 0.55 } : { ca: 0.022, f: 0.028, k: 0.55 };
    const dt = 2e-4;
    const stims = [];
    if (o.freq > 0) for (let t = o.t0, i = 0; t < o.t0 + o.dur - 1e-9 && (o.n == null || i < o.n); t += 1 / o.freq, i++) stims.push(t);
    let ca = 0, f = 0, k = 0, cap = 1;
    const out = { t: [], f: [], ca: [] };
    let peak = 0, tPeak = 0;
    for (let s = 0, t = 0; t <= o.tstop; s++, t = s * dt) {
      while (k < stims.length && stims[k] <= t) { ca += 1.0 * (1 - 0.45 * ca); k++; cap = Math.max(0.25, cap - o.fatigue * 0.004); }
      ca -= (ca / tc.ca) * dt;
      const fss = (cap * Math.pow(ca, 2)) / (Math.pow(ca, 2) + tc.k * tc.k) * (1 + tc.k * tc.k);
      f += ((Math.min(fss, cap) - f) / tc.f) * dt;
      if (s % 10 === 0) { out.t.push(t); out.f.push(f); out.ca.push(ca); }
      if (f > peak) { peak = f; tPeak = t; }
    }
    return Object.assign(out, { stims, peak, tPeak });
  };
  /** 근절 길이(µm)에 따른 능동 장력(최대 = 1, Gordon·Huxley·Julian 1966 개구리 근섬유 모양) */
  BD.lengthTension = function (sl) {
    const xs = [1.27, 1.67, 2.0, 2.25, 3.65], ys = [0, 0.84, 1, 1, 0];
    if (sl <= 1.27 || sl >= 3.65) return 0;
    return BD.interp(xs, ys, sl);
  };
  /** 수동 장력(결합 조직·티틴, 정규화) */
  BD.passiveTension = (sl) => (sl <= 2.3 ? 0 : 0.05 * (Math.exp((sl - 2.3) / 0.38) - 1));
  /** 겹침(필라멘트 그림용): 굵은 1.6 µm, 가는 1.0 µm ×2, Z선 */
  BD.SARC = { thick: 1.6, thin: 1.0, bare: 0.2 };
  /**
   * 힐의 힘-속도 관계. 단축: (F + a)(v + b) = (F0 + a)·b → 정규화하면 v/vmax = a(1 − f)/(f + a), a = 0.25(곡률).
   * 신장(f > 1)은 최대 약 1.6 F0까지 버틴다. 반환: 정규화 속도(단축 +, 신장 −)
   */
  BD.fv = function (f, a = 0.25) {
    if (f >= 1) return -0.5 * Math.min(1, (f - 1) / 0.6);
    return (a * (1 - f)) / (f + a);
  };
  /** 정규화 속도 v(−1~1)에서 힘 */
  BD.forceAtV = function (v, a = 0.25) {
    if (v >= 0) return (a * (1 - v)) / (v + a);
    return 1 + 0.6 * Math.min(1, -v / 0.5) * (1 - Math.exp(6 * v)) / (1 - Math.exp(-3));
  };
  /**
   * 운동 단위 동원(헤네만 크기 원리) + 발화율 부호화.
   * n개 단위, 동원 역치는 지수적으로 분포, 큰 단위일수록 늦게 동원되고 힘이 크다.
   * 반환 {units:[{thr, force, rate, on, out}], total(0~1)}
   */
  BD.motorUnits = function (drive, o = {}) {
    const n = o.n || 60, range = o.range || 60, rrMax = o.rrMax || 0.7;
    const units = [];
    let tot = 0, max = 0;
    for (let i = 0; i < n; i++) {
      const thr = (Math.exp((Math.log(range) * i) / (n - 1)) / range) * rrMax;   // 0.0117 ~ 0.7
      const force = Math.exp((Math.log(range) * i) / (n - 1));                   // 1 ~ range
      const minR = 8, maxR = 35 + 10 * (1 - i / n);
      const on = drive >= thr;
      const rate = on ? Math.min(maxR, minR + (drive - thr) * 70) : 0;
      const fus = on ? 1 - Math.exp(-rate / 14) : 0;                              // 발화율 → 강축 정도
      const out = force * fus;
      units.push({ thr, force, rate, on, out, type: i < n * 0.5 ? "I" : i < n * 0.8 ? "IIa" : "IIx" });
      tot += out; max += force * (1 - Math.exp(-maxR / 14));
    }
    return { units, total: tot / max };
  };
  BD.FIBERS = [
    { key: "I", name: "제1형(느린 산화)", color: "#c92a2a", twitch: 100, force: 1, fatigue: "매우 강함", mito: "많다", myoglobin: "많다(붉은색)", fuel: "지방·포도당 산화" },
    { key: "IIa", name: "제2a형(빠른 산화-해당)", color: "#e8590c", twitch: 50, force: 2.5, fatigue: "중간", mito: "중간", myoglobin: "중간", fuel: "산화 + 해당" },
    { key: "IIx", name: "제2x형(빠른 해당)", color: "#f0b429", twitch: 25, force: 4, fatigue: "약함", mito: "적다", myoglobin: "적다(흰색)", fuel: "해당·인산크레아틴" },
  ];

  /* ======================================================== 10. 운동 */
  /** 달리기 산소 비용(ACSM): VO2(mL/kg/min) = 3.5 + 0.2·속도(m/min) + 0.9·속도·경사 */
  BD.runVO2 = (kmh, grade = 0) => { const v = (kmh * 1000) / 60; return 3.5 + 0.2 * v + 0.9 * v * grade; };
  /** 걷기 산소 비용(ACSM): 3.5 + 0.1·속도 + 1.8·속도·경사 */
  BD.walkVO2 = (kmh, grade = 0) => { const v = (kmh * 1000) / 60; return 3.5 + 0.1 * v + 1.8 * v * grade; };
  /** VO2(mL/kg/min) → 달리기 속도(km/h) */
  BD.speedForVO2 = (vo2, grade = 0) => (((vo2 - 3.5) / (0.2 + 0.9 * grade)) * 60) / 1000;
  /** 1 MET = 3.5 mL O2/kg/min */
  BD.MET_VO2 = 3.5;
  /**
   * 운동 강도(%VO2max, 0~1.2)에서 정상 상태 값. vo2max(mL/kg/min), lt(젖산 역치: 젖산이 2 mmol/L를 넘는 강도 비율), hrRest, hrMax
   * 반환 {vo2, hr, lactate(mmol/L), rer, fatFrac, ve}
   */
  BD.steady = function (x, o = {}) {
    const p = Object.assign({ vo2max: 38, lt: 0.6, hrRest: 72, hrMax: 184, kg: 78 }, o);
    const xr = Math.min(x, 1);
    const vo2 = 3.5 + (p.vo2max - 3.5) * xr;
    const hr = p.hrRest + (p.hrMax - p.hrRest) * Math.min(1, xr * 1.0 + 0.0);
    const w = (1 - p.lt) / Math.LN10;                         // 역치에서 2 mmol/L, 최대 강도에서 약 11 mmol/L
    const lactate = 1.0 + Math.exp((x - p.lt) / w);
    const rer = clamp(0.76 + 0.24 * BD.hill(x, p.lt + 0.12, 4) + 0.06 * Math.max(0, x - p.lt - 0.15), 0.72, 1.15);
    const fatFrac = clamp((1 - rer) / (1 - 0.707), 0, 1);
    const ve = (vo2 * p.kg) / 1000 * 25 * (1 + 1.2 * Math.max(0, x - p.lt - 0.1));
    return { vo2, hr, lactate: Math.max(0.8, lactate), rer, fatFrac, ve };
  };
  /**
   * 운동 시작·끝의 산소 섭취 동역학. 계단 부하를 tOn~tOff 동안 걸 때 VO2(mL/kg/min) 시간 곡선.
   * τ(s): 훈련된 사람 약 20, 보통 약 35. 젖산 역치 위에서는 느린 성분이 더해진다.
   * 반환 {t, vo2, demand, deficit(mL/kg), epoc(mL/kg)}
   */
  BD.vo2Kinetics = function (opts = {}) {
    const o = Object.assign({ rest: 3.5, demand: 30, tOn: 60, tOff: 420, tstop: 900, tau: 35, slow: 0, tauOff: 45 }, opts);
    const out = { t: [], vo2: [], demand: [] };
    let deficit = 0, epoc = 0;
    let atOff = null;
    const dt = 1;
    for (let t = 0; t <= o.tstop; t += dt) {
      let v;
      const d = t >= o.tOn && t < o.tOff ? o.demand : o.rest;
      if (t < o.tOn) v = o.rest;
      else if (t < o.tOff) {
        const s = t - o.tOn;
        v = o.rest + (o.demand - o.rest) * (1 - Math.exp(-s / o.tau)) + o.slow * Math.max(0, 1 - Math.exp(-(s - 100) / 200)) * (s > 100 ? 1 : 0);
        atOff = v;
      } else {
        const s = t - o.tOff;
        const fast = 0.85, sl = 0.15;
        v = o.rest + (atOff - o.rest) * (fast * Math.exp(-s / o.tauOff) + sl * Math.exp(-s / (o.tauOff * 8)));
      }
      if (t >= o.tOn && t < o.tOff) deficit += Math.max(0, d - v) * (dt / 60);
      if (t >= o.tOff) epoc += Math.max(0, v - o.rest) * (dt / 60);
      out.t.push(t); out.vo2.push(v); out.demand.push(d);
    }
    return Object.assign(out, { deficit, epoc });
  };
  /**
   * 전력을 다한 운동에서 세 에너지 시스템의 기여(정규화 파워). 시간 t(s).
   * 반환 {pcr, gly, ox, total} — 각 순간의 ATP 공급 속도(최대 = 1 근처)
   */
  BD.energySystems = function (t, o = {}) {
    const p = Object.assign({ pcr: 1.0, gly: 0.65, ox: 0.38, tauPcr: 9, tauGlyOn: 4, tauGlyOff: 75, tauOx: 28 }, o);
    const pcr = p.pcr * Math.exp(-t / p.tauPcr);
    const gly = p.gly * (1 - Math.exp(-t / p.tauGlyOn)) * Math.exp(-t / p.tauGlyOff);
    const ox = p.ox * (1 - Math.exp(-t / p.tauOx));
    return { pcr, gly, ox, total: pcr + gly + ox };
  };
  /** 최대 운동 지속 시간 D(s)에서 유산소 기여 비율(Gastin 2001 요약 곡선 근사) */
  BD.aerobicShare = (D) => D / (D + 75);
  /** 인산크레아틴 회복: τ 약 30~60 s */
  BD.pcrRecovery = (t, tau = 40, start = 0.3) => 1 - (1 - start) * Math.exp(-t / tau);
  /** 카르보넨 목표 심박수 */
  BD.karvonen = (frac, hrRest, hrMax) => hrRest + frac * (hrMax - hrRest);
  BD.HR_ZONES = [
    { z: 1, name: "회복", lo: 0.5, hi: 0.6 },
    { z: 2, name: "유산소 기초", lo: 0.6, hi: 0.7 },
    { z: 3, name: "템포", lo: 0.7, hi: 0.8 },
    { z: 4, name: "역치", lo: 0.8, hi: 0.9 },
    { z: 5, name: "최대", lo: 0.9, hi: 1.0 },
  ];
  /**
   * 바니스터 체력-피로 모델. load: 날짜별 훈련 부하 배열.
   * perf(t) = p0 + k1·Σ w e^(−(t−s)/τ1) − k2·Σ w e^(−(t−s)/τ2)
   */
  BD.banister = function (load, o = {}) {
    const p = Object.assign({ p0: 0, k1: 1, k2: 2, tau1: 42, tau2: 7 }, o);
    let fit = 0, fat = 0;
    const a1 = Math.exp(-1 / p.tau1), a2 = Math.exp(-1 / p.tau2);
    const out = { fitness: [], fatigue: [], perf: [] };
    for (let i = 0; i < load.length; i++) {
      fit = fit * a1 + load[i]; fat = fat * a2 + load[i];
      out.fitness.push(p.k1 * fit); out.fatigue.push(p.k2 * fat); out.perf.push(p.p0 + p.k1 * fit - p.k2 * fat);
    }
    return out;
  };
  /** 다니엘스-길버트: 달리기 속도 v(m/min)의 산소 비용(mL/kg/min) */
  BD.danielsVO2 = (v) => -4.6 + 0.182258 * v + 0.000104 * v * v;
  /** 다니엘스-길버트: t분 동안 유지할 수 있는 VO2max 비율 */
  BD.danielsFrac = (t) => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  /** VO2max(엄밀히는 VDOT)로 거리 km의 기록(분)을 어림한다 */
  BD.raceTime = function (vo2max, km = 10) {
    let lo = 5, hi = 600;
    for (let i = 0; i < 60; i++) {
      const t = (lo + hi) / 2, v = (km * 1000) / t;
      if (BD.danielsVO2(v) > vo2max * BD.danielsFrac(t)) lo = t; else hi = t;
    }
    return (lo + hi) / 2;
  };
  /** 다니엘스 식을 뒤집어 산소 비용(mL/kg/min)에서 속도(km/h) */
  BD.danielsSpeed = function (vo2) { const a = 0.000104, b = 0.182258, c = -4.6 - vo2; return ((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)) * 0.06; };
  /**
   * 젖산 역치로 보는 현실적인 기록. 한 시간 안팎의 경기는 젖산 4 mmol/L(OBLA) 근처 강도로 달린다.
   * 반환 {frac(%VO2max), vo2, kmh, time(분)} — 훈련이 덜 된 사람은 VO2max만으로 본 기록(BD.raceTime)보다 느리다
   */
  BD.racePlan = function (vo2max, lt = 0.6, km = 10) {
    const w = (1 - lt) / Math.LN10, frac = Math.min(BD.danielsFrac(60), lt + w * Math.log(3));
    const vo2 = vo2max * frac, kmh = BD.danielsSpeed(vo2);
    return { frac, vo2, kmh, time: (km / kmh) * 60 };
  };

  /* ======================================================== 11. 에너지 대사 */
  /** 기초대사량(kcal/day) */
  BD.bmr = function (kg, cm, age, sex = "m", formula = "mifflin", lbm) {
    if (formula === "harris") return sex === "f" ? 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age : 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age;
    if (formula === "katch") return 370 + 21.6 * (lbm == null ? kg * 0.8 : lbm);
    return 10 * kg + 6.25 * cm - 5 * age + (sex === "f" ? -161 : 5);
  };
  /** 장기별 휴식 대사율(kcal/kg/day, Elia 1992) */
  BD.ORGANS = [
    { key: "liver", name: "간", kg: 1.8, rate: 200 },
    { key: "brain", name: "뇌", kg: 1.4, rate: 240 },
    { key: "heart", name: "심장", kg: 0.33, rate: 440 },
    { key: "kidney", name: "콩팥", kg: 0.31, rate: 440 },
    { key: "muscle", name: "골격근", kg: 28, rate: 13 },
    { key: "fat", name: "지방 조직", kg: 15, rate: 4.5 },
    { key: "rest", name: "나머지", kg: 23.2, rate: 12 },
  ];
  /** 활동 강도(METs, 성인 신체활동 목록 2024 기준 대표값을 반올림) */
  BD.METS = [
    { key: "sleep", name: "잠", met: 0.95 },
    { key: "sit", name: "앉아서 TV", met: 1.3 },
    { key: "desk", name: "사무 작업", met: 1.5 },
    { key: "stand", name: "서서 가벼운 일", met: 2.3 },
    { key: "cook", name: "요리·집안일", met: 2.5 },
    { key: "walk", name: "걷기(5 km/h)", met: 3.5 },
    { key: "bike", name: "자전거(가볍게)", met: 5.8 },
    { key: "stairs", name: "계단 오르기", met: 8.0 },
    { key: "jog", name: "달리기(8 km/h)", met: 8.3 },
    { key: "run10", name: "달리기(10 km/h)", met: 9.8 },
    { key: "run12", name: "달리기(12 km/h)", met: 11.8 },
    { key: "swim", name: "수영(보통)", met: 7.0 },
    { key: "weights", name: "근력 운동", met: 5.0 },
  ];
  /** 활동 에너지(kcal) ≈ MET × 체중(kg) × 시간(h) */
  BD.metKcal = (met, kg, hours) => met * kg * hours;
  /** Weir 식: 에너지 소비(kcal/min) = 3.941·VO2 + 1.106·VCO2 (L/min) */
  BD.weir = (vo2L, vco2L) => 3.941 * vo2L + 1.106 * vco2L;
  /** 비단백 호흡 교환율에서 탄수화물 연소 비율(에너지 기준 근사) */
  BD.carbFrac = (rq) => clamp((rq - 0.707) / (1 - 0.707), 0, 1);
  BD.MACRO = {
    carb: { name: "탄수화물", kcal: 4, rq: 1.0, o2kcal: 5.05, tef: 0.075 },
    fat: { name: "지방", kcal: 9, rq: 0.71, o2kcal: 4.69, tef: 0.02 },
    protein: { name: "단백질", kcal: 4, rq: 0.81, o2kcal: 4.46, tef: 0.25 },
    alcohol: { name: "알코올", kcal: 7, rq: 0.67, o2kcal: 4.86, tef: 0.15 },
  };
  /** 하루 소비 에너지 = 기초대사 × 활동 계수(PAL) */
  BD.tdee = (bmr, pal = 1.4) => bmr * pal;
  /** 식사의 열 효과(kcal): 매크로 그램 */
  BD.tef = (g) => BD.sum(Object.keys(g).map((k) => (g[k] || 0) * BD.MACRO[k].kcal * BD.MACRO[k].tef));
  /** 클라이버 법칙: 기초대사량 ≈ 70 × 체중^0.75 (kcal/day) */
  BD.kleiber = (kg) => 70 * Math.pow(kg, 0.75);

  /* ======================================================== 12. 체중 동역학 */
  /**
   * 성인 체중 변화 모델(Hall 2011의 골격을 단순화). 날마다 지방(F), 제지방(L), 글리코겐(G)과 그 물을 갱신한다.
   * opts: kg, fatFrac, cm, age, sex, pal, days, intake(day → kcal/day) 또는 숫자, carbFrac(섭취 중 탄수화물 비율 0.5), adapt(적응 열생성 켬)
   * 반환 {day, bw, fat, lean, gly, ee, ei, linear(7700 kcal/kg 직선 예측)}
   */
  BD.weightSim = function (opts = {}) {
    const o = Object.assign({ kg: 78, fatFrac: 0.24, cm: 175, age: 34, sex: "m", pal: 1.4, days: 365, intake: null, carbFrac: 0.5, carbFrac0: 0.5, adapt: true, palAt: null }, opts);
    const rhoF = 9440, rhoL = 1816, rhoG = 4206, gamF = 3.2, gamL = 22, betaTEF = 0.1, betaAT = 0.14;
    let F = o.kg * o.fatFrac, G = 0.5, L = o.kg - F - G * 3.7;
    const bmr0 = BD.bmr(o.kg, o.cm, o.age, o.sex);
    const ei0 = bmr0 * o.pal;
    const delta = ((1 - betaTEF) * o.pal - 1) * bmr0 / o.kg;
    const K = ei0 - (gamF * F + gamL * L + delta * o.kg + betaTEF * ei0);
    const C = (10.4 * rhoL) / rhoF;                         // 포브스 상수를 에너지 비율로(Hall·Chow 2011)
    const kG = (ei0 * o.carbFrac0) / (0.5 * 0.5);
    let at = 0;
    const out = { day: [], bw: [], fat: [], lean: [], gly: [], ee: [], ei: [], linear: [] };
    let linear = o.kg;
    const dt = 0.25;
    for (let d = 0; d <= o.days + 1e-9; d += dt) {
      const ei = typeof o.intake === "function" ? o.intake(d) : o.intake == null ? ei0 : o.intake;
      const pal = o.palAt ? o.palAt(d) : o.pal;
      const bw = F + L + 3.7 * G;
      const dEI = ei - ei0;
      if (o.adapt) at += ((betaAT * dEI - at) / 7) * dt; else at = 0;
      const deltaNow = ((1 - betaTEF) * pal - 1) * bmr0 / o.kg;
      const ee = K + gamF * F + gamL * L + deltaNow * bw + betaTEF * ei + at;
      const ci = ei * o.carbFrac;
      const dG = (ci - kG * G * G) / rhoG;
      const rest = ei - ee - rhoG * dG;
      const p = C / (C + F);
      F += ((1 - p) * rest / rhoF) * dt;
      L += (p * rest / rhoL) * dt;
      G = Math.max(0.05, G + dG * dt);
      linear += ((ei - ei0) / 7700) * dt;
      if (Math.abs(d - Math.round(d)) < 1e-6) {
        out.day.push(Math.round(d)); out.bw.push(F + L + 3.7 * G); out.fat.push(F); out.lean.push(L); out.gly.push(G); out.ee.push(ee); out.ei.push(ei); out.linear.push(linear);
      }
    }
    return Object.assign(out, { ei0, bmr0, delta });
  };

  /* ======================================================== 13. 혈당과 인슐린 */
  /**
   * 버그만 최소 모델 + 장 흡수 + 인슐린 분비(분 단위).
   *   dG/dt = −(SG + X)·G + SG·Gb + Ra/VG + HGP 보정
   *   dX/dt = −p2·X + p2·SI·(I − Ib)
   *   dI/dt = −n·(I − Ib) + γ·max(0, G − Gb)(2기 분비) + 1기 분비(dG/dt > 0일 때) + 외부 인슐린
   * opts: kg, gb(공복 혈당 mg/dL), ib(µU/mL), si(인슐린 감수성 ×1e-4), sg(포도당 효과 /min), gamma(분비 이득), meals:[{t, g(탄수화물 g), gi(흡수 속도 배율)}],
   *       insulin:[{t, u(단위, 속효성 피하)}], exercise:[{t0, t1, x(강도 0~1)}], tstop(min)
   * 반환 {t, g, i, x, ra, uptake, peak, tPeak, auc, back(공복 수준으로 돌아온 시각)}
   */
  BD.GLU = { kg: 70, gb: 88, ib: 8, si: 8, sg: 0.022, p2: 0.05, n: 0.2, gamma: 0.02, first: 0.6, vg: 1.7 };
  BD.glucose = function (opts = {}) {
    const o = Object.assign({}, BD.GLU, { meals: [{ t: 30, g: 75, gi: 1 }], insulin: [], exercise: [], tstop: 300, dt: 0.5 }, opts);
    const VG = o.vg * o.kg;            // dL
    const SI = o.si * 1e-4;
    const Ra = (t) => {
      let r = 0;
      for (const m of o.meals) {
        const tt = t - m.t; if (tt <= 0) continue;
        const T = 38 / (m.gi || 1) + (m.fat ? 25 : 0);
        r += (0.9 * m.g * 1000 * tt) / (T * T) * Math.exp(-tt / T);
      }
      return r;                          // mg/min
    };
    const insAbs = (t) => {             // 피하 인슐린 흡수 → µU/mL/min
      let r = 0;
      for (const d of o.insulin) {
        const tt = t - d.t; if (tt <= 0) continue;
        const T = d.long ? 400 : 55;
        r += ((d.u * 1e6) / (T * T)) * tt * Math.exp(-tt / T) / (0.12 * o.kg * 1000 * 10) * 10;
      }
      return r;
    };
    const exAt = (t) => { let x = 0; for (const e of o.exercise) if (t >= e.t0 && t < e.t1) x = Math.max(x, e.x); return x; };
    let G = o.gb, X = 0, I = o.ib, gPrev = G, ex = 0;
    const out = { t: [], g: [], i: [], x: [], ra: [], uptake: [] };
    const steps = Math.round(o.tstop / o.dt);
    let peak = G, tPeak = 0, auc = 0, back = null;
    for (let s = 0; s <= steps; s++) {
      const t = s * o.dt;
      ex += ((exAt(t) - ex) * o.dt) / 6;
      const sgE = o.sg * (1 + 2.2 * ex), siE = SI * (1 + 1.5 * ex);
      const ra = Ra(t);
      const dGdt = -(sgE + X) * G + o.sg * o.gb + ra / VG - 0.9 * ex * 0;
      const rise = Math.max(0, (G - gPrev) / o.dt);
      gPrev = G;
      const secr = o.gamma * Math.max(0, G - o.gb) * o.gb / 10 + o.first * o.gamma * 60 * rise;
      const dXdt = -o.p2 * X + o.p2 * siE * (I - o.ib);
      const dIdt = -o.n * (I - o.ib) + secr + insAbs(t);
      G = Math.max(20, G + dGdt * o.dt);
      X = X + dXdt * o.dt;
      I = Math.max(0, I + dIdt * o.dt);
      if (G > peak) { peak = G; tPeak = t; }
      auc += Math.max(0, G - o.gb) * o.dt;
      if (back == null && t > tPeak + 5 && peak > o.gb + 15 && G < o.gb + 5) back = t;
      if (s % 2 === 0) { out.t.push(t); out.g.push(G); out.i.push(I); out.x.push(X); out.ra.push(ra / VG); out.uptake.push((sgE + X) * G * VG); }
    }
    return Object.assign(out, { peak, tPeak, auc, back });
  };
  BD.GLU_PROFILES = {
    normal: { name: "정상", gb: 88, si: 8, gamma: 0.02, first: 0.6, ib: 8 },
    ir: { name: "인슐린 저항성", gb: 98, si: 2.5, gamma: 0.06, first: 0.6, ib: 14 },
    t2: { name: "제2형 당뇨병", gb: 140, si: 2.2, gamma: 0.008, first: 0.1, ib: 12 },
    t1: { name: "제1형 당뇨병(인슐린 주사 필요)", gb: 150, si: 8, gamma: 0, first: 0, ib: 0 },
  };

  /** HbA1c(%) → 평균 혈당(mg/dL), ADAG: eAG = 28.7·A1c − 46.7 */
  BD.eag = (a1c) => 28.7 * a1c - 46.7;
  BD.a1cFromAvg = (g) => (g + 46.7) / 28.7;
  /** HOMA-IR = 공복 혈당(mg/dL) × 공복 인슐린(µU/mL) / 405 */
  BD.homa = (g, i) => (g * i) / 405;
  /** 당뇨 진단 기준(공복 혈당, mg/dL) */
  BD.glucoseClass = function (fpg) {
    if (fpg >= 126) return { label: "당뇨병 범위", level: 2 };
    if (fpg >= 100) return { label: "공복혈당장애(당뇨 전단계)", level: 1 };
    if (fpg < 70) return { label: "저혈당 범위", level: 1 };
    return { label: "정상", level: 0 };
  };

  /* ======================================================== 14. 신경 */
  /**
   * 호지킨-헉슬리 모델(오징어 거대 축삭, 휴지 전위 −65 mV로 옮긴 표준 매개변수). ms, mV, µA/cm².
   * opts: I(t) 자극 전류 함수, tstop(ms 50), dt(0.01), gNa(120), gK(36), gL(0.3), temp(°C 6.3), ttx(나트륨 통로 차단 0~1), tea(칼륨 통로 차단 0~1)
   * 반환 {t, v, m, h, n, ina, ik, spikes:[ms]}
   */
  BD.hh = function (opts = {}) {
    const o = Object.assign({ I: () => 0, tstop: 50, dt: 0.01, gNa: 120, gK: 36, gL: 0.3, eNa: 50, eK: -77, eL: -54.387, temp: 6.3, ttx: 0, tea: 0, every: 5 }, opts);
    const phi = Math.pow(3, (o.temp - 6.3) / 10);
    const am = (v) => (Math.abs(v + 40) < 1e-6 ? 1 : (0.1 * (v + 40)) / (1 - Math.exp(-(v + 40) / 10)));
    const bm = (v) => 4 * Math.exp(-(v + 65) / 18);
    const ah = (v) => 0.07 * Math.exp(-(v + 65) / 20);
    const bh = (v) => 1 / (1 + Math.exp(-(v + 35) / 10));
    const an = (v) => (Math.abs(v + 55) < 1e-6 ? 0.1 : (0.01 * (v + 55)) / (1 - Math.exp(-(v + 55) / 10)));
    const bn = (v) => 0.125 * Math.exp(-(v + 65) / 80);
    let v = -65, m = am(v) / (am(v) + bm(v)), h = ah(v) / (ah(v) + bh(v)), n = an(v) / (an(v) + bn(v));
    const gNa = o.gNa * (1 - o.ttx), gK = o.gK * (1 - o.tea);
    const out = { t: [], v: [], m: [], h: [], n: [], ina: [], ik: [] };
    const spikes = []; let up = false;
    const steps = Math.round(o.tstop / o.dt);
    for (let s = 0; s <= steps; s++) {
      const t = s * o.dt;
      const ina = gNa * m * m * m * h * (v - o.eNa), ik = gK * n * n * n * n * (v - o.eK), il = o.gL * (v - o.eL);
      if (s % o.every === 0) { out.t.push(t); out.v.push(v); out.m.push(m); out.h.push(h); out.n.push(n); out.ina.push(ina); out.ik.push(ik); }
      const dv = o.I(t) - ina - ik - il;
      m += o.dt * phi * (am(v) * (1 - m) - bm(v) * m);
      h += o.dt * phi * (ah(v) * (1 - h) - bh(v) * h);
      n += o.dt * phi * (an(v) * (1 - n) - bn(v) * n);
      v += o.dt * dv;
      if (!up && v > 0) { up = true; spikes.push(t); }
      if (up && v < -30) up = false;
    }
    return Object.assign(out, { spikes });
  };
  /** 전도 속도(m/s). 유수: 약 6 × 지름(µm), 무수: 약 1 × √지름 */
  BD.conduction = (dUm, myelin = true) => (myelin ? 6 * dUm : Math.sqrt(dUm));
  BD.FIBER_CLASSES = [
    { name: "Aα", d: 15, myelin: true, role: "근육 운동·고유 감각" },
    { name: "Aβ", d: 8, myelin: true, role: "촉각·압각" },
    { name: "Aδ", d: 3, myelin: true, role: "날카로운 통증·차가움" },
    { name: "B", d: 2, myelin: true, role: "자율신경 신경절 이전" },
    { name: "C", d: 0.8, myelin: false, role: "둔한 통증·온도·자율 신경절 이후" },
  ];
  /**
   * 누설 적분-발화 뉴런 + 시냅스 입력(시간·공간 합산). ms.
   * inputs: [{t, w(mV, 음수면 억제)}], 반환 {t, v, spikes}
   */
  BD.lif = function (inputs, o = {}) {
    const p = Object.assign({ tstop: 100, dt: 0.1, rest: -70, thr: -55, reset: -75, tau: 15, tauSyn: 4, refr: 3 }, o);
    let v = p.rest, gs = 0, lastSpike = -1e9;
    const ev = inputs.slice().sort((a, b) => a.t - b.t); let k = 0;
    const out = { t: [], v: [], spikes: [] };
    for (let t = 0; t <= p.tstop; t += p.dt) {
      while (k < ev.length && ev[k].t <= t) { gs += ev[k].w; k++; }
      gs -= (gs / p.tauSyn) * p.dt;
      if (t - lastSpike < p.refr) v = p.reset;
      else { v += ((-(v - p.rest) + gs * 3.6) / p.tau) * p.dt; if (v >= p.thr) { out.spikes.push(t); lastSpike = t; out.t.push(t); out.v.push(30); v = p.reset; continue; } }
      out.t.push(t); out.v.push(v);
    }
    return out;
  };

  /* ======================================================== 15. 호르몬과 피드백 */
  /** 반감기 th로 사라지는 호르몬·약물: 여러 번 투여(즉시 흡수)한 농도 곡선 */
  BD.pkBolus = function (doses, th, tArr) {
    const k = Math.LN2 / th;
    return tArr.map((t) => BD.sum(doses.filter((d) => d.t <= t).map((d) => d.amt * Math.exp(-k * (t - d.t)))));
  };
  /** 흡수 단계가 있는 경구 투여(1구획, ka·ke) */
  BD.pkOral = function (doses, th, thAbs, tArr) {
    const ke = Math.LN2 / th, ka = Math.LN2 / thAbs;
    return tArr.map((t) => BD.sum(doses.filter((d) => d.t <= t).map((d) => { const tt = t - d.t; return Math.abs(ka - ke) < 1e-9 ? d.amt * ke * tt * Math.exp(-ke * tt) : ((d.amt * ka) / (ka - ke)) * (Math.exp(-ke * tt) - Math.exp(-ka * tt)); })));
  };
  /** 용량-반응(힐): E = Emax·C^n / (EC50^n + C^n) */
  BD.doseResponse = (c, ec50 = 1, n = 1, emax = 1) => emax * BD.hill(c, ec50, n);
  /** 수용체 점유율(질량 작용): C/(C + Kd) */
  BD.occupancy = (c, kd) => c / (c + kd);
  BD.HORMONES = [
    { key: "adrenaline", name: "아드레날린", half: 2 / 60, unit: "h", gland: "부신 속질", kind: "아민" },
    { key: "insulin", name: "인슐린", half: 5 / 60, unit: "h", gland: "이자 β세포", kind: "펩타이드" },
    { key: "acth", name: "ACTH", half: 10 / 60, unit: "h", gland: "뇌하수체 앞엽", kind: "펩타이드" },
    { key: "adh", name: "항이뇨 호르몬", half: 15 / 60, unit: "h", gland: "뇌하수체 뒤엽", kind: "펩타이드" },
    { key: "cortisol", name: "코르티솔", half: 70 / 60, unit: "h", gland: "부신 겉질", kind: "스테로이드" },
    { key: "t3", name: "T3", half: 24, unit: "h", gland: "갑상선", kind: "아민(지용성)" },
    { key: "t4", name: "T4", half: 7 * 24, unit: "h", gland: "갑상선", kind: "아민(지용성)" },
  ];
  /**
   * 시상하부-뇌하수체-부신(HPA) 축. CRH(H) → ACTH(A) → 코르티솔(C), 코르티솔이 H와 A를 억제한다(지연 τd).
   * 시간 단위: 분. 하루 주기 구동(아침 정점), 스트레스 입력, 외부 스테로이드.
   * opts: days(2), fb(피드백 세기 0~2), delay(분 15), stress:[{t(분), dur, amp}], steroid(외부 코르티솔 상당 µg/dL), circ(하루 주기 진폭 0~1), adrenal(부신 크기 배율)
   * 반환 {t(분), h, a, c, hour}
   */
  BD.hpa = function (opts = {}) {
    const o = Object.assign({ days: 2, fb: 1, delay: 15, stress: [], steroid: 0, circ: 1, adrenal: 1, dt: 0.5, ki: 14, nH: 2, amp: 3, sharp: 3, peakHr: 6.5, gA: 34, gC: 0.45 }, opts);
    const tH = 9, tA = 12, tC = 75;                       // 반감기(분)
    const kH = Math.LN2 / tH, kA = Math.LN2 / tA, kC = Math.LN2 / tC;
    const drive = (t) => { const hr = (t / 60) % 24; return 0.08 + o.circ * o.amp * Math.pow((1 + Math.cos((2 * Math.PI * (hr - o.peakHr)) / 24)) / 2, o.sharp); };
    const stressAt = (t) => { let s = 0; for (const e of o.stress) if (t >= e.t && t < e.t + e.dur) s += e.amp; return s; };
    const fbf = (c) => 1 / (1 + Math.pow((o.fb * c) / o.ki, o.nH));
    let H = 1, A = 25, C = 10;
    const delay = BD.delayLine(o.dt, Math.max(o.dt, o.delay), C);
    const out = { t: [], h: [], a: [], c: [], hour: [] };
    const steps = Math.round((o.days * 1440) / o.dt);
    for (let s = 0; s <= steps; s++) {
      const t = s * o.dt;
      const cd = delay.push(C) + o.steroid;
      const dH = kH * drive(t) * fbf(cd) * 1.6 + kH * stressAt(t) - kH * H;
      const dA = kA * o.gA * H * fbf(cd * 0.8) - kA * A;
      const dC = kC * o.gC * A * o.adrenal - kC * C;
      H += dH * o.dt; A += dA * o.dt; C += dC * o.dt;
      if (s % 4 === 0) { out.t.push(t); out.h.push(H); out.a.push(A); out.c.push(C + o.steroid); out.hour.push((t / 60) % 24); }
    }
    return out;
  };
  /**
   * 시상하부-뇌하수체-갑상선(HPT) 축의 정상 상태.
   * 뇌하수체 곡선: TSH = 10^(2.37 − 0.137·FT4)(로그-선형), 갑상선 곡선: FT4 = gland·Gt·TSH/(TSH + 1) + trab
   * 반환 {tsh, ft4} 교점. gland: 갑상선 기능 배율(1 정상, 0.5 기능 저하), trab: 자극 항체(그레이브스병), setpoint: 뇌하수체 감도 이동
   */
  BD.HPT = { a: 2.37, b: 0.137, gt: 26.7, km: 1.0 };
  BD.pituitaryTSH = (ft4, shift = 0) => Math.min(150, Math.pow(10, BD.HPT.a + shift - BD.HPT.b * ft4));
  BD.thyroidFT4 = (tsh, gland = 1, trab = 0) => gland * BD.HPT.gt * (tsh / (tsh + BD.HPT.km)) + trab;
  BD.hptEquilibrium = function (gland = 1, trab = 0, shift = 0) {
    let lo = 0.5, hi = 120;
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; const f = BD.thyroidFT4(BD.pituitaryTSH(m, shift), gland, trab) - m; if (f > 0) lo = m; else hi = m; }
    const ft4 = (lo + hi) / 2;
    return { ft4, tsh: BD.pituitaryTSH(ft4, shift) };
  };
  /** HPT 축의 시간 변화(일 단위). FT4 반감기 7일, TSH는 시간 단위로 빠르다 */
  BD.hptDynamics = function (opts = {}) {
    const o = Object.assign({ days: 120, dt: 0.05, gland: (d) => 1, trab: (d) => 0, dose: (d) => 0, ft4: 16, tsh: 1.5 }, opts);
    let F = o.ft4, S = o.tsh;
    const kF = Math.LN2 / 7, kS = Math.LN2 / 0.04;
    const out = { day: [], ft4: [], tsh: [] };
    const steps = Math.round(o.days / o.dt);
    for (let s = 0; s <= steps; s++) {
      const d = s * o.dt;
      const target = BD.thyroidFT4(S, o.gland(d), o.trab(d)) + o.dose(d);
      F += kF * (target - F) * o.dt;
      S += kS * (BD.pituitaryTSH(F) - S) * o.dt * 0.2;
      if (s % 20 === 0) { out.day.push(d); out.ft4.push(F); out.tsh.push(S); }
    }
    return out;
  };
  /**
   * 일반 피드백 루프(2장, 17장). 조절 변수 y가 설정점 sp를 따르도록 효과기가 움직인다.
   *   τ·dy/dt = −y + u + d(t) (+ 양성 피드백이면 y가 스스로를 키운다)
   *   u = 기준 + gain·(sp − y_delayed) (+ 적분 ki)
   * opts: sp, y0, gain, ki, delay, tau, kind("neg" | "pos" | "open"), dist(t), tstop, dt, umin, umax
   * 반환 {t, y, u, d}
   */
  BD.feedback = function (opts = {}) {
    const o = Object.assign({ sp: 37, y0: 37, base: 37, gain: 4, ki: 0, delay: 0, tau: 10, kind: "neg", dist: () => 0, tstop: 200, dt: 0.05, umin: null, umax: null, ymin: null, ymax: null }, opts);
    if (o.umin == null) o.umin = o.base - 40; if (o.umax == null) o.umax = o.base + 40;
    let y = o.y0, integ = 0;
    const dl = BD.delayLine(o.dt, Math.max(o.dt, o.delay), o.y0);
    const out = { t: [], y: [], u: [], d: [] };
    const steps = Math.round(o.tstop / o.dt);
    for (let s = 0; s <= steps; s++) {
      const t = s * o.dt;
      const yd = o.delay > 0 ? dl.push(y) : y;
      const err = o.sp - yd;
      let u;
      if (o.kind === "open") u = o.base;
      else if (o.kind === "pos") u = o.base - o.gain * err;
      else { integ += err * o.dt; u = o.base + o.gain * err + o.ki * integ; }
      u = clamp(u, o.umin, o.umax);
      const d = o.dist(t);
      y += ((-(y - o.base) + (u - o.base) + d) / o.tau) * o.dt * 1;
      if (o.ymin != null) y = Math.max(o.ymin, y); if (o.ymax != null) y = Math.min(o.ymax, y);
      if (s % 4 === 0) { out.t.push(t); out.y.push(y); out.u.push(u); out.d.push(d); }
    }
    return out;
  };

  /* ======================================================== 16. 콩팥과 체액 */
  /**
   * 사구체 여과(스탈링 힘). map(mmHg), raff·reff(저항 배율), kf(여과 계수 배율), pbs(보먼 주머니 압력), pi(혈장 교질 삼투압)
   * autoreg: 들세동맥 근원성 자동 조절(MAP 80~180 mmHg에서 혈류 일정)
   * 반환 {rbf, rpf, pgc, gfr, ff}
   */
  BD.gfr = function (opts = {}) {
    const o = Object.assign({ map: 93, raff: 1, reff: 1, kf: 1, pbs: 15, pi: 25, hct: 0.45, autoreg: true }, opts);
    const Re = 0.036 * o.reff, Rv = 0.01, Ra0 = 0.0345;               // mmHg·min/mL (RBF 약 1.1 L/min)
    let Ra = Ra0;
    if (o.autoreg) {
      // 근원성 반응·세뇨관-사구체 되먹임: 80~180 mmHg에서 혈류를 거의 일정하게(완벽하지는 않게) 지킨다
      const target = 1100 * (1 + (0.04 * (o.map - 93)) / 93);
      Ra = clamp((o.map - 4) / target - 0.036 - Rv, Ra0 * 0.45, Ra0 * 3.4);
    }
    Ra *= o.raff;
    const rbf = Math.max(0, (o.map - 4) / (Ra + Re + Rv));
    const pgc = o.map - rbf * Ra;
    const rpf = rbf * (1 - o.hct);
    // 여과가 진행되며 교질 삼투압이 오른다 → 평균 순여과압
    let gfr = 0;
    for (let it = 0; it < 40; it++) {
      const ff = clamp(gfr / Math.max(rpf, 1), 0, 0.6);
      const piOut = o.pi / (1 - ff), piAvg = (o.pi + piOut) / 2;
      const net = Math.max(0, pgc - o.pbs - piAvg);
      gfr = 0.5 * gfr + 0.5 * (10.9 * o.kf * net);
    }
    const ff = gfr / Math.max(rpf, 1), piAvg = (o.pi + o.pi / (1 - clamp(ff, 0, 0.6))) / 2;
    return { rbf, rpf, pgc, gfr, ff, net: Math.max(0, pgc - o.pbs - piAvg), piAvg, ra: Ra, re: Re };
  };
  /**
   * 콩팥의 포도당 처리(mg/min). 네프론마다 최대 수송량(Tm)이 조금씩 달라(평균 375, 표준편차 70 mg/min)
   * 혈당 약 180~200 mg/dL부터 소변으로 새기 시작하고(신장 역치), 여과량이 Tm을 넘으면 넘친 만큼 버린다(퍼짐 splay).
   */
  BD.renalGlucose = function (plasma, o = {}) {
    const p = Object.assign({ gfr: 125, tm: 375, sd: 70 }, o);
    const F = (p.gfr * plasma) / 100;
    if (p.sd <= 0) { const E = Math.max(0, F - p.tm); return { filtered: F, reabsorbed: F - E, excreted: E }; }
    const z = (F - p.tm) / p.sd;
    const Phi = 0.5 * (1 + erf(z / Math.SQRT2)), phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    const exc = clamp((F - p.tm) * Phi + p.sd * phi, 0, F);
    return { filtered: F, reabsorbed: F - exc, excreted: exc };
  };
  /** 청소율(mL/min) = U × V / P */
  BD.clearance = (u, v, p) => (u * v) / p;
  /** 항이뇨 호르몬(pg/mL): 혈장 삼투압 약 284.5 mOsm/kg 위에서 가파르게 오른다. 혈액량이 10 % 넘게 줄면 크게 더해진다 */
  BD.adh = (posm, volDeficit = 0) => Math.max(0, 0.45 * (posm - 284.5)) * (1 + 6 * Math.max(0, volDeficit)) + 25 * Math.max(0, volDeficit - 0.1);
  /** ADH → 소변 삼투압(mOsm/kg, 50~1200) */
  BD.urineOsm = (adh) => 50 + 1150 * (adh / (adh + 1.5));
  /**
   * 하루 수분 균형(분 단위). 마시는 물, 땀, 소변이 몸의 물과 혈장 삼투압을 바꾼다.
   * opts: kg, hours, drinks:[{t(분), ml, na(mmol)}], sweat:[{t0, t1, mlh(시간당 mL), na(mmol/L 40)}], solute(하루 배설 오스몰 900)
   * 반환 {t, posm, na, adh, uosm, urine(mL/min), tbw, thirst, cumUrine}
   */
  BD.waterBalance = function (opts = {}) {
    const o = Object.assign({ kg: 78, hours: 6, drinks: [], sweat: [], solute: 900, insensible: 0.6 }, opts);
    let tbw = BD.tbw(o.kg) * 1000;        // mL
    let osmTot = tbw * 0.287;             // mOsm (287 mOsm/kg)
    const out = { t: [], posm: [], na: [], adh: [], uosm: [], urine: [], tbw: [], thirst: [], cumUrine: [] };
    let cum = 0, adhNow = BD.adh(287);
    const tbw0 = tbw;
    const dt = 1;
    for (let t = 0; t <= o.hours * 60; t += dt) {
      for (const d of o.drinks) if (Math.abs(d.t - t) < dt / 2) { tbw += d.ml * 0.0; d._pending = (d._pending || 0) + d.ml; }
      // 장에서 물 흡수(약 20분 시정수)
      for (const d of o.drinks) if (d._pending > 0) { const a = Math.min(d._pending, d._pending * (dt / 20) + 0.5); d._pending -= a; tbw += a; osmTot += (d.na || 0) * 2 * (a / d.ml); }
      let sweatMl = 0, sweatOsm = 0;
      for (const s of o.sweat) if (t >= s.t0 && t < s.t1) { sweatMl += (s.mlh / 60) * dt; sweatOsm += ((s.mlh / 60) * dt * ((s.na == null ? 40 : s.na) * 2)) / 1000; }
      tbw -= sweatMl + o.insensible * dt; osmTot -= sweatOsm;
      const posm = (osmTot / tbw) * 1000;
      const volDef = Math.max(0, (tbw0 - tbw) / tbw0);
      const adhT = BD.adh(posm, volDef);
      adhNow += ((adhT - adhNow) * dt) / 10;   // 분비·청소 지연(ADH 반감기 약 15분)
      const uosm = BD.urineOsm(adhNow);
      const urine = Math.min(16, ((o.solute / 1440) / uosm) * 1000) * (1 - clamp((volDef - 0.05) * 3, 0, 0.6));   // mL/min
      tbw -= urine * dt; osmTot -= (o.solute / 1440) * dt; osmTot += (o.solute / 1440) * dt;   // 대사로 생기는 용질 ≈ 배설 용질
      cum += urine * dt;
      if (t % 2 === 0) {
        out.t.push(t); out.posm.push(posm); out.na.push(posm / 2 - 5); out.adh.push(adhNow); out.uosm.push(uosm); out.urine.push(urine); out.tbw.push(tbw / 1000);
        out.thirst.push(clamp((posm - 290) / 10 + volDef * 8, 0, 1)); out.cumUrine.push(cum);
      }
    }
    o.drinks.forEach((d) => delete d._pending);
    return out;
  };

  /* ======================================================== 17. 체온 조절 */
  /**
   * 두 구획(심부·피부) 체온 모델. 분 단위.
   * opts: met(대사량 W 100), ta(기온 °C), rh(상대 습도 %), wind(m/s), clo(옷), kg, cm, minutes, setpoint(°C 37, 발열이면 높인다),
   *       sweatMax(L/h 1.5), schedule: [{t0, t1, met}] (그 사이 대사량), acclim(더위 적응 0~1)
   * 반환 {t, core, skin, sweat(L/h), evap(W), dry(W), sbf(L/min), shiver(W), stored(W), loss(누적 땀 L), emax(증발 가능 최대 W), set(설정점)}
   */
  BD.thermo = function (opts = {}) {
    const o = Object.assign({ met: 100, ta: 22, rh: 50, wind: 0.2, clo: 0.6, kg: 78, cm: 175, minutes: 120, setpoint: 37, sweatMax: 1.5, schedule: [], acclim: 0, core0: 37, skin0: 33.5, eff: 0 }, opts);
    const A = BD.bsa(o.kg, o.cm);
    const cp = 3470;                                   // J/kg/K
    const Ccore = 0.8 * o.kg * cp, Cskin = 0.2 * o.kg * cp;
    let Tc = o.core0, Ts = o.skin0, lost = 0, setNow = 37;
    const out = { t: [], core: [], skin: [], sweat: [], evap: [], dry: [], sbf: [], shiver: [], stored: [], loss: [], emax: [], set: [] };
    const pSat = (T) => 0.6105 * Math.exp((17.27 * T) / (T + 237.3));   // kPa
    const dt = 2;                                      // s
    const hc = 8.3 * Math.sqrt(Math.max(0.2, o.wind)), hr = 4.7, LR = 16.5;
    const Icl = 0.155 * o.clo, fcl = 1 + 0.15 * o.clo;
    const hDry = 1 / (Icl + 1 / (fcl * (hc + hr)));     // W/m²K
    const ReT = Icl / (0.45 * LR) + 1 / (fcl * LR * hc); // m²kPa/W
    for (let s = 0; s <= o.minutes * 60; s += dt) {
      const tm = s / 60;
      let met = o.met;
      for (const e of o.schedule) if (tm >= e.t0 && tm < e.t1) met = e.met;
      setNow += ((o.setpoint - setNow) * dt) / 600;      // 설정점은 몇 분에 걸쳐 옮겨 간다(발열)
      const work = o.eff * Math.max(0, met - 100);        // 바깥으로 한 기계적 일(평지 달리기는 거의 0, 자전거는 약 20 %)
      const errC = Tc - setNow, errS = Ts - 34;
      const sbf = clamp(0.35 + 1.5 * Math.max(0, errC + 0.15 * errS) - 0.3 * Math.max(0, -errC) - 0.02 * Math.max(0, -errS), 0.05, 7);
      const shiver = clamp(110 * Math.max(0, -errC - 0.1) + 12 * Math.max(0, -errS - 1) * Math.max(0, -errC + 0.2), 0, 400);
      const sweatLh = clamp(Math.max(0, (0.6 + 0.3 * o.acclim) * errC + 0.1 * errS), 0, o.sweatMax * (1 + 0.4 * o.acclim));
      const dry = hDry * A * (Ts - o.ta);
      const emax = Math.max(0, (A * (pSat(Ts) - (o.rh / 100) * pSat(o.ta))) / ReT);
      const ereq = sweatLh * 675;                        // W(모든 땀이 증발한다면)
      const diff = 0.06 * emax;                          // 땀샘 밖 피부 확산(비감각 증발)
      const evap = Math.min(ereq + diff, emax);
      const resp = 0.0014 * met * (34 - o.ta) + 0.0173 * met * (5.87 - (o.rh / 100) * pSat(o.ta));
      const qcs = (5.28 * A + 70 * sbf) * (Tc - Ts);     // 심부 → 피부(전도 + 피부 혈류)
      const prod = met + shiver - work;
      Tc += ((prod - qcs - resp) * dt) / Ccore;
      Ts += ((qcs - dry - evap) * dt) / Cskin;
      lost += (sweatLh * dt) / 3600;
      if (s % 30 === 0) {
        out.t.push(tm); out.core.push(Tc); out.skin.push(Ts); out.sweat.push(sweatLh); out.evap.push(evap); out.dry.push(dry); out.sbf.push(sbf);
        out.shiver.push(shiver); out.stored.push(prod - resp - dry - evap); out.loss.push(lost); out.emax.push(emax); out.set.push(setNow);
      }
    }
    return out;
  };
  /** 체감 더위 지수(°C) — 미국 기상청 열지수(Rothfusz 회귀) */
  BD.heatIndex = function (tc, rh) {
    const T = tc * 9 / 5 + 32;
    let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + rh * 0.094);
    if (hi >= 80) hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
    return ((hi - 32) * 5) / 9;
  };

  /* ======================================================== 18. 그리기 도우미 (브라우저 전용) */
  const font = (px, mono, w) => (root.BB ? root.BB.font(px, mono, w) : (w ? w + " " : "") + px + "px sans-serif");
  /**
   * 환자 모니터 화면. 어두운 배경, 위에서 아래로 채널, 오른쪽에 숫자.
   *   BD.monitor(ctx, box, { t:[t0,t1], traces:[{label, color, data:[[t,y]...] | fn(t), range:[lo,hi], fill}], numerics:[{label, value, unit, color, alarm}], sweep(t), grid })
   * 반환: { rows:[{x,y,w,h, X(t), Y(v)}] }
   */
  BD.monitor = function (ctx, box, o) {
    const { x, y, w, h } = box;
    ctx.save();
    ctx.fillStyle = "#0b0d12"; ctx.fillRect(x, y, w, h);
    const numW = o.numerics && o.numerics.length ? Math.max(96, Math.min(150, w * 0.24)) : 0;
    const tw = w - numW - 8, nT = o.traces.length || 1, rowH = (h - 8) / nT;
    const rows = [];
    // 격자
    ctx.strokeStyle = "rgba(120,140,170,0.10)"; ctx.lineWidth = 1;
    const gx = o.gridDt || (o.t[1] - o.t[0]) / 10;
    for (let tt = Math.ceil(o.t[0] / gx) * gx; tt <= o.t[1]; tt += gx) { const px = x + 6 + ((tt - o.t[0]) / (o.t[1] - o.t[0])) * (tw - 6); ctx.beginPath(); ctx.moveTo(px, y + 4); ctx.lineTo(px, y + h - 4); ctx.stroke(); }
    o.traces.forEach((tr, i) => {
      const ry = y + 4 + i * rowH, rx = x + 6, rw = tw - 6;
      const [lo, hi] = tr.range;
      const X = (tt) => rx + ((tt - o.t[0]) / (o.t[1] - o.t[0])) * rw;
      const Y = (v) => ry + rowH - 6 - ((v - lo) / (hi - lo)) * (rowH - 18);
      rows.push({ x: rx, y: ry, w: rw, h: rowH, X, Y });
      if (i > 0) { ctx.strokeStyle = "rgba(120,140,170,0.18)"; ctx.beginPath(); ctx.moveTo(x + 4, ry); ctx.lineTo(x + tw, ry); ctx.stroke(); }
      ctx.save(); ctx.beginPath(); ctx.rect(rx, ry + 2, rw, rowH - 4); ctx.clip();
      ctx.strokeStyle = tr.color; ctx.lineWidth = tr.width || 1.8; ctx.lineJoin = "round";
      ctx.beginPath();
      let started = false;
      const pts = typeof tr.data === "function" ? BD.linspace(o.t[0], o.t[1], Math.max(200, Math.round(rw * 1.5))).map((tt) => [tt, tr.data(tt)]) : tr.data;
      const gap = o.sweep != null ? o.sweep : null;
      for (const [tt, v] of pts) {
        if (!isFinite(v)) { started = false; continue; }
        if (gap != null && tt > gap && tt < gap + (o.t[1] - o.t[0]) * 0.03) { started = false; continue; }
        const px = X(tt), py = Y(v);
        if (started) ctx.lineTo(px, py); else { ctx.moveTo(px, py); started = true; }
      }
      ctx.stroke();
      if (tr.fill) { ctx.lineTo(X(pts[pts.length - 1][0]), Y(lo)); ctx.lineTo(X(pts[0][0]), Y(lo)); ctx.closePath(); ctx.fillStyle = tr.fill; ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = tr.color; ctx.font = font(11, true, 600); ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(tr.label || "", rx + 2, ry + 3);
    });
    if (o.sweep != null) {
      const px = x + 6 + ((o.sweep - o.t[0]) / (o.t[1] - o.t[0])) * (tw - 6);
      ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(px, y + 2, 3, h - 4);
    }
    if (numW) {
      const nx = x + w - numW, nh = (h - 8) / o.numerics.length;
      ctx.strokeStyle = "rgba(120,140,170,0.25)"; ctx.beginPath(); ctx.moveTo(nx - 4, y + 4); ctx.lineTo(nx - 4, y + h - 4); ctx.stroke();
      o.numerics.forEach((n, i) => {
        const ny = y + 4 + i * nh;
        const blink = n.alarm && Math.floor(Date.now() / 450) % 2;
        ctx.fillStyle = n.color; ctx.globalAlpha = blink ? 0.45 : 1;
        ctx.font = font(11, false, 600); ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(n.label, nx + 4, ny + 3);
        ctx.font = font(Math.max(16, Math.min(30, nh * 0.42)), true, 700); ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(n.value, nx + numW - 8, ny + nh - (n.sub ? 14 : 4));
        if (n.unit) { ctx.font = font(10, false); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(n.unit, nx + 4, ny + 17); }
        if (n.sub) { ctx.font = font(10.5, true); ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(n.sub, nx + numW - 8, ny + nh - 2); }
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();
    return { rows };
  };
  /**
   * 사람 실루엣과 장기(정면). cx: 가운데 x, top: 머리 위 y, H: 키(px).
   * opts: { fill, stroke, organs: { heart: 색 | true, lungs, brain, liver, stomach, kidneys, gut, muscle, skin, bladder, thyroid, pancreas, adrenal }, labels, alpha }
   * 반환: 장기 위치 { heart:{x,y,r}, ... } (hit-test용)
   */
  BD.body = function (ctx, cx, top, H, o = {}) {
    const P = root.BB ? root.BB.palette() : { text: "#222", dim: "#666", border: "#ccc", surface: "#eee" };
    const u = H / 100;
    const X = (dx) => cx + dx * u, Y = (dy) => top + dy * u;
    const pos = {
      brain: { x: X(0), y: Y(6), rx: 5.2 * u, ry: 4.2 * u, name: "뇌" },
      thyroid: { x: X(0), y: Y(16.3), rx: 2.2 * u, ry: 1.0 * u, name: "갑상선" },
      lungs: { x: X(0), y: Y(28), rx: 9.5 * u, ry: 7.5 * u, name: "폐" },
      heart: { x: X(1.6), y: Y(30.5), rx: 3.3 * u, ry: 3.6 * u, name: "심장" },
      liver: { x: X(-4.2), y: Y(38.6), rx: 6.2 * u, ry: 3.2 * u, name: "간" },
      stomach: { x: X(4.4), y: Y(39.8), rx: 3.6 * u, ry: 2.8 * u, name: "위" },
      pancreas: { x: X(1.8), y: Y(43), rx: 4.2 * u, ry: 1.1 * u, name: "이자" },
      adrenal: { x: X(-5.2), y: Y(41.6), rx: 1.3 * u, ry: 0.8 * u, name: "부신" },
      kidneys: { x: X(0), y: Y(44.8), rx: 7.4 * u, ry: 2.6 * u, name: "콩팥" },
      gut: { x: X(0), y: Y(50.5), rx: 7.5 * u, ry: 4.6 * u, name: "장" },
      bladder: { x: X(0), y: Y(57.2), rx: 2.6 * u, ry: 1.8 * u, name: "방광" },
      muscle: { x: X(-5.6), y: Y(70), rx: 3.6 * u, ry: 10 * u, name: "골격근" },
      skin: { x: X(10.8), y: Y(45), rx: 2.2 * u, ry: 6 * u, name: "피부" },
    };
    ctx.save();
    // 실루엣
    ctx.beginPath();
    ctx.ellipse(X(0), Y(7), 6.4 * u, 7.4 * u, 0, 0, Math.PI * 2);
    const shape = [
      [-2.6, 14.5], [-3, 17.5], [-11.5, 20.5], [-13.5, 24], [-15.5, 38], [-17, 52], [-16.6, 55.5], [-14.6, 55.6], [-13.4, 52], [-12.2, 39.5], [-11.3, 33],
      [-10.4, 45], [-11.6, 57.5], [-10.4, 76], [-9.6, 94], [-10.8, 98.5], [-4.4, 98.6], [-4.2, 94], [-3.0, 76], [-1.6, 60], [0, 59.3],
    ];
    const full = shape.concat(shape.slice().reverse().map(([a, b]) => [-a, b]));
    ctx.moveTo(X(full[0][0]), Y(full[0][1]));
    for (let i = 1; i < full.length; i++) ctx.lineTo(X(full[i][0]), Y(full[i][1]));
    ctx.closePath();
    ctx.fillStyle = o.fill || (root.BB ? root.BB.alpha(P.text, 0.05) : "rgba(0,0,0,.05)");
    ctx.strokeStyle = o.stroke || (root.BB ? root.BB.alpha(P.text, 0.35) : "#999");
    ctx.lineWidth = 1.4;
    ctx.fill("evenodd"); ctx.stroke();
    // 장기
    const org = o.organs || {};
    const order = ["skin", "muscle", "gut", "bladder", "kidneys", "adrenal", "pancreas", "liver", "stomach", "lungs", "heart", "thyroid", "brain"];
    for (const k of order) {
      if (!org[k]) continue;
      const p = pos[k], col = typeof org[k] === "string" ? org[k] : P.dim;
      ctx.fillStyle = root.BB ? root.BB.alpha(col, o.alpha == null ? 0.55 : o.alpha) : col;
      ctx.strokeStyle = col; ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (k === "lungs") { ctx.ellipse(p.x - 4.8 * u, p.y, 4.4 * u, 7.5 * u, 0.06, 0, Math.PI * 2); ctx.moveTo(p.x + 9.2 * u, p.y); ctx.ellipse(p.x + 4.8 * u, p.y, 4.4 * u, 7.5 * u, -0.06, 0, Math.PI * 2); }
      else if (k === "kidneys") { ctx.ellipse(p.x - 5 * u, p.y, 1.8 * u, 2.6 * u, 0.2, 0, Math.PI * 2); ctx.moveTo(p.x + 6.8 * u, p.y); ctx.ellipse(p.x + 5 * u, p.y, 1.8 * u, 2.6 * u, -0.2, 0, Math.PI * 2); }
      else if (k === "adrenal") { ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.moveTo(p.x + 11.7 * u, p.y); ctx.ellipse(p.x + 10.4 * u, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); }
      else if (k === "muscle") { ctx.ellipse(p.x, p.y, p.rx, p.ry, 0.03, 0, Math.PI * 2); ctx.moveTo(p.x + 14.8 * u, p.y); ctx.ellipse(p.x + 11.2 * u, p.y, p.rx, p.ry, -0.03, 0, Math.PI * 2); }
      else if (k === "heart") {
        const hx = p.x, hy = p.y, s = 3.6 * u;
        ctx.moveTo(hx, hy + s);
        ctx.bezierCurveTo(hx - 1.6 * s, hy - 0.1 * s, hx - 0.7 * s, hy - 1.15 * s, hx, hy - 0.45 * s);
        ctx.bezierCurveTo(hx + 0.7 * s, hy - 1.15 * s, hx + 1.6 * s, hy - 0.1 * s, hx, hy + s);
      }
      else if (k === "skin") { ctx.restore(); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(X(0), Y(7), 6.4 * u, 7.4 * u, 0, 0, Math.PI * 2); ctx.moveTo(X(full[0][0]), Y(full[0][1])); for (let i = 1; i < full.length; i++) ctx.lineTo(X(full[i][0]), Y(full[i][1])); ctx.closePath(); ctx.stroke(); ctx.restore(); ctx.save(); continue; }
      else ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    if (o.labels) {
      ctx.font = font(Math.max(10, Math.min(12, 2.2 * u)), false, 600); ctx.textBaseline = "middle";
      for (const k of order) {
        if (!org[k] || k === "skin") continue;
        const p = pos[k], right = p.x >= cx - 0.5;
        const lx = right ? X(19) : X(-19);
        ctx.strokeStyle = P.dim; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(p.x + (right ? p.rx * 0.6 : -p.rx * 0.6), p.y); ctx.lineTo(lx + (right ? -3 : 3), p.y); ctx.stroke();
        ctx.fillStyle = P.text; ctx.textAlign = right ? "left" : "right"; ctx.fillText(p.name, lx, p.y);
      }
    }
    ctx.restore();
    return pos;
  };
  /**
   * 심장 단면(네 방) 그림. cx, cy 중심, s 크기(px, 전체 높이 약 2.2s).
   * o: { lv, rv, la, ra(채움 0~1), mitral, tricuspid, aortic, pulmonic(열림 bool), active("atria" | "ventricles" | null), wave(전도 진행 0~1), labels }
   */
  BD.heartDiagram = function (ctx, cx, cy, s, o = {}) {
    const B = root.BB;
    const P = B ? B.palette() : { text: "#222", dim: "#666", border: "#ccc", bg: "#fff" };
    const art = B ? B.color("art") : "#d6293e", ven = B ? B.color("ven") : "#3b5bdb";
    const A = (c, a) => (B ? B.alpha(c, a) : c);
    const muscle = B ? B.color("prot") : "#c2255c";
    const sqV = o.active === "ventricles" ? 1 : 0, sqA = o.active === "atria" ? 1 : 0;
    const f = (v) => clamp(v == null ? 0.5 : v, 0, 1.2);
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // 1) 큰 혈관(방보다 먼저 그려 뒤에 놓는다)
    const vessel = (pts, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); if (pts.length === 4) ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); else pts.slice(1).forEach((q) => ctx.lineTo(q[0], q[1])); ctx.stroke(); };
    vessel([[cx - 0.55 * s, cy - 0.7 * s], [cx - 0.55 * s, cy - 1.1 * s], [cx - 0.56 * s, cy - 1.3 * s], [cx - 0.58 * s, cy - 1.45 * s]], A(ven, 0.85), 0.2 * s);          // 위대정맥
    vessel([[cx + 0.6 * s, cy - 0.62 * s], [cx + 0.85 * s, cy - 0.62 * s], [cx + 1.0 * s, cy - 0.7 * s], [cx + 1.12 * s, cy - 0.78 * s]], A(art, 0.75), 0.13 * s);       // 폐정맥
    vessel([[cx - 0.18 * s, cy - 0.1 * s], [cx - 0.2 * s, cy - 0.85 * s], [cx - 0.45 * s, cy - 1.15 * s], [cx - 0.95 * s, cy - 1.12 * s]], A(ven, 0.9), 0.19 * s);       // 폐동맥
    vessel([[cx + 0.12 * s, cy - 0.05 * s], [cx + 0.1 * s, cy - 1.35 * s], [cx + 0.75 * s, cy - 1.45 * s], [cx + 0.85 * s, cy - 0.95 * s]], A(art, 0.95), 0.22 * s);      // 대동맥
    // 2) 심실 근육 덩어리
    const k = 1 - 0.05 * sqV;
    ctx.save(); ctx.translate(cx, cy + 0.2 * s); ctx.scale(k, 1 - 0.03 * sqV); ctx.translate(-cx, -(cy + 0.2 * s));
    ctx.beginPath();
    ctx.moveTo(cx - 0.98 * s, cy - 0.32 * s);
    ctx.bezierCurveTo(cx - 1.1 * s, cy + 0.55 * s, cx - 0.35 * s, cy + 1.08 * s, cx + 0.32 * s, cy + 1.2 * s);
    ctx.bezierCurveTo(cx + 1.0 * s, cy + 0.92 * s, cx + 1.06 * s, cy + 0.1 * s, cx + 0.95 * s, cy - 0.32 * s);
    ctx.quadraticCurveTo(cx, cy - 0.62 * s, cx - 0.98 * s, cy - 0.32 * s);
    ctx.closePath();
    ctx.fillStyle = A(muscle, 0.28 + 0.12 * sqV); ctx.fill(); ctx.strokeStyle = A(muscle, 0.75); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    // 3) 심방(벽 + 공간)
    const atrium = (x, col, fill) => {
      const kk = 1 - 0.12 * sqA, rr = 0.7 + 0.3 * f(fill);
      ctx.beginPath(); ctx.ellipse(x, cy - 0.62 * s, 0.42 * s * kk, 0.32 * s * kk, 0, 0, Math.PI * 2);
      ctx.fillStyle = A(muscle, 0.22 + 0.15 * sqA); ctx.fill(); ctx.strokeStyle = A(muscle, 0.7); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, cy - 0.62 * s, 0.33 * s * kk * rr, 0.24 * s * kk * rr, 0, 0, Math.PI * 2);
      ctx.fillStyle = A(col, 0.78); ctx.fill();
    };
    atrium(cx - 0.53 * s, ven, o.ra); atrium(cx + 0.53 * s, art, o.la);
    // 4) 심실 공간(부피에 비례해 커진다)
    const cav = (x, y, rx, ry, col, fill, tilt) => { const kk = 0.45 + 0.55 * f(fill); ctx.beginPath(); ctx.ellipse(x, y, rx * s * kk, ry * s * kk, tilt, 0, Math.PI * 2); ctx.fillStyle = A(col, 0.82); ctx.fill(); };
    cav(cx - 0.47 * s, cy + 0.3 * s, 0.3, 0.56, ven, o.rv, 0.18);
    cav(cx + 0.42 * s, cy + 0.38 * s, 0.33, 0.62, art, o.lv, -0.22);
    // 5) 판막
    const leaflets = (x, y, open, wdt) => {
      ctx.strokeStyle = open ? A(P.text, 0.45) : P.text; ctx.lineWidth = open ? 1.6 : 2.6;
      ctx.beginPath();
      if (open) { ctx.moveTo(x - wdt, y); ctx.lineTo(x - wdt * 0.55, y + 0.2 * s); ctx.moveTo(x + wdt, y); ctx.lineTo(x + wdt * 0.55, y + 0.2 * s); }
      else { ctx.moveTo(x - wdt, y); ctx.lineTo(x - 0.02 * s, y + 0.06 * s); ctx.moveTo(x + wdt, y); ctx.lineTo(x + 0.02 * s, y + 0.06 * s); }
      ctx.stroke();
    };
    leaflets(cx - 0.5 * s, cy - 0.32 * s, !!o.tricuspid, 0.2 * s);
    leaflets(cx + 0.5 * s, cy - 0.32 * s, !!o.mitral, 0.2 * s);
    const semilunar = (x, y, open) => {
      ctx.strokeStyle = open ? A(P.text, 0.45) : P.text; ctx.lineWidth = open ? 1.5 : 2.6; ctx.beginPath();
      if (open) { ctx.moveTo(x - 0.09 * s, y); ctx.lineTo(x - 0.08 * s, y - 0.18 * s); ctx.moveTo(x + 0.09 * s, y); ctx.lineTo(x + 0.08 * s, y - 0.18 * s); }
      else { ctx.moveTo(x - 0.1 * s, y); ctx.quadraticCurveTo(x, y - 0.1 * s, x + 0.1 * s, y); }
      ctx.stroke();
    };
    semilunar(cx + 0.12 * s, cy - 0.2 * s, !!o.aortic);
    semilunar(cx - 0.18 * s, cy - 0.24 * s, !!o.pulmonic);
    // 6) 전도 경로
    if (o.wave != null) {
      const nerve = B ? B.color("tr-4") : "#f5c400";
      const pts = [[cx - 0.38 * s, cy - 0.86 * s], [cx - 0.08 * s, cy - 0.3 * s], [cx - 0.02 * s, cy - 0.05 * s], [cx + 0.0 * s, cy + 0.85 * s], [cx + 0.45 * s, cy + 1.0 * s]];
      ctx.strokeStyle = A(nerve, 0.45); ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      const segs = pts.length - 1, w = clamp(o.wave, 0, 1) * segs, i = Math.min(segs - 1, Math.floor(w)), fr = w - i;
      const px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * fr, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * fr;
      ctx.fillStyle = nerve; ctx.beginPath(); ctx.arc(px, py, 0.075 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = A(nerve, 0.9); ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 0.055 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(pts[1][0], pts[1][1], 0.045 * s, 0, Math.PI * 2); ctx.fill();
    }
    if (o.labels) {
      ctx.fillStyle = "#fff"; ctx.font = font(Math.max(10, 0.16 * s), false, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 3;
      ctx.fillText("우심방", cx - 0.53 * s, cy - 0.62 * s); ctx.fillText("좌심방", cx + 0.53 * s, cy - 0.62 * s);
      ctx.fillText("우심실", cx - 0.47 * s, cy + 0.32 * s); ctx.fillText("좌심실", cx + 0.42 * s, cy + 0.42 * s);
      ctx.shadowBlur = 0;
      ctx.fillStyle = P.dim; ctx.font = font(Math.max(9.5, 0.13 * s), false, 600);
      ctx.fillText("대동맥", cx + 0.55 * s, cy - 1.58 * s); ctx.fillText("폐동맥", cx - 0.95 * s, cy - 1.3 * s);
    }
    ctx.restore();
  };
  /**
   * 반원 계기판. value를 [min, max] 범위에서 바늘로. zones: [{to, color}]
   */
  BD.gauge = function (ctx, cx, cy, r, value, o = {}) {
    const P = root.BB ? root.BB.palette() : { text: "#222", dim: "#666", grid: "#eee" };
    const min = o.min || 0, max = o.max == null ? 100 : o.max;
    const ang = (v) => Math.PI + (clamp((v - min) / (max - min), 0, 1)) * Math.PI;
    ctx.save();
    ctx.lineWidth = Math.max(6, r * 0.16); ctx.lineCap = "butt";
    let from = min;
    (o.zones || [{ to: max, color: P.grid }]).forEach((z) => { ctx.strokeStyle = z.color; ctx.beginPath(); ctx.arc(cx, cy, r, ang(from), ang(z.to)); ctx.stroke(); from = z.to; });
    const a = ang(value);
    ctx.strokeStyle = P.text; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9); ctx.stroke();
    ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    if (o.label) { ctx.font = font(12, false, 600); ctx.fillStyle = P.dim; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(o.label, cx, cy + 8); }
    if (o.text) { ctx.font = font(Math.max(14, r * 0.3), true, 700); ctx.fillStyle = P.text; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(o.text, cx, cy - r * 0.25); }
    ctx.restore();
  };
  /** 흐르는 점(혈류·공기·전류 애니메이션): pts 경로를 따라 phase(0~)만큼 이동한 점들을 그린다 */
  BD.flowDots = function (ctx, pts, phase, o = {}) {
    const gap = o.gap || 14, r = o.r || 2.4;
    const seg = [];
    let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    if (L <= 0) return;
    ctx.save(); ctx.fillStyle = o.color || "#d6293e";
    const off = ((phase % gap) + gap) % gap;
    for (let s = off; s < L; s += gap) {
      let acc = 0, i = 0;
      while (i < seg.length && acc + seg[i] < s) { acc += seg[i]; i++; }
      if (i >= seg.length) break;
      const f = (s - acc) / seg[i];
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  /* ======================================================== 내보내기 */
  root.BD = BD;
  if (typeof module !== "undefined" && module.exports) module.exports = BD;
})(typeof window !== "undefined" ? window : globalThis);
