'use strict';

GS.input = {
  up:    false,
  down:  false,
  left:  false,
  right: false,
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
  };

  document.addEventListener('keydown', function (e) {
    const dir = KEY_MAP[e.key];
    if (dir) {
      GS.input[dir] = true;
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', function (e) {
    const dir = KEY_MAP[e.key];
    if (dir) GS.input[dir] = false;
  });
}());
