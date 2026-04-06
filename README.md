# VVTalkBox

VOICEVOX を利用した、シンプルなインスタントテキスト読み上げアプリケーションです。

![](./docs/screenshot.webp)

## 実行方法

### 開発環境

**Rust Nightly** と **Node.js** が必要です。pnpm は必須要件ではありません。

フロントエンド (Vite) とバックエンド (Felty + Axum) を別々に起動します。

```sh
# フロントエンドの起動
pnpm run dev

# 別のターミナルでバックエンドを起動
cd src-felty
cargo run
```

### ビルド方法

以下のコマンドを実行すると、フロントエンドのビルドと、バックエンドのリリースビルド（フロントエンドをバイナリに同梱）を一括で行います。

```sh
pnpm run build
```

ビルドされた実行ファイルは `src-felty/target/release/vvtalkbox.exe` に生成されます。

