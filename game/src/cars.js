// cars.js — traffic, parked cars, police pursuit and the PD helicopter.
// Traffic follows the road grid between intersections; police chase and ram;
// the AIR-1 helicopter orbits from 4 wanted stars and can be shot down.
'use strict';
var Cars = {
  traffic: [], parked: [], police: [], heli: null, heliTimer: 0,
  MODELS: [
    { name: 'sedan', w: 46, h: 22, max: 150 },
    { name: 'coupe', w: 44, h: 21, max: 175 },
    { name: 'taxi', w: 46, h: 22, max: 160 },
    { name: 'van', w: 52, h: 24, max: 130 },
    { name: 'suv', w: 50, h: 24, max: 155 },
    { name: 'sport', w: 44, h: 21, max: 200 }
  ],
  COLORS: ['#c0392b', '#2980b9', '#7f8c8d', '#e67e22', '#16a085', '#8e44ad', '#bdc3c7', '#2c3e50'],
  makeCar: function (x, y, ang, model, color) {
    return { x: x, y: y, ang: ang, speed: 0, color: color, model: model, hp: 100, smoke: 0, wp: null, ramCd: 0, dead: false };
  },
  spawnAll: function () {
    this.traffic = []; this.parked = []; this.police = []; this.heli = null; this.heliTimer = 0;
    for (var i = 0; i < 10; i++) {
      var p = City.randomRoadPoint();
      var c = this.makeCar(p.x, p.y, RNG.range(0, Math.PI * 2), RNG.pick(this.MODELS), RNG.pick(this.COLORS));
      c.wp = City.randomIntersection();
      c.speed = RNG.range(70, 110);
      this.traffic.push(c);
    }
    for (var j = 0; j < 8; j++) {
      var q = City.randomRoadPoint();
      var parked = this.makeCar(q.x, q.y, RNG.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), RNG.pick(this.MODELS), RNG.pick(this.COLORS));
      parked.parked = true;
      this.parked.push(parked);
    }
  },
  updateTraffic: function (dt) {
    for (var i = 0; i < this.traffic.length; i++) {
      var c = this.traffic[i];
      if (c.dead) continue;
      var d = U.dist(c.x, c.y, c.wp.x, c.wp.y);
      if (d < 20) { c.wp = this.nextIntersection(c.wp); continue; }
      var want = U.angTo(c.x, c.y, c.wp.x, c.wp.y);
      c.ang = U.turnToward(c.ang, want, 2.6 * dt);
      var slow = false;
      for (var j = 0; j < this.traffic.length; j++) {
        if (j === i) continue;
        var o = this.traffic[j];
        var od = U.dist(c.x, c.y, o.x, o.y);
        if (od < 64 && Math.abs(U.angDiff(c.ang, U.angTo(c.x, c.y, o.x, o.y))) < 0.6) { slow = true; break; }
      }
      var target = slow ? 30 : 100;
      c.speed += U.clamp(target - c.speed, -160 * dt, 120 * dt);
      this.moveCar(c, dt);
    }
  },
  nextIntersection: function (wp) {
    var ci = Math.round((wp.x - S.ROAD / 2) / S.P), ri = Math.round((wp.y - S.ROAD / 2) / S.P);
    var opts = [];
    if (ci > 0) opts.push([ci - 1, ri]);
    if (ci < S.COLS) opts.push([ci + 1, ri]);
    if (ri > 0) opts.push([ci, ri - 1]);
    if (ri < S.ROWS) opts.push([ci, ri + 1]);
    var p = RNG.pick(opts);
    return { x: S.roadX(p[0]), y: S.roadY(p[1]) };
  },
  moveCar: function (c, dt) {
    var nx = c.x + Math.cos(c.ang) * c.speed * dt;
    var ny = c.y + Math.sin(c.ang) * c.speed * dt;
    if (!City.collides(nx, c.y, 16)) c.x = nx; else c.speed *= 0.4;
    if (!City.collides(c.x, ny, 16)) c.y = ny; else c.speed *= 0.4;
    if (c.hp < 55) c.smoke += dt;
  },
  drivePlayer: function (dt) {
    var car = G.hero.inCar, keys = G.input.keys;
    if (!car) return;
    var accel = 0;
    if (keys.KeyW) accel += 260;
    if (keys.KeyS) accel -= 200;
    var nos = keys.ShiftLeft && G.hero.nos > 0 && car.speed > 40;
    if (nos) { accel += 260; G.hero.nos = Math.max(0, G.hero.nos - 30 * dt); }
    car.speed += accel * dt;
    if (!keys.KeyW && !keys.KeyS) car.speed *= Math.pow(0.4, dt);
    var max = nos ? 540 : 360;
    car.speed = U.clamp(car.speed, -120, max);
    var steer = (keys.KeyA ? -1 : 0) + (keys.KeyD ? 1 : 0);
    var dir = car.speed >= 0 ? 1 : -1;
    car.ang += steer * 2.4 * dt * U.clamp(Math.abs(car.speed) / 120, 0, 1) * dir;
    var px = car.x, py = car.y;
    this.moveCar(car, dt);
    if (Math.abs(car.speed) > 200 && (car.x === px || car.y === py)) {
      // Hard hit on a building: damage and shake.
      car.hp -= 4; car.speed *= 0.5; G.cam.shake = 6;
      if (car.hp <= 0) this.wreckPlayerCar();
    }
    G.hero.x = car.x; G.hero.y = car.y; G.hero.ang = car.ang; G.hero.speed = car.speed;
    Radio.engine(car.speed, nos);
  },
  wreckPlayerCar: function () {
    var car = G.hero.inCar;
    if (!car) return;
    this.explode(car.x, car.y);
    G.hero.inCar = null; G.hero.x = car.x + 30; G.hero.y = car.y;
    G.msg = 'Your car is wrecked!'; G.msgTimer = 3;
  },
  explode: function (x, y) {
    for (var i = 0; i < 26; i++) {
      G.particles.push({ x: x, y: y, vx: RNG.range(-160, 160), vy: RNG.range(-160, 160), life: RNG.range(0.4, 1.1), max: 1.1, size: RNG.range(4, 12), color: RNG.pick(['#ff8a3c', '#ffd93b', '#888', '#ff3b30']) });
    }
    Radio.sfx('crash');
  },
  ensurePolice: function () {
    var want = Math.min(G.wanted, 4);
    while (this.police.length < want) {
      var p = City.randomRoadPoint();
      var tries = 0;
      while (U.dist(p.x, p.y, G.hero.x, G.hero.y) < 480 && tries++ < 12) p = City.randomRoadPoint();
      var pc = this.makeCar(p.x, p.y, 0, this.MODELS[0], S.PALETTE.pd);
      pc.police = true; pc.speed = 200;
      this.police.push(pc);
    }
    if (G.wanted === 0 && this.police.length) this.police.pop();
  },
  updatePolice: function (dt) {
    for (var i = this.police.length - 1; i >= 0; i--) {
      var c = this.police[i];
      var d = U.dist(c.x, c.y, G.hero.x, G.hero.y);
      if (G.wanted === 0 && d > 900) { this.police.splice(i, 1); continue; }
      c.ang = U.turnToward(c.ang, U.angTo(c.x, c.y, G.hero.x, G.hero.y), 3.2 * dt);
      c.speed += U.clamp(320 - c.speed, -220 * dt, 200 * dt);
      this.moveCar(c, dt);
      c.ramCd -= dt;
      if (d < 48 && c.ramCd <= 0) {
        c.ramCd = 0.7;
        if (G.hero.inCar) { this.damageCar(G.hero.inCar, 12); G.cam.shake = 8; Radio.sfx('crash'); }
        else if (Math.abs(G.hero.speed) < 60) { G.bustTimer += 0.6; }
      }
    }
  },
  ensureHeli: function () {
    if (G.wanted >= 4 && !this.heli && this.heliTimer <= 0) {
      this.heli = { x: G.hero.x + 190, y: G.hero.y - 190, ang: 0, hp: 100, orbit: 0 };
      G.msg = 'PD AIR-1 is on you — shoot it down!'; G.msgTimer = 3;
    }
  },
  updateHeli: function (dt) {
    this.heliTimer -= dt;
    var h = this.heli;
    if (!h) return;
    if (G.wanted < 4) { this.heli = null; return; }
    h.orbit += dt * 0.45;
    var tx = G.hero.x + Math.cos(h.orbit) * 190, ty = G.hero.y + Math.sin(h.orbit) * 190;
    h.x += (tx - h.x) * Math.min(1, 1.4 * dt);
    h.y += (ty - h.y) * Math.min(1, 1.4 * dt);
    h.ang = U.angTo(h.x, h.y, G.hero.x, G.hero.y);
  },
  damageHeli: function (d) {
    var h = this.heli;
    if (!h) return;
    h.hp -= d;
    if (h.hp <= 0) {
      this.explode(h.x, h.y);
      G.hero.cash += 500;
      G.wanted = Math.max(0, G.wanted - 1);
      G.msg = 'AIR-1 down! +$500, heat -1'; G.msgTimer = 3;
      this.heli = null; this.heliTimer = 60;
    }
  },
  damageCar: function (car, d) {
    if (!car || car.dead) return;
    car.hp -= d;
    if (car.hp <= 0) {
      car.dead = true;
      this.explode(car.x, car.y);
      if (car === G.hero.inCar) this.wreckPlayerCar();
    }
  },
  nearestParked: function (x, y, r) {
    var best = null, bd = r;
    for (var i = 0; i < this.parked.length; i++) {
      var c = this.parked[i];
      if (c.dead) continue;
      var d = U.dist(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
};
