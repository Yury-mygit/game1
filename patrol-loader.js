// patrol-loader.js — патрульные корабли, читает PatrolManifest + StationManifest

function loadPatrol(scene, manifest, stationManifest, onReady) {
  const p      = manifest.particles;
  const orbit  = manifest.orbit;
  const center = new THREE.Vector3(
    stationManifest.position.x,
    stationManifest.position.y,
    stationManifest.position.z
  );

  // =====================
  // EXHAUST — копия логики из ship-loader
  // =====================
  function createExhaustSystem(exhaustDefs) {
    return exhaustDefs.map(def => {
      const COUNT = p.count;
      const positions  = new Float32Array(COUNT * 3);
      const velocities = new Float32Array(COUNT * 3);
      const ages       = new Float32Array(COUNT);
      const lifetimes  = new Float32Array(COUNT);
      const sizes      = new Float32Array(COUNT);
      for (let i = 0; i < COUNT; i++) { ages[i] = 999; lifetimes[i] = 1; }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor1:  { value: new THREE.Color(p.normalColor1) },
          uColor2:  { value: new THREE.Color(p.normalColor2) },
          uColor3:  { value: new THREE.Color(p.normalColor3) },
          uSize:    { value: p.particleSize },
          uSizeVar: { value: p.particleSizeVar },
          uOpacity: { value: 1.0 },
        },
        vertexShader: `
          attribute float size;
          varying float vAge;
          uniform float uSize;
          uniform float uSizeVar;
          void main() {
            vAge = size;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (uSize + (1.0 - size) * uSizeVar) * (300.0 / -mvPos.z);
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform vec3 uColor3;
          uniform float uOpacity;
          varying float vAge;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            if (d > 0.5) discard;
            float alpha = (1.0 - d * 2.0) * (1.0 - d * 2.0);
            vec3 col = mix(uColor3, uColor1, vAge);
            col = mix(col, uColor2, smoothstep(0.5, 1.0, vAge));
            gl_FragColor = vec4(col, alpha * (1.0 - vAge) * uOpacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      scene.add(points);

      return { def, points, geo, mat, positions, velocities, ages, lifetimes, sizes, COUNT, spawnTimer: 0 };
    });
  }

  function updateExhaust(systems, shipGroup, dt) {
    systems.forEach(sys => {
      const { def, positions, velocities, ages, lifetimes, sizes, COUNT } = sys;
      const worldPos  = new THREE.Vector3(def.x, def.y, def.z).applyMatrix4(shipGroup.matrixWorld);
      const worldBack = new THREE.Vector3(0, 0, 1).applyQuaternion(shipGroup.quaternion);

      sys.spawnTimer += dt;
      while (sys.spawnTimer > p.normalSpawnRate) {
        sys.spawnTimer -= p.normalSpawnRate;
        for (let i = 0; i < COUNT; i++) {
          if (ages[i] >= lifetimes[i]) {
            positions[i*3]   = worldPos.x + (Math.random()-0.5)*def.radius;
            positions[i*3+1] = worldPos.y + (Math.random()-0.5)*def.radius;
            positions[i*3+2] = worldPos.z + (Math.random()-0.5)*def.radius;
            const spd = p.normalSpeed + Math.random()*p.normalSpeedVar;
            velocities[i*3]   = worldBack.x*spd + (Math.random()-0.5)*p.normalSpread;
            velocities[i*3+1] = worldBack.y*spd + (Math.random()-0.5)*p.normalSpread;
            velocities[i*3+2] = worldBack.z*spd + (Math.random()-0.5)*p.normalSpread;
            ages[i] = 0;
            lifetimes[i] = p.normalLifetime + Math.random()*p.normalLifetimeVar;
            break;
          }
        }
      }

      for (let i = 0; i < COUNT; i++) {
        if (ages[i] < lifetimes[i]) {
          ages[i] += dt;
          positions[i*3]   += velocities[i*3]   * dt;
          positions[i*3+1] += velocities[i*3+1] * dt;
          positions[i*3+2] += velocities[i*3+2] * dt;
          velocities[i*3]   *= p.damping;
          velocities[i*3+1] *= p.damping;
          velocities[i*3+2] *= p.damping;
          sizes[i] = Math.min(ages[i] / lifetimes[i], 1.0);
        } else {
          sizes[i] = 1.0;
          positions[i*3] = positions[i*3+1] = positions[i*3+2] = 0;
        }
      }
      sys.geo.attributes.position.needsUpdate = true;
      sys.geo.attributes.size.needsUpdate = true;
    });
  }

  // =====================
  // ЗАГРУЗКА GLB + КЛОНИРОВАНИЕ
  // =====================
  const loader = new THREE.GLTFLoader();

  loader.load(
    manifest.file,

    function(gltf) {
      const ships = [];

      for (let i = 0; i < manifest.count; i++) {
        // Клонируем сцену из GLB
        const model = gltf.scene.clone(true);

        const bbox  = new THREE.Box3().setFromObject(model);
        const size  = bbox.getSize(new THREE.Vector3());
        const scale = manifest.scale || (8 / Math.max(size.x, size.y, size.z));
        model.scale.setScalar(scale);

        bbox.setFromObject(model);
        model.position.sub(bbox.getCenter(new THREE.Vector3()));

        if (manifest.rotation)
          model.rotation.set(manifest.rotation.x, manifest.rotation.y, manifest.rotation.z);

        model.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

        const group = new THREE.Group();
        group.add(model);

        // Начальная фаза — равномерно по кругу
        const phase = (i / manifest.count) * Math.PI * 2;
        group.position.copy(center).add(new THREE.Vector3(
          Math.cos(phase) * orbit.radius,
          Math.sin(phase * 0.5) * orbit.height,
          Math.sin(phase) * orbit.radius
        ));
        scene.add(group);

        const exhaustSystems = createExhaustSystem(manifest.exhausts);

        ships.push({
          group,
          exhaustSystems,
          phase,           // текущий угол орбиты
        });
      }

            onReady({
        groups: ships.map(ship => ship.group),

        update: function(dt) {
          ships.forEach(ship => {
            ship.phase += orbit.speed * dt;
            const a = ship.phase;

            // Позиция по орбите с лёгким наклоном
            const x = Math.cos(a) * orbit.radius;
            const y = Math.sin(a * 0.7 + ship.phase * 0.3) * orbit.height;
            const z = Math.sin(a) * orbit.radius;

            const newPos = center.clone().add(new THREE.Vector3(x, y, z));
            const prevPos = ship.group.position.clone();
            ship.group.position.copy(newPos);

            // Корабль смотрит в направлении движения
            const dir = newPos.clone().sub(prevPos).normalize();
            if (dir.lengthSq() > 0.0001) {
              const target = newPos.clone().add(dir);
              ship.group.lookAt(target);
              // Компенсируем поворот модели (нос по -Z)
              ship.group.rotateY(Math.PI);
            }

            // Обновляем выхлоп
            ship.group.updateMatrixWorld(true);
            updateExhaust(ship.exhaustSystems, ship.group, dt);
          });
        }
      });
    },

    null,

    function(err) {
      console.error('Patrol GLTFLoader:', err);
      onReady({ update: () => {} });
    }
  );
}