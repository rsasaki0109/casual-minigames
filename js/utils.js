// ゲーム定数
const CONFIG = {
    // Canvas設定
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 550,  // UIの高さ(50px)を引いた値

    // ゲームバランス定数
    GAME_DURATION: 60,           // クリアまでの秒数
    GLARE_COOLDOWN: 0.3,         // にらみのクールダウン秒数
    GLARE_ANGLE: 45,             // にらみの範囲角度（度）
    GLARE_RANGE: 150,            // にらみの届く距離（px）
    PLAYER_RADIUS: 20,           // プレイヤーの当たり判定半径
    ENEMY_RADIUS: 30,            // 泥棒の当たり判定半径

    // 恵方設定
    EHO_DIRECTION: 247.5,        // 2025年の恵方：西南西（度）
    EHO_TOLERANCE: 30,           // 恵方と判定される許容角度（±度）
    SCORE_EHO_PER_SEC: 30,       // 恵方を向いている間の1秒あたりのスコア

    // スコア設定
    SCORE_ENEMY_DEFEAT: 100,     // 泥棒撃退時の基本スコア
    SCORE_EATING: 50,            // 恵方巻1%食べるごとのスコア
    SCORE_CLEAR_BONUS: 5000,     // クリアボーナス
    COMBO_TIME_LIMIT: 2.0,       // 倍率維持の制限時間（秒）
    COMBO_INCREMENT: 0.5,        // 倍率増加量
    MAX_COMBO: 5.0,              // 最大倍率

    // 敵設定
    ENEMY_BASE_SPEED: 80,        // 初期移動速度 px/秒
    ENEMY_BASE_SPAWN_INTERVAL: 2.0,  // 初期出現間隔（秒）
    ENEMY_RETREAT_SPEED: 300,    // 撃退時の退場速度 px/秒
    MAX_ENEMIES: 8,              // 最大同時出現数

    // ハイスコア保存キー
    HIGHSCORE_KEY: 'ehomaki_highscore'
};

// 難易度設定（経過時間ごと）
const DIFFICULTY_STAGES = [
    { time: 0,  spawnInterval: 2.0, speed: 80,  maxEnemies: 2 },
    { time: 10, spawnInterval: 1.5, speed: 100, maxEnemies: 3 },
    { time: 20, spawnInterval: 1.2, speed: 120, maxEnemies: 4 },
    { time: 30, spawnInterval: 1.0, speed: 140, maxEnemies: 5 },
    { time: 45, spawnInterval: 0.8, speed: 160, maxEnemies: 6 },
    { time: 60, spawnInterval: 0.6, speed: 180, maxEnemies: 8 }
];

// ユーティリティ関数
const Utils = {
    // 度をラジアンに変換
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },

    // ラジアンを度に変換
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },

    // 2点間の距離を計算
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // 2点間の角度を計算（ラジアン）
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // 角度が範囲内かチェック（扇形判定用）
    isAngleInRange(angle, centerAngle, range) {
        // 角度を-PI～PIの範囲に正規化
        let diff = angle - centerAngle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        return Math.abs(diff) <= range / 2;
    },

    // ランダムな値を取得（min以上max未満）
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    // ランダムな整数を取得（min以上max以下）
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // 画面の端からランダムな出現位置を取得
    getRandomSpawnPosition(canvasWidth, canvasHeight, margin = 20) {
        const side = this.randomInt(0, 3); // 0:上, 1:右, 2:下, 3:左
        let x, y;

        switch (side) {
            case 0: // 上
                x = this.random(0, canvasWidth);
                y = -margin;
                break;
            case 1: // 右
                x = canvasWidth + margin;
                y = this.random(0, canvasHeight);
                break;
            case 2: // 下
                x = this.random(0, canvasWidth);
                y = canvasHeight + margin;
                break;
            case 3: // 左
                x = -margin;
                y = this.random(0, canvasHeight);
                break;
        }

        return { x, y, side };
    },

    // 現在の難易度設定を取得
    getDifficultyForTime(elapsedTime) {
        let difficulty = DIFFICULTY_STAGES[0];
        for (const stage of DIFFICULTY_STAGES) {
            if (elapsedTime >= stage.time) {
                difficulty = stage;
            } else {
                break;
            }
        }
        return difficulty;
    },

    // ハイスコアをロード
    loadHighScore() {
        const saved = localStorage.getItem(CONFIG.HIGHSCORE_KEY);
        return saved ? parseInt(saved, 10) : 0;
    },

    // ハイスコアをセーブ
    saveHighScore(score) {
        const current = this.loadHighScore();
        if (score > current) {
            localStorage.setItem(CONFIG.HIGHSCORE_KEY, score.toString());
            return true; // 新記録
        }
        return false;
    },

    // 数値を3桁カンマ区切りでフォーマット
    formatNumber(num) {
        return num.toLocaleString();
    },

    // 点が扇形の中にあるかチェック
    isPointInSector(px, py, cx, cy, radius, startAngle, endAngle) {
        const dist = this.distance(px, py, cx, cy);
        if (dist > radius) return false;

        const angle = this.angle(cx, cy, px, py);
        return this.isAngleInRange(angle, (startAngle + endAngle) / 2, endAngle - startAngle);
    }
};
