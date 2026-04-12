// Ship.manifest.js — описание корабля SpaceCraft

const ShipManifest = {
  file: "Ship.glb",

  rotation: { x: 0, y: Math.PI, z: 0 },
  scale: null,

  // Точки выхлопа
  exhausts: [
    { x: -1.8, y: -0.3, z: 1.1, radius: 0.1 },
    { x:  0.0, y: -0.3, z: 1.1, radius: 0.1 },
    { x:  1.8, y: -0.3, z: 1.1, radius: 0.1 },
  ],

  // Параметры частиц выхлопа
  particles: {
    count:           120,
    particleSize:    2.7,
    particleSizeVar: 6.0,

    normalSpawnRate:   0.008,
    normalSpeed:       8,
    normalSpeedVar:    6,
    normalLifetime:    0.35,
    normalLifetimeVar: 0.2,
    normalSpread:      1.5,

    boostSpawnRate:   0.004,
    boostSpeed:       18,
    boostSpeedVar:    12,
    boostLifetime:    0.25,
    boostLifetimeVar: 0.15,
    boostSpread:      1.5,

    damping: 0.97,

    normalColor1: "#0088ff",
    normalColor2: "#0011ff",
    normalColor3: "#88ddff",

    boostColor1: "#aaddff",
    boostColor2: "#0011ff",
    boostColor3: "#ffffff",
  },

  // Точки вылета снарядов (локальные координаты корабля)
  weapons: [
    { x: -1.6, y: -0.1, z: -1.2 },
    { x:  1.6, y: -0.1, z: -1.2 },
  ],

  // Параметры плазменного заряда
  plasma: {
    speed:        180,    // единиц/сек
    size:         0.35,   // радиус сгустка
    lifetime:     3.0,    // сек до исчезновения
    color:        "#00ffcc",
    glowColor:    "#004433",
    glowSize:     1.1,    // множитель размера свечения
    // Огонь поочерёдно из каждой точки или залпом
    // "alternate" — по очереди, "salvo" — одновременно
    fireMode:     "alternate",
  },

  // Звуки
  sounds: {
    engine: {
      file:        "sound_engine.ogg",
      volume:      0.5,
      pitchIdle:   0.6,   // питч на холостом ходу
      pitchThrust: 1.0,   // питч при тяге
      pitchBoost:  1.4,   // питч при форсаже
      loop:        true,
    },
    shoot: {
      file:        "sound_shoot.ogg",
      volume:      0.8,
      loop:        false,
    },
  },
};