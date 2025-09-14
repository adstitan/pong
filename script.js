const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Neon colors
const neonColors = [
  "#00fff7", "#ff00cc", "#c3ff00", "#fffb00", "#0ff", "#ff0055"
];

// Paddle settings
const PADDLE_WIDTH = 25;
const PADDLE_HEIGHT = 110;
const PADDLE_SPEED = 7;
const PADDLE_MIN_HEIGHT = 40;

// Ball settings
const BALL_RADIUS = 15;
const BALL_SPEED = 8;
const BALL_MAX_SPEED = 18;

// Scores
let scoreLeft = 0;
let scoreRight = 0;

// Power-up controls
let shrinkActive = false;
let shrinkCooldown = false;
let shrinkTimer = 0;
const SHRINK_DURATION = 2400; // ms
const SHRINK_COOLDOWN = 4800; // ms

let curveActive = false;
let curveCooldown = false;
let curveTimer = 0;
const CURVE_DURATION = 700; // ms
const CURVE_COOLDOWN = 2400; // ms

// Game objects
let leftPaddle = {
  x: 28,
  y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  color: "#00fff7"
};

let rightPaddle = {
  x: WIDTH - 28 - PADDLE_WIDTH,
  y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  color: "#ff00cc",
  baseHeight: PADDLE_HEIGHT
};

let ball = {
  x: WIDTH / 2,
  y: HEIGHT / 2,
  vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
  vy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
  color: "#c3ff00"
};

let isPaused = false;
let frameCount = 0;

// --- Web Audio API Sound Engine ---
let audioCtx;
function playSound(type) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "square";
  o.connect(g);
  g.connect(audioCtx.destination);

  // Sound configs
  if (type === "wall") {
    o.frequency.value = 420;
    g.gain.value = 0.09;
  } else if (type === "paddle") {
    o.frequency.value = 880;
    g.gain.value = 0.14;
  } else if (type === "score") {
    o.frequency.value = 120;
    g.gain.value = 0.25;
  } else if (type === "shrink") {
    o.frequency.value = 1800;
    g.gain.value = 0.19;
  } else if (type === "curve") {
    o.frequency.value = 1000;
    g.gain.value = 0.14;
  }
  // Duration
  o.start();
  o.stop(audioCtx.currentTime + 0.13);
  g.gain.setValueAtTime(g.gain.value, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.13);
}

// Mouse control for left paddle
canvas.addEventListener('mousemove', (e) => {
  if (isPaused) return;
  const rect = canvas.getBoundingClientRect();
  let mouseY = e.clientY - rect.top;
  leftPaddle.y = mouseY - leftPaddle.height / 2;
  leftPaddle.y = Math.max(0, Math.min(HEIGHT - leftPaddle.height, leftPaddle.y));
});

// Power-up key listeners
document.addEventListener('keydown', (e) => {
  if (isPaused) return;
  // Shrink opponent's paddle
  if (e.key.toLowerCase() === 's' && !shrinkCooldown && !shrinkActive) {
    activateShrink();
    playSound('shrink');
  }
  // Curve the ball
  if (e.key.toLowerCase() === 'd' && !curveCooldown && !curveActive) {
    activateCurve();
    playSound('curve');
  }
});

function activateShrink() {
  shrinkActive = true;
  shrinkCooldown = true;
  rightPaddle.height = PADDLE_MIN_HEIGHT;
  showMessage("Barra do adversário encolhida! 🛡️");
  shrinkTimer = setTimeout(() => {
    rightPaddle.height = rightPaddle.baseHeight;
    shrinkActive = false;
    hideMessage();
    setTimeout(() => { shrinkCooldown = false; }, SHRINK_COOLDOWN - SHRINK_DURATION);
  }, SHRINK_DURATION);
}

function activateCurve() {
  curveActive = true;
  curveCooldown = true;
  // Neon curve trail effect
  let angle = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 2 + 1.5); // [-3.5, 3.5]
  ball.vy += angle;
  ball.vx += (ball.vx > 0 ? 1 : -1) * 2.5;
  // Limita velocidade máxima
  ball.vx = Math.max(-BALL_MAX_SPEED, Math.min(BALL_MAX_SPEED, ball.vx));
  ball.vy = Math.max(-BALL_MAX_SPEED, Math.min(BALL_MAX_SPEED, ball.vy));
  ball.color = "#ff00cc";
  showMessage("Efeito Cyber na bola! ⚡");
  curveTimer = setTimeout(() => {
    ball.color = randomNeon();
    curveActive = false;
    hideMessage();
    setTimeout(() => { curveCooldown = false; }, CURVE_COOLDOWN - CURVE_DURATION);
  }, CURVE_DURATION);
}

// Draw paddles: neon rectangles with glow and scanlines
function drawPaddle(paddle) {
  ctx.save();
  ctx.shadowColor = paddle.color;
  ctx.shadowBlur = 24;
  ctx.globalAlpha = 0.87;
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  // Scanlines
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < paddle.height; i += 8) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(paddle.x, paddle.y + i, paddle.width, 2);
  }
  ctx.restore();
}

// Draw ball: neon glow + animated ring
function drawBall(ball) {
  ctx.save();
  // Neon glow
  ctx.shadowColor = ball.color;
  ctx.shadowBlur = 30;
  ctx.globalAlpha = 0.93;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();

  // Animated ring
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS + 10 + Math.sin(frameCount / 7) * 4, 0, Math.PI * 2);
  ctx.strokeStyle = randomNeon();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// Draw cyberpunk grid background animation
function drawBackground() {
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let x = 0; x < WIDTH; x += 40) {
    ctx.strokeStyle = "#00fff7";
    ctx.beginPath();
    ctx.moveTo(x + (frameCount % 40), 0);
    ctx.lineTo(x + (frameCount % 40), HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 40) {
    ctx.strokeStyle = "#ff00cc";
    ctx.beginPath();
    ctx.moveTo(0, y + (frameCount % 40));
    ctx.lineTo(WIDTH, y + (frameCount % 40));
    ctx.stroke();
  }
  ctx.restore();
}

// Main draw
function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawBackground();

  // Draw paddles
  drawPaddle(leftPaddle);
  drawPaddle(rightPaddle);

  // Draw ball
  drawBall(ball);

  // Cyber confetti on score
  if (isPaused) {
    ctx.save();
    for (let i = 0; i < 30; i++) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = randomNeon();
      ctx.beginPath();
      ctx.arc(Math.random()*WIDTH, Math.random()*HEIGHT, Math.random()*8+2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Power-up status feedback
  ctx.save();
  ctx.font = "bold 18px 'Share Tech Mono', monospace";
  ctx.globalAlpha = shrinkCooldown ? 0.4 : 1;
  ctx.fillStyle = "#00fff7";
  ctx.fillText("S: Encolher barra", 30, 30);
  ctx.globalAlpha = curveCooldown ? 0.4 : 1;
  ctx.fillStyle = "#ff00cc";
  ctx.fillText("D: Efeito cyber na bola", 30, 55);
  ctx.restore();

  frameCount++;
}

// Ball movement and collision
function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall collision
  if (ball.y - BALL_RADIUS < 0 || ball.y + BALL_RADIUS > HEIGHT) {
    ball.vy *= -1;
    ball.color = randomNeon();
    playSound('wall');
  }

  // Left paddle collision
  if (
    ball.x - BALL_RADIUS < leftPaddle.x + leftPaddle.width &&
    ball.y > leftPaddle.y &&
    ball.y < leftPaddle.y + leftPaddle.height
  ) {
    ball.vx = Math.abs(ball.vx);
    ball.x = leftPaddle.x + leftPaddle.width + BALL_RADIUS;
    ball.color = leftPaddle.color;
    ball.vy += (Math.random()-0.5)*2.5;
    playSound('paddle');
  }

  // Right paddle collision
  if (
    ball.x + BALL_RADIUS > rightPaddle.x &&
    ball.y > rightPaddle.y &&
    ball.y < rightPaddle.y + rightPaddle.height
  ) {
    ball.vx = -Math.abs(ball.vx);
    ball.x = rightPaddle.x - BALL_RADIUS;
    ball.color = rightPaddle.color;
    ball.vy += (Math.random()-0.5)*2.5;
    playSound('paddle');
  }

  // Score conditions
  if (ball.x < 0) {
    scoreRight++;
    updateScore();
    showMessage("Computador marcou ponto! 🤖");
    playSound('score');
    resetBall();
  }
  if (ball.x > WIDTH) {
    scoreLeft++;
    updateScore();
    showMessage("Você marcou ponto! 🦾");
    playSound('score');
    resetBall();
  }
}

// Cyberpunk AI for right paddle
function updateAIPaddle() {
  let target = ball.y - rightPaddle.height / 2;
  if (rightPaddle.y < target) rightPaddle.y += PADDLE_SPEED;
  else if (rightPaddle.y > target) rightPaddle.y -= PADDLE_SPEED;
  rightPaddle.y = Math.max(0, Math.min(HEIGHT - rightPaddle.height, rightPaddle.y));
}

// Reset ball and pause for a moment after score
function resetBall() {
  isPaused = true;
  setTimeout(() => {
    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;
    ball.vx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ball.color = randomNeon();
    isPaused = false;
    hideMessage();
  }, 1200);
}

// Scoreboard
function updateScore() {
  document.getElementById('score-left').textContent = scoreLeft;
  document.getElementById('score-right').textContent = scoreRight;
}

// Fun message
function showMessage(msg) {
  const el = document.getElementById('message');
  el.textContent = msg;
  el.style.opacity = 1;
}
function hideMessage() {
  const el = document.getElementById('message');
  el.style.opacity = 0;
}

// Random neon color for ball or confetti
function randomNeon() {
  return neonColors[Math.floor(Math.random()*neonColors.length)];
}

// Main game loop
function gameLoop() {
  if (!isPaused) {
    updateBall();
    updateAIPaddle();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
updateScore();
gameLoop();