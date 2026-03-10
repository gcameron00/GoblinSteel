'use strict';

(function () {
  const CW = GS.VIEW_W;
  const CH = GS.VIEW_H + GS.HUD_H;  // 800 × 600

  // -------------------------------------------------------------------------
  // State — cards fade in OVER the title screen, no separate select screen
  // 'title' → 'select' (cards fade in) → 'play-fade' → 'game'
  // -------------------------------------------------------------------------
  let phase      = 'title';
  let timer      = 0;
  let cardAlpha  = 0;
  let fadeAlpha  = 0;
  let canvas     = null;

  const TITLE_HOLD  = 150;  // frames before cards begin appearing
  const CARD_FADE   = 50;   // frames to fade cards in
  const PLAY_FADE   = 38;   // frames to fade to black on play

  // -------------------------------------------------------------------------
  // Character definitions
  // -------------------------------------------------------------------------
  const CLASSES = [
    { name: 'WARRIOR', active: false, col: '#c84020', desc: 'Sword & Shield',
      stats: { STR: 5, DEX: 2, INT: 1, HP: 5 } },
    { name: 'ELF',     active: true,  col: '#38c028', desc: 'Longbow',
      stats: { STR: 2, DEX: 5, INT: 3, HP: 3 } },
    { name: 'CLERIC',  active: false, col: '#c8a020', desc: 'Mace & Holy',
      stats: { STR: 3, DEX: 2, INT: 4, HP: 4 } },
    { name: 'WIZARD',  active: false, col: '#8030d0', desc: 'Staff & Spells',
      stats: { STR: 1, DEX: 2, INT: 5, HP: 2 } },
  ];

  // -------------------------------------------------------------------------
  // Card layout — lower third of canvas, overlaying the scene
  // -------------------------------------------------------------------------
  const CARD_W   = 148;
  const CARD_H   = 188;
  const CARD_GAP = 18;
  const CARDS_X  = Math.round((CW - (4 * CARD_W + 3 * CARD_GAP)) / 2);
  const CARDS_Y  = 342;
  const PORT_CTR = 56;   // portrait centre y relative to card top

  const BTN_W = 180;
  const BTN_H = 38;
  const BTN_X = Math.round((CW - BTN_W) / 2);
  const BTN_Y = CARDS_Y + CARD_H + 24;

  // -------------------------------------------------------------------------
  // Interaction
  // -------------------------------------------------------------------------
  let selectedClass = -1;
  let hoverCard     = -1;
  let hoverPlay     = false;

  function cardBounds(i) {
    return { x: CARDS_X + i * (CARD_W + CARD_GAP), y: CARDS_Y, w: CARD_W, h: CARD_H };
  }
  function hit(px, py, r) {
    return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
  }
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      cx: (e.clientX - r.left) * (canvas.width  / r.width),
      cy: (e.clientY - r.top)  * (canvas.height / r.height),
    };
  }

  function handleClick(e) {
    if (phase !== 'select' || cardAlpha < 0.8) return;
    const { cx, cy } = toCanvas(e);
    for (let i = 0; i < CLASSES.length; i++) {
      if (CLASSES[i].active && hit(cx, cy, cardBounds(i))) { selectedClass = i; return; }
    }
    if (selectedClass >= 0 && CLASSES[selectedClass].active &&
        hit(cx, cy, { x: BTN_X, y: BTN_Y, w: BTN_W, h: BTN_H })) {
      phase = 'play-fade';
      timer = 0;
    }
  }

  function handleMouseMove(e) {
    if (phase !== 'select' || cardAlpha < 0.8) return;
    const { cx, cy } = toCanvas(e);
    hoverCard = -1;
    for (let i = 0; i < CLASSES.length; i++) {
      if (CLASSES[i].active && hit(cx, cy, cardBounds(i))) { hoverCard = i; break; }
    }
    hoverPlay = selectedClass >= 0 && CLASSES[selectedClass].active &&
                hit(cx, cy, { x: BTN_X, y: BTN_Y, w: BTN_W, h: BTN_H });
    canvas.style.cursor = (hoverCard >= 0 || hoverPlay) ? 'pointer' : 'default';
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  GS.screen = {
    phase: function () { return phase; },

    init: function (cvs) {
      canvas = cvs;
      canvas.addEventListener('click',     handleClick);
      canvas.addEventListener('mousemove', handleMouseMove);
    },

    destroy: function () {
      canvas.removeEventListener('click',     handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.style.cursor = 'default';
    },

    update: function () {
      timer++;
      switch (phase) {
        case 'title':
          if (timer >= TITLE_HOLD) { phase = 'select'; timer = 0; cardAlpha = 0; }
          break;
        case 'select':
          if (cardAlpha < 1) cardAlpha = Math.min(1, cardAlpha + 1 / CARD_FADE);
          break;
        case 'play-fade':
          fadeAlpha = timer / PLAY_FADE;
          if (timer >= PLAY_FADE) { phase = 'game'; fadeAlpha = 0; GS.screen.destroy(); }
          break;
      }
    },

    render: function (ctx) {
      // Background scene is ALWAYS drawn (title and select share it)
      drawScene(ctx);
      drawEmblem(ctx, CW / 2, 100);
      drawTitleText(ctx);

      // Character cards fade in over the scene
      if (phase === 'select' || phase === 'play-fade') {
        ctx.save();
        ctx.globalAlpha = cardAlpha;
        for (let i = 0; i < CLASSES.length; i++) drawCard(ctx, i);
        if (selectedClass >= 0 && CLASSES[selectedClass].active) drawPlayButton(ctx);
        ctx.restore();
      }

      // Fade to black on play
      if (fadeAlpha > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + fadeAlpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, CW, CH);
      }
    },
  };

  // =========================================================================
  // ATMOSPHERIC BACKGROUND SCENE
  // =========================================================================
  function drawScene(ctx) {
    // Night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0,    '#050318');
    sky.addColorStop(0.45, '#180840');
    sky.addColorStop(1,    '#0c0820');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CW, CH);

    // Stars (deterministic — no random flicker)
    for (let i = 0; i < 95; i++) {
      const sx   = (i * 139 + 37) % CW;
      const sy   = (i * 101 + 19) % Math.round(CH * 0.58);
      const dim  = 0.2 + (i % 5) * 0.12;
      const size = i % 13 === 0 ? 2 : 1;
      ctx.fillStyle = 'rgba(200,215,255,' + dim.toFixed(2) + ')';
      ctx.fillRect(sx, sy, size, size);
    }

    // Moon — upper right
    const mx = 655, my = 88, mr = 46;
    const halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 3.2);
    halo.addColorStop(0, 'rgba(170,195,255,0.20)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);

    ctx.fillStyle = '#c4d4ee';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    // Craters (slightly darker circles)
    ctx.fillStyle = '#aabedd';
    ctx.beginPath(); ctx.arc(mx + 10, my - 14, 9,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 18, my + 12, 6,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 20, my + 18, 7,  0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.stroke();

    // Far mountains (dark, right side)
    ctx.fillStyle = '#0b0820';
    ctx.beginPath();
    ctx.moveTo(CW,    CH * 0.88);
    ctx.lineTo(CW,    CH * 0.42);
    ctx.lineTo(770,   CH * 0.28);
    ctx.lineTo(710,   CH * 0.42);
    ctx.lineTo(660,   CH * 0.22);
    ctx.lineTo(605,   CH * 0.40);
    ctx.lineTo(545,   CH * 0.28);
    ctx.lineTo(480,   CH * 0.50);
    ctx.lineTo(440,   CH * 0.88);
    ctx.closePath(); ctx.fill();

    // Mid mountains (slightly lighter, closer)
    ctx.fillStyle = '#100e28';
    ctx.beginPath();
    ctx.moveTo(CW,    CH * 0.88);
    ctx.lineTo(CW,    CH * 0.52);
    ctx.lineTo(760,   CH * 0.38);
    ctx.lineTo(700,   CH * 0.55);
    ctx.lineTo(645,   CH * 0.36);
    ctx.lineTo(590,   CH * 0.52);
    ctx.lineTo(540,   CH * 0.88);
    ctx.closePath(); ctx.fill();

    // Ground
    const ground = ctx.createLinearGradient(0, CH * 0.80, 0, CH);
    ground.addColorStop(0, '#0e0c26');
    ground.addColorStop(1, '#070618');
    ctx.fillStyle = ground;
    ctx.fillRect(0, CH * 0.80, CW, CH * 0.20);

    // Winding path from castle
    ctx.fillStyle = '#141030';
    ctx.beginPath();
    ctx.moveTo(95, CH * 0.86);
    ctx.bezierCurveTo(180, CH * 0.90, 310, CH * 0.95, 440, CH);
    ctx.lineTo(370, CH);
    ctx.bezierCurveTo(265, CH * 0.98, 155, CH * 0.92, 65, CH * 0.88);
    ctx.closePath(); ctx.fill();

    // Castle silhouette — left side
    ctx.fillStyle = '#0c0a22';

    // Curtain wall
    ctx.fillRect(12, CH * 0.68, 175, CH * 0.32);
    // Gate arch
    ctx.fillStyle = '#07060f';
    ctx.fillRect(82, CH * 0.75, 22, CH * 0.25);
    ctx.beginPath(); ctx.arc(93, CH * 0.75, 11, Math.PI, 0); ctx.fill();

    ctx.fillStyle = '#0c0a22';
    // Gate tower
    ctx.fillRect(68, CH * 0.54, 50, CH * 0.46);
    // Battlements on gate tower
    for (let i = 0; i < 5; i++) ctx.fillRect(70 + i * 10, CH * 0.54 - 10, 7, 10);

    // Main keep (tallest, far left)
    ctx.fillRect(14, CH * 0.34, 42, CH * 0.66);
    for (let i = 0; i < 4; i++) ctx.fillRect(16 + i * 10, CH * 0.34 - 10, 7, 10);

    // Right tower
    ctx.fillRect(142, CH * 0.44, 32, CH * 0.56);
    for (let i = 0; i < 3; i++) ctx.fillRect(144 + i * 10, CH * 0.44 - 8, 7, 8);

    // Lit windows (amber/torch)
    ctx.fillStyle = '#d09010';
    ctx.fillRect(28, CH * 0.50, 11, 15);
    ctx.fillRect(28, CH * 0.62, 11, 15);
    ctx.fillRect(148, CH * 0.56, 10, 13);
    // Glow behind windows
    ctx.fillStyle = 'rgba(210,140,20,0.12)';
    ctx.fillRect(20, CH * 0.47, 27, 22);
    ctx.fillRect(20, CH * 0.59, 27, 22);

    // A few dark pine trees (right edge of scene)
    ctx.fillStyle = '#0d0b20';
    const pines = [[756, 0.64, 18], [778, 0.68, 14], [742, 0.69, 12]];
    for (const [tx, tr, ts] of pines) {
      const ty = CH * tr;
      ctx.beginPath(); ctx.moveTo(tx, ty - ts * 2.4); ctx.lineTo(tx - ts, ty); ctx.lineTo(tx + ts, ty); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx - ts * 0.7, ty + ts * 1.4); ctx.lineTo(tx + ts * 0.7, ty + ts * 1.4); ctx.closePath(); ctx.fill();
    }

    // Top stone-row frame
    drawTopBorder(ctx);
  }

  function drawTopBorder(ctx) {
    const T = 26;
    for (let c = 0; c * T < CW; c++) {
      const bx = c * T;
      ctx.fillStyle = '#09071e'; ctx.fillRect(bx, 0, T, T);
      ctx.fillStyle = '#121040'; ctx.fillRect(bx + 1, 1, T - 2, T - 2);
      ctx.fillStyle = '#2424a0'; ctx.fillRect(bx + 1, 1, T - 2, 1); ctx.fillRect(bx + 1, 1, 1, T - 2);
      ctx.fillStyle = '#040310'; ctx.fillRect(bx + 1, T - 2, T - 2, 1); ctx.fillRect(bx + T - 2, 1, 1, T - 2);
    }
  }

  // =========================================================================
  // GOBLIN EMBLEM (above title text)
  // =========================================================================
  function drawEmblem(ctx, cx, cy) {
    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, 15, cx, cy, 80);
    glow.addColorStop(0, 'rgba(255,130,10,0.30)');
    glow.addColorStop(0.5, 'rgba(255,70,0,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 80, cy - 80, 160, 160);

    // Crossed swords behind face
    ctx.save(); ctx.translate(cx, cy);
    ctx.save(); ctx.rotate(-Math.PI * 0.28); drawEmblemSword(ctx); ctx.restore();
    ctx.save(); ctx.rotate( Math.PI * 0.28); drawEmblemSword(ctx); ctx.restore();
    ctx.restore();

    // Face base
    ctx.fillStyle = '#2a5c10';
    ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a9a1e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.stroke();
    // Face highlight
    ctx.fillStyle = '#367018';
    ctx.beginPath(); ctx.arc(cx - 5, cy - 7, 22, 0, Math.PI * 2); ctx.fill();

    // Horns
    ctx.fillStyle = '#3e2808';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 27); ctx.quadraticCurveTo(cx - 28, cy - 48, cx - 20, cy - 56);
    ctx.quadraticCurveTo(cx - 13, cy - 50, cx - 10, cy - 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a3c0a'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 27); ctx.quadraticCurveTo(cx - 28, cy - 48, cx - 20, cy - 56);
    ctx.quadraticCurveTo(cx - 13, cy - 50, cx - 10, cy - 30); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#3e2808';
    ctx.beginPath();
    ctx.moveTo(cx + 16, cy - 27); ctx.quadraticCurveTo(cx + 28, cy - 48, cx + 20, cy - 56);
    ctx.quadraticCurveTo(cx + 13, cy - 50, cx + 10, cy - 30); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 16, cy - 27); ctx.quadraticCurveTo(cx + 28, cy - 48, cx + 20, cy - 56);
    ctx.quadraticCurveTo(cx + 13, cy - 50, cx + 10, cy - 30); ctx.closePath(); ctx.stroke();

    // Glowing eyes
    ctx.shadowBlur = 12; ctx.shadowColor = '#ff2000';
    ctx.fillStyle = '#ff2000';
    ctx.beginPath(); ctx.ellipse(cx - 10, cy - 7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 10, cy - 7, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Eye glints
    ctx.fillStyle = '#ff9060';
    ctx.fillRect(cx - 13, cy - 10, 4, 2);
    ctx.fillRect(cx + 9,  cy - 10, 4, 2);

    // Snout / nostrils
    ctx.fillStyle = '#204010';
    ctx.fillRect(cx - 4, cy - 1, 8, 5);
    ctx.fillStyle = '#0e2008';
    ctx.fillRect(cx - 4, cy + 1, 3, 3);
    ctx.fillRect(cx + 2, cy + 1, 3, 3);

    // Mouth + fangs
    ctx.fillStyle = '#1a4a08';
    ctx.fillRect(cx - 14, cy + 8, 28, 13);
    ctx.fillStyle = '#080e02';
    ctx.fillRect(cx - 12, cy + 10, 24, 9);
    // Fangs
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath(); ctx.moveTo(cx - 9,cy+10); ctx.lineTo(cx - 4,cy+10); ctx.lineTo(cx - 6,cy+19); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 4,cy+10); ctx.lineTo(cx + 9,cy+10); ctx.lineTo(cx + 6,cy+19); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 2,cy+19); ctx.lineTo(cx + 2,cy+19); ctx.lineTo(cx,    cy+14); ctx.closePath(); ctx.fill();
  }

  function drawEmblemSword(ctx) {
    ctx.fillStyle = '#b8c0d8';
    ctx.fillRect(-2, -52, 5, 52);
    ctx.fillStyle = '#d8e0f8'; ctx.fillRect(-1, -52, 1, 52);
    ctx.beginPath(); ctx.moveTo(-2,-52); ctx.lineTo(3,-52); ctx.lineTo(0,-64); ctx.fillStyle='#c8d0e8'; ctx.fill();
    ctx.fillStyle = '#b89c18'; ctx.fillRect(-15, -4, 30, 6);
    ctx.fillStyle = '#d8bc28'; ctx.fillRect(-15, -4, 30, 2);
    ctx.fillStyle = '#703210'; ctx.fillRect(-3, 2, 6, 20);
    ctx.fillStyle = '#b89c18'; ctx.beginPath(); ctx.arc(0, 24, 5, 0, Math.PI * 2); ctx.fill();
  }

  // =========================================================================
  // TITLE TEXT  —  outlined/gradient arcade style
  // =========================================================================
  function drawTitleText(ctx) {
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // "GOBLIN"
    ctx.font      = 'bold 94px monospace';
    ctx.lineJoin  = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#280800';
    ctx.strokeText('GOBLIN', CW / 2, 210);

    const gGrad = ctx.createLinearGradient(0, 163, 0, 257);
    gGrad.addColorStop(0,    '#ffe060');
    gGrad.addColorStop(0.35, '#ff6020');
    gGrad.addColorStop(1,    '#c01800');
    ctx.fillStyle = gGrad;
    ctx.fillText('GOBLIN', CW / 2, 210);

    // "STEEL"
    ctx.lineWidth   = 12;
    ctx.strokeStyle = '#080e20';
    ctx.strokeText('STEEL', CW / 2, 302);

    const sGrad = ctx.createLinearGradient(0, 255, 0, 349);
    sGrad.addColorStop(0,    '#e0f0ff');
    sGrad.addColorStop(0.4,  '#88b8e8');
    sGrad.addColorStop(1,    '#3858a8');
    ctx.fillStyle = sGrad;
    ctx.fillText('STEEL', CW / 2, 302);
  }

  // =========================================================================
  // CHARACTER CARDS  (overlay lower portion of the scene)
  // =========================================================================
  function drawCard(ctx, i) {
    const cls = CLASSES[i];
    const b   = cardBounds(i);
    const sel = selectedClass === i;
    const hov = hoverCard === i && cls.active;

    // Semi-opaque dark background — lets the scene bleed through slightly
    ctx.fillStyle = !cls.active ? 'rgba(5,4,15,0.92)'
                  : sel         ? 'rgba(14,14,48,0.95)'
                  : hov         ? 'rgba(10,10,38,0.93)'
                                : 'rgba(8,8,28,0.92)';
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Border
    if (sel) { ctx.shadowBlur = 14; ctx.shadowColor = cls.col; }
    ctx.strokeStyle = sel        ? cls.col
                    : cls.active  ? '#28285a'
                                  : '#111118';
    ctx.lineWidth   = sel ? 2.5 : 1.5;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.shadowBlur  = 0;

    // Portrait (clipped)
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x + 2, b.y + 2, b.w - 4, 106);
    ctx.clip();
    ctx.globalAlpha = cls.active ? 1 : 0.22;
    drawPortrait(ctx, cls.name, b.x + b.w / 2, b.y + PORT_CTR);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Separator
    ctx.fillStyle = sel ? cls.col : (cls.active ? '#22225a' : '#101018');
    ctx.fillRect(b.x + 4, b.y + 110, b.w - 8, 1);

    // Name
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 13px monospace';
    ctx.fillStyle    = cls.active ? cls.col : '#1e1e2e';
    ctx.fillText(cls.name, b.x + b.w / 2, b.y + 121);

    // Weapon
    ctx.font      = '10px monospace';
    ctx.fillStyle = cls.active ? '#5050a0' : '#141420';
    ctx.fillText(cls.desc, b.x + b.w / 2, b.y + 133);

    if (cls.active) {
      const stats = Object.entries(cls.stats);
      for (let s = 0; s < stats.length; s++) {
        const [key, val] = stats[s];
        const sy = b.y + 145 + s * 11;
        ctx.textAlign = 'left';
        ctx.font      = '9px monospace';
        ctx.fillStyle = '#48489a';
        ctx.fillText(key, b.x + 8, sy + 4);
        for (let p = 0; p < 5; p++) {
          ctx.fillStyle = p < val ? cls.col : '#111130';
          ctx.fillRect(b.x + 38 + p * 18, sy, 14, 8);
        }
      }
    } else {
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = 'bold 10px monospace';
      ctx.fillStyle    = '#202030';
      ctx.fillText('COMING SOON', b.x + b.w / 2, b.y + 162);
    }
  }

  function drawPlayButton(ctx) {
    const hl = hoverPlay;
    ctx.fillStyle = hl ? '#38d020' : '#24a818';
    ctx.fillRect(BTN_X, BTN_Y, BTN_W, BTN_H);
    if (hl) { ctx.shadowBlur = 14; ctx.shadowColor = '#50ff30'; }
    ctx.strokeStyle = hl ? '#60ff40' : '#38b828';
    ctx.lineWidth   = 2;
    ctx.strokeRect(BTN_X + 0.5, BTN_Y + 0.5, BTN_W - 1, BTN_H - 1);
    ctx.shadowBlur   = 0;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 19px monospace';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('\u25B6  PLAY', BTN_X + BTN_W / 2, BTN_Y + BTN_H / 2);
  }

  // =========================================================================
  // PORTRAITS  (frontal, centered at origin)
  // =========================================================================
  function drawPortrait(ctx, name, cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    switch (name) {
      case 'ELF':     elfPortrait(ctx);     break;
      case 'WARRIOR': warriorPortrait(ctx); break;
      case 'CLERIC':  clericPortrait(ctx);  break;
      case 'WIZARD':  wizardPortrait(ctx);  break;
    }
    ctx.restore();
  }

  function elfPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(2, 44, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1a5014';
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#38c028'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#112e0d'; ctx.fillRect(-2, -8, 4, 28);
    ctx.fillStyle = '#7a3808'; ctx.fillRect(-19, 20, 38, 4);
    ctx.fillStyle = '#e8b818'; ctx.fillRect(-4, 20, 8, 4);

    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.arc(0, -20, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#38c028'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -20, 17, -Math.PI * 0.82, 0.12); ctx.stroke();
    ctx.fillStyle = '#b07020';
    ctx.beginPath(); ctx.arc(0, -26, 13, Math.PI, 0); ctx.fill();

    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.moveTo(-13,-25); ctx.lineTo(-34,-16); ctx.lineTo(-11,-10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( 13,-25); ctx.lineTo( 34,-16); ctx.lineTo( 11,-10); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#1a0800'; ctx.fillRect(-7,-23,4,4); ctx.fillRect(4,-23,4,4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-6,-23,2,2); ctx.fillRect(5,-23,2,2);

    const bR = 22, bA = Math.PI*0.52, bCx = -26, bCy = -8;
    ctx.strokeStyle = '#7a3c08'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(bCx, bCy, bR, -bA, bA); ctx.stroke();
    ctx.strokeStyle = '#b86418'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bCx+2, bCy-2, bR, -bA, bA*0.5); ctx.stroke();
    ctx.strokeStyle = '#e0e0b8'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bCx+Math.cos(-bA)*bR, bCy+Math.sin(-bA)*bR);
    ctx.lineTo(bCx+Math.cos( bA)*bR, bCy+Math.sin( bA)*bR);
    ctx.stroke();
  }

  function warriorPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(2, 44, 24, 7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#606878';
    ctx.beginPath(); ctx.ellipse(0, 16, 24, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9098b0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 16, 24, 28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#686e80'; ctx.fillRect(-18,6,36,10);
    ctx.fillStyle = '#9098a8'; ctx.fillRect(-18,6,36,1);
    ctx.fillStyle = '#4a3010'; ctx.fillRect(-20,20,40,4);

    ctx.fillStyle = '#707888';
    ctx.beginPath(); ctx.arc(0,-22,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#808898';
    ctx.beginPath(); ctx.arc(0,-22,18,Math.PI,0); ctx.fill();
    ctx.fillStyle = '#202830'; ctx.fillRect(-15,-25,30,7);
    ctx.fillStyle = '#303848'; ctx.fillRect(-15,-25,30,1);
    ctx.fillStyle = '#9098a8'; ctx.fillRect(-2,-40,4,20);
    ctx.beginPath(); ctx.arc(0,-40,4,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = '#c0c8e0'; ctx.fillRect(-31,-36,4,44);
    ctx.fillStyle = '#d8e0f0'; ctx.fillRect(-30,-36,1,44);
    ctx.beginPath(); ctx.moveTo(-31,-36); ctx.lineTo(-27,-36); ctx.lineTo(-29,-48); ctx.fillStyle='#c0c8e0'; ctx.fill();
    ctx.fillStyle = '#c0a020'; ctx.fillRect(-39,4,22,5); ctx.fillStyle='#e0c030'; ctx.fillRect(-39,4,22,1);
    ctx.fillStyle = '#7a3a10'; ctx.fillRect(-32,9,4,18);

    ctx.fillStyle = '#8a1818';
    ctx.beginPath(); ctx.moveTo(20,-28); ctx.lineTo(40,-28); ctx.lineTo(42,8); ctx.lineTo(29,30); ctx.lineTo(20,8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c04020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20,-28); ctx.lineTo(40,-28); ctx.lineTo(42,8); ctx.lineTo(29,30); ctx.lineTo(20,8); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#c04020'; ctx.fillRect(27,-22,4,48); ctx.fillRect(20,-6,22,4);
  }

  function clericPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(2, 44, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#c8a840';
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e0c020'; ctx.fillRect(-4,-2,8,26); ctx.fillRect(-13,8,26,8);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(-4,-2,8,2); ctx.fillRect(-13,8,26,2);
    ctx.fillStyle = '#8a6020'; ctx.fillRect(-20,22,40,4);

    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.arc(0,-22,15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c8a840';
    ctx.beginPath(); ctx.arc(0,-27,15,Math.PI,0); ctx.fill();
    ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0,-27,15,Math.PI,0); ctx.stroke();

    ctx.fillStyle = '#1a0800'; ctx.fillRect(-6,-24,4,4); ctx.fillRect(3,-24,4,4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-5,-24,2,2); ctx.fillRect(4,-24,2,2);

    ctx.fillStyle = '#7a7a8a'; ctx.fillRect(25,-14,5,34);
    ctx.fillStyle = '#9a9aaa'; ctx.beginPath(); ctx.arc(27,-18,10,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#b8b8c8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(27,-18,10,0,Math.PI*2); ctx.stroke();
    for (let a = 0; a < 5; a++) {
      ctx.save(); ctx.translate(27,-18); ctx.rotate((a/5)*Math.PI*2);
      ctx.fillStyle = '#b0b0c0'; ctx.fillRect(-2,-13,4,5); ctx.restore();
    }
    ctx.strokeStyle = '#ffe040'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-29,-10,11,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#ffe040'; ctx.fillRect(-33,-12,8,3); ctx.fillRect(-33,-7,8,3);
  }

  function wizardPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(2, 44, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#502078';
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8030c0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#401060'; ctx.fillRect(-20,22,40,4);
    ctx.fillStyle = '#f8d020';
    for (const [sx, sy] of [[-12,0],[10,6],[-6,18],[13,26],[0,34]]) {
      ctx.beginPath(); ctx.arc(sx,sy,2.5,0,Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.arc(0,-22,14,0,Math.PI*2); ctx.fill();

    ctx.fillStyle = '#3a1060';
    ctx.beginPath(); ctx.moveTo(0,-60); ctx.lineTo(-19,-22); ctx.lineTo(19,-22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6020a0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0,-60); ctx.lineTo(-19,-22); ctx.lineTo(19,-22); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#f8d020'; ctx.fillRect(-19,-29,38,4);
    ctx.beginPath(); ctx.arc(0,-27,3.5,0,Math.PI*2); ctx.fill();

    ctx.shadowBlur = 8; ctx.shadowColor = '#c060ff';
    ctx.fillStyle = '#b050f0'; ctx.fillRect(-7,-25,4,4); ctx.fillRect(4,-25,4,4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-6,-25,2,2); ctx.fillRect(5,-25,2,2);

    ctx.fillStyle = '#6a3a08'; ctx.fillRect(27,-44,4,72);
    ctx.fillStyle = '#8a5010'; ctx.fillRect(27,-44,1,72);
    const og = ctx.createRadialGradient(29,-48,3,29,-48,11);
    og.addColorStop(0,'#f0c0ff'); og.addColorStop(0.5,'#9030e0'); og.addColorStop(1,'#280850');
    ctx.shadowBlur = 12; ctx.shadowColor = '#c060ff';
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(29,-48,11,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}());
