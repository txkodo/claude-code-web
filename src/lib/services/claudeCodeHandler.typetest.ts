import type { ClaudeCodeHandler, ClaudeCodeEvent, EventListener, UnsubscribeFunction } from './claudeCodeHandler';
import { ClaudeCodeHandler as ClaudeCodeHandlerClass, claudeCodeHandler } from './claudeCodeHandler';
import type { SDKMessage } from '@anthropic-ai/claude-code';

// Test ClaudeCodeEvent interface with valid events
const validMessageEvent: ClaudeCodeEvent = {
  type: 'message'
};

const validErrorEvent: ClaudeCodeEvent = {
  type: 'error',
  error: 'Test error'
};

const validCompleteEvent: ClaudeCodeEvent = {
  type: 'complete'
};

// Test with mock SDKMessage (simplified for type testing)
const mockSDKMessage = {
  type: 'assistant' as const,
  content: 'test response'
};

const eventWithData: ClaudeCodeEvent = {
  type: 'message',
  data: mockSDKMessage as any
};

const eventWithMessages: ClaudeCodeEvent = {
  type: 'complete',
  messages: [mockSDKMessage as any]
};

// Test EventListener type
const validListener: EventListener = (event: ClaudeCodeEvent) => {
  console.log(event.type);
};

const validListenerWithTypeGuard: EventListener = (event: ClaudeCodeEvent) => {
  if (event.type === 'error') {
    console.log(event.error);
  } else if (event.type === 'message' && event.data) {
    console.log(event.data.type);
  } else if (event.type === 'complete' && event.messages) {
    console.log(event.messages.length);
  }
};

// Test UnsubscribeFunction type
const validUnsubscribe: UnsubscribeFunction = () => true;
const validUnsubscribe2: UnsubscribeFunction = () => false;

// Test ClaudeCodeHandler class
const handler = new ClaudeCodeHandlerClass();
const handlerWithSession = new ClaudeCodeHandlerClass('session-id');

// Test getSessionId method
const sessionId: string | null = handler.getSessionId();

// Test setSessionId method
handler.setSessionId('new-session');

// Test listen method
const unsubscribe: UnsubscribeFunction = handler.listen(validListener);

// Test unsubscribe function
const unsubscribeResult: boolean = unsubscribe();

// Test send method
const sendPromise: Promise<void> = handler.send('test message');

// Test abort method (void return)
handler.abort();

// Test clear method (void return)
handler.clear();

// Test singleton instance
const instance: ClaudeCodeHandler = claudeCodeHandler;

// Test method signatures are correct
function testMethodSignatures() {
  // These should compile without error
  const h = new ClaudeCodeHandlerClass();
  const h2 = new ClaudeCodeHandlerClass('session');
  
  const sessionId: string | null = h.getSessionId();
  h.setSessionId('session');
  
  const unsub: UnsubscribeFunction = h.listen((event: ClaudeCodeEvent) => {});
  const result: boolean = unsub();
  
  const promise: Promise<void> = h.send('message');
  
  h.abort(); // void
  h.clear(); // void
}

// Test event type narrowing
function testEventTypeNarrowing(event: ClaudeCodeEvent) {
  if (event.type === 'message') {
    // event.data should be SDKMessage | undefined
    if (event.data) {
      const messageType: string = event.data.type;
    }
  } else if (event.type === 'error') {
    // event.error should be string | undefined
    if (event.error) {
      const errorMessage: string = event.error;
    }
  } else if (event.type === 'complete') {
    // event.messages should be SDKMessage[] | undefined
    if (event.messages) {
      const messageCount: number = event.messages.length;
    }
  }
}

// Test async/await with send
async function testAsyncSend() {
  const handler = new ClaudeCodeHandlerClass();
  await handler.send('test message'); // Should return void
}