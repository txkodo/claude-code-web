import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeCodeHandler } from './claudeCodeHandler';
import type { ClaudeCodeEvent, UnsubscribeFunction } from './claudeCodeHandler';

// Mock the Claude Code SDK
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn()
}));

import { query } from '@anthropic-ai/claude-code';

describe('ClaudeCodeHandler', () => {
  let handler: ClaudeCodeHandler;
  let mockEvents: ClaudeCodeEvent[];

  beforeEach(() => {
    handler = new ClaudeCodeHandler();
    mockEvents = [];
    handler.listen((event) => {
      mockEvents.push(event);
    });
    vi.clearAllMocks();
  });

  describe('session management', () => {
    it('should initialize with null session ID', () => {
      expect(handler.getSessionId()).toBeNull();
    });

    it('should set and get session ID', () => {
      const sessionId = 'test-session-123';
      handler.setSessionId(sessionId);
      expect(handler.getSessionId()).toBe(sessionId);
    });

    it('should initialize with provided session ID', () => {
      const sessionId = 'initial-session-456';
      const handlerWithSession = new ClaudeCodeHandler(sessionId);
      expect(handlerWithSession.getSessionId()).toBe(sessionId);
    });
  });

  describe('event listeners', () => {
    it('should register multiple event listeners', () => {
      const events1: ClaudeCodeEvent[] = [];
      const events2: ClaudeCodeEvent[] = [];

      const unsubscribe1 = handler.listen((event) => events1.push(event));
      const unsubscribe2 = handler.listen((event) => events2.push(event));

      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');

      // Mock a simple query response
      const mockMessages = [
        { type: 'assistant', content: 'Hello' }
      ];
      
      vi.mocked(query).mockImplementation(async function* () {
        yield mockMessages[0];
      });

      return handler.send('test message').then(() => {
        expect(events1.length).toBeGreaterThan(0);
        expect(events2.length).toBeGreaterThan(0);
        expect(events1.length).toBe(events2.length);
      });
    });

    it('should unsubscribe event listeners', () => {
      const events: ClaudeCodeEvent[] = [];
      const unsubscribe = handler.listen((event) => events.push(event));

      // Test successful unsubscribe
      const result = unsubscribe();
      expect(result).toBe(true);

      // Test unsubscribe of already removed listener
      const result2 = unsubscribe();
      expect(result2).toBe(false);
    });
  });

  describe('send method', () => {
    it('should fail if request is already in progress', async () => {
      vi.mocked(query).mockImplementation(async function* () {
        // Simulate a long-running request
        await new Promise(resolve => setTimeout(resolve, 100));
        yield { type: 'assistant', content: 'Response' };
      });

      const firstSend = handler.send('first message');
      
      // Try to send another message while first is in progress
      await expect(handler.send('second message')).rejects.toThrow(
        'A request is already in progress. Abort the current request before sending a new one.'
      );

      await firstSend;
    });

    it('should send message and emit events', async () => {
      const mockMessages = [
        { type: 'assistant', content: 'Test response' }
      ];

      vi.mocked(query).mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      await handler.send('test message');

      expect(mockEvents.length).toBe(2); // message + complete
      expect(mockEvents[0].type).toBe('message');
      expect(mockEvents[0].data).toEqual(mockMessages[0]);
      expect(mockEvents[1].type).toBe('complete');
      expect(mockEvents[1].messages).toEqual(mockMessages);
    });

    it('should update session ID from system message', async () => {
      const mockMessages = [
        { type: 'system', session_id: 'new-session-789' },
        { type: 'assistant', content: 'Response' }
      ];

      vi.mocked(query).mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message;
        }
      });

      await handler.send('test message');

      expect(handler.getSessionId()).toBe('new-session-789');
    });

    it('should handle errors and emit error event', async () => {
      const errorMessage = 'Test error';
      vi.mocked(query).mockImplementation(async function* () {
        throw new Error(errorMessage);
      });

      await handler.send('test message');

      expect(mockEvents.some(event => event.type === 'error')).toBe(true);
      const errorEvent = mockEvents.find(event => event.type === 'error');
      expect(errorEvent?.error).toBe(errorMessage);
    });

    it('should handle abort error specifically', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      
      vi.mocked(query).mockImplementation(async function* () {
        throw abortError;
      });

      await handler.send('test message');

      const errorEvent = mockEvents.find(event => event.type === 'error');
      expect(errorEvent?.error).toBe('Request aborted');
    });
  });

  describe('abort method', () => {
    it('should abort ongoing request', async () => {
      let abortCalled = false;
      
      vi.mocked(query).mockImplementation(async function* ({ abortController }) {
        // Simulate a long-running request that can be aborted
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve(undefined), 1000);
          abortController?.signal.addEventListener('abort', () => {
            abortCalled = true;
            clearTimeout(timeout);
            const error = new Error('Request aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
        yield { type: 'assistant', content: 'Should not reach here' };
      });

      const sendPromise = handler.send('test message');
      
      // Abort after a short delay
      setTimeout(() => handler.abort(), 10);
      
      await sendPromise;

      // Should have received an error event and abort should have been called
      expect(abortCalled).toBe(true);
      expect(mockEvents.some(event => event.type === 'error')).toBe(true);
    });
  });

  describe('clear method', () => {
    it('should clear session and listeners', async () => {
      handler.setSessionId('test-session');
      
      // Add an event listener
      const testEvents: ClaudeCodeEvent[] = [];
      const unsubscribe = handler.listen((event) => testEvents.push(event));
      
      handler.clear();

      expect(handler.getSessionId()).toBeNull();
      
      // Test that listeners are cleared by trying to unsubscribe
      const result = unsubscribe();
      expect(result).toBe(false); // Should return false since listeners were cleared
      
      // Test that listeners are cleared by sending a message after clear
      vi.mocked(query).mockImplementation(async function* () {
        yield { type: 'assistant', content: 'Test' };
      });
      
      await handler.send('test');
      
      // testEvents should be empty since listeners were cleared
      expect(testEvents.length).toBe(0);
    });
  });
});