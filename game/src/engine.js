// engine.js — boot, input, camera, main loop, wanted law, self-test and
// screenshot staging for LUMEN BAY.
'use strict';
var G = {
  time: 0, clockMin: S.CLOCK_START, state: 'title',
  wanted: 0, crimeTimer: 0, decayTimer: 0, bustTimer: 0,
  hero: {}, particles: [], tracers: [], pickups: [], pickupTimer: 20,
  cam: { x: 0, y: 0, shake: 0 },
  input: { keys: {}, mx: 640, my: 360, mouseDown: false, mousePressed: false },
  msg: '', msgTimer: 0, prompt: '',
  threatX: 0, threatY: 0, saveTimer: 0,
  errorLog: [], test: null, shot: null, seed: S.SEED
};
window.addEventListener('error', function (e) { G.errorLog.push(String(e.message)); });
var Engine = {
  canvas: null, ctx: null, last: 0,
  init: function () {
    var params = new URLSearchParams(window.location.search);
    G.seed = parseInt(params.get('seed') || '1', 10) || 1;
    G.test = params.get('test') === '1';
    G.shot = params.get('shot');
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    RNG.seed(G.seed);
    City.build(G.seed);
    Cars.spawnAll();
    Crowd.spawnAll();
    Story.reset();
    Hero.reset(S.roadX(2), S.roadY(3));
    var saved = (!G.test && !G.shot) ? Save.load() : null;
    if (saved) Save.apply(saved);
    this.bindInput();
    G.state = 'title';
    if (G.shot) this.stageShot(G.shot);
    else if (G.test) { G.state = 'play'; this.runTests(); }
    this.last = performance.now();
    var self = this;
    var loop = function (t) { self.frame(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    this.render();
  },
  bindInput: function () {
    var self = this;
    window.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
      if (e.repeat) return;
      G.input.keys[e.code] = true;
      if (e.code === 'Enter') self.onEnter();
      if (e.code === 'Escape') { if (G.state === 'play') G.state = 'pause'; else if (G.state === 'pause') G.state = 'play'; }
      if (e.code === 'KeyE' && G.state === 'play') Hero.tryInteract();
      if (e.code === 'KeyQ' && G.state === 'play') self.cycleWeapon();
      if (e.code === 'KeyR' && G.state === 'play') Radio.toggle();
    });
    window.addEventListener('keyup', function (e) { G.input.keys[e.code] = false; });
    this.canvas.addEventListener('mousemove', function (e) {
      var r = self.canvas.getBoundingClientRect();
      G.input.mx = (e.clientX - r.left) * 1280 / r.width;
      G.input.my = (e.clientY - r.top) * 720 / r.height;
    });
    this.canvas.addEventListener('mousedown', function (e) {
      if (e.button === 0) { G.input.mouseDown = true; G.input.mousePressed = true; }
    });
    window.addEventListener('mouseup', function () { G.input.mouseDown = false; });
    this.canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  },
  onEnter: function () {
    if (G.state === 'title') { G.state = 'play'; Radio.ensure(); }
    else if (G.state === 'busted' || G.state === 'wasted') Hero.respawn();
    else if (G.state === 'complete') G.state = 'play';
  },
  cycleWeapon: function () {
    var h = G.hero;
    if (!h.owned) h.owned = [true, false, false, false];
    for (var i = 1; i <= 4; i++) {
      var w = (h.weapon + i) % 4;
      if (h.owned[w]) { h.weapon = w; G.msg = S.WEAPONS[w].name; G.msgTimer = 1.5; return; }
    }
  },
  frame: function (t) {
    var dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000 || 0.016));
    this.last = t;
    if (G.state === 'play') this.update(dt);
    else G.time += dt;
    this.render();
  },
  update: function (dt) {
    G.time += dt;
    G.clockMin += dt * S.CLOCK_RATE;
    G.msgTimer = Math.max(0, G.msgTimer - dt);
    G.crimeTimer += dt;
    G.saveTimer += dt;
    if (G.saveTimer > 20) { G.saveTimer = 0; Save.save(); }
    Hero.update(dt);
    Cars.updateTraffic(dt);
    Cars.ensurePolice();
    Cars.updatePolice(dt);
    Cars.ensureHeli();
    Cars.updateHeli(dt);
    Crowd.update(dt);
    Story.update(dt);
    // Wanted decay: quiet for 25 s with no police close, then -1 per 10 s.
    var nearCop = false;
    for (var i = 0; i < Cars.police.length; i++) {
      if (U.dist(Cars.police[i].x, Cars.police[i].y, G.hero.x, G.hero.y) < 400) { nearCop = true; break; }
    }
    if (G.wanted > 0 && G.crimeTimer > 25 && !nearCop) {
      G.decayTimer += dt;
      if (G.decayTimer > 10) { G.wanted--; G.decayTimer = 0; }
    } else G.decayTimer = 0;
    // Busted when the law stays on top of a slow player on foot.
    if (G.bustTimer > 0) {
      G.bustTimer = Math.max(0, G.bustTimer - dt * 0.4);
      if (G.bustTimer > 1.2) Hero.busted();
    }
    // Particles and tracers.
    for (var p = G.particles.length - 1; p >= 0; p--) {
      var pt = G.particles[p];
      pt.life -= dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      if (pt.life <= 0) G.particles.splice(p, 1);
    }
    for (var tr = G.tracers.length - 1; tr >= 0; tr--) {
      G.tracers[tr].life -= dt;
      if (G.tracers[tr].life <= 0) G.tracers.splice(tr, 1);
    }
    // Camera follows the player with a little driving lead.
    var lead = G.hero.inCar ? 60 : 0;
    var tx = G.hero.x + Math.cos(G.hero.ang) * lead - 640;
    var ty = G.hero.y + Math.sin(G.hero.ang) * lead - 360;
    tx = U.clamp(tx, 0, S.W - 1280);
    ty = U.clamp(ty, 0, S.H - 720);
    G.cam.x += (tx - G.cam.x) * Math.min(1, 5 * dt);
    G.cam.y += (ty - G.cam.y) * Math.min(1, 5 * dt);
    G.cam.shake = Math.max(0, G.cam.shake - dt * 30);
    if (G.cam.shake > 0) {
      G.cam.x += (Math.random() - 0.5) * G.cam.shake;
      G.cam.y += (Math.random() - 0.5) * G.cam.shake;
    }
    this.computePrompt();
  },
  computePrompt: function () {
    var h = G.hero;
    G.prompt = '';
    if (Story.mission === 5 && !Story.vaultCracked && U.dist(h.x, h.y, City.landmarks.bank.x, City.landmarks.bank.y) < 85) {
      G.prompt = 'Hold E — crack the vault ' + Math.floor(Story.bankHold / 3 * 100) + '%';
      return;
    }
    if (h.inCar) {
      if (Crowd.nearestHailing(h.x, h.y, 80)) { G.prompt = 'E — Pick up fare'; return; }
      return;
    }
    if (Story.mission === 3) {
      var shop = Hero.nearestShop(h.x, h.y);
      if (shop && (shop.kind === 'gun' || shop.kind === 'diner' || shop.kind === 'garage')) { G.prompt = 'E — Collect protection money'; return; }
    }
    var s2 = Hero.nearestShop(h.x, h.y);
    if (s2) { G.prompt = 'E — ' + s2.label; return; }
    if (Cars.nearestParked(h.x, h.y, 58)) { G.prompt = 'E — Steal car'; return; }
  },
  render: function () {
    var ctx = this.ctx;
    if (G.state === 'title') { HUD.drawTitle(ctx); return; }
    Paint.draw(ctx);
    if (G.state === 'play') HUD.draw(ctx);
    else if (G.state === 'pause') { HUD.draw(ctx); HUD.drawPause(ctx); }
    else if (G.state === 'busted') HUD.drawBusted(ctx);
    else if (G.state === 'wasted') HUD.drawWasted(ctx);
    else if (G.state === 'complete') { HUD.draw(ctx); HUD.drawComplete(ctx); }
  },
  runTests: function () {
    var T = [];
    var check = function (name, ok) { T.push({ name: name, ok: !!ok }); console.log('LBTEST ' + (ok ? 'PASS' : 'FAIL') + ' ' + name); };
    var upd = function (n) { for (var i = 0; i < n; i++) Engine.update(0.1); };
    var keys = G.input.keys;
    check('spawn', G.hero.x > 0 && G.hero.y > 0 && G.hero.x < S.W && G.hero.y < S.H);
    check('traffic', Cars.traffic.length >= 5);
    check('parked', Cars.parked.length >= 3);
    check('peds', Crowd.peds.length >= 5);
    check('mission1', Story.mission === 1 && Story.objectiveText().length > 5);
    var x0 = G.hero.x, y0 = G.hero.y;
    keys.KeyW = true; upd(4); keys.KeyW = false;
    check('walk', U.dist(x0, y0, G.hero.x, G.hero.y) > 5);
    var pc = Cars.parked[0];
    G.hero.x = pc.x - 20; G.hero.y = pc.y; G.hero.inCar = null;
    Hero.tryInteract();
    check('steal', !!G.hero.inCar);
    check('wanted', G.wanted >= 1);
    G.hero.inCar.x = S.roadX(2); G.hero.inCar.y = S.roadY(3); G.hero.inCar.ang = 0; G.hero.inCar.speed = 0;
    G.hero.x = G.hero.inCar.x; G.hero.y = G.hero.inCar.y;
    var dx0 = G.hero.x;
    keys.KeyW = true; upd(8); keys.KeyW = false;
    check('drive', Math.abs(G.hero.x - dx0) > 20 || Math.abs(G.hero.inCar.speed) > 10);
    G.wanted = 3; Cars.ensurePolice(); upd(5);
    check('police', Cars.police.length >= 1);
    G.wanted = 4; Cars.ensureHeli(); upd(5);
    check('heli', !!Cars.heli);
    G.hero.owned = [true, true, false, false];
    G.hero.weapon = 1; G.hero.ammo[1] = 120; G.hero.shootCd = 0;
    Hero.shoot();
    check('ammo', G.hero.ammo[1] === 119);
    G.hero.inCar.x = City.landmarks.garage.x; G.hero.inCar.y = City.landmarks.garage.y;
    G.hero.x = G.hero.inCar.x; G.hero.y = G.hero.inCar.y;
    upd(3);
    check('mission1-done', Story.mission === 2);
    check('mission2', Story.mission === 2 && Story.checkpoints.length === 3);
    Save.save();
    var savedCash = G.hero.cash;
    G.hero.cash = 9999;
    var loaded = Save.load();
    if (loaded) Save.apply(loaded);
    check('save-load', G.hero.cash === savedCash);
    var r1 = Radio.toggle(), r2 = Radio.toggle(), r3 = Radio.toggle();
    check('radio', r1 === 1 && r2 === 2 && r3 === 0);
    Hero.exitCar();
    G.wanted = 0;
    G.hero.x = City.landmarks.arms.x; G.hero.y = City.landmarks.arms.y;
    for (var ci = 0; ci < Cars.parked.length; ci++) {
      if (U.dist(Cars.parked[ci].x, Cars.parked[ci].y, G.hero.x, G.hero.y) < 120) {
        Cars.parked[ci].x = S.roadX(0); Cars.parked[ci].y = S.roadY(0);
      }
    }
    G.hero.cash = 500;
    var am0 = G.hero.ammo[1];
    Hero.tryInteract();
    check('shop', G.hero.cash < 500 || G.hero.weapon !== 1 || G.hero.ammo[1] > am0);
    var pc2 = Cars.nearestParked(G.hero.x, G.hero.y, 500) || Cars.parked[0];
    G.hero.x = pc2.x - 20; G.hero.y = pc2.y;
    Hero.tryInteract();
    var wIdx = G.hero.weapon, a1 = G.hero.ammo[wIdx];
    G.hero.shootCd = 0;
    Hero.shoot();
    check('drive-by', !!G.hero.inCar && G.hero.ammo[wIdx] < a1);
    var okRender = true;
    try { Engine.render(); } catch (e) { okRender = false; G.errorLog.push('render: ' + e.message); }
    check('render', okRender);
    check('no-errors', G.errorLog.length === 0);
    var passed = T.filter(function (c) { return c.ok; }).length;
    var res = { passed: passed, total: T.length, checks: T, errors: G.errorLog.slice() };
    window.__lbTest = res;
    window.__lbErrors = G.errorLog.slice();
    document.title = 'LBTEST ' + passed + '/' + T.length;
    var el = document.getElementById('lb-test');
    if (el) el.textContent = JSON.stringify(res);
    console.log('LBTEST ' + JSON.stringify(res));
  },
  stageShot: function (kind) {
    var h = G.hero;
    if (kind === 'title') {
      G.state = 'title';
      this.render();
      window.__lbShotReady = true;
      return;
    }
    G.state = 'play';
    if (kind === 'chase') {
      G.clockMin = 1175;
      var car = Cars.makeCar(S.roadX(4), S.roadY(3), 0, Cars.MODELS[5], '#27e8ff');
      h.inCar = car; h.x = car.x; h.y = car.y; h.ang = 0; car.speed = 277;
      G.wanted = 4;
      Story.mission = 5; Story.vaultCracked = true;
      h.cash = 150; h.weapon = 0;
      Cars.ensurePolice();
      if (Cars.police[0]) { Cars.police[0].x = h.x - 260; Cars.police[0].y = h.y - 40; }
      if (Cars.police[1]) { Cars.police[1].x = h.x - 180; Cars.police[1].y = h.y + 60; }
      if (Cars.police[2]) { Cars.police[2].x = h.x + 320; Cars.police[2].y = h.y - 30; }
      Cars.ensureHeli();
      var taxi = Cars.makeCar(h.x + 240, h.y, 0, Cars.MODELS[2], S.PALETTE.taxi);
      Cars.traffic.push(taxi);
    } else if (kind === 'foot') {
      G.clockMin = 1160;
      Story.mission = 3; Story.enterMission(3);
      h.x = City.landmarks.arms.x + 30; h.y = City.landmarks.arms.y + 40;
      h.owned = [true, true, false, false]; h.weapon = 1; h.ammo[1] = 120;
      h.cash = 150;
      G.wanted = 2;
      Cars.ensurePolice();
      if (Cars.police[0]) { Cars.police[0].x = h.x + 180; Cars.police[0].y = h.y + 20; }
    } else if (kind === 'escape') {
      G.clockMin = 1175;
      var car2 = Cars.makeCar(1150, S.roadY(5), Math.PI / 2, Cars.MODELS[0], '#c0392b');
      h.inCar = car2; h.x = car2.x; h.y = car2.y; h.ang = Math.PI / 2; car2.speed = 290;
      G.wanted = 5;
      Story.mission = 5; Story.vaultCracked = true;
      h.cash = 550; h.weapon = 0;
      Cars.ensurePolice();
      if (Cars.police[0]) { Cars.police[0].x = h.x - 220; Cars.police[0].y = h.y - 120; }
      if (Cars.police[1]) { Cars.police[1].x = h.x + 160; Cars.police[1].y = h.y - 160; }
      if (Cars.police[2]) { Cars.police[2].x = h.x - 60; Cars.police[2].y = h.y + 200; }
      Cars.ensureHeli();
      var taxi2 = Cars.makeCar(h.x + 60, h.y + 260, 0, Cars.MODELS[2], S.PALETTE.taxi);
      Cars.traffic.push(taxi2);
    }
    var tx = U.clamp(h.x - 640, 0, S.W - 1280);
    var ty = U.clamp(h.y - 360, 0, S.H - 720);
    G.cam.x = tx; G.cam.y = ty;
    this.render();
    window.__lbShotReady = true;
    document.title = 'SHOT ' + kind;
  }
};
Engine.init();
