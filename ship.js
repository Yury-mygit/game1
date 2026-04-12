// ship.js — загрузка GLB модели через GLTFLoader
// Экспортирует функцию initShip(scene, onReady)
// onReady({ group, thrustMeshes }) вызывается после загрузки

function initShip(scene, onReady) {
  const loader = new THREE.GLTFLoader();

  // Placeholder — виден пока грузится GLB
  const placeholder = new THREE.Group();
  const phMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, metalness: 0.5, wireframe: true });
  const phMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), phMat);
  placeholder.add(phMesh);
  placeholder.position.set(0, 20, 60);
  scene.add(placeholder);

  // Показываем статус загрузки
  const statusEl = document.getElementById('load-status');

  loader.load(
    'Ship.glb',

    // onLoad
    function(gltf) {
      scene.remove(placeholder);

      const model = gltf.scene;

      // Масштаб и позиция — подстроим по размеру модели
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 8 / maxDim; // нормализуем до ~8 единиц
      model.scale.setScalar(scale);

      // Центрируем по bbox
      bbox.setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // Тени
      model.traverse(m => {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      // Разворачиваем нос вперёд (по -Z)
      model.rotation.y = Math.PI;

      const shipGroup = new THREE.Group();
      shipGroup.add(model);
      shipGroup.position.set(0, 20, 60);
      scene.add(shipGroup);

      if (statusEl) statusEl.style.display = 'none';

      // Выхлопные конусы — добавляем программно сзади
      const thrustMat = new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0 });
      const thrustMeshes = [];
      [-1.2, 0, 1.2].forEach(x => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.5, 10), thrustMat.clone());
        cone.rotation.x = -Math.PI / 2;
        // Позиция в локальных координатах корабля — сзади
        cone.position.set(x * scale * 2, 0, size.z * scale * 0.5 + 1.5);
        shipGroup.add(cone);
        thrustMeshes.push(cone);
      });

      onReady({ group: shipGroup, thrustMeshes });
    },

    // onProgress
    function(xhr) {
      if (statusEl && xhr.total) {
        const pct = Math.round(xhr.loaded / xhr.total * 100);
        statusEl.textContent = `Загрузка модели... ${pct}%`;
      }
    },

    // onError
    function(err) {
      console.error('GLTFLoader error:', err);
      if (statusEl) statusEl.textContent = 'Ошибка загрузки Ship.glb';
      // Фоллбэк — оставляем placeholder как корабль
      onReady({ group: placeholder, thrustMeshes: [] });
    }
  );
}