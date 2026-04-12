// Station.manifest.js — космическая станция (процедурная геометрия)

const StationManifest = {
  // null = нет GLB, рисуем процедурно
  file: null,

  // Позиция в сцене
  position: { x: 300, y: 0, z: -200 },

  // Масштаб (корабль ~8 единиц, станция в 20 раз больше = 160)
  scale: 160,

  // Медленное вращение (радиан/сек)
  rotation: {
    x: 0.0,
    y: 0.0003,
    z: 0.0001,
  },

  // Цвета секций
  colors: {
    hull:    "#8899aa",
    dark:    "#445566",
    panel:   "#aabbcc",
    accent:  "#334455",
    window:  "#4488ff",
    light:   "#ff9944",
  },
};