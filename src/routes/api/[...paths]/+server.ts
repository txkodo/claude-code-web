// src/routes/api/[...paths]/+server.ts
import { app } from '$lib/api';
import type { RequestHandler } from '@sveltejs/kit';

// 利用するメソッドを全て定義しておく
export const GET: RequestHandler = ({ request }) => app.fetch(request);
export const POST: RequestHandler = ({ request }) => app.fetch(request);
export const DELETE: RequestHandler = ({ request }) => app.fetch(request);