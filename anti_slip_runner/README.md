# Anti-Slip Runner

「滑って転ばない」ことを目的としたミニゲーム。

![Preview](docs/preview.gif)

## ゲーム概要

プレイヤーは自動で前進し、左右移動のみで操作します。
摩擦係数に応じた滑りやすさの中で、バランスを保ちながらできるだけ長く走り続けることが目標です。

### ステージ

| ステージ | 摩擦係数 | 特徴 |
|---------|---------|------|
| **ROLLER SKATE** | 0.35 | チュートリアル兼ウォームアップ。慣性あり、止まりにくいが操作は可能。軌跡は黒色（タイヤ跡）。 |
| **ICE** | 0.15 | 非常に曲がりにくく、減速が効かない。ヒビ割れ氷・スピードライン・スパイク靴アイテムあり。軌跡は白色。 |

### ゲームシステム

- **バランスゲージ**: 急旋回や低摩擦状態で減少。0になると転倒してゲームオーバー
- **スコア**: 生存時間と移動距離で計算
- **アイテム** (ICEステージ): スパイク靴を取得すると10秒間摩擦係数+0.2

## 操作方法

### PC
- **← →** または **A / D** キーで左右移動

### スマホ
- 画面の**左半分タップ**で左移動
- 画面の**右半分タップ**で右移動
- **スワイプ**でも移動可能

## ローカル実行方法

### 方法1: ファイルを直接開く

```bash
# ブラウザでindex.htmlを開く
open docs/index.html
# または
xdg-open docs/index.html  # Linux
```

### 方法2: ローカルサーバーで配信

```bash
# npm パッケージをインストール
npm install

# ローカルサーバーを起動
npm run serve

# ブラウザで http://localhost:3000 にアクセス
```

### 方法3: Python HTTPサーバー

```bash
cd docs
python -m http.server 3000

# ブラウザで http://localhost:3000 にアクセス
```

## GitHub Pages 公開方法

### 1. リポジトリの設定

1. GitHubでリポジトリを作成
2. コードをpush

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/anti-slip-runner.git
git push -u origin main
```

### 2. GitHub Pages の有効化

1. リポジトリの **Settings** → **Pages** に移動
2. **Source** で「GitHub Actions」を選択
3. pushすると自動でデプロイされる

### 3. 公開URL

デプロイ完了後、以下のURLでアクセス可能:

```
https://YOUR_USERNAME.github.io/anti-slip-runner/
```

## Playwright で GIF を生成する手順

### 1. 依存パッケージのインストール

```bash
# Node.js パッケージをインストール
npm install

# Playwright ブラウザをインストール
npx playwright install chromium
```

### 2. ffmpeg のインストール

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (chocolatey)
choco install ffmpeg
```

### 3. キャプチャとGIF生成

```bash
# ゲームプレイを録画
npm run capture

# WebM を GIF に変換
npm run gif

# または一括実行
npm run preview
```

生成されたGIFは `docs/preview.gif` に保存されます。

### カスタマイズ

`scripts/playwright_capture.js` を編集することで以下を変更できます:

- 録画時間 (`playDuration`)
- 画面サイズ (`viewport`)
- 選択するステージ (`#stage-roller` or `#stage-ice`)
- 操作パターン

## プロジェクト構成

```
/docs
  ├── index.html      # メインHTML
  ├── style.css       # スタイルシート
  ├── game.js         # ゲームロジック
  └── preview.gif     # プレビューGIF

/scripts
  └── playwright_capture.js  # 録画スクリプト

/recordings
  └── gameplay.webm   # 録画された動画

/.github/workflows
  └── deploy.yml      # GitHub Pages デプロイ設定

README.md
package.json
```

## 技術仕様

- **フレームワーク**: なし (Vanilla HTML/CSS/JavaScript)
- **描画**: Canvas 2D API
- **ビルド**: 不要
- **対応端末**: PC / スマホ

## ライセンス

MIT License
