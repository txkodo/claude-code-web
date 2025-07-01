import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from './sessionManager';
import { ClaudeCodeHandler } from './claudeCodeHandler';

// Mock the Claude Code SDK
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn()
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('generateId', () => {
    it('should generate unique session IDs', () => {
      const id1 = sessionManager.generateId();
      const id2 = sessionManager.generateId();
      
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createHandler', () => {
    it('should create a new handler with generated ID', () => {
      const result = sessionManager.createHandler();
      
      expect(result.id).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(result.handler).toBeInstanceOf(ClaudeCodeHandler);
      expect(sessionManager.getSessionCount()).toBe(1);
    });

    it('should create a new handler with provided ID', () => {
      const customId = 'custom-session-123';
      const result = sessionManager.createHandler(customId);
      
      expect(result.id).toBe(customId);
      expect(result.handler).toBeInstanceOf(ClaudeCodeHandler);
      expect(sessionManager.getSessionCount()).toBe(1);
    });

    it('should throw error when creating handler with existing ID', () => {
      const sessionId = 'duplicate-session';
      sessionManager.createHandler(sessionId);
      
      expect(() => {
        sessionManager.createHandler(sessionId);
      }).toThrow(`Session with id '${sessionId}' already exists`);
    });

    it('should set creation and last accessed times', () => {
      const beforeCreate = new Date();
      const result = sessionManager.createHandler();
      const afterCreate = new Date();
      
      const sessionInfo = sessionManager.getSessionInfo(result.id);
      
      expect(sessionInfo).not.toBeNull();
      expect(sessionInfo!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(sessionInfo!.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(sessionInfo!.lastAccessedAt.getTime()).toEqual(sessionInfo!.createdAt.getTime());
    });
  });

  describe('getHandlerById', () => {
    it('should return handler for existing session', () => {
      const { id, handler } = sessionManager.createHandler();
      
      const retrievedHandler = sessionManager.getHandlerById(id);
      
      expect(retrievedHandler).toBe(handler);
    });

    it('should return null for non-existing session', () => {
      const handler = sessionManager.getHandlerById('non-existing-id');
      
      expect(handler).toBeNull();
    });

    it('should update last accessed time when retrieving handler', async () => {
      const { id } = sessionManager.createHandler();
      const originalSessionInfo = sessionManager.getSessionInfo(id);
      const originalLastAccessed = originalSessionInfo!.lastAccessedAt;
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      sessionManager.getHandlerById(id);
      
      const updatedSessionInfo = sessionManager.getSessionInfo(id);
      expect(updatedSessionInfo!.lastAccessedAt.getTime()).toBeGreaterThan(originalLastAccessed.getTime());
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info for existing session', () => {
      const { id, handler } = sessionManager.createHandler();
      
      const sessionInfo = sessionManager.getSessionInfo(id);
      
      expect(sessionInfo).not.toBeNull();
      expect(sessionInfo!.id).toBe(id);
      expect(sessionInfo!.handler).toBe(handler);
      expect(sessionInfo!.createdAt).toBeInstanceOf(Date);
      expect(sessionInfo!.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existing session', () => {
      const sessionInfo = sessionManager.getSessionInfo('non-existing-id');
      
      expect(sessionInfo).toBeNull();
    });
  });

  describe('removeSession', () => {
    it('should remove existing session and clean up handler', () => {
      const { id, handler } = sessionManager.createHandler();
      const clearSpy = vi.spyOn(handler, 'clear');
      
      const result = sessionManager.removeSession(id);
      
      expect(result).toBe(true);
      expect(sessionManager.getHandlerById(id)).toBeNull();
      expect(sessionManager.getSessionCount()).toBe(0);
      expect(clearSpy).toHaveBeenCalledOnce();
    });

    it('should return false for non-existing session', () => {
      const result = sessionManager.removeSession('non-existing-id');
      
      expect(result).toBe(false);
    });
  });

  describe('getAllSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = sessionManager.getAllSessions();
      
      expect(sessions).toEqual([]);
    });

    it('should return all session info', () => {
      const session1 = sessionManager.createHandler();
      const session2 = sessionManager.createHandler();
      
      const sessions = sessionManager.getAllSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain(session1.id);
      expect(sessions.map(s => s.id)).toContain(session2.id);
    });
  });

  describe('getSessionCount', () => {
    it('should return correct session count', () => {
      expect(sessionManager.getSessionCount()).toBe(0);
      
      sessionManager.createHandler();
      expect(sessionManager.getSessionCount()).toBe(1);
      
      sessionManager.createHandler();
      expect(sessionManager.getSessionCount()).toBe(2);
      
      const sessions = sessionManager.getAllSessions();
      sessionManager.removeSession(sessions[0].id);
      expect(sessionManager.getSessionCount()).toBe(1);
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions and clean up handlers', () => {
      const session1 = sessionManager.createHandler();
      const session2 = sessionManager.createHandler();
      
      const clearSpy1 = vi.spyOn(session1.handler, 'clear');
      const clearSpy2 = vi.spyOn(session2.handler, 'clear');
      
      sessionManager.clearAllSessions();
      
      expect(sessionManager.getSessionCount()).toBe(0);
      expect(sessionManager.getAllSessions()).toEqual([]);
      expect(clearSpy1).toHaveBeenCalledOnce();
      expect(clearSpy2).toHaveBeenCalledOnce();
    });
  });

  describe('integration with ClaudeCodeHandler', () => {
    it('should create handlers that work independently', () => {
      const session1 = sessionManager.createHandler();
      const session2 = sessionManager.createHandler();
      
      session1.handler.setSessionId('claude-session-1');
      session2.handler.setSessionId('claude-session-2');
      
      expect(session1.handler.getSessionId()).toBe('claude-session-1');
      expect(session2.handler.getSessionId()).toBe('claude-session-2');
    });

    it('should maintain separate event listeners for different handlers', () => {
      const session1 = sessionManager.createHandler();
      const session2 = sessionManager.createHandler();
      
      const events1: any[] = [];
      const events2: any[] = [];
      
      const unsubscribe1 = session1.handler.listen((event) => events1.push(event));
      const unsubscribe2 = session2.handler.listen((event) => events2.push(event));
      
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      
      // Test that unsubscribing from one doesn't affect the other
      const result1 = unsubscribe1();
      const result2 = unsubscribe2();
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});