import { json } from '@sveltejs/kit';
import { getAllSessions, createSession } from '$lib/sessionManager';
import type { RequestHandler } from './$types';

// GET /api/sessions - Get all sessions
export const GET: RequestHandler = async () => {
	try {
		const sessions = getAllSessions();
		return json(sessions);
	} catch (error) {
		console.error('Failed to get sessions:', error);
		return json({ error: 'Failed to get sessions' }, { status: 500 });
	}
};

// POST /api/sessions - Create new session
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, cwd } = await request.json();

		if (!name || !cwd) {
			return json({ error: 'Name and cwd are required' }, { status: 400 });
		}

		const session = createSession(name, cwd);
		return json(session, { status: 201 });
	} catch (error) {
		console.error('Failed to create session:', error);
		return json({ error: 'Failed to create session' }, { status: 500 });
	}
};