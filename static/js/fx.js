/* NetShield visual effects: 3D network background (three.js, with a 2D fallback), cursor effects, 3D card tilt.
   Switch everything off with the sparkle button in the header (remembered), or with the system's "reduce motion" setting. */
(function () {
  "use strict";
  const body = document.body;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, touch = matchMedia("(hover: none)").matches;
  if (localStorage.getItem("ns_fx") === "off" || reduce) body.classList.add("fx-off");
  const fxOn = () => !body.classList.contains("fx-off");
  const btn = document.getElementById("fxBtn");
  if (btn) {
    btn.setAttribute("aria-pressed", fxOn());
    btn.onclick = () => { body.classList.toggle("fx-off"); localStorage.setItem("ns_fx", fxOn() ? "on" : "off"); btn.setAttribute("aria-pressed", fxOn()); };
  }

  // ---- background video: plays only while effects are on and the tab is visible ----
  const vid = document.getElementById("bgvideo");
  if (vid) {
    const sync = () => { if (fxOn() && !document.hidden) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); } else vid.pause(); };
    new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", sync); sync();
  }

  // ---- progress bar while the page talks to the server (app.js calls fxBusy) ----
  const bar = document.getElementById("topbar"); let busy = 0, hideT;
  window.fxBusy = d => {
    busy = Math.max(0, busy + d); if (!bar) return; clearTimeout(hideT);
    if (busy > 0) { bar.style.opacity = 1; bar.style.width = "72%"; }
    else { bar.style.width = "100%"; hideT = setTimeout(() => { bar.style.opacity = 0; setTimeout(() => bar.style.width = "0", 350); }, 250); }
  };

  // ---- mouse position (-1..1) shared by the background and the cursor ----
  const mouse = { x: 0, y: 0 };
  addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  let live = false;
  new MutationObserver(() => { live = body.classList.contains("live-on"); }).observe(body, { attributes: true, attributeFilter: ["class"] });

  // ---- background: a slowly turning 3D network; red dots are "threats"; it speeds up while live tracking runs ----
  const cv = document.getElementById("bg3d"), N = touch ? 55 : 110;
  function webglOK() { try { return !!document.createElement("canvas").getContext("webgl"); } catch (e) { return false; } }

  function start3d() {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.1, 200); cam.position.z = 42;
    const group = new THREE.Group(); scene.add(group);
    const S = 34, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) { pos[i] = (Math.random() - 0.5) * S * 2; vel[i] = (Math.random() - 0.5) * 0.6; }
    const c2 = document.createElement("canvas"); c2.width = c2.height = 64;
    const g = c2.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(140,190,255,.8)"); gr.addColorStop(1, "rgba(59,130,246,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c2);
    const glow = (size, color) => new THREE.PointsMaterial({ size, map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    group.add(new THREE.Points(pg, glow(2.2, 0x7fb4ff)));
    const MAXL = N * 6, lp = new Float32Array(MAXL * 6), lc = new Float32Array(MAXL * 6), lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
    group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
    const RN = 6, rp = new Float32Array(RN * 3), rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    const redMat = glow(3.6, 0xff5a5a); group.add(new THREE.Points(rg, redMat));
    let time = 0;
    return {
      resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); },
      render(dt) {
        time += dt; const sp = live ? 2.2 : 1;
        for (let i = 0; i < N * 3; i++) { pos[i] += vel[i] * dt * sp; if (pos[i] > S || pos[i] < -S) vel[i] *= -1; }
        let n = 0; const R = 13, R2 = R * R;
        for (let i = 0; i < N && n < MAXL; i++) for (let j = i + 1; j < N && n < MAXL; j++) {
          const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < R2) {
            const a = 1 - Math.sqrt(d2) / R, o = n * 6;
            lp[o] = pos[i * 3]; lp[o + 1] = pos[i * 3 + 1]; lp[o + 2] = pos[i * 3 + 2]; lp[o + 3] = pos[j * 3]; lp[o + 4] = pos[j * 3 + 1]; lp[o + 5] = pos[j * 3 + 2];
            lc[o] = lc[o + 3] = 0.15 * a; lc[o + 1] = lc[o + 4] = 0.5 * a; lc[o + 2] = lc[o + 5] = 0.95 * a; n++;
          }
        }
        lg.setDrawRange(0, n * 2); lg.attributes.position.needsUpdate = true; lg.attributes.color.needsUpdate = true; pg.attributes.position.needsUpdate = true;
        for (let i = 0; i < RN; i++) { rp[i * 3] = pos[i * 9]; rp[i * 3 + 1] = pos[i * 9 + 1]; rp[i * 3 + 2] = pos[i * 9 + 2]; }
        rg.attributes.position.needsUpdate = true; redMat.size = (live ? 5 : 3.6) + Math.sin(time * 3) * (live ? 1.4 : 0.8);
        group.rotation.y += dt * 0.06 * sp; group.rotation.x = Math.sin(time * 0.1) * 0.15;
        cam.position.x += (mouse.x * 7 - cam.position.x) * 0.04; cam.position.y += (-mouse.y * 5 - cam.position.y) * 0.04; cam.lookAt(0, 0, 0);
        renderer.render(scene, cam);
      }
    };
  }

  function start2d() {   // same idea on a plain canvas: used when three.js or WebGL is not available
    const ctx = cv.getContext("2d"), P = Array.from({ length: touch ? 40 : 80 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02, r: Math.random() < 0.06 }));
    let W, H; const resize = () => { const d = Math.min(devicePixelRatio, 1.5); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; }; resize();
    return {
      resize,
      render(dt) {
        ctx.clearRect(0, 0, W, H); const sp = live ? 2.2 : 1, mx = (mouse.x + 1) / 2, my = (mouse.y + 1) / 2, L = 0.26 * Math.min(W, H);
        for (const p of P) { p.x += p.vx * dt * sp * 8; p.y += p.vy * dt * sp * 8; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1; }
        for (let i = 0; i < P.length; i++) {
          const a = P[i];
          for (let j = i + 1; j < P.length; j++) {
            const b = P[j], d = Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
            if (d < L) { ctx.strokeStyle = `rgba(80,150,255,${(1 - d / L) * 0.35})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke(); }
          }
          const dm = Math.hypot((a.x - mx) * W, (a.y - my) * H);
          if (dm < 190) { ctx.strokeStyle = `rgba(34,211,238,${(1 - dm / 190) * 0.5})`; ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(mx * W, my * H); ctx.stroke(); }
          ctx.fillStyle = a.r ? "rgba(255,90,90,.9)" : "rgba(140,190,255,.85)"; ctx.beginPath(); ctx.arc(a.x * W, a.y * H, a.r ? 3.2 : 1.8, 0, 6.283); ctx.fill();
        }
      }
    };
  }

  if (cv) {
    let engine;
    try { engine = window.THREE && webglOK() ? start3d() : start2d(); }
    catch (e) { console.warn("3D background unavailable, using the 2D version:", e); engine = start2d(); }
    engine.resize(); addEventListener("resize", () => engine.resize());
    let last = performance.now(), acc = 0;
    (function frame(t) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000); last = t; acc += dt;
      if (document.hidden || !fxOn() || acc < 1 / 40) return;          // paused when hidden or switched off; about 40 frames a second
      try { engine.render(acc); } catch (e) { console.warn("background stopped:", e); engine = { render() {}, resize() {} }; }
      acc = 0;
    })(last);
  }

  // ---- cursor: glowing ring, sparkle trail, click ripple, card spotlight ----
  if (!touch) {
    const ring = document.getElementById("cur-ring"); let mx = -100, my = -100, rx = -100, ry = -100, lastSpark = 0;
    addEventListener("pointermove", e => {
      mx = e.clientX; my = e.clientY; if (ring) ring.classList.add("on");
      const card = e.target.closest && e.target.closest(".card");
      if (card) { const r = card.getBoundingClientRect(); card.style.setProperty("--mx", (e.clientX - r.left) + "px"); card.style.setProperty("--my", (e.clientY - r.top) + "px"); }
      const now = performance.now();
      if (fxOn() && now - lastSpark > 38 && document.querySelectorAll(".spark").length < 22) {
        lastSpark = now; const s = document.createElement("i"); s.className = "spark"; s.style.left = mx + "px"; s.style.top = my + "px";
        s.addEventListener("animationend", () => s.remove()); document.body.appendChild(s);
      }
    }, { passive: true });
    document.addEventListener("pointerover", e => { if (ring) ring.classList.toggle("hot", !!(e.target.closest && e.target.closest("a,button,select,input,textarea,tr[data-i],label"))); });
    document.addEventListener("pointerleave", () => ring && ring.classList.remove("on"));
    addEventListener("pointerdown", e => {
      if (!fxOn()) return; const r = document.createElement("i"); r.className = "ripple"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
      r.addEventListener("animationend", () => r.remove()); document.body.appendChild(r);
    });
    (function follow() { requestAnimationFrame(follow); rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; if (ring && fxOn()) ring.style.transform = `translate(${rx}px,${ry}px)`; })();

    // ---- 3D tilt on small cards (not on cards with tables, charts or form fields) ----
    document.querySelectorAll(".card").forEach(c => {
      if (!c.classList.contains("k") && c.querySelector("table,input,select,canvas,textarea,button")) return;
      c.classList.add("tilt");
      c.addEventListener("pointermove", e => {
        if (!fxOn()) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(800px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg) translateZ(6px)`;
      });
      c.addEventListener("pointerleave", () => { c.style.transform = ""; });
    });
  }
})();
