"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface QuizProps {
    data: any[]; // Flexible to handle both old and new structures
    topicId?: number;
    mode?: "inline" | "modal";
    onClose?: () => void;
    onComplete?: (score: number, total: number, incorrectQuestions?: { question: string; userAnswer: string; correctAnswer: string }[], attempt?: number) => void;
}

export default function Quiz({ data, topicId, mode = "modal", onClose, onComplete }: QuizProps) {
    // Handle both old (array of questions) and new (array of quiz objects) structures
    const quizData = data[0]?.questions ? data[0].questions : data;
    const quizTitle = data[0]?.title || "Quiz";
    const quizKey = `quiz_${topicId}_${JSON.stringify(data).substring(0, 20)}`;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [attempt, setAttempt] = useState(1);

    // Restore quiz state from sessionStorage on mount
    useEffect(() => {
        const savedState = sessionStorage.getItem(quizKey);
        if (savedState) {
            try {
                const { currentQuestion: savedQ, score: savedScore, showResult: savedResult, userAnswers: savedAnswers } = JSON.parse(savedState);
                setCurrentQuestion(savedQ);
                setScore(savedScore);
                setShowResult(savedResult);
                if (savedAnswers) setUserAnswers(savedAnswers);
            } catch (e) {
                console.error("Failed to restore quiz state", e);
            }
        }
    }, [quizKey]);

    // Save quiz state to sessionStorage whenever it changes
    useEffect(() => {
        if (currentQuestion > 0 || score > 0 || showResult) {
            sessionStorage.setItem(quizKey, JSON.stringify({ currentQuestion, score, showResult, userAnswers }));
        }
    }, [currentQuestion, score, showResult, quizKey, userAnswers]);

    const handleNext = async () => {
        const currentQ = quizData[currentQuestion];
        let newScore = score;

        // Save user answer
        if (selectedOption) {
            setUserAnswers(prev => ({ ...prev, [currentQuestion]: selectedOption }));

            if (selectedOption === currentQ.correct_answer) {
                newScore = score + 1;
                setScore(newScore);
            }
        }

        if (currentQuestion + 1 < quizData.length) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
            setShowResult(false);
        } else {
            setShowResult(true);
            const userId = localStorage.getItem("user_id");
            if (userId && topicId) {
                try {
                    // Calculate percentage score
                    const percentage = Math.round((newScore / quizData.length) * 100);
                    await api.updateProgress(userId, topicId.toString(), "in-progress");
                } catch (e) {
                    console.error("Failed to save score", e);
                }
            }

            if (onComplete) {
                const incorrectQuestions = quizData
                    .map((q: any, idx: number) => {
                        const userAnswer = idx === currentQuestion ? selectedOption : userAnswers[idx];
                        if (userAnswer !== q.correct_answer) {
                            return {
                                question: q.question,
                                userAnswer: userAnswer || "Skipped",
                                correctAnswer: q.correct_answer
                            };
                        }
                        return null;
                    })
                    .filter((q: any) => q !== null);

                onComplete(newScore, quizData.length, incorrectQuestions, attempt);
            }
        }
    };

    const handleRetake = () => {
        sessionStorage.removeItem(quizKey);
        setCurrentQuestion(0);
        setScore(0);
        setShowResult(false);
        setUserAnswers({});
        setSelectedOption(null);
        setAttempt(prev => prev + 1);
    };

    const containerClasses = mode === "modal"
        ? "fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in"
        : "my-8";

    const contentClasses = mode === "modal"
        ? "bg-slate-800 p-8 rounded-3xl border border-white/10 shadow-2xl max-w-2xl w-full relative max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600"
        : "p-6 bg-slate-800/50 rounded-2xl border border-white/10";

    if (showResult) {
        return (
            <div className={containerClasses}>
                <div className={contentClasses}>
                    {mode === "modal" && onClose && (
                        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white sticky z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    )}
                    <h3 className="text-2xl font-bold mb-6 text-white text-center">{quizTitle} Complete!</h3>

                    <div className="flex justify-center mb-8">
                        <div className="text-center px-6 py-4 bg-slate-900/50 rounded-2xl border border-white/5">
                            <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Your Score</p>
                            <p className="text-4xl font-bold text-white">
                                <span className="text-emerald-400">{score}</span>
                                <span className="text-slate-600 text-2xl">/</span>
                                <span className="text-slate-400 text-2xl">{quizData.length}</span>
                            </p>
                            <button
                                onClick={handleRetake}
                                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Retake Quiz
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {quizData.map((q: any, idx: number) => {
                            const userAnswer = userAnswers[idx];
                            const isCorrect = userAnswer === q.correct_answer;

                            return (
                                <div key={idx} className={`p-4 rounded-xl border ${isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                    <p className="text-slate-200 font-medium mb-3">
                                        <span className="text-slate-500 mr-2">{idx + 1}.</span>
                                        {q.question}
                                    </p>
                                    <div className="space-y-2 pl-6">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500 w-24">Your Answer:</span>
                                            <span className={`font-medium ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {userAnswer || "Skipped"}
                                            </span>
                                            {isCorrect ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>
                                        {!isCorrect && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-500 w-24">Correct:</span>
                                                <span className="text-emerald-400 font-medium">{q.correct_answer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    const question = quizData[currentQuestion];

    if (!question || !question.options) {
        return <div className="text-red-500">Error: Invalid quiz data format.</div>;
    }

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>
                {mode === "modal" && onClose && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
                <h3 className="text-xl font-bold mb-4 text-white">{quizTitle}</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Question {currentQuestion + 1} of {quizData.length}</p>
                <p className="mb-6 text-slate-200 text-lg">{question.question}</p>
                <div className="flex flex-col gap-3 mb-6">
                    {question.options.map((option: string) => (
                        <button
                            key={option}
                            onClick={() => setSelectedOption(option)}
                            className={`p-4 rounded-xl text-left transition-all border ${selectedOption === option
                                ? "bg-blue-600/20 border-blue-500 text-blue-200"
                                : "bg-slate-700/30 border-white/5 hover:bg-slate-700/50 text-slate-300"
                                }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleNext}
                    disabled={!selectedOption}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                >
                    {currentQuestion + 1 === quizData.length ? "Finish Quiz" : "Next Question"}
                </button>
            </div>
        </div>
    );
}
