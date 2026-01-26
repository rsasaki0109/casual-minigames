// ゲーム状態定義
const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover',
    CLEARED: 'cleared'
};

// ゲームクラス
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Canvas サイズ設定（レスポンシブ対応）
        this.resizeCanvas();

        // ゲーム状態
        this.state = GameState.TITLE;
        this.lastTime = 0;
        this.elapsedTime = 0;

        // スコア関連
        this.score = 0;
        this.combo = 1.0;
        this.lastDefeatTime = 0;
        this.enemiesDefeated = 0;
        this.lastEatingPercent = 100;

        // ゲームオブジェクト
        this.player = null;
        this.enemyManager = null;
        this.ui = new UI();
        this.background = null;
        this.updateBackground();

        // 入力状態
        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;

        // スケール比率（座標変換用）
        this.scaleX = 1;
        this.scaleY = 1;

        // イベントリスナーの設定
        this.setupEventListeners();

        // 初期画面表示（明示的にタイトル画面を表示）
        this.ui.showScreen('title');
        this.ui.updateTitleHighscore(Utils.loadHighScore());
    }

    // Canvasサイズをコンテナに合わせてリサイズ
    resizeCanvas() {
        // 内部解像度は固定（ゲームロジックはこの座標系で動作）
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

        // 表示サイズはコンテナに合わせる（CSSでスケール）
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();

        const gameUI = document.getElementById('game-ui');
        const uiHeight = gameUI ? gameUI.getBoundingClientRect().height : 45;

        const availableWidth = containerRect.width;
        const availableHeight = containerRect.height - uiHeight;

        // アスペクト比を維持してフィット
        const aspectRatio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
        let displayWidth, displayHeight;

        if (availableWidth / availableHeight > aspectRatio) {
            displayHeight = availableHeight;
            displayWidth = displayHeight * aspectRatio;
        } else {
            displayWidth = availableWidth;
            displayHeight = displayWidth / aspectRatio;
        }

        this.canvas.style.width = `${Math.floor(displayWidth)}px`;
        this.canvas.style.height = `${Math.floor(displayHeight)}px`;

        // スケール比率を更新（座標変換用）
        this.scaleX = displayWidth / CONFIG.CANVAS_WIDTH;
        this.scaleY = displayHeight / CONFIG.CANVAS_HEIGHT;
    }

    // 背景を更新
    updateBackground() {
        this.background = new Background(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // 座標変換ヘルパー
        const getCanvasCoords = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left) * (this.canvas.width / rect.width),
                y: (clientY - rect.top) * (this.canvas.height / rect.height)
            };
        };

        // マウス移動
        this.canvas.addEventListener('mousemove', (e) => {
            const coords = getCanvasCoords(e.clientX, e.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
        });

        // マウスクリック
        this.canvas.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) {
                this.handleGlare();
            }
        });

        // タッチ移動（モバイル対応）
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const coords = getCanvasCoords(touch.clientX, touch.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
        }, { passive: false });

        // タッチ開始（モバイル対応）
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const coords = getCanvasCoords(touch.clientX, touch.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            if (this.state === GameState.PLAYING) {
                this.handleGlare();
            }
        }, { passive: false });

        // キーボード
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === GameState.PLAYING) {
                    this.handleGlare();
                }
            } else if (e.code === 'Escape') {
                if (this.state === GameState.PLAYING) {
                    this.pause();
                } else if (this.state === GameState.PAUSED) {
                    this.resume();
                }
            } else if (e.code === 'KeyR') {
                if (this.state === GameState.GAME_OVER || this.state === GameState.CLEARED) {
                    this.startGame();
                }
            }
        });

        // リサイズイベント
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.updateBackground();
        });

        // UIボタン
        this.ui.elements.startBtn.addEventListener('click', () => this.startGame());
        this.ui.elements.howtoBtn.addEventListener('click', () => this.ui.showHowto());
        this.ui.elements.closeHowto.addEventListener('click', () => this.ui.hideHowto());
        this.ui.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.ui.elements.resumeBtn.addEventListener('click', () => this.resume());
        this.ui.elements.quitBtn.addEventListener('click', () => this.returnToTitle());
        this.ui.elements.retryBtn.addEventListener('click', () => this.startGame());
        this.ui.elements.titleBtn.addEventListener('click', () => this.returnToTitle());
    }

    // ゲーム開始
    startGame() {
        // リサイズして最新のサイズを取得
        this.resizeCanvas();
        this.updateBackground();

        this.state = GameState.PLAYING;
        this.elapsedTime = 0;
        this.score = 0;
        this.combo = 1.0;
        this.lastDefeatTime = 0;
        this.enemiesDefeated = 0;
        this.lastEatingPercent = 100;
        this.showTutorial = true;
        this.tutorialTime = 3.0; // 3秒間表示
        this.isFacingEho = false; // 恵方を向いているか
        this.ehoAngleRad = Utils.degToRad(CONFIG.EHO_DIRECTION - 90); // 画面上の角度に変換

        // プレイヤーを中央に配置（固定座標系）
        const playerX = CONFIG.CANVAS_WIDTH / 2;
        const playerY = CONFIG.CANVAS_HEIGHT / 2;
        this.player = new Player(playerX, playerY);

        // 敵マネージャーの初期化（固定座標系）
        this.enemyManager = new EnemyManager(
            CONFIG.CANVAS_WIDTH,
            CONFIG.CANVAS_HEIGHT,
            playerX,
            playerY
        );

        // UI初期化
        this.ui.clearPopups();
        this.ui.updateScore(0);
        this.ui.updateCombo(1.0);
        this.ui.updateRemaining(100);
        this.ui.showScreen('game');
        this.ui.hidePause();

        // ゲームループ開始
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // にらみ処理
    handleGlare() {
        if (this.player.tryGlare()) {
            const defeatedEnemies = this.enemyManager.checkGlareHits(this.player);

            for (const enemy of defeatedEnemies) {
                this.enemiesDefeated++;

                // コンボ判定
                const now = this.elapsedTime;
                if (now - this.lastDefeatTime <= CONFIG.COMBO_TIME_LIMIT) {
                    this.combo = Math.min(this.combo + CONFIG.COMBO_INCREMENT, CONFIG.MAX_COMBO);
                } else {
                    this.combo = 1.0;
                }
                this.lastDefeatTime = now;

                // スコア加算
                const earnedScore = Math.floor(CONFIG.SCORE_ENEMY_DEFEAT * this.combo);
                this.score += earnedScore;

                // ポップアップ表示
                this.ui.addScorePopup(enemy.x, enemy.y - 20, earnedScore, this.combo > 1.0);
            }

            this.ui.updateCombo(this.combo);
            this.ui.updateScore(this.score);
        }
    }

    // 一時停止
    pause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            this.ui.showPause();
        }
    }

    // 再開
    resume() {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.ui.hidePause();
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    // タイトルに戻る
    returnToTitle() {
        this.state = GameState.TITLE;
        this.ui.updateTitleHighscore(Utils.loadHighScore());
        this.ui.showScreen('title');
    }

    // ゲームループ
    gameLoop(currentTime) {
        if (this.state !== GameState.PLAYING) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // 更新処理
    update(deltaTime) {
        this.elapsedTime += deltaTime;

        // チュートリアル時間の更新
        if (this.tutorialTime > 0) {
            this.tutorialTime -= deltaTime;
            if (this.tutorialTime <= 0) {
                this.showTutorial = false;
            }
        }

        // コンボのリセット判定
        if (this.elapsedTime - this.lastDefeatTime > CONFIG.COMBO_TIME_LIMIT && this.combo > 1.0) {
            this.combo = 1.0;
            this.ui.updateCombo(this.combo);
        }

        // プレイヤー更新
        this.player.updateGlareDirection(this.mouseX, this.mouseY);
        this.player.update(deltaTime);

        // 恵方を向いているかチェック
        this.checkEhoDirection(deltaTime);

        // にらみを常時発動（敵がいる場合）
        this.handleGlare();

        // 食べた量でスコア加算
        const currentEatingPercent = this.player.ehomakiRemaining;
        const eatenPercent = Math.floor(this.lastEatingPercent) - Math.floor(currentEatingPercent);
        if (eatenPercent > 0) {
            this.score += eatenPercent * CONFIG.SCORE_EATING;
            this.ui.updateScore(this.score);
        }
        this.lastEatingPercent = currentEatingPercent;

        // 残りゲージ更新
        this.ui.updateRemaining(this.player.ehomakiRemaining);

        // 敵の難易度更新
        this.enemyManager.updateDifficulty(this.elapsedTime);
        this.enemyManager.updatePlayerPosition(this.player.x, this.player.y);
        this.enemyManager.update(deltaTime);

        // クリア判定
        if (this.player.isFinishedEating()) {
            this.handleClear();
            return;
        }

        // ゲームオーバー判定
        if (this.enemyManager.checkPlayerCollision(this.player.x, this.player.y, this.player.radius)) {
            this.handleGameOver();
            return;
        }
    }

    // クリア処理
    handleClear() {
        this.state = GameState.CLEARED;
        this.score += CONFIG.SCORE_CLEAR_BONUS;
        const isNewRecord = Utils.saveHighScore(this.score);
        this.ui.showResult(true, this.score, this.enemiesDefeated, this.elapsedTime, isNewRecord);
    }

    // ゲームオーバー処理
    handleGameOver() {
        this.state = GameState.GAME_OVER;
        this.ui.showResult(false, this.score, this.enemiesDefeated, this.elapsedTime, false);
    }

    // 描画処理
    render() {
        // 背景クリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景描画
        this.background.draw(this.ctx);

        // 敵描画
        this.enemyManager.draw(this.ctx);

        // プレイヤー描画
        this.player.draw(this.ctx);

        // スコアポップアップ描画
        this.ui.updateAndDrawPopups(this.ctx, 1 / 60);

        // 恵方インジケーター描画
        this.drawEhoIndicator();

        // チュートリアル描画
        if (this.showTutorial && this.tutorialTime > 0) {
            this.drawTutorial();
        }
    }

    // チュートリアル描画
    drawTutorial() {
        const ctx = this.ctx;
        const alpha = Math.min(1, this.tutorialTime / 0.5); // フェードアウト

        ctx.save();
        ctx.globalAlpha = alpha;

        // 背景
        const boxWidth = 320;
        const boxHeight = 90;
        const boxX = (this.canvas.width - boxWidth) / 2;
        const boxY = 80;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
        ctx.fill();
        ctx.stroke();

        // テキスト
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👁 にらみで撃退！', this.canvas.width / 2, boxY + 30);

        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText('泥棒の方向を向いて撃退しよう', this.canvas.width / 2, boxY + 52);
        ctx.fillStyle = '#ffa500';
        ctx.fillText('恵方を向くとボーナス！', this.canvas.width / 2, boxY + 70);

        ctx.restore();
    }

    // 恵方を向いているかチェック
    checkEhoDirection(deltaTime) {
        const playerAngleDeg = Utils.radToDeg(this.player.glareAngle);
        const ehoDeg = CONFIG.EHO_DIRECTION - 90; // 画面座標系に変換

        // 角度の差を計算（-180〜180の範囲に正規化）
        let diff = playerAngleDeg - ehoDeg;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        this.isFacingEho = Math.abs(diff) <= CONFIG.EHO_TOLERANCE;

        // 恵方を向いていたらスコア加算
        if (this.isFacingEho) {
            const ehoScore = Math.floor(CONFIG.SCORE_EHO_PER_SEC * deltaTime);
            if (ehoScore > 0) {
                this.score += ehoScore;
                this.ui.updateScore(this.score);
            }
        }
    }

    // 恵方インジケーター描画
    drawEhoIndicator() {
        const ctx = this.ctx;
        ctx.save();

        // 恵方の方向を示す矢印（画面端）
        const ehoAngle = Utils.degToRad(CONFIG.EHO_DIRECTION - 90);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const indicatorDist = Math.min(this.canvas.width, this.canvas.height) * 0.45;

        const indicatorX = centerX + Math.cos(ehoAngle) * indicatorDist;
        const indicatorY = centerY + Math.sin(ehoAngle) * indicatorDist;

        // 恵方を向いているかで色を変える
        if (this.isFacingEho) {
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#ffa500';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        }

        // 矢印を描画
        ctx.translate(indicatorX, indicatorY);
        ctx.rotate(ehoAngle);

        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.rotate(-ehoAngle);
        ctx.translate(-indicatorX, -indicatorY);

        // 「恵方」ラベル
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('恵方', indicatorX, indicatorY + 25);

        // 恵方ボーナス表示
        if (this.isFacingEho) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('+' + CONFIG.SCORE_EHO_PER_SEC + '/秒', indicatorX, indicatorY + 40);
        }

        ctx.restore();
    }
}
