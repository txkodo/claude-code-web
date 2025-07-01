import { json } from '@sveltejs/kit';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	console.log('Claude API endpoint called');
	
	try {
		const { prompt, directory } = await request.json();
		console.log('Request data:', { prompt: prompt?.substring(0, 100) + '...', directory });

		if (!prompt || !directory) {
			console.error('Missing required fields:', { prompt: !!prompt, directory: !!directory });
			return json({ error: 'Missing prompt or directory' }, { status: 400 });
		}

		const messages: SDKMessage[] = [];
		const fullPrompt = `You are Claude Code, a helpful AI assistant for software development.
Working directory: ${directory}

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
			
			console.log('All messages:', messages.map(m => ({ type: m.type, content: m.content, keys: Object.keys(m) })));

			// Extract content from Claude Code SDK response
			let textContent = '';
			
			// Priority 1: Use result type message if available (most reliable)
			const resultMessage = messages.find(msg => msg.type === 'result' && msg.result);
			if (resultMessage) {
				textContent = resultMessage.result;
				console.log('Using result message content');
			} else {
				// Priority 2: Use assistant type message
				const assistantMessage = messages.find(msg => msg.type === 'assistant' && msg.message);
				if (assistantMessage && Array.isArray(assistantMessage.message.content)) {
					for (const contentItem of assistantMessage.message.content) {
						if (contentItem.type === 'text' && contentItem.text) {
							textContent += contentItem.text;
						}
					}
					console.log('Using assistant message content');
				} else {
					// Priority 3: Use any direct text content
					for (const message of messages) {
						if (message.type === 'text' && typeof message.content === 'string') {
							textContent += message.content;
						}
					}
					console.log('Using direct text content');
				}
			}

			console.log('Final extracted text content length:', textContent.length);

			if (!textContent.trim()) {
				console.warn('No text content extracted from messages after trying all methods');
				return json({ 
					error: 'No response generated',
					details: `Received ${messages.length} messages but no text content. Message types: ${messages.map(m => m.type).join(', ')}`,
					messages: messages,
					debug: {
						messageCount: messages.length,
						messageTypes: messages.map(m => m.type),
						messageKeys: messages.map(m => Object.keys(m))
					}
				}, { status: 500 });
			}

			return json({ 
				success: true, 
				content: textContent,
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