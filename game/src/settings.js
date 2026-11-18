// settings.js — constants, palette and small math helpers for LUMEN BAY.
// The city is an 8x6 grid of blocks on a road lattice; the south edge is a
// beach and the sea. The clock runs 18:40 dusk into 20:00 neon night.
'use strict';
var S = {
  SEED: 1337,
  BLOCK: 220, ROAD: 64, COLS: 8, ROWS: 6,
  P: 284, // block + road pitch
  W: 2336, CITY_H: 1768, BEACH: 110, SEA: 190,
  H: 2068,
  CLOCK_START: 1120, // 18:40 in minutes
  CLOCK_RATE: 1, // game minutes per real second
  SAVE_KEY: 'lumen-bay-save-v1',
  PALETTE: {
    ground: '#221d2b', asphalt: '#2e2938', roadEdge: '#453d55',
    sidewalk: '#4c435c', building: ['#5d4a6d', '#6b5570', '#4e5a6e', '#715a4a', '#54486b', '#3f4a5a', '#65504e'],
    park: '#3d6b38', parkDark: '#2c4f2a', tree: '#2f5230', tree2: '#4a7a42',
    sand: '#b99b6b', sea: '#1d4a6e', sea2: '#25638f',
    neon: { cyan: '#27e8ff', yellow: '#ffd93b', pink: '#ff4fd8', purple: '#b26bff', orange: '#ff8a3c', green: '#54ff9f' },
    taxi: '#ffd93b', pd: '#2b3a55', pdLight: '#ff3b30'
  },
  WEAPONS: [
    { name: 'PISTOL', dmg: 34, rate: 0.28, spread: 0.03, range: 560, auto: false, price: 0, ammoPrice: 0, ammoPack: 0 },
    { name: 'SMG', dmg: 16, rate: 0.085, spread: 0.085, range: 430, auto: true, price: 300, ammoPrice: 40, ammoPack: 60 },
    { name: 'SHOTGUN', dmg: 13, pellets: 6, rate: 0.7, spread: 0.2, range: 300, auto: false, price: 500, ammoPrice: 50, ammoPack: 12 },
    { name: 'RIFLE', dmg: 70, rate: 0.5, spread: 0.012, range: 820, auto: false, price: 800, ammoPrice: 60, ammoPack: 10 }
  ],
  MISSIONS: [
    { name: 'First Wheels', brief: 'Steal a car and deliver it to Mara\'s Garage.', reward: 200 },
    { name: 'Neon Courier', brief: 'Hit 3 checkpoints in 90 seconds.', reward: 350 },
    { name: 'Protection Money', brief: 'Collect from Lumen Arms, the diner and Ray\'s Garage.', reward: 400 },
    { name: 'Heat Wave', brief: 'Raise 3 stars of heat, then lose it and reach the safehouse.', reward: 450 },
    { name: 'The Big Score', brief: 'Crack the bank vault, then escape to the Harbor Pier.', reward: 800 },
    { name: 'Midnight Race', brief: 'Beat 5 checkpoints in 120 seconds.', reward: 500 },
    { name: 'King of the Bay', brief: 'Destroy Reyes\' 3-SUV convoy.', reward: 1000 }
  ],
  // Road centre lines: roadX(i) for i in 0..COLS, roadY(j) for j in 0..ROWS.
  roadX: function (i) { return S.ROAD / 2 + i * S.P; },
  roadY: function (j) { return S.ROAD / 2 + j * S.P; }
};

// Small math helpers shared by every module.
var U = {
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp: function (a, b, t) { return a + (b - a) * t; },
  dist: function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); },
  angTo: function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  angDiff: function (a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  turnToward: function (a, b, maxStep) {
    var d = U.angDiff(a, b);
    if (d > maxStep) return a + maxStep;
    if (d < -maxStep) return a - maxStep;
    return b;
  },
  circleRect: function (cx, cy, r, rx, ry, rw, rh) {
    var nx = U.clamp(cx, rx, rx + rw), ny = U.clamp(cy, ry, ry + rh);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  },
  fmtClock: function (min) {
    var h = Math.floor(min / 60) % 24, m = Math.floor(min) % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  },
  darkness: function (min) { return U.clamp((min - 1110) / 90, 0, 1); }
};
