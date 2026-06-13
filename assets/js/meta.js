'use strict';

(function () {
  // -------------------------------------------------------------------------
  // Class unlock thresholds (checked dynamically — not deducted, just gated)
  // -------------------------------------------------------------------------
  GS.CLASS_UNLOCK = {
    CLERIC: { gold: 200, bossKills: 0 },
    WIZARD: { gold: 400, bossKills: 1 },
  };

  // -------------------------------------------------------------------------
  // Upgrade pool — purchasable with gold between runs
  // -------------------------------------------------------------------------
  GS.UPGRADES = [
    { id: 'hp_up',       name: 'Iron Constitution', desc: '+20 max HP',                maxLevel: 3 },
    { id: 'speed_up',    name: 'Fleet Foot',         desc: '+0.3 move speed',           maxLevel: 3 },
    { id: 'power_up',    name: 'Sharp Edge',         desc: '+1 attack damage',          maxLevel: 3 },
    { id: 'cooldown',    name: 'Swift Strike',       desc: '-15% attack cooldown',      maxLevel: 3 },
    { id: 'armor',       name: 'Thick Hide',         desc: '-1 incoming damage (min 1)', maxLevel: 3 },
    { id: 'regen',       name: 'Vitality',           desc: 'Passive HP regen',          maxLevel: 3 },
    { id: 'gold_find',   name: 'Fortune',            desc: '+50% gold per kill',        maxLevel: 3 },
    { id: 'second_wind', name: 'Second Wind',        desc: 'Revive once at 10 HP',      maxLevel: 1 },
  ];

  // -------------------------------------------------------------------------
  // Per-run stats — reset at the start of each new run
  // -------------------------------------------------------------------------
  GS.runStats = {
    gold:           0,
    goldThisRun:    0,   // frozen snapshot shown on the end screen
    kills:          0,
    secondWindUsed: false,
  };

  GS.runStats.reset = function () {
    GS.runStats.gold           = 0;
    GS.runStats.goldThisRun    = 0;
    GS.runStats.kills          = 0;
    GS.runStats.secondWindUsed = false;
  };

  // -------------------------------------------------------------------------
  // Persistent meta — survives page reloads via localStorage
  // -------------------------------------------------------------------------
  GS.meta = {
    gold:            0,
    bossKills:       0,
    upgrades:        {},    // { upgradeId: level }
    unlockedClasses: { WARRIOR: true, ELF: true, CLERIC: false, WIZARD: false },
  };

  GS.meta.save = function () {
    try {
      localStorage.setItem('gs_meta', JSON.stringify({
        gold:            GS.meta.gold,
        bossKills:       GS.meta.bossKills,
        upgrades:        GS.meta.upgrades,
        unlockedClasses: GS.meta.unlockedClasses,
      }));
    } catch (e) {}
  };

  GS.meta.load = function () {
    try {
      const raw = localStorage.getItem('gs_meta');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.gold      === 'number') GS.meta.gold      = d.gold;
      if (typeof d.bossKills === 'number') GS.meta.bossKills = d.bossKills;
      if (d.upgrades)        Object.assign(GS.meta.upgrades,        d.upgrades);
      if (d.unlockedClasses) Object.assign(GS.meta.unlockedClasses, d.unlockedClasses);
    } catch (e) {}
  };

  GS.meta.wipe = function () {
    try { localStorage.removeItem('gs_meta'); } catch (e) {}
    GS.meta.gold            = 0;
    GS.meta.bossKills       = 0;
    GS.meta.upgrades        = {};
    GS.meta.unlockedClasses = { WARRIOR: true, ELF: true, CLERIC: false, WIZARD: false };
  };
}());
