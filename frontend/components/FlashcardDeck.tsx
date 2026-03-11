"use client";

import { useState } from "react";

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardDeckProps {
    cards: Flashcard[];
    onClose: () => void;
    mode?: "inline" | "modal";
}

export default function FlashcardDeck({ cards, onClose, mode = "modal" }: FlashcardDeckProps) {
    if (!cards || cards.length === 0) {
        return (
            <div className={mode === "modal" ? "fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[60] p-4" : "p-4 text-center text-slate-400 bg-slate-800/50 rounded-xl border border-white/5"}>
                <div className="text-center">
                    <p className="text-slate-400 mb-4">No flashcards available.</p>
                    {mode === "modal" && (
                        <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
                            Close
                        </button>
                    )}
                </div>
            </div>
        );
    }
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % cards.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    };

    const currentCard = cards[currentIndex];

    const containerClasses = mode === "modal"
        ? "fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in"
        : "relative w-full my-6";

    const cardClasses = mode === "modal"
        ? "glass-card p-8 rounded-3xl max-w-lg w-full relative overflow-hidden"
        : "bg-slate-800/50 border border-white/10 p-6 rounded-2xl w-full relative overflow-hidden";

    return (
        <div className={containerClasses}>
            <div className={cardClasses}>
                {/* Background Glow - Only for modal or if desired for inline too */}
                {mode === "modal" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                )}

                {mode === "modal" && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                )}

                <div className="text-center mb-8 relative z-10">
                    <h3 className="text-xl font-bold text-blue-300 tracking-wide">
                        Flashcards
                    </h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                        Card {currentIndex + 1} of {cards.length}
                    </p>
                </div>

                <div
                    className="h-64 md:h-80 cursor-pointer mb-8 relative z-10 group"
                    style={{ perspective: "1000px" }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <div
                        className="relative w-full h-full transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
                        style={{
                            transformStyle: "preserve-3d",
                            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                        }}
                    >
                        {/* Front */}
                        <div
                            className="absolute w-full h-full glass rounded-2xl flex flex-col items-center justify-center p-8 border border-white/10 shadow-xl group-hover:border-blue-500/30 transition-colors"
                            style={{ backfaceVisibility: "hidden" }}
                        >
                            <span className="absolute top-6 left-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Front</span>
                            <p className="text-xl md:text-2xl text-center font-medium text-slate-100 leading-relaxed">{currentCard.front}</p>

                            <div className="absolute bottom-6 flex flex-col items-center gap-2">
                                <div className="w-12 h-1 bg-slate-700/50 rounded-full"></div>
                                <span className="text-xs text-slate-500 font-medium">Tap to flip</span>
                            </div>
                        </div>

                        {/* Back */}
                        <div
                            className="absolute w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-blue-500/30 flex flex-col items-center justify-center p-8 shadow-xl shadow-blue-900/20"
                            style={{
                                transform: "rotateY(180deg)",
                                backfaceVisibility: "hidden"
                            }}
                        >
                            <span className="absolute top-6 left-6 text-xs font-bold text-blue-400 uppercase tracking-widest">Back</span>
                            <p className="text-lg md:text-xl text-center font-medium text-slate-200 leading-relaxed">{currentCard.back}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center relative z-10">
                    <button
                        onClick={handlePrev}
                        className="px-6 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium transition-all hover:-translate-x-1 border border-white/5"
                    >
                        ← Prev
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all hover:translate-x-1 shadow-lg shadow-blue-900/20"
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}
