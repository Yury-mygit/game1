const canvas = document.getElementById('c');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.style.cursor = 'default';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000005, 0.0007);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 20, 80);

// Обновляем подсказки
const infoEl = document.getElementById('info');
if (infoEl) {
  infoEl.innerHTML = `
    ЛКМ — выбрать объект<br>
    ПКМ drag — вращение камеры<br>
    ПКМ click по объекту — приказ лететь / следовать<br>
    Колесо мыши — приблизить / отдалить<br>
    W/S/A/D — свободная камера без выделения<br>
    Shift — ускорение<br>
    Space/Ctrl — вверх / вниз
  `;
}

const hudEl = document.getElementById('hud');
if (hudEl) {
  hudEl.innerHTML = `CAM SPD: <span id="spd">0</span> &nbsp;|&nbsp; POS: <span id="pos">0, 0, 0</span>`;
}

const lockMsgEl = document.getElementById('lock-msg');
if (lockMsgEl) {
  lockMsgEl.style.display = 'none';
}

// === ЗВЁЗДЫ ===
const starCount = 8000;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 2500;
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true })));

const colorStarCount = 300;
const csPos = new Float32Array(colorStarCount * 3);
const csCol = new Float32Array(colorStarCount * 3);
const starColors = [[0.6, 0.8, 1], [1, 0.7, 0.5], [1, 0.9, 0.6], [0.8, 0.6, 1]];
for (let i = 0; i < colorStarCount; i++) {
  csPos[i * 3] = (Math.random() - 0.5) * 2000;
  csPos[i * 3 + 1] = (Math.random() - 0.5) * 2000;
  csPos[i * 3 + 2] = (Math.random() - 0.5) * 2000;
  const c = starColors[Math.floor(Math.random() * starColors.length)];
  csCol[i * 3] = c[0];
  csCol[i * 3 + 1] = c[1];
  csCol[i * 3 + 2] = c[2];
}
const csGeo = new THREE.BufferGeometry();
csGeo.setAttribute('position', new THREE.BufferAttribute(csPos, 3));
csGeo.setAttribute('color', new THREE.BufferAttribute(csCol, 3));
scene.add(new THREE.Points(csGeo, new THREE.PointsMaterial({ size: 1.2, vertexColors: true, sizeAttenuation: true })));

// === ОСВЕЩЕНИЕ ===
const sunPos = new THREE.Vector3(-300, 100, -400);
const sunLight = new THREE.PointLight(0xffcc66, 3, 2000);
sunLight.position.copy(sunPos);
sunLight.castShadow = true;
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x334466, 1.8));
const fillFront = new THREE.DirectionalLight(0x6688aa, 0.9);
fillFront.position.set(0, 5, 10);
scene.add(fillFront);
const fillBack = new THREE.DirectionalLight(0x443322, 0.6);
fillBack.position.set(0, -2, -10);
scene.add(fillBack);
const fillSide = new THREE.DirectionalLight(0x224466, 0.5);
fillSide.position.set(10, 0, 0);
scene.add(fillSide);

// === СОЛНЦЕ ===
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(30, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffdd44 })
);
sun.position.copy(sunPos);
scene.add(sun);
[{ r: 38, c: 0xff6600, o: 0.12 }, { r: 52, c: 0xff4400, o: 0.05 }].forEach(({ r, c, o }) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 32, 32),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.BackSide })
  );
  m.position.copy(sunPos);
  scene.add(m);
});

// === АСТЕРОИДЫ ===
function pseudoRng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeAsteroid(idx) {
  const rng = pseudoRng(idx * 137 + 42);
  const radius = 4 + rng() * 14;
  const geo = new THREE.IcosahedronGeometry(radius, radius > 10 ? 3 : 2);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 0.7 + Math.sin(x * 0.45 + idx) * 0.12 + Math.cos(y * 0.6 + idx) * 0.10
      + Math.sin(z * 0.35 + idx) * 0.08 + (rng() - 0.5) * 0.12;
    pos.setXYZ(i, x * n, y * n, z * n);
  }

  geo.computeVertexNormals();

  const base = 0.18 + rng() * 0.28;
  const tint = rng();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(base + tint * 0.05, base * 0.95, base * 0.9 - tint * 0.03),
    roughness: 0.88 + rng() * 0.1,
    metalness: 0.05 + rng() * 0.1
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const angle = rng() * Math.PI * 2;
  const dist = 50 + rng() * 200;
  mesh.position.set(Math.cos(angle) * dist, (rng() - 0.5) * 90, Math.sin(angle) * dist);
  mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
  mesh.userData.rot = new THREE.Vector3(
    (rng() - 0.5) * 0.004,
    (rng() - 0.5) * 0.004,
    (rng() - 0.5) * 0.003
  );
  return mesh;
}

const asteroids = [];
for (let i = 0; i < 14; i++) {
  const a = makeAsteroid(i);
  scene.add(a);
  asteroids.push(a);
}

const dPos = new Float32Array(400 * 3);
for (let i = 0; i < 400; i++) {
  const a = Math.random() * Math.PI * 2;
  const d = 80 + Math.random() * 160;
  dPos[i * 3] = Math.cos(a) * d;
  dPos[i * 3 + 1] = (Math.random() - 0.5) * 30;
  dPos[i * 3 + 2] = Math.sin(a) * d;
}
const debrisGeo = new THREE.BufferGeometry();
debrisGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
scene.add(new THREE.Points(debrisGeo, new THREE.PointsMaterial({ color: 0x887766, size: 0.8 })));

// === ТУМАННОСТИ ===
function makeNebula(pos, color, size, opacity) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.PlaneGeometry(size * (0.6 + Math.random() * 0.8), size * (0.6 + Math.random() * 0.8));
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: opacity * (0.4 + Math.random() * 0.6),
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(
      pos.x + (Math.random() - 0.5) * size,
      pos.y + (Math.random() - 0.5) * size * 0.4,
      pos.z + (Math.random() - 0.5) * size
    );
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    g.add(m);
  }
  return g;
}

scene.add(makeNebula(new THREE.Vector3(-200, 50, -300), 0x220066, 120, 0.06));
scene.add(makeNebula(new THREE.Vector3(300, -80, -200), 0x003333, 90, 0.05));

// === УПРАВЛЕНИЕ ===
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup', e => { keys[e.code] = false; });

let yaw = 0;
let pitch = 0;

let isRightMouseDown = false;
let rightMouseDragDistance = 0;
let rightMouseDownPos = { x: 0, y: 0 };

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  if (e.button === 2) {
    isRightMouseDown = true;
    rightMouseDragDistance = 0;
    rightMouseDownPos = { x: e.clientX, y: e.clientY };
  }
});

window.addEventListener('mouseup', e => {
  if (e.button !== 2) return;

  isRightMouseDown = false;

  // ПКМ click без заметного движения = приказ кораблю
  if (rightMouseDragDistance < 6) {
    issueCommandAtPointer(e.clientX, e.clientY);
  }
});

window.addEventListener('mousemove', e => {
  if (!isRightMouseDown) return;

  rightMouseDragDistance += Math.abs(e.movementX) + Math.abs(e.movementY);

  yaw -= e.movementX * 0.003;
  pitch -= e.movementY * 0.003;
  pitch = Math.max(-1.4, Math.min(1.4, pitch));
});

// === КАМЕРА ===
const camQuat = new THREE.Quaternion();
const cameraZoomStep = 8;
let cameraBaseSpeed = 35;
const cameraBoostMultiplier = 2.4;

let selectedObject = null;
let orbitDistance = 60;
const orbitMinDistance = 8;
const orbitMaxDistance = 260;

function getObjectWorldCenter(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return null;
  return box.getCenter(new THREE.Vector3());
}

canvas.addEventListener('wheel', e => {
  e.preventDefault();

  if (selectedObject) {
    orbitDistance += e.deltaY > 0 ? cameraZoomStep : -cameraZoomStep;
    orbitDistance = Math.max(orbitMinDistance, Math.min(orbitMaxDistance, orbitDistance));
    return;
  }

  const zoomDelta = e.deltaY > 0 ? cameraZoomStep : -cameraZoomStep;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(forward, zoomDelta);
}, { passive: false });

// === ВЫДЕЛЕНИЕ ОБЪЕКТОВ ===
const raycaster = new THREE.Raycaster();
const mouseNdc = new THREE.Vector2();
const selectionFrame = createSelectionFrame(scene);

let shipGroup = null;
let stationGroup = null;
let patrolGroups = [];
let selectableObjects = [];
let commandTarget = null;

function rebuildSelectableObjects() {
  const next = [];

  if (shipGroup) next.push(shipGroup);
  if (stationGroup) next.push(stationGroup);
  if (patrolGroups.length) next.push(...patrolGroups);
  if (asteroids.length) next.push(...asteroids);

  selectableObjects = next;
}

function pickSelectableRoot(object) {
  let current = object;
  while (current) {
    if (selectableObjects.includes(current)) return current;
    current = current.parent;
  }
  return null;
}

function getPointerNdc(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function pickObjectAt(clientX, clientY) {
  getPointerNdc(clientX, clientY);
  raycaster.setFromCamera(mouseNdc, camera);
  const intersections = raycaster.intersectObjects(selectableObjects, true);

  if (!intersections.length) return null;
  return pickSelectableRoot(intersections[0].object);
}

canvas.addEventListener('click', e => {
  if (e.button !== 0) return;

  const selectedRoot = pickObjectAt(e.clientX, e.clientY);

  if (!selectedRoot) {
    selectedObject = null;
    selectionFrame.clear();
    return;
  }

  selectedObject = selectedRoot;
  selectionFrame.attachTo(selectedRoot);
});

function issueCommandAtPointer(clientX, clientY) {
  if (!shipGroup) return;

  const target = pickObjectAt(clientX, clientY);
  if (!target || target === shipGroup) return;

  commandTarget = target;
}

// === СОСТОЯНИЕ КОРАБЛЯ ===
let updateExhausts = null;
let fire = null;
let updatePlasma = null;
let updateEngine = null;

const shipMoveState = {
  speed: 0,
  lastDir: new THREE.Vector3(0, 0, -1)
};

const shipFollowConfig = {
  cruiseSpeed: 32,
  maxSpeed: 42,
  acceleration: 24,
  deceleration: 28,
  stopDistance: 18,
  repathDistance: 6,
  turnLerp: 0.08
};

const lookHelper = new THREE.Object3D();

function updateShipAutopilot(dt) {
  if (!shipGroup) return;

  if (!commandTarget) {
    shipMoveState.speed = Math.max(0, shipMoveState.speed - shipFollowConfig.deceleration * dt);
    if (updateExhausts) updateExhausts(dt, shipMoveState.speed > 1, false);
    if (updateEngine) updateEngine(shipMoveState.speed > 1, false);
    return;
  }

  const targetCenter = getObjectWorldCenter(commandTarget);
  if (!targetCenter) {
    commandTarget = null;
    shipMoveState.speed = 0;
    if (updateExhausts) updateExhausts(dt, false, false);
    if (updateEngine) updateEngine(false, false);
    return;
  }

  const shipPos = shipGroup.position.clone();
  const toTarget = targetCenter.clone().sub(shipPos);
  const dist = toTarget.length();

  if (dist < 0.001) {
    shipMoveState.speed = 0;
    if (updateExhausts) updateExhausts(dt, false, false);
    if (updateEngine) updateEngine(false, false);
    return;
  }

  const desiredDir = toTarget.clone().normalize();
  shipMoveState.lastDir.copy(desiredDir);

  // Плавный разворот корабля к цели
  lookHelper.position.copy(shipGroup.position);
  lookHelper.lookAt(shipGroup.position.clone().add(desiredDir));
  lookHelper.rotateY(Math.PI);
  shipGroup.quaternion.slerp(lookHelper.quaternion, shipFollowConfig.turnLerp);

  const desiredSpeed = dist > shipFollowConfig.stopDistance
    ? Math.min(shipFollowConfig.cruiseSpeed + Math.max(0, dist - shipFollowConfig.stopDistance) * 0.08, shipFollowConfig.maxSpeed)
    : 0;

  if (shipMoveState.speed < desiredSpeed) {
    shipMoveState.speed = Math.min(desiredSpeed, shipMoveState.speed + shipFollowConfig.acceleration * dt);
  } else {
    shipMoveState.speed = Math.max(desiredSpeed, shipMoveState.speed - shipFollowConfig.deceleration * dt);
  }

  if (shipMoveState.speed > 0.01) {
    const moveStep = Math.min(shipMoveState.speed * dt, Math.max(0, dist - shipFollowConfig.stopDistance));
    shipGroup.position.addScaledVector(desiredDir, moveStep);
  }

  if (updateExhausts) updateExhausts(dt, shipMoveState.speed > 1, false);
  if (updateEngine) updateEngine(shipMoveState.speed > 1, false);
}

// Загружаем корабль через манифест
loadShip(scene, ShipManifest, function(result) {
  shipGroup = result.group;
  updateExhausts = result.updateExhausts;
  fire = result.fire;
  updatePlasma = result.updatePlasma;
  updateEngine = result.updateEngine;
  rebuildSelectableObjects();
});

// Станция
stationGroup = loadStation(scene, StationManifest);
rebuildSelectableObjects();

// Патруль
let updatePatrol = null;
loadPatrol(scene, PatrolManifest, StationManifest, function(result) {
  updatePatrol = result.update;
  patrolGroups = result.groups || [];
  rebuildSelectableObjects();
});

// === ГЛАВНЫЙ ЦИКЛ ===
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // Свободная камера всегда остаётся на месте, даже если объект выбран
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  camQuat.copy(qY).multiply(qP);
  camera.quaternion.copy(camQuat);

  const moveSpeed = (keys['ShiftLeft'] ? cameraBaseSpeed * cameraBoostMultiplier : cameraBaseSpeed) * dt;

  const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  if (keys['KeyW']) camera.position.addScaledVector(camForward, moveSpeed);
  if (keys['KeyS']) camera.position.addScaledVector(camForward, -moveSpeed);
  if (keys['KeyA']) camera.position.addScaledVector(camRight, -moveSpeed);
  if (keys['KeyD']) camera.position.addScaledVector(camRight, moveSpeed);
  if (keys['Space']) camera.position.addScaledVector(camUp, moveSpeed);
  if (keys['ControlLeft']) camera.position.addScaledVector(camUp, -moveSpeed);

  // Автопилот игрока
  updateShipAutopilot(dt);

  // Снаряды игрока, если были выпущены ранее
  if (updatePlasma) updatePlasma(dt);

  asteroids.forEach(a => {
    a.rotation.x += a.userData.rot.x;
    a.rotation.y += a.userData.rot.y;
    a.rotation.z += a.userData.rot.z;
  });

  // Медленное вращение станции
  if (stationGroup) {
    stationGroup.rotation.x += stationGroup.userData.rotSpeed.x;
    stationGroup.rotation.y += stationGroup.userData.rotSpeed.y;
    stationGroup.rotation.z += stationGroup.userData.rotSpeed.z;
  }

  // Патруль
  if (updatePatrol) updatePatrol(dt);

  // Обновление рамки выделения
  selectionFrame.update(camera);

  sun.scale.setScalar(1 + Math.sin(t * 0.4) * 0.025);
  sunLight.intensity = 3.8 + Math.sin(t * 0.7) * 0.4;

  document.getElementById('spd').textContent =
    Math.round(keys['ShiftLeft'] ? cameraBaseSpeed * cameraBoostMultiplier : cameraBaseSpeed);
  document.getElementById('pos').textContent =
    `${Math.round(camera.position.x)}, ${Math.round(camera.position.y)}, ${Math.round(camera.position.z)}`;

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});