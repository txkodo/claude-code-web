import { test, expect, mock } from 'bun:test';
import { SessionManagerImpl } from './sessionManager';

test('SessionManagerImplが一意のIDでセッションを作成する', () => {
    const mockFactory = {
        createSession: mock().mockReturnValue({ id: 'mock-handler' })
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId = manager.createSession('/test/cwd');

    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
    expect(mockFactory.createSession).toHaveBeenCalledWith('/test/cwd', sessionId);
});

test('SessionManagerImplがセッションを保存・取得する', () => {
    const mockHandler = { id: 'mock-handler' };
    const mockFactory = {
        createSession: mock().mockReturnValue(mockHandler)
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId = manager.createSession('/test/cwd');
    const retrievedHandler = manager.getSessionById(sessionId);

    expect(retrievedHandler).toBe(mockHandler as any);
});

test('SessionManagerImplが存在しないセッションでnullを返す', () => {
    const mockFactory = {
        createSession: mock()
    };
    const manager = new SessionManagerImpl(mockFactory);

    const result = manager.getSessionById('non-existent-id');

    expect(result).toBeNull();
});

test('SessionManagerImplが全セッションIDをリスト表示する', () => {
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

test('SessionManagerImplが一意のセッションIDを生成する', () => {
    const mockFactory = {
        createSession: mock().mockReturnValue({ id: 'mock-handler' })
    };
    const manager = new SessionManagerImpl(mockFactory);

    const sessionId1 = manager.createSession('/test/cwd');
    const sessionId2 = manager.createSession('/test/cwd');

    expect(sessionId1).not.toBe(sessionId2);
});