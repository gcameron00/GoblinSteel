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
    // Enemy voices: one of each kind at a time, so a room doesn't shout in unison
    goblinAlert:    500,
    skeletonAlert:  500,
    orcAlert:       500,
    bossAlert:     1500,
    goblinIdle:     800,
    skeletonIdle:   800,
    orcIdle:        800,
    bossIdle:      1500,
  };

  // Note frequencies (Hz)
  const N = {
    D2: 73.42,
    A3: 220.00, AS3: 233.08, CS4: 277.18, D4: 293.66, E4: 329.63, F4: 349.23,
    A4: 440.00, AS4: 466.16, D5: 587.33,
    C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77,
    C6: 1046.50, E6: 1318.51,
  };

  let ac         = null;   // AudioContext, created on first user gesture
  let master     = null;
  let noiseBuf   = null;
  let unlockedOnce = false;
  let route      = null;   // where envelopes connect: master by default, or a panner / music bus
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
    g.connect(route || master);
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

    let src = osc;
    if (o.lowpass) {
      const flt = ac.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = o.lowpass;
      osc.connect(flt);
      src = flt;
    }
    src.connect(envelope(t, o.dur, o.vol, o.attack));
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

  // ---- Enemy voices (played positionally via GS.sfx.playAt) -----------------

  // Short clicks at irregular gaps: bones knocking together
  function rattle(count, vol) {
    let at = 0;
    for (let i = 0; i < count; i++) {
      noise({ filter: 'bandpass', f0: 2500 + Math.random() * 1500, Q: 4, dur: 0.018, vol, at });
      at += 0.025 + Math.random() * 0.03;
    }
  }

  // Nasal "heh" chirps with a fast wobble
  function cackle(count, vol, pitch) {
    for (let i = 0; i < count; i++) {
      const f = pitch * (1 + (Math.random() - 0.5) * 0.15);
      tone({ type: 'square', f0: f, f1: f * 0.7, dur: 0.06, vol, at: i * 0.075,
             vibrato: 25, vibratoDepth: 40, lowpass: 1800 });
    }
  }

  const VOICES = {
    goblinAlert:   () => cackle(4, 0.3, 700),
    goblinIdle:    () => cackle(2, 0.2, 480),
    skeletonAlert: () => {
      rattle(8, 0.5);
      tone({ type: 'sine', f0: 180, f1: 110, dur: 0.35, vol: 0.2, vibrato: 6, vibratoDepth: 8 });
    },
    skeletonIdle:  () => rattle(4, 0.35),
    orcAlert:      () => {
      tone({ type: 'sawtooth', f0: 120, f1: 70, dur: 0.3, vol: 0.45, lowpass: 600 });
      noise({ filter: 'lowpass', f0: 500, dur: 0.25, vol: 0.3 });
    },
    orcIdle:       () => tone({ type: 'sawtooth', f0: 95, f1: 75, dur: 0.2, vol: 0.3, lowpass: 450 }),
    bossAlert:     () => {
      tone({ type: 'sawtooth', f0: 95, f1: 45, dur: 1.0, vol: 0.5, lowpass: 700, vibrato: 7, vibratoDepth: 10 });
      tone({ type: 'square', f0: 62, f1: 50, dur: 0.9, vol: 0.25, lowpass: 400 });
      noise({ filter: 'lowpass', f0: 900, f1: 200, dur: 0.9, vol: 0.35, attack: 0.05 });
    },
    bossIdle:      () => tone({ type: 'sawtooth', f0: 70, f1: 55, dur: 0.6, vol: 0.35, lowpass: 500, vibrato: 5, vibratoDepth: 6 }),
  };

  const HEAR_RANGE = 420;   // px: beyond this an enemy is silent

  // ---- Music: drone + D-minor arpeggio, faster while the boss hunts you ------

  const ARP = [
    [N.D4, N.A4, N.F4, N.A4, N.D5, N.A4, N.F4, N.A4],      // Dm
    [N.D4, N.A4, N.F4, N.A4, N.D5, N.A4, N.F4, N.A4],      // Dm
    [N.AS3, N.F4, N.D4, N.F4, N.AS4, N.F4, N.D4, N.F4],    // Bb
    [N.A3, N.E4, N.CS4, N.E4, N.A4, N.E4, N.CS4, N.E4],    // A
  ];
  const MUSIC_VOL = 0.5;

  const music = { on: false, boss: false, bus: null, drone: [], droneFlt: null, timer: null, next: 0, step: 0 };
  let ghostAt = 0;   // performance.now() time of the next distant wail

  function musicStart() {
    music.on   = true;
    music.boss = false;
    music.bus  = ac.createGain();
    music.bus.gain.setValueAtTime(0.0001, ac.currentTime);
    music.bus.gain.exponentialRampToValueAtTime(MUSIC_VOL, ac.currentTime + 1.5);
    music.bus.connect(master);

    // Drone: two detuned saws on low D through a lowpass
    music.droneFlt = ac.createBiquadFilter();
    music.droneFlt.type = 'lowpass';
    music.droneFlt.frequency.value = 400;
    const dg = ac.createGain();
    dg.gain.value = 0.12;
    music.droneFlt.connect(dg);
    dg.connect(music.bus);
    music.drone = [-6, 6].map(function (cents) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = N.D2;
      o.detune.value    = cents;
      o.connect(music.droneFlt);
      o.start();
      return o;
    });

    // Look-ahead scheduler: queue notes ~100 ms ahead on a 25 ms timer
    music.next = ac.currentTime + 0.1;
    music.step = 0;
    music.timer = setInterval(scheduleNotes, 25);
  }

  function scheduleNotes() {
    const stepDur = 60 / (music.boss ? 130 : 100) / 2;   // eighth notes
    // Background tabs throttle timers; skip ahead rather than play a backlog at once
    if (music.next < ac.currentTime) music.next = ac.currentTime + 0.05;
    while (music.next < ac.currentTime + 0.1) {
      const bar  = ARP[Math.floor(music.step / 8) % ARP.length];
      route = music.bus;
      tone({ type: 'square', f0: bar[music.step % 8], dur: stepDur * 0.9, vol: 0.06,
             lowpass: music.boss ? 2400 : 1400, at: music.next - ac.currentTime });
      route = null;
      music.next += stepDur;
      music.step++;
    }
  }

  function musicStop() {
    music.on = false;
    clearInterval(music.timer);
    const t = ac.currentTime;
    music.bus.gain.cancelScheduledValues(t);
    music.bus.gain.setValueAtTime(Math.max(0.0001, music.bus.gain.value), t);
    music.bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    music.drone.forEach(function (o) { o.stop(t + 0.6); });
  }

  // Occasional far-off wail from somewhere in the dark: slow swell, wavering pitch
  function ghostWail() {
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(master); }
    route = pan;
    const f = 320 + Math.random() * 120;
    tone({ type: 'sine', f0: f, f1: f * 0.75, dur: 2.4, vol: 0.12, attack: 0.9, vibrato: 4, vibratoDepth: 12 });
    tone({ type: 'triangle', f0: f * 1.5, f1: f * 1.1, dur: 2.0, vol: 0.04, attack: 1.0, vibrato: 5, vibratoDepth: 10, at: 0.2 });
    route = null;
  }

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

    // Enemy voice at a world position: quieter with distance, panned left/right
    playAt: function (name, x, y) {
      if (GS.sfx.muted || !ac || ac.state !== 'running') return;
      const recipe = VOICES[name];
      if (!recipe) return;

      const dx   = x - GS.player.x;
      const dy   = y - GS.player.y;
      const near = 1 - Math.sqrt(dx * dx + dy * dy) / HEAR_RANGE;
      if (near <= 0.05) return;

      const now = performance.now();
      const gap = THROTTLE_MS[name];
      if (gap && lastPlay[name] && now - lastPlay[name] < gap) return;
      lastPlay[name] = now;

      const g = ac.createGain();
      g.gain.value = near * near;
      if (ac.createStereoPanner) {
        const pan = ac.createStereoPanner();
        pan.pan.value = Math.max(-0.8, Math.min(0.8, dx / 300));
        g.connect(pan);
        pan.connect(master);
      } else {
        g.connect(master);
      }
      route = g;
      recipe();
      route = null;
    },

    // Called every frame from main.js: 'off', 'normal' or 'boss'
    music: function (mode) {
      if (!ac || ac.state !== 'running') return;
      const want = mode !== 'off' && !GS.sfx.muted;
      if (want && !music.on) musicStart();
      if (!want && music.on) musicStop();
      if (!music.on) return;

      const boss = mode === 'boss';
      if (boss !== music.boss) {
        music.boss = boss;
        music.droneFlt.frequency.setTargetAtTime(boss ? 900 : 400, ac.currentTime, 0.5);
      }

      // A distant wail every 25-45 s while exploring
      const now = performance.now();
      if (!ghostAt) ghostAt = now + 15000 + Math.random() * 10000;
      if (now >= ghostAt) {
        ghostWail();
        ghostAt = now + 25000 + Math.random() * 20000;
      }
    },

    toggleMute: function () {
      GS.sfx.muted = !GS.sfx.muted;
      saveSettings();
      if (GS.sfx.muted && music.on) musicStop();
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
