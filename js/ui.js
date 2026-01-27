// UI管理クラス
class UI {
    constructor() {
        // DOM要素のキャッシュ
        this.screens = {
            title: document.getElementById('title-screen'),
            game: document.getElementById('game-screen'),
            pause: document.getElementById('pause-screen'),
            result: document.getElementById('result-screen'),
            howto: document.getElementById('howto-modal')
        };

        this.elements = {
            // タイトル画面
            titleHighscore: document.getElementById('title-highscore'),
            startBtn: document.getElementById('start-btn'),
            howtoBtn: document.getElementById('howto-btn'),
            closeHowto: document.getElementById('close-howto'),

            // ゲーム画面
            score: document.getElementById('score'),
            combo: document.getElementById('combo'),
            remainingPercent: document.getElementById('remaining-percent'),
            gaugeFill: document.getElementById('gauge-fill'),
            pauseBtn: document.getElementById('pause-btn'),

            // ポーズ画面
            resumeBtn: document.getElementById('resume-btn'),
            quitBtn: document.getElementById('quit-btn'),

            // リザルト画面
            resultTitle: document.getElementById('result-title'),
            finalScore: document.getElementById('final-score'),
            newRecord: document.getElementById('new-record'),
            enemiesDefeated: document.getElementById('enemies-defeated'),
            elapsedTime: document.getElementById('elapsed-time'),
            retryBtn: document.getElementById('retry-btn'),
            titleBtn: document.getElementById('title-btn')
        };

        // スコアポップアップ用配列
        this.scorePopups = [];
    }

    // 画面切り替え
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    }

    // モーダル表示/非表示
    showHowto() {
        this.screens.howto.classList.remove('hidden');
    }

    hideHowto() {
        this.screens.howto.classList.add('hidden');
    }

    // ポーズ画面表示/非表示
    showPause() {
        this.screens.pause.classList.remove('hidden');
    }

    hidePause() {
        this.screens.pause.classList.add('hidden');
    }

    // タイトル画面のハイスコア更新
    updateTitleHighscore(score) {
        this.elements.titleHighscore.textContent = Utils.formatNumber(score);
    }

    // ゲームUIの更新
    updateScore(score) {
        this.elements.score.textContent = Utils.formatNumber(score);
    }

    updateCombo(combo) {
        this.elements.combo.textContent = combo.toFixed(1);
    }

    updateRemaining(percent) {
        const displayPercent = Math.max(0, Math.ceil(percent));
        this.elements.remainingPercent.textContent = displayPercent;
        this.elements.gaugeFill.style.width = `${percent}%`;

        // 残り少なくなったら色を変える
        if (percent <= 20) {
            this.elements.gaugeFill.style.background = 'linear-gradient(90deg, #e74c3c 0%, #c0392b 50%, #e74c3c 100%)';
        } else if (percent <= 50) {
            this.elements.gaugeFill.style.background = 'linear-gradient(90deg, #f39c12 0%, #e67e22 50%, #f39c12 100%)';
        } else {
            this.elements.gaugeFill.style.background = 'linear-gradient(90deg, #27ae60 0%, #2ecc71 50%, #27ae60 100%)';
        }
    }

    // リザルト画面の更新
    showResult(isCleared, score, enemiesDefeated, elapsedTime, isNewRecord) {
        this.showScreen('result');

        if (isCleared) {
            this.elements.resultTitle.textContent = 'クリア！';
            this.elements.resultTitle.className = 'result-title clear';
        } else {
            this.elements.resultTitle.textContent = 'ゲームオーバー...';
            this.elements.resultTitle.className = 'result-title gameover';
        }

        this.elements.finalScore.textContent = Utils.formatNumber(score);
        this.elements.enemiesDefeated.textContent = enemiesDefeated;
        this.elements.elapsedTime.textContent = Math.floor(elapsedTime);

        if (isNewRecord && isCleared) {
            this.elements.newRecord.classList.remove('hidden');
        } else {
            this.elements.newRecord.classList.add('hidden');
        }
    }

    // スコアポップアップを追加
    addScorePopup(x, y, score, isCombo = false) {
        this.scorePopups.push({
            x,
            y,
            score,
            isCombo,
            life: 1.0,  // 1秒間表示
            offsetY: 0
        });
    }

    // スコアポップアップの更新と描画
    updateAndDrawPopups(ctx, deltaTime) {
        ctx.save();

        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.life -= deltaTime;
            popup.offsetY -= 50 * deltaTime;  // 上に移動

            if (popup.life <= 0) {
                this.scorePopups.splice(i, 1);
                continue;
            }

            const alpha = popup.life;
            ctx.globalAlpha = alpha;
            ctx.font = popup.isCombo ? 'bold 20px sans-serif' : 'bold 16px sans-serif';
            ctx.fillStyle = popup.isCombo ? '#ffd700' : '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';

            const text = `+${popup.score}`;
            ctx.strokeText(text, popup.x, popup.y + popup.offsetY);
            ctx.fillText(text, popup.x, popup.y + popup.offsetY);
        }

        ctx.restore();
    }

    // ポップアップをクリア
    clearPopups() {
        this.scorePopups = [];
    }
}

// 背景描画クラス
class Background {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tileSize = 60;
    }

    draw(ctx) {
        // 畳風の背景
        ctx.save();

        // ベース色
        ctx.fillStyle = '#3d6b3d';
        ctx.fillRect(0, 0, this.width, this.height);

        // 畳目パターン
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        // 横線
        for (let y = 0; y < this.height; y += this.tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // 縦線（畳の縁）
        for (let x = 0; x < this.width; x += this.tileSize * 2) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();

            // 縁の装飾
            ctx.fillStyle = 'rgba(139, 90, 43, 0.3)';
            ctx.fillRect(x - 2, 0, 4, this.height);
        }

        // 方位表示（西南西を示す）
        this.drawCompass(ctx);

        ctx.restore();
    }

    drawCompass(ctx) {
        const cx = this.width - 60;
        const cy = 60;
        const radius = 35;

        ctx.save();
        ctx.globalAlpha = 0.6;

        // 円
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 方位文字
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N', cx, cy - radius + 12);
        ctx.fillText('S', cx, cy + radius - 12);
        ctx.fillText('E', cx + radius - 12, cy);
        ctx.fillText('W', cx - radius + 12, cy);

        // 西南西を指す矢印
        const ehoAngle = Utils.degToRad(247.5);  // 西南西（247.5度）
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
            cx + Math.cos(ehoAngle - Math.PI / 2) * (radius - 5),
            cy + Math.sin(ehoAngle - Math.PI / 2) * (radius - 5)
        );
        ctx.stroke();

        // 恵方ラベル
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('恵方', cx, cy + radius + 15);

        ctx.restore();
    }
}
