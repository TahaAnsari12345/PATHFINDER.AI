"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

import AITutor from "@/components/AITutor";
import HistoryPanel from "@/components/HistoryPanel";

interface Topic {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    estimated_time: number;
    content: string;
    quiz_data?: any[];
    challenge_data?: any;
    flashcards?: any[];
}

export default function TopicPage() {
    const { id } = useParams();
    const [topic, setTopic] = useState<Topic | null>(null);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (id) {
            const topicId = Array.isArray(id) ? id[0] : id;
            api.getTopic(topicId).then(topicData => {
                setTopic(topicData);
            }).catch(console.error);
        }
    }, [id]);

    const handleComplete = async () => {
        const userId = localStorage.getItem("user_id");
        if (userId && id) {
            const topicId = Array.isArray(id) ? id[0] : id;
            await api.updateProgress(userId, topicId, "completed");
            router.push("/dashboard");
        }
    };

    const handleHistoryItemAdded = (item: any) => {
        setHistoryItems(prev => {
            // Check if this item already exists (deduplication)
            const isDuplicate = prev.some(existing => {
                if (existing.type !== item.type) return false;

                // For code, we compare the code content
                if (item.type === 'code') {
                    return existing.data.code === item.data.code;
                }

                // For mermaid, we compare the code content
                if (item.type === 'mermaid') {
                    return existing.data.code === item.data.code;
                }

                // For others, we compare the full data object
                // Since we are no longer adding timestamp to data, we can compare directly
                return JSON.stringify(existing.data) === JSON.stringify(item.data);
            });

            if (isDuplicate) {
                return prev; // Don't add duplicate
            }

            // Generate a unique ID using timestamp and random number to avoid collisions
            const uniqueId = Date.now() + Math.floor(Math.random() * 10000);

            return [
                {
                    id: uniqueId,
                    type: item.type,
                    data: item.data, // Don't mutate data with timestamp
                    timestamp: new Date() // Keep timestamp at item level
                },
                ...prev
            ];
        });
    };

    const handleHistoryReset = () => {
        setHistoryItems([]);
    };

    if (!topic) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-200">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400">Loading topic...</p>
            </div>
        </div>
    );

    return (
        <div className="h-screen text-slate-200 flex overflow-hidden font-sans">
            <div className="flex-1 flex flex-col h-full relative transition-all duration-300" style={{ marginRight: isHistoryOpen && typeof window !== 'undefined' && window.innerWidth >= 768 ? "24rem" : "0" }}>
                <AITutor
                    topic={topic}
                    onComplete={handleComplete}
                    onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                    onHistoryItemAdded={handleHistoryItemAdded}
                    onHistoryReset={handleHistoryReset}
                />
            </div>

            {/* History Sidebar - Mobile Overlay / Desktop Sidebar */}
            <div className={`fixed top-0 right-0 bottom-0 w-full md:w-96 bg-[#0F1629] border-l border-white/5 transform transition-transform duration-300 z-50 ${isHistoryOpen ? "translate-x-0" : "translate-x-full"}`}>
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0F1629]/90 backdrop-blur-md">
                    <h2 className="font-bold text-white">Session History</h2>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="h-[calc(100vh-64px)] overflow-hidden">
                    <HistoryPanel items={historyItems} />
                </div>
            </div>
        </div>
    );
}
