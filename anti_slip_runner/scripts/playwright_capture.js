// ============================================
// Playwright Capture Script for Anti-Slip Runner
// ============================================

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'recordings');
const VIDEO_PATH = path.join(OUTPUT_DIR, 'gameplay.webm');

async function captureGameplay() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 400, height: 700 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 400, height: 700 }
    }
  });

  const page = await context.newPage();

  // Get the game URL - use local file or served URL
  const gameUrl = process.env.GAME_URL || `file://${path.join(__dirname, '..', 'docs', 'index.html')}`;

  console.log(`Opening game at: ${gameUrl}`);
  await page.goto(gameUrl);

  // Wait for game to load
  await page.waitForSelector('#start-btn', { timeout: 10000 });
  console.log('Game loaded!');

  // Wait a moment for animations
  await page.waitForTimeout(500);

  // Click START button
  console.log('Clicking START...');
  await page.click('#start-btn');
  await page.waitForTimeout(300);

  // Select ICE stage (more visually interesting)
  console.log('Selecting ICE stage...');
  await page.click('#stage-ice');
  await page.waitForTimeout(500);

  console.log('Playing game...');

  // Play the game with semi-random inputs
  const playDuration = 8000; // 8 seconds of gameplay
  const startTime = Date.now();

  while (Date.now() - startTime < playDuration) {
    // Check if game is over
    const gameOverVisible = await page.$eval('#game-over', el => !el.classList.contains('hidden')).catch(() => false);
    if (gameOverVisible) {
      console.log('Game over detected!');
      break;
    }

    // Random left/right movement with some strategy
    const random = Math.random();
    const currentTime = Date.now() - startTime;

    // Move more aggressively as time goes on to trigger fall
    const aggressiveness = Math.min(currentTime / playDuration, 1);

    if (random < 0.3 + aggressiveness * 0.2) {
      // Move left
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(100 + Math.random() * 200 * aggressiveness);
      await page.keyboard.up('ArrowLeft');
    } else if (random < 0.6 + aggressiveness * 0.2) {
      // Move right
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100 + Math.random() * 200 * aggressiveness);
      await page.keyboard.up('ArrowRight');
    } else {
      // Quick back and forth (risky move)
      if (aggressiveness > 0.5) {
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(50);
        await page.keyboard.up('ArrowLeft');
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(50);
        await page.keyboard.up('ArrowRight');
      }
    }

    await page.waitForTimeout(50);
  }

  // Wait for game over animation if not already triggered
  await page.waitForTimeout(1500);

  console.log('Capture complete!');

  // Close context to save video
  await context.close();

  // Find the recorded video
  const files = fs.readdirSync(OUTPUT_DIR);
  const videoFile = files.find(f => f.endsWith('.webm'));

  if (videoFile) {
    const srcPath = path.join(OUTPUT_DIR, videoFile);
    fs.renameSync(srcPath, VIDEO_PATH);
    console.log(`Video saved to: ${VIDEO_PATH}`);
  }

  await browser.close();

  return VIDEO_PATH;
}

// Run if called directly
if (require.main === module) {
  captureGameplay()
    .then(videoPath => {
      console.log('\n✅ Capture successful!');
      console.log(`Video: ${videoPath}`);
      console.log('\nTo convert to GIF, run: npm run gif');
    })
    .catch(err => {
      console.error('❌ Capture failed:', err);
      process.exit(1);
    });
}

module.exports = { captureGameplay };
