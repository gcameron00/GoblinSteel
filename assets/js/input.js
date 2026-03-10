'use strict';

GS.input = {
  up:    false,
  down:  false,
  left:  false,
  right: false,
  fire:  false,
};

(function () {
  const KEY_MAP = {
    ArrowUp:    'up',
    ArrowDown:  'down',
    ArrowLeft:  'left',
    ArrowRight: 'right',
    w: 'up', W: 'up',
    s: 'down', S: 'down',
    a: 'left', A: 'left',
    d: 'right', D: 'right',
    ' ': 'fire', z: 'fire', Z: 'fire',
  };

  document.addEventListener('keydown', function (e) {
    const action = KEY_MAP[e.key];
    if (action) {
      GS.input[action] = true;
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', function (e) {
    const action = KEY_MAP[e.key];
    if (action) GS.input[action] = false;
  });
}());
