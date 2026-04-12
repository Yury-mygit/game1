// ship-loader.js — универсальный загрузчик, читает ShipManifest

function loadShip(scene, manifest, onReady) {
  const p = manifest.particles;

  // =====================
  // EXHAUST PARTICLES
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
          uOpacity: { value: 0.0 },
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
      return { def, points, geo, mat, positions, velocities, ages, lifetimes, sizes, COUNT, spawnTimer: 0 };
    });
  }

  function updateExhausts(systems, shipGroup, dt, isThrusting, isBoost) {
    systems.forEach(sys => {
      const { def, mat, positions, velocities, ages, lifetimes, sizes, COUNT } = sys;
      const worldPos  = new THREE.Vector3(def.x, def.y, def.z).applyMatrix4(shipGroup.matrixWorld);
      const worldBack = new THREE.Vector3(0, 0, 1).applyQuaternion(shipGroup.quaternion);

      if (isThrusting) {
        sys.spawnTimer += dt;
        const rate = isBoost ? p.boostSpawnRate : p.normalSpawnRate;
        while (sys.spawnTimer > rate) {
          sys.spawnTimer -= rate;
          for (let i = 0; i < COUNT; i++) {
            if (ages[i] >= lifetimes[i]) {
              positions[i*3]   = worldPos.x + (Math.random()-0.5)*def.radius;
              positions[i*3+1] = worldPos.y + (Math.random()-0.5)*def.radius;
              positions[i*3+2] = worldPos.z + (Math.random()-0.5)*def.radius;
              const spd    = isBoost ? p.boostSpeed + Math.random()*p.boostSpeedVar
                                     : p.normalSpeed + Math.random()*p.normalSpeedVar;
              const spread = isBoost ? p.boostSpread : p.normalSpread;
              velocities[i*3]   = worldBack.x*spd + (Math.random()-0.5)*spread;
              velocities[i*3+1] = worldBack.y*spd + (Math.random()-0.5)*spread;
              velocities[i*3+2] = worldBack.z*spd + (Math.random()-0.5)*spread;
              ages[i] = 0;
              lifetimes[i] = isBoost ? p.boostLifetime  + Math.random()*p.boostLifetimeVar
                                      : p.normalLifetime + Math.random()*p.normalLifetimeVar;
              break;
            }
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
      mat.uniforms.uOpacity.value = isThrusting ? 1.0 : 0.0;
      const c = isBoost ? p : { color1: p.normalColor1, color2: p.normalColor2, color3: p.normalColor3 };
      mat.uniforms.uColor1.value.set(isBoost ? p.boostColor1 : p.normalColor1);
      mat.uniforms.uColor2.value.set(isBoost ? p.boostColor2 : p.normalColor2);
      mat.uniforms.uColor3.value.set(isBoost ? p.boostColor3 : p.normalColor3);
    });
  }

  // =====================
  // PLASMA PROJECTILES
  // =====================
  function createPlasmaSystem(weaponDefs, plasmaConf) {
    const projectiles = [];
    const group = new THREE.Group();
    group.frustumCulled = false;
    scene.add(group);

    // Материал ядра
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(plasmaConf.color),
      transparent: true,
      opacity: 1.0,
    });
    // Материал свечения (больший полупрозрачный шар)
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(plasmaConf.glowColor),
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });

    const coreGeo = new THREE.SphereGeometry(plasmaConf.size, 10, 8);
    const glowGeo = new THREE.SphereGeometry(plasmaConf.size * plasmaConf.glowSize, 10, 8);

    let altIndex = 0; // для fireMode: alternate

    function fire(shipGroup) {
      const wConf = plasmaConf;
      let origins = [];

      if (wConf.fireMode === 'salvo') {
        origins = weaponDefs;
      } else {
        // alternate — по очереди
        origins = [ weaponDefs[altIndex % weaponDefs.length] ];
        altIndex++;
      }

      origins.forEach(def => {
        const core = new THREE.Mesh(coreGeo, coreMat.clone());
        const glow = new THREE.Mesh(glowGeo, glowMat.clone());
        const shell = new THREE.Group();
        shell.add(core);
        shell.add(glow);
        group.add(shell);

        // Мировая позиция точки вылета
        const worldPos = new THREE.Vector3(def.x, def.y, def.z).applyMatrix4(shipGroup.matrixWorld);
        shell.position.copy(worldPos);

        // Направление — вперёд корабля (-Z)
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);

        projectiles.push({
          shell,
          velocity: dir.multiplyScalar(wConf.speed),
          age: 0,
          lifetime: wConf.lifetime,
        });
      });
    }

    function update(dt) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.age += dt;

        if (proj.age >= proj.lifetime) {
          group.remove(proj.shell);
          projectiles.splice(i, 1);
          continue;
        }

        proj.shell.position.addScaledVector(proj.velocity, dt);

        // Пульсация и затухание к концу жизни
        const t = proj.age / proj.lifetime;
        const pulse = 1.0 + Math.sin(proj.age * 25) * 0.08;
        proj.shell.scale.setScalar(pulse);
        // Гаснет в последние 20% жизни
        const fade = t > 0.8 ? 1.0 - (t - 0.8) / 0.2 : 1.0;
        proj.shell.children[0].material.opacity = fade;
        proj.shell.children[1].material.opacity = 0.35 * fade;
      }
    }

    return { fire, update };
  }

  // =====================
  // SOUND
  // =====================
  function createSoundSystem(soundConf) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sounds = {};

    function loadSound(key, conf) {
      fetch(conf.file)
        .then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.arrayBuffer();
        })
        .then(buf => audioCtx.decodeAudioData(buf))
        .then(decoded => {
          sounds[key] = { buffer: decoded, conf, source: null, gainNode: null };
          if (conf.loop) startLoop(key);
        })
        .catch(err => console.warn(`Sound "${conf.file}" not loaded:`, err));
    }

    function startLoop(key) {
      const s = sounds[key];
      if (!s || s.source) return;
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // стартуем тихо
      gain.connect(audioCtx.destination);
      const src = audioCtx.createBufferSource();
      src.buffer = s.buffer;
      src.loop = true;
      src.playbackRate.value = s.conf.pitchIdle || 1.0;
      src.connect(gain);
      src.start();
      s.source   = src;
      s.gainNode = gain;
    }

    function playOnce(key) {
      const s = sounds[key];
      if (!s) return;
      // Разблокируем AudioContext после жеста пользователя
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const gain = audioCtx.createGain();
      gain.gain.value = s.conf.volume || 1.0;
      gain.connect(audioCtx.destination);
      const src = audioCtx.createBufferSource();
      src.buffer = s.buffer;
      src.connect(gain);
      src.start();
    }

    function updateEngine(isThrusting, isBoost) {
      const s = sounds['engine'];
      if (!s || !s.source) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const conf = s.conf;
      const targetVol   = isThrusting ? conf.volume : conf.volume * 0.3;
      const targetPitch = isBoost ? conf.pitchBoost : isThrusting ? conf.pitchThrust : conf.pitchIdle;
      // Плавное изменение
      s.gainNode.gain.setTargetAtTime(targetVol,   audioCtx.currentTime, 0.1);
      s.source.playbackRate.setTargetAtTime(targetPitch, audioCtx.currentTime, 0.15);
    }

    // Загружаем все звуки из манифеста
    Object.entries(soundConf).forEach(([key, conf]) => loadSound(key, conf));

    return { playOnce, updateEngine };
  }

  // =====================
  // GLB ЗАГРУЗКА
  // =====================
  const statusEl = document.getElementById('load-status');
  const loader   = new THREE.GLTFLoader();

  const placeholder = new THREE.Group();
  placeholder.add(new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x445566, wireframe: true })
  ));
  placeholder.position.set(0, 20, 60);
  scene.add(placeholder);

  loader.load(
    manifest.file,

    function(gltf) {
      scene.remove(placeholder);
      const model = gltf.scene;

      const bbox  = new THREE.Box3().setFromObject(model);
      const size  = bbox.getSize(new THREE.Vector3());
      const scale = manifest.scale || (8 / Math.max(size.x, size.y, size.z));
      model.scale.setScalar(scale);
      bbox.setFromObject(model);
      model.position.sub(bbox.getCenter(new THREE.Vector3()));

      if (manifest.rotation)
        model.rotation.set(manifest.rotation.x, manifest.rotation.y, manifest.rotation.z);

      model.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

      const shipGroup = new THREE.Group();
      shipGroup.add(model);
      shipGroup.position.set(0, 20, 60);
      scene.add(shipGroup);

      // Системы
      const exhaustSystems = createExhaustSystem(manifest.exhausts);
      exhaustSystems.forEach(sys => scene.add(sys.points));

      const plasmaSystem = createPlasmaSystem(manifest.weapons, manifest.plasma);
      const soundSystem  = createSoundSystem(manifest.sounds);

      if (statusEl) statusEl.style.display = 'none';

      onReady({
        group: shipGroup,

        updateExhausts: (dt, isThrusting, isBoost) => {
          shipGroup.updateMatrixWorld(true);
          updateExhausts(exhaustSystems, shipGroup, dt, isThrusting, isBoost);
        },

        fire: () => {
          plasmaSystem.fire(shipGroup);
          soundSystem.playOnce('shoot');
        },

        updatePlasma: (dt) => plasmaSystem.update(dt),

        updateEngine: (isThrusting, isBoost) => soundSystem.updateEngine(isThrusting, isBoost),
      });
    },

    function(xhr) {
      if (statusEl && xhr.total)
        statusEl.textContent = `Загрузка... ${Math.round(xhr.loaded / xhr.total * 100)}%`;
    },

    function(err) {
      console.error('GLTFLoader:', err);
      if (statusEl) statusEl.textContent = 'Ошибка загрузки ' + manifest.file;
      onReady({ group: placeholder, updateExhausts: ()=>{}, fire: ()=>{}, updatePlasma: ()=>{}, updateEngine: ()=>{} });
    }
  );
}