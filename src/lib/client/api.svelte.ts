import type { ApiRouter } from "$lib/server/api";
import { hc } from "hono/client";

export const apiClient = hc<ApiRouter>('/api', { fetch });
