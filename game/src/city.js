// city.js — the deterministic city of LUMEN BAY.
// An 8x6 lattice of blocks: buildings, parks, plazas and named landmarks
// (Neon Mile, Hotel Lumen, Casino Royale, Lumen Tower, the stadium, the
// marina, the bank, Mara's Garage, Lumen Arms, the diner, Ray's Garage and
// the safehouse), with a beach and the sea along the south edge.
'use strict';
var City = {
  blocks: [], buildings: [], parks: [], signs: [], shops: [], landmarks: {},
  build: function (seed) {
    RNG.seed(seed || S.SEED);
    this.blocks = []; this.buildings = []; this.parks = []; this.signs = [];
    this.shops = []; this.landmarks = {};
    var pal = S.PALETTE.building;
    var named = {
      '3,2': 'mile', '4,2': 'hotel', '6,2': 'casino', '5,3': 'tower',
      '1,4': 'stadium', '7,4': 'marina', '0,1': 'bank', '2,4': 'garage',
      '6,0': 'arms', '1,2': 'diner', '5,0': 'ray', '0,4': 'safe'
    };
    for (var c = 0; c < S.COLS; c++) {
      for (var r = 0; r < S.ROWS; r++) {
        var bx = S.ROAD + c * S.P, by = S.ROAD + r * S.P;
        var key = c + ',' + r;
        var kind = named[key] || (RNG.chance(0.22) ? 'park' : (RNG.chance(0.12) ? 'plaza' : 'building'));
        var block = { c: c, r: r, x: bx, y: by, w: S.BLOCK, h: S.BLOCK, kind: kind };
        this.blocks.push(block);
        if (kind === 'park') {
          var park = { x: bx, y: by, w: S.BLOCK, h: S.BLOCK, trees: [] };
          for (var t = 0; t < 9; t++) park.trees.push({ x: bx + 24 + RNG.range(0, S.BLOCK - 48), y: by + 24 + RNG.range(0, S.BLOCK - 48), r: RNG.range(9, 16) });
          this.parks.push(park);
        } else if (kind === 'building' || kind === 'plaza') {
          var n = kind === 'plaza' ? 1 : (RNG.chance(0.5) ? 1 : 2);
          for (var b = 0; b < n; b++) {
            var bw = kind === 'plaza' ? S.BLOCK - 60 : RNG.range(90, 150);
            var bh = kind === 'plaza' ? 60 : RNG.range(80, 150);
            var bld = {
              x: bx + (kind === 'plaza' ? 30 : RNG.range(12, S.BLOCK - bw - 12)),
              y: by + (kind === 'plaza' ? 70 : RNG.range(12, S.BLOCK - bh - 12)),
              w: bw, h: bh, color: RNG.pick(pal), plaza: kind === 'plaza'
            };
            this.buildings.push(bld);
          }
        }
        if (named[key]) this.placeLandmark(named[key], bx, by);
      }
    }
    this.finishSigns();
  },
  placeLandmark: function (id, bx, by) {
    var cx = bx + S.BLOCK / 2, cy = by + S.BLOCK / 2;
    var L = this.landmarks;
    var neon = S.PALETTE.neon;
    if (id === 'mile') { L.mile = { x: cx, y: cy, label: 'NEON MILE' }; this.signs.push({ x: cx, y: by + 40, text: 'NEON MILE', color: neon.cyan, size: 26 }); }
    if (id === 'hotel') { L.hotel = { x: cx, y: cy, label: 'HOTEL LUMEN' }; this.signs.push({ x: cx, y: by + 40, text: 'HOTEL LUMEN', color: neon.yellow, size: 24 }); }
    if (id === 'casino') { L.casino = { x: cx, y: cy, label: 'CASINO ROYALE' }; this.signs.push({ x: cx, y: by + 40, text: 'CASINO ROYALE', color: neon.pink, size: 22 }); }
    if (id === 'tower') { L.tower = { x: cx, y: cy, label: 'LUMEN TOWER' }; this.signs.push({ x: cx, y: by + 40, text: 'LUMEN TOWER', color: '#e8e8f0', size: 20 }); }
    if (id === 'stadium') { L.stadium = { x: cx, y: cy, label: 'STADIUM' }; this.parks.push({ x: bx, y: by, w: S.BLOCK, h: S.BLOCK, trees: [], field: true }); }
    if (id === 'marina') { L.marina = { x: cx, y: cy, label: 'MARINA' }; this.signs.push({ x: cx, y: by + 40, text: 'MARINA', color: neon.cyan, size: 20 }); }
    if (id === 'bank') { L.bank = { x: cx, y: cy, label: 'LUMEN BAY BANK' }; this.signs.push({ x: cx, y: by + 40, text: 'BANK', color: neon.yellow, size: 22 }); }
    if (id === 'garage') { L.garage = { x: cx, y: cy, label: 'MARA\'S GARAGE' }; this.signs.push({ x: cx, y: by + 40, text: 'MARA\'S GARAGE', color: neon.orange, size: 18 }); }
    if (id === 'arms') { L.arms = { x: cx, y: cy, label: 'LUMEN ARMS' }; this.signs.push({ x: cx, y: by + 40, text: 'LUMEN ARMS', color: neon.green, size: 20 }); this.shops.push({ kind: 'gun', x: cx, y: cy, r: 90, label: 'LUMEN ARMS: buy weapon / ammo' }); }
    if (id === 'diner') { L.diner = { x: cx, y: cy, label: 'SUNSET DINER' }; this.signs.push({ x: cx, y: by + 40, text: 'DINER', color: neon.pink, size: 20 }); this.shops.push({ kind: 'diner', x: cx, y: cy, r: 90, label: 'SUNSET DINER: eat $20, heal +50' }); }
    if (id === 'ray') { L.ray = { x: cx, y: cy, label: 'RAY\'S GARAGE' }; this.signs.push({ x: cx, y: by + 40, text: 'RAY\'S GARAGE', color: neon.orange, size: 18 }); this.shops.push({ kind: 'garage', x: cx, y: cy, r: 90, label: 'RAY\'S GARAGE: repair $50 / NOS $30' }); }
    if (id === 'safe') { L.safe = { x: cx, y: cy, label: 'SAFEHOUSE' }; this.signs.push({ x: cx, y: by + 40, text: 'SAFEHOUSE', color: neon.green, size: 18 }); this.shops.push({ kind: 'safe', x: cx, y: cy, r: 90, label: 'SAFEHOUSE: heal + save' }); }
    // The harbor pier juts into the sea from the beach at the middle south.
    L.pier = { x: S.W / 2, y: S.CITY_H + S.BEACH + 40, label: 'HARBOR PIER' };
  },
  finishSigns: function () {
    // A few extra shop signs scattered on ordinary buildings.
    var extra = [
      { text: 'PIZZA', color: S.PALETTE.neon.yellow },
      { text: 'TATTOO', color: S.PALETTE.neon.orange },
      { text: 'BAR', color: S.PALETTE.neon.pink },
      { text: 'PIZZA', color: S.PALETTE.neon.cyan },
      { text: 'BAR', color: S.PALETTE.neon.purple }
    ];
    for (var i = 0; i < extra.length && i < this.buildings.length; i++) {
      var b = this.buildings[i * 3 % this.buildings.length];
      this.signs.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, text: extra[i].text, color: extra[i].color, size: 18 });
    }
  },
  // Query helpers.
  isRoad: function (x, y) {
    if (y >= S.CITY_H) return y < S.CITY_H + S.BEACH; // beach is open ground
    for (var i = 0; i <= S.COLS; i++) if (Math.abs(x - S.roadX(i)) <= S.ROAD / 2) return true;
    for (var j = 0; j <= S.ROWS; j++) if (Math.abs(y - S.roadY(j)) <= S.ROAD / 2) return true;
    return false;
  },
  collides: function (x, y, r) {
    if (x < r || y < r || x > S.W - r) return true;
    if (y > S.CITY_H + S.BEACH - r) return true; // the sea stops everyone
    for (var i = 0; i < this.buildings.length; i++) {
      var b = this.buildings[i];
      if (U.circleRect(x, y, r, b.x, b.y, b.w, b.h)) return true;
    }
    return false;
  },
  nearestRoadPoint: function (x, y) {
    var bx = U.clamp(x, S.ROAD, S.W - S.ROAD), by = U.clamp(y, S.ROAD, S.CITY_H - S.ROAD);
    var best = null, bd = 1e9;
    for (var i = 0; i <= S.COLS; i++) for (var j = 0; j <= S.ROWS; j++) {
      var px = S.roadX(i), py = S.roadY(j);
      var d = U.dist(bx, by, px, py);
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    return best;
  },
  randomRoadPoint: function () {
    var i = RNG.int(0, S.COLS), j = RNG.int(0, S.ROWS);
    return { x: S.roadX(i) + RNG.range(-14, 14), y: S.roadY(j) + RNG.range(-14, 14) };
  },
  randomIntersection: function () {
    return { x: S.roadX(RNG.int(0, S.COLS)), y: S.roadY(RNG.int(0, S.ROWS)) };
  }
};
