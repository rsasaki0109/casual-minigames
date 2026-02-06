// ============================================
// Flying Carpet Runner - Main Game Script
// ============================================

// ============================================
// 調整パラメータ（ゲームバランス）
// ============================================
const CONFIG = {
    // プレイヤー物理
    gravity: 0.3,              // 重力（下降加速度）
    liftForce: -0.8,           // 上昇力
    maxFallSpeed: 8,           // 最大落下速度
    maxRiseSpeed: -10,         // 最大上昇速度
    horizontalDrag: 0.98,      // 空気抵抗

    // ゲーム進行
    baseScrollSpeed: 4,        // 基本スクロール速度
    maxScrollSpeed: 12,        // 最大スクロール速度
    speedIncreaseRate: 0.001,  // 速度上昇率（フレームごと）

    // ブースト
    boostDuration: 120,        // ブースト持続フレーム（2秒）
    boostCooldown: 300,        // クールダウンフレーム（5秒）
    boostSpeedMultiplier: 1.5, // ブースト時の速度倍率

    // 風ゾーン
    windSpeedBonus: 3,         // 風ゾーンでの追加速度
    windZoneMinWidth: 200,     // 風ゾーン最小幅
    windZoneMaxWidth: 400,     // 風ゾーン最大幅

    // スポーン頻度（フレーム間隔）
    obstacleSpawnInterval: 90, // 障害物スポーン間隔
    itemSpawnInterval: 150,    // アイテムスポーン間隔
    windZoneSpawnInterval: 600,// 風ゾーンスポーン間隔

    // 当たり判定サイズ調整（0-1、小さいほど判定が緩い）
    hitboxScale: 0.7,

    // スコア
    scorePerSecond: 10,        // 生存1秒あたりのスコア
    scorePerItem: 100,         // アイテム1個あたりのスコア
};

// ============================================
// ユーティリティ関数
// ============================================
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function rectIntersect(a, b, scale = 1) {
    const aw = a.width * scale;
    const ah = a.height * scale;
    const bw = b.width * scale;
    const bh = b.height * scale;
    const ax = a.x + (a.width - aw) / 2;
    const ay = a.y + (a.height - ah) / 2;
    const bx = b.x + (b.width - bw) / 2;
    const by = b.y + (b.height - bh) / 2;

    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ============================================
// 入力管理クラス
// ============================================
class Input {
    constructor() {
        this.keys = {};
        this.touchActive = false;
        this.boostPressed = false;
        this.pausePressed = false;
        this.isMobile = 'ontouchstart' in window;

        this.setupKeyboard();
        this.setupTouch();
        this.setupButtons();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupTouch() {
        const canvas = document.getElementById('gameCanvas');

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchActive = true;
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchActive = false;
        });

        canvas.addEventListener('touchcancel', (e) => {
            this.touchActive = false;
        });
    }

    setupButtons() {
        const boostBtn = document.getElementById('boost-btn');
        const pauseBtn = document.getElementById('pause-btn');

        boostBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.boostPressed = true;
        });

        boostBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.boostPressed = false;
        });

        pauseBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.pausePressed = true;
        });

        pauseBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.pausePressed = false;
        });
    }

    isUp() {
        return this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchActive;
    }

    isDown() {
        return this.keys['KeyS'] || this.keys['ArrowDown'];
    }

    isBoost() {
        return this.keys['Space'] || this.boostPressed;
    }

    isPause() {
        return this.keys['KeyP'] || this.pausePressed;
    }

    isRestart() {
        return this.keys['Enter'];
    }

    consumePause() {
        this.keys['KeyP'] = false;
        this.pausePressed = false;
    }

    consumeBoost() {
        this.keys['Space'] = false;
        this.boostPressed = false;
    }
}

// ============================================
// プレイヤークラス（空飛ぶ絨毯）
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 30;
        this.vy = 0;
        this.rotation = 0;
        this.wobblePhase = 0;
        this.trail = [];

        // ブースト状態
        this.boosting = false;
        this.boostTimer = 0;
        this.boostCooldown = 0;
    }

    update(input, canvasHeight, scrollSpeed) {
        // 上昇/下降
        if (input.isUp()) {
            this.vy += CONFIG.liftForce;
        } else {
            this.vy += CONFIG.gravity;
        }

        // 下降時は減衰（ふわっと感）
        if (this.vy > 0) {
            this.vy *= 0.95;
        }

        // 速度制限
        this.vy = clamp(this.vy, CONFIG.maxRiseSpeed, CONFIG.maxFallSpeed);
        this.y += this.vy;

        // 画面内に制限
        this.y = clamp(this.y, 10, canvasHeight - this.height - 10);

        // ブースト処理
        if (this.boostCooldown > 0) {
            this.boostCooldown--;
        }

        if (input.isBoost() && this.boostCooldown === 0 && !this.boosting) {
            this.boosting = true;
            this.boostTimer = CONFIG.boostDuration;
            input.consumeBoost();
        }

        if (this.boosting) {
            this.boostTimer--;
            if (this.boostTimer <= 0) {
                this.boosting = false;
                this.boostCooldown = CONFIG.boostCooldown;
            }
        }

        // 揺れ演出（速度に応じて）
        this.wobblePhase += 0.1 + scrollSpeed * 0.02;
        const wobbleAmount = scrollSpeed * 0.3;
        this.rotation = Math.sin(this.wobblePhase) * wobbleAmount * (Math.PI / 180);

        // 残像用トレイル
        if (this.boosting) {
            this.trail.push({ x: this.x, y: this.y + this.height / 2, alpha: 1 });
            if (this.trail.length > 10) {
                this.trail.shift();
            }
        }

        // トレイルのフェードアウト
        this.trail = this.trail.filter(t => {
            t.alpha -= 0.1;
            t.x -= scrollSpeed;
            return t.alpha > 0;
        });
    }

    draw(ctx) {
        ctx.save();

        // ブースト残像
        this.trail.forEach(t => {
            ctx.globalAlpha = t.alpha * 0.5;
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(t.x - 20, t.y - 2, 40, 4);
        });
        ctx.globalAlpha = 1;

        // 絨毯本体
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // 絨毯の影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 8, this.width, this.height);

        // 絨毯本体（グラデーション）
        const gradient = ctx.createLinearGradient(-this.width / 2, 0, this.width / 2, 0);
        gradient.addColorStop(0, '#8B0000');
        gradient.addColorStop(0.2, '#DC143C');
        gradient.addColorStop(0.5, '#FFD700');
        gradient.addColorStop(0.8, '#DC143C');
        gradient.addColorStop(1, '#8B0000');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // 絨毯の模様
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2 + 5, -this.height / 2 + 3, this.width - 10, this.height - 6);

        // 絨毯のフリンジ（房）
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 6; i++) {
            const fx = -this.width / 2 + 10 + i * 12;
            ctx.fillRect(fx, this.height / 2 - 2, 4, 8);
            ctx.fillRect(fx, -this.height / 2 - 6, 4, 8);
        }

        // ブースト中のエフェクト
        if (this.boosting) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 - 10, 0);
            ctx.lineTo(-this.width / 2 - 30, -10);
            ctx.moveTo(-this.width / 2 - 10, 0);
            ctx.lineTo(-this.width / 2 - 30, 10);
            ctx.moveTo(-this.width / 2 - 10, 0);
            ctx.lineTo(-this.width / 2 - 35, 0);
            ctx.stroke();
        }

        ctx.restore();
    }

    getHitbox() {
        return {
            x: this.x + this.width * (1 - CONFIG.hitboxScale) / 2,
            y: this.y + this.height * (1 - CONFIG.hitboxScale) / 2,
            width: this.width * CONFIG.hitboxScale,
            height: this.height * CONFIG.hitboxScale
        };
    }
}

// ============================================
// 障害物クラス
// ============================================
class Obstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.phase = Math.random() * Math.PI * 2;

        // タイプ別サイズと特性
        switch (type) {
            case 'bird':
                this.width = 40;
                this.height = 30;
                this.color = '#4A4A4A';
                this.movePattern = 'wave';
                break;
            case 'balloon':
                this.width = 50;
                this.height = 70;
                this.color = '#FF6B6B';
                this.movePattern = 'float';
                break;
            case 'tower':
                this.width = 60;
                this.height = 200;
                this.color = '#8B4513';
                this.movePattern = 'static';
                break;
            case 'cloud':
                this.width = 80;
                this.height = 50;
                this.color = '#666';
                this.movePattern = 'slow';
                break;
            default:
                this.width = 40;
                this.height = 40;
                this.color = '#333';
                this.movePattern = 'static';
        }
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
        this.phase += 0.05;

        // 動きパターン
        switch (this.movePattern) {
            case 'wave':
                this.y += Math.sin(this.phase) * 2;
                break;
            case 'float':
                this.y += Math.sin(this.phase * 0.5) * 1;
                break;
            case 'slow':
                this.x += scrollSpeed * 0.3; // 少し遅く動く
                break;
        }
    }

    draw(ctx) {
        ctx.save();

        switch (this.type) {
            case 'bird':
                this.drawBird(ctx);
                break;
            case 'balloon':
                this.drawBalloon(ctx);
                break;
            case 'tower':
                this.drawTower(ctx);
                break;
            case 'cloud':
                this.drawCloud(ctx);
                break;
            default:
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();
    }

    drawBird(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const wingFlap = Math.sin(this.phase * 3) * 10;

        // 体
        ctx.fillStyle = '#2C2C2C';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 15, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 翼
        ctx.fillStyle = '#4A4A4A';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy);
        ctx.lineTo(cx - 20, cy - 15 + wingFlap);
        ctx.lineTo(cx + 5, cy);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx - 5, cy);
        ctx.lineTo(cx - 20, cy + 15 - wingFlap);
        ctx.lineTo(cx + 5, cy);
        ctx.fill();

        // くちばし
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(cx + 15, cy);
        ctx.lineTo(cx + 25, cy);
        ctx.lineTo(cx + 15, cy + 5);
        ctx.fill();
    }

    drawBalloon(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + 25;

        // 紐
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 25);
        ctx.lineTo(cx, this.y + this.height);
        ctx.stroke();

        // バルーン本体
        const gradient = ctx.createRadialGradient(cx - 5, cy - 5, 5, cx, cy, 25);
        gradient.addColorStop(0, '#FF9999');
        gradient.addColorStop(1, '#FF6B6B');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // ハイライト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(cx - 8, cy - 10, 6, 10, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // カゴ
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(cx - 10, this.y + this.height - 15, 20, 15);
    }

    drawTower(ctx) {
        // 塔本体
        const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        gradient.addColorStop(0, '#6B4423');
        gradient.addColorStop(0.5, '#8B4513');
        gradient.addColorStop(1, '#6B4423');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 窓
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(this.x + 10, this.y + 20 + i * 45, 15, 20);
            ctx.fillRect(this.x + 35, this.y + 20 + i * 45, 15, 20);
        }

        // 屋根
        ctx.fillStyle = '#4A3728';
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y - 30);
        ctx.lineTo(this.x + this.width + 5, this.y);
        ctx.fill();
    }

    drawCloud(ctx) {
        ctx.fillStyle = '#555';
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // 雷雲
        ctx.beginPath();
        ctx.arc(cx - 20, cy, 20, 0, Math.PI * 2);
        ctx.arc(cx + 10, cy - 5, 25, 0, Math.PI * 2);
        ctx.arc(cx + 25, cy + 5, 18, 0, Math.PI * 2);
        ctx.fill();

        // 稲妻
        if (Math.sin(this.phase * 5) > 0.7) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy + 20);
            ctx.lineTo(cx - 10, cy + 35);
            ctx.lineTo(cx + 5, cy + 35);
            ctx.lineTo(cx - 5, cy + 55);
            ctx.stroke();
        }
    }

    getHitbox() {
        return {
            x: this.x + this.width * (1 - CONFIG.hitboxScale) / 2,
            y: this.y + this.height * (1 - CONFIG.hitboxScale) / 2,
            width: this.width * CONFIG.hitboxScale,
            height: this.height * CONFIG.hitboxScale
        };
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// ============================================
// アイテムクラス（糸）
// ============================================
class Item {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.rotation = 0;
        this.collected = false;
        this.collectAnimation = 0;
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
        this.rotation += 0.05;

        if (this.collected) {
            this.collectAnimation++;
        }
    }

    draw(ctx) {
        if (this.collected && this.collectAnimation > 15) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        if (this.collected) {
            const scale = 1 + this.collectAnimation * 0.1;
            ctx.scale(scale, scale);
            ctx.globalAlpha = 1 - this.collectAnimation / 15;
        }

        // 糸巻きの描画
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // 中心の穴
        ctx.fillStyle = '#B8860B';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // 糸の模様
        ctx.strokeStyle = '#FFF8DC';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(0, 0, 9, angle, angle + 0.5);
            ctx.stroke();
        }

        // キラキラエフェクト
        if (!this.collected) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const sparkle = Math.sin(this.rotation * 3) * 2 + 2;
            ctx.beginPath();
            ctx.arc(-5, -5, sparkle, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    isOffScreen() {
        return this.x + this.width < -50 || (this.collected && this.collectAnimation > 15);
    }
}

// ============================================
// 風ゾーンクラス
// ============================================
class WindZone {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.particles = [];

        // パーティクル初期化
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                speed: 2 + Math.random() * 3
            });
        }
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;

        // パーティクル更新
        this.particles.forEach(p => {
            p.x += p.speed;
            if (p.x > this.width) {
                p.x = 0;
                p.y = Math.random() * this.height;
            }
        });
    }

    draw(ctx) {
        ctx.save();

        // 風ゾーン背景
        ctx.fillStyle = 'rgba(135, 206, 235, 0.3)';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 境界線
        ctx.strokeStyle = 'rgba(135, 206, 235, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.setLineDash([]);

        // 風パーティクル
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        this.particles.forEach(p => {
            const px = this.x + p.x;
            const py = this.y + p.y;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + 15, py);
            ctx.stroke();
        });

        // ラベル
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px sans-serif';
        ctx.fillText('WIND ZONE', this.x + 10, this.y + 20);

        ctx.restore();
    }

    contains(player) {
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        return px > this.x && px < this.x + this.width &&
               py > this.y && py < this.y + this.height;
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// ============================================
// スポナークラス
// ============================================
class Spawner {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.obstacleTimer = 0;
        this.itemTimer = 0;
        this.windZoneTimer = 0;
    }

    update(obstacles, items, windZones) {
        this.obstacleTimer++;
        this.itemTimer++;
        this.windZoneTimer++;

        // 障害物スポーン
        if (this.obstacleTimer >= CONFIG.obstacleSpawnInterval) {
            this.obstacleTimer = 0;
            this.spawnObstacle(obstacles);
        }

        // アイテムスポーン
        if (this.itemTimer >= CONFIG.itemSpawnInterval) {
            this.itemTimer = 0;
            this.spawnItem(items);
        }

        // 風ゾーンスポーン
        if (this.windZoneTimer >= CONFIG.windZoneSpawnInterval) {
            this.windZoneTimer = 0;
            this.spawnWindZone(windZones);
        }
    }

    spawnObstacle(obstacles) {
        const types = ['bird', 'balloon', 'tower', 'cloud'];
        const type = types[randomInt(0, types.length - 1)];

        let y;
        if (type === 'tower') {
            y = this.canvasHeight - 200;
        } else {
            y = randomRange(50, this.canvasHeight - 100);
        }

        obstacles.push(new Obstacle(this.canvasWidth + 50, y, type));
    }

    spawnItem(items) {
        const y = randomRange(50, this.canvasHeight - 50);
        items.push(new Item(this.canvasWidth + 50, y));
    }

    spawnWindZone(windZones) {
        const width = randomRange(CONFIG.windZoneMinWidth, CONFIG.windZoneMaxWidth);
        const height = randomRange(100, 200);
        const y = randomRange(50, this.canvasHeight - height - 50);
        windZones.push(new WindZone(this.canvasWidth + 50, y, width, height));
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
}

// ============================================
// 背景描画クラス
// ============================================
class Background {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.clouds = [];
        this.buildings = [];
        this.scrollX = 0;

        // 初期雲を生成
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight * 0.6,
                size: 30 + Math.random() * 50,
                speed: 0.2 + Math.random() * 0.3
            });
        }

        // 初期建物を生成
        for (let i = 0; i < 10; i++) {
            this.buildings.push({
                x: i * 150 + Math.random() * 50,
                width: 40 + Math.random() * 60,
                height: 50 + Math.random() * 100
            });
        }
    }

    update(scrollSpeed) {
        this.scrollX += scrollSpeed * 0.3;

        // 雲の更新
        this.clouds.forEach(cloud => {
            cloud.x -= scrollSpeed * cloud.speed;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.canvasWidth + cloud.size;
                cloud.y = Math.random() * this.canvasHeight * 0.6;
            }
        });
    }

    draw(ctx) {
        // 空のグラデーション
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.7, '#E0F6FF');
        skyGradient.addColorStop(1, '#FFE4B5');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 太陽
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.canvasWidth - 80, 60, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(this.canvasWidth - 80, 60, 55, 0, Math.PI * 2);
        ctx.fill();

        // 雲
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            this.drawCloud(ctx, cloud.x, cloud.y, cloud.size);
        });

        // 遠景の建物
        ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
        this.buildings.forEach(building => {
            const x = (building.x - this.scrollX * 0.1) % (this.canvasWidth + 200) - 100;
            ctx.fillRect(x, this.canvasHeight - building.height, building.width, building.height);
        });

        // 地面
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(0, this.canvasHeight - 20, this.canvasWidth, 20);
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
    }

    resize(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
}

// ============================================
// メインゲームクラス
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('overlay');
        this.startBtn = document.getElementById('start-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.titleBtn = document.getElementById('title-btn');
        this.scoreDisplay = document.getElementById('score-display');
        this.gameTitle = document.getElementById('game-title');
        this.gameSubtitle = document.getElementById('game-subtitle');

        this.state = 'title'; // title, playing, paused, gameover
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('flyingCarpetHighScore')) || 0;
        this.itemsCollected = 0;
        this.survivalTime = 0;
        this.scrollSpeed = CONFIG.baseScrollSpeed;

        this.input = new Input();
        this.player = null;
        this.spawner = null;
        this.background = null;

        this.obstacles = [];
        this.items = [];
        this.windZones = [];

        this.lastPauseState = false;

        this.resize();
        this.setupEventListeners();
        this.showTitle();

        requestAnimationFrame(() => this.gameLoop());
    }

    resize() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;

        if (this.spawner) {
            this.spawner.resize(this.canvas.width, this.canvas.height);
        }
        if (this.background) {
            this.background.resize(this.canvas.width, this.canvas.height);
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());

        this.startBtn.addEventListener('click', () => this.startGame());
        this.retryBtn.addEventListener('click', () => this.startGame());
        this.titleBtn.addEventListener('click', () => this.showTitle());

        // タッチでのスタート対応
        this.startBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startGame();
        });
        this.retryBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startGame();
        });
        this.titleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.showTitle();
        });
    }

    showTitle() {
        this.state = 'title';
        this.overlay.classList.remove('hidden');
        this.gameTitle.textContent = 'Flying Carpet Runner';
        this.gameSubtitle.textContent = '空飛ぶ絨毯で空を駆け抜けろ！';
        this.scoreDisplay.innerHTML = `ハイスコア: <span class="highlight">${this.highScore}</span>`;
        this.startBtn.style.display = 'inline-block';
        this.retryBtn.style.display = 'none';
        this.titleBtn.style.display = 'none';
    }

    startGame() {
        this.state = 'playing';
        this.overlay.classList.add('hidden');
        this.score = 0;
        this.itemsCollected = 0;
        this.survivalTime = 0;
        this.scrollSpeed = CONFIG.baseScrollSpeed;

        this.player = new Player(100, this.canvas.height / 2);
        this.spawner = new Spawner(this.canvas.width, this.canvas.height);
        this.background = new Background(this.canvas.width, this.canvas.height);

        this.obstacles = [];
        this.items = [];
        this.windZones = [];
    }

    gameOver() {
        this.state = 'gameover';

        // ハイスコア更新
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flyingCarpetHighScore', this.highScore);
        }

        this.overlay.classList.remove('hidden');
        this.gameTitle.textContent = 'GAME OVER';
        this.gameSubtitle.textContent = '';
        this.scoreDisplay.innerHTML = `
            スコア: <span class="highlight">${this.score}</span><br>
            生存時間: ${(this.survivalTime / 60).toFixed(1)}秒<br>
            糸の収集: ${this.itemsCollected}個<br>
            ハイスコア: ${this.highScore}
        `;
        this.startBtn.style.display = 'none';
        this.retryBtn.style.display = 'inline-block';
        this.titleBtn.style.display = 'inline-block';
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
        } else if (this.state === 'paused') {
            this.state = 'playing';
        }
    }

    update() {
        if (this.state !== 'playing') return;

        // ポーズ処理
        const pausePressed = this.input.isPause();
        if (pausePressed && !this.lastPauseState) {
            this.togglePause();
            this.input.consumePause();
        }
        this.lastPauseState = pausePressed;

        if (this.state === 'paused') return;

        this.survivalTime++;

        // 速度上昇
        this.scrollSpeed = Math.min(
            CONFIG.maxScrollSpeed,
            CONFIG.baseScrollSpeed + this.survivalTime * CONFIG.speedIncreaseRate
        );

        // 風ゾーンチェック
        let inWindZone = false;
        this.windZones.forEach(zone => {
            if (zone.contains(this.player)) {
                inWindZone = true;
            }
        });

        // ブースト込みの実効速度
        let effectiveSpeed = this.scrollSpeed;
        if (inWindZone) {
            effectiveSpeed += CONFIG.windSpeedBonus;
        }
        if (this.player.boosting) {
            effectiveSpeed *= CONFIG.boostSpeedMultiplier;
        }

        // 更新
        this.player.update(this.input, this.canvas.height, effectiveSpeed);
        this.background.update(effectiveSpeed);
        this.spawner.update(this.obstacles, this.items, this.windZones);

        // エンティティ更新
        this.obstacles.forEach(o => o.update(effectiveSpeed));
        this.items.forEach(i => i.update(effectiveSpeed));
        this.windZones.forEach(w => w.update(effectiveSpeed));

        // 衝突判定 - 障害物
        const playerHitbox = this.player.getHitbox();
        for (const obstacle of this.obstacles) {
            if (rectIntersect(playerHitbox, obstacle.getHitbox(), CONFIG.hitboxScale)) {
                this.gameOver();
                return;
            }
        }

        // 衝突判定 - アイテム
        this.items.forEach(item => {
            if (!item.collected && rectIntersect(playerHitbox, item.getHitbox())) {
                item.collected = true;
                this.itemsCollected++;
            }
        });

        // 画面外エンティティ削除
        this.obstacles = this.obstacles.filter(o => !o.isOffScreen());
        this.items = this.items.filter(i => !i.isOffScreen());
        this.windZones = this.windZones.filter(w => !w.isOffScreen());

        // スコア計算
        this.score = Math.floor(this.survivalTime / 60 * CONFIG.scorePerSecond) +
                     this.itemsCollected * CONFIG.scorePerItem;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景
        if (this.background) {
            this.background.draw(this.ctx);
        } else {
            // タイトル画面用の簡易背景
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#E0F6FF');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        if (this.state === 'title') return;

        // 風ゾーン
        this.windZones.forEach(w => w.draw(this.ctx));

        // アイテム
        this.items.forEach(i => i.draw(this.ctx));

        // 障害物
        this.obstacles.forEach(o => o.draw(this.ctx));

        // プレイヤー
        if (this.player) {
            this.player.draw(this.ctx);
        }

        // UI
        this.drawUI();

        // ポーズ表示
        if (this.state === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '48px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '20px sans-serif';
            this.ctx.fillText('Press P to resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
            this.ctx.textAlign = 'left';
        }
    }

    drawUI() {
        if (!this.player) return;

        const padding = 15;

        // 左上: スコア情報
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(padding - 5, padding - 5, 180, 85);

        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '16px sans-serif';
        this.ctx.fillText(`スコア: ${this.score}`, padding, padding + 15);
        this.ctx.fillText(`ハイスコア: ${this.highScore}`, padding, padding + 35);
        this.ctx.fillText(`速度: ${this.scrollSpeed.toFixed(1)}`, padding, padding + 55);
        this.ctx.fillText(`糸: ${this.itemsCollected}`, padding, padding + 75);

        // 右上: ブーストゲージ
        const gaugeWidth = 100;
        const gaugeHeight = 20;
        const gaugeX = this.canvas.width - gaugeWidth - padding;
        const gaugeY = padding;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(gaugeX - 5, gaugeY - 5, gaugeWidth + 10, gaugeHeight + 25);

        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('BOOST', gaugeX, gaugeY + 12);

        // ゲージ背景
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(gaugeX, gaugeY + 18, gaugeWidth, gaugeHeight);

        // ゲージ本体
        let fillRatio = 0;
        let gaugeColor = '#FFD700';

        if (this.player.boosting) {
            fillRatio = this.player.boostTimer / CONFIG.boostDuration;
            gaugeColor = '#FF6B6B';
        } else if (this.player.boostCooldown > 0) {
            fillRatio = 1 - (this.player.boostCooldown / CONFIG.boostCooldown);
            gaugeColor = '#666';
        } else {
            fillRatio = 1;
        }

        this.ctx.fillStyle = gaugeColor;
        this.ctx.fillRect(gaugeX, gaugeY + 18, gaugeWidth * fillRatio, gaugeHeight);

        // ゲージ枠
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(gaugeX, gaugeY + 18, gaugeWidth, gaugeHeight);

        // 操作説明（PC用）
        if (!this.input.isMobile) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(padding - 5, this.canvas.height - 55, 200, 50);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = '12px sans-serif';
            this.ctx.fillText('W/↑: 上昇  S/↓: 下降', padding, this.canvas.height - 35);
            this.ctx.fillText('Space: ブースト  P: ポーズ', padding, this.canvas.height - 18);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ============================================
// ゲーム開始
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
