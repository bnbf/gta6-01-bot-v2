// rng.js — deterministic seeded random numbers (mulberry32) for LUMEN BAY.
// Every random choice in the city, traffic and crowds comes from here, so a
// fixed seed replays the same world.
'use strict';
var RNG = {
  _s: 1337,
  seed: function (n) { this._s = (n >>> 0) || 1; },
  next: function () {
    var t = (this._s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  range: function (a, b) { return a + (b - a) * this.next(); },
  int: function (a, b) { return Math.floor(this.range(a, b + 1)); },
  pick: function (arr) { return arr[Math.floor(this.next() * arr.length)]; },
  chance: function (p) { return this.next() < p; },
  hash: function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
};
