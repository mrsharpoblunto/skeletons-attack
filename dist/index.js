const canvas = document.getElementById('main');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const walkCanvas = document.getElementById('walkmap');
const walkCtx = walkCanvas.getContext('2d');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = '/dist' + src;
  });
}

const SKELETON_COUNT = 5;
const CONTROLLER_DEADZONE = 0.25;

let character = null;
let skeletonSprite = null;
let skeletons = [];
let background = null;
let walkmap = null;

let selectedGamepad = null;
window.addEventListener('gamepadconnected', (e) => {
  selectedGamepad = e.gamepad.index;
});
window.addEventListener('gamepaddisconnected', (e) => {
  selectedGamepad = null;
});

function onDraw() {
  if (selectedGamepad!==null) {
    const gp = navigator.getGamepads()[selectedGamepad];
    if (gp.buttons[12].pressed || Math.min(0.0, gp.axes[1] + CONTROLLER_DEADZONE) < 0) {
      // up
      character.y -= 1;
    }
    if (gp.buttons[13].pressed || Math.max(0.0, gp.axes[1] - CONTROLLER_DEADZONE) > 0) {
      // down
      character.y += 1;
    }
    if (gp.buttons[14].pressed || Math.min(0.0, gp.axes[0] + CONTROLLER_DEADZONE) < 0) {
      // left
      character.x -= 1;
      character.ox = 1;
    }
    if (gp.buttons[15].pressed || Math.max(0.0, gp.axes[0] - CONTROLLER_DEADZONE) > 0) {
      // right
      character.x += 1;
      character.ox = -1;
    }
    if (character.y < character.cy) {
      character.y = character.cy;
    }
    if (character.y > canvas.height + character.cy) {
      character.y = canvas.height + character.cy;
    }
    if (character.x < character.cx) {
      character.x = character.cx;
    }
    if (character.x > canvas.width + character.cx) {
      character.x = canvas.width + character.cx;
    }
  }
  ctx.clearRect(0,0,canvas.width, canvas.height);

  walkCtx.clearRect(0,0,walkCanvas.width, walkCanvas.height);
  walkCtx.drawImage(walkmap, 0,0,walkCanvas.width, walkCanvas.height);

  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.drawImage(background, 0,0,canvas.width, canvas.height);
  ctx.save();
  ctx.scale(character.ox, 1);
  ctx.drawImage(character.sprite, (character.x-character.cx) * character.ox,character.y-character.cy);
  ctx.restore();

  while (skeletons.length < SKELETON_COUNT) {
    const skeleton = {
      sprite: skeletonSprite,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      cx: skeletonSprite.width / 2,
      r: Math.random() * 50,
      theta: Math.random() * Math.PI * 2,
      phi: 0.01 * (Math.random() > 0.5 ? 1 : -1),
      cy: skeletonSprite.height / 2,
      ox: 1
    }
    if (canSkeletonMove(skeleton)) {
      skeletons.push(skeleton);
    }
  }

  for (let s of skeletons) {
    const oldTheta = s.theta;
    s.theta = s.theta + s.phi;
    if (s.theta > Math.PI * 2) {
      s.theta = 0;
    } else if (s.theta < 0) {
      s.theta = Math.PI * 2;
    }
    if (!canSkeletonMove(s)) {
      s.theta = oldTheta;
    }
    if (touchingPlayer(s)) {
      character.x = character.cx;
      character.y = canvas.height /2;
    }
    ctx.drawImage(s.sprite, ((s.x-s.cx) * s.ox) + (Math.cos(s.theta) * s.r),(s.y-s.cy) + (Math.sin(s.theta) * s.r));
  }
  window.requestAnimationFrame(onDraw);
}

function setSize() {
  const width = canvas.width;
  const height = canvas.height;
  let multiplier = 1;
  while (width * (multiplier+1) < window.innerWidth && height * (multiplier+1) < window.innerHeight) {
    ++multiplier;
  }
  canvas.style.height = (height * multiplier) + 'px';
  walkCanvas.style.height = (height * multiplier) + 'px';
}

function touchingPlayer(s) {
  const sp = getBoundingRect(s);
  const cp = getBoundingRect(character);

  if (
    // top left
    (cp.left > sp.left && cp.left < sp.right && cp.top > sp.top && cp.top < sp.bottom) ||
    // top right
    (cp.right > sp.left && cp.right < sp.right && cp.top > sp.top && cp.top < sp.bottom) ||
    // bottom left
    (cp.left > sp.left && cp.left < sp.right && cp.bottom > sp.top && cp.bottom < sp.bottom) ||
    // bottom right
    (cp.right > sp.left && cp.right < sp.right && cp.bottom > sp.top && cp.bottom < sp.bottom)
  ) {
    return true;
  }
  return false;
}

function getBoundingRect(p) {
  const position = {
    left: (p.x + (p.cx * p.ox) - p.sprite.width) + (Math.cos(p.theta) * p.r),
    top: (p.y-p.cy) + (Math.sin(p.theta) * p.r)
  };
  position.right = position.left + p.sprite.width;   
  position.bottom = position.top + p.sprite.height;   
  return position;
}

function canSkeletonMove(s) {
  const position = getBoundingRect(s);
  const imgData = [
    walkCtx.getImageData(Math.max(position.left,0), Math.max(position.top, 0), 1,1).data,
    walkCtx.getImageData(Math.max(position.right,0), Math.max(position.top, 0), 1,1).data,
    walkCtx.getImageData(Math.max(position.left,0), Math.max(position.bottom, 0), 1,1).data,
    walkCtx.getImageData(Math.max(position.right,0), Math.max(position.bottom, 0), 1,1).data,
  ];
  for (const d of imgData) {
    if (d[0] === 0 && d[1] === 0 && d[2] === 0) {
      return false;
    }
  }
  return true;
}

Promise.all([
  loadImage('/background.png'),
  loadImage('/background-walkmap.png'),
  loadImage('/skeleton.png'),
  loadImage('/natalie.png')
]).then(([b,bm, s,c]) => {
  window.addEventListener('resize', () => {
    setSize();
  });
  setSize();

  background = b;
  walkmap = bm;
  skeletonSprite = s;

  character = {
    theta: 0,
    phi: 0,
    r: 0,
    sprite: c,
    x: c.width / 2,
    y: canvas.height /2,
    cx: c.width / 2,
    cy: c.height / 2,
    ox: 1
  };
  window.requestAnimationFrame(onDraw);
});

