import { json } from '@sveltejs/kit';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { getSession, updateSessionClaudeId, incrementMessageCount } from '$lib/sessionManager';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	console.log('Claude API endpoint called');
	
	try {
		const { prompt, directory, sessionId } = await request.json();
		console.log('Request data:', { 
			prompt: prompt?.substring(0, 100) + '...', 
			directory, 
			sessionId 
		});

		if (!prompt) {
			console.error('Missing required fields:', { prompt: !!prompt });
			return json({ error: 'Missing prompt' }, { status: 400 });
		}

		let workingDirectory = directory;
		let session = null;

		// If sessionId is provided, get session info
		if (sessionId) {
			session = getSession(sessionId);
			if (session) {
				workingDirectory = session.cwd;
				console.log('Using session directory:', workingDirectory);
			} else {
				console.warn('Session not found:', sessionId);
			}
		}

		if (!workingDirectory) {
			console.error('No working directory available');
			return json({ error: 'Missing directory or session' }, { status: 400 });
		}

		const messages: SDKMessage[] = [];
		const fullPrompt = `You are Claude Code, a helpful AI assistant for software development.
Working directory: ${workingDirectory}

${prompt}`;
		
		console.log('Starting Claude Code SDK query...');
		
		// Use AbortController for timeout
		const abortController = new AbortController();
		const timeout = setTimeout(() => {
			console.log('Query timeout reached');
			abortController.abort();
		}, 30000); // 30 second timeout

		try {
			let messageCount = 0;
			
			// Claude Code SDK query - use simple structure for now
			for await (const message of query({
				prompt: fullPrompt,
				abortController,
				options: {
					maxTurns: 3,
				},
			})) {
				messageCount++;
				console.log(`Received message ${messageCount}:`, { 
					type: message.type, 
					contentLength: message.content?.length,
					content: message.content,
					fullMessage: message 
				});
				messages.push(message);
			}
			
			clearTimeout(timeout);
			console.log(`Query completed. Total messages: ${messages.length}`);
			
			// Update session with Claude session ID if available
			if (sessionId && messages.length > 0) {
				const systemMessage = messages.find(m => m.type === 'system');
				if (systemMessage?.session_id && (!session?.claudeSessionId || session.claudeSessionId !== systemMessage.session_id)) {
					updateSessionClaudeId(sessionId, systemMessage.session_id);
					console.log('Updated session with Claude session ID:', systemMessage.session_id);
				}
				
				// Increment message count
				incrementMessageCount(sessionId);
			}
			
			console.log('All messages:', messages.map(m => ({ type: m.type, content: m.content, keys: Object.keys(m) })));

			if (messages.length === 0) {
				console.warn('No messages received from Claude');
				return json({ 
					error: 'No response generated',
					messages: []
				}, { status: 500 });
			}

			return json({ 
				success: true, 
				messages: messages 
			});

		} catch (error) {
			clearTimeout(timeout);
			console.error('Claude Code SDK query error:', error);
			
			if (error instanceof Error && error.name === 'AbortError') {
				return json({ error: 'Request timeout' }, { status: 408 });
			}
			throw error;
		}

	} catch (error) {
		console.error('Claude Code SDK API error:', error);
		return json({ 
			error: 'Failed to process request with Claude Code SDK',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};