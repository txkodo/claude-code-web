import { test, expect, mock } from 'bun:test';
import { RealSessionHandler, RealSessionHandlerFactory } from './realSessionHandler';
import type { CodingAgent, CodingAgentFactory, UserMessage } from '$lib/domain';

test('RealSessionHandler returns correct session ID', () => {
    const mockAgent = {
        process: mock(),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent
    });

    expect(handler.sessionId()).toBe('test-session-id');
});

test('RealSessionHandler returns error when busy', async () => {
    const mockAgent = {
        process: mock().mockReturnValue((async function* () {
            yield { type: 'test', content: 'test' };
        })()),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent
    });

    const message: UserMessage = { msgId: crypto.randomUUID(), content: 'test message' };
    
    // First call should start processing
    const result1 = await handler.pushMessage(message);
    
    // Second call while busy should return error
    const result2 = await handler.pushMessage(message);
    
    expect(result1).toBeUndefined();
    expect(result2).toBeInstanceOf(Error);
    expect((result2 as Error).message).toBe('作業中です.');
});

test('RealSessionHandler processes message and emits events', async () => {
    const mockAgent = {
        process: mock().mockReturnValue((async function* () {
            yield { type: 'test', content: 'test message' };
        })()),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent
    });

    const events: any[] = [];
    handler.listenEvent((event) => {
        events.push(event);
    });

    const message: UserMessage = { msgId: crypto.randomUUID(), content: 'test message' };
    await handler.pushMessage(message);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('push_agent_message');
    expect(events[0].message).toHaveProperty('msgId');
    expect(events[0].message.content).toBe('{"type":"test","content":"test message"}');
});

test('RealSessionHandler event listener unsubscribe works', async () => {
    const mockAgent = {
        process: mock().mockReturnValue((async function* () {
            yield { type: 'test1', content: 'message1' };
            yield { type: 'test2', content: 'message2' };
        })()),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent
    });

    const events: any[] = [];
    const { unsubscribe } = handler.listenEvent((event) => {
        events.push(event);
        if (events.length === 1) {
            // Unsubscribe after first event
            unsubscribe();
        }
    });

    const message: UserMessage = { msgId: crypto.randomUUID(), content: 'test message' };
    await handler.pushMessage(message);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 20));

    // Should only receive the first event due to unsubscribe
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('push_agent_message');
});

test('RealSessionHandler approval flow emits ask_approval event', async () => {
    const mockAgent = {
        process: mock().mockImplementation(({ permitAction }) => {
            return (async function* () {
                // Trigger the approval request
                await permitAction({ action: 'test' });
                yield { type: 'test', content: 'test message' };
            })();
        }),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent
    });

    const events: any[] = [];
    handler.listenEvent((event) => {
        events.push(event);
    });

    const message: UserMessage = { msgId: crypto.randomUUID(), content: 'test message' };
    await handler.pushMessage(message);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    const askApprovalEvent = events.find(e => e.type === 'ask_approval');
    expect(askApprovalEvent).toBeDefined();
    expect(askApprovalEvent.data).toEqual({ action: 'test' });
    expect(askApprovalEvent.approvalId).toBeDefined();
});

test('RealSessionHandler close method works', async () => {
    const mockAgent = {
        process: mock(),
        close: mock().mockResolvedValue(undefined)
    } as CodingAgent;

    const handler = new RealSessionHandler({
        sessionId: 'test-session-id',
        agent: mockAgent
    });

    const result = await handler.close();
    expect(result).toBeUndefined();
});

test('RealSessionHandlerFactory creates RealSessionHandler', () => {
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