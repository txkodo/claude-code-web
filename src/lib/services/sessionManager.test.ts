import { test, expect, mock } from 'bun:test';
import { SessionManagerImpl } from './sessionManager';

test('SessionManagerImpl creates session with unique ID', () => {
    const mockFactory = {
        createSession: mock().mockReturnValue({ id: 'mock-handler' })
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId = manager.createSession('/test/cwd');

    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
    expect(mockFactory.createSession).toHaveBeenCalledWith('/test/cwd', sessionId);
});

test('SessionManagerImpl stores and retrieves sessions', () => {
    const mockHandler = { id: 'mock-handler' };
    const mockFactory = {
        createSession: mock().mockReturnValue(mockHandler)
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId = manager.createSession('/test/cwd');
    const retrievedHandler = manager.getSessionById(sessionId);

    expect(retrievedHandler).toBe(mockHandler as any);
});

test('SessionManagerImpl returns null for non-existent session', () => {
    const mockFactory = {
        createSession: mock()
    };
    const manager = new SessionManagerImpl(mockFactory);

    const result = manager.getSessionById('non-existent-id');

    expect(result).toBeNull();
});

test('SessionManagerImpl lists all session IDs', () => {
    const mockFactory = {
        createSession: mock().mockReturnValue({ id: 'mock-handler' })
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId1 = manager.createSession('/test/cwd1');
    const sessionId2 = manager.createSession('/test/cwd2');
    const sessionList = manager.listSessions();

    expect(sessionList).toContain(sessionId1);
    expect(sessionList).toContain(sessionId2);
    expect(sessionList).toHaveLength(2);
});

test('SessionManagerImpl generates unique session IDs', () => {
    const mockFactory = {
        createSession: mock().mockReturnValue({ id: 'mock-handler' })
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId1 = manager.createSession('/test/cwd');
    const sessionId2 = manager.createSession('/test/cwd');

    expect(sessionId1).not.toBe(sessionId2);
});