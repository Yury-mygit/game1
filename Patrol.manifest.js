// Patrol.manifest.js — патрульные корабли вокруг станции

const PatrolManifest = {
  // Тот же GLB что и у игрока
  file: "Ship.glb",
  rotation: { x: 0, y: Math.PI, z: 0 },
  scale: null, // авто, как у игрока

  // Количество патрульных
  count: 4,

  // Орбита вокруг точки StationManifest.position
  orbit: {
    radius:     220,   // радиус орбиты
    height:     30,    // макс. отклонение по Y
    speed:      0.18,  // радиан/сек (угловая скорость)
    // Каждый корабль смещён по фазе равномерно (2PI / count)
    tilt:       0.15,  // наклон плоскости орбиты (радиан)
  },

  // Выхлоп патрульных (копия из Ship.manifest, можно менять)
  particles: {
    count:           60,
    particleSize:    2.0,
    particleSizeVar: 4.5,

    normalSpawnRate:   0.012,
    normalSpeed:       7,
    normalSpeedVar:    4,
    normalLifetime:    0.3,
    normalLifetimeVar: 0.15,
    normalSpread:      1.2,

    boostSpawnRate:   0.012,
    boostSpeed:       7,
    boostSpeedVar:    4,
    boostLifetime:    0.3,
    boostLifetimeVar: 0.15,
    boostSpread:      1.2,

    damping: 0.96,

    normalColor1: "#0066dd",
    normalColor2: "#001199",
    normalColor3: "#66aaff",

    boostColor1: "#0066dd",
    boostColor2: "#001199",
    boostColor3: "#66aaff",
  },

  // Точки выхлопа (те же что у Ship.manifest)
  exhausts: [
    { x: -1.8, y: -0.3, z: 1.1, radius: 0.1 },
    { x:  0.0, y: -0.3, z: 1.1, radius: 0.1 },
    { x:  1.8, y: -0.3, z: 1.1, radius: 0.1 },
  ],
};