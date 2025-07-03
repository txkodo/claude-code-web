import type { ApiRouter } from "$lib/server/api";
import { hc } from "hono/client";

// クライアント側では相対パスでHonoサーバーに接続
export const apiClient = hc<ApiRouter>('/api', { fetch });
