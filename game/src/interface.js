// interface.js — HUD, live minimap and menu screens, all drawn on canvas.
// The wanted pill puts the WANTED label BELOW the stars, never beside them:
// in v2 the label overlapped the last star.
'use strict';
var HUD = {
  pill: function (ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(12,10,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  },
  bar: function (ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * U.clamp(frac, 0, 1), h);
  },
  draw: function (ctx) {
    var h = G.hero;
    // Top-left: cash, health, armour.
    this.pill(ctx, 10, 10, 220, 66);
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('$' + h.cash, 22, 16);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#9be8a4';
    ctx.fillText('HEALTH', 22, 44);
    this.bar(ctx, 78, 44, 140, 9, h.hp / 100, '#4ade80');
    ctx.fillText('ARMOR', 22, 58);
    this.bar(ctx, 78, 58, 140, 9, h.armor / 100, '#7db8ff');
    // Top-centre: clock and radio.
    var clock = U.fmtClock(G.clockMin) + '  •  ' + (Radio.station === 0 ? 'RADIO OFF' : Radio.STATIONS[Radio.station]);
    ctx.font = 'bold 16px sans-serif';
    var cw = ctx.measureText(clock).width + 28;
    this.pill(ctx, (1280 - cw) / 2, 10, cw, 34);
    ctx.fillStyle = '#ffd93b';
    ctx.textAlign = 'center';
    ctx.fillText(clock, 640, 20);
    // Top-right: wanted stars with the label BELOW them — never overlapping.
    this.pill(ctx, 1280 - 168, 10, 158, 62);
    ctx.textAlign = 'center';
    for (var i = 0; i < 5; i++) {
      ctx.fillStyle = i < G.wanted ? '#ffd93b' : 'rgba(255,255,255,0.22)';
      ctx.font = '22px sans-serif';
      ctx.fillText('★', 1280 - 152 + i * 30, 16);
    }
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#ffb3ab';
    ctx.fillText('WANTED', 1280 - 89, 46);
    // Bottom-centre: objective.
    var obj = Story.objectiveText();
    ctx.font = 'bold 14px sans-serif';
    var ow = Math.min(860, ctx.measureText(obj).width + 28);
    this.pill(ctx, (1280 - ow) / 2, 720 - 40, ow, 30);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(obj, 640, 720 - 32);
    // Prompt just above the objective.
    if (G.prompt) {
      ctx.font = 'bold 14px sans-serif';
      var pw = ctx.measureText(G.prompt).width + 24;
      this.pill(ctx, (1280 - pw) / 2, 720 - 78, pw, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(G.prompt, 640, 720 - 70);
    }
    // Bottom-right: weapon, ammo, speed / NOS. The panel is tall enough
    // that the MPH line never meets the NOS bar.
    var w = S.WEAPONS[h.weapon];
    this.pill(ctx, 1280 - 168, 720 - 98, 158, 88);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(w.name, 1280 - 22, 720 - 88);
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    var ammo = h.ammo[h.weapon] === Infinity ? '∞' : h.ammo[h.weapon];
    ctx.fillText('AMMO ' + ammo, 1280 - 22, 720 - 68);
    if (h.inCar) {
      ctx.fillText('CAR ' + Math.max(0, Math.round(h.inCar.hp)) + '%', 1280 - 22, 720 - 52);
      ctx.fillText(Math.round(Math.abs(h.speed) * 0.22) + ' MPH', 1280 - 22, 720 - 36);
      this.bar(ctx, 1280 - 146, 720 - 18, 124, 6, h.nos / 100, '#27e8ff');
    } else {
      ctx.fillText('ON FOOT', 1280 - 22, 720 - 52);
      ctx.fillStyle = '#9be8a4';
      ctx.fillText('E: steal car', 1280 - 22, 720 - 36);
    }
    // Transient message, centred high on screen.
    if (G.msgTimer > 0) {
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      var mw = ctx.measureText(G.msg).width + 28;
      this.pill(ctx, (1280 - mw) / 2, 96, mw, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(G.msg, 640, 104);
    }
    this.drawMinimap(ctx);
  },
  drawMinimap: function (ctx) {
    var mx = 10, my = 720 - 168, mw = 200, mh = 150;
    this.pill(ctx, mx, my, mw, mh);
    ctx.fillStyle = '#cfd6e4';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('LUMEN BAY', mx + 6, my + 4);
    var sx = mw / S.W, sy = mh / S.H;
    // Sea strip.
    ctx.fillStyle = '#1d4a6e';
    ctx.fillRect(mx, my + S.CITY_H * sy, mw, (S.BEACH + S.SEA) * sy);
    // Roads.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= S.COLS; i++) {
      ctx.beginPath(); ctx.moveTo(mx + S.roadX(i) * sx, my); ctx.lineTo(mx + S.roadX(i) * sx, my + S.CITY_H * sy); ctx.stroke();
    }
    for (var j = 0; j <= S.ROWS; j++) {
      ctx.beginPath(); ctx.moveTo(mx, my + S.roadY(j) * sy); ctx.lineTo(mx + mw, my + S.roadY(j) * sy); ctx.stroke();
    }
    var dot = function (x, y, color, r) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mx + x * sx, my + y * sy, r, 0, Math.PI * 2); ctx.fill();
    };
    var mk = Story.marker();
    if (mk) {
      var pr = 4 + Math.sin(G.time * 5) * 1.5;
      ctx.strokeStyle = '#ffd93b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx + mk.x * sx, my + mk.y * sy, pr + 3, 0, Math.PI * 2); ctx.stroke();
      dot(mk.x, mk.y, '#ffd93b', 3);
    }
    if (Story.taxi) dot(Story.taxi.dest.x, Story.taxi.dest.y, '#27e8ff', 3);
    for (var p = 0; p < Cars.police.length; p++) dot(Cars.police[p].x, Cars.police[p].y, '#ff3b30', 3);
    if (Cars.heli) dot(Cars.heli.x, Cars.heli.y, '#ff8a3c', 3);
    // Player arrow.
    ctx.save();
    ctx.translate(mx + G.hero.x * sx, my + G.hero.y * sy);
    ctx.rotate(G.hero.ang);
    ctx.fillStyle = '#54ff9f';
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  screen: function (ctx, title, sub, hint) {
    ctx.fillStyle = 'rgba(8,6,16,0.72)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(title, 640, 300);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(sub, 640, 360);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffd93b';
    if ((G.time * 2) % 1 < 0.65) ctx.fillText(hint, 640, 440);
  },
  drawTitle: function (ctx) {
    var sky = ctx.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, '#2a1650');
    sky.addColorStop(0.45, '#7a2d63');
    sky.addColorStop(0.75, '#e2603f');
    sky.addColorStop(1, '#ff9a3c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1280, 720);
    // Setting sun, off to the right so it never sits behind the feature text.
    ctx.save();
    ctx.shadowColor = '#ff9a3c'; ctx.shadowBlur = 60;
    ctx.fillStyle = '#ffd93b';
    ctx.beginPath(); ctx.arc(1080, 440, 72, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Skyline silhouette with lit windows (local RNG — never touches the
    // world RNG, so the title screen cannot change the game).
    var srng = 7;
    var snext = function () {
      srng = (srng + 0x6D2B79F5) | 0;
      var t = Math.imul(srng ^ (srng >>> 15), srng | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var srange = function (a, b) { return a + (b - a) * snext(); };
    ctx.fillStyle = '#1a1030';
    var x = 0;
    while (x < 1280) {
      var bw = srange(70, 130), bh = srange(140, 380);
      ctx.fillRect(x, 720 - bh, bw, bh);
      ctx.fillStyle = 'rgba(255,180,80,0.85)';
      for (var wnd = 0; wnd < 6; wnd++) {
        if (snext() < 0.6) ctx.fillRect(x + srange(6, bw - 12), 720 - bh + srange(10, bh - 20), 4, 6);
      }
      ctx.fillStyle = '#1a1030';
      x += bw + srange(4, 18);
    }
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px sans-serif';
    ctx.fillText('LUMEN BAY', 640, 210);
    ctx.restore();
    ctx.fillStyle = '#ffd93b';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('— NEON HEAT —', 640, 272);
    ctx.fillStyle = '#ffffff';
    ctx.font = '17px sans-serif';
    ctx.fillText('An open-world crime game: 7 story jobs, police helicopter, 4 weapons, car radio,', 640, 430);
    ctx.fillText('shops, safehouse, NOS, street races — all in one neon coastal city.', 640, 456);
    ctx.fillStyle = '#ffd93b';
    ctx.font = 'bold 28px sans-serif';
    if ((G.time * 2) % 1 < 0.65) ctx.fillText('PRESS ENTER TO START', 640, 530);
    ctx.fillStyle = '#e8e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText('WASD move / drive  •  Mouse aim  •  Click shoot  •  E enter, steal, interact  •  Shift run / NOS  •  Q switch weapon  •  R radio', 640, 596);
    ctx.fillStyle = '#b9b3c9';
    ctx.font = '12px sans-serif';
    ctx.fillText('Lumen Bay is an original city. No real place, no real person, no Rockstar content.', 640, 640);
  },
  drawPause: function (ctx) { this.screen(ctx, 'PAUSED', 'Take a breath, Jax.', 'Press Esc to keep playing'); },
  drawBusted: function (ctx) { this.screen(ctx, 'BUSTED!', 'The Lumen Bay PD took $100.', 'Press Enter — walk free at the safehouse'); },
  drawWasted: function (ctx) { this.screen(ctx, 'WASTED', 'You lost half your cash.', 'Press Enter — get back up at the safehouse'); },
  drawComplete: function (ctx) { this.screen(ctx, 'YOU RUN LUMEN BAY', 'All 7 jobs done — $' + G.hero.cash + ' in your pocket.', 'Press Enter to keep playing'); }
};
