import type { McpServerConfig } from "@anthropic-ai/claude-code";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { toFetchResponse, toReqRes } from "fetch-to-node";

export type PermissionCallback = (input: object) => {};

export class PermissionMcpServer {
    #url: (pricessId: string) => string;
    #transports: Map<string, StreamableHTTPServerTransport>;

    constructor(url: (permissionId: string) => string) {
        this.#transports = new Map<string, StreamableHTTPServerTransport>();
        this.#url = url;
    }

    async handleRequest(permissionId: string, request: Request): Promise<Response> {
        const { req, res } = toReqRes(request);
        console.log(`Handling permission request for ID: ${permissionId}`,req);
        await this.#transports.get(permissionId)?.handleRequest(req, res)
        return toFetchResponse(res);
    }

    async subscribe(permissionCallback: PermissionCallback): Promise<{ unsubscribe: () => void; mcpServerConfig: McpServerConfig, toolName: string }> {
        const subscriptionId = crypto.randomUUID();

        const server = new McpServer({ name: "PermissionPromptServer", version: "1.0.0" });

        const tool = server.tool(
            "approval_prompt",
            '権限チェックをユーザに問い合わせる',
            {
                tool_name: z.string().describe("権限を要求するツール"),
                input: z.object({}).passthrough().describe("ツールの入力"),
            },
            async ({ input }) => {
                console.log("Handling permission request:", input);
                const permission = await permissionCallback(input);
                console.log("Permission granted:", permission);
                return {
                    content: [{ type: "text", text: JSON.stringify(permission) }]
                };
            }
        );
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
        this.#transports.set(subscriptionId, transport);
        await server.connect(transport)

        return {
            unsubscribe: () => {
                console.log(`Unsubscribing from permission prompt for ID: ${subscriptionId}`);
                this.#transports.delete(subscriptionId);
                tool.disable();
                transport.close();
                server.close();
            },
            mcpServerConfig: { type: "http", url: this.#url(subscriptionId) }, toolName: `approval_prompt`
        }
    }
}