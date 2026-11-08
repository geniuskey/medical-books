/* Copyright (c) 2026 geniuskey and AnatomyBook contributors.
   SPDX-License-Identifier: MIT — see ../LICENSE-MIT.
   3D 모델 데이터(assets/3d/*.glb)는 BodyParts3D(© The Database Center for Life Science, CC BY 4.0)에서 만들었다. */
/* ==========================================================================
   AnatomyBook — 3D 해부 모델 뷰어
   <div class="sim model3d" data-model="heart"> 안에 <model-viewer>(Google, Apache-2.0)를 띄운다.
   - 화면 가까이 왔을 때 model-viewer 모듈과 GLB를 불러온다(지연 로딩).
   - .model3d-parts의 버튼(data-part="재질 이름")으로 부위를 켜고 끈다. 색 칩은 모델에서 읽는다.
   - data-fade="a,b" 버튼은 그 부위를 반투명하게, data-rotate는 자동 회전, data-reset은 처음 시점.
   - 이동(pan): Shift·Ctrl·⌘·오른쪽 버튼으로 끌거나, data-pan 버튼을 켜고 끌면 시점 중심을 옮긴다.
     두 번 누르면 그 지점이 회전 중심이 된다.
   - 모델을 누르면 그 부위 이름(버튼 글자)을 .info-panel에 보여 준다.
   ========================================================================== */
(function () {
  "use strict";
  var MV_SRC = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js";
  var here = (document.currentScript && document.currentScript.src) || "";
  var BASE = here ? here.replace(/js\/anatomy3d\.js(\?.*)?$/, "assets/3d/") : "../assets/3d/";
  var loading = null;

  function loadViewer() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (window.customElements && customElements.get("model-viewer")) return resolve();
      var s = document.createElement("script");
      s.type = "module"; s.src = MV_SRC;
      s.onerror = function () { reject(new Error("model-viewer")); };
      document.head.appendChild(s);
      customElements.whenDefined("model-viewer").then(resolve);
    });
    return loading;
  }

  function lin2hex(c) {
    var h = "#";
    for (var i = 0; i < 3; i++) {
      var v = c[i] <= 0.0031308 ? c[i] * 12.92 : 1.055 * Math.pow(c[i], 1 / 2.4) - 0.055;
      h += ("0" + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2);
    }
    return h;
  }

  // model-viewer의 three.js 장면(공개 API에 없는 '보이기/숨기기'와 투명도 조절에만 쓴다)
  function threeScene(mv) {
    var syms = Object.getOwnPropertySymbols(mv);
    for (var i = 0; i < syms.length; i++) if (syms[i].description === "scene") return mv[syms[i]];
    return null;
  }
  function eachMesh(mv, name, fn) {
    var sc = threeScene(mv);
    if (!sc) return;
    sc.traverse(function (o) { if (o.isMesh && o.material && o.material.name === name) fn(o); });
    if (sc.queueRender) sc.queueRender();
  }

  function message(view, text) {
    var m = view.querySelector(".model3d-msg");
    if (!m) { m = document.createElement("div"); m.className = "model3d-msg"; view.appendChild(m); }
    m.textContent = text;
  }

  function setup(sim) {
    var view = sim.querySelector(".model3d-view");
    var name = sim.getAttribute("data-model");
    if (!view || !name || view.querySelector("model-viewer")) return;
    if (location.protocol === "file:") {
      message(view, "3D 모델은 웹 서버로 열었을 때 보인다(예: python -m http.server).");
      return;
    }
    message(view, "3D 모델을 불러오는 중…");
    loadViewer().then(function () {
      var mv = document.createElement("model-viewer");
      var orbit = sim.getAttribute("data-orbit") || "0deg 80deg auto";
      mv.setAttribute("src", BASE + name + ".glb");
      mv.setAttribute("alt", (sim.querySelector(".sim-head h3") || {}).textContent || "3D 해부 모델");
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("touch-action", "pan-y");
      mv.setAttribute("interaction-prompt", "none");
      mv.setAttribute("camera-orbit", orbit);
      mv.setAttribute("shadow-intensity", "0.6");
      mv.setAttribute("exposure", "1.05");
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("min-camera-orbit", "auto auto 5%");
      if (sim.hasAttribute("data-rotate")) mv.setAttribute("auto-rotate", "");
      view.insertBefore(mv, view.firstChild);
      mv.addEventListener("error", function () { message(view, "3D 모델을 불러오지 못했다. 네트워크를 확인하고 새로고침해 보자."); });
      mv.addEventListener("load", function () {
        var msg = view.querySelector(".model3d-msg");
        if (msg) msg.remove();
        wire(sim, mv, orbit);
      });
    }, function () { message(view, "3D 뷰어를 불러오지 못했다. 네트워크를 확인하고 새로고침해 보자."); });
  }

  function wire(sim, mv, orbit) {
    var labels = {};
    var mats = {};
    (mv.model ? mv.model.materials : []).forEach(function (m) { mats[m.name] = m; });
    sim.querySelectorAll("[data-part]").forEach(function (b) {
      var key = b.getAttribute("data-part"), m = mats[key];
      labels[key] = { label: b.textContent.trim(), note: b.getAttribute("title") || "" };
      if (m && !b.querySelector("i")) {
        var chip = document.createElement("i");
        chip.style.background = lin2hex(m.pbrMetallicRoughness.baseColorFactor);
        b.insertBefore(chip, b.firstChild);
      }
      b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        eachMesh(mv, key, function (o) { o.visible = on; });
      });
    });
    sim.querySelectorAll("[data-fade]").forEach(function (b) {
      var keys = b.getAttribute("data-fade").split(",");
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        keys.forEach(function (k) {
          eachMesh(mv, k, function (o) {
            var mt = o.material;
            if (mt.userData.bbOpacity === undefined) mt.userData.bbOpacity = [mt.opacity, mt.transparent, mt.depthWrite];
            var o0 = mt.userData.bbOpacity;
            mt.transparent = on ? true : o0[1];
            mt.opacity = on ? Math.min(o0[0], 0.22) : o0[0];
            mt.depthWrite = on ? false : o0[2];
            mt.needsUpdate = true;
          });
        });
      });
    });
    sim.querySelectorAll("[data-rotate]").forEach(function (b) {
      if (b === sim) return;
      b.setAttribute("aria-pressed", mv.hasAttribute("auto-rotate") ? "true" : "false");
      b.addEventListener("click", function () {
        var on = !mv.hasAttribute("auto-rotate");
        if (on) mv.setAttribute("auto-rotate", ""); else mv.removeAttribute("auto-rotate");
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
    sim.querySelectorAll("[data-reset]").forEach(function (b) {
      b.addEventListener("click", function () {
        mv.cameraOrbit = orbit; mv.cameraTarget = "auto auto auto"; mv.fieldOfView = "auto";
        mv.jumpCameraToGoal && mv.jumpCameraToGoal();
      });
    });
    wirePan(sim, mv);
    var info = sim.querySelector(".info-panel");
    if (info) {
      var downAt = null;
      mv.addEventListener("pointerdown", function (e) { downAt = [e.clientX, e.clientY]; });
      mv.addEventListener("pointerup", function (e) {
        if (!downAt || Math.abs(e.clientX - downAt[0]) + Math.abs(e.clientY - downAt[1]) > 6) return;
        var m = mv.materialFromPoint && mv.materialFromPoint(e.clientX, e.clientY);
        var l = m && labels[m.name];
        if (!l) return;
        info.textContent = "";
        var b = document.createElement("b"); b.textContent = l.label; info.appendChild(b);
        if (l.note) info.appendChild(document.createTextNode(" · " + l.note));
      });
    }
  }

  // 끌어서 시점 중심(cameraTarget)을 화면과 나란히 옮긴다. model-viewer의 내장 pan은
  // 오른쪽 끌기에만 걸려 있어 트랙패드·한 손가락으로는 쓸 수 없으므로 직접 처리한다.
  function wirePan(sim, mv) {
    var mode = false, drag = null;
    var btn = sim.querySelector("[data-pan]");
    function setMode(on) {
      mode = on;
      if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
      mv.style.touchAction = on ? "none" : "";
      mv.style.cursor = on ? "move" : "";
    }
    if (btn) { setMode(false); btn.addEventListener("click", function () { setMode(!mode); }); }

    mv.addEventListener("pointerdown", function (e) {
      var want = e.button === 2 || (e.button === 0 && (mode || e.shiftKey || e.ctrlKey || e.metaKey));
      if (!want || !e.isPrimary) return;
      e.stopPropagation(); e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { mv.setPointerCapture(e.pointerId); } catch (_) {}
    }, true);
    mv.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopPropagation();
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      var o = mv.getCameraOrbit(), t = mv.getCameraTarget();
      var fov = mv.getFieldOfView() * Math.PI / 180;
      var k = 2 * o.radius * Math.tan(fov / 2) / Math.max(1, mv.clientHeight);
      var st = Math.sin(o.theta), ct = Math.cos(o.theta), sp = Math.sin(o.phi), cp = Math.cos(o.phi);
      // 화면 오른쪽 = (cosθ, 0, −sinθ), 화면 위 = (−cosφ·sinθ, sinφ, −cosφ·cosθ)
      var x = t.x - k * (dx * ct + dy * cp * st);
      var y = t.y + k * dy * sp;
      var z = t.z + k * (dx * st - dy * cp * ct);
      mv.cameraTarget = x + "m " + y + "m " + z + "m";
      mv.jumpCameraToGoal && mv.jumpCameraToGoal();
    }, true);
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopPropagation();
      drag = null;
      try { mv.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    mv.addEventListener("pointerup", end, true);
    mv.addEventListener("pointercancel", end, true);
    mv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    mv.addEventListener("dblclick", function (e) {
      var hit = mv.positionAndNormalFromPoint && mv.positionAndNormalFromPoint(e.clientX, e.clientY);
      if (hit) mv.cameraTarget = hit.position.toString();
    });
  }

  function init() {
    var sims = document.querySelectorAll(".sim.model3d");
    if (!sims.length) return;
    if (!("IntersectionObserver" in window)) { sims.forEach(setup); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); setup(e.target); } });
    }, { rootMargin: "400px 0px" });
    sims.forEach(function (s) { io.observe(s); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
