// crowd.js — pedestrians and foot officers.
// Pedestrians stroll the sidewalks, flee gunfire and crime, and some hail
// taxis. Foot officers join the chase from 2 wanted stars and try to bust
// the player on foot.
'use strict';
var Crowd = {
  peds: [], officers: [],
  spawnAll: function () {
    this.peds = []; this.officers = [];
    var colors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#ecf0f1', '#e67e22'];
    for (var i = 0; i < 16; i++) {
      var p = City.randomRoadPoint();
      this.peds.push({
        x: p.x + RNG.range(-30, 30), y: p.y + RNG.range(-30, 30),
        ang: RNG.range(0, Math.PI * 2), speed: RNG.range(28, 48),
        state: 'stroll', color: RNG.pick(colors), dest: City.randomRoadPoint(),
        hail: RNG.chance(0.3), dead: false
      });
    }
  },
  update: function (dt) {
    for (var i = 0; i < this.peds.length; i++) {
      var p = this.peds[i];
      if (p.dead) continue;
      if (p.state === 'flee') {
        p.ang = U.turnToward(p.ang, U.angTo(G.threatX, G.threatY, p.x, p.y), 6 * dt);
        p.speed = 150;
        p.x += Math.cos(p.ang) * p.speed * dt;
        p.y += Math.sin(p.ang) * p.speed * dt;
        if (U.dist(p.x, p.y, G.threatX, G.threatY) > 420) p.state = 'stroll';
        continue;
      }
      if (p.state === 'hail') continue; // stands and waves for a taxi
      var d = U.dist(p.x, p.y, p.dest.x, p.dest.y);
      if (d < 14) { p.dest = City.randomRoadPoint(); continue; }
      p.ang = U.turnToward(p.ang, U.angTo(p.x, p.y, p.dest.x, p.dest.y), 4 * dt);
      p.x += Math.cos(p.ang) * p.speed * dt;
      p.y += Math.sin(p.ang) * p.speed * dt;
      if (City.collides(p.x, p.y, 8)) { p.x -= Math.cos(p.ang) * p.speed * dt; p.y -= Math.sin(p.ang) * p.speed * dt; p.dest = City.randomRoadPoint(); }
    }
    this.updateOfficers(dt);
  },
  fleeFrom: function (x, y) {
    G.threatX = x; G.threatY = y;
    for (var i = 0; i < this.peds.length; i++) {
      var p = this.peds[i];
      if (!p.dead && U.dist(p.x, p.y, x, y) < 320) p.state = 'flee';
    }
  },
  updateOfficers: function (dt) {
    var want = G.wanted >= 2 ? Math.min(G.wanted - 1, 3) : 0;
    while (this.officers.length < want) {
      var p = City.randomRoadPoint();
      this.officers.push({ x: p.x, y: p.y, ang: 0, speed: 150 });
    }
    if (G.wanted < 2) this.officers.length = 0;
    for (var i = 0; i < this.officers.length; i++) {
      var o = this.officers[i];
      var d = U.dist(o.x, o.y, G.hero.x, G.hero.y);
      o.ang = U.turnToward(o.ang, U.angTo(o.x, o.y, G.hero.x, G.hero.y), 5 * dt);
      o.x += Math.cos(o.ang) * o.speed * dt;
      o.y += Math.sin(o.ang) * o.speed * dt;
      if (d < 26 && !G.hero.inCar && Math.abs(G.hero.speed) < 60) G.bustTimer += dt;
    }
  },
  nearestHailing: function (x, y, r) {
    var best = null, bd = r;
    for (var i = 0; i < this.peds.length; i++) {
      var p = this.peds[i];
      if (p.dead || p.state !== 'hail') continue;
      var d = U.dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },
  nearestPed: function (x, y, r) {
    var best = null, bd = r;
    for (var i = 0; i < this.peds.length; i++) {
      var p = this.peds[i];
      if (p.dead) continue;
      var d = U.dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
};
