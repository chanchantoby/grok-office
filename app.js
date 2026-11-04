import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

const POLL_MS = 30000;
// 狀態資料：status 分支上的 status.json（不會觸發 Pages 重建）；失敗時退回同站的 ./status.json
const SOURCES = ['https://raw.githubusercontent.com/chanchantoby/grok-office/status/status.json', './status.json'];
const STALE_MS = 5 * 60 * 1000;
const ZONES = [
  { name: '助理',     cx: -7.5, cz: 3.2, w: 9, d: 6, color: 0x6d5bd0, desks: [-10.3, -7.5, -4.7] },
  { name: '內容/影音', cx: 1.6,  cz: 3.2, w: 6.4, d: 6, color: 0x2f7fd8, desks: [0.2, 3.0] },
  { name: '理財/電商', cx: 8.6,  cz: 3.2, w: 6.4, d: 6, color: 0x2fa36b, desks: [7.2, 10.0] },
];

// ---------- 基本場景 ----------
const host = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
host.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1e26);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(22, 20, 24);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.5, 0, 1.5);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.42;
controls.minZoom = 0.6; controls.maxZoom = 3;

function resize() {
  const w = innerWidth, h = innerHeight, aspect = w / h;
  const view = aspect > 1.4 ? 9 : aspect > 0.8 ? 13 / aspect * 0.8 : 15 / aspect * 0.8;
  if (aspect <= 0.8) controls.target.set(-2.5, 0, 3); else controls.target.set(-0.5, 0, 1.5);
  camera.left = -view * aspect; camera.right = view * aspect; camera.top = view; camera.bottom = -view;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
}
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x30333d, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(10, 18, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14 });
scene.add(sun);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
function box(w, h, d, color, x, y, z, parent = scene, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function label(html, cls, parent, y = 0) {
  const div = document.createElement('div'); div.className = cls; div.innerHTML = html;
  const o = new CSS2DObject(div); o.position.y = y; parent.add(o); return o;
}

// 地面、地板、牆
box(60, 0.1, 50, 0x15171d, 0, -0.15, 0);
box(27, 0.2, 19, 0xb9bcc4, 0, -0.1, 0);
box(27, 0.9, 0.3, 0x3a3f4c, 0, 0.45, -9.35);       // 後牆
box(0.3, 0.9, 19, 0x3a3f4c, -13.35, 0.45, 0);      // 左牆
// 前、右側欄杆
for (let x = -13; x <= 13.01; x += 1.3) box(0.08, 0.5, 0.08, 0x4b5160, x, 0.25, 9.4);
for (let z = -9; z <= 9.01; z += 1.3) box(0.08, 0.5, 0.08, 0x4b5160, 13.4, 0.25, z);
box(27, 0.06, 0.08, 0x4b5160, 0, 0.5, 9.4); box(0.08, 0.06, 19, 0x4b5160, 13.4, 0.5, 0);

// 樹
function tree(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  box(0.5, 0.35, 0.5, 0x8a8f99, 0, 0.17, 0, g);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4), mat(0x6b4a2f)); trunk.position.y = 0.5; g.add(trunk);
  [[0.55, 0.9, 0.9], [0.42, 0.7, 1.35]].forEach(([r, h, y]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat(0x2f9e57)); c.position.y = y; c.castShadow = true; g.add(c);
  });
  scene.add(g);
}
[[-12.5, -8.6], [-6, -8.7], [0, -8.7], [6, -8.7], [12.4, -8.6], [-12.6, -2], [-12.6, 8.6], [12.6, 8.6], [12.6, -2]].forEach(([x, z]) => tree(x, z));
for (let x = -16; x <= 16; x += 5.3) tree(x, -12.5, 1.3);

// 休息區：電視、沙發、會議桌、白板
box(3.2, 1.6, 0.12, 0x111318, -4, 1.6, -9.1); box(3.0, 1.4, 0.02, 0x2b4a7a, -4, 1.6, -9.03, scene, { emissive: 0x1a3a6a, emissiveIntensity: 0.6 });
box(3.6, 0.45, 1.0, 0x7a5c3e, 6.5, 0.22, -7.6); box(3.6, 0.7, 0.3, 0x6a4d32, 6.5, 0.55, -8.05);
const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 32), mat(0xe9e9ee)); tbl.position.set(-6, 0.75, -4.6); tbl.castShadow = true; scene.add(tbl);
box(0.2, 0.75, 0.2, 0x555b66, -6, 0.37, -4.6);
for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(0.5, 0.45, 0.5, 0x4b5160, -6 + Math.cos(a) * 2, 0.22, -4.6 + Math.sin(a) * 2); }
box(2.6, 1.4, 0.08, 0xf4f4f6, 1.5, 1.2, -9.1);
const rugL = box(5, 0.03, 3.5, 0x3d4560, 6.5, 0.02, -6.3);

// 區域地毯 + 標籤
for (const z of ZONES) {
  box(z.w, 0.04, z.d, z.color, z.cx, 0.02, z.cz, scene, { roughness: 1 });
  const holder = new THREE.Object3D(); holder.position.set(z.cx, 0.1, z.cz + z.d / 2 + 0.5); scene.add(holder);
  label(z.name, 'zone-label', holder);
}

// ---------- 桌子 + 角色 ----------
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 80;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t, ctx: c.getContext('2d'), off: 0 };
}
function drawScreen(s, mode, color) {
  const { ctx } = s; ctx.fillStyle = mode === 'idle' ? '#151a26' : '#0f1a2c'; ctx.fillRect(0, 0, 128, 80);
  if (mode !== 'idle') {
    for (let i = 0; i < 8; i++) {
      const w = 20 + ((i * 37 + s.off * 13) % 70);
      ctx.fillStyle = i % 3 === 0 ? color : (mode === 'working' ? '#7fe3ff' : '#5a6b85');
      ctx.globalAlpha = mode === 'working' ? 0.95 : 0.5;
      ctx.fillRect(8 + (i % 2) * 8, 6 + i * 9, w, 4);
    }
    ctx.globalAlpha = 1;
  }
  s.t.needsUpdate = true;
}

function makeBlob(color, shape) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), m);
  body.scale.set(1, 0.88, 0.95); body.castShadow = true; g.add(body);
  if (shape === 'pumpkin') {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.33, 20, 16), m); l.position.set(Math.cos(a) * 0.3, -0.02, Math.sin(a) * 0.3); l.scale.y = 1.25; l.castShadow = true; g.add(l); }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18), mat(0x3d7a3a)); stem.position.y = 0.55; g.add(stem);
  } else if (shape === 'clover') {
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), m); l.position.set(Math.cos(a) * 0.38, 0.32, Math.sin(a) * 0.32); l.castShadow = true; g.add(l); }
  } else {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), m); tuft.position.set(0.12, 0.52, 0); g.add(tuft);
  }
  const eyeM = mat(0x111111, { roughness: 0.3 });
  const eyes = [-0.17, 0.17].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), eyeM); e.position.set(x, 0.08, 0.5); g.add(e); return e; });
  const shine = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 });
  eyes.forEach(e => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), shine); s.position.set(0.025, 0.03, 0.06); e.add(s); });
  const cheekM = mat(0xff8fa3, { transparent: true, opacity: 0.6 });
  [-0.3, 0.3].forEach(x => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), cheekM); c.position.set(x, -0.04, 0.45); c.scale.z = 0.3; g.add(c); });
  const arms = [-0.55, 0.55].map(x => { const a = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), m); a.position.set(x, -0.15, 0.2); a.castShadow = true; g.add(a); return a; });
  return { g, eyes, arms, body };
}

const bots = new Map(); // id -> {...}
const pickables = [];
function makeDesk(x, z, info) {
  const root = new THREE.Group(); root.position.set(x, 0, z); scene.add(root);
  // 椅子
  box(0.8, 0.12, 0.8, 0x2c3140, 0, 0.42, -0.1, root); box(0.8, 0.8, 0.12, 0x2c3140, 0, 0.8, -0.55, root);
  box(0.1, 0.4, 0.1, 0x555b66, 0, 0.2, -0.1, root);
  // 桌子
  box(2.0, 0.1, 1.0, 0xeeeeee, 0, 0.78, 0.95, root);
  [[-0.9, 0.55], [0.9, 0.55], [-0.9, 1.35], [0.9, 1.35]].forEach(([dx, dz]) => box(0.07, 0.75, 0.07, 0x9aa0aa, dx, 0.38, dz, root));
  box(0.7, 0.04, 0.25, 0x333844, 0.1, 0.85, 0.75, root); // 鍵盤
  // 螢幕（斜放，正面朝鏡頭與角色之間）
  const mon = new THREE.Group(); mon.position.set(-0.6, 0.83, 1.15); mon.rotation.y = Math.PI * 0.22; root.add(mon);
  box(0.08, 0.3, 0.08, 0x333844, 0, 0.15, 0, mon);
  box(0.95, 0.6, 0.06, 0x1f232c, 0, 0.6, 0, mon);
  const scr = screenTexture();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.52), new THREE.MeshStandardMaterial({ map: scr.t, emissiveMap: scr.t, emissive: 0xffffff, emissiveIntensity: 0.2 }));
  screen.position.set(0, 0.6, 0.035); mon.add(screen);
  // 為了讓鏡頭也看得到，背面也放一片同樣的螢幕
  const screenB = screen.clone(); screenB.rotation.y = Math.PI; screenB.position.z = -0.035; mon.add(screenB);
  const glow = new THREE.PointLight(0x7fd8ff, 0, 3); glow.position.set(-0.4, 1.4, 0.6); root.add(glow);
  // 角色
  const blob = makeBlob(info.color, info.shape); blob.g.position.set(0, 1.0, 0); blob.g.scale.setScalar(1.3); blob.base = 1.3; root.add(blob.g);
  blob.g.traverse(o => { if (o.isMesh) { o.userData.botId = info.id; pickables.push(o); } });
  // 名牌
  const tagHolder = new THREE.Object3D(); tagHolder.position.set(0, 2.45, 0); root.add(tagHolder);
  const tag = label('', 'tag', tagHolder);
  tag.element.style.pointerEvents = 'auto';
  tag.element.addEventListener('click', () => openPanel(info.id));
  const zzz = label('<span class="zzz">z<small>Z</small>z</span>', 'zwrap', blob.g, 0.55); zzz.position.x = 0.8;
  const bubble = label('<span class="bubble">···</span>', 'bwrap', blob.g, 0.55); bubble.position.x = 0.85;
  return { root, blob, scr, screen, screenB, glow, tag, zzz, bubble, data: info, phase: Math.random() * 6 };
}

// ---------- 狀態 ----------
let latest = null;
async function poll() {
  try {
    let got = null, lastErr = null;
    for (const src of SOURCES) {
      try {
        const r = await fetch(src + '?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (!got || (j.generatedAtMs || 0) > (got.generatedAtMs || 0)) got = j;
        break;
      } catch (e) { lastErr = e; }
    }
    if (!got) throw lastErr || new Error('沒有資料');
    latest = got;
    applyStatus(latest);
  } catch (e) {
    document.getElementById('summary').textContent = '讀不到狀態資料：' + e.message;
  }
}
function applyStatus(s) {
  for (const a of s.agents) {
    let b = bots.get(a.id);
    if (!b) {
      const zi = ZONES.findIndex(z => z.name === a.zone);
      const z = ZONES[zi >= 0 ? zi : 0];
      const used = [...bots.values()].filter(x => x.data.zone === z.name).length;
      b = makeDesk(z.desks[used % z.desks.length], z.cz - 0.9, a);
      bots.set(a.id, b);
    }
    b.data = a;
    b.tag.element.className = 'tag ' + a.status;
    b.tag.element.innerHTML = `<div class="n"><i class="dot ${a.status}"></i>${esc(a.name)}</div><div class="s">${a.statusLabel}${a.lastActive ? ' · ' + a.lastActive : ''}</div>`;
    b.zzz.visible = a.status === 'idle';
    b.bubble.visible = a.status === 'working';
    b.glow.intensity = a.status === 'working' ? 2.2 : a.status === 'recent' ? 0.5 : 0;
    b.screen.material.emissiveIntensity = a.status === 'working' ? 1.0 : a.status === 'recent' ? 0.45 : 0.05;
    const closed = a.status === 'idle';
    b.blob.eyes.forEach(e => e.scale.set(closed ? 1.3 : 1, closed ? 0.18 : 1, 1));
    drawScreen(b.scr, a.status, a.color);
  }
  const want = decodeURIComponent((location.hash.match(/bot=([^&]+)/) || [])[1] || '');
  if (want && !openId) { const hit = s.agents.find(a => a.name === want || a.id === want); if (hit) openPanel(hit.id); }
  const c = { working: 0, recent: 0, idle: 0 }; s.agents.forEach(a => c[a.status]++);
  document.getElementById('summary').textContent =
    `工作中 ${c.working} · 剛忙完 ${c.recent} · 待命 ${c.idle} ｜ 資料更新於 ${s.now.slice(5, 16).replace('-', '/')}（${s.tz}）` +
    (Date.now() - s.generatedAtMs > STALE_MS ? ` ⚠ 資料已 ${Math.round((Date.now() - s.generatedAtMs) / 60000)} 分鐘沒更新，狀態可能不準` : '');
  if (openId) renderPanel(openId);
}
const esc = t => String(t ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------- 詳情面板 ----------
let openId = null;
const panel = document.getElementById('panel');
document.getElementById('close').onclick = () => { openId = null; panel.classList.add('hidden'); };
function openPanel(id) { openId = id; renderPanel(id); panel.classList.remove('hidden'); }
function renderPanel(id) {
  const a = bots.get(id)?.data; if (!a) return;
  const ageSec = a.lastActiveMs ? Math.max(0, Math.round((Date.now() - a.lastActiveMs) / 1000)) : null;
  const ago = ageSec == null ? '—' : ageSec < 120 ? `${ageSec} 秒前` : ageSec < 7200 ? `${Math.round(ageSec / 60)} 分鐘前` : ageSec < 172800 ? `${Math.round(ageSec / 3600)} 小時前` : `${Math.round(ageSec / 86400)} 天前`;
  document.getElementById('panel-body').innerHTML = `
    <h2><span class="sw" style="background:${a.color}"></span>${esc(a.name)}</h2>
    <div><i class="dot ${a.status}"></i><b>${a.statusLabel}</b> · ${esc(a.zone)} 區</div>
    <div class="k">最後動靜（台北時間）</div><div class="v">${a.lastActive ?? '—'}（${ago}）</div>
    <div class="k">狀態規則</div><div class="v" style="opacity:.75">工作中＝2 分鐘內有訊息，或收到指令還沒回；剛忙完＝30 分鐘內有訊息；待命＝更久</div>
    <div class="k">訊息量</div><div class="v">今天 ${a.msgsToday} 則 · 最近 1 小時 ${a.msgsLastHour} 則</div>`;
}
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => downAt = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  if (hit) openPanel(hit.object.userData.botId);
});

// ---------- 動畫 ----------
const clock = new THREE.Clock(); let lastScr = 0;
function tick() {
  const t = clock.getElapsedTime();
  for (const b of bots.values()) {
    const st = b.data.status, p = t + b.phase;
    const g = b.blob.g;
    if (st === 'working') {
      g.position.y = 1.0 + Math.abs(Math.sin(p * 5)) * 0.08;
      g.rotation.z = Math.sin(p * 2.5) * 0.05; g.scale.setScalar(1.3);
      b.blob.arms[0].position.y = -0.15 + Math.max(0, Math.sin(p * 14)) * 0.08;
      b.blob.arms[1].position.y = -0.15 + Math.max(0, Math.sin(p * 14 + Math.PI)) * 0.08;
      b.glow.intensity = 1.8 + Math.sin(p * 9) * 0.4;
    } else if (st === 'recent') {
      g.position.y = 1.0; g.rotation.z = 0;
      g.scale.set(1.3, 1.3 * (1 + Math.sin(p * 1.6) * 0.03), 1.3);
    } else {
      g.position.y = 0.95; g.rotation.z = 0.12; g.scale.set(1.34, 1.26 * (1 + Math.sin(p * 0.9) * 0.015), 1.34);
    }
  }
  if (t - lastScr > 0.15) {
    lastScr = t;
    for (const b of bots.values()) if (b.data.status === 'working') { b.scr.off++; drawScreen(b.scr, 'working', b.data.color); }
  }
  controls.update();
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}
poll(); setInterval(poll, POLL_MS); tick();
window.__office = { bots, poll };
