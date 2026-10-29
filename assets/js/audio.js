'use strict';

(function () {
  const MASTER_VOL = 0.6;

  // Minimum gap between repeats of the same sound (ms) so crowds stay clean
  const THROTTLE_MS = {
    enemyHit: 60,
    enemyDie: 40,
    coin:     50,
    wallTap:  50,
    hurt:     80,
  };

  // Note frequencies (Hz)
  const N = {
    A3: 220.00, D4: 293.66, F4: 349.23, A4: 440.00,
    C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77,
    C6: 1046.50, E6: 1318.51,
  };

  let ac         = null;   // AudioContext, created on first user gesture
  let master     = null;
  let noiseBuf   = null;
  let unlockedOnce = false;
  const lastPlay = {};

  function loadSettings() {
    try {
      const d = JSON.parse(localStorage.getItem('gs_settings') || '{}');
      return { muted: !!d.muted };
    } catch (e) {
      return { muted: false };
    }
  }

  function saveSettings() {
    try { localStorage.setItem('gs_settings', JSON.stringify({ muted: GS.sfx.muted })); } catch (e) {}
  }

  // ---- Synth primitives -----------------------------------------------------

  // Gain envelope: quick attack, exponential decay to silence over dur
  function envelope(t, dur, vol, attack) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    return g;
  }

  // Oscillator with optional pitch sweep (f0 → f1) and vibrato
  function tone(o) {
    const t   = ac.currentTime + (o.at || 0);
    const osc = ac.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);

    if (o.vibrato) {
      const lfo  = ac.createOscillator();
      const lfoG = ac.createGain();
      lfo.frequency.value = o.vibrato;
      lfoG.gain.value     = o.vibratoDepth || 30;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + o.dur);
    }

    osc.connect(envelope(t, o.dur, o.vol, o.attack));
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
  }

  // Filtered white noise with optional filter sweep (f0 → f1)
  function noise(o) {
    const t   = ac.currentTime + (o.at || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;

    const flt = ac.createBiquadFilter();
    flt.type = o.filter || 'bandpass';
    flt.frequency.setValueAtTime(o.f0, t);
    if (o.f1) flt.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    flt.Q.value = o.Q || 1;

    src.connect(flt);
    flt.connect(envelope(t, o.dur, o.vol, o.attack));
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.02);
  }

  function notes(list, step, dur, type, vol, at) {
    list.forEach((f, i) => tone({ type, f0: f, dur, vol, at: (at || 0) + i * step }));
  }

  // ---- Sound recipes --------------------------------------------------------

  const SOUNDS = {
    bow:         () => tone({ type: 'triangle', f0: 700, f1: 280, dur: 0.09, vol: 0.5, attack: 0.002 }),
    bolt:        () => tone({ type: 'sine', f0: 500, f1: 1200, dur: 0.18, vol: 0.35, vibrato: 30, vibratoDepth: 40 }),
    swing:       () => noise({ filter: 'bandpass', f0: 1800, Q: 1.5, dur: 0.07, vol: 0.7 }),
    swingCleric: () => noise({ filter: 'bandpass', f0: 2600, Q: 1.5, dur: 0.07, vol: 0.7 }),

    enemyHit: () => {
      tone({ type: 'square', f0: 180, f1: 150, dur: 0.045, vol: 0.2 });
      noise({ filter: 'highpass', f0: 2000, dur: 0.02, vol: 0.3 });
    },
    enemyDie: () => noise({ filter: 'lowpass', f0: 2000, f1: 150, dur: 0.22, vol: 0.7 }),
    bossDie:  () => {
      [0, 0.15, 0.3].forEach(at => noise({ filter: 'lowpass', f0: 2000, f1: 120, dur: 0.3, vol: 0.7, at }));
      tone({ type: 'sine', f0: 110, f1: 40, dur: 0.9, vol: 0.6 });
    },
    coin: () => {
      tone({ type: 'sine', f0: N.B5, dur: 0.05, vol: 0.2 });
      tone({ type: 'sine', f0: N.E6, dur: 0.08, vol: 0.2, at: 0.05 });
    },
    hurt:    () => tone({ type: 'sawtooth', f0: 220, f1: 90, dur: 0.14, vol: 0.45 }),
    wallTap: () => noise({ filter: 'highpass', f0: 3000, dur: 0.03, vol: 0.25 }),

    uiClick: () => tone({ type: 'square', f0: 1000, dur: 0.03, vol: 0.2 }),
    unlock:  () => notes([N.C5, N.E5, N.G5, N.C6], 0.06, 0.08, 'square', 0.25),

    // Win starts after a short pause so it doesn't collide with bossDie
    win: () => {
      notes([N.C5, N.E5, N.G5, N.C6], 0.12, 0.14, 'triangle', 0.3, 0.5);
      [N.C5, N.E5, N.G5, N.C6].forEach(f => tone({ type: 'triangle', f0: f, dur: 0.9, vol: 0.15, at: 1.0 }));
    },
    death: () => notes([N.A4, N.F4, N.D4, N.A3], 0.22, 0.26, 'triangle', 0.3, 0.15),
    revive: () => {
      tone({ type: 'sawtooth', f0: 90, f1: 220, dur: 0.14, vol: 0.25 });
      notes([N.C5, N.E5, N.G5, N.C6], 0.06, 0.08, 'square', 0.25, 0.1);
    },
  };

  // ---- Public API -----------------------------------------------------------

  GS.sfx = {
    muted: loadSettings().muted,

    // Browsers block audio until a user gesture; called from the listeners below.
    // Safe to call repeatedly: every gesture retries until the context is running.
    unlock: function () {
      if (!ac) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;

        // iOS/iPadOS 17+: play through the silent switch, like a game should
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

        ac = new Ctx();

        // No compressor: Chromium's squashes short sounds badly. Per-sound
        // volumes plus throttling keep overlapping sounds below clipping.
        master = ac.createGain();
        master.gain.value = MASTER_VOL;
        master.connect(ac.destination);

        // Shared 1-second white-noise buffer
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }

      // Safari can report 'interrupted' as well as 'suspended'
      if (ac.state !== 'running') {
        const r = ac.resume();
        if (r && r.catch) r.catch(function () {});
      }

      // Older Safari only unlocks after a sound is started inside the gesture
      if (!unlockedOnce) {
        const src = ac.createBufferSource();
        src.buffer = ac.createBuffer(1, 1, ac.sampleRate);
        src.connect(ac.destination);
        src.start(0);
        unlockedOnce = true;
      }
    },

    // Diagnostic: run GS.sfx.state() in the browser console
    state: function () {
      return ac ? ac.state : 'not started';
    },

    play: function (name) {
      if (GS.sfx.muted || !ac || ac.state !== 'running') return;
      const recipe = SOUNDS[name];
      if (!recipe) return;

      const now = performance.now();
      const gap = THROTTLE_MS[name];
      if (gap && lastPlay[name] && now - lastPlay[name] < gap) return;
      lastPlay[name] = now;

      recipe();
    },

    toggleMute: function () {
      GS.sfx.muted = !GS.sfx.muted;
      saveSettings();
    },
  };

  // Several gesture types: Safari doesn't treat every one as permission to play
  ['pointerdown', 'mousedown', 'touchend', 'click'].forEach(function (type) {
    document.addEventListener(type, GS.sfx.unlock);
  });
  document.addEventListener('keydown', function (e) {
    GS.sfx.unlock();
    if (e.key === 'm' || e.key === 'M') GS.sfx.toggleMute();
  });
}());
