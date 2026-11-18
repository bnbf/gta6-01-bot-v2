// hero.js — Jax Marlowe, getaway driver, on foot and behind the wheel.
// Walks and runs, steals and drives cars, aims with the mouse, shoots
// hitscan with four weapons, buys and eats at shops, and gets busted or
// wasted when the heat catches up.
'use strict';
var Hero = {
  reset: function (x, y) {
    var h = G.hero;
    h.x = x; h.y = y; h.ang = 0; h.hp = 100; h.armor = 0; h.cash = 150;
    h.weapon = 0; h.ammo = [Infinity, 0, 0, 0]; h.owned = [true, false, false, false];
    h.inCar = null;
    h.speed = 0; h.nos = 100; h.shootCd = 0;
  },
  update: function (dt) {
    var h = G.hero;
    h.shootCd -= dt;
    if (h.inCar) Cars.drivePlayer(dt);
    else this.moveOnFoot(dt);
    // Aim follows the mouse in world space.
    h.ang = U.angTo(h.x, h.y, G.input.mx + G.cam.x, G.input.my + G.cam.y);
    // Firing: hold for automatics, click for the rest.
    var w = S.WEAPONS[h.weapon];
    if (G.input.mouseDown && (w.auto || G.input.mousePressed)) this.shoot();
    G.input.mousePressed = false;
    this.updatePickups(dt);
  },
  moveOnFoot: function (dt) {
    var h = G.hero, keys = G.input.keys;
    var dx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    var dy = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    var run = keys.ShiftLeft || keys.ShiftRight;
    var sp = run ? 260 : 165;
    if (dx || dy) {
      var len = Math.sqrt(dx * dx + dy * dy);
      var nx = h.x + dx / len * sp * dt, ny = h.y + dy / len * sp * dt;
      if (!City.collides(nx, h.y, 10)) h.x = nx;
      if (!City.collides(h.x, ny, 10)) h.y = ny;
      h.speed = sp;
    } else h.speed = 0;
  },
  tryInteract: function () {
    var h = G.hero;
    if (Story.interact()) return;
    if (h.inCar) {
      var hail = Crowd.nearestHailing(h.x, h.y, 80);
      if (hail) { Story.taxiStart(hail); return; }
      this.exitCar();
      return;
    }
    // Shops first (they sit on the street), then a hailing pedestrian,
    // then the nearest parked car.
    var shop = this.nearestShop(h.x, h.y);
    if (shop) { this.useShop(shop); return; }
    var car = Cars.nearestParked(h.x, h.y, 58);
    if (car) { this.stealCar(car); return; }
  },
  nearestShop: function (x, y) {
    for (var i = 0; i < City.shops.length; i++) {
      var s = City.shops[i];
      if (U.dist(x, y, s.x, s.y) < s.r) return s;
    }
    return null;
  },
  stealCar: function (car) {
    var h = G.hero;
    var idx = Cars.parked.indexOf(car);
    if (idx >= 0) Cars.parked.splice(idx, 1);
    car.parked = false;
    h.inCar = car;
    h.x = car.x; h.y = car.y; h.ang = car.ang;
    G.wanted = Math.min(5, G.wanted + 1);
    G.crimeTimer = 0;
    G.msg = 'Car stolen — heat +1'; G.msgTimer = 2;
    Radio.sfx('pickup');
  },
  exitCar: function () {
    var h = G.hero, car = h.inCar;
    if (!car) return;
    car.parked = true;
    Cars.parked.push(car);
    h.inCar = null;
    h.x = car.x + 34; h.y = car.y; h.speed = 0;
  },
  useShop: function (shop) {
    var h = G.hero;
    if (shop.kind === 'gun') {
      // E buys the next weapon you do not own yet (SMG, then shotgun, then
      // rifle); once all are owned it tops up ammo for the current weapon.
      h.owned = h.owned || [true, false, false, false];
      var next = -1;
      if (!h.owned[1]) next = 1; else if (!h.owned[2]) next = 2; else if (!h.owned[3]) next = 3;
      if (next >= 0) {
        var nw = S.WEAPONS[next];
        if (h.cash >= nw.price) {
          h.cash -= nw.price; h.owned[next] = true; h.weapon = next;
          h.ammo[next] = [0, 120, 24, 20][next];
          G.msg = nw.name + ' bought — Q switches weapons'; Radio.sfx('pickup');
        } else G.msg = nw.name + ' costs $' + nw.price + ' — you have $' + h.cash;
      } else {
        var w = S.WEAPONS[h.weapon];
        if (h.weapon === 0) { G.msg = 'You own every weapon'; }
        else if (h.cash >= w.ammoPrice) { h.cash -= w.ammoPrice; h.ammo[h.weapon] += w.ammoPack; G.msg = w.name + ' ammo +' + w.ammoPack; Radio.sfx('pickup'); }
        else G.msg = 'Ammo costs $' + w.ammoPrice;
      }
    } else if (shop.kind === 'diner') {
      if (h.cash >= 20) { h.cash -= 20; h.hp = Math.min(100, h.hp + 50); G.msg = 'Ate well — health +50'; Radio.sfx('pickup'); }
      else G.msg = 'A meal costs $20';
    } else if (shop.kind === 'garage') {
      if (h.inCar && h.inCar.hp < 100 && h.cash >= 50) { h.cash -= 50; h.inCar.hp = 100; G.msg = 'Car repaired'; Radio.sfx('pickup'); }
      else if (h.nos < 100 && h.cash >= 30) { h.cash -= 30; h.nos = 100; G.msg = 'NOS refilled'; Radio.sfx('pickup'); }
      else G.msg = 'Nothing to fix right now';
    } else if (shop.kind === 'safe') {
      h.hp = 100; h.armor = 50;
      Save.save();
      G.msg = 'Healed up and saved'; Radio.sfx('pickup');
    }
    G.msgTimer = 3;
  },
  shoot: function () {
    var h = G.hero;
    if (h.shootCd > 0) return;
    var w = S.WEAPONS[h.weapon];
    if (h.weapon !== 0 && h.ammo[h.weapon] <= 0) {
      h.shootCd = 0.25;
      G.msg = 'No ammo — buy at LUMEN ARMS'; G.msgTimer = 2;
      return;
    }
    h.shootCd = w.rate;
    var pellets = w.pellets || 1;
    for (var p = 0; p < pellets; p++) {
      var ang = h.ang + (RNG.next() - 0.5) * 2 * w.spread + (h.inCar ? 0.04 : 0);
      this.fireRay(h.x, h.y, ang, w.range, w.dmg);
    }
    if (h.weapon !== 0) h.ammo[h.weapon]--;
    G.crimeTimer = 0;
    Radio.sfx('shot');
    G.cam.shake = Math.max(G.cam.shake, 2);
  },
  fireRay: function (ox, oy, ang, range, dmg) {
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var best = null, bt = range;
    var consider = function (x, y, r, kind, obj) {
      var tx = x - ox, ty = y - oy;
      var t = tx * dx + ty * dy;
      if (t < 0 || t > bt) return;
      var perp = Math.abs(tx * dy - ty * dx);
      if (perp < r) { bt = t; best = { kind: kind, obj: obj }; }
    };
    var i;
    for (i = 0; i < Crowd.peds.length; i++) { var p = Crowd.peds[i]; if (!p.dead) consider(p.x, p.y, 12, 'ped', p); }
    for (i = 0; i < Crowd.officers.length; i++) { var o = Crowd.officers[i]; consider(o.x, o.y, 12, 'officer', o); }
    var cars = Cars.traffic.concat(Cars.parked, Cars.police);
    for (i = 0; i < cars.length; i++) { var c = cars[i]; if (!c.dead && c !== G.hero.inCar) consider(c.x, c.y, 26, 'car', c); }
    for (i = 0; i < Story.convoy.length; i++) { var v = Story.convoy[i]; if (!v.dead) consider(v.x, v.y, 26, 'car', v); }
    if (Cars.heli) consider(Cars.heli.x, Cars.heli.y, 30, 'heli', Cars.heli);
    var hx = ox + dx * bt, hy = oy + dy * bt;
    G.tracers.push({ x1: ox + dx * 22, y1: oy + dy * 22, x2: hx, y2: hy, life: 0.09 });
    if (!best) return;
    if (best.kind === 'ped') {
      best.obj.dead = true;
      G.wanted = Math.min(5, G.wanted + 1);
      Crowd.fleeFrom(best.obj.x, best.obj.y);
      for (var k = 0; k < 8; k++) G.particles.push({ x: hx, y: hy, vx: RNG.range(-90, 90), vy: RNG.range(-90, 90), life: 0.5, max: 0.5, size: 4, color: '#c0392b' });
    } else if (best.kind === 'officer') {
      var oi = Crowd.officers.indexOf(best.obj);
      if (oi >= 0) Crowd.officers.splice(oi, 1);
      G.wanted = Math.min(5, G.wanted + 2);
    } else if (best.kind === 'car') {
      Cars.damageCar(best.obj, dmg);
      for (var s = 0; s < 6; s++) G.particles.push({ x: hx, y: hy, vx: RNG.range(-120, 120), vy: RNG.range(-120, 120), life: 0.4, max: 0.4, size: 3, color: '#ffd93b' });
    } else if (best.kind === 'heli') {
      Cars.damageHeli(dmg);
    }
  },
  takeDamage: function (d) {
    var h = G.hero;
    var absorbed = Math.min(h.armor, d * 0.6);
    h.armor -= absorbed;
    h.hp -= (d - absorbed);
    G.cam.shake = Math.max(G.cam.shake, 4);
    if (h.hp <= 0) this.wasted();
  },
  busted: function () {
    var h = G.hero;
    G.state = 'busted';
    h.cash = Math.max(0, h.cash - 100);
    G.wanted = 0; G.bustTimer = 0;
    Cars.police.length = 0; Crowd.officers.length = 0;
    Radio.sfx('crash');
  },
  wasted: function () {
    var h = G.hero;
    G.state = 'wasted';
    h.cash = Math.floor(h.cash / 2);
    G.wanted = 0; G.bustTimer = 0;
    Cars.police.length = 0; Crowd.officers.length = 0;
    Radio.sfx('crash');
  },
  respawn: function () {
    var h = G.hero;
    h.x = City.landmarks.safe.x; h.y = City.landmarks.safe.y;
    h.hp = 100; h.armor = 0; h.inCar = null; h.speed = 0;
    G.state = 'play';
  },
  updatePickups: function (dt) {
    G.pickupTimer -= dt;
    if (G.pickupTimer <= 0) {
      G.pickupTimer = 25;
      if (G.pickups.length < 4) {
        var p = City.randomRoadPoint();
        G.pickups.push({ x: p.x, y: p.y, kind: RNG.pick(['health', 'armor', 'ammo']) });
      }
    }
    var h = G.hero;
    for (var i = G.pickups.length - 1; i >= 0; i--) {
      var pk = G.pickups[i];
      if (U.dist(h.x, h.y, pk.x, pk.y) < 26) {
        if (pk.kind === 'health') h.hp = Math.min(100, h.hp + 40);
        if (pk.kind === 'armor') h.armor = Math.min(100, h.armor + 50);
        if (pk.kind === 'ammo' && h.weapon !== 0) h.ammo[h.weapon] += 30;
        G.msg = 'Picked up ' + pk.kind; G.msgTimer = 2;
        Radio.sfx('pickup');
        G.pickups.splice(i, 1);
      }
    }
  }
};
