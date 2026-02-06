// 敵（恵方巻泥棒）クラス
class Enemy {
    constructor(x, y, targetX, targetY, speed, spawnSide) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = speed;
        this.radius = CONFIG.ENEMY_RADIUS;
        this.spawnSide = spawnSide;  // 出現した方向（退場時に使用）

        // 移動方向を計算（若干のランダム性を持たせる）
        const baseAngle = Utils.angle(x, y, targetX, targetY);
        const randomOffset = Utils.degToRad(Utils.random(-15, 15));
        this.moveAngle = baseAngle + randomOffset;

        // 状態管理
        this.state = 'approaching';  // 'approaching', 'surprised', 'retreating', 'dead'
        this.surpriseTime = 0;       // びっくりエフェクト表示時間
        this.wobbleTime = 0;         // 揺れのタイマー
        this.retreatAngle = 0;       // 退場方向

        // アニメーション用
        this.animationFrame = 0;
    }

    // 更新処理
    update(deltaTime, targetX, targetY) {
        this.wobbleTime += deltaTime;
        this.animationFrame += deltaTime * 5;

        switch (this.state) {
            case 'approaching':
                this.updateApproaching(deltaTime, targetX, targetY);
                break;
            case 'surprised':
                this.updateSurprised(deltaTime);
                break;
            case 'retreating':
                this.updateRetreating(deltaTime);
                break;
        }
    }

    // 接近中の更新
    updateApproaching(deltaTime, targetX, targetY) {
        // プレイヤーに向かう基本方向を更新
        const baseAngle = Utils.angle(this.x, this.y, targetX, targetY);

        // 微小なランダム揺れを加える
        const wobble = Math.sin(this.wobbleTime * 3) * Utils.degToRad(5);
        this.moveAngle = baseAngle + wobble;

        // 移動
        this.x += Math.cos(this.moveAngle) * this.speed * deltaTime;
        this.y += Math.sin(this.moveAngle) * this.speed * deltaTime;
    }

    // びっくり状態の更新
    updateSurprised(deltaTime) {
        this.surpriseTime -= deltaTime;
        if (this.surpriseTime <= 0) {
            this.state = 'retreating';
        }
    }

    // 退場中の更新
    updateRetreating(deltaTime) {
        const retreatSpeed = CONFIG.ENEMY_RETREAT_SPEED;
        this.x += Math.cos(this.retreatAngle) * retreatSpeed * deltaTime;
        this.y += Math.sin(this.retreatAngle) * retreatSpeed * deltaTime;
    }

    // 撃退される
    defeat() {
        this.state = 'surprised';
        this.surpriseTime = 0.3;  // 0.3秒間びっくり

        // 退場方向を決定（出現した方向に戻る）
        switch (this.spawnSide) {
            case 0: this.retreatAngle = -Math.PI / 2; break;  // 上へ
            case 1: this.retreatAngle = 0; break;              // 右へ
            case 2: this.retreatAngle = Math.PI / 2; break;    // 下へ
            case 3: this.retreatAngle = Math.PI; break;        // 左へ
        }
    }

    // 画面外に出たかチェック
    isOffScreen(canvasWidth, canvasHeight, margin = 50) {
        return this.x < -margin || this.x > canvasWidth + margin ||
               this.y < -margin || this.y > canvasHeight + margin;
    }

    // プレイヤーとの当たり判定
    isCollidingWithPlayer(playerX, playerY, playerRadius) {
        if (this.state !== 'approaching') return false;
        const dist = Utils.distance(this.x, this.y, playerX, playerY);
        return dist < this.radius + playerRadius;
    }

    // 描画
    draw(ctx) {
        ctx.save();

        switch (this.state) {
            case 'approaching':
                this.drawApproaching(ctx);
                break;
            case 'surprised':
                this.drawSurprised(ctx);
                break;
            case 'retreating':
                this.drawRetreating(ctx);
                break;
        }

        ctx.restore();
    }

    // 接近中の描画
    drawApproaching(ctx) {
        const bobOffset = Math.sin(this.animationFrame * 2) * 3;

        // 影
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.radius + 5, this.radius * 0.8, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // 体
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobOffset, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4a4a4a';
        ctx.fill();
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 泥棒マスク（目の部分）
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x - this.radius * 0.7, this.y - 5 + bobOffset, this.radius * 1.4, 12);

        // 目（狙っている表現）
        ctx.fillStyle = '#fff';
        const eyeSpacing = 8;
        ctx.beginPath();
        ctx.arc(this.x - eyeSpacing, this.y + bobOffset, 4, 0, Math.PI * 2);
        ctx.arc(this.x + eyeSpacing, this.y + bobOffset, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x - eyeSpacing, this.y + bobOffset, 2, 0, Math.PI * 2);
        ctx.arc(this.x + eyeSpacing, this.y + bobOffset, 2, 0, Math.PI * 2);
        ctx.fill();

        // 欲しそうな手
        const handOffset = Math.sin(this.animationFrame * 4) * 5;
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        const handAngle = Utils.angle(this.x, this.y, this.targetX, this.targetY);
        const handDist = this.radius + 10 + handOffset;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y + bobOffset);
        ctx.lineTo(
            this.x + Math.cos(handAngle) * handDist,
            this.y + Math.sin(handAngle) * handDist + bobOffset
        );
        ctx.stroke();
    }

    // びっくり状態の描画
    drawSurprised(ctx) {
        const shakeX = Utils.random(-5, 5);
        const shakeY = Utils.random(-5, 5);

        // 体
        ctx.beginPath();
        ctx.arc(this.x + shakeX, this.y + shakeY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#6a6a6a';
        ctx.fill();

        // びっくりマーク
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#ffff00';
        ctx.textAlign = 'center';
        ctx.fillText('!', this.x + shakeX, this.y - this.radius - 10 + shakeY);

        // 目（×になる）
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        const eyeSpacing = 8;

        ctx.beginPath();
        ctx.moveTo(this.x - eyeSpacing - 4 + shakeX, this.y - 4 + shakeY);
        ctx.lineTo(this.x - eyeSpacing + 4 + shakeX, this.y + 4 + shakeY);
        ctx.moveTo(this.x - eyeSpacing + 4 + shakeX, this.y - 4 + shakeY);
        ctx.lineTo(this.x - eyeSpacing - 4 + shakeX, this.y + 4 + shakeY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.x + eyeSpacing - 4 + shakeX, this.y - 4 + shakeY);
        ctx.lineTo(this.x + eyeSpacing + 4 + shakeX, this.y + 4 + shakeY);
        ctx.moveTo(this.x + eyeSpacing + 4 + shakeX, this.y - 4 + shakeY);
        ctx.lineTo(this.x + eyeSpacing - 4 + shakeX, this.y + 4 + shakeY);
        ctx.stroke();
    }

    // 退場中の描画
    drawRetreating(ctx) {
        const alpha = 0.7;

        // 体（半透明で小さくなりながら退場）
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#4a4a4a';
        ctx.fill();

        // 泣き顔
        ctx.fillStyle = '#fff';
        const eyeSpacing = 6;
        ctx.beginPath();
        ctx.arc(this.x - eyeSpacing, this.y - 2, 3, 0, Math.PI * 2);
        ctx.arc(this.x + eyeSpacing, this.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // 涙
        ctx.fillStyle = '#87ceeb';
        ctx.beginPath();
        ctx.moveTo(this.x - eyeSpacing, this.y + 2);
        ctx.lineTo(this.x - eyeSpacing - 3, this.y + 10);
        ctx.lineTo(this.x - eyeSpacing + 3, this.y + 10);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.x + eyeSpacing, this.y + 2);
        ctx.lineTo(this.x + eyeSpacing - 3, this.y + 10);
        ctx.lineTo(this.x + eyeSpacing + 3, this.y + 10);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

// 敵管理クラス
class EnemyManager {
    constructor(canvasWidth, canvasHeight, playerX, playerY) {
        this.enemies = [];
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.playerX = playerX;
        this.playerY = playerY;
        this.spawnTimer = 0;
        this.currentDifficulty = DIFFICULTY_STAGES[0];
    }

    // 難易度を更新
    updateDifficulty(elapsedTime) {
        this.currentDifficulty = Utils.getDifficultyForTime(elapsedTime);
    }

    // プレイヤー位置を更新
    updatePlayerPosition(x, y) {
        this.playerX = x;
        this.playerY = y;
    }

    // 敵を出現させる
    spawnEnemy() {
        const activeEnemies = this.enemies.filter(e => e.state === 'approaching').length;
        if (activeEnemies >= this.currentDifficulty.maxEnemies) return;

        const spawn = Utils.getRandomSpawnPosition(this.canvasWidth, this.canvasHeight);
        const enemy = new Enemy(
            spawn.x, spawn.y,
            this.playerX, this.playerY,
            this.currentDifficulty.speed,
            spawn.side
        );
        this.enemies.push(enemy);
    }

    // 更新処理
    update(deltaTime) {
        // スポーンタイマー更新
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.currentDifficulty.spawnInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // 各敵の更新
        for (const enemy of this.enemies) {
            enemy.update(deltaTime, this.playerX, this.playerY);
        }

        // 画面外の敵を削除
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.state === 'retreating' && enemy.isOffScreen(this.canvasWidth, this.canvasHeight)) {
                return false;
            }
            return true;
        });
    }

    // にらみによる撃退判定
    checkGlareHits(player) {
        const defeatedEnemies = [];
        for (const enemy of this.enemies) {
            if (enemy.state === 'approaching' && player.isInGlareRange(enemy.x, enemy.y)) {
                enemy.defeat();
                defeatedEnemies.push(enemy);
            }
        }
        return defeatedEnemies;
    }

    // プレイヤーとの接触判定
    checkPlayerCollision(playerX, playerY, playerRadius) {
        for (const enemy of this.enemies) {
            if (enemy.isCollidingWithPlayer(playerX, playerY, playerRadius)) {
                return true;
            }
        }
        return false;
    }

    // 描画
    draw(ctx) {
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }
    }

    // リセット
    reset() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.currentDifficulty = DIFFICULTY_STAGES[0];
    }
}
