// Level 2: deine Station in 3D, schräg von oben (Linus 15.11.). Three.js liegt im Repo (CSP, keine fremden Skripte).
// Ein Renderer für alles: render() baut die Seite oft neu, eine neue WebGL-Szene pro Klick wäre zu teuer.
// Ohne WebGL gibt showStation3D false zurück, dann bleibt das 2D-Raster.
import { GRID } from './station.js';

const STEP = 2; // Abstand der Rasterfelder in 3D
const COLORS = { core: 0xf5efe6, node: 0xb8afa6, habitat: 0xf1e3b8, lab: 0xbfe3ea, storage: 0xd9c3a0 };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let THREE = null, GLTF = null, view = null, astronaut = null;

async function load() {
  if (!THREE) {
    THREE = await import('../assets/vendor/three/three.module.min.js');
    ({ GLTFLoader: GLTF } = await import('../assets/vendor/three/GLTFLoader.js'));
  }
}

function webgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const pos = (x, y) => [(x - (GRID - 1) / 2) * STEP, 0, (y - (GRID - 1) / 2) * STEP];

// Ein Modul als 3D-Körper: Zylinder in seiner Achse, Knoten als Kugel, Solar als zwei Flügel quer zur Achse
function moduleMesh(m) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.55 });
  if (m.type === 'node') g.add(new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), mat(COLORS.node)));
  else if (m.type === 'solar') {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.12), mat(0x8a8f96));
    const panel = new THREE.MeshStandardMaterial({ color: 0x2b3a6b, metalness: 0.6, roughness: 0.3, emissive: 0x0a1030 });
    const wing = (dz) => { const w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 1.3), panel); w.position.set(0, 0, dz); return w; };
    g.add(truss, wing(0.8), wing(-0.8));
    if (m.axis === 'v') g.rotation.y = Math.PI / 2;
    return g;
  } else {
    const len = m.type === 'core' ? 1.9 : 1.95;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, len, 28), mat(COLORS[m.type]));
    body.rotation.z = Math.PI / 2; // liegend, entlang x
    g.add(body);
    for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 8, 28), mat(0x6b6560)); ring.rotation.y = Math.PI / 2; ring.position.x = s * len / 2.4; g.add(ring); }
    if (m.type === 'core') { const mini = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.6), new THREE.MeshStandardMaterial({ color: 0x2b3a6b })); mini.position.y = 0.62; g.add(mini); }
    if (m.axis === 'v') g.rotation.y = Math.PI / 2;
  }
  return g;
}

function disposeGroup(group) {
  group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}

function ensureView() {
  if (view) return view;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xfff3e0, 1.6); sun.position.set(6, 12, 4); scene.add(sun);
  // Erde unten und Sterne: der Orbit soll erkennbar sein
  const earth = new THREE.Mesh(new THREE.SphereGeometry(62, 48, 32), new THREE.MeshStandardMaterial({ color: 0x2d6cb0, emissive: 0x0b2240, roughness: 0.9 }));
  earth.position.set(0, -78, -40); scene.add(earth);
  const stars = new THREE.BufferGeometry(), pts = [];
  for (let i = 0; i < 600; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(150); if (v.y > -20) pts.push(v.x, v.y, v.z); }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xf5efe6, size: 0.6, sizeAttenuation: true })));
  const content = new THREE.Group(); scene.add(content);
  view = { renderer, scene, camera, content, raycaster: new THREE.Raycaster(), cells: [], loop: 0, angle: 0.75, anims: [] };
  renderer.domElement.className = 'st3d-canvas';
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (!view.onPick) return;
    const r = renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    view.raycaster.setFromCamera(p, camera);
    const hit = view.raycaster.intersectObjects(view.cells)[0];
    if (hit && hit.object.userData.ok) view.onPick(hit.object.userData.x, hit.object.userData.y);
  });
  return view;
}

function frame(t) {
  const v = view;
  if (!v.renderer.domElement.isConnected) { v.loop = 0; return; } // Seite neu gebaut: Schleife ruht bis zum nächsten showStation3D
  const el = v.renderer.domElement.parentElement, w = el.clientWidth, h = el.clientHeight;
  if (v.w !== w || v.h !== h) { v.renderer.setSize(w, h, false); v.camera.aspect = w / Math.max(1, h); v.camera.updateProjectionMatrix(); v.w = w; v.h = h; }
  if (!reduced() && !v.onPick) v.angle += 0.0012; // langsames Kreisen, beim Wählen still (sonst springen die Felder weg)
  const d = 10.5;
  v.camera.position.set(Math.sin(v.angle) * d, 7, Math.cos(v.angle) * d);
  v.camera.lookAt(0, -0.8, 0);
  v.anims = v.anims.filter((a) => a(t) !== false);
  v.renderer.render(v.scene, v.camera);
  v.loop = requestAnimationFrame(frame);
}

// Station zeigen. opts.pick = { type, x, y, check(x, y) → {ok} } mit opts.onPick(x, y); opts.dock = { x, y } für die Andock-Animation
export async function showStation3D(container, station, opts = {}) {
  if (!webgl()) return false;
  try { await load(); } catch { return false; }
  if (!container.isConnected) return true;
  const v = ensureView();
  container.replaceChildren(v.renderer.domElement);
  disposeGroup(v.content); v.content.clear(); v.cells = []; v.anims = [];
  v.onPick = opts.pick ? opts.onPick : null;

  for (const m of station.modules) {
    const mesh = moduleMesh(m); mesh.position.set(...pos(m.x, m.y)); v.content.add(mesh);
    if (opts.dock && opts.dock.x === m.x && opts.dock.y === m.y && !reduced()) dockAnimation(v, mesh);
  }
  if (opts.pick) { // Raster: grüne Felder mit freiem Anschluss, gewähltes Feld gefüllt
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      if (station.modules.some((m) => m.x === x && m.y === y)) continue;
      const ok = opts.pick.check(x, y), chosen = opts.pick.x === x && opts.pick.y === y;
      const color = chosen ? (ok ? 0x4caf6a : 0xe0605a) : ok ? 0x4caf6a : 0x5a5466;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: chosen ? 0.55 : ok ? 0.16 : 0.05, side: THREE.DoubleSide, depthWrite: false }));
      plane.rotation.x = -Math.PI / 2; plane.position.set(...pos(x, y)); plane.position.y = -0.7;
      plane.userData = { x, y, ok };
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(plane.geometry), new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: ok || chosen ? 0.9 : 0.25 }));
      edge.computeLineDistances(); edge.rotation.copy(plane.rotation); edge.position.copy(plane.position);
      v.content.add(plane, edge); v.cells.push(plane);
    }
  }
  if (station.crew) await addCrew(v, station);
  if (!v.loop) v.loop = requestAnimationFrame(frame);
  return true;
}

// Crew: Kenney-Astronauten (CC0) schweben neben dem Kern, leicht auf und ab
async function addCrew(v, station) {
  try {
    if (!astronaut) astronaut = (await new GLTF().loadAsync('assets/kenney3d/astronautA.glb')).scene;
  } catch { return; }
  const core = station.modules.find((m) => m.type === 'core');
  if (!core) return;
  const [cx, , cz] = pos(core.x, core.y);
  for (let i = 0; i < station.crew; i++) {
    const a = astronaut.clone(true); a.scale.setScalar(1.5);
    const base = new THREE.Vector3(cx - 1 + i * 1, 1.3, cz + 1.2);
    a.position.copy(base); v.content.add(a);
    if (!reduced()) v.anims.push((t) => { a.position.y = base.y + Math.sin(t / 900 + i * 2) * 0.15; a.rotation.y = Math.sin(t / 2400 + i) * 0.6; });
  }
}

// Andocken: Modul kommt von weit her, bremst, Steuerdüsen pusten kleine Wolken, dann sitzt es fest (etwa 4 s)
function dockAnimation(v, mesh) {
  const target = mesh.position.clone();
  const from = target.clone().add(new THREE.Vector3(9, 4, 6));
  const start = performance.now(), dur = 4000;
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  const puffs = [];
  mesh.position.copy(from);
  v.anims.push((t) => {
    const k = Math.min(1, (t - start) / dur), e = 1 - (1 - k) ** 3; // schnell rein, sanft bremsen
    mesh.position.lerpVectors(from, target, e);
    if (k < 0.95 && Math.random() < 0.35) { // Steuerdüsen: kurze weiße Wolken an der Vorderseite
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), puffMat.clone());
      p.position.copy(mesh.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6));
      p.userData.born = t; v.content.add(p); puffs.push(p);
    }
    for (const p of puffs) { const age = (t - p.userData.born) / 600; p.scale.setScalar(1 + age * 3); p.material.opacity = Math.max(0, 0.7 - age * 0.7); }
    if (k >= 1 && puffs.every((p) => p.material.opacity <= 0)) { for (const p of puffs) { v.content.remove(p); p.geometry.dispose(); p.material.dispose(); } return false; }
    return true;
  });
}
