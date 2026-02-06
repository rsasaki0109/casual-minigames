// エントリーポイント
// DOM読み込み完了後にゲームを初期化

document.addEventListener('DOMContentLoaded', () => {
    // Canvasの取得
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // ゲームインスタンスの作成
    const game = new Game(canvas);

    // デバッグ用（開発時のみ）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.game = game;
        console.log('Game initialized. Debug mode enabled.');
        console.log('Access game instance via window.game');
    }

    // 右クリックメニュー無効化（ゲーム中の誤操作防止）
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // フォーカス管理（タブ切り替え時の一時停止）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === GameState.PLAYING) {
            game.pause();
        }
    });

    // ウィンドウフォーカス喪失時の一時停止
    window.addEventListener('blur', () => {
        if (game.state === GameState.PLAYING) {
            game.pause();
        }
    });
});
