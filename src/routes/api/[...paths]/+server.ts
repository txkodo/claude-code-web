import { app } from '$lib/server/api';
import type { RequestHandler } from '@sveltejs/kit';

console.log('API server initialized');

export const GET: RequestHandler = ({ request }) => app.fetch(request);
export const POST: RequestHandler = ({ request }) => app.fetch(request);
export const DELETE: RequestHandler = ({ request }) => app.fetch(request);