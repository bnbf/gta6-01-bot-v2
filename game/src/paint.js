// paint.js — renders the world: ground, roads, buildings, parks, beach and
// sea, neon signs, lamps, cars, people, the helicopter, and the dusk-to-
// night lighting that makes the neon glow.
'use strict';
var Paint = {
  draw: function (ctx) {
    var cam = G.cam;
    ctx.save();
    ctx.clearRect(0, 0, 1280, 720);
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    this.drawGround(ctx);
    this.drawEntities(ctx);
    this.drawNight(ctx);
    this.drawMarkers(ctx);
    this.drawParticles(ctx);
    ctx.restore();
    if (G.wanted >= 3) {
      var v = ctx.createRadialGradient(640, 360, 240, 640, 360, 720);
      v.addColorStop(0, 'rgba(255,30,20,0)');
      v.addColorStop(1, 'rgba(255,30,20,' + (0.22 + G.wanted * 0.03) + ')');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 1280, 720);
    }
  },
  drawGround: function (ctx) {
    var P = S.PALETTE;
    ctx.fillStyle = P.ground;
    ctx.fillRect(0, 0, S.W, S.H);
    // Beach and sea along the south edge.
    ctx.fillStyle = P.sand;
    ctx.fillRect(0, S.CITY_H, S.W, S.BEACH);
    ctx.fillStyle = P.sea;
    ctx.fillRect(0, S.CITY_H + S.BEACH, S.W, S.SEA);
    ctx.strokeStyle = P.sea2;
    ctx.lineWidth = 3;
    for (var w = 0; w < 5; w++) {
      ctx.beginPath();
      ctx.moveTo(0, S.CITY_H + S.BEACH + 30 + w * 34);
      ctx.lineTo(S.W, S.CITY_H + S.BEACH + 30 + w * 34);
      ctx.stroke();
    }
    // Roads.
    ctx.fillStyle = P.asphalt;
    for (var i = 0; i <= S.COLS; i++) ctx.fillRect(S.roadX(i) - S.ROAD / 2, 0, S.ROAD, S.CITY_H);
    for (var j = 0; j <= S.ROWS; j++) ctx.fillRect(0, S.roadY(j) - S.ROAD / 2, S.W, S.ROAD);
    // Dashed centre lines.
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (var k = 0; k <= S.COLS; k++) {
      ctx.beginPath(); ctx.moveTo(S.roadX(k), 0); ctx.lineTo(S.roadX(k), S.CITY_H); ctx.stroke();
    }
    for (var l = 0; l <= S.ROWS; l++) {
      ctx.beginPath(); ctx.moveTo(0, S.roadY(l)); ctx.lineTo(S.W, S.roadY(l)); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Sidewalks around each block.
    ctx.strokeStyle = P.sidewalk;
    ctx.lineWidth = 6;
    for (var b = 0; b < City.blocks.length; b++) {
      var blk = City.blocks[b];
      ctx.strokeRect(blk.x - 3, blk.y - 3, blk.w + 6, blk.h + 6);
    }
    // Parks and the stadium field.
    for (var p = 0; p < City.parks.length; p++) {
      var pk = City.parks[p];
      ctx.fillStyle = pk.field ? '#4a7a42' : P.park;
      ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
      if (pk.field) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(pk.x + 20, pk.y + 20, pk.w - 40, pk.h - 40);
        ctx.beginPath(); ctx.moveTo(pk.x + pk.w / 2, pk.y + 20); ctx.lineTo(pk.x + pk.w / 2, pk.y + pk.h - 20); ctx.stroke();
      }
      for (var t = 0; t < pk.trees.length; t++) {
        var tr = pk.trees[t];
        ctx.fillStyle = P.tree;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = P.tree2;
        ctx.beginPath(); ctx.arc(tr.x - 3, tr.y - 3, tr.r * 0.55, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Buildings.
    var dark = U.darkness(G.clockMin);
    for (var bi = 0; bi < City.buildings.length; bi++) {
      var bd = City.buildings[bi];
      ctx.fillStyle = bd.color;
      ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bd.x, bd.y + bd.h - 8, bd.w, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bd.x + 8, bd.y + 8, Math.min(26, bd.w - 16), 14);
      if (dark > 0.3) {
        ctx.fillStyle = 'rgba(255,214,110,0.9)';
        for (var wn = 0; wn < 5; wn++) {
          var hx = (bd.x * 31 + bd.y * 17 + wn * 53) % 100;
          if (hx < 55) ctx.fillRect(bd.x + 10 + ((wn * 29) % Math.max(10, bd.w - 20)), bd.y + 24 + ((wn * 41) % Math.max(10, bd.h - 34)), 5, 7);
        }
      }
    }
    // Neon signs with glow.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var s = 0; s < City.signs.length; s++) {
      var sg = City.signs[s];
      ctx.font = 'bold ' + sg.size + 'px sans-serif';
      var tw = ctx.measureText(sg.text).width;
      ctx.fillStyle = 'rgba(10,8,18,0.65)';
      ctx.fillRect(sg.x - tw / 2 - 8, sg.y - sg.size / 2 - 4, tw + 16, sg.size + 8);
      ctx.shadowColor = sg.color; ctx.shadowBlur = 14;
      ctx.fillStyle = sg.color;
      ctx.fillText(sg.text, sg.x, sg.y);
      ctx.shadowBlur = 0;
    }
  },
  drawEntities: function (ctx) {
    var i, c;
    // Parked cars, then traffic, police, the convoy and the player car.
    for (i = 0; i < Cars.parked.length; i++) { c = Cars.parked[i]; if (!c.dead) this.drawCar(ctx, c, false); }
    for (i = 0; i < Cars.traffic.length; i++) { c = Cars.traffic[i]; if (!c.dead) this.drawCar(ctx, c, false); }
    for (i = 0; i < Cars.police.length; i++) this.drawCar(ctx, Cars.police[i], true);
    for (i = 0; i < Story.convoy.length; i++) { c = Story.convoy[i]; if (!c.dead) this.drawCar(ctx, c, false); }
    if (G.hero.inCar) this.drawCar(ctx, G.hero.inCar, false, true);
    // Pickups.
    for (i = 0; i < G.pickups.length; i++) {
      var pk = G.pickups[i];
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = pk.kind === 'health' ? '#4ade80' : (pk.kind === 'armor' ? '#7db8ff' : '#ffd93b');
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pk.kind === 'health' ? '+' : (pk.kind === 'armor' ? 'A' : '•'), pk.x, pk.y);
    }
    // Pedestrians and officers.
    for (i = 0; i < Crowd.peds.length; i++) {
      var p = Crowd.peds[i];
      if (p.dead) continue;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.arc(p.x + Math.cos(p.ang) * 4, p.y + Math.sin(p.ang) * 4, 3, 0, Math.PI * 2); ctx.fill();
      if (p.state === 'hail') {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x + 10, p.y - 16); ctx.stroke();
      }
      if (Story.taxi && Story.taxi.ped === p) {
        ctx.strokeStyle = '#27e8ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (i = 0; i < Crowd.officers.length; i++) {
      var o = Crowd.officers[i];
      ctx.fillStyle = '#1f2a44';
      ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7db8ff';
      ctx.beginPath(); ctx.arc(o.x, o.y - 3, 4, 0, Math.PI * 2); ctx.fill();
    }
    // The hero on foot.
    var h = G.hero;
    if (!h.inCar) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.ang);
      ctx.fillStyle = '#54ff9f';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(6, -2, 14, 4);
      ctx.restore();
    }
    // The helicopter.
    var heli = Cars.heli;
    if (heli) {
      ctx.save();
      ctx.translate(heli.x, heli.y);
      ctx.fillStyle = '#2b3a55';
      ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, heli.ang, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      var rot = G.time * 9;
      ctx.beginPath(); ctx.moveTo(Math.cos(rot) * 30, Math.sin(rot) * 30); ctx.lineTo(-Math.cos(rot) * 30, -Math.sin(rot) * 30); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffd93b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD AIR-1', heli.x, heli.y - 26);
      this.bar(ctx, heli.x - 22, heli.y - 20, 44, 4, heli.hp / 100, '#ff3b30');
    }
  },
  bar: function (ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * U.clamp(frac, 0, 1), h);
  },
  drawCar: function (ctx, c, isPolice, isPlayer) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.ang);
    var m = c.model;
    if (isPlayer) {
      ctx.strokeStyle = '#27e8ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#111';
    ctx.fillRect(-m.w / 2 + 4, -m.h / 2 - 3, 10, 4);
    ctx.fillRect(-m.w / 2 + 4, m.h / 2 - 1, 10, 4);
    ctx.fillRect(m.w / 2 - 12, -m.h / 2 - 3, 10, 4);
    ctx.fillRect(m.w / 2 - 12, m.h / 2 - 1, 10, 4);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-m.w / 2, -m.h / 2, m.w, m.h, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.75)';
    ctx.fillRect(m.w / 2 - 16, -m.h / 2 + 4, 8, m.h - 8);
    if (isPolice) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-6, -m.h / 2 + 2, 12, m.h - 4);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PD', 0, 0);
      var flash = Math.floor(G.time * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3b82ff';
      ctx.beginPath(); ctx.arc(-m.w / 2 + 6, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#3b82ff' : '#ff3b30';
      ctx.beginPath(); ctx.arc(-m.w / 2 + 6, 0, 2, 0, Math.PI * 2); ctx.fill();
    }
    if (c.model.name === 'taxi') {
      ctx.fillStyle = '#111';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('TAXI', 0, 0);
    }
    if (c.hp < 55) {
      ctx.fillStyle = 'rgba(120,120,120,0.7)';
      ctx.beginPath(); ctx.arc(-m.w / 2, 0, 6 + Math.sin(G.time * 8) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },
  drawNight: function (ctx) {
    var d = U.darkness(G.clockMin);
    if (d <= 0) return;
    ctx.fillStyle = 'rgba(8,8,40,' + (d * 0.45) + ')';
    ctx.fillRect(G.cam.x, G.cam.y, 1280, 720);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var glow = function (x, y, r, color, a) {
      var g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    };
    var s;
    for (s = 0; s < City.signs.length; s++) glow(City.signs[s].x, City.signs[s].y, 70, City.signs[s].color, 0.28 * d);
    // Street lamps at every intersection.
    for (var i = 0; i <= S.COLS; i++) for (var j = 0; j <= S.ROWS; j++) glow(S.roadX(i), S.roadY(j), 80, '#ffb347', 0.10 * d);
    // Headlights: a pool of light ahead of every car.
    var headlight = function (c) {
      var fx = c.x + Math.cos(c.ang) * 30, fy = c.y + Math.sin(c.ang) * 30;
      glow(fx, fy, 60, '#ffe9a8', 0.14 * d);
      ctx.fillStyle = 'rgba(255,240,180,' + (0.06 * d) + ')';
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      var a1 = c.ang - 0.2, a2 = c.ang + 0.2;
      ctx.lineTo(fx + Math.cos(a1) * 130, fy + Math.sin(a1) * 130);
      ctx.lineTo(fx + Math.cos(a2) * 130, fy + Math.sin(a2) * 130);
      ctx.closePath(); ctx.fill();
    };
    for (var k = 0; k < Cars.traffic.length; k++) if (!Cars.traffic[k].dead) headlight(Cars.traffic[k]);
    for (var q = 0; q < Cars.police.length; q++) headlight(Cars.police[q]);
    if (G.hero.inCar) headlight(G.hero.inCar);
    // Light pool around the player.
    glow(G.hero.x, G.hero.y, 280, '#ffe0a0', 0.20 * d);
    // Helicopter spotlight cone onto the player.
    var heli = Cars.heli;
    if (heli) {
      var px = heli.x, py = heli.y;
      var tx = G.hero.x, ty = G.hero.y;
      var ang = U.angTo(px, py, tx, ty);
      var perp = ang + Math.PI / 2;
      ctx.fillStyle = 'rgba(255,255,210,' + (0.13 * d + 0.05) + ')';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx + Math.cos(perp) * 70, ty + Math.sin(perp) * 70);
      ctx.lineTo(tx - Math.cos(perp) * 70, ty - Math.sin(perp) * 70);
      ctx.closePath(); ctx.fill();
      glow(tx, ty, 120, '#fff8cc', 0.16 * d);
    }
    ctx.restore();
  },
  drawMarkers: function (ctx) {
    var mk = Story.marker();
    if (mk) {
      var r = 26 + Math.sin(G.time * 5) * 6;
      ctx.strokeStyle = '#ffd93b';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(mk.x, mk.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,217,59,0.10)';
      ctx.fillRect(mk.x - 14, mk.y - 200, 28, 200);
      ctx.fillStyle = '#ffd93b';
      ctx.beginPath(); ctx.arc(mk.x, mk.y, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (Story.taxi) {
      var td = Story.taxi.dest;
      ctx.strokeStyle = '#27e8ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(td.x, td.y, 22 + Math.sin(G.time * 5) * 5, 0, Math.PI * 2); ctx.stroke();
    }
    if (Story.mission === 5 && !Story.vaultCracked && Story.bankHold > 0) {
      var b = City.landmarks.bank;
      this.bar(ctx, b.x - 40, b.y - 60, 80, 8, Story.bankHold / 3, '#ffd93b');
    }
  },
  drawParticles: function (ctx) {
    var i;
    for (i = 0; i < G.tracers.length; i++) {
      var t = G.tracers[i];
      ctx.strokeStyle = 'rgba(255,240,150,' + (t.life / 0.09) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
    }
    for (i = 0; i < G.particles.length; i++) {
      var p = G.particles[i];
      ctx.globalAlpha = U.clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
};
