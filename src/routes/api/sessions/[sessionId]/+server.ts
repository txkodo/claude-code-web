import { json } from '@sveltejs/kit';
import { getSession, deleteSession } from '$lib/sessionManager';
import type { RequestHandler } from './$types';

// GET /api/sessions/[sessionId] - Get specific session
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { sessionId } = params;
		const session = getSession(sessionId);
		
		if (!session) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		return json(session);
	} catch (error) {
		console.error('Failed to get session:', error);
		return json({ error: 'Failed to get session' }, { status: 500 });
	}
};

// DELETE /api/sessions/[sessionId] - Delete session
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { sessionId } = params;
		const success = deleteSession(sessionId);
		
		if (!success) {
			return json({ error: 'Session not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete session:', error);
		return json({ error: 'Failed to delete session' }, { status: 500 });
	}
};