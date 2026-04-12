// station-loader.js — процедурная космическая станция
// Читает StationManifest, строит геометрию, помещает в сцену

function loadStation(scene, manifest) {
  const s  = manifest.scale;
  const C  = manifest.colors;

  // --- материалы ---
  const mat = {
    hull:   new THREE.MeshStandardMaterial({ color: C.hull,   roughness: 0.55, metalness: 0.6 }),
    dark:   new THREE.MeshStandardMaterial({ color: C.dark,   roughness: 0.7,  metalness: 0.5 }),
    panel:  new THREE.MeshStandardMaterial({ color: C.panel,  roughness: 0.35, metalness: 0.75 }),
    accent: new THREE.MeshStandardMaterial({ color: C.accent, roughness: 0.6,  metalness: 0.4 }),
    window: new THREE.MeshStandardMaterial({ color: C.window, roughness: 0.05, metalness: 0.0,
             transparent: true, opacity: 0.7, emissive: C.window, emissiveIntensity: 0.4 }),
    light:  new THREE.MeshBasicMaterial({ color: C.light }),
    solar:  new THREE.MeshStandardMaterial({ color: "#112244", roughness: 0.3, metalness: 0.8,
             emissive: "#001133", emissiveIntensity: 0.3 }),
    truss:  new THREE.MeshStandardMaterial({ color: C.dark,   roughness: 0.8,  metalness: 0.5 }),
  };

  const root = new THREE.Group();

  // =============================================
  // ЦЕНТРАЛЬНЫЙ ХАБ — тороидальная жилая секция
  // =============================================
  const torusGeo = new THREE.TorusGeometry(0.38*s, 0.09*s, 20, 60);
  root.add(new THREE.Mesh(torusGeo, mat.hull));

  // Внешние панели тора
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.14*s, 0.04*s, 0.08*s),
      mat.panel
    );
    panel.position.set(Math.cos(a)*0.38*s, Math.sin(a)*0.38*s, 0);
    panel.rotation.z = a;
    root.add(panel);
  }

  // Иллюминаторы на торе
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = 0.38*s;
    const win = new THREE.Mesh(
      new THREE.CircleGeometry(0.018*s, 8),
      mat.window
    );
    win.position.set(Math.cos(a)*(r+0.09*s), Math.sin(a)*(r+0.09*s), 0);
    win.lookAt(Math.cos(a)*999, Math.sin(a)*999, 0);
    root.add(win);
  }

  // =============================================
  // ЦЕНТРАЛЬНАЯ КОЛОННА (ось вращения)
  // =============================================
  const axisGeo = new THREE.CylinderGeometry(0.045*s, 0.045*s, 1.4*s, 16);
  root.add(new THREE.Mesh(axisGeo, mat.dark));

  // Стыковочные узлы на концах оси
  [-0.7, 0.7].forEach(y => {
    // Конус-переходник
    const coneGeo = new THREE.CylinderGeometry(0.09*s, 0.045*s, 0.12*s, 12);
    const cone = new THREE.Mesh(coneGeo, mat.hull);
    cone.position.y = y*s;
    root.add(cone);

    // Стыковочное кольцо
    const ringGeo = new THREE.TorusGeometry(0.09*s, 0.012*s, 8, 24);
    const ring = new THREE.Mesh(ringGeo, mat.accent);
    ring.position.y = (y + Math.sign(y)*0.065)*s;
    ring.rotation.x = Math.PI/2;
    root.add(ring);

    // Навигационные огни
    const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.015*s, 8, 6), mat.light);
    navLight.position.y = (y + Math.sign(y)*0.09)*s;
    root.add(navLight);

    // PointLight на концах
    const ptLight = new THREE.PointLight(C.light, 1.5, s * 3);
    ptLight.position.y = (y + Math.sign(y)*0.09)*s;
    root.add(ptLight);
  });

  // =============================================
  // СПИЦЫ (соединяют тор с осью)
  // =============================================
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018*s, 0.018*s, 0.3*s, 8),
      mat.truss
    );
    spoke.rotation.z = Math.PI/2;
    spoke.position.set(Math.cos(a)*0.19*s, Math.sin(a)*0.19*s, 0);
    spoke.rotation.set(0, 0, Math.PI/2 + a);

    // Длина спицы — от оси (r=0.045*s) до тора (r=0.29*s)
    const len = 0.29*s;
    const spokeLong = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012*s, 0.012*s, len, 8),
      mat.truss
    );
    spokeLong.position.set(Math.cos(a)*((0.045 + 0.29/2)*s), Math.sin(a)*((0.045 + 0.29/2)*s), 0);
    // Поворот вдоль радиуса
    spokeLong.rotation.z = Math.PI/2 + a;
    root.add(spokeLong);
  }

  // =============================================
  // СОЛНЕЧНЫЕ БАТАРЕИ (4 крыла по 2 панели)
  // =============================================
  const solarAngles = [0, Math.PI/2, Math.PI, Math.PI*3/2];
  solarAngles.forEach(baseAngle => {
    [-1, 1].forEach(side => {
      const wing = new THREE.Group();

      // Ферма крыла
      const trussGeo = new THREE.CylinderGeometry(0.008*s, 0.008*s, 0.7*s, 6);
      trussGeo.rotateZ(Math.PI/2);
      const truss = new THREE.Mesh(trussGeo, mat.truss);
      truss.position.x = 0.35*s;
      wing.add(truss);

      // Панели (3 секции)
      for (let seg = 0; seg < 3; seg++) {
        const px = (0.1 + seg * 0.21)*s;
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(0.18*s, 0.28*s, 0.008*s),
          mat.solar
        );
        panel.position.set(px, 0, side * 0.15*s);
        wing.add(panel);

        // Рамка панели
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.185*s, 0.285*s, 0.005*s),
          mat.accent
        );
        frame.position.set(px, 0, side * 0.15*s - 0.007*s);
        wing.add(frame);
      }

      wing.position.set(0, 0, side * 0.08*s);
      wing.rotation.y = baseAngle;
      root.add(wing);
    });
  });

  // =============================================
  // МОДУЛИ — дополнительные блоки на оси
  // =============================================
  [-0.25, 0.25].forEach(y => {
    // Цилиндрический модуль
    const modGeo = new THREE.CylinderGeometry(0.07*s, 0.07*s, 0.22*s, 12);
    const mod = new THREE.Mesh(modGeo, mat.hull);
    mod.position.set(0, y*s, 0);
    root.add(mod);

    // Боковые антенны на модуле
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004*s, 0.002*s, 0.18*s, 5),
        mat.dark
      );
      ant.position.set(Math.cos(a)*0.07*s, y*s, Math.sin(a)*0.07*s);
      ant.rotation.z = Math.PI/2;
      ant.rotation.y = a;
      root.add(ant);
    }
  });

  // =============================================
  // СТЫКОВОЧНЫЙ ПОРТ (выдвинутый рукав)
  // =============================================
  const dockArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03*s, 0.03*s, 0.3*s, 10),
    mat.accent
  );
  dockArm.rotation.z = Math.PI/2;
  dockArm.position.set(0.52*s, 0.1*s, 0);
  root.add(dockArm);

  const dockRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.045*s, 0.01*s, 8, 20),
    mat.panel
  );
  dockRing.rotation.y = Math.PI/2;
  dockRing.position.set(0.68*s, 0.1*s, 0);
  root.add(dockRing);

  // =============================================
  // ТЕНИ И ФИНАЛ
  // =============================================
  root.traverse(m => {
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  });

  const { x, y, z } = manifest.position;
  root.position.set(x, y, z);

  scene.add(root);

  // Сохраняем скорость вращения для animate
  root.userData.rotSpeed = manifest.rotation;

  return root;
}