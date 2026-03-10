'use strict';

(function () {
  const CW = GS.VIEW_W;
  const CH = GS.VIEW_H + GS.HUD_H;  // full canvas: 800 × 600

  // -------------------------------------------------------------------------
  // Phase state machine
  // 'title' → 'fade-out' → 'fade-in' → 'select' → 'play-fade' → 'game'
  // -------------------------------------------------------------------------
  let phase     = 'title';
  let timer     = 0;
  let fadeAlpha = 0;
  let canvas    = null;

  const TITLE_HOLD = 155;  // frames (~2.6s at 60fps) before auto-advance
  const FADE_DUR   = 38;   // frames for each fade transition

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
  // Card layout
  // -------------------------------------------------------------------------
  const CARD_W   = 148;
  const CARD_H   = 218;
  const CARD_GAP = 18;
  const CARDS_X  = Math.round((CW - (4 * CARD_W + 3 * CARD_GAP)) / 2);
  const CARDS_Y  = 158;

  const BTN_W = 180;
  const BTN_H = 44;
  const BTN_X = Math.round((CW - BTN_W) / 2);
  const BTN_Y = CARDS_Y + CARD_H + 28;

  // -------------------------------------------------------------------------
  // Interaction state
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
    if (phase !== 'select') return;
    const { cx, cy } = toCanvas(e);
    for (let i = 0; i < CLASSES.length; i++) {
      if (CLASSES[i].active && hit(cx, cy, cardBounds(i))) {
        selectedClass = i;
        return;
      }
    }
    if (selectedClass >= 0 && CLASSES[selectedClass].active &&
        hit(cx, cy, { x: BTN_X, y: BTN_Y, w: BTN_W, h: BTN_H })) {
      phase = 'play-fade';
      timer = 0;
    }
  }

  function handleMouseMove(e) {
    if (phase !== 'select') return;
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
          if (timer >= TITLE_HOLD) { phase = 'fade-out'; timer = 0; }
          break;
        case 'fade-out':
          fadeAlpha = timer / FADE_DUR;
          if (timer >= FADE_DUR) { phase = 'fade-in'; timer = 0; fadeAlpha = 1; }
          break;
        case 'fade-in':
          fadeAlpha = 1 - timer / FADE_DUR;
          if (timer >= FADE_DUR) { phase = 'select'; timer = 0; fadeAlpha = 0; }
          break;
        case 'play-fade':
          fadeAlpha = timer / FADE_DUR;
          if (timer >= FADE_DUR) {
            phase     = 'game';
            fadeAlpha = 0;
            GS.screen.destroy();
          }
          break;
      }
    },

    render: function (ctx) {
      if (phase === 'title' || phase === 'fade-out') {
        drawTitle(ctx);
      } else {
        drawSelect(ctx);
      }
      if (fadeAlpha > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + fadeAlpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, CW, CH);
      }
    },
  };

  // =========================================================================
  // TITLE SCREEN
  // =========================================================================
  function drawTitle(ctx) {
    ctx.fillStyle = '#04040e';
    ctx.fillRect(0, 0, CW, CH);

    drawStoneBorder(ctx);

    // Torch glows at four points
    drawTorch(ctx,  80, 190);
    drawTorch(ctx, 720, 190);
    drawTorch(ctx,  80, 410);
    drawTorch(ctx, 720, 410);

    // Corner ornaments
    drawCorner(ctx,  22,  22,  1,  1);
    drawCorner(ctx, CW - 22,  22, -1,  1);
    drawCorner(ctx,  22, CH - 22,  1, -1);
    drawCorner(ctx, CW - 22, CH - 22, -1, -1);

    // Horizontal rules
    ctx.fillStyle = '#2a2a52';
    ctx.fillRect(70, 168, CW - 140, 1);
    ctx.fillRect(70, CH - 168, CW - 140, 1);
    ctx.fillStyle = '#16163a';
    ctx.fillRect(70, 170, CW - 140, 1);
    ctx.fillRect(70, CH - 166, CW - 140, 1);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // "GOBLIN" — large, red-orange arcade glow
    ctx.shadowBlur  = 28;
    ctx.shadowColor = '#ff3800';
    ctx.font        = 'bold 90px monospace';
    ctx.fillStyle   = '#ff5010';
    ctx.fillText('GOBLIN', CW / 2, CH / 2 - 66);

    // "STEEL" — blue-grey metallic glow
    ctx.shadowColor = '#3858e0';
    ctx.fillStyle   = '#88b4e0';
    ctx.fillText('STEEL', CW / 2, CH / 2 + 22);

    ctx.shadowBlur = 0;

    // Crossed swords beneath
    drawCrossedSwords(ctx, CW / 2, CH / 2 + 108);

    // Subtitle
    ctx.font      = '16px monospace';
    ctx.fillStyle = '#5858a0';
    ctx.fillText('A DUNGEON ADVENTURE', CW / 2, CH / 2 + 156);

    // Controls hint at bottom
    ctx.font      = '12px monospace';
    ctx.fillStyle = '#303058';
    ctx.fillText('WASD / ARROW KEYS  ·  SPACE TO FIRE', CW / 2, CH - 48);
  }

  function drawStoneBorder(ctx) {
    const T = 28;
    for (let band = 0; band < 2; band++) {
      const baseY = band === 0 ? 0 : CH - T;
      for (let c = 0; c * T < CW; c++) {
        const bx = c * T;
        ctx.fillStyle = '#0a0820';
        ctx.fillRect(bx, baseY, T, T);
        ctx.fillStyle = '#141240';
        ctx.fillRect(bx + 1, baseY + 1, T - 2, T - 2);
        ctx.fillStyle = '#2828a0';
        ctx.fillRect(bx + 1, baseY + 1, T - 2, 1);
        ctx.fillRect(bx + 1, baseY + 1, 1, T - 2);
        ctx.fillStyle = '#050310';
        ctx.fillRect(bx + 1, baseY + T - 2, T - 2, 1);
        ctx.fillRect(bx + T - 2, baseY + 1, 1, T - 2);
      }
    }
  }

  function drawTorch(ctx, x, y) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, 88);
    g.addColorStop(0,   'rgba(255,175,40,0.24)');
    g.addColorStop(0.5, 'rgba(255,100,10,0.08)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 88, y - 88, 176, 176);
    // Flame
    ctx.fillStyle = '#ff8820';
    ctx.fillRect(x - 3, y - 10, 6, 7);
    ctx.fillStyle = '#ffcc40';
    ctx.fillRect(x - 2, y - 13, 4, 5);
    ctx.fillStyle = '#ffffa0';
    ctx.fillRect(x - 1, y - 14, 2, 3);
    // Handle
    ctx.fillStyle = '#6a3a08';
    ctx.fillRect(x - 2, y - 2, 4, 14);
    ctx.fillStyle = '#3a1e04';
    ctx.fillRect(x - 3, y + 10, 6, 4);
  }

  function drawCorner(ctx, x, y, sx, sy) {
    ctx.fillStyle = '#5050a0';
    ctx.fillRect(x, y, sx * 3, sy * 3);
    ctx.fillStyle = '#30305a';
    for (let i = 1; i < 22; i++) {
      ctx.fillRect(x, y + sy * i, Math.max(0, 22 - i), 1);
      ctx.fillRect(x + sx * i, y, 1, Math.max(0, 22 - i));
    }
  }

  function drawCrossedSwords(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.save(); ctx.rotate(-Math.PI / 4); drawSword(ctx); ctx.restore();
    ctx.save(); ctx.rotate( Math.PI / 4); drawSword(ctx); ctx.restore();
    ctx.restore();
  }

  function drawSword(ctx) {
    ctx.fillStyle = '#b8c0d8';
    ctx.fillRect(-2, -34, 4, 34);
    ctx.fillStyle = '#d8e0f8';
    ctx.fillRect(-1, -34, 1, 34);
    ctx.beginPath();
    ctx.moveTo(-2, -34); ctx.lineTo(2, -34); ctx.lineTo(0, -44);
    ctx.fillStyle = '#c8d0e8';
    ctx.fill();
    ctx.fillStyle = '#c0a020';
    ctx.fillRect(-13, -3, 26, 5);
    ctx.fillStyle = '#e0c030';
    ctx.fillRect(-13, -3, 26, 1);
    ctx.fillStyle = '#7a3a10';
    ctx.fillRect(-3,  2, 6, 18);
    ctx.fillStyle = '#c0a020';
    ctx.beginPath();
    ctx.arc(0, 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // =========================================================================
  // CHARACTER SELECT SCREEN
  // =========================================================================
  function drawSelect(ctx) {
    ctx.fillStyle = '#060615';
    ctx.fillRect(0, 0, CW, CH);

    drawStoneBorder(ctx);

    // Radial mood atmosphere
    const mood = ctx.createRadialGradient(CW / 2, CH / 2, 50, CW / 2, CH / 2, 360);
    mood.addColorStop(0, 'rgba(24,16,52,0.7)');
    mood.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mood;
    ctx.fillRect(0, 0, CW, CH);

    // Heading
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 16;
    ctx.shadowColor  = '#f8e840';
    ctx.font         = 'bold 25px monospace';
    ctx.fillStyle    = '#f8e840';
    ctx.fillText('SELECT YOUR CHARACTER', CW / 2, 104);
    ctx.shadowBlur   = 0;

    ctx.fillStyle = '#28285a';
    ctx.fillRect(80, 122, CW - 160, 1);

    // Cards
    for (let i = 0; i < CLASSES.length; i++) drawCard(ctx, i);

    // Play button (only once elf is selected)
    if (selectedClass >= 0 && CLASSES[selectedClass].active) drawPlayButton(ctx);
  }

  function drawCard(ctx, i) {
    const cls = CLASSES[i];
    const b   = cardBounds(i);
    const sel = selectedClass === i;
    const hov = hoverCard === i && cls.active;

    // Background
    ctx.fillStyle = !cls.active ? '#070710'
                  : sel         ? '#181845'
                  : hov         ? '#121238'
                                : '#0d0d2a';
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Border with optional glow
    if (sel) { ctx.shadowBlur = 14; ctx.shadowColor = cls.col; }
    ctx.strokeStyle = sel       ? cls.col
                    : cls.active ? '#2a2a56'
                                 : '#121218';
    ctx.lineWidth   = sel ? 2.5 : 1.5;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.shadowBlur = 0;

    // Portrait (clipped to top portion of card)
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x + 2, b.y + 2, b.w - 4, 136);
    ctx.clip();
    ctx.globalAlpha = cls.active ? 1 : 0.25;
    drawPortrait(ctx, cls.name, b.x + b.w / 2, b.y + 78);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Separator
    ctx.fillStyle = sel ? cls.col : (cls.active ? '#26265a' : '#101018');
    ctx.fillRect(b.x + 4, b.y + 139, b.w - 8, 1);

    // Name
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 13px monospace';
    ctx.fillStyle    = cls.active ? cls.col : '#202030';
    ctx.fillText(cls.name, b.x + b.w / 2, b.y + 153);

    // Weapon descriptor
    ctx.font      = '10px monospace';
    ctx.fillStyle = cls.active ? '#5858a0' : '#181828';
    ctx.fillText(cls.desc, b.x + b.w / 2, b.y + 166);

    if (cls.active) {
      // Stat pips
      const stats = Object.entries(cls.stats);
      for (let s = 0; s < stats.length; s++) {
        const [key, val] = stats[s];
        const sy = b.y + 178 + s * 11;
        ctx.textAlign = 'left';
        ctx.font      = '9px monospace';
        ctx.fillStyle = '#48489a';
        ctx.fillText(key, b.x + 8, sy + 4);
        for (let p = 0; p < 5; p++) {
          ctx.fillStyle = p < val ? cls.col : '#131330';
          ctx.fillRect(b.x + 38 + p * 18, sy, 14, 8);
        }
      }
    } else {
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.font         = 'bold 10px monospace';
      ctx.fillStyle    = '#202030';
      ctx.fillText('COMING SOON', b.x + b.w / 2, b.y + 196);
    }
  }

  function drawPlayButton(ctx) {
    ctx.fillStyle   = hoverPlay ? '#3ad828' : '#28b820';
    ctx.fillRect(BTN_X, BTN_Y, BTN_W, BTN_H);
    if (hoverPlay) { ctx.shadowBlur = 14; ctx.shadowColor = '#50ff30'; }
    ctx.strokeStyle = hoverPlay ? '#60ff40' : '#40c830';
    ctx.lineWidth   = 2;
    ctx.strokeRect(BTN_X + 0.5, BTN_Y + 0.5, BTN_W - 1, BTN_H - 1);
    ctx.shadowBlur   = 0;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = 'bold 20px monospace';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('\u25B6  PLAY', BTN_X + BTN_W / 2, BTN_Y + BTN_H / 2);
  }

  // =========================================================================
  // CHARACTER PORTRAITS  (frontal view, centered at origin)
  // All fit within roughly ±42px × (-70px to +50px) to stay inside card clip
  // =========================================================================
  function drawPortrait(ctx, name, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    switch (name) {
      case 'ELF':     elfPortrait(ctx);     break;
      case 'WARRIOR': warriorPortrait(ctx); break;
      case 'CLERIC':  clericPortrait(ctx);  break;
      case 'WIZARD':  wizardPortrait(ctx);  break;
    }
    ctx.restore();
  }

  // ---- ELF ----
  function elfPortrait(ctx) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(2, 46, 24, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Cloak body
    ctx.fillStyle = '#1a5014';
    ctx.beginPath(); ctx.ellipse(0, 18, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#38c028'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 18, 24, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#112e0d'; ctx.fillRect(-2, -8, 4, 32);

    // Belt + buckle
    ctx.fillStyle = '#7a3808'; ctx.fillRect(-20, 22, 40, 5);
    ctx.fillStyle = '#e8b818'; ctx.fillRect(-5, 22, 10, 5);

    // Head
    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.arc(0, -20, 16, 0, Math.PI * 2); ctx.fill();

    // Hood rim
    ctx.strokeStyle = '#38c028'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -20, 18, -Math.PI * 0.82, 0.12); ctx.stroke();

    // Hair
    ctx.fillStyle = '#b07020';
    ctx.beginPath(); ctx.arc(0, -26, 14, Math.PI, 0); ctx.fill();

    // Ears
    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.moveTo(-14, -26); ctx.lineTo(-36, -16); ctx.lineTo(-11, -11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( 14, -26); ctx.lineTo( 36, -16); ctx.lineTo( 11, -11); ctx.closePath(); ctx.fill();

    // Eyes + glint
    ctx.fillStyle = '#1a0800'; ctx.fillRect(-7, -24, 5, 4); ctx.fillRect(3, -24, 5, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -24, 2, 2); ctx.fillRect(4, -24, 2, 2);

    // Bow (left side)
    const bRad = 24, bA = Math.PI * 0.52, bCx = -28, bCy = -8;
    ctx.strokeStyle = '#7a3c08'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(bCx, bCy, bRad, -bA, bA); ctx.stroke();
    ctx.strokeStyle = '#b86418'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bCx + 2, bCy - 2, bRad, -bA, bA * 0.5); ctx.stroke();
    ctx.strokeStyle = '#e0e0b8'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bCx + Math.cos(-bA) * bRad, bCy + Math.sin(-bA) * bRad);
    ctx.lineTo(bCx + Math.cos( bA) * bRad, bCy + Math.sin( bA) * bRad);
    ctx.stroke();
  }

  // ---- WARRIOR ----
  function warriorPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(2, 46, 26, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Armoured body
    ctx.fillStyle = '#606878';
    ctx.beginPath(); ctx.ellipse(0, 18, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9098b0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 18, 26, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#686e80'; ctx.fillRect(-18, 8, 36, 10);
    ctx.fillStyle = '#9098a8'; ctx.fillRect(-18, 8, 36, 1);
    ctx.fillStyle = '#4a3010'; ctx.fillRect(-20, 22, 40, 5);

    // Helmet
    ctx.fillStyle = '#707888';
    ctx.beginPath(); ctx.arc(0, -22, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#808898';
    ctx.beginPath(); ctx.arc(0, -22, 18, Math.PI, 0); ctx.fill();
    // Visor
    ctx.fillStyle = '#202830'; ctx.fillRect(-15, -25, 30, 7);
    ctx.fillStyle = '#303848'; ctx.fillRect(-15, -25, 30, 1);
    // Crest
    ctx.fillStyle = '#9098a8';
    ctx.fillRect(-2, -40, 4, 20);
    ctx.beginPath(); ctx.arc(0, -40, 4, 0, Math.PI * 2); ctx.fill();

    // Sword (left)
    ctx.fillStyle = '#c0c8e0'; ctx.fillRect(-32, -38, 5, 46);
    ctx.fillStyle = '#d8e0f0'; ctx.fillRect(-31, -38, 1, 46);
    ctx.beginPath(); ctx.moveTo(-32,-38); ctx.lineTo(-27,-38); ctx.lineTo(-29,-50); ctx.fillStyle='#c0c8e0'; ctx.fill();
    ctx.fillStyle = '#c0a020'; ctx.fillRect(-40, 6, 22, 5); ctx.fillStyle = '#e0c030'; ctx.fillRect(-40,6,22,1);
    ctx.fillStyle = '#7a3a10'; ctx.fillRect(-33, 11, 5, 18);

    // Shield (right) — kite shape
    ctx.fillStyle = '#8a1818';
    ctx.beginPath(); ctx.moveTo(20,-28); ctx.lineTo(40,-28); ctx.lineTo(42,8); ctx.lineTo(30,30); ctx.lineTo(20,8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c04020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20,-28); ctx.lineTo(40,-28); ctx.lineTo(42,8); ctx.lineTo(30,30); ctx.lineTo(20,8); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#c04020'; ctx.fillRect(28,-22,4,48); ctx.fillRect(20,-6,22,4);
  }

  // ---- CLERIC ----
  function clericPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(2, 46, 24, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Golden robes
    ctx.fillStyle = '#c8a840';
    ctx.beginPath(); ctx.ellipse(0, 18, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 18, 24, 30, 0, 0, Math.PI * 2); ctx.stroke();
    // Cross emblem
    ctx.fillStyle = '#e0c020'; ctx.fillRect(-4, -2, 8, 28); ctx.fillRect(-13, 8, 26, 8);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(-4, -2, 8, 2); ctx.fillRect(-13, 8, 26, 2);
    ctx.fillStyle = '#8a6020'; ctx.fillRect(-20, 22, 40, 4);

    // Head + cowl
    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.arc(0, -22, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8a840';
    ctx.beginPath(); ctx.arc(0, -27, 16, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -27, 16, Math.PI, 0); ctx.stroke();

    ctx.fillStyle = '#1a0800'; ctx.fillRect(-6, -25, 4, 4); ctx.fillRect(3, -25, 4, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-5, -25, 2, 2); ctx.fillRect(4, -25, 2, 2);

    // Mace (right)
    ctx.fillStyle = '#7a7a8a'; ctx.fillRect(26, -14, 5, 36);
    ctx.fillStyle = '#9a9aaa';
    ctx.beginPath(); ctx.arc(28, -18, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b8b8c8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(28, -18, 11, 0, Math.PI * 2); ctx.stroke();
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      ctx.save(); ctx.translate(28, -18); ctx.rotate(ang);
      ctx.fillStyle = '#b0b0c0'; ctx.fillRect(-2, -14, 4, 6);
      ctx.restore();
    }

    // Holy symbol (left)
    ctx.strokeStyle = '#ffe040'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-30, -10, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffe040'; ctx.fillRect(-34, -12, 8, 3); ctx.fillRect(-34, -7, 8, 3);
  }

  // ---- WIZARD ----
  function wizardPortrait(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(2, 46, 24, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Purple robes
    ctx.fillStyle = '#502078';
    ctx.beginPath(); ctx.ellipse(0, 18, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8030c0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 18, 24, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#401060'; ctx.fillRect(-20, 22, 40, 4);
    // Stars
    ctx.fillStyle = '#f8d020';
    for (const [sx, sy] of [[-13, 0], [10, 6], [-6, 18], [13, 26], [0, 34]]) {
      ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Head
    ctx.fillStyle = '#d09460';
    ctx.beginPath(); ctx.arc(0, -22, 15, 0, Math.PI * 2); ctx.fill();

    // Tall pointy hat
    ctx.fillStyle = '#3a1060';
    ctx.beginPath(); ctx.moveTo(0,-66); ctx.lineTo(-20,-22); ctx.lineTo(20,-22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6020a0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0,-66); ctx.lineTo(-20,-22); ctx.lineTo(20,-22); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#f8d020'; ctx.fillRect(-20,-30,40,5);
    ctx.beginPath(); ctx.arc(0,-28,4,0,Math.PI*2); ctx.fill();

    // Glowing eyes
    ctx.shadowBlur = 8; ctx.shadowColor = '#c060ff';
    ctx.fillStyle = '#b050f0'; ctx.fillRect(-7,-26,5,5); ctx.fillRect(3,-26,5,5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-6,-26,2,2); ctx.fillRect(4,-26,2,2);

    // Staff (right side)
    ctx.fillStyle = '#6a3a08'; ctx.fillRect(28,-48,5,80);
    ctx.fillStyle = '#8a5010'; ctx.fillRect(28,-48,1,80);
    // Orb
    const og = ctx.createRadialGradient(30,-52,3,30,-52,12);
    og.addColorStop(0,'#f0c0ff'); og.addColorStop(0.5,'#9030e0'); og.addColorStop(1,'#280850');
    ctx.shadowBlur = 12; ctx.shadowColor = '#c060ff';
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(30,-52,12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}());
