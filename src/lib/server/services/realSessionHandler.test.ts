import { test, expect, mock } from 'bun:test';
import { RealSessionHandler, RealSessionHandlerFactory } from './realSessionHandler';
import type { CodingAgent, CodingAgentFactory } from '$lib/server/domain';
import { sleep } from 'bun';

test('RealSessionHandlerが正しいセッションIDを返す', () => {
    const mockAgent = {
        process: mock(),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent,
        cwd: '/test/path'
    });

    expect(handler.sessionId()).toBe('test-session-id');
});

test('RealSessionHandlerがビジー時にエラーを返す', async () => {
    const mockAgent = {
        process: mock().mockReturnValue((async function* () {
            yield { type: 'assistant_message', msgId: crypto.randomUUID(), content: 'test' };
            await sleep(10);
        })()),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent,
        cwd: '/test/path'
    });

    const message = 'test message';

    // 最初の呼び出しは処理を開始する
    expect(await handler.pushMessage(message)).toBeUndefined();

    // ビジー中の2回目の呼び出しはエラーを返す
    expect(await handler.pushMessage(message)).toBeInstanceOf(Error);

    // 処理終わったはず
    await sleep(20);
    expect(await handler.pushMessage(message)).toBeUndefined();
});

test('RealSessionHandlerがメッセージを処理してイベントを発行する', async () => {
    const mockAgent = {
        process: mock().mockReturnValue((async function* () {
            yield { type: 'assistant_message', msgId: crypto.randomUUID(), content: 'test message' };
        })()),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent,
        cwd: '/test/path'
    });

    const events: any[] = [];
    handler.listenEvent((event) => {
        events.push(event);
    });

    const message = 'test message';
    await handler.pushMessage(message);

    // 非同期処理を少し待つ
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('push_message');
    expect(events[1].type).toBe('push_message');
    expect(events[1].message).toHaveProperty('msgId');
    expect(events[1].message.content).toBe('test message');
});

test('RealSessionHandlerのイベントリスナー登録解除が動作する', async () => {
    const mockAgent = {
        process: mock().mockReturnValue((async function* () {
            yield { type: 'assistant_message', msgId: crypto.randomUUID(), content: 'message1' };
            yield { type: 'assistant_message', msgId: crypto.randomUUID(), content: 'message2' };
        })()),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent,
        cwd: '/test/path'
    });

    const events: any[] = [];
    const { unsubscribe } = handler.listenEvent((event) => {
        events.push(event);
        if (events.length === 1) {
            // 最初のイベント後に登録解除
            unsubscribe();
        }
    });

    const message = 'test message';
    await handler.pushMessage(message);

    // 非同期処理を待つ
    await new Promise(resolve => setTimeout(resolve, 20));

    // 登録解除により最初のイベントのみ受信する
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('push_message');
});

test('RealSessionHandlerの承認フローがapproval_messageを発行する', async () => {
    const mockAgent = {
        process: mock().mockImplementation(({ permitAction }) => {
            return (async function* () {
                // 承認リクエストをトリガー
                const result = await permitAction({ action: 'test' });
                yield { type: 'assistant_message', msgId: crypto.randomUUID(), content: JSON.stringify(result) };
            })();
        }),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent,
        cwd: '/test/path'
    });

    const events: any[] = [];
    handler.listenEvent((event) => {
        events.push(event);
    });

    const message = 'test message';
    await handler.pushMessage(message);

    await sleep(10);

    // 承認リクエストが発行されている
    const askApprovalEvent = events.find(e => e.type === 'push_message' && e.message.type === 'approval_message');
    expect(askApprovalEvent).toBeDefined();
    expect(askApprovalEvent.message.request).toEqual({ action: 'test' });
    expect(askApprovalEvent.message.approvalId).toBeDefined();

    // 承認イベントを発行
    handler.answerApproval(askApprovalEvent.message.approvalId, { behavior: "allow", updatedInput: { foo: "bar" } });
    await sleep(10)

    // 処理が終わっている
    expect(events[events.length - 1]).toEqual({
        type: 'push_message',
        sessionId: 'test-session-id',
        message: {
            type: 'assistant_message',
            msgId: expect.any(String),
            content: '{"behavior":"allow","updatedInput":{"foo":"bar"}}'
        }
    });
});

test('RealSessionHandlerのcloseメソッドが動作する', async () => {
    const mockAgent = {
        process: mock(),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent,
        cwd: '/test/path'
    });

    const result = await handler.close();
    expect(result).toBeUndefined();
});

test('RealSessionHandlerFactoryがRealSessionHandlerを作成する', () => {
    const mockAgent = {
        process: mock(),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const mockAgentFactory = {
        createAgent: mock().mockReturnValue(mockAgent)
    } as CodingAgentFactory;

    const factory = new RealSessionHandlerFactory(mockAgentFactory);
    const handler = factory.createSession('/test/cwd', 'test-id');

    expect(handler).toBeInstanceOf(RealSessionHandler);
    expect(handler.sessionId()).toBe('test-id');
    expect(mockAgentFactory.createAgent).toHaveBeenCalledWith('/test/cwd');
});