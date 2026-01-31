const { chromium } = require('playwright');
const GIFEncoder = require('gifencoder');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function recordGameplay() {
    const width = 800;
    const height = 500;
    const fps = 15;
    const duration = 8; // seconds
    const totalFrames = fps * duration;

    console.log('Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width, height }
    });
    const page = await context.newPage();

    // Load game
    const gamePath = `file://${path.resolve(__dirname, 'index.html')}`;
    console.log('Loading game:', gamePath);
    await page.goto(gamePath);
    await page.waitForTimeout(1000);

    // Start game
    console.log('Starting game...');
    await page.click('#start-btn');
    await page.waitForTimeout(500);

    // Setup GIF encoder
    const encoder = new GIFEncoder(width, height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const outputPath = path.join(__dirname, 'gameplay.gif');
    const stream = fs.createWriteStream(outputPath);

    encoder.createReadStream().pipe(stream);
    encoder.start();
    encoder.setRepeat(0); // Loop forever
    encoder.setDelay(Math.floor(1000 / fps));
    encoder.setQuality(10);

    console.log(`Recording ${totalFrames} frames...`);

    // Simulate playing
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
        // Simulate key presses for gameplay
        if (i % 20 < 10) {
            // Press W/Up to go up
            await page.keyboard.down('KeyW');
        } else {
            await page.keyboard.up('KeyW');
        }

        // Occasionally boost
        if (i === 30) {
            await page.keyboard.press('Space');
        }

        // Take screenshot
        const screenshot = await page.screenshot();
        frames.push(screenshot);

        // Wait for next frame
        await page.waitForTimeout(Math.floor(1000 / fps));

        if ((i + 1) % 20 === 0) {
            console.log(`Frame ${i + 1}/${totalFrames}`);
        }
    }

    await page.keyboard.up('KeyW');

    console.log('Creating GIF from frames...');

    // Add frames to GIF
    for (const frameBuffer of frames) {
        const img = await loadImage(frameBuffer);
        ctx.drawImage(img, 0, 0, width, height);
        encoder.addFrame(ctx);
    }

    encoder.finish();

    await browser.close();

    // Wait for file to be written
    await new Promise(resolve => stream.on('finish', resolve));

    const stats = fs.statSync(outputPath);
    console.log(`GIF saved to: ${outputPath}`);
    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

recordGameplay().catch(console.error);
