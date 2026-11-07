#!/usr/bin/env python3
# Copyright (c) 2026 geniuskey and BodyBook contributors. MIT (see ../LICENSE-MIT).
"""시뮬레이터·그림 스크린샷 (playwright 필요).

장 하나의 div.sim 과 figure.diagram 을 하나씩 찍어 폴더에 저장한다. 눈으로 점검할 때 쓴다.
실행: python3 tools/shots.py <slug> [폴더] [--narrow] [--dark]
      (폴더 기본값: /tmp/bodybook-shots/<slug>, --narrow 는 폭 380px)
"""
import sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
slug = args[0]
out = pathlib.Path(args[1] if len(args) > 1 else f"/tmp/bodybook-shots/{slug}")
out.mkdir(parents=True, exist_ok=True)
w = 380 if "--narrow" in sys.argv else 1100
dark = "--dark" in sys.argv
f = ROOT / ("index.html" if slug == "index" else f"chapters/{slug}.html")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": w, "height": 1000}, color_scheme="dark" if dark else "light")
    pg.on("pageerror", lambda e: print("ERR", e.message))
    pg.goto(f.as_uri()); pg.wait_for_timeout(1200)
    els = pg.locator("div.sim, figure.diagram")
    n = els.count()
    for i in range(n):
        el = els.nth(i); el.scroll_into_view_if_needed(); pg.wait_for_timeout(700)
        name = el.get_attribute("id") or f"fig{i}"
        el.screenshot(path=str(out / f"{i:02d}-{name}{'-n' if w < 500 else ''}{'-d' if dark else ''}.png"))
    print(n, "shots →", out)
    b.close()
