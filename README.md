# Claude Code Web App

BunとSvelteKitを使用したClaude Code SDKのWebアプリケーションです。ローカルディレクトリを指定してClaude Code SDKと対話的にコーディングができます。

## 機能

- ローカルディレクトリの選択（File System Access API対応）
- Claude Code SDKとのリアルタイムチャット
- ストリーミングレスポンス対応
- AbortControllerによるリクエストキャンセル機能
- レスポンシブなUI
- 設定の永続化（localStorage）

## セットアップ

1. 依存関係をインストール:
```bash
bun install
```

2. 環境変数を設定:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

3. 開発サーバーを起動:
```bash
bun run dev
```

4. ブラウザで `http://localhost:5173` を開く

## 使用方法

1. 作業したいディレクトリを選択
2. Claudeに質問を入力
3. Claude Code SDKがリアルタイムで応答

## 必要な環境

- Bun 1.0+
- モダンブラウザ（File System Access API対応推奨）
- Anthropic API Key

## 技術スタック

- SvelteKit
- TypeScript
- Claude Code SDK (@anthropic-ai/claude-code)
- Bun
- Vite