// クライアント側でのAPI呼び出し用ヘルパー関数
// APIサーバーが分離されたため、フェッチを行う関数を提供

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function createSession(cwd: string): Promise<{ sessionId: string }> {
    const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cwd }),
    });
    
    if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
    }
    
    return response.json();
}

export async function listSessions(): Promise<{ sessionIds: string[] }> {
    const response = await fetch(`${API_BASE_URL}/session`);
    
    if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.statusText}`);
    }
    
    return response.json();
}

export function getWebSocketUrl(sessionId: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // プロキシ経由でアクセスする場合は同じホストの WebSocket を使用
    if (API_BASE_URL.startsWith('/')) {
        return `${wsProtocol}//${window.location.host}${API_BASE_URL}/session/${sessionId}/ws`;
    } else {
        // 直接APIサーバーにアクセスする場合
        const wsBaseUrl = API_BASE_URL.replace(/^https?:/, wsProtocol);
        return `${wsBaseUrl}/session/${sessionId}/ws`;
    }
}
