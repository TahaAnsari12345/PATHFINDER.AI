import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FlashcardDeck from './FlashcardDeck';
import Quiz from './Quiz';
import Mermaid from './Mermaid';

interface HistoryItem {
    id: number;
    type: "code" | "quiz" | "flashcard" | "mermaid";
    data: any;
    timestamp: Date;
}

interface HistoryPanelProps {
    items: HistoryItem[];
}

export default function HistoryPanel({ items }: HistoryPanelProps) {
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [activeModal, setActiveModal] = useState<{ type: "quiz" | "flashcard" | "mermaid" | "code", data: any } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleCopy = (id: number, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No history yet.</p>
                <p className="text-sm mt-2">Generated code, quizzes, and flashcards will appear here.</p>
            </div>
        );
    }

    return (
        <>
            <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {items.map((item) => (
                    <div key={item.id} className="bg-slate-900/50 backdrop-blur-sm rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300 shadow-sm hover:shadow-md group animate-slide-up">

                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 bg-white/5 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${item.type === 'code' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' :
                                    item.type === 'quiz' ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]' :
                                        item.type === 'mermaid' ? 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]' :
                                            'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                    }`}></div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${item.type === 'code' ? 'text-blue-300' :
                                    item.type === 'quiz' ? 'text-purple-300' :
                                        item.type === 'mermaid' ? 'text-pink-300' :
                                            'text-amber-300'
                                    }`}>
                                    {item.type === 'code' ? item.data.language : item.type}
                                </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full border border-white/5">
                                {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "Just now"}
                            </span>
                        </div>

                        {/* Content */}
                        {item.type === 'code' && (
                            <div
                                onClick={() => setActiveModal({ type: 'code', data: item.data })}
                                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors group/item"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl flex items-center justify-center text-blue-400 group-hover/item:scale-105 transition-transform border border-blue-500/10 shadow-lg shadow-blue-900/5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-slate-200 group-hover/item:text-blue-300 transition-colors text-sm">Code Snippet</h4>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                            {item.data.language}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity -translate-x-2 group-hover/item:translate-x-0 duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        {item.type === 'quiz' && (
                            <div
                                onClick={() => setActiveModal({ type: 'quiz', data: item.data })}
                                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors group/item"
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-slate-200 group-hover/item:text-purple-300 transition-colors text-sm">
                                        {item.data[0]?.title || "Quiz"}
                                    </h4>
                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center group-hover/item:bg-purple-500/20 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                    {item.data[0]?.questions?.length || 0} Questions
                                </p>
                            </div>
                        )}

                        {item.type === 'flashcard' && (
                            <div
                                onClick={() => setActiveModal({ type: 'flashcard', data: item.data })}
                                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors group/item"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-xl flex items-center justify-center text-amber-400 group-hover/item:scale-105 transition-transform border border-amber-500/10 shadow-lg shadow-amber-900/5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-slate-200 group-hover/item:text-amber-300 transition-colors text-sm">Flashcard Deck</h4>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                            {Array.isArray(item.data) ? item.data.length : 0} Cards
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity -translate-x-2 group-hover/item:translate-x-0 duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        {item.type === 'mermaid' && (
                            <div
                                onClick={() => setActiveModal({ type: 'mermaid', data: item.data })}
                                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors group/item"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500/10 to-pink-600/10 rounded-xl flex items-center justify-center text-pink-400 group-hover/item:scale-105 transition-transform border border-pink-500/10 shadow-lg shadow-pink-900/5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-slate-200 group-hover/item:text-pink-300 transition-colors text-sm">Mermaid Diagram</h4>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                            Click to view
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity -translate-x-2 group-hover/item:translate-x-0 duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                ))}
            </div>

            {/* Modals */}
            {/* Modals - Rendered via Portal to escape sidebar stacking context */}
            {mounted && activeModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    {activeModal.type === 'flashcard' && (
                        <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
                            <FlashcardDeck
                                cards={activeModal.data}
                                onClose={() => setActiveModal(null)}
                                mode="modal"
                            />
                        </div>
                    )}

                    {activeModal.type === 'quiz' && (
                        <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
                            <Quiz
                                data={activeModal.data}
                                onClose={() => setActiveModal(null)}
                                mode="modal"
                            />
                        </div>
                    )}

                    {activeModal.type === 'mermaid' && (
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up">
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <h3 className="text-lg font-medium text-white">Diagram</h3>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-8 bg-slate-950/50 flex items-center justify-center">
                                <div className="w-full">
                                    <Mermaid chart={activeModal.data.code} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeModal.type === 'code' && (
                        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up">
                            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1e1e1e] rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                        {activeModal.data.language}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleCopy(activeModal.data.id || 0, activeModal.data.code)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                    >
                                        {copiedId === (activeModal.data.id || 0) ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-green-400">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveModal(null)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto bg-[#1e1e1e] p-0">
                                <SyntaxHighlighter
                                    language={activeModal.data.language}
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', background: 'transparent', minHeight: '100%' }}
                                    showLineNumbers={true}
                                    wrapLongLines={true}
                                >
                                    {activeModal.data.code}
                                </SyntaxHighlighter>
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
