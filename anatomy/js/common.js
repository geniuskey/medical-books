/* Copyright (c) 2026 geniuskey and AnatomyBook contributors.
   Executable code: MIT (see ../LICENSE-MIT).
   Educational content and illustrations: CC-BY-4.0 (see ../LICENSE.md). */
/* ==========================================================================
   AnatomyBook 공통 스크립트 — 전역 객체 BB
   - 레이아웃(상단바, 검색, 목차, 이전/다음, 테마, 시뮬레이터만 보기) 자동 생성
   - 시뮬레이터 헬퍼: canvas, chart, bars, donut, range, seg, drag, tip, 색/난수/포맷
   이 파일은 <head>에서 defer 없이 로드된다. 페이지 스크립트는 </body> 직전에 둔다.
   ========================================================================== */
(function () {
  "use strict";

  // stage: 책의 갈래(STAGES의 인덱스). 해부학의 언어·용어집처럼 가로지르는 장은 생략한다.
  const STAGES = [
    { key: "bone", name: "뼈대", en: "Skeleton", seg: "circ" },
    { key: "limb", name: "팔다리", en: "Limbs", seg: "resp" },
    { key: "trunk", name: "몸통", en: "Trunk", seg: "musc" },
    { key: "head", name: "머리와 연결망", en: "Head & Networks", seg: "meta" },
    { key: "data", name: "단면과 데이터", en: "Sections & Data", seg: "reg" },
  ];

  const CHAPTERS = [
    { slug: "language",  num: "01",           title: "해부학의 언어",            desc: "해부학적 자세, 위·아래·안·밖 같은 방향 용어, 세 가지 단면, 몸의 부위 이름. 3D 모델 위에서 좌표로 익히는 지도 읽기.", tags: ["기초", "sim"] },
    { slug: "skeleton",  num: "02", stage: 0, title: "뼈대: 206개의 뼈",        desc: "몸통뼈대와 팔다리뼈대, 뼈의 모양과 하는 일, 실제 뼈의 부피와 무게, 뼈 개수를 세는 법.", tags: ["뼈대", "sim"] },
    { slug: "axial",     num: "03", stage: 0, title: "머리뼈, 척주, 가슴우리",   desc: "22개의 머리뼈, 목·등·허리로 이어지는 척주의 굽이와 척추뼈 크기의 변화, 숨 쉴 때 움직이는 가슴우리.", tags: ["뼈대", "sim"] },
    { slug: "upperlimb", num: "04", stage: 1, title: "팔과 손",                 desc: "어깨에서 손끝까지. 빗장뼈·어깨뼈·위팔뼈·노뼈·자뼈와 27개의 손뼈, 어깨와 팔을 움직이는 근육.", tags: ["팔다리", "sim"] },
    { slug: "lowerlimb", num: "05", stage: 1, title: "다리와 발",               desc: "체중을 받치는 골반과 다리. 넙다리뼈에서 발가락까지, 걷기와 서기에 쓰는 근육, 발의 아치.", tags: ["팔다리", "sim"] },
    { slug: "joints",    num: "06", stage: 1, title: "관절과 움직임",            desc: "관절의 종류와 자유도, 굽힘·폄·벌림·모음·돌림, 관절 가동 범위, 지렛대로서의 뼈와 근육.", tags: ["팔다리", "sim"] },
    { slug: "trunk",     num: "07", stage: 2, title: "몸통과 목의 근육",          desc: "척주를 세우는 등근육, 숨 쉬는 가슴과 배의 벽, 목의 근육과 후두. 근육 이름을 짓는 규칙.", tags: ["몸통", "sim"] },
    { slug: "thorax",    num: "08", stage: 2, title: "가슴 안: 심장과 폐의 자리",  desc: "세로칸과 흉막, 심장이 놓인 각도, 큰 혈관과 기관지 나무, 식도와 가슴샘. 가슴 안의 공간 배치.", tags: ["몸통", "sim"] },
    { slug: "abdomen",   num: "09", stage: 2, title: "배와 골반 안",             desc: "배의 아홉 구역과 사분면, 간·위·지라·이자·창자의 자리, 배막 뒤의 콩팥, 골반 안의 장기와 골반바닥.", tags: ["몸통", "sim"] },
    { slug: "brain",     num: "10", stage: 3, title: "뇌와 눈",                 desc: "대뇌의 엽과 이랑, 깊은 곳의 시상·바닥핵·해마, 뇌실, 소뇌와 뇌줄기, 눈알과 눈 근육, 시각의 길.", tags: ["머리와 연결망", "sim"] },
    { slug: "vessels",   num: "11", stage: 3, title: "혈관의 지도",              desc: "대동맥에서 손끝·발끝까지의 동맥 경로, 맥박을 짚는 자리, 얕은 정맥과 깊은 정맥, 문맥계.", tags: ["머리와 연결망", "sim"] },
    { slug: "sections",  num: "12", stage: 4, title: "단면으로 보는 몸",          desc: "CT와 MRI처럼 몸을 가로·세로로 잘라 본다. 가로면·관상면·시상면, 높이마다 바뀌는 단면, 영상 읽는 법.", tags: ["단면과 데이터", "sim"] },
    { slug: "data",      num: "13", stage: 4, title: "계산하는 해부학",           desc: "BodyParts3D와 해부학 온톨로지. 부피·겉넓이·거리·무게중심을 실제 데이터로 계산하고, 그 한계를 안다.", tags: ["단면과 데이터", "sim"] },
    { slug: "glossary",  num: "14",           title: "용어집 & 종합 퀴즈",         desc: "해부학 용어를 검색하고 한자어·우리말·영어 이름을 맞춰 보며, 종합 퀴즈로 몸의 지도를 점검하자.", tags: ["정리"] },
  ];
  const BB = (window.BB = {});
  BB.CHAPTERS = CHAPTERS;
  BB.STAGES = STAGES;

  /* ------------------------------------------------------------ math utils */
  BB.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  BB.lerp = (a, b, t) => a + (b - a) * t;
  BB.map = (x, a, b, c, d) => c + ((x - a) * (d - c)) / (b - a);
  BB.randn = function () {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  BB.poisson = function (lambda) {
    if (lambda <= 0) return 0;
    if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * BB.randn()));
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  /** 숫자 포맷: 유효 자리 */
  BB.fmt = function (x, digits = 3) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e5 || a < 1e-3) return x.toExponential(digits - 1).replace("e+", "e");
    return Number(x.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 6 });
  };
  /** SI 접두사 포맷: BB.si(2.3e-9,'m') → "2.3 nm" */
  BB.si = function (x, unit = "", digits = 3) {
    if (!isFinite(x)) return "—";
    digits = Math.max(1, Math.min(21, Math.round(digits) || 3));
    if (x === 0) return "0 " + unit;
    const pre = [[1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]];
    const a = Math.abs(x);
    for (const [v, p] of pre) if (a >= v * 0.9995) return Number((x / v).toPrecision(digits)) + " " + p + unit;
    return x.toExponential(digits - 1) + " " + unit;
  };


  /** 오차 함수 (Abramowitz–Stegun 7.1.26, |ε| < 1.5e-7) */
  BB.erf = function (x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  };
  BB.erfc = (x) => 1 - BB.erf(x);
  /** 캔버스 글꼴 문자열: BB.font(12) / BB.font(11, true) */
  BB.font = function (px, mono, weight) {
    const cs = getComputedStyle(document.body);
    return (weight ? weight + " " : "") + px + "px " + (mono ? cs.getPropertyValue("--mono") : cs.getPropertyValue("--font"));
  };
  /** 호출을 묶어 마지막 한 번만 실행 */
  BB.debounce = function (fn, ms = 120) { let t = 0; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  /** 정규 난수 시드 고정용 간단 PRNG (mulberry32) */
  BB.rng = function (seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  

  /* ------------------------------------------------------------ body helpers */
  /** 퍼센트: BB.pct(0.234) → "23.4%" */
  BB.pct = (x, d = 1) => (isFinite(x) ? (x * 100).toFixed(d) + "%" : "—");
  /** 데시벨: BB.db(1000) → "60.0 dB" (전압비). power=true면 10·log10 */
  BB.db = (x, d = 1, power) => (isFinite(x) && x > 0 ? ((power ? 10 : 20) * Math.log10(x)).toFixed(d) + " dB" : "—");
  /** 계통 색: base circ resp musc meta reg */
  BB.segColor = (k) => BB.color("seg-" + k) || BB.color("text-dim");
  /** 모니터 채널 색: BB.trace(1..4) (심전도 초록, 동맥압 빨강, SpO2 하늘, 호흡 노랑) */
  BB.trace = (i) => BB.color("tr-" + i) || BB.color("accent");
  /** "#rrggbb" 또는 rgb() 색에 투명도 */
  BB.alpha = function (c, a) {
    c = (c || "").trim();
    if (c[0] === "#") { const h = c.length === 4 ? c.slice(1).split("").map((x) => x + x).join("") : c.slice(1, 7); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; }
    const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(",").slice(0, 3).join(","); return `rgba(${p},${a})`; }
    return c;
  };
  /**
   * 캔버스 위 떠 있는 정보 상자. const tip = BB.tip(canvas); tip.show(x, y, html); tip.hide();
   * x, y는 캔버스 CSS px. 부모(.sim-view)는 position: relative.
   */
  BB.tip = function (canvas) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const el = document.createElement("div");
    el.className = "bb-tip";
    canvas.parentElement.appendChild(el);
    return {
      el,
      show(x, y, html) {
        el.innerHTML = html; el.classList.add("on");
        const pw = canvas.parentElement.clientWidth, w = el.offsetWidth, h = el.offsetHeight;
        let left = x + 14, top = y + 14;
        if (left + w > pw - 4) left = Math.max(4, x - w - 14);
        if (top + h > canvas.clientHeight - 4) top = Math.max(4, y - h - 10);
        el.style.left = left + "px"; el.style.top = top + "px";
      },
      hide() { el.classList.remove("on"); },
    };
  };
  /** 둥근 사각형 경로 */
  BB.rrect = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  /** 상자 폭에 맞춰 글자를 줄바꿈해 그린다(공백 기준). 그린 줄 수를 돌려준다 */
  BB.wrapText = function (ctx, text, x, y, maxW, lineH, maxLines = 9) {
    const words = String(text).split(/(\s+)/); let line = "", n = 0;
    const flush = () => { ctx.fillText(line.trim(), x, y + n * lineH); n++; line = ""; };
    for (const w of words) {
      if (ctx.measureText(line + w).width <= maxW || !line) { line += w; continue; }
      if (n >= maxLines - 1) { line += w; break; }
      flush(); line = w.trimStart();
    }
    if (line && n < maxLines) flush();
    return n;
  };

  /* ------------------------------------------------------------ theme */
  const themeCbs = [];
  BB.onTheme = (cb) => themeCbs.push(cb);
  BB.isDark = function () {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  /** CSS 변수 값 읽기: BB.color('accent') */
  BB.color = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
  };
  /** 자주 쓰는 색 묶음 (테마 변경 시 다시 호출할 것) */
  BB.palette = function () {
    const c = BB.color;
    return {
      bg: c("canvas-bg"), text: c("text"), dim: c("text-dim"), faint: c("text-faint"),
      grid: c("grid"), axis: c("axis"), border: c("border"), surface: c("surface"),
      accent: c("accent"), accent2: c("accent-2"), ok: c("ok"), warn: c("warn"), bad: c("bad"),
      red: c("red"), green: c("green"), blue: c("blue"),
      // 데이터 시리즈용 기본 순서
      series: [c("accent"), c("accent-2"), c("warn"), c("ok"), c("bad"), c("text-dim")],
    };
  };
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    themeCbs.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  }
  try { const saved = localStorage.getItem("medical-theme"); if (saved) document.documentElement.setAttribute("data-theme", saved); } catch (e) {}
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (!document.documentElement.getAttribute("data-theme")) applyTheme(null);
    });
  }

  /* ------------------------------------------------------------ canvas helper */
  /**
   * HiDPI 캔버스. 폭은 부모 폭을 따르고 높이는 aspect(높이/폭) 또는 height(px)로 결정.
   * draw(ctx, w, h)는 리사이즈·테마 변경 시 자동 호출된다. 애니메이션이면 직접 redraw() 호출.
   *   const cv = BB.canvas(el, (ctx,w,h)=>{...}, {aspect:0.5, maxHeight: 420});
   *   cv.redraw(); cv.ctx; cv.w; cv.h
   */
  BB.canvas = function (canvas, draw, opts = {}) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    const ctx = canvas.getContext("2d");
    const st = { ctx, w: 0, h: 0, canvas, dpr: 1 };
    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(200, Math.floor(opts.width || parent.clientWidth || 600));
      let h = opts.height || Math.round(w * (opts.aspect || 0.5));
      if (opts.minHeight) h = Math.max(h, opts.minHeight);
      if (opts.maxHeight) h = Math.min(h, opts.maxHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = h; st.dpr = dpr;
      st.redraw();
    }
    st.redraw = function () {
      if (!st.w) return;
      ctx.save();
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (!opts.noClear) {
        ctx.clearRect(0, 0, st.w, st.h);
        ctx.fillStyle = canvas.closest(".sim-view.monitor") ? "#0b0d12" : BB.color("canvas-bg");
        ctx.fillRect(0, 0, st.w, st.h);
      }
      try { draw && draw(ctx, st.w, st.h); } finally { ctx.restore(); }
    };
    st.resize = resize;
    if (window.ResizeObserver) {
      let lastW = -1;
      new ResizeObserver(() => { const w = canvas.parentElement.clientWidth; if (w !== lastW) { lastW = w; resize(); } }).observe(canvas.parentElement);
    } else window.addEventListener("resize", resize);
    BB.onTheme(() => st.redraw());
    resize();
    return st;
  };

  /**
   * 화면에 보일 때만 도는 애니메이션 루프. fn(dt초, t초)
   *   const loop = BB.loop(el, (dt,t)=>{...}); loop.stop(); loop.start();
   */
  BB.loop = function (el, fn) {
    let raf = 0, last = 0, t = 0, visible = true, running = true;
    function frame(ts) {
      raf = 0;
      if (!running || !visible) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts; t += dt;
      fn(dt, t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && running && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    if (window.IntersectionObserver && el) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(el);
    }
    kick();
    return {
      start() { running = true; kick(); },
      stop() { running = false; },
      get running() { return running; },
      toggle() { running ? (running = false) : ((running = true), kick()); return running; },
    };
  };

  /* ------------------------------------------------------------ chart helper */
  /**
   * 간단한 선 그래프. box = {x,y,w,h}(생략 시 캔버스 전체에 여백 자동)
   * opts: { x:[min,max], y:[min,max], logX, logY, xLabel, yLabel, xTicks, yTicks,
   *         xFmt, yFmt, series:[{data:[[x,y],...], color, width, dash, fill, label}],
   *         vlines:[{x,color,label,dash}], hlines:[{y,color,label,dash}], points:[{x,y,color,r,label}],
   *         bands:[{x0,x1,color}] }
   * 반환: { X(v)->px, Y(v)->px, box }
   */
  BB.chart = function (ctx, box, opts) {
    const P = BB.palette();
    const dpr = (ctx.getTransform && ctx.getTransform().a) || 1;
    const W = ctx.canvas.width / dpr, H = ctx.canvas.height / dpr;
    if (!box) box = { x: 58, y: 16, w: W - 58 - 18, h: H - 16 - 46 };
    const [x0, x1] = opts.x, [y0, y1] = opts.y;
    const lx = (v) => (opts.logX ? Math.log10(v) : v);
    const ly = (v) => (opts.logY ? Math.log10(v) : v);
    const X = (v) => box.x + ((lx(v) - lx(x0)) / (lx(x1) - lx(x0))) * box.w;
    const Y = (v) => box.y + box.h - ((ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * box.h;
    const ticks = (a, b, log, n) => {
      if (log) { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(Math.pow(10, e)); return out; }
      const span = b - a, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= (n || 5) + 0.5) || raw;
      const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
      return out;
    };
    const defFmt = (v) => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? v.toExponential(0).replace("e+", "e") : String(Number(v.toPrecision(4))));
    const xFmt = opts.xFmt || defFmt, yFmt = opts.yFmt || defFmt;
    ctx.save();
    ctx.font = "11px " + getComputedStyle(document.body).getPropertyValue("--mono");
    ctx.lineWidth = 1;
    // bands
    (opts.bands || []).forEach((b) => { ctx.fillStyle = b.color; ctx.fillRect(X(b.x0), box.y, X(b.x1) - X(b.x0), box.h); });
    // grid + ticks
    const xt = Array.isArray(opts.xTicks) ? opts.xTicks : ticks(x0, x1, opts.logX, typeof opts.xTicks === "number" ? opts.xTicks : 6);
    const yt = Array.isArray(opts.yTicks) ? opts.yTicks : ticks(y0, y1, opts.logY, typeof opts.yTicks === "number" ? opts.yTicks : 5);
    ctx.strokeStyle = P.grid; ctx.fillStyle = P.dim;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => { const px = X(v); if (px < box.x - 1 || px > box.x + box.w + 1) return; ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.fillText(xFmt(v), px, box.y + box.h + 6); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach((v) => { const py = Y(v); if (py < box.y - 1 || py > box.y + box.h + 1) return; ctx.beginPath(); ctx.moveTo(box.x, py); ctx.lineTo(box.x + box.w, py); ctx.stroke(); ctx.fillText(yFmt(v), box.x - 6, py); });
    ctx.strokeStyle = P.axis;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    // labels
    ctx.fillStyle = P.dim; ctx.font = "12px " + getComputedStyle(document.body).getPropertyValue("--font");
    if (opts.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(opts.xLabel, box.x + box.w / 2, box.y + box.h + 40); }
    if (opts.yLabel) { ctx.save(); ctx.translate(box.x - 44, box.y + box.h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(opts.yLabel, 0, 0); ctx.restore(); }
    // clip plot area
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    (opts.series || []).forEach((s, i) => {
      if (!s.data || !s.data.length) return;
      ctx.strokeStyle = s.color || P.series[i % P.series.length];
      ctx.lineWidth = s.width || 2; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let started = false;
      s.data.forEach(([x, y]) => { if (!isFinite(y) || (opts.logY && y <= 0) || (opts.logX && x <= 0)) { started = false; return; } const px = X(x), py = Y(y); started ? ctx.lineTo(px, py) : ctx.moveTo(px, py); started = true; });
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(X(s.data[s.data.length - 1][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.lineTo(X(s.data[0][0]), Y(opts.logY ? y0 : Math.max(y0, 0)));
        ctx.closePath(); ctx.fillStyle = s.fill; ctx.fill();
      }
      ctx.setLineDash([]);
    });
    (opts.vlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(X(l.x), box.y); ctx.lineTo(X(l.x), box.y + box.h); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(l.label, X(l.x) + 4, box.y + 4); } });
    (opts.hlines || []).forEach((l) => { ctx.strokeStyle = l.color || P.faint; ctx.setLineDash(l.dash || [4, 4]); ctx.lineWidth = l.width || 1.2; ctx.beginPath(); ctx.moveTo(box.x, Y(l.y)); ctx.lineTo(box.x + box.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) { ctx.fillStyle = l.color || P.dim; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(l.label, box.x + box.w - 4, Y(l.y) - 3); } });
    (opts.points || []).forEach((p) => { ctx.fillStyle = p.color || P.accent; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, Math.PI * 2); ctx.fill(); if (p.label) { ctx.fillStyle = P.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(p.label, X(p.x) + 6, Y(p.y) - 4); } });
    ctx.restore();
    ctx.restore();
    return { X, Y, box };
  };

  /* ------------------------------------------------------------ controls */
  /**
   * range 입력 바인딩. output은 id+"-out" 요소 또는 <output for=id>.
   *   const get = BB.range('wl', v => v+' nm', v => redraw());  get() → 현재 값(Number)
   */
  BB.range = function (id, fmt, onInput) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const out = document.getElementById(el.id + "-out") || document.querySelector(`output[for="${el.id}"]`);
    const update = (fire) => {
      const v = Number(el.value);
      const pct = ((v - Number(el.min || 0)) / (Number(el.max || 100) - Number(el.min || 0))) * 100;
      el.style.setProperty("--fill", pct + "%");
      if (out) out.textContent = fmt ? fmt(v) : String(v);
      if (fire && onInput) onInput(v);
    };
    el.addEventListener("input", () => update(true));
    update(false);
    const get = () => Number(el.value);
    get.set = (v) => { el.value = v; update(true); };
    get.el = el;
    return get;
  };
  /**
   * 세그먼트 버튼: <div class="seg" id="mode"><button data-value="a" class="on">A</button>...</div>
   *   const mode = BB.seg('mode', v => redraw());  mode() → 현재 값
   */
  BB.seg = function (id, onChange) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    const btns = [...el.querySelectorAll("button")];
    let cur = (btns.find((b) => b.classList.contains("on")) || btns[0]).dataset.value;
    const set = (v, fire = true) => {
      cur = v;
      btns.forEach((b) => { const on = b.dataset.value === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      if (fire && onChange) onChange(v);
    };
    btns.forEach((b) => b.addEventListener("click", () => set(b.dataset.value)));
    set(cur, false);
    const get = () => cur;
    get.set = set;
    return get;
  };
  /**
   * 캔버스 위 끌기(마우스·터치). 좌표는 CSS px.
   *   BB.drag(cv.canvas, { start(x, y, e) {}, move(x, y, e) {}, end() {}, hover(x, y, e) {} });
   * 누르는 순간 start와 move가 한 번씩 불린다. 끄는 동안 페이지 스크롤은 막힌다.
   */
  BB.drag = function (canvas, on) {
    if (typeof canvas === "string") canvas = document.querySelector(canvas);
    canvas.classList.add("drag");
    let act = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener("pointerdown", (e) => { act = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const [x, y] = pos(e); if (on.start) on.start(x, y, e); if (on.move) on.move(x, y, e); e.preventDefault(); });
    canvas.addEventListener("pointermove", (e) => { const [x, y] = pos(e); if (act) { if (on.move) on.move(x, y, e); } else if (on.hover) on.hover(x, y, e); });
    const up = () => { if (act) { act = false; if (on.end) on.end(); } };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  };
  /** 통계 표시: BB.stat('snr', '32.1 dB') → id 요소의 textContent 설정(HTML 허용) */
  BB.stat = function (id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  /* ------------------------------------------------------------ bar / donut */
  /**
   * 막대(누적 가능) 그래프. BB.chart와 같은 축을 쓴다.
   *   BB.bars(ctx, box|null, { labels:["1월",...], stacks:[{label, color, data:[...]}, ...],
   *     y:[min,max](생략 시 자동), yFmt, yLabel, gap:0.28, hlines, highlight: 인덱스, valueFmt(합계 표시) })
   * 음수 값은 0 아래로 쌓는다. 반환: { X(i) 막대 중심 px, Y(v), box, bw(막대 폭) }
   */
  BB.bars = function (ctx, box, o) {
    const P = BB.palette();
    const n = o.labels.length, stacks = o.stacks;
    let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) {
      let p = 0, m = 0;
      stacks.forEach((s) => { const v = s.data[i] || 0; if (v >= 0) p += v; else m += v; });
      hi = Math.max(hi, p); lo = Math.min(lo, m);
    }
    const y = o.y || [lo * 1.08, hi * 1.08 || 1];
    const xLab = (o.labels.length > 14) ? Math.ceil(o.labels.length / 12) : 1;
    const c = BB.chart(ctx, box, { x: [0, n], y, yFmt: o.yFmt, yLabel: o.yLabel, xLabel: o.xLabel, xTicks: [], hlines: o.hlines });
    const B = c.box, slot = B.w / n, bw = slot * (1 - (o.gap == null ? 0.28 : o.gap));
    ctx.save();
    for (let i = 0; i < n; i++) {
      const cx = B.x + slot * (i + 0.5);
      let p = 0, m = 0;
      stacks.forEach((s, k) => {
        const v = s.data[i] || 0; if (!v) return;
        const a = v >= 0 ? p : m, b = a + v;
        if (v >= 0) p = b; else m = b;
        ctx.fillStyle = (typeof s.color === "function" ? s.color(i, v) : s.color) || P.series[k % P.series.length];
        if (o.highlight != null && o.highlight !== i) ctx.globalAlpha = 0.35;
        const y0 = c.Y(a), y1 = c.Y(b);
        ctx.fillRect(cx - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0)));
        ctx.globalAlpha = 1;
      });
      if (i % xLab === 0) {
        ctx.fillStyle = P.dim; ctx.font = BB.font(11); ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(o.labels[i], cx, B.y + B.h + 6);
      }
      if (o.valueFmt) {
        ctx.fillStyle = P.text; ctx.font = BB.font(11, true); ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(o.valueFmt(p + m, i), cx, c.Y(p) - 3);
      }
    }
    ctx.restore();
    return { X: (i) => B.x + slot * (i + 0.5), Y: c.Y, box: B, bw };
  };
  /**
   * 도넛(파이) 그래프. items:[{label, value, color}], 가운데 글자 center:{big, small}
   *   BB.donut(ctx, cx, cy, R, items, { inner:0.6, center:{big:"300만", small:"월 실수령"}, labels:true, highlight })
   * 반환: hit(x, y) → 마우스 위치의 항목 인덱스(없으면 -1)
   */
  BB.donut = function (ctx, cx, cy, R, items, o = {}) {
    const P = BB.palette();
    const total = items.reduce((s, it) => s + Math.max(0, it.value), 0) || 1;
    const inner = o.inner == null ? 0.6 : o.inner;
    let a = -Math.PI / 2;
    const arcs = [];
    ctx.save();
    items.forEach((it, i) => {
      const da = (Math.max(0, it.value) / total) * Math.PI * 2;
      const pop = o.highlight === i ? R * 0.06 : 0, mid = a + da / 2;
      const ox = Math.cos(mid) * pop, oy = Math.sin(mid) * pop;
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, R, a, a + da);
      ctx.arc(cx + ox, cy + oy, R * inner, a + da, a, true);
      ctx.closePath();
      ctx.fillStyle = it.color || P.series[i % P.series.length]; ctx.fill();
      ctx.strokeStyle = BB.color("canvas-bg"); ctx.lineWidth = 2; ctx.stroke();
      if (o.labels !== false && da > 0.32) {
        const rr = R * (1 + inner) / 2;
        ctx.fillStyle = "#fff"; ctx.font = BB.font(11, true, 600); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(Math.round((it.value / total) * 100) + "%", cx + ox + Math.cos(mid) * rr, cy + oy + Math.sin(mid) * rr);
      }
      arcs.push([a, a + da]);
      a += da;
    });
    if (o.center) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = P.text; ctx.font = BB.font(Math.max(14, R * 0.22), false, 800);
      ctx.fillText(o.center.big || "", cx, cy - (o.center.small ? R * 0.08 : 0));
      if (o.center.small) { ctx.fillStyle = P.dim; ctx.font = BB.font(Math.max(11, R * 0.11)); ctx.fillText(o.center.small, cx, cy + R * 0.16); }
    }
    ctx.restore();
    return {
      hit(x, y) {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        if (r > R * 1.06 || r < R * inner) return -1;
        let t = Math.atan2(dy, dx); if (t < -Math.PI / 2) t += Math.PI * 2;
        return arcs.findIndex(([s, e]) => t >= s && t < e);
      },
    };
  };

  /* ------------------------------------------------------------ layout build */
  const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="bbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="8" fill="url(#bbg)"/><circle cx="16" cy="7.6" r="2.6" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M16 10.4v12.2M11 13.6h10M12.2 16.4h7.6M12.8 19.2h6.4M16 22.6l-3.4 4.4M16 22.6l3.4 4.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const ICON_SIM = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>`;
  const ICON_GRID = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`;
  const ICON_MENU = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
  const ICON_MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const ICON_SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  function build() {
    const body = document.body;
    const root = body.dataset.root != null ? body.dataset.root : body.dataset.chapter ? "../" : "";
    const curSlug = body.dataset.chapter || "";
    const href = (slug) => (slug ? `${root}chapters/${slug}.html` : `${root}index.html`);

    // favicon
    if (!document.querySelector('link[rel="icon"]')) { const fi = document.createElement("link"); fi.rel = "icon"; fi.type = "image/svg+xml"; fi.href = root + "favicon.svg"; document.head.appendChild(fi); }

    // top bar
    const bar = document.createElement("header");
    bar.className = "bb-topbar";
    bar.innerHTML = `
      <button class="bb-btn icon" id="bb-menu" aria-label="챕터 목록">${ICON_MENU}</button>
      <a class="bb-logo" href="${href("")}">${LOGO}<span>AnatomyBook <small>몸의 구조</small></span></a>
      <span class="spacer"></span>
      <a class="bb-btn series-link" href="https://books.euiyun.com/" aria-label="전체 책 보기" title="전체 책 보기"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h6v14H4zM10 5.5h6v14h-6zM17 7l3-1 2 13-3 1z"/></svg><span>전체 책</span></a>
      <a class="bb-btn gal" href="${root}sims.html" aria-label="시뮬레이터 갤러리" title="시뮬레이터 갤러리">${ICON_GRID}<span class="lbl-wide">시뮬레이터</span></a>
      ${curSlug ? `<button class="bb-btn toggle" id="bb-simonly" aria-pressed="false" title="글을 숨기고 시뮬레이터만 본다">${ICON_SIM}<span class="lbl-wide">시뮬레이터만</span></button>` : ""}
      <button class="bb-btn icon" id="bb-theme" aria-label="테마 전환"></button>
      <div class="bb-progress" id="bb-progress"></div>`;
    const feedbackUrl = "https://books.euiyun.com/feedback.html?book=bodybook&page=" + encodeURIComponent(location.href);
    const feedbackButton = document.createElement("a");
    feedbackButton.className = "bb-btn icon feedback-button";
    feedbackButton.href = feedbackUrl;
    feedbackButton.target = "_blank";
    feedbackButton.rel = "noopener";
    feedbackButton.setAttribute("aria-label", "독자 의견 보내기");
    feedbackButton.title = "독자 의견 보내기";
    feedbackButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2z"/><path d="M8 9h8M8 13h5"/></svg>';
    bar.querySelector("#bb-theme").before(feedbackButton);
    body.prepend(bar);

    // Search chapter metadata immediately; load section and visual titles on demand.
    const progressBar = bar.querySelector("[id$='-progress']");
    const spacer = bar.querySelector(".spacer");
    const leftNav = document.createElement("div");
    leftNav.className = "book-nav-left";
    leftNav.append(bar.querySelector("[id$='-menu']"), bar.querySelector("a[class$='-logo']"));
    const rightNav = document.createElement("div");
    rightNav.className = "book-nav-right";
    [...bar.children].filter((el) => el !== spacer && el !== progressBar).forEach((el) => rightNav.appendChild(el));
    spacer.remove();
    const search = document.createElement("div");
    search.className = "book-search";
    search.innerHTML = '<svg class="book-search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="이 책의 챕터, 섹션, 시뮬레이터, 그림 검색" placeholder="이 책 검색" autocomplete="off"><div class="book-search-results" aria-live="polite"></div>';
    bar.prepend(leftNav);
    bar.insertBefore(search, progressBar);
    bar.insertBefore(rightNav, progressBar);
    const searchInput = search.querySelector("input");
    const searchResults = search.querySelector(".book-search-results");
    const closeSearch = () => { search.classList.remove("open"); searchResults.replaceChildren(); };
    let detailEntries = [];
    let detailsLoaded = false;
    let detailPromise;
    function loadDetails() {
      if (detailPromise) return detailPromise;
      detailPromise = Promise.all(CHAPTERS.map(async (chapter) => {
        try {
          const response = await fetch(href(chapter.slug));
          if (!response.ok) return [];
          const doc = new DOMParser().parseFromString(await response.text(), "text/html");
          const main = doc.querySelector("main.chapter");
          if (!main) return [];
          const entries = [];
          [...main.querySelectorAll("section > h2")].forEach((heading, i) => {
            entries.push({ type: "섹션", title: heading.textContent.trim(), chapter, hash: heading.parentElement.id || `s${i + 1}` });
          });
          [...main.querySelectorAll(".sim")].filter((sim) => sim.querySelector(".sim-head h3")).forEach((sim, i) => {
            entries.push({ type: "시뮬레이터", title: sim.querySelector(".sim-head h3").textContent.trim(), chapter, hash: sim.id || `search-sim-${i + 1}` });
          });
          [...main.querySelectorAll("figure")].filter((figure) => figure.querySelector("figcaption")).forEach((figure, i) => {
            const caption = figure.querySelector("figcaption").textContent.replace(/\s+/g, " ").trim();
            entries.push({ type: "그림", title: caption.slice(0, 140), chapter, hash: figure.id || `search-fig-${i + 1}` });
          });
          return entries;
        } catch (error) { return []; }
      })).then((parts) => { detailEntries = parts.flat(); detailsLoaded = true; renderSearch(); });
      return detailPromise;
    }
    function renderSearch() {
      const words = searchInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      searchResults.replaceChildren();
      if (!words.length) { closeSearch(); return; }
      const includesWords = (value) => words.every((word) => value.toLocaleLowerCase().includes(word));
      const chapterMatches = CHAPTERS.filter((c) => includesWords([c.num, c.title, c.desc, ...(c.tags || [])].join(" ")))
        .map((c) => ({ type: "챕터", title: c.title, chapter: c, hash: "" }));
      const detailMatches = detailEntries.filter((entry) => includesWords(entry.title));
      const matches = [
        ...chapterMatches.slice(0, 4),
        ...detailMatches.filter((entry) => entry.type === "섹션").slice(0, 5),
        ...detailMatches.filter((entry) => entry.type === "시뮬레이터").slice(0, 4),
        ...detailMatches.filter((entry) => entry.type === "그림").slice(0, 4),
      ];
      matches.forEach((entry) => {
        const link = document.createElement("a");
        link.href = href(entry.chapter.slug) + (entry.hash ? `#${entry.hash}` : "");
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const context = document.createElement("small");
        context.textContent = `${entry.chapter.num} · ${entry.chapter.title} · ${entry.type}`;
        link.append(title, context);
        searchResults.appendChild(link);
      });
      if (chapterMatches.length + detailMatches.length > matches.length) {
        const more = document.createElement("p");
        more.textContent = `상위 ${matches.length}개 표시 · 검색어를 더 구체적으로 입력해 보세요`;
        searchResults.appendChild(more);
      }
      if (detailPromise && !detailsLoaded) {
        const status = document.createElement("p");
        status.textContent = "섹션·시뮬레이터·그림 목록을 불러오는 중…";
        searchResults.appendChild(status);
      } else if (!matches.length) {
        const empty = document.createElement("p");
        empty.textContent = "검색 결과가 없습니다";
        searchResults.appendChild(empty);
      }
      search.classList.add("open");
    }
    searchInput.addEventListener("input", () => { if (searchInput.value.trim()) loadDetails(); renderSearch(); });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); searchInput.blur(); }
      else if (e.key === "ArrowDown") { const first = searchResults.querySelector("a"); if (first) { e.preventDefault(); first.focus(); } }
      else if (e.key === "Enter") { const first = searchResults.querySelector("a"); if (first) { e.preventDefault(); first.click(); } }
    });
    searchResults.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeSearch(); searchInput.focus(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const links = [...searchResults.querySelectorAll("a")];
        const next = links.indexOf(document.activeElement) + (e.key === "ArrowDown" ? 1 : -1);
        e.preventDefault();
        (links[next] || searchInput).focus();
      }
    });
    document.addEventListener("pointerdown", (e) => { if (!search.contains(e.target)) closeSearch(); });



    // drawer
    const drawer = document.createElement("nav");
    drawer.className = "bb-drawer";
    drawer.innerHTML = `<h4>Chapters</h4><ul class="bb-chlist">
      <li><a href="${href("")}" class="${curSlug ? "" : "active"}"><span class="num">00</span><span>홈 · 몸의 지도</span></a></li>
      <li><a href="${root}sims.html" class="${body.dataset.page === "sims" ? "active" : ""}"><span class="num">▦</span><span>시뮬레이터 갤러리</span></a></li>
      ${CHAPTERS.map((c) => `<li><a href="${href(c.slug)}" class="${c.slug === curSlug ? "active" : ""}"><span class="num">${c.num}</span><span>${c.title}</span></a></li>`).join("")}
    </ul>`;
    const backdrop = document.createElement("div");
    backdrop.className = "bb-drawer-backdrop";
    body.append(backdrop, drawer);
    const toggleDrawer = (o) => body.classList.toggle("drawer-open", o);
    bar.querySelector("#bb-menu").addEventListener("click", () => toggleDrawer(true));
    backdrop.addEventListener("click", () => toggleDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleDrawer(false); });

    // theme toggle
    const tbtn = bar.querySelector("#bb-theme");
    const setIcon = () => (tbtn.innerHTML = BB.isDark() ? ICON_SUN : ICON_MOON);
    setIcon();
    tbtn.addEventListener("click", () => {
      const next = BB.isDark() ? "light" : "dark";
      try { localStorage.setItem("medical-theme", next); } catch (e) {}
      applyTheme(next); setIcon();
    });

    // progress
    const prog = bar.querySelector("#bb-progress");
    const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%"; };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();

    // chapter page extras
    const main = document.querySelector("main.chapter");
    if (main) {
      // 몸의 계통 띠
      const curCh = CHAPTERS.find((c) => c.slug === curSlug);
      const hero = main.querySelector(".chapter-hero");
      if (hero && curCh && curCh.stage != null) {
        const first = (i) => CHAPTERS.find((c) => c.stage === i);
        const strip = document.createElement("nav");
        strip.className = "bb-stages";
        strip.setAttribute("aria-label", "몸의 계통");
        strip.innerHTML = STAGES.map((st, i) => `<a href="${href(first(i).slug)}" class="${i === curCh.stage ? "cur" : ""}"${i === curCh.stage ? ' aria-current="step"' : ""}><b>${st.name}</b><small>${st.en}</small></a>`).join("");
        hero.after(strip);
      }
      // 시뮬레이터만 보기
      const banner = document.createElement("div");
      banner.className = "sim-only-banner";
      banner.innerHTML = "시뮬레이터만 보는 중입니다. 설명을 함께 보려면 상단의 <b>시뮬레이터만</b> 버튼을 다시 누르세요.";
      if (hero) hero.appendChild(banner);
      const sbtn = bar.querySelector("#bb-simonly");
      // 버튼으로 켠 상태는 기억하고, 갤러리 링크(?sims=1)로 들어온 경우는 그 페이지에만 적용한다
      const setSimOnly = (on, persist) => {
        body.classList.toggle("sim-only", on);
        if (sbtn) sbtn.setAttribute("aria-pressed", on);
        if (persist) try { localStorage.setItem("bb-simonly", on ? "1" : ""); } catch (e) {}
        window.dispatchEvent(new Event("resize"));
      };
      let simOnly = /[?&]sims?=1/.test(location.search);
      try { if (!simOnly) simOnly = localStorage.getItem("bb-simonly") === "1"; } catch (e) {}
      setSimOnly(simOnly, false);
      if (sbtn) sbtn.addEventListener("click", () => setSimOnly(!body.classList.contains("sim-only"), true));
      // 시뮬레이터마다 바로가기 링크
      main.querySelectorAll(".sim[id] > .sim-head").forEach((h) => {
        const a = document.createElement("a");
        a.className = "sim-link"; a.href = "#" + h.parentElement.id; a.textContent = "#"; a.title = "이 시뮬레이터로 가는 링크";
        h.appendChild(a);
      });
      const flash = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t && t.classList.contains("sim")) { t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); } };
      addEventListener("hashchange", flash);
      setTimeout(() => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ block: "start" }); flash(); }, 250);
      // numbered h2 + TOC
      const layout = document.createElement("div");
      layout.className = "bb-layout";
      main.parentNode.insertBefore(layout, main);
      layout.appendChild(main);
      const toc = document.createElement("aside");
      toc.className = "bb-toc";
      const h2s = [...main.querySelectorAll("section > h2")];
      let n = 0;
      toc.innerHTML = "<h4>ON THIS PAGE</h4>" + h2s.map((h, i) => {
        const sec = h.parentElement;
        if (!sec.id) sec.id = "s" + (i + 1);
        const numbered = !sec.classList.contains("keypoints") && !sec.classList.contains("quiz-sec") && !sec.hasAttribute("data-nonum");
        if (numbered && !h.querySelector(".h-num")) { n++; h.insertAdjacentHTML("afterbegin", `<span class="h-num">${String(n).padStart(2, "0")}</span>`); }
        return `<a href="#${sec.id}">${h.textContent.replace(/^\d\d/, "").trim()}</a>`;
      }).join("");
      layout.appendChild(toc);
      const links = [...toc.querySelectorAll("a")];
      if (window.IntersectionObserver && h2s.length) {
        const io = new IntersectionObserver((es) => {
          es.forEach((e) => { if (e.isIntersecting) { links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); } });
        }, { rootMargin: "-20% 0px -70% 0px" });
        h2s.forEach((h) => io.observe(h.parentElement));
      }

      // pager
      const idx = CHAPTERS.findIndex((c) => c.slug === curSlug);
      const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
      const next = idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
      const pager = document.createElement("nav");
      pager.className = "bb-pager";
      pager.innerHTML =
        (prev ? `<a class="prev" href="${href(prev.slug)}"><small>← 이전 · ${prev.num}</small>${prev.title}</a>` : `<a class="prev" href="${href("")}"><small>← 처음으로</small>홈 · 몸의 지도</a>`) +
        (next ? `<a class="next" href="${href(next.slug)}"><small>다음 · ${next.num} →</small>${next.title}</a>` : "");
      layout.after(pager);
    }
    const foot = document.createElement("footer");
    foot.className = "bb-foot";
    foot.innerHTML = `AnatomyBook — 뼈, 근육, 장기, 뇌, 혈관. 몸의 구조를 실제 해부 데이터로 돌려 보고 잘라 보는 인터랙티브 교과서 · 3D 모델과 수치는 BodyParts3D(DBCLS, CC BY 4.0)의 성인 남성 한 사람 모델에서 나왔으며 의학적 진단의 근거가 아닙니다.<br>
      © 2026 geniuskey 및 AnatomyBook 기여자 · 콘텐츠 <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · 코드 <a href="${root}LICENSE-MIT">MIT</a> · <a href="${root}LICENSE.md">라이선스 안내</a>`;
    const feedbackLink = document.createElement("a");
    feedbackLink.href = feedbackUrl;
    feedbackLink.target = "_blank";
    feedbackLink.rel = "noopener";
    feedbackLink.textContent = "독자 의견";
    foot.append(" · ", feedbackLink);
    body.appendChild(foot);

    // quiz
    document.querySelectorAll(".quiz-q").forEach((q) => {
      const opts = [...q.querySelectorAll("button.opt")];
      opts.forEach((b) => b.addEventListener("click", () => {
        opts.forEach((o) => { o.disabled = true; if (o.hasAttribute("data-correct")) o.classList.add("right"); });
        if (!b.hasAttribute("data-correct")) b.classList.add("wrong");
        q.classList.add("done");
        q.dispatchEvent(new CustomEvent("answered", { bubbles: true, detail: { correct: b.hasAttribute("data-correct") } }));
      }));
    });

    // KaTeX
    const renderMath = () => {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }],
          throwOnError: false,
          ignoredClasses: ["no-math"],
        });
      }
    };
    if (window.renderMathInElement) renderMath();
    else window.addEventListener("load", renderMath);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

// Series glossary tooltips (same runtime across independently deployed books).
(function () {
  const base = new URL(".", document.currentScript.src);
  window.BOOK_GLOSSARY_CONFIG = { dataUrl: new URL("glossary-data.js", base).href };
  const script = document.createElement("script");
  script.src = new URL("glossary-tooltips.js", base).href;
  document.head.append(script);
})();
