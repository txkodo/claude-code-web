import { test, expect, mock } from 'bun:test';
import type { CodingPermission } from '$lib/domain';

// Mock external dependencies
const mockQuery = mock();
mock.module('@anthropic-ai/claude-code', () => ({
  query: mockQuery
}));

mock.module('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: mock().mockImplementation(() => ({
    tool: mock(),
    connect: mock(),
    close: mock()
  }))
}));

mock.module('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: mock().mockImplementation(() => ({
    handleRequest: mock(),
    close: mock()
  }))
}));

mock.module('bun', () => ({
  serve: mock().mockReturnValue({
    hostname: 'localhost',
    port: 12345,
    stop: mock().mockResolvedValue(undefined)
  })
}));

mock.module('fetch-to-node', () => ({
  toFetchResponse: mock().mockReturnValue(new Response()),
  toReqRes: mock().mockReturnValue({ req: {}, res: {} })
}));

mock.module('zod', () => ({
  z: {
    string: () => ({ describe: mock().mockReturnThis() }),
    object: () => ({ passthrough: () => ({ describe: mock().mockReturnThis() }) })
  }
}));

const { ClaudeCodingAgent, ClaudeCodingAgentFactory } = await import('./claudeCodingAgent');

test('ClaudeCodingAgent constructor initializes correctly', () => {
  const agent = new ClaudeCodingAgent('/test/cwd');
  expect(agent).toBeInstanceOf(ClaudeCodingAgent);
});

test('ClaudeCodingAgent processes messages correctly', async () => {
  const mockMessages = [
    { type: 'text', content: 'Hello' },
    { type: 'result', content: 'Done' }
  ];

  mockQuery.mockReturnValue((async function* () {
    for (const msg of mockMessages) {
      yield msg;
    }
  })());

  const agent = new ClaudeCodingAgent('/test/cwd');
  const permitAction = mock().mockResolvedValue({ behavior: 'allow', updatedInput: {} });

  const results = [];
  for await (const message of agent.process({
    prompt: 'test prompt',
    permitAction
  })) {
    results.push(message);
  }

  expect(results).toHaveLength(2);
  expect(results[0]).toHaveProperty('msgId');
  expect(results[0].content).toBe(JSON.stringify(mockMessages[0]));
  expect(results[1].content).toBe(JSON.stringify(mockMessages[1]));

  await agent.close();
});

test('ClaudeCodingAgent handles session resumption', async () => {
  // Reset mock call count
  mockQuery.mockClear();
  
  // Mock two separate calls
  mockQuery
    .mockReturnValueOnce((async function* () {
      yield { type: 'session_id', sessionId: 'test-session-123' };
      yield { type: 'text', content: 'First message' };
    })())
    .mockReturnValueOnce((async function* () {
      yield { type: 'text', content: 'Second message' };
    })());

  const agent = new ClaudeCodingAgent('/test/cwd');
  const permitAction = mock().mockResolvedValue({ behavior: 'allow', updatedInput: {} });

  // First process
  const iterator1 = agent.process({
    prompt: 'first prompt',
    permitAction
  });

  const results1 = [];
  for await (const message of iterator1) {
    results1.push(message);
  }

  expect(results1).toHaveLength(2);

  // Second process should use saved session ID
  const iterator2 = agent.process({
    prompt: 'second prompt',
    permitAction
  });

  const results2 = [];
  for await (const message of iterator2) {
    results2.push(message);
  }

  expect(results2).toHaveLength(1);

  // Verify that query was called twice for this test
  expect(mockQuery).toHaveBeenCalledTimes(2);

  await agent.close();
});

test('ClaudeCodingAgent handles errors correctly', async () => {
  const testError = new Error('Test error');
  mockQuery.mockReturnValue((async function* () {
    throw testError;
  })());

  const agent = new ClaudeCodingAgent('/test/cwd');
  const permitAction = mock().mockResolvedValue({ behavior: 'allow', updatedInput: {} });

  try {
    const iterator = agent.process({
      prompt: 'test prompt',
      permitAction
    });
    const asyncIterator = iterator[Symbol.asyncIterator]();
    await asyncIterator.next();
    expect(false).toBe(true); // Should not reach here
  } catch (error) {
    expect(error).toBe(testError);
  }

  await agent.close();
});

test('ClaudeCodingAgent close method works correctly', async () => {
  const agent = new ClaudeCodingAgent('/test/cwd');
  
  // close should not throw
  await expect(agent.close()).resolves.toBeUndefined();
});

test('ClaudeCodingAgentFactory creates ClaudeCodingAgent', () => {
  const factory = new ClaudeCodingAgentFactory();
  const agent = factory.createAgent('/test/cwd');

  expect(agent).toBeInstanceOf(ClaudeCodingAgent);
});

test('ClaudeCodingAgent basic functionality works', async () => {
  // Simple test to verify basic iteration
  mockQuery.mockReturnValue((async function* () {
    yield { type: 'start', content: 'Starting' };
    yield { type: 'end', content: 'Finished' };
  })());

  const agent = new ClaudeCodingAgent('/test/cwd');
  const permitAction = mock().mockResolvedValue({ behavior: 'allow', updatedInput: {} });

  const messages = [];
  for await (const message of agent.process({
    prompt: 'simple test',
    permitAction
  })) {
    messages.push(message);
  }

  expect(messages).toHaveLength(2);
  expect(messages[0].content).toContain('Starting');
  expect(messages[1].content).toContain('Finished');

  await agent.close();
});