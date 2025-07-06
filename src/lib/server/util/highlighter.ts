import { getHighlighter } from 'shiki';
import type { Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;

// 言語と拡張子のマッピング
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
    'zsh': 'bash',
    'fish': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
    'toml': 'toml',
    'xml': 'xml',
    'dockerfile': 'dockerfile',
    'sql': 'sql',
    'graphql': 'graphql',
    'r': 'r',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'clj': 'clojure',
    'hs': 'haskell',
    'elm': 'elm',
    'lua': 'lua',
    'perl': 'perl',
    'dart': 'dart',
    'f90': 'fortran',
    'f95': 'fortran',
    'f03': 'fortran',
    'f08': 'fortran',
    'jl': 'julia',
    'nim': 'nim',
    'zig': 'zig',
    'v': 'v',
    'tex': 'latex',
    'r': 'r',
    'matlab': 'matlab',
    'octave': 'octave',
    'makefile': 'makefile',
    'cmake': 'cmake',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'gitignore': 'gitignore',
    'dockerignore': 'dockerignore',
};

// ハイライター初期化
async function initHighlighter(): Promise<Highlighter> {
    if (!highlighter) {
        highlighter = await getHighlighter({
            themes: ['github-light', 'github-dark'],
            langs: [
                'javascript',
                'typescript',
                'html',
                'css',
                'json',
                'markdown',
                'python',
                'java',
                'c',
                'cpp',
                'csharp',
                'php',
                'ruby',
                'rust',
                'go',
                'bash',
                'yaml',
                'xml',
                'sql',
                'svelte',
                'vue',
                'sass',
                'scss',
                'less',
                'toml',
                'dockerfile',
                'graphql',
                'r',
                'swift',
                'kotlin',
                'scala',
                'clojure',
                'haskell',
                'elm',
                'lua',
                'perl',
                'dart',
                'julia',
                'nim',
                'zig',
                'v',
                'latex',
                'matlab',
                'octave',
                'makefile',
                'cmake',
                'ini',
                'gitignore',
            ],
        });
    }
    return highlighter;
}

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
    if (extension && languageMap[extension]) {
        return languageMap[extension];
    }
    
    return 'text';
}

// コードハイライト処理
export async function highlightCode(code: string, filePath: string): Promise<string> {
    try {
        const highlighter = await initHighlighter();
        const language = getLanguageFromFilePath(filePath);
        
        // 言語が対応していない場合はプレーンテキスト
        if (language === 'text') {
            return code;
        }
        
        const html = highlighter.codeToHtml(code, {
            lang: language,
            theme: 'github-light',
        });
        
        return html;
    } catch (error) {
        console.error('Code highlighting failed:', error);
        return code;
    }
}

// 利用可能な言語リストを取得
export function getSupportedLanguages(): string[] {
    return Object.keys(languageMap);
}