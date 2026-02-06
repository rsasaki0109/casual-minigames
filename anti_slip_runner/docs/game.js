// ============================================
// Anti-Slip Runner - Main Game Logic
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screen elements
const titleScreen = document.getElementById('title-screen');
const stageSelect = document.getElementById('stage-select');
const gameOverScreen = document.getElementById('game-over');
const hud = document.getElementById('hud');

// Buttons
const startBtn = document.getElementById('start-btn');
const stageRollerBtn = document.getElementById('stage-roller');
const stageIceBtn = document.getElementById('stage-ice');
const backToTitleBtn = document.getElementById('back-to-title');
const retryBtn = document.getElementById('retry-btn');
const selectBtn = document.getElementById('select-btn');

// HUD elements
const scoreDisplay = document.getElementById('score');
const distanceDisplay = document.getElementById('distance');
const balanceFill = document.getElementById('balance-fill');
const itemDisplay = document.getElementById('item-display');
const itemTimer = document.getElementById('item-timer');
const finalScore = document.getElementById('final-score');
const finalDistance = document.getElementById('final-distance');

// ============================================
// Game State
// ============================================

let gameState = 'title'; // title, select, playing, gameover
let currentStage = null;
let animationId = null;
let lastTime = 0;

// Player state
let player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  targetVx: 0,
  width: 30,
  height: 50,
  balance: 100,
  fallen: false,
  fallAngle: 0,
  fallDirection: 0
};

// Game metrics
let score = 0;
let distance = 0;
let gameTime = 0;

// Item effects
let spikeShoes = {
  active: false,
  timer: 0
};

// Trail system
let trails = [];
const MAX_TRAILS = 200;

// Stage-specific elements
let obstacles = [];
let items = [];
let speedLines = [];

// Input state
let inputLeft = false;
let inputRight = false;
let touchStartX = 0;

// Camera offset for scrolling effect
let cameraY = 0;

// ============================================
// Stage Configurations
// ============================================

const STAGES = {
  roller: {
    name: 'ROLLER SKATE',
    mu: 0.35,
    maxSpeed: 8,
    forwardSpeed: 5,
    bgColor: '#2d2d44',
    floorColor: '#3d3d5c',
    trailColor: 'rgba(30, 30, 30, 0.8)',
    balanceDecayRate: 0.3,
    obstacles: false,
    items: false,
    speedLines: true
  },
  ice: {
    name: 'ICE',
    mu: 0.15,
    maxSpeed: 10,
    forwardSpeed: 4,
    bgColor: '#1a3a5c',
    floorColor: null, // Gradient
    trailColor: 'rgba(200, 230, 255, 0.6)',
    balanceDecayRate: 0.5,
    obstacles: true, // Cracked ice
    items: true,     // Spike shoes
    speedLines: true
  }
};

// ============================================
// Canvas Setup
// ============================================

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================
// Input Handling
// ============================================

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    inputLeft = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    inputRight = true;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    inputLeft = false;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    inputRight = false;
  }
});

// Touch
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  touchStartX = touch.clientX;

  if (touch.clientX < canvas.width / 2) {
    inputLeft = true;
  } else {
    inputRight = true;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const deltaX = touch.clientX - touchStartX;

  if (Math.abs(deltaX) > 30) {
    inputLeft = deltaX < 0;
    inputRight = deltaX > 0;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  inputLeft = false;
  inputRight = false;
}, { passive: false });

// Mouse (for testing on PC)
canvas.addEventListener('mousedown', (e) => {
  if (gameState !== 'playing') return;
  if (e.clientX < canvas.width / 2) {
    inputLeft = true;
  } else {
    inputRight = true;
  }
});

canvas.addEventListener('mouseup', () => {
  inputLeft = false;
  inputRight = false;
});

// ============================================
// Button Event Listeners
// ============================================

startBtn.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  stageSelect.classList.remove('hidden');
  gameState = 'select';
});

stageRollerBtn.addEventListener('click', () => {
  startGame('roller');
});

stageIceBtn.addEventListener('click', () => {
  startGame('ice');
});

backToTitleBtn.addEventListener('click', () => {
  stageSelect.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  gameState = 'title';
});

retryBtn.addEventListener('click', () => {
  startGame(currentStage);
});

selectBtn.addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  stageSelect.classList.remove('hidden');
  gameState = 'select';
});

// ============================================
// Game Initialization
// ============================================

function startGame(stageName) {
  currentStage = stageName;
  const stage = STAGES[stageName];

  // Hide UI screens
  stageSelect.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  itemDisplay.classList.add('hidden');

  // Reset player
  player = {
    x: canvas.width / 2,
    y: canvas.height * 0.7,
    vx: 0,
    vy: -stage.forwardSpeed,
    targetVx: 0,
    width: 30,
    height: 50,
    balance: 100,
    fallen: false,
    fallAngle: 0,
    fallDirection: 0
  };

  // Reset metrics
  score = 0;
  distance = 0;
  gameTime = 0;
  cameraY = 0;

  // Reset trails
  trails = [];

  // Reset items/effects
  spikeShoes = { active: false, timer: 0 };

  // Generate stage elements
  generateStageElements(stageName);

  // Start game loop
  gameState = 'playing';
  lastTime = performance.now();

  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  gameLoop();
}

function generateStageElements(stageName) {
  obstacles = [];
  items = [];
  speedLines = [];

  const stage = STAGES[stageName];

  // Generate speed lines for both stages
  if (stage.speedLines) {
    for (let i = 0; i < 5; i++) {
      speedLines.push({
        x: Math.random() * canvas.width,
        y: -i * 500 - Math.random() * 300,
        width: 60 + Math.random() * 40,
        boost: 2
      });
    }
  }

  // Ice stage specific elements
  if (stageName === 'ice') {
    // Cracked ice areas
    for (let i = 0; i < 8; i++) {
      obstacles.push({
        type: 'crack',
        x: Math.random() * (canvas.width - 100) + 50,
        y: -i * 400 - Math.random() * 200 - 500,
        radius: 40 + Math.random() * 30,
        mu: 0.05
      });
    }

    // Spike shoe items
    for (let i = 0; i < 3; i++) {
      items.push({
        type: 'spike',
        x: Math.random() * (canvas.width - 60) + 30,
        y: -i * 800 - Math.random() * 400 - 1000,
        radius: 20,
        collected: false
      });
    }
  }
}

// ============================================
// Game Loop
// ============================================

function gameLoop(currentTime = performance.now()) {
  if (gameState !== 'playing') return;

  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  update(deltaTime);
  render();

  animationId = requestAnimationFrame(gameLoop);
}

// ============================================
// Update Logic
// ============================================

function update(dt) {
  const stage = STAGES[currentStage];

  if (player.fallen) {
    updateFallAnimation(dt);
    return;
  }

  gameTime += dt;

  // Calculate effective friction
  let effectiveMu = stage.mu;

  // Check for spike shoes buff
  if (spikeShoes.active) {
    spikeShoes.timer -= dt;
    if (spikeShoes.timer <= 0) {
      spikeShoes.active = false;
      itemDisplay.classList.add('hidden');
    } else {
      effectiveMu = Math.min(effectiveMu + 0.2, 0.4);
      itemTimer.textContent = Math.ceil(spikeShoes.timer) + 's';
    }
  }

  // Check for cracked ice
  for (const obs of obstacles) {
    if (obs.type === 'crack') {
      const dx = player.x - obs.x;
      const dy = (player.y - cameraY) - obs.y;
      if (dx * dx + dy * dy < obs.radius * obs.radius) {
        effectiveMu = obs.mu;
      }
    }
  }

  // Check for speed lines
  for (const line of speedLines) {
    const lineY = line.y + cameraY;
    if (player.y > lineY - 10 && player.y < lineY + 10 &&
        player.x > line.x && player.x < line.x + line.width) {
      player.vy -= line.boost * dt * 60;
    }
  }

  // Check for item collection
  for (const item of items) {
    if (item.collected) continue;
    const dx = player.x - item.x;
    const dy = (player.y - cameraY) - item.y;
    if (dx * dx + dy * dy < (item.radius + player.width/2) * (item.radius + player.width/2)) {
      item.collected = true;
      if (item.type === 'spike') {
        spikeShoes.active = true;
        spikeShoes.timer = 10;
        itemDisplay.classList.remove('hidden');
      }
    }
  }

  // Handle input
  const moveForce = 15;
  if (inputLeft) {
    player.targetVx = -moveForce;
  } else if (inputRight) {
    player.targetVx = moveForce;
  } else {
    player.targetVx = 0;
  }

  // Apply friction-based movement
  player.vx += (player.targetVx - player.vx) * effectiveMu;

  // Clamp horizontal speed
  player.vx = Math.max(-stage.maxSpeed, Math.min(stage.maxSpeed, player.vx));

  // Maintain forward speed
  const targetVy = -stage.forwardSpeed;
  player.vy += (targetVy - player.vy) * 0.1;

  // Update position
  player.x += player.vx;
  player.y += player.vy;

  // Keep player in bounds
  const margin = player.width / 2;
  if (player.x < margin) {
    player.x = margin;
    player.vx = Math.abs(player.vx) * 0.5;
    player.balance -= 10;
  }
  if (player.x > canvas.width - margin) {
    player.x = canvas.width - margin;
    player.vx = -Math.abs(player.vx) * 0.5;
    player.balance -= 10;
  }

  // Update camera
  cameraY += player.vy;

  // Update balance
  const turnSpeed = Math.abs(player.vx);
  const balanceDecay = turnSpeed * stage.balanceDecayRate * dt * 10;

  // Extra decay on low friction
  const frictionPenalty = effectiveMu < 0.1 ? 2 : 1;

  player.balance -= balanceDecay * frictionPenalty;

  // Slight recovery when moving straight
  if (turnSpeed < 1) {
    player.balance += 5 * dt;
  }

  player.balance = Math.max(0, Math.min(100, player.balance));

  // Check for fall
  if (player.balance <= 0) {
    triggerFall();
  }

  // Add trail
  if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 1) {
    trails.push({
      x: player.x,
      y: player.y - cameraY,
      age: 0,
      vx: player.vx
    });

    if (trails.length > MAX_TRAILS) {
      trails.shift();
    }
  }

  // Age trails
  for (const trail of trails) {
    trail.age += dt;
  }
  trails = trails.filter(t => t.age < 3);

  // Update score and distance
  distance = Math.floor(-cameraY / 10);
  score = Math.floor(gameTime * 100 + distance);

  // Regenerate elements as player progresses
  regenerateElements();

  // Update HUD
  updateHUD();
}

function regenerateElements() {
  // Regenerate speed lines
  for (const line of speedLines) {
    if (line.y + cameraY > canvas.height + 100) {
      line.y = -Math.random() * 500 - 500;
      line.x = Math.random() * canvas.width;
    }
  }

  // Regenerate obstacles
  for (const obs of obstacles) {
    if (obs.y + cameraY > canvas.height + 100) {
      obs.y = -Math.random() * 500 - 500;
      obs.x = Math.random() * (canvas.width - 100) + 50;
    }
  }

  // Regenerate items
  for (const item of items) {
    if (item.y + cameraY > canvas.height + 100) {
      item.y = -Math.random() * 800 - 800;
      item.x = Math.random() * (canvas.width - 60) + 30;
      item.collected = false;
    }
  }
}

function triggerFall() {
  player.fallen = true;
  player.fallDirection = player.vx > 0 ? 1 : -1;
  player.fallAngle = 0;
}

function updateFallAnimation(dt) {
  player.fallAngle += dt * 5;

  // Slide while falling
  player.x += player.vx * 0.95;
  player.vx *= 0.98;

  if (player.fallAngle >= Math.PI / 2) {
    gameOver();
  }
}

function gameOver() {
  gameState = 'gameover';
  hud.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');

  finalScore.textContent = 'Score: ' + score;
  finalDistance.textContent = 'Distance: ' + distance + 'm';

  if (animationId) {
    cancelAnimationFrame(animationId);
  }
}

function updateHUD() {
  scoreDisplay.textContent = score;
  distanceDisplay.textContent = distance;
  balanceFill.style.width = player.balance + '%';

  // Color based on balance level
  if (player.balance < 30) {
    balanceFill.style.background = '#ff4757';
  } else if (player.balance < 60) {
    balanceFill.style.background = 'linear-gradient(90deg, #ff4757, #ffa502)';
  } else {
    balanceFill.style.background = 'linear-gradient(90deg, #ff4757, #ffa502, #2ed573)';
  }
}

// ============================================
// Rendering
// ============================================

function render() {
  const stage = STAGES[currentStage];

  // Clear canvas
  ctx.fillStyle = stage.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw floor
  drawFloor(stage);

  // Draw trails
  drawTrails(stage);

  // Draw obstacles
  drawObstacles();

  // Draw speed lines
  drawSpeedLines();

  // Draw items
  drawItems();

  // Draw player
  drawPlayer(stage);
}

function drawFloor(stage) {
  if (currentStage === 'ice') {
    // Ice gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#4facfe');
    gradient.addColorStop(0.5, '#00f2fe');
    gradient.addColorStop(1, '#4facfe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add ice texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 100 + cameraY * 0.1) % (canvas.width + 100) - 50;
      const y = (i * 80) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30, y + 50);
      ctx.lineTo(x - 20, y + 80);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Roller rink floor
    ctx.fillStyle = stage.floorColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lane markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);

    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }
}

function drawTrails(stage) {
  for (const trail of trails) {
    const alpha = Math.max(0, 1 - trail.age / 3);

    if (currentStage === 'ice') {
      // White scratches on ice
      ctx.fillStyle = `rgba(200, 230, 255, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(trail.x, trail.y + cameraY, 3, 8, Math.atan2(1, trail.vx), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Black tire marks
      ctx.fillStyle = `rgba(30, 30, 30, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.ellipse(trail.x, trail.y + cameraY, 4, 10, Math.atan2(1, trail.vx), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawObstacles() {
  for (const obs of obstacles) {
    if (obs.type === 'crack') {
      const screenY = obs.y + cameraY;
      if (screenY < -100 || screenY > canvas.height + 100) continue;

      // Cracked ice visual
      ctx.strokeStyle = 'rgba(100, 150, 200, 0.8)';
      ctx.lineWidth = 2;

      // Draw crack pattern
      ctx.beginPath();
      ctx.arc(obs.x, screenY, obs.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner cracks
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(obs.x, screenY);
        ctx.lineTo(
          obs.x + Math.cos(angle) * obs.radius * 0.8,
          screenY + Math.sin(angle) * obs.radius * 0.8
        );
        ctx.stroke();
      }

      // Warning glow
      ctx.fillStyle = 'rgba(100, 150, 200, 0.2)';
      ctx.beginPath();
      ctx.arc(obs.x, screenY, obs.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSpeedLines() {
  for (const line of speedLines) {
    const screenY = line.y + cameraY;
    if (screenY < -50 || screenY > canvas.height + 50) continue;

    // Speed boost line
    const gradient = ctx.createLinearGradient(line.x, screenY, line.x + line.width, screenY);
    gradient.addColorStop(0, 'rgba(255, 200, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(line.x, screenY - 5, line.width, 10);

    // Arrow indicators
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < 3; i++) {
      const ax = line.x + 10 + i * 20;
      ctx.beginPath();
      ctx.moveTo(ax, screenY + 5);
      ctx.lineTo(ax + 8, screenY);
      ctx.lineTo(ax, screenY - 5);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawItems() {
  for (const item of items) {
    if (item.collected) continue;

    const screenY = item.y + cameraY;
    if (screenY < -50 || screenY > canvas.height + 50) continue;

    if (item.type === 'spike') {
      // Spike shoes item
      ctx.save();
      ctx.translate(item.x, screenY);

      // Glow
      ctx.fillStyle = 'rgba(0, 255, 150, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, item.radius + 10, 0, Math.PI * 2);
      ctx.fill();

      // Item background
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
      ctx.fill();

      // Spike icon
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔩', 0, 0);

      ctx.restore();
    }
  }
}

function drawPlayer(stage) {
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.fallen) {
    // Fall animation
    ctx.rotate(player.fallAngle * player.fallDirection);
    ctx.translate(0, player.fallAngle * 20);
  } else {
    // Lean based on velocity
    ctx.rotate(player.vx * 0.03);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(5, player.height / 2 + 5, player.width / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height * 0.6);

  // Legs
  ctx.fillStyle = '#4a4a6a';
  ctx.fillRect(-player.width / 2, player.height * 0.1, player.width * 0.4, player.height * 0.4);
  ctx.fillRect(player.width * 0.1, player.height * 0.1, player.width * 0.4, player.height * 0.4);

  // Head
  ctx.fillStyle = '#ffd93d';
  ctx.beginPath();
  ctx.arc(0, -player.height / 2 - 12, 15, 0, Math.PI * 2);
  ctx.fill();

  // Skates/shoes
  if (currentStage === 'roller') {
    // Roller skate wheels
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-8, player.height / 2, 6, 0, Math.PI * 2);
    ctx.arc(8, player.height / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Ice skate blades
    ctx.strokeStyle = spikeShoes.active ? '#00ff88' : '#888';
    ctx.lineWidth = spikeShoes.active ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(-player.width / 2, player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.stroke();

    // Spike effect
    if (spikeShoes.active) {
      ctx.fillStyle = '#00ff88';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, player.height / 2);
        ctx.lineTo(i * 6 - 2, player.height / 2 + 6);
        ctx.lineTo(i * 6 + 2, player.height / 2 + 6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Balance indicator on player
  if (!player.fallen) {
    const balanceColor = player.balance < 30 ? '#ff4757' :
                         player.balance < 60 ? '#ffa502' : '#2ed573';
    ctx.fillStyle = balanceColor;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, -player.height / 2 - 30, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ============================================
// Initialize
// ============================================

// Draw initial background
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);
