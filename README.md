# Claude Code Web App

BunとSvelteKitを使用したClaude Proプランユーザー向けのWebアプリケーションです。ローカルディレクトリを指定してClaude.aiと連携したコーディングができます。

## 機能

- ローカルディレクトリの選択（File System Access API対応）
- Claude.aiとの連携（コンテキスト情報付き）
- チャット履歴の管理
- レスポンシブなUI
- 設定の永続化（localStorage）

## セットアップ

1. 依存関係をインストール:
```bash
bun install
```

2. 開発サーバーを起動:
```bash
bun run dev
```

3. ブラウザで `http://localhost:5173` を開く

## 使用方法

1. 作業したいディレクトリを選択
2. Claudeに質問を入力
3. 「Claude.aiで送信」をクリック
4. 新しいタブでClaude.aiが開き、コンテキスト情報と共に質問が表示されます

## 必要な環境

- Bun 1.0+
- モダンブラウザ（File System Access API対応推奨）
- Claude Proプラン

## 技術スタック

- SvelteKit
- TypeScript
- Bun
- Vite