// storage.js — localStorage save / load for LUMEN BAY.
// Saves cash, health, armour, ammo, weapon, mission progress, the clock and
// where the player stands. Autosave runs every 20 seconds of play.
'use strict';
var Save = {
  KEY: S.SAVE_KEY,
  data: function () {
    var h = (typeof G !== 'undefined' && G) ? G.hero : null;
    return {
      cash: h ? h.cash : 150,
      hp: h ? h.hp : 100,
      armor: h ? h.armor : 0,
      ammo: h ? h.ammo.slice() : [Infinity, 0, 0, 0],
      owned: h ? (h.owned || [true, false, false, false]).slice() : [true, false, false, false],
      weapon: h ? h.weapon : 0,
      mission: (typeof Story !== 'undefined') ? Story.mission : 1,
      done: (typeof Story !== 'undefined') ? Story.done : 0,
      clockMin: (typeof G !== 'undefined' && G) ? G.clockMin : S.CLOCK_START,
      x: h ? h.x : 0,
      y: h ? h.y : 0,
      nos: h ? h.nos : 100
    };
  },
  save: function () {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.data()));
      return true;
    } catch (e) { return false; }
  },
  load: function () {
    try {
      var raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (typeof d.cash !== 'number' || typeof d.mission !== 'number') return null;
      return d;
    } catch (e) { return null; }
  },
  clear: function () {
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },
  apply: function (d) {
    if (!d || typeof G === 'undefined' || !G) return;
    var h = G.hero;
    h.cash = d.cash; h.hp = d.hp; h.armor = d.armor;
    h.ammo = d.ammo.slice(); h.weapon = d.weapon;
    h.owned = d.owned ? d.owned.slice() : [true, false, false, false];
    h.x = d.x; h.y = d.y; h.nos = d.nos || 100;
    if (typeof Story !== 'undefined') { Story.mission = d.mission; Story.done = d.done || 0; }
    G.clockMin = d.clockMin;
  }
};
