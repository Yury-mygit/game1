const canvas = document.getElementById('c');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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
const starColors = [[0.6,0.8,1],[1,0.7,0.5],[1,0.9,0.6],[0.8,0.6,1]];
for (let i = 0; i < colorStarCount; i++) {
  csPos[i*3]   = (Math.random()-0.5)*2000;
  csPos[i*3+1] = (Math.random()-0.5)*2000;
  csPos[i*3+2] = (Math.random()-0.5)*2000;
  const c = starColors[Math.floor(Math.random()*starColors.length)];
  csCol[i*3] = c[0]; csCol[i*3+1] = c[1]; csCol[i*3+2] = c[2];
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
[{r:38,c:0xff6600,o:0.12},{r:52,c:0xff4400,o:0.05}].forEach(({r,c,o}) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r,32,32),
    new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,side:THREE.BackSide}));
  m.position.copy(sunPos); scene.add(m);
});

// === АСТЕРОИДЫ ===
function pseudoRng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function makeAsteroid(idx) {
  const rng = pseudoRng(idx * 137 + 42);
  const radius = 4 + rng() * 14;
  const geo = new THREE.IcosahedronGeometry(radius, radius > 10 ? 3 : 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 0.7 + Math.sin(x*0.45+idx)*0.12 + Math.cos(y*0.6+idx)*0.10
            + Math.sin(z*0.35+idx)*0.08 + (rng()-0.5)*0.12;
    pos.setXYZ(i, x*n, y*n, z*n);
  }
  geo.computeVertexNormals();
  const base = 0.18 + rng()*0.28, tint = rng();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(base+tint*0.05, base*0.95, base*0.9-tint*0.03),
    roughness: 0.88+rng()*0.1, metalness: 0.05+rng()*0.1
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const angle = rng()*Math.PI*2, dist = 50+rng()*200;
  mesh.position.set(Math.cos(angle)*dist, (rng()-0.5)*90, Math.sin(angle)*dist);
  mesh.rotation.set(rng()*Math.PI, rng()*Math.PI, rng()*Math.PI);
  mesh.userData.rot = new THREE.Vector3((rng()-0.5)*0.004,(rng()-0.5)*0.004,(rng()-0.5)*0.003);
  return mesh;
}
const asteroids = [];
for (let i = 0; i < 14; i++) { const a = makeAsteroid(i); scene.add(a); asteroids.push(a); }

const dPos = new Float32Array(400*3);
for (let i = 0; i < 400; i++) {
  const a = Math.random()*Math.PI*2, d = 80+Math.random()*160;
  dPos[i*3]=Math.cos(a)*d; dPos[i*3+1]=(Math.random()-0.5)*30; dPos[i*3+2]=Math.sin(a)*d;
}
const debrisGeo = new THREE.BufferGeometry();
debrisGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
scene.add(new THREE.Points(debrisGeo, new THREE.PointsMaterial({color:0x887766,size:0.8})));

// === ТУМАННОСТИ ===
function makeNebula(pos, color, size, opacity) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const geo = new THREE.PlaneGeometry(size*(0.6+Math.random()*0.8), size*(0.6+Math.random()*0.8));
    const mat = new THREE.MeshBasicMaterial({color,transparent:true,
      opacity:opacity*(0.4+Math.random()*0.6),side:THREE.DoubleSide,depthWrite:false});
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos.x+(Math.random()-0.5)*size, pos.y+(Math.random()-0.5)*size*0.4,
                   pos.z+(Math.random()-0.5)*size);
    m.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    g.add(m);
  }
  return g;
}
scene.add(makeNebula(new THREE.Vector3(-200,50,-300), 0x220066, 120, 0.06));
scene.add(makeNebula(new THREE.Vector3(300,-80,-200), 0x003333, 90, 0.05));

// === УПРАВЛЕНИЕ ===
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });
let yaw=0, pitch=0, roll=0, isLocked=false;

canvas.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === canvas;
  document.getElementById('lock-msg').style.display = isLocked ? 'none' : 'block';
});
document.addEventListener('mousemove', e => {
  if (!isLocked) return;
  yaw   -= e.movementX * 0.0018;
  pitch -= e.movementY * 0.0018;
  pitch  = Math.max(-1.4, Math.min(1.4, pitch));
});

// Стрельба — ЛКМ (когда мышь захвачена) или клавиша F
document.addEventListener('mousedown', e => {
  if (isLocked && e.button === 0 && fire) fire();
});
document.addEventListener('keydown', e => {
  if (e.code === 'KeyF' && fire) fire();
});

// === СОСТОЯНИЕ КОРАБЛЯ ===
let shipGroup = null;
let updateExhausts = null;
let fire = null;
let updatePlasma = null;
let updateEngine = null;
const shipQuat = new THREE.Quaternion();
const vel = new THREE.Vector3();
let speed = 0;

// Загружаем корабль через манифест
loadShip(scene, ShipManifest, function(result) {
  shipGroup      = result.group;
  updateExhausts = result.updateExhausts;
  fire           = result.fire;
  updatePlasma   = result.updatePlasma;
  updateEngine   = result.updateEngine;
});

// Станция
const stationGroup = loadStation(scene, StationManifest);

// Патруль
let updatePatrol = null;
loadPatrol(scene, PatrolManifest, StationManifest, function(result) {
  updatePatrol = result.update;
});

// === ГЛАВНЫЙ ЦИКЛ ===
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.getElapsedTime();

  if (shipGroup) {
    if (isLocked) {
      const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yaw);
      const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), pitch);
      shipQuat.copy(qY).multiply(qP);
    }
    if (keys['KeyQ']) roll += 0.025;
    if (keys['KeyE']) roll -= 0.025;
    roll *= 0.97;
    shipGroup.quaternion.slerp(
      shipQuat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), roll)),
      0.12
    );

    const isThrusting = keys['KeyW'] || keys['ShiftLeft'];
    const isBoost     = keys['ShiftLeft'];
    const maxSpeed    = isBoost ? 100 : 35;
    if (keys['KeyW']) speed += 55*dt;
    if (keys['KeyS']) speed -= 30*dt;
    speed *= 0.91;
    speed = Math.max(-20, Math.min(maxSpeed, speed));

    const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(shipGroup.quaternion);
    vel.copy(fwd).multiplyScalar(speed*dt);
    if (keys['KeyA'])        vel.addScaledVector(new THREE.Vector3(-1,0,0).applyQuaternion(shipGroup.quaternion), 22*dt);
    if (keys['KeyD'])        vel.addScaledVector(new THREE.Vector3( 1,0,0).applyQuaternion(shipGroup.quaternion), 22*dt);
    if (keys['Space'])       vel.addScaledVector(new THREE.Vector3(0,1,0).applyQuaternion(shipGroup.quaternion), 22*dt);
    if (keys['ControlLeft']) vel.addScaledVector(new THREE.Vector3(0,-1,0).applyQuaternion(shipGroup.quaternion), 22*dt);
    shipGroup.position.add(vel);

    // Обновляем частицы выхлопа
    if (updateExhausts) updateExhausts(dt, isThrusting, isBoost);
    // Обновляем снаряды
    if (updatePlasma) updatePlasma(dt);
    // Звук двигателя
    if (updateEngine) updateEngine(isThrusting, isBoost);

    const camOff = new THREE.Vector3(0, 4, 22).applyQuaternion(shipGroup.quaternion);
    camera.position.lerp(shipGroup.position.clone().add(camOff), 0.08);
    camera.lookAt(shipGroup.position.clone().addScaledVector(fwd, 10));

    document.getElementById('spd').textContent = Math.abs(Math.round(speed));
    const p = shipGroup.position;
    document.getElementById('pos').textContent =
      `${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)}`;
  }

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
  sun.scale.setScalar(1 + Math.sin(t*0.4)*0.025);
  sunLight.intensity = 3.8 + Math.sin(t*0.7)*0.4;

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});