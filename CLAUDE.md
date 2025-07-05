# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Code Web - Architecture Documentation

## Project Overview

This is a web application that provides a UI for interacting with Claude Code Pro features. It creates a local development environment where users can select directories and chat with Claude using the official @anthropic-ai/claude-code SDK, with approval workflow for code operations.

## Architecture Overview

The application follows a **dual-server architecture**:

1. **SvelteKit Frontend Server** (Port 5173) - Handles UI rendering and static assets
2. **Hono API Server** (Port 3001) - Handles API endpoints, WebSocket connections, and Claude Code integration

The Hono server acts as a proxy, forwarding non-API requests to the SvelteKit server while handling API routes directly.

## Key Technologies

- **Frontend**: SvelteKit 2.x with Svelte 5.x (using new runes syntax)
- **Backend**: Hono.js with Bun runtime
- **Real-time Communication**: WebSockets (via Hono's Bun WebSocket support)
- **AI Integration**: @anthropic-ai/claude-code SDK
- **MCP (Model Context Protocol)**: For permission handling via @modelcontextprotocol/sdk
- **Type Safety**: Full TypeScript with shared types between client/server
- **Package Manager**: Bun (lockfile: bun.lock)

## Directory Structure

```
├── src/
│   ├── app.css                     # Global styles
│   ├── app.html                    # HTML template
│   ├── lib/
│   │   ├── client/
│   │   │   └── api.svelte.ts       # Type-safe API client (Hono RPC)
│   │   ├── component/
│   │   │   ├── ChatInterface.svelte        # Main chat UI with approval workflow
│   │   │   └── DirectorySelector.svelte    # Directory selection component
│   │   └── server/
│   │       ├── api.ts              # Main API router with WebSocket handling
│   │       ├── domain.ts           # Shared types and interfaces
│   │       ├── services/
│   │       │   ├── claudeCodingAgent.ts    # Claude Code SDK integration
│   │       │   ├── permissionMcp.ts        # MCP server for permission prompts
│   │       │   ├── realSessionHandler.ts   # Session event handling
│   │       │   └── sessionManager.ts       # Session lifecycle management
│   │       └── util/
│   │           └── sleep.ts
│   └── routes/
│       ├── +layout.svelte          # Root layout with gradient background
│       ├── +page.svelte            # Session list/creation page
│       └── [sessionId]/
│           └── +page.svelte        # Individual session chat page
├── server.ts                       # Main server entry point
├── package.json                    # Dependencies and scripts
└── Various config files (tsconfig.json, vite.config.ts, etc.)
```

## Core Architecture Patterns

### 1. Session Management
- **SessionManager**: Creates and manages multiple coding sessions
- **SessionHandler**: Handles individual session lifecycle and events
- **Factory Pattern**: Used for creating sessions and coding agents

### 2. Event-Driven Architecture
- **WebSocket Event System**: Real-time communication between client and server
- **Event Types**: `push_user_message`, `push_agent_message`, `ask_approval`, `answer_approval`
- **Pub/Sub Pattern**: WebSocket subscriptions to specific session events

### 3. Permission System via MCP
- **PermissionMcpServer**: Creates ephemeral HTTP servers for permission prompts
- **Approval Workflow**: User must approve/deny each Claude Code operation
- **MCP Integration**: Uses Model Context Protocol for secure permission handling

### 4. Type Safety
- **Shared Domain Types**: Common interfaces between client and server
- **Hono RPC**: Type-safe API calls with full TypeScript inference
- **WebSocket Message Types**: Strongly typed message protocols

## Key Data Flow

1. **Session Creation**:
   - User selects directory → API call → SessionManager creates session → WebSocket subscription

2. **Chat Flow**:
   - User message → WebSocket → SessionHandler → ClaudeCodingAgent → Claude Code SDK
   - Claude responses → SessionHandler events → WebSocket → UI updates

3. **Permission Flow**:
   - Claude needs permission → MCP server → `ask_approval` event → UI approval dialog
   - User approves/denies → `answer_approval` event → MCP response → Claude continues

## WebSocket Message Protocol

### Client→Server Messages:
```typescript
type WsClientMessage = 
  | { type: "subscribe", sessionId: string }
  | { type: "unsubscribe", sessionId: string }
  | { type: "chat", sessionId: string, message: string }
  | { type: "answer_approval", sessionId: string, approvalId: string, data: CodingPermission }
```

### Server→Client Messages:
```typescript
type WsServerMessage = {
  type: "event"
  sessionId: string
  event: SessionEvent // Various event types for UI updates
}
```

## Development Commands

```bash
# Install dependencies
bun install

# Start development (dual server)
bun run dev:all          # Both servers concurrently
bun run dev:client       # SvelteKit only (port 5173)
bun run dev:server       # Hono server only (port 3001)

# Build and production
bun run build
bun run preview

# Testing
bun test                 # Run all tests
bun run check            # Svelte type checking
bun run typecheck        # TypeScript checking
```

## Configuration Files

- **vite.config.ts**: SvelteKit build configuration
- **svelte.config.js**: Svelte compiler configuration
- **tsconfig.json**: TypeScript configuration with strict mode
- **package.json**: Scripts include concurrency management for dual servers

## Security & Permission Model

The app implements a **permission-first approach**:
- Every Claude Code operation requires explicit user approval
- MCP (Model Context Protocol) handles permission requests securely
- Ephemeral HTTP servers are created per session for permission handling
- Users can see exactly what operations Claude wants to perform before approving

## Browser Compatibility

- **Directory Selection**: Uses File System Access API when available (Chrome/Edge)
- **Fallback**: Manual path input for other browsers
- **WebSocket**: Standard WebSocket support required

## Special Features

1. **Session Persistence**: Sessions maintain state across page reloads
2. **Real-time Updates**: WebSocket-based live chat updates
3. **Permission Visualization**: JSON display of proposed operations
4. **Responsive Design**: Mobile-friendly UI with CSS Grid/Flexbox
5. **Error Handling**: Comprehensive error states and user feedback

## Extension Points

The architecture supports easy extension through:
- **CodingAgentFactory**: Can create different types of coding agents
- **SessionHandlerFactory**: Can implement different session behaviors
- **MCP Server**: Can add more sophisticated permission logic
- **WebSocket Events**: Can add new event types for extended functionality

This architecture provides a solid foundation for a local Claude Code interface with proper separation of concerns, type safety, and real-time user interaction.

# Important Instructions for Claude Code

## Server Management
- DO NOT automatically start the development server unless explicitly requested
- When the user wants to stop the server, use `kill` command on the appropriate PID
- Always check if servers are running before starting new ones
- Port 3001 is used for the Hono API server
- Port 5173 is used for the SvelteKit frontend server

## General Guidelines
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User