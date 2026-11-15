// Start in 3D (Entscheidung 1, Linus 15.11.): die gewählte Rakete hebt in der 3D-Erdbasis ab, die Kamera folgt.
// Gleicher Ablauf wie der 2D-Start: Countdown, Zündung, Booster, Stufentrennung, Nasenkonus, Ausklappen.
// mode: 'ok' | 'explode' | 'heavy' | 'nofuel'. Ohne WebGL: false, dann läuft der 2D-Start.
import { earthWorld, hasWebGL } from './world3d.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAD = [-1.5, 0.35, -4.2];

// Rakete aus Zylindern nach ROCKET_LOOK: H (Höhe), w (Breite), fair (Nasenkonus), body (Farbe), boosters
function buildRocket(T, look) {
  const Ht = Math.max(1.6, look.H / 245 * 4.6), r = Math.max(0.12, look.w / 15 * 0.19);
  const col = new T.Color(look.body[0]), dark = new T.Color(look.body[1]);
  const mat = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1 });
  const g = new T.Group();
  const s1h = Ht * 0.6, s2h = Ht * 0.22, fh = Ht * 0.18, fr = Math.min(r * (look.fair || 1.15), r * 1.5);
  const stage1 = new T.Group();
  const b1 = new T.Mesh(new T.CylinderGeometry(r, r, s1h, 24), mat(col)); b1.position.y = s1h / 2; stage1.add(b1);
  const band = new T.Mesh(new T.CylinderGeometry(r * 1.01, r * 1.01, s1h * 0.06, 24), mat(dark)); band.position.y = s1h * 0.92; stage1.add(band);
  const bell = new T.Mesh(new T.CylinderGeometry(r * 0.55, r * 0.85, r * 0.9, 16, 1, true), mat(0x3a3836)); bell.position.y = -r * 0.4; stage1.add(bell);
  g.add(stage1);
  const boosters = [];
  if (look.boosters) {
    const n = look.boosters.w < 6 ? 6 : look.boosters.w === 9 && look.H === 170 ? 4 : 2, bh = Ht * (look.boosters.h || 0.4), br = Math.max(0.06, look.boosters.w / 15 * 0.19);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, bo = new T.Group();
      const m = new T.Mesh(new T.CylinderGeometry(br, br, bh, 16), mat(new T.Color(look.boosters.color[0]))); m.position.y = bh / 2; bo.add(m);
      const cone = new T.Mesh(new T.ConeGeometry(br, br * 2.2, 16), mat(new T.Color(look.boosters.color[0]))); cone.position.y = bh + br * 1.1; bo.add(cone);
      bo.position.set(Math.cos(a) * (r + br), 0, Math.sin(a) * (r + br)); g.add(bo); boosters.push(bo);
    }
  }
  const stage2 = new T.Group(); stage2.position.y = s1h;
  const b2 = new T.Mesh(new T.CylinderGeometry(r * 0.95, r * 0.95, s2h, 24), mat(col)); b2.position.y = s2h / 2; stage2.add(b2);
  // Nutzlast (Satellit mit eingeklappten Flügeln) unter zwei Hälften des Nasenkonus
  const payload = new T.Group(); payload.position.y = s2h + fh * 0.35;
  const bus = new T.Mesh(new T.BoxGeometry(fr * 0.9, fh * 0.45, fr * 0.9), new T.MeshStandardMaterial({ color: 0xe0c070, metalness: 0.4, roughness: 0.4 })); payload.add(bus);
  const wings = [-1, 1].map((sgn) => { const wg = new T.Mesh(new T.BoxGeometry(fr * 2.4, 0.02, fr * 0.8), new T.MeshStandardMaterial({ color: 0x2b3a6b, emissive: 0x0a1030, metalness: 0.5 })); wg.position.x = sgn * fr * 1.65; wg.scale.x = 0.01; payload.add(wg); return wg; });
  stage2.add(payload);
  const halves = [-1, 1].map((sgn) => {
    const h = new T.Group(); h.position.set(sgn * 0.001, s2h, 0);
    const shell = new T.Mesh(new T.CylinderGeometry(fr, fr, fh * 0.55, 24, 1, false, sgn > 0 ? 0 : Math.PI, Math.PI), mat(0xf5f3ee)); shell.position.y = fh * 0.275; h.add(shell);
    const tip = new T.Mesh(new T.ConeGeometry(fr, fh * 0.45, 24, 1, false, sgn > 0 ? 0 : Math.PI, Math.PI), mat(0xf5f3ee)); tip.position.y = fh * 0.55 + fh * 0.225; h.add(tip);
    stage2.add(h); return h;
  });
  g.add(stage2);
  // Flamme und Licht unter der aktiven Stufe
  const flame = new T.Mesh(new T.ConeGeometry(r * 0.75, r * 5, 16), new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9 }));
  flame.rotation.x = Math.PI; flame.position.y = -r * 3.2; flame.visible = false; stage1.add(flame);
  const flame2 = flame.clone(); flame2.material = flame.material.clone(); flame2.position.y = -r * 2.4; flame2.scale.setScalar(0.7); flame2.visible = false; stage2.add(flame2);
  const glow = new T.PointLight(0xffa040, 0, 12); glow.position.y = -r * 2; stage1.add(glow);
  return { g, stage1, stage2, boosters, halves, payload, wings, flame, flame2, glow, Ht, r };
}

export async function playLaunch3D(container, opts) {
  if (!hasWebGL()) return false;
  let T, built, planetMap;
  try { ({ T, built, planetMap } = await earthWorld()); } catch { return false; }
  if (!container.isConnected) return true;
  const scene = built.scene;
  scene.traverse((o) => { if (o.userData.padRocket) o.visible = false; }); // die Deko-Rakete weicht der echten
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.className = 'launch3d-canvas';
  const camera = new T.PerspectiveCamera(45, 1, 0.1, 800);
  const cap = Object.assign(document.createElement('div'), { className: 'launch3d-caption' });
  container.prepend(renderer.domElement, cap);
  const say = (text) => { if (text && cap.textContent !== text) { cap.textContent = text; cap.classList.remove('show'); void cap.offsetWidth; cap.classList.add('show'); } };

  const R = buildRocket(T, opts.look);
  R.g.position.set(...PAD); scene.add(R.g);
  // große Erde unter der Basis: wird beim Steigen sichtbar, der Boden blendet aus
  const earth = new T.Mesh(new T.SphereGeometry(400, 64, 48), new T.MeshStandardMaterial({ map: planetMap('earth'), roughness: 1 }));
  earth.position.set(0, -430, 0); earth.visible = false; scene.add(earth);
  const ground = []; scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry') ground.push(o); });
  const skyStart = scene.background.clone(), black = new T.Color(0x020208);
  // Rauch und Trümmer als einfache Teilchen
  const parts = [];
  const puff = (pos, color, size, life, vel) => {
    const m = new T.Mesh(new T.SphereGeometry(size, 8, 6), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    m.position.copy(pos); scene.add(m); parts.push({ m, born: now, life, vel: vel || new T.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.3, (Math.random() - 0.5) * 0.6) });
  };

  const fast = reduced();
  const COUNT = fast ? 300 : 3000, IGN = COUNT, LIFT = IGN + (fast ? 100 : 600);
  const SEP = { side: 1600, stage: 2600, fairing: 3500, cutoff: 4600, deploy: 4800, end: 7600 };
  const t0 = performance.now();
  let now = t0, beeps = 0, stopRumble = null, fell = [], exploded = false, done = false, loop = 0;
  const y0 = R.g.position.y;
  const finish = () => { if (done) return; done = true; cancelAnimationFrame(loop); stopRumble && stopRumble(); renderer.dispose(); opts.onDone(); };
  container.addEventListener('remove-launch', finish, { once: true });

  function frame(t) {
    if (!renderer.domElement.isConnected) { finish(); return; }
    now = t;
    const box = renderer.domElement.parentElement, w = box.clientWidth, h = box.clientHeight;
    if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const e = t - t0;
    // Countdown mit drei Pieptönen, der letzte lang
    if (e < COUNT && e >= beeps * 1000 && beeps < 3) { opts.beep(beeps === 2 ? 990 : 660, beeps === 2 ? 0.6 : 0.14); say(String(3 - beeps)); beeps += 1; }
    const fly = Math.max(0, e - LIFT) / 1000; // Sekunden seit dem Abheben
    if (e >= IGN && !stopRumble) { stopRumble = opts.rumble(9, opts.mode === 'nofuel'); R.flame.visible = true; say(''); }
    if (e >= IGN && !exploded && !fell.includes('s1')) { R.flame.scale.set(1 + Math.random() * 0.15, 1 + Math.random() * 0.25, 1); R.glow.intensity = 3 + Math.random(); if (fly < 1.2 && Math.random() < 0.7) puff(R.g.position.clone().add(new T.Vector3(0, 0.1, 0)), 0xd9d2c7, 0.25 + Math.random() * 0.25, 2500); }
    // Steigen: schneller werdend; zu schwer = kaum vom Fleck; kein Treibstoff = Motor geht aus
    const thrust = opts.mode === 'heavy' ? 0.25 : 1;
    let alt = 0.9 * thrust * fly * fly;
    if (opts.mode === 'nofuel' && fly > 2) { R.flame.visible = false; R.glow.intensity = 0; alt = 0.9 * 4 - Math.max(0, (fly - 2.6)) ** 2 * 1.5; say(opts.cap.nofuel); }
    if (opts.mode === 'heavy' && fly > 2.4) say(opts.cap.heavy);
    R.g.position.y = y0 + Math.max(0, alt);
    R.g.rotation.z = -Math.min(0.5, Math.max(0, fly - 2.5) * 0.12); // Neigung in die Bahn
    // Explosion kurz nach dem Abheben
    if (opts.mode === 'explode' && fly > 1.6 && !exploded) {
      exploded = true; opts.boom(); R.g.visible = false; say(opts.cap.explode);
      for (let i = 0; i < 70; i++) puff(R.g.position.clone().add(new T.Vector3(0, R.Ht * 0.4, 0)), i % 3 ? 0xff8a3a : 0x6b6560, 0.15 + Math.random() * 0.35, 1800 + Math.random() * 1200, new T.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.3) * 6, (Math.random() - 0.5) * 6));
    }
    if (opts.mode === 'ok') {
      const ms = fly * 1000;
      if (ms > SEP.side && R.boosters.length && !fell.includes('b')) { fell.push('b'); R.boosters.forEach((b) => drop(b)); }
      if (ms > SEP.stage && !fell.includes('s1')) { fell.push('s1'); R.flame.visible = false; R.glow.intensity = 0; drop(R.stage1); R.flame2.visible = true; say(opts.cap.stage); }
      if (ms > SEP.fairing && !fell.includes('f')) { fell.push('f'); say(opts.cap.fairing); }
      if (fell.includes('f')) R.halves.forEach((hv, i) => { const k = Math.min(1, (ms - SEP.fairing) / 900); hv.rotation.z = (i ? -1 : 1) * k * 1.2; hv.position.x = (i ? 1 : -1) * k * R.r * 3; });
      if (ms > SEP.cutoff) { R.flame2.visible = false; }
      if (ms > SEP.deploy) { const k = Math.min(1, (ms - SEP.deploy) / 900); R.wings.forEach((wg) => { wg.scale.x = Math.max(0.01, k); }); R.payload.position.y += 0.004; say(opts.cap.deploy); }
      if (ms > SEP.deploy + 1400) say(opts.cap.goal);
      if (ms > SEP.end) finish();
    } else if (fly > 5.5) finish();
    // Fallende Teile drehen sich weg
    for (const f of fallingParts) { f.v.y -= 0.012; f.o.position.add(f.v); f.o.rotation.x += 0.02; f.o.rotation.z += 0.015; }
    // Himmel wird schwarz, die Erde erscheint unter uns
    const k = Math.min(1, Math.max(0, alt - 6) / 30);
    scene.background = skyStart.clone().lerp(black, k); if (scene.fog) scene.fog.far = 70 + k * 600;
    earth.visible = k > 0.05; ground.forEach((gm) => { gm.material.transparent = true; gm.material.opacity = 1 - k; });
    // Kamera folgt: erst seitlich auf Höhe der Rampe, dann schräg darunter mit Blick nach oben
    const tgt = R.g.position.clone().add(new T.Vector3(0, R.Ht * 0.5, 0));
    const side = e < IGN ? 1 : Math.max(0.55, 1 - fly * 0.06);
    camera.position.set(tgt.x + 9 * side, Math.max(2.5, tgt.y - 1 + (exploded ? 3 : 0)), tgt.z + 12 * side);
    camera.lookAt(tgt);
    // Teilchen altern
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i], a = (t - p.born) / p.life; if (a >= 1) { scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); parts.splice(i, 1); continue; } p.m.position.addScaledVector(p.vel, 0.016); p.m.scale.setScalar(1 + a * 3); p.m.material.opacity = 0.8 * (1 - a); }
    for (const a of built.anims) a(t);
    renderer.render(scene, camera);
    loop = requestAnimationFrame(frame);
  }
  const fallingParts = [];
  function drop(obj) { // Teil löst sich: in Weltkoordinaten umhängen und fallen lassen
    const wp = new T.Vector3(); obj.getWorldPosition(wp); const wq = new T.Quaternion(); obj.getWorldQuaternion(wq);
    scene.attach(obj); obj.position.copy(wp); obj.quaternion.copy(wq);
    fallingParts.push({ o: obj, v: new T.Vector3((Math.random() - 0.5) * 0.04, 0.02, (Math.random() - 0.5) * 0.04) });
  }
  loop = requestAnimationFrame(frame);
  return true;
}
