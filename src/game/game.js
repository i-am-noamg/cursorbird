(() => {
  const canvas = document.getElementById('game');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context');
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.textContent = 'Error: Cannot initialize game';
      overlay.classList.remove('hidden');
    }
    return;
  }
  
  const overlay = document.getElementById('overlay');

  // Game constants
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 240;
  const DEFAULT_WIDTH = 640;
  const DEFAULT_HEIGHT = 400;
  const PIPE_SPAWN_OFFSET_PX = 20;

  let width = DEFAULT_WIDTH;
  let height = DEFAULT_HEIGHT;
  
  // Initialize game variables early to avoid temporal dead zone issues
  let birdX = 0, birdY = 0, birdVY = 0, pipes = [], score = 0, best = 0, running = false, startedOnce = false, dead = false, spawnTimer = 0;
  
  function resize() {
    const newWidth = Math.max(MIN_WIDTH, canvas.clientWidth || window.innerWidth || DEFAULT_WIDTH);
    const newHeight = Math.max(MIN_HEIGHT, canvas.clientHeight || window.innerHeight || DEFAULT_HEIGHT);
    width = newWidth;
    height = newHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Clamp bird position to valid bounds after resize (if game is initialized)
    if (startedOnce) {
      const groundTop = height - config.groundHeight;
      const minY = config.birdRadius;
      const maxY = groundTop - config.birdRadius;
      const minX = config.birdRadius;
      const maxX = width - config.birdRadius;
      
      birdX = Math.max(minX, Math.min(maxX, birdX));
      birdY = Math.max(minY, Math.min(maxY, birdY));
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // Default config values (for validation fallback)
  const DEFAULT_CONFIG = {
    skyColor: '#87CEEB',
    groundColor: '#7ec850',
    birdColor: '#FFD93D',
    pipeColor: '#2ecc71'
  };

  // Helper function to validate hex color codes
  function isValidHexColor(color) {
    if (typeof color !== 'string') return false;
    return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
  }

  // Helper function to sanitize color with fallback to default
  function sanitizeColor(color, defaultColor) {
    return isValidHexColor(color) ? color : defaultColor;
  }

  // Configurable game settings (can be updated via message)
  let config = {
    // Physics
    gravity: 0.5,
    flapVelocity: -8,
    pipeSpeed: 3,
    pipeSpawnInterval: 90,
    
    // Pipes
    pipeGap: 120,
    pipeWidth: 60,
    pipeMargin: 40,
    
    // Bird
    birdRadius: 12,
    birdStartXRatio: 0.25,
    
    // Visual
    skyColor: '#87CEEB',
    groundColor: '#7ec850',
    groundHeight: 40,
    birdColor: '#FFD93D',
    pipeColor: '#2ecc71',
    scoreFont: 'bold 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    
    // Controls
    flapKey: 'Tab'
  };
  
  // UI constants
  const SCORE_PADDING = 16;
  const SCORE_Y = 32;

  function calculateMaxVerticalReach() {
    // Calculate maximum vertical distance bird can travel between pipes
    // Time available: pipeSpawnInterval frames at bird's X position
    const framesAvailable = config.pipeSpawnInterval;
    
    // Maximum upward distance with optimal flapping:
    // One flap cycle: velocity goes from -8 (flap) to 0 (at peak)
    // Time to peak: |flapVelocity| / gravity
    const timeToPeak = Math.abs(config.flapVelocity) / config.gravity;
    // Distance per flap: average velocity * time = (flapVelocity / 2) * time
    const distancePerFlap = (config.flapVelocity / 2) * timeToPeak;
    // Number of flaps possible
    const maxFlaps = Math.floor(framesAvailable / timeToPeak);
    const maxUpward = Math.abs(maxFlaps * distancePerFlap);
    
    // Maximum downward distance (starting from rest, falling):
    // d = 0.5 * g * t^2
    const maxDownward = 0.5 * config.gravity * framesAvailable * framesAvailable;
    
    // Use the smaller of the two as a conservative estimate
    // Add some buffer (0.9) to make it challenging but not impossible
    return Math.min(maxUpward, maxDownward) * 0.9;
  }

  function resetGame() {
    birdX = width * config.birdStartXRatio;
    birdY = height / 2;
    birdVY = 0;
    pipes = [];
    score = 0;
    dead = false;
    spawnTimer = 0;
  }

  function spawnPipe() {
    const groundTop = height - config.groundHeight;
    
    // Calculate valid range for gap position
    const minGapY = config.pipeMargin;
    const maxGapY = groundTop - config.pipeGap - config.pipeMargin;
    
    let gapY;
    
    if (pipes.length === 0) {
      // First pipe: generate near bird's starting position for easier start
      const birdStart = height / 2;
      const maxReach = calculateMaxVerticalReach();
      const minY = Math.max(minGapY, birdStart - maxReach);
      const maxY = Math.min(maxGapY, birdStart + maxReach);
      gapY = Math.floor(Math.random() * (maxY - minY)) + minY;
    } else {
      // Subsequent pipes: constrain based on previous pipe's gap
      const lastPipe = pipes[pipes.length - 1];
      const lastGapCenter = (lastPipe.top + lastPipe.bottom) / 2;
      const maxReach = calculateMaxVerticalReach();
      
      // Calculate reachable range from last pipe's gap center
      const minY = Math.max(minGapY, lastGapCenter - maxReach);
      const maxY = Math.min(maxGapY, lastGapCenter + maxReach);
      
      // Ensure valid range
      if (minY >= maxY) {
        // Fallback: use previous gap position
        gapY = lastPipe.top;
      } else {
        // Biased random generation favoring far distances from last gap
        // Use a U-shaped distribution that favors positions near minY and maxY
        const random = Math.random();
        let biasedRandom;
        
        // Use power of 3 for stronger bias toward edges
        if (random < 0.5) {
          // Lower half: bias toward 0 (minY, far from center)
          // Map [0, 0.5) -> [0, 0.5] with strong bias toward 0
          biasedRandom = 0.5 * Math.pow(random * 2, 3);
        } else {
          // Upper half: bias toward 1 (maxY, far from center)
          // Map [0.5, 1) -> [0.5, 1] with strong bias toward 1
          const normalized = (random - 0.5) * 2; // [0, 1)
          biasedRandom = 0.5 + 0.5 * Math.pow(normalized, 3);
        }
        
        // Map biased random value to the range [minY, maxY]
        gapY = Math.floor(biasedRandom * (maxY - minY)) + minY;
      }
    }
    
    // Clamp to valid bounds
    gapY = Math.max(minGapY, Math.min(maxGapY, gapY));
    
    pipes.push({ x: width + PIPE_SPAWN_OFFSET_PX, top: gapY, bottom: gapY + config.pipeGap, scored: false });
  }

  function flap() {
    if (!startedOnce) return; // first TAB unmutes start, subsequent flaps only when running
    if (!running) return;
    birdVY = config.flapVelocity;
  }

  function drawBackground() {
    ctx.fillStyle = config.skyColor;
    ctx.fillRect(0, 0, width, height);
    // ground
    ctx.fillStyle = config.groundColor;
    ctx.fillRect(0, height - config.groundHeight, width, config.groundHeight);
  }

  function drawBird() {
    ctx.save();
    ctx.translate(birdX, birdY);
    ctx.fillStyle = config.birdColor;
    ctx.beginPath();
    ctx.arc(0, 0, config.birdRadius, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(5, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(18, 3);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPipes() {
    ctx.fillStyle = config.pipeColor;
    for (const p of pipes) {
      // top pipe
      ctx.fillRect(p.x, 0, config.pipeWidth, p.top);
      // bottom pipe
      ctx.fillRect(p.x, p.bottom, config.pipeWidth, height - p.bottom);
    }
  }

  function drawScore() {
    ctx.fillStyle = '#ffffff';
    ctx.font = config.scoreFont;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, SCORE_PADDING, SCORE_Y);
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${best ?? 0}`, width - SCORE_PADDING, SCORE_Y);
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update() {
    if (!running) return;
    birdVY += config.gravity;
    birdY += birdVY;
    
    // Clamp birdY to valid bounds to prevent extreme values
    const groundTop = height - config.groundHeight;
    const minY = config.birdRadius;
    const maxY = groundTop - config.birdRadius;
    birdY = Math.max(minY, Math.min(maxY, birdY));

    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      spawnPipe();
      spawnTimer = config.pipeSpawnInterval;
    }

    for (const p of pipes) {
      p.x -= config.pipeSpeed;
      if (!p.scored && p.x + config.pipeWidth < birdX) {
        p.scored = true;
        score += 1;
        const oldBest = best;
        best = Math.max(best || 0, score);
        // Only send update to extension when best score actually increases
        if (best > oldBest) {
          window.postMessage({ type: 'updateBestScore', bestScore: best }, '*');
        }
      }
    }
    while (pipes.length && pipes[0].x + config.pipeWidth < -config.groundHeight) pipes.shift();

    // collisions
    if (birdY + config.birdRadius >= height - config.groundHeight || birdY - config.birdRadius <= 0) {
      dead = true;
      running = false;
    } else {
      for (const p of pipes) {
        const topHit = rectsOverlap(birdX - config.birdRadius, birdY - config.birdRadius, config.birdRadius * 2, config.birdRadius * 2, p.x, 0, config.pipeWidth, p.top);
        const bottomHit = rectsOverlap(birdX - config.birdRadius, birdY - config.birdRadius, config.birdRadius * 2, config.birdRadius * 2, p.x, p.bottom, config.pipeWidth, height - p.bottom);
        if (topHit || bottomHit) {
          dead = true;
          running = false;
          break;
        }
      }
    }
  }

  function render() {
    drawBackground();
    drawPipes();
    drawBird();
    drawScore();
    if (!startedOnce) {
      overlay.classList.remove('hidden');
      overlay.textContent = 'Press TAB to Start';
    } else if (!running) {
      overlay.classList.remove('hidden');
      overlay.textContent = dead ? 'Game Over — Press TAB to Restart' : 'Paused — Press TAB to Resume';
    } else {
      overlay.classList.add('hidden');
    }
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  function startFromPaused() {
    startedOnce = true;
    dead = false;
    running = true;
    resetGame();
  }

  function pauseGame() {
    running = false;
  }

  // input: configurable flap key
  window.addEventListener('keydown', (e) => {
    if (e.key === config.flapKey) {
      e.preventDefault();
      if (!startedOnce || dead) {
        startFromPaused();
        // notify extension we started via tab the first time after pause
        window.postMessage({ __game_started_by_tab: true }, '*');
      } else if (!running) {
        running = true;
      } else {
        flap();
      }
    }
  }, true);

  // messages from extension wrapper in webview html
  window.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.__game_control === 'pause') {
      pauseGame();
    } else if (msg.__game_control === 'start') {
      if (!startedOnce) startFromPaused();
      else running = true;
    } else if (msg.type === 'setBestScore' && typeof msg.bestScore === 'number') {
      // Only update if the received score is higher than current best
      best = Math.max(best || 0, msg.bestScore);
    } else if (msg.type === 'resetBestScore') {
      // Reset best score to 0
      best = 0;
    } else if (msg.type === 'updateConfig' && msg.config) {
      // Update configuration from extension with validation
      const newConfig = { ...msg.config };
      // Sanitize color values
      if (newConfig.skyColor) {
        newConfig.skyColor = sanitizeColor(newConfig.skyColor, DEFAULT_CONFIG.skyColor);
      }
      if (newConfig.groundColor) {
        newConfig.groundColor = sanitizeColor(newConfig.groundColor, DEFAULT_CONFIG.groundColor);
      }
      if (newConfig.birdColor) {
        newConfig.birdColor = sanitizeColor(newConfig.birdColor, DEFAULT_CONFIG.birdColor);
      }
      if (newConfig.pipeColor) {
        newConfig.pipeColor = sanitizeColor(newConfig.pipeColor, DEFAULT_CONFIG.pipeColor);
      }
      Object.assign(config, newConfig);
      // Restart game with new settings
      if (running || startedOnce) {
        resetGame();
      }
    }
  });

  // init
  resetGame();
  loop();
})();


