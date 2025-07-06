import type { ToolUseContent } from "../domain";
import { highlightCode } from "./highlighter";

// ファイルパスから言語を推測
function getLanguageFromFilePath(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    
    // 特別なファイル名のマッピング
    const specialFiles: Record<string, string> = {
        'Dockerfile': 'dockerfile',
        'Makefile': 'makefile',
        'CMakeLists.txt': 'cmake',
        'package.json': 'json',
        'tsconfig.json': 'json',
        'eslintrc.json': 'json',
        'prettierrc.json': 'json',
        '.gitignore': 'gitignore',
        '.dockerignore': 'dockerignore',
    };
    
    if (specialFiles[fileName]) {
        return specialFiles[fileName];
    }
    
    // 拡張子から言語を推測
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'vue': 'vue',
        'svelte': 'svelte',
        'html': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less',
        'json': 'json',
        'md': 'markdown',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'rs': 'rust',
        'go': 'go',
        'sh': 'bash',
        'bash': 'bash',
        'yml': 'yaml',
        'yaml': 'yaml',
        'toml': 'toml',
        'xml': 'xml',
        'sql': 'sql',
        'dockerfile': 'dockerfile',
        'makefile': 'makefile',
    };
    
    if (extension && languageMap[extension]) {
        return languageMap[extension];
    }
    
    return 'text';
}

// ツール入力からToolUseContentを生成
export async function parseToolUseContent(toolName: string, input: unknown): Promise<ToolUseContent> {
    if (typeof input !== 'object' || input === null) {
        return { tool: "unknown", data: input };
    }
    
    const inputObj = input as Record<string, any>;
    
    switch (toolName) {
        case 'Write': {
            const filePath = inputObj.file_path;
            const content = inputObj.content;
            
            if (typeof filePath === 'string' && typeof content === 'string') {
                const language = getLanguageFromFilePath(filePath);
                const highlightedContent = await highlightCode(content, filePath);
                
                return {
                    tool: "Write",
                    path: filePath,
                    language,
                    content,
                    highlightedContent: highlightedContent !== content ? highlightedContent : undefined
                };
            }
            return { tool: "unknown", data: input };
        }
        
        case 'Edit': {
            const filePath = inputObj.file_path;
            const oldContent = inputObj.old_string;
            const newContent = inputObj.new_string;
            
            if (typeof filePath === 'string' && typeof oldContent === 'string' && typeof newContent === 'string') {
                const language = getLanguageFromFilePath(filePath);
                const highlightedOldContent = await highlightCode(oldContent, filePath);
                const highlightedNewContent = await highlightCode(newContent, filePath);
                
                return {
                    tool: "Edit",
                    path: filePath,
                    language,
                    oldContent,
                    newContent,
                    highlightedOldContent: highlightedOldContent !== oldContent ? highlightedOldContent : undefined,
                    highlightedNewContent: highlightedNewContent !== newContent ? highlightedNewContent : undefined
                };
            }
            return { tool: "unknown", data: input };
        }
        
        case 'Read': {
            const filePath = inputObj.file_path;
            
            if (typeof filePath === 'string') {
                return {
                    tool: "Read",
                    path: filePath
                };
            }
            return { tool: "unknown", data: input };
        }
        
        case 'Bash': {
            const command = inputObj.command;
            
            if (typeof command === 'string') {
                return {
                    tool: "Bash",
                    command
                };
            }
            return { tool: "unknown", data: input };
        }
        
        default:
            return { tool: "unknown", data: input };
    }
}

// CWDからの相対パスを取得
export function getRelativePath(fullPath: string, cwd?: string): string {
    if (typeof fullPath !== 'string') {
        return '';
    }
    
    if (cwd && fullPath.startsWith(cwd)) {
        const relativePath = fullPath.substring(cwd.length);
        const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
        return cleanPath ? './' + cleanPath : './';
    }
    
    // CWDが提供されない場合は従来の表示
    const parts = fullPath.split('/');
    if (parts.length > 3) {
        return '.../' + parts.slice(-3).join('/');
    }
    
    return fullPath;
}