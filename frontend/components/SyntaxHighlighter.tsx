"use client";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    language: string;
    value: string;
}

export default function CodeBlock({ language, value }: CodeBlockProps) {
    return (
        <SyntaxHighlighter
            language={language || 'text'}
            style={vscDarkPlus}
            customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.9em' }}
        >
            {value}
        </SyntaxHighlighter>
    );
}
