import { serve } from "bun";
import { Hono } from "hono";
import { createBunWebSocket } from 'hono/bun';
import { apiRouter } from "./src/lib/server/api";
import { readFileSync } from 'fs';

const port = 3001;
const svelteKitUrl = "http://localhost:5173";

const { websocket } = createBunWebSocket();

// グローバルエラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // サーバーを落とさずにエラーをログに記録
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // サーバーを落とさずにエラーをログに記録
});

// Honoアプリ（プロキシ機能付き）
const honoApp = new Hono()
  // APIルートはそのまま処理（WebSocketも含む）
  .route('/api', apiRouter)
  // その他のリクエストはSvelteKitにプロキシ
  .all('*', async (c) => {
    const url = new URL(c.req.url);
    const proxyUrl = `${svelteKitUrl}${url.pathname}${url.search}`;

    return fetch(proxyUrl, {
      method: c.req.method,
      headers: c.req.header(),
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.arrayBuffer() : undefined,
    });
  });

serve({ 
  port, 
  hostname: "0.0.0.0",
  fetch: honoApp.fetch, 
  websocket,
  tls: {
    cert: readFileSync("certs/cert.pem"),
    key: readFileSync("certs/key.pem"),
  }
});

console.log(`Hono server with WebSocket running on https://0.0.0.0:${port}`);
console.log(`Access via: https://192.168.1.52:${port}`);
console.log(`Proxying to SvelteKit at ${svelteKitUrl}`);