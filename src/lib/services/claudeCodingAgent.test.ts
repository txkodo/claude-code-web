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

test('ClaudeCodingAgentのコンストラクタが正しく初期化される', () => {
  const agent = new ClaudeCodingAgent('/test/cwd');
  expect(agent).toBeInstanceOf(ClaudeCodingAgent);
});

test('ClaudeCodingAgentがメッセージを正しく処理する', async () => {
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

test('ClaudeCodingAgentがセッション再開を処理する', async () => {
  // モック呼び出し回数をリセット
  mockQuery.mockClear();
  
  // 2つの別々の呼び出しをモック
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

  // 最初の処理
  const iterator1 = agent.process({
    prompt: 'first prompt',
    permitAction
  });

  const results1 = [];
  for await (const message of iterator1) {
    results1.push(message);
  }

  expect(results1).toHaveLength(2);

  // 2回目の処理では保存されたセッションIDが使用される
  const iterator2 = agent.process({
    prompt: 'second prompt',
    permitAction
  });

  const results2 = [];
  for await (const message of iterator2) {
    results2.push(message);
  }

  expect(results2).toHaveLength(1);

  // このテストでqueryが2回呼ばれたことを確認
  expect(mockQuery).toHaveBeenCalledTimes(2);

  await agent.close();
});

test('ClaudeCodingAgentがエラーを正しく処理する', async () => {
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
    expect(false).toBe(true); // ここに到達すべきではない
  } catch (error) {
    expect(error).toBe(testError);
  }

  await agent.close();
});

test('ClaudeCodingAgentのcloseメソッドが正しく動作する', async () => {
  const agent = new ClaudeCodingAgent('/test/cwd');
  
  // closeは例外を投げない
  await expect(agent.close()).resolves.toBeUndefined();
});

test('ClaudeCodingAgentFactoryがClaudeCodingAgentを作成する', () => {
  const factory = new ClaudeCodingAgentFactory();
  const agent = factory.createAgent('/test/cwd');

  expect(agent).toBeInstanceOf(ClaudeCodingAgent);
});

test('ClaudeCodingAgentの基本機能が動作する', async () => {
  // 基本的な反復を確認するシンプルなテスト
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