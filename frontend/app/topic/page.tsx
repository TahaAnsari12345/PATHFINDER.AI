"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PathIcon } from "@/components/Icons";

export default function TopicsPage() {
    const router = useRouter();
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getTopics().then(data => {
            setTopics(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-200">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Loading paths...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 p-8 pl-28">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <PathIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Learning Paths</h1>
                        <p className="text-slate-400 mt-1">Explore and master new topics</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topics.map((topic) => (
                        <Link
                            key={topic.id}
                            href={`/topic/${topic.id}`}
                            className="group relative bg-slate-800/30 border border-white/5 rounded-2xl p-6 hover:bg-slate-800/50 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300">
                                        <span className="text-2xl">🎓</span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${topic.difficulty === "Beginner" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                        topic.difficulty === "Intermediate" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                            "bg-red-500/10 text-red-400 border-red-500/20"
                                        }`}>
                                        {topic.difficulty}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-blue-400 transition-colors">
                                    {topic.title}
                                </h3>
                                <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                                    {topic.description}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                    <span className="text-xs text-slate-500 font-medium">
                                        View Path
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Add New Topic Card */}
                    <button
                        onClick={() => router.push('/dashboard?action=create')}
                        className="group relative bg-slate-800/30 border border-white/5 border-dashed rounded-2xl p-6 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center text-center gap-4 min-h-[240px]"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-200 group-hover:text-blue-400 transition-colors">Create New Path</h3>
                            <p className="text-slate-500 text-sm mt-1">Generate a custom learning path</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
