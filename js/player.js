// プレイヤークラス
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.glareAngle = 0;  // にらみの方向（ラジアン）
        this.glareRange = CONFIG.GLARE_RANGE;
        this.glareWidth = Utils.degToRad(CONFIG.GLARE_ANGLE);
        this.glareCooldown = 0;  // にらみのクールダウン残り時間
        this.isGlaring = false;  // にらみ発動中フラグ
        this.glareEffectTime = 0;  // にらみエフェクト表示時間

        // 恵方巻の状態
        this.ehomakiRemaining = 100;  // 残り量（%）
        this.eatingSpeed = 100 / CONFIG.GAME_DURATION;  // 1秒あたりの消費量
    }

    // マウス位置に基づいてにらみの方向を更新
    updateGlareDirection(mouseX, mouseY) {
        this.glareAngle = Utils.angle(this.x, this.y, mouseX, mouseY);
    }

    // にらみを発動
    tryGlare() {
        if (this.glareCooldown <= 0) {
            this.isGlaring = true;
            this.glareEffectTime = 0.15;  // 0.15秒間エフェクト表示
            this.glareCooldown = CONFIG.GLARE_COOLDOWN;
            return true;
        }
        return false;
    }

    // 更新処理
    update(deltaTime) {
        // クールダウン更新
        if (this.glareCooldown > 0) {
            this.glareCooldown -= deltaTime;
        }

        // にらみエフェクト時間更新
        if (this.glareEffectTime > 0) {
            this.glareEffectTime -= deltaTime;
            if (this.glareEffectTime <= 0) {
                this.isGlaring = false;
            }
        }

        // 恵方巻を食べる
        this.ehomakiRemaining -= this.eatingSpeed * deltaTime;
        if (this.ehomakiRemaining < 0) {
            this.ehomakiRemaining = 0;
        }
    }

    // 指定した点がにらみ範囲内にあるかチェック
    isInGlareRange(targetX, targetY) {
        const dist = Utils.distance(this.x, this.y, targetX, targetY);
        if (dist > this.glareRange) return false;

        const angleToTarget = Utils.angle(this.x, this.y, targetX, targetY);
        return Utils.isAngleInRange(angleToTarget, this.glareAngle, this.glareWidth);
    }

    // 描画
    draw(ctx) {
        // にらみ範囲の描画（常に表示、発動時は強調）
        this.drawGlareRange(ctx);

        // プレイヤー本体の描画
        this.drawBody(ctx);

        // 恵方巻の描画
        this.drawEhomaki(ctx);
    }

    // にらみ範囲の描画
    drawGlareRange(ctx) {
        const startAngle = this.glareAngle - this.glareWidth / 2;
        const endAngle = this.glareAngle + this.glareWidth / 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.glareRange, startAngle, endAngle);
        ctx.closePath();

        if (this.isGlaring) {
            // 発動時は強調
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)';
            ctx.lineWidth = 3;
        } else {
            // 通常時は薄く表示
            ctx.fillStyle = 'rgba(255, 255, 200, 0.15)';
            ctx.strokeStyle = 'rgba(255, 255, 200, 0.3)';
            ctx.lineWidth = 2;
        }
        ctx.fill();
        ctx.stroke();

        // クールダウン表示
        if (this.glareCooldown > 0) {
            const cooldownRatio = this.glareCooldown / CONFIG.GLARE_COOLDOWN;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.arc(this.x, this.y, this.glareRange * 0.3, startAngle, startAngle + (endAngle - startAngle) * cooldownRatio);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
            ctx.fill();
        }

        ctx.restore();
    }

    // プレイヤー本体の描画
    drawBody(ctx) {
        ctx.save();

        // 顔の向きを恵方巻を食べる方向に
        const faceDirection = this.glareAngle;

        // 体（円）
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdbac';
        ctx.fill();
        ctx.strokeStyle = '#c68642';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 髪の毛
        ctx.beginPath();
        ctx.arc(this.x, this.y - 5, this.radius + 8, Math.PI * 1.2, Math.PI * 1.8);
        ctx.fillStyle = '#2c2c2c';
        ctx.fill();

        // 目（にらみ方向を向く）
        const eyeOffset = 8;
        const eyeX1 = this.x + Math.cos(faceDirection + 0.3) * eyeOffset;
        const eyeY1 = this.y + Math.sin(faceDirection + 0.3) * eyeOffset - 3;
        const eyeX2 = this.x + Math.cos(faceDirection - 0.3) * eyeOffset;
        const eyeY2 = this.y + Math.sin(faceDirection - 0.3) * eyeOffset - 3;

        ctx.beginPath();
        ctx.arc(eyeX1, eyeY1, 4, 0, Math.PI * 2);
        ctx.arc(eyeX2, eyeY2, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.isGlaring ? '#ff0000' : '#2c2c2c';
        ctx.fill();

        // にらみ中は眉を描く
        if (this.isGlaring) {
            ctx.strokeStyle = '#2c2c2c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(eyeX1 - 5, eyeY1 - 5);
            ctx.lineTo(eyeX1 + 5, eyeY1 - 3);
            ctx.moveTo(eyeX2 - 5, eyeY2 - 3);
            ctx.lineTo(eyeX2 + 5, eyeY2 - 5);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 恵方巻の描画
    drawEhomaki(ctx) {
        ctx.save();

        // 恵方巻の位置（プレイヤーの口元）
        const ehomakiLength = 40 * (this.ehomakiRemaining / 100);
        const ehomakiX = this.x + Math.cos(this.glareAngle) * 25;
        const ehomakiY = this.y + Math.sin(this.glareAngle) * 25 + 5;

        ctx.translate(ehomakiX, ehomakiY);
        ctx.rotate(this.glareAngle);

        // 海苔（黒い外側）
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, -8, ehomakiLength, 16);

        // 具材（カラフルな中身）- 断面
        ctx.fillStyle = '#ff9999';  // マグロ
        ctx.fillRect(ehomakiLength - 2, -6, 4, 4);
        ctx.fillStyle = '#90EE90';  // きゅうり
        ctx.fillRect(ehomakiLength - 2, 2, 4, 4);
        ctx.fillStyle = '#fff5c3';  // 卵
        ctx.fillRect(ehomakiLength - 2, -2, 4, 4);

        // ご飯（白い部分）
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ehomakiLength, 0, 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 食べ終わったかチェック
    isFinishedEating() {
        return this.ehomakiRemaining <= 0;
    }
}
