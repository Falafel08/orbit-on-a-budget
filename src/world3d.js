// 3D-Welt der Basen (Linus 15.11.): Erde, Station, Mond, Mars als echte 3D-Landschaften.
// Kamerafahrt beim Betreten und zwischen den Levels, danach Kreisen und Zoomen. Gebäude sind anklickbar,
// Widgets (DOM) schweben über den Gebäuden. Modelle: Kenney Space Kit (CC0). Ohne WebGL: false, dann 2D-Basis.
import { ensureThree, stationModel } from './station3d.js';

let T = null, GLTFLoader = null, Orbit = null, W = null;
const models = new Map();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

async function load() {
  if (T) return;
  T = await ensureThree();
  ({ GLTFLoader } = await import('../assets/vendor/three/GLTFLoader.js'));
  ({ OrbitControls: Orbit } = await import('../assets/vendor/three/OrbitControls.js'));
}

// Kenney-Modell laden, auf eine Breite skalieren, auf den Boden stellen
async function model(name, size) {
  if (!models.has(name)) models.set(name, new GLTFLoader().loadAsync(`assets/kenney3d/${name}.glb`).then((g) => g.scene));
  const m = (await models.get(name)).clone(true);
  m.traverse((o) => { // Kenney nutzt viel Metall; ohne Spiegelungen wirkt das stumpf grau, darum matter und heller
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.material.metalness > 0.3) { o.material.metalness = 0.15; o.material.roughness = Math.max(0.45, o.material.roughness); }
  });
  const s = new T.Box3().setFromObject(m).getSize(new T.Vector3());
  m.scale.setScalar(size / Math.max(s.x, s.z, 0.001));
  const b = new T.Box3().setFromObject(m);
  m.position.y -= b.min.y;
  const g = new T.Group(); g.add(m);
  return g;
}
async function place(scene, name, size, x, z, rot = 0, id = null) {
  const g = await model(name, size);
  g.position.set(x, 0, z); g.rotation.y = rot;
  if (id) g.userData.building = id;
  scene.add(g);
  return g;
}

function stars(scene, n = 900, r = 140) {
  const geo = new T.BufferGeometry(), pts = [];
  for (let i = 0; i < n; i++) { const v = new T.Vector3().randomDirection().multiplyScalar(r); if (v.y > -10) pts.push(v.x, v.y, v.z); }
  geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  scene.add(new T.Points(geo, new T.PointsMaterial({ color: 0xf5efe6, size: 0.5 })));
}

// Hügeliges Gelände für Mond und Mars: Summe von Wellen, flach schattiert, in der Mitte eben für die Basis
function terrain(color, rough) {
  const geo = new T.PlaneGeometry(70, 70, 90, 90);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), d = Math.hypot(x, y);
    const h = (Math.sin(x * 0.35) * Math.cos(y * 0.28) * 0.9 + Math.sin(x * 0.9 + y * 0.6) * 0.35 + Math.sin(x * 2.1 - y * 1.7) * 0.12) * rough;
    p.setZ(i, h * Math.min(1, Math.max(0, (d - 7) / 6)) - Math.max(0, d - 30) * 0.4);
  }
  geo.computeVertexNormals();
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function lights(scene, sunColor = 0xfff3e0, amb = 0.55) {
  scene.add(new T.HemisphereLight(0xcfe2ff, 0x3a3028, amb * 1.6));
  scene.add(new T.AmbientLight(0xffffff, amb * 0.4));
  const sun = new T.DirectionalLight(sunColor, 1.7); sun.position.set(10, 16, 6); scene.add(sun);
}

// ---------- die vier Orte ----------
async function earthScene() {
  const s = new T.Scene();
  s.background = new T.Color(0x1d2c4a); s.fog = new T.Fog(0x1d2c4a, 30, 70);
  lights(s, 0xffe8c8, 0.65);
  const ground = new T.Mesh(new T.CircleGeometry(40, 64), new T.MeshStandardMaterial({ color: 0x2c5a2e, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; s.add(ground);
  const pad = new T.Mesh(new T.CircleGeometry(9, 48), new T.MeshStandardMaterial({ color: 0x6b6760, roughness: 0.9 }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.01; s.add(pad);
  stars(s, 300);
  await place(s, 'hangar_largeA', 4, -4.2, 1.8, 0.5, 'hall');
  await place(s, 'hangar_smallA', 2.8, 3.4, -2.8, -0.4, 'control');
  const dish = await place(s, 'satelliteDish_large', 1.8, 5.2, -1.2, 2.4, 'control');
  await place(s, 'hangar_roundGlass', 3, 3.8, 2.8, 0, 'lab');
  await place(s, 'platform_large', 3, -1.5, -4.2, 0, 'pad');
  // Rakete auf der Rampe aus Kenney-Teilen gestapelt
  let y = 0.35;
  for (const [part, sz] of [['rocket_finsA', 1.3], ['rocket_fuelA', 0.9], ['rocket_fuelA', 0.9], ['rocket_topA', 0.9]]) {
    const g = await model(part, sz); g.position.set(-1.5, y, -4.2); g.userData.building = 'pad'; s.add(g);
    y += new T.Box3().setFromObject(g).getSize(new T.Vector3()).y * 0.98;
  }
  await place(s, 'machine_generatorLarge', 1.4, -5.6, -2.4);
  await place(s, 'barrels', 1, -6.4, -0.8);
  await place(s, 'machine_wireless', 1, 6.4, 0.6);
  const rover = await place(s, 'rover', 1.1, 0, 6);
  return { scene: s, anims: [(t) => { const a = t / 6000; rover.position.set(Math.sin(a) * 6.5, 0, Math.cos(a) * 6.5); rover.rotation.y = a + Math.PI / 2; dish.rotation.y = 2.4 + Math.sin(t / 3000) * 0.4; }], radius: 18, height: 11 };
}

async function stationScene(station) {
  const s = new T.Scene();
  s.background = new T.Color(0x05040a);
  lights(s, 0xfff3e0, 0.5); stars(s, 1000);
  const earth = new T.Mesh(new T.SphereGeometry(70, 64, 48), new T.MeshStandardMaterial({ color: 0x2d6cb0, emissive: 0x0b2240, roughness: 0.9 }));
  earth.position.set(0, -82, -30); s.add(earth);
  const atm = new T.Mesh(new T.SphereGeometry(71.5, 64, 48), new T.MeshBasicMaterial({ color: 0x8cc8ff, transparent: true, opacity: 0.12 }));
  atm.position.copy(earth.position); s.add(atm);
  // Noch nichts gebaut: das Kernmodul als durchscheinender Geist zeigt, was kommt
  const empty = !station || !station.modules.length;
  const st = stationModel(empty ? { modules: [{ x: 2, y: 2, type: 'core', axis: null }] } : station); s.add(st);
  if (empty) st.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.28; o.material.depthWrite = false; } });
  // Anker für die Widgets: Kern = Leitstand, Labor = Labor, Knoten oder Kern = Andockstelle
  const anchor = (id, x, y, z) => { const a = new T.Object3D(); a.position.set(x, y, z); a.userData.building = id; s.add(a); };
  anchor('control', 0, 1.2, 0); anchor('lab', 2, 1.2, 0); anchor('pad', 0, 1.2, -2);
  return { scene: s, anims: [(t) => { st.rotation.y = t / 40000; earth.rotation.y = t / 90000; }], radius: 13, height: 6 };
}

async function moonScene(mars = false) {
  const s = new T.Scene();
  s.background = new T.Color(mars ? 0x2a120c : 0x030308);
  if (mars) s.fog = new T.Fog(0x5a2a1a, 25, 60);
  lights(s, mars ? 0xffd2b0 : 0xffffff, mars ? 0.6 : 0.35);
  if (!mars) stars(s, 900);
  s.add(terrain(mars ? 0xb5532d : 0x8c8a86, mars ? 1.4 : 1.1));
  if (!mars) { // die Erde am Mondhimmel
    const earth = new T.Mesh(new T.SphereGeometry(3.5, 48, 32), new T.MeshStandardMaterial({ color: 0x3a7bd5, emissive: 0x10305a }));
    earth.position.set(-14, 16, -40); s.add(earth);
  }
  await place(s, mars ? 'hangar_roundA' : 'hangar_roundA', 3, 3.4, -2.6, 0, 'control');
  await place(s, 'hangar_roundGlass', 3, 4, 2.6, 0, 'lab');
  await place(s, 'platform_large', 3.2, -3, -1, 0, 'pad');
  await place(s, 'craft_cargoA', 2.4, -3, -1, 0.6, 'pad');
  for (const [n, sz, x, z] of [['craterLarge', 5, -9, 6], ['crater', 3, 8, -8], ['crater', 2.4, -7, -9], ['rock_largeA', 1.6, 9, 5], ['rock_largeB', 1.4, -10, -3], ['rocks_smallA', 1.2, 6, 7], ['rocks_smallB', 1, -5, 7]]) await place(s, n, sz, x, z, Math.random() * 6);
  if (mars) for (const [x, z] of [[10, -2], [-8, 9]]) await place(s, 'rock_crystalsLargeA', 1.6, x, z, Math.random() * 6);
  const rover = await place(s, 'rover', 1.1, 0, 6);
  await place(s, 'astronautB', 0.7, 1.6, 0.8, 2);
  return { scene: s, anims: [(t) => { const a = -t / 7000; rover.position.set(Math.sin(a) * 6, 0, Math.cos(a) * 6); rover.rotation.y = a - Math.PI / 2; }], radius: 16, height: 8 };
}

// ---------- Renderer, Kamera, Steuerung ----------
function ensureWorld() {
  if (W) return W;
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.className = 'world-canvas';
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 500);
  const controls = new Orbit(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 8, maxDistance: 28, minPolarAngle: 0.35, maxPolarAngle: 1.32, rotateSpeed: 0.6 });
  W = { renderer, camera, controls, raycaster: new T.Raycaster(), scene: null, anims: [], widgets: [], flying: null, loop: 0, key: null, down: null };
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { W.down = [e.clientX, e.clientY]; if (W.flying) W.flying.skip = true; });
  el.addEventListener('pointerup', (e) => { // Klick ohne Ziehen: Gebäude öffnen
    if (!W.down || Math.hypot(e.clientX - W.down[0], e.clientY - W.down[1]) > 5 || !W.onBuilding) return;
    const id = pick(e); if (id) W.onBuilding(id);
  });
  el.addEventListener('pointermove', (e) => { el.style.cursor = !W.flying && pick(e) ? 'pointer' : 'grab'; });
  return W;
}

function pick(e) {
  const r = W.renderer.domElement.getBoundingClientRect();
  W.raycaster.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), W.camera);
  for (const hit of W.raycaster.intersectObjects(W.scene.children, true)) {
    let o = hit.object; while (o && !o.userData.building) o = o.parent;
    if (o) return o.userData.building;
  }
  return null;
}

function orbitPos(info, angle, scale = 1) { return new T.Vector3(Math.sin(angle) * info.radius * scale, info.height * scale, Math.cos(angle) * info.radius * scale); }

// Kamerafahrt: von oben auf die Basis, dann auf dem Kreis zur schrägen Seitenansicht
function flyIntro(info, full) {
  const end = orbitPos(info, 0.85);
  if (reduced()) { W.camera.position.copy(end); return; }
  const start = full ? new T.Vector3(0.01, info.radius * 2.2, 0.01) : orbitPos(info, 0.6, 1.5);
  const dur = full ? 3400 : 1000, t0 = performance.now();
  W.flying = { step(t) {
    const k = this.skip ? 1 : Math.min(1, (t - t0) / dur), e = ease(k);
    if (full) { // Höhe sinkt, Winkel läuft am Kreis entlang
      const a = 0.85 * e - 1.2 * (1 - e), r = info.radius * (0.15 + 0.85 * e), h = start.y + (end.y - start.y) * e;
      W.camera.position.set(Math.sin(a) * r, h, Math.cos(a) * r);
    } else W.camera.position.lerpVectors(start, end, e);
    return k < 1;
  } };
}

// Levelwechsel: alte Welt verlassen (aufsteigen, Blende), neue Welt anfliegen
function flyTransition(fade, fromInfo, toInfo, swap, color) {
  if (reduced()) { swap(); W.camera.position.copy(orbitPos(toInfo, 0.85)); return; }
  const t0 = performance.now(), a = 1400, b = 2600;
  const p0 = W.camera.position.clone();
  let swapped = false;
  fade.style.background = color;
  W.flying = { step(t) {
    const k = this.skip ? 1 : (t - t0) / (a + b);
    if (!swapped) {
      const e = ease(Math.min(1, (t - t0) / a));
      W.camera.position.set(p0.x * (1 - e * 0.5), p0.y + e * 40, p0.z * (1 - e * 0.5));
      fade.style.opacity = String(e);
      if (t - t0 >= a || this.skip) { swapped = true; swap(); }
      return true;
    }
    const e = ease(Math.min(1, (t - t0 - a) / b));
    const from = orbitPos(toInfo, -0.6, 4), to = orbitPos(toInfo, 0.85);
    W.camera.position.lerpVectors(from, to, this.skip ? 1 : e);
    fade.style.opacity = String(this.skip ? 0 : 1 - Math.min(1, e * 1.6));
    return k < 1 && !this.skip;
  } };
}

function frame(t) {
  if (!W.renderer.domElement.isConnected) { W.loop = 0; return; }
  const box = W.renderer.domElement.parentElement, w = box.clientWidth, h = box.clientHeight;
  if (W.w !== w || W.h !== h) { W.renderer.setSize(w, h, false); W.camera.aspect = w / Math.max(1, h); W.camera.updateProjectionMatrix(); W.w = w; W.h = h; }
  // Umgebung: langsam kreisen; die Station (niedrige Höhe) weit weg, damit sie nicht hinter den Karten hervorschaut
  if (W.ambient && !W.flying) { W.ambientAngle = (W.ambientAngle || 0.85) + (reduced() ? 0 : 0.0006); W.camera.position.copy(orbitPos(W.info, W.ambientAngle, W.info.height < 7 ? 3.2 : 1.7)); W.camera.position.y *= 0.55; W.camera.lookAt(0, 0, 0); }
  else if (W.flying) { W.controls.enabled = false; if (!W.flying.step(t)) { W.flying = null; W.controls.enabled = true; } W.camera.lookAt(0, 0, 0); }
  else W.controls.update();
  for (const a of W.anims) a(t);
  W.renderer.render(W.scene, W.camera);
  placeWidgets(w, h);
  W.loop = requestAnimationFrame(frame);
}

// Widgets folgen ihrem Gebäude auf dem Bildschirm, hinter der Kamera werden sie ausgeblendet
function placeWidgets(w, h) {
  const v = new T.Vector3();
  for (const wd of W.widgets) {
    if (!wd.target) continue;
    const box = new T.Box3().setFromObject(wd.target);
    if (box.isEmpty()) wd.target.getWorldPosition(v); // unsichtbarer Anker (Station)
    else { box.getCenter(v); v.y = box.max.y + 0.3; }
    v.project(W.camera);
    const hidden = v.z > 1 || W.flying;
    wd.el.classList.toggle('off', !!hidden);
    wd.el.style.transform = `translate(${Math.round((v.x * 0.5 + 0.5) * w)}px, ${Math.round((-v.y * 0.5 + 0.5) * h)}px) translate(-50%, -100%)`;
  }
}

const sceneFor = (level, station) => (level === 1 ? earthScene() : level === 2 ? stationScene(station) : moonScene(level === 4));
const FADE = { 2: '#dfefff', 3: '#000', 4: '#000', 1: '#000' }; // Erde → Station: durch die Wolken (hell), sonst ins Dunkel

// Welt zeigen. opts: level, station, widgets [{ building, el }], onBuilding(id), flight: 'intro' | 'short' | { from }
export async function showWorld(container, opts) {
  if (!hasWebGL()) return false;
  try { await load(); } catch { return false; }
  if (!container.isConnected) return true;
  const w = ensureWorld();
  const fade = Object.assign(document.createElement('div'), { className: 'world-fade' });
  container.replaceChildren(w.renderer.domElement, fade, ...opts.widgets.map((x) => x.el));
  w.onBuilding = opts.onBuilding;
  w.ambient = !!opts.ambient; w.controls.enabled = !opts.ambient;
  const key = `${opts.level}|${opts.station ? opts.station.modules.length + ':' + opts.station.crew : ''}`;
  const attach = (built) => {
    w.scene = built.scene; w.anims = built.anims; w.info = built; w.key = key;
    w.widgets = opts.widgets.map((x) => { let target = null; built.scene.traverse((o) => { if (!target && o.userData.building === x.building) target = o; }); return { ...x, target }; });
  };
  const prevInfo = w.info;
  const built = w.key === key && w.scene ? { scene: w.scene, anims: w.anims, radius: w.info.radius, height: w.info.height } : await sceneFor(opts.level, opts.station);
  if (opts.flight && opts.flight.from && prevInfo && w.scene) flyTransition(fade, prevInfo, built, () => attach(built), FADE[opts.level]);
  else { attach(built); if (opts.flight) flyIntro(built, opts.flight === 'intro'); else if (!w.flying && w.camera.position.lengthSq() === 0) w.camera.position.copy(orbitPos(built, 0.85)); }
  if (!w.loop) w.loop = requestAnimationFrame(frame);
  return true;
}
