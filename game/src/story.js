// story.js — the seven jobs Jax runs for Mara the fixer, plus taxi fares
// and the replayable midnight race. Each mission exposes one objective line
// and one map marker; completing a job pays out and opens the next.
'use strict';
var Story = {
  mission: 1, done: 0,
  timer: 0, checkpoints: [], cpIndex: 0,
  collect: [], heatPeak: false, bankHold: 0, vaultCracked: false,
  convoy: [], taxi: null, raceUnlocked: false,
  reset: function () {
    this.mission = 1; this.done = 0;
    this.timer = 0; this.checkpoints = []; this.cpIndex = 0;
    this.collect = []; this.heatPeak = false; this.bankHold = 0; this.vaultCracked = false;
    this.convoy = []; this.taxi = null; this.raceUnlocked = false;
  },
  enterMission: function (n) {
    this.checkpoints = []; this.cpIndex = 0; this.timer = 0;
    this.collect = []; this.heatPeak = false; this.bankHold = 0; this.vaultCracked = false;
    if (n === 2) { this.checkpoints = [City.randomIntersection(), City.randomIntersection(), City.randomIntersection()]; this.timer = 90; }
    if (n === 3) { this.collect = [{ id: 'arms', got: false }, { id: 'diner', got: false }, { id: 'ray', got: false }]; }
    if (n === 6) {
      this.checkpoints = [];
      for (var i = 0; i < 5; i++) this.checkpoints.push(City.randomIntersection());
      this.timer = 120;
    }
    if (n === 7) {
      this.convoy = [];
      for (var j = 0; j < 3; j++) {
        var p = City.randomIntersection();
        var suv = Cars.makeCar(p.x, p.y, 0, Cars.MODELS[4], '#1a1a1a');
        suv.hp = 120; suv.wp = City.randomIntersection(); suv.convoy = true;
        this.convoy.push(suv);
      }
    }
  },
  update: function (dt) {
    var h = G.hero, m = this.mission;
    // A loaded save may land mid-mission without its setup — rebuild it.
    if ((m === 2 || m === 6) && this.checkpoints.length === 0) this.enterMission(m);
    if (m === 3 && this.collect.length === 0) this.enterMission(m);
    if (m === 7 && this.convoy.length === 0) this.enterMission(m);
    if (this.taxi) this.updateTaxi(dt);
    if (m === 1) {
      if (h.inCar && U.dist(h.x, h.y, City.landmarks.garage.x, City.landmarks.garage.y) < 70) this.completeMission();
    } else if (m === 2 || m === 6) {
      this.timer -= dt;
      if (this.timer <= 0) { this.failMission('Too slow — the job is blown, try again.'); return; }
      var cp = this.checkpoints[this.cpIndex];
      if (cp && U.dist(h.x, h.y, cp.x, cp.y) < 70) {
        this.cpIndex++;
        Radio.sfx('pickup');
        G.msg = 'Checkpoint ' + this.cpIndex + '/' + this.checkpoints.length; G.msgTimer = 2;
        if (this.cpIndex >= this.checkpoints.length) this.completeMission();
      }
    } else if (m === 3) {
      if (this.collect.every(function (c) { return c.got; })) this.completeMission();
    } else if (m === 4) {
      if (G.wanted >= 3) this.heatPeak = true;
      if (this.heatPeak && G.wanted === 0 && U.dist(h.x, h.y, City.landmarks.safe.x, City.landmarks.safe.y) < 70) this.completeMission();
    } else if (m === 5) {
      if (!this.vaultCracked) {
        if (G.input.keys.KeyE && U.dist(h.x, h.y, City.landmarks.bank.x, City.landmarks.bank.y) < 85) {
          this.bankHold += dt;
          if (this.bankHold >= 3) {
            this.vaultCracked = true;
            h.cash += 600; G.wanted = 5;
            G.msg = 'Vault cracked! +$600 — run for the pier!'; G.msgTimer = 4;
            Radio.sfx('jingle');
          }
        } else this.bankHold = Math.max(0, this.bankHold - dt * 2);
      } else if (U.dist(h.x, h.y, City.landmarks.pier.x, City.landmarks.pier.y) < 85) this.completeMission();
    } else if (m === 7) {
      this.updateConvoy(dt);
      var alive = this.convoy.filter(function (c) { return !c.dead; }).length;
      if (alive === 0) this.completeMission();
    }
  },
  updateConvoy: function (dt) {
    for (var i = 0; i < this.convoy.length; i++) {
      var c = this.convoy[i];
      if (c.dead) continue;
      var d = U.dist(c.x, c.y, c.wp.x, c.wp.y);
      if (d < 24) { c.wp = City.randomIntersection(); continue; }
      c.ang = U.turnToward(c.ang, U.angTo(c.x, c.y, c.wp.x, c.wp.y), 2.8 * dt);
      c.speed = 140;
      Cars.moveCar(c, dt);
      c.ramCd -= dt;
      if (G.hero.inCar && U.dist(c.x, c.y, G.hero.x, G.hero.y) < 52 && Math.abs(G.hero.speed) > 150 && c.ramCd <= 0) {
        c.ramCd = 1;
        Cars.damageCar(c, 25);
        Cars.damageCar(G.hero.inCar, 10);
        G.cam.shake = 8;
        Radio.sfx('crash');
      }
    }
  },
  updateTaxi: function (dt) {
    var t = this.taxi;
    if (!G.hero.inCar) {
      t.ped.state = 'stroll';
      this.taxi = null;
      G.msg = 'Fare cancelled'; G.msgTimer = 2;
      return;
    }
    if (U.dist(G.hero.x, G.hero.y, t.dest.x, t.dest.y) < 70) {
      var fare = 25 + RNG.int(0, 35);
      G.hero.cash += fare;
      t.ped.state = 'stroll';
      t.ped.x = t.dest.x + 20; t.ped.y = t.dest.y + 20;
      this.taxi = null;
      G.msg = 'Fare done +$' + fare; G.msgTimer = 3;
      Radio.sfx('pickup');
    }
  },
  taxiStart: function (ped) {
    ped.state = 'riding';
    this.taxi = { ped: ped, dest: City.randomIntersection() };
    G.msg = 'Taxi: take them to the cyan marker'; G.msgTimer = 3;
  },
  interact: function () {
    // Mission 3 collections happen at the shops.
    if (this.mission !== 3) return false;
    var h = G.hero;
    var map = { gun: 'arms', diner: 'diner', garage: 'ray' };
    for (var i = 0; i < City.shops.length; i++) {
      var s = City.shops[i];
      if (U.dist(h.x, h.y, s.x, s.y) >= s.r) continue;
      var want = map[s.kind];
      for (var j = 0; j < this.collect.length; j++) {
        if (this.collect[j].id === want && !this.collect[j].got) {
          this.collect[j].got = true;
          h.cash += 50;
          G.msg = 'Collected $50 — ' + (this.collect.filter(function (c) { return c.got; }).length) + '/3 shops'; G.msgTimer = 2;
          Radio.sfx('pickup');
          return true;
        }
      }
    }
    return false;
  },
  objectiveText: function () {
    var h = G.hero, m = this.mission;
    var t = '';
    if (m === 1) t = h.inCar ? 'JOB 1/7 — First Wheels: Deliver the car to Mara\'s Garage' : 'JOB 1/7 — First Wheels: Steal a car (E near a parked car)';
    else if (m === 2) t = 'JOB 2/7 — Neon Courier: Checkpoint ' + this.cpIndex + '/' + this.checkpoints.length + ' — ' + Math.ceil(this.timer) + 's left';
    else if (m === 3) t = 'JOB 3/7 — Protection Money: Collect ' + this.collect.filter(function (c) { return c.got; }).length + '/3 (E at the shops)';
    else if (m === 4) t = !this.heatPeak ? 'JOB 4/7 — Heat Wave: Raise 3 stars of heat' : (G.wanted > 0 ? 'JOB 4/7 — Heat Wave: Lose the heat!' : 'JOB 4/7 — Heat Wave: Reach the safehouse');
    else if (m === 5) t = !this.vaultCracked ? 'JOB 5/7 — The Big Score: Hold E at the bank vault' : 'JOB 5/7 — The Big Score: Escape to the Harbor Pier';
    else if (m === 6) t = 'JOB 6/7 — Midnight Race: Checkpoint ' + this.cpIndex + '/' + this.checkpoints.length + ' — ' + Math.ceil(this.timer) + 's left';
    else if (m === 7) t = 'JOB 7/7 — King of the Bay: Destroy the convoy (' + this.convoy.filter(function (c) { return !c.dead; }).length + ' left)';
    else t = 'You run Lumen Bay.';
    if (this.taxi) t += '  •  TAXI: drop them at the cyan marker';
    return t;
  },
  marker: function () {
    var h = G.hero, m = this.mission;
    if (m === 1) return h.inCar ? { x: City.landmarks.garage.x, y: City.landmarks.garage.y } : null;
    if (m === 2 || m === 6) return this.checkpoints[this.cpIndex] || null;
    if (m === 3) {
      for (var i = 0; i < this.collect.length; i++) {
        if (!this.collect[i].got) {
          var L = City.landmarks[this.collect[i].id];
          if (L) return { x: L.x, y: L.y };
        }
      }
      return null;
    }
    if (m === 4) return (this.heatPeak && G.wanted === 0) ? { x: City.landmarks.safe.x, y: City.landmarks.safe.y } : null;
    if (m === 5) return !this.vaultCracked ? { x: City.landmarks.bank.x, y: City.landmarks.bank.y } : { x: City.landmarks.pier.x, y: City.landmarks.pier.y };
    if (m === 7) {
      for (var j = 0; j < this.convoy.length; j++) if (!this.convoy[j].dead) return { x: this.convoy[j].x, y: this.convoy[j].y };
      return null;
    }
    return null;
  },
  completeMission: function () {
    var def = S.MISSIONS[this.mission - 1];
    G.hero.cash += def.reward;
    this.done++;
    G.msg = 'JOB DONE: ' + def.name + ' +$' + def.reward; G.msgTimer = 4;
    Radio.sfx('jingle');
    Save.save();
    if (this.mission === 6) this.raceUnlocked = true;
    this.mission++;
    if (this.mission > 7) { G.state = 'complete'; return; }
    this.enterMission(this.mission);
  },
  failMission: function (msg) {
    G.msg = msg; G.msgTimer = 3;
    this.enterMission(this.mission);
  }
};
