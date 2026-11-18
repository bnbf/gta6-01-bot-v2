// radio.js — procedural WebAudio radio and sound effects for LUMEN BAY.
// Nothing is loaded: two synth stations (NEON FM synthwave, BAY 98 chill)
// and every effect are synthesized live. All audio is guarded, so a
// headless run without audio never throws.
'use strict';
var Radio = {
  station: 0, // 0 off, 1 NEON FM, 2 BAY 98
  ctx: null, master: null, musicGain: null, sfxGain: null,
  _timer: null, _step: 0, _nextTime: 0, _noiseBuf: null,
  _engOsc: null, _engGain: null,
  STATIONS: ['OFF', 'NEON FM', 'BAY 98'],
  ensure: function () {
    try {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.12; this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.5; this.sfxGain.connect(this.master);
        var len = this.ctx.sampleRate * 0.5;
        this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var d = this._noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    } catch (e) { return false; }
  },
  toggle: function () {
    this.station = (this.station + 1) % 3;
    if (this.station === 0) this.stopMusic();
    else if (this.ensure()) this.startMusic();
    G.msg = 'Radio: ' + this.STATIONS[this.station]; G.msgTimer = 2;
    return this.station;
  },
  startMusic: function () {
    if (this._timer) return;
    var self = this;
    this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.05;
    this._timer = setInterval(function () { self.schedule(); }, 100);
  },
  stopMusic: function () {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },
  schedule: function () {
    if (!this.ctx || this.station === 0) return;
    var stepDur = this.station === 1 ? 60 / 132 / 4 : 60 / 88 / 4;
    while (this._nextTime < this.ctx.currentTime + 0.3) {
      this.playStep(this._step, this._nextTime, stepDur);
      this._step = (this._step + 1) % 64;
      this._nextTime += stepDur;
    }
  },
  playStep: function (step, time, stepDur) {
    if (this.station === 1) {
      // NEON FM: 132 BPM synthwave arpeggio over an A-minor bass.
      var arp = [220, 261.63, 329.63, 440, 523.25, 440, 329.63, 261.63];
      this.note(arp[step % 8], time, stepDur * 0.9, 'sawtooth', 0.4, 1600, this.musicGain);
      if (step % 16 === 0) this.note(55, time, stepDur * 14, 'triangle', 0.6, 0, this.musicGain);
      if (step % 2 === 1) this.noiseHit(time, 0.03, 0.12, 6000);
    } else {
      // BAY 98: 88 BPM slow chords — Am, F, C, G, one bar each.
      var roots = [110, 87.31, 130.81, 98];
      var bar = Math.floor(step / 16) % 4;
      if (step % 16 === 0) {
        this.note(roots[bar] * 2, time, stepDur * 15, 'triangle', 0.35, 0, this.musicGain);
        this.note(roots[bar] * 3, time, stepDur * 15, 'triangle', 0.22, 0, this.musicGain);
        this.note(roots[bar] / 2, time, stepDur * 15, 'sine', 0.5, 0, this.musicGain);
      }
      if (step % 16 === 6 || step % 16 === 11) this.note(roots[bar] * 4, time, stepDur * 2, 'sine', 0.18, 0, this.musicGain);
    }
  },
  note: function (freq, time, dur, type, vol, filterFreq, dest) {
    try {
      if (!this.ctx) return;
      var osc = this.ctx.createOscillator();
      osc.type = type; osc.frequency.value = freq;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(vol, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      var node = osc;
      if (filterFreq) {
        var f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = filterFreq;
        osc.connect(f); node = f;
      }
      node.connect(g); g.connect(dest || this.musicGain);
      osc.start(time); osc.stop(time + dur + 0.05);
    } catch (e) {}
  },
  noiseHit: function (time, dur, vol, filterFreq) {
    try {
      if (!this.ctx || !this._noiseBuf) return;
      var src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf;
      var f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = filterFreq;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      src.connect(f); f.connect(g); g.connect(this.musicGain);
      src.start(time); src.stop(time + dur);
    } catch (e) {}
  },
  sfx: function (name) {
    try {
      if (!this.ensure()) return;
      var t = this.ctx.currentTime;
      if (name === 'shot') {
        this.noiseHit(t, 0.09, 0.9, 900);
        this.note(160, t, 0.06, 'square', 0.4, 0, this.sfxGain);
      } else if (name === 'crash') {
        var osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        var g = this.ctx.createGain();
        g.gain.setValueAtTime(0.6, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.32);
      } else if (name === 'pickup') {
        var o2 = this.ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.setValueAtTime(660, t);
        o2.frequency.exponentialRampToValueAtTime(990, t + 0.12);
        var g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.4, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o2.connect(g2); g2.connect(this.sfxGain);
        o2.start(t); o2.stop(t + 0.16);
      } else if (name === 'jingle') {
        var notes = [523.25, 659.25, 783.99, 1046.5];
        for (var i = 0; i < notes.length; i++) this.note(notes[i], t + i * 0.09, 0.25, 'triangle', 0.4, 0, this.sfxGain);
      }
    } catch (e) {}
  },
  engine: function (speed, nos) {
    try {
      if (!this.ensure()) return;
      if (!this._engOsc) {
        this._engOsc = this.ctx.createOscillator();
        this._engOsc.type = 'sawtooth';
        this._engOsc.frequency.value = 60;
        var f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 500;
        this._engGain = this.ctx.createGain();
        this._engGain.gain.value = 0;
        this._engOsc.connect(f); f.connect(this._engGain); this._engGain.connect(this.master);
        this._engOsc.start();
      }
      var target = speed > 10 ? 0.04 : 0;
      this._engGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      this._engOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 0.35 + (nos ? 40 : 0), this.ctx.currentTime, 0.1);
    } catch (e) {}
  }
};
