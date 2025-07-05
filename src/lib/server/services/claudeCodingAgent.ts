import type { SessionMessage, CodingAgent, CodingAgentFactory, CodingApproval, SessionMessageChange } from "$lib/server/domain";
import { query, type SDKAssistantMessage, type SDKMessage, type SDKResultMessage, type SDKSystemMessage, type SDKUserMessage } from '@anthropic-ai/claude-code';
import type { ContentBlockParam, TextBlockParam, ImageBlockParam, Base64ImageSource, ToolResultBlockParam, ContentBlock, TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import type { PermissionMcpServer } from "./permissionMcp";

export class ClaudeCodingAgent implements CodingAgent {
  #cwd: string;
  #claudeCodeSessionId: string | undefined;
  #abortController: AbortController | undefined;
  #permissionMcpServer: PermissionMcpServer;
  #toolUseMessages: Map<string, SessionMessage.ToolUseMessage> = new Map();

  constructor(cwd: string, permissionMcpServer: PermissionMcpServer) {
    this.#permissionMcpServer = permissionMcpServer;
    this.#cwd = cwd;
    this.#claudeCodeSessionId = undefined;
    this.#abortController = undefined;
  }

  async *process(props: {
    prompt: string,
    permitAction: (data: unknown) => Promise<CodingApproval>,
    abortSignal?: AbortSignal
  }): AsyncIterable<SessionMessageChange> {
    if (this.#abortController) {
      throw new Error('作業中です.');
    }

    const mcpSubscription = await this.#permissionMcpServer.subscribe(props.permitAction)

    try {
      this.#abortController = new AbortController();

      // 外部からのAbortSignalがある場合は、それも監視
      if (props.abortSignal) {
        props.abortSignal.addEventListener('abort', () => {
          this.#abortController?.abort();
        });
      }

      // ClaudeCode実行
      for await (const sdkMessage of query({
        prompt: props.prompt,
        options: {
          resume: this.#claudeCodeSessionId,
          abortController: this.#abortController,
          cwd: this.#cwd,
          executable: "bun",
          mcpServers: { permission_prompt: mcpSubscription.mcpServerConfig },
          permissionPromptToolName: `mcp__permission_prompt__${mcpSubscription.toolName}`
        }
      })) {
        console.log(sdkMessage);
        // セッションIDを保存（再開可能にするため）
        if (sdkMessage.session_id) {
          this.#claudeCodeSessionId = sdkMessage.session_id;
        }

        yield* this.#handleSdkMessage(sdkMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Unknown error: ${error}`);
      }
    } finally {
      this.#abortController = undefined;
      mcpSubscription.unsubscribe();
    }
  }

  async *#handleSdkMessage(sdkMessage: SDKMessage): AsyncIterable<SessionMessageChange> {
    switch (sdkMessage.type) {
      case "system":
        yield* this.#handleSystemMessage(sdkMessage);
        break;
      case "assistant":
        yield* this.#handleAssistantMessage(sdkMessage);
        break;
      case "user":
        yield* this.#handleUserMessage(sdkMessage);
        break;
      case "result":
        yield* this.#handleResultMessage(sdkMessage);
        break;
    }
  }

  async *#handleSystemMessage(sdkMessage: SDKSystemMessage): AsyncIterable<SessionMessageChange> {
    // Skip system init messages
    if (sdkMessage.subtype === "init") {
      return;
    }
    yield {
      mode: "push",
      message: {
        type: "debug_message",
        msgId: crypto.randomUUID(),
        content: JSON.stringify(sdkMessage)
      }
    };
  }

  async *#handleAssistantMessage(sdkMessage: SDKAssistantMessage): AsyncIterable<SessionMessageChange> {
    const content = sdkMessage.message.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        yield* this.#handleAssistantContentItem(item);
      }
    } else if (typeof content === 'string') {
      yield {
        mode: "push",
        message: {
          type: "assistant_message",
          msgId: crypto.randomUUID(),
          content: content
        }
      };
    } else {
      yield {
        mode: "push",
        message: {
          type: "debug_message",
          msgId: crypto.randomUUID(),
          content: JSON.stringify(sdkMessage)
        }
      };
    }
  }

  async *#handleAssistantContentItem(item: ContentBlock): AsyncIterable<SessionMessageChange> {
    switch (item.type) {
      case "text":
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: item.text
          }
        };
        break;
      case "tool_use":
        const toolUseMessage: SessionMessage.ToolUseMessage = {
          type: "tool_use_message",
          msgId: crypto.randomUUID(),
          toolUseId: item.id,
          name: item.name,
          input: item.input,
          output: null
        };
        this.#toolUseMessages.set(item.id, toolUseMessage);
        yield {
          mode: "push",
          message: toolUseMessage
        };
        break;
      case "thinking":
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: `Thinking: ${item.thinking}`
          }
        };
        break;
      case "server_tool_use":
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: `Server Tool: ${item.name}\nInput: ${JSON.stringify(item.input, null, 2)}`
          }
        };
        break;
      default:
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: JSON.stringify(item)
          }
        };
        break;
    }
  }

  async *#handleUserMessage(sdkMessage: SDKUserMessage): AsyncIterable<SessionMessageChange> {
    // ツール結果を個別に処理
    const content = sdkMessage.message.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        yield* this.#handleContentItem(item);
      }
    } else {
      yield {
        mode: "push",
        message: {
          type: "debug_message",
          msgId: crypto.randomUUID(),
          content: JSON.stringify(sdkMessage)
        }
      };
    }
  }

  async *#handleContentItem(item: ContentBlockParam): AsyncIterable<SessionMessageChange> {
    switch (item.type) {
      case "tool_result":
        yield* this.#handleToolResult(item);
        break;
      default:
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: JSON.stringify(item)
          }
        };
        break;
    }
  }

  async *#handleToolResult(item: ToolResultBlockParam): AsyncIterable<SessionMessageChange> {
    const toolUseMessage = this.#toolUseMessages.get(item.tool_use_id);
    if (!toolUseMessage) {
      // Tool use message not found, create a debug message
      yield {
        mode: "push",
        message: {
          type: "debug_message",
          msgId: crypto.randomUUID(),
          content: `Tool result for unknown tool_use_id: ${item.tool_use_id}`
        }
      };
      return;
    }

    // Update the tool use message with output
    const outputs: ({ type: "image"; uri: string; } | { type: "text"; text: string; })[] = [];
    
    if (typeof item.content === 'string') {
      outputs.push({ type: "text", text: item.content });
    } else if (Array.isArray(item.content)) {
      for (const x of item.content) {
        switch (x.type) {
          case "text":
            outputs.push({ type: "text", text: x.text });
            break;
          case "image":
            outputs.push({
              type: "image",
              uri: x.source.type === "base64"
                ? `data:${(x.source as Base64ImageSource).media_type};base64,${(x.source as Base64ImageSource).data}`
                : (x.source as { url: string }).url
            });
            break;
        }
      }
    } else if (item.content === undefined) {
      outputs.push({ type: "text", text: "" });
    }

    toolUseMessage.output = outputs;
    yield {
      mode: "update",
      message: toolUseMessage
    };
  }


  async *#handleResultMessage(sdkMessage: SDKResultMessage): AsyncIterable<SessionMessageChange> {
    switch (sdkMessage.subtype) {
      case "success":
        yield {
          mode: "push",
          message: {
            type: "assistant_message",
            msgId: crypto.randomUUID(),
            content: sdkMessage.result
          }
        };
        break;
      case "error_during_execution":
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: 'エラーが発生しました',
          }
        };
        break;
      case "error_max_turns":
        yield {
          mode: "push",
          message: {
            type: "debug_message",
            msgId: crypto.randomUUID(),
            content: '最大ターン数に達しました',
          }
        };
        break;
    }
  }

  async close(): Promise<void> {
    if (this.#abortController) {
      this.#abortController.abort();
    }
  }
}

export class ClaudeCodingAgentFactory implements CodingAgentFactory {
  constructor(private permissionMcpServer: PermissionMcpServer) { }
  createAgent(cwd: string): CodingAgent {
    return new ClaudeCodingAgent(cwd, this.permissionMcpServer);
  }
}