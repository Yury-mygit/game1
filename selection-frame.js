function createSelectionFrame(scene) {
  const material = new THREE.LineBasicMaterial({
    color: 0x33ff66,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    depthWrite: false
  });

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(16 * 3); // 8 линий * 2 точки
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const lines = new THREE.LineSegments(geometry, material);
  lines.visible = false;
  lines.renderOrder = 999;
  scene.add(lines);

  let target = null;
  let currentSize = 1;

  function rebuildCornerGeometry(size) {
    currentSize = size;

    const half = size * 0.5;
    const corner = size * 0.22;

    const points = [
      // top-left
      [-half,  half, 0], [-half + corner,  half, 0],
      [-half,  half, 0], [-half,  half - corner, 0],

      // top-right
      [ half,  half, 0], [ half - corner,  half, 0],
      [ half,  half, 0], [ half,  half - corner, 0],

      // bottom-left
      [-half, -half, 0], [-half + corner, -half, 0],
      [-half, -half, 0], [-half, -half + corner, 0],

      // bottom-right
      [ half, -half, 0], [ half - corner, -half, 0],
      [ half, -half, 0], [ half, -half + corner, 0],
    ];

    const attr = geometry.attributes.position;
    for (let i = 0; i < points.length; i++) {
      attr.setXYZ(i, points[i][0], points[i][1], points[i][2]);
    }
    attr.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  function getTargetBounds(object) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxSide = Math.max(size.x, size.y, size.z);

    return {
      center,
      size: Math.max(maxSide * 1.15, 2.5)
    };
  }

  function attachTo(object) {
    target = object;
    lines.visible = !!target;

    if (!target) return;

    const bounds = getTargetBounds(target);
    if (!bounds) {
      clear();
      return;
    }

    rebuildCornerGeometry(bounds.size);
    lines.position.copy(bounds.center);
  }

  function clear() {
    target = null;
    lines.visible = false;
  }

  function update(camera) {
    if (!target || !lines.visible) return;

    const bounds = getTargetBounds(target);
    if (!bounds) {
      clear();
      return;
    }

    if (Math.abs(bounds.size - currentSize) > 0.01) {
      rebuildCornerGeometry(bounds.size);
    }

    lines.position.copy(bounds.center);
    lines.quaternion.copy(camera.quaternion);
  }

  return {
    attachTo,
    clear,
    update
  };
}