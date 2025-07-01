# Claude Code Web App

Bunとsvelitekitを使用したClaude Code SDKのWebアプリケーションです。ローカルディレクトリを指定してClaudeと対話的にコーディングができます。

## 機能

- ローカルディレクトリの選択（File System Access API対応）
- Claude APIとのリアルタイムチャット
- AbortControllerによるリクエストキャンセル機能
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

1. Anthropic API Keyを入力
2. 作業したいディレクトリを選択
3. Claudeとチャットを開始

## 必要な環境

- Bun 1.0+
- モダンブラウザ（File System Access API対応推奨）
- Anthropic API Key

## 技術スタック

- SvelteKit
- TypeScript  
- Anthropic SDK
- Bun
- Vite
