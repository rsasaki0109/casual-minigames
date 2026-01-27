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

        // Canvas サイズ設定
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

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
        this.background = new Background(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 入力状態
        this.mouseX = CONFIG.CANVAS_WIDTH / 2;
        this.mouseY = CONFIG.CANVAS_HEIGHT / 2;

        // イベントリスナーの設定
        this.setupEventListeners();

        // 初期画面表示
        this.ui.updateTitleHighscore(Utils.loadHighScore());
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // マウス移動
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // マウスクリック
        this.canvas.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) {
                this.handleGlare();
            }
        });

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
        this.state = GameState.PLAYING;
        this.elapsedTime = 0;
        this.score = 0;
        this.combo = 1.0;
        this.lastDefeatTime = 0;
        this.enemiesDefeated = 0;
        this.lastEatingPercent = 100;

        // プレイヤーを中央に配置
        const playerX = CONFIG.CANVAS_WIDTH / 2;
        const playerY = CONFIG.CANVAS_HEIGHT / 2;
        this.player = new Player(playerX, playerY);

        // 敵マネージャーの初期化
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

        // コンボのリセット判定
        if (this.elapsedTime - this.lastDefeatTime > CONFIG.COMBO_TIME_LIMIT && this.combo > 1.0) {
            this.combo = 1.0;
            this.ui.updateCombo(this.combo);
        }

        // プレイヤー更新
        this.player.updateGlareDirection(this.mouseX, this.mouseY);
        this.player.update(deltaTime);

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
    }
}
