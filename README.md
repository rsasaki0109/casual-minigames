# Flying Carpet Runner

![Gameplay](gameplay.gif)

空飛ぶ絨毯で空を駆け抜ける横スクロール2Dゲームです。障害物を避けながら、できるだけ長く生き残り、糸を集めてハイスコアを目指しましょう！

## 遊び方

### 操作方法

**PC:**
- `W` / `↑` : 上昇
- `S` / `↓` : 下降
- `Space` : ブースト（加速）
- `P` : ポーズ
- `Enter` : リスタート

**スマホ/タブレット:**
- 画面タッチ/長押し : 上昇
- 離す : ゆっくり下降
- 右下の「BOOST」ボタン : ブースト
- 右下の「||」ボタン : ポーズ

### ゲームルール

- 右方向へ自動スクロールで進みます
- 障害物（鳥、気球、塔、雷雲）に当たるとゲームオーバー
- 金色の糸（アイテム）を集めるとスコアアップ
- 青い「WIND ZONE」に入ると一時的にスピードアップ
- 生存時間が長いほど速度が上がり、スコアも増加

### 障害物の種類

- **鳥** : 上下に波打つように飛行
- **気球** : ゆっくり浮遊
- **塔** : 地面から生えている固定障害物
- **雷雲** : 稲妻を放つ危険な雲

## ローカルでの起動方法

1. このリポジトリをクローン
   ```bash
   git clone https://github.com/yourusername/flying_carpet_runner.git
   cd flying_carpet_runner
   ```

2. ローカルサーバーを起動（以下のいずれか）
   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js (npx)
   npx serve .

   # PHP
   php -S localhost:8000
   ```

3. ブラウザで `http://localhost:8000` を開く

※ 単純に `index.html` をブラウザで直接開いても動作します。

## GitHub Pagesでの公開方法

1. GitHubにリポジトリを作成しプッシュ
2. リポジトリの「Settings」→「Pages」を開く
3. 「Source」で「Deploy from a branch」を選択
4. 「Branch」で「main」、フォルダで「/ (root)」を選択
5. 「Save」をクリック
6. 数分後、`https://yourusername.github.io/flying_carpet_runner/` でプレイ可能に

## 技術仕様

- **依存なし**: 外部ライブラリ・CDN不要
- **ビルド不要**: 静的ファイルのみで動作
- **レスポンシブ**: PC・スマホ両対応
- **Canvas 2D**: 60fps描画
- **ローカルストレージ**: ハイスコア保存

## ファイル構成

```
flying_carpet_runner/
├── index.html   # メインHTML
├── style.css    # スタイルシート
├── main.js      # ゲームロジック
├── README.md    # このファイル
└── gameplay.gif # ゲームプレイ動画
```

## ライセンス

MIT License
