"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import WelcomeBackModal from "@/components/WelcomeBackModal";
import { FlameIcon, TrophyIcon, SearchIcon, PlusIcon, SurpriseIcon, ProjectIcon, PathIcon } from "@/components/Icons";

interface Topic {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    estimated_time: number;
}

export default function Dashboard() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [showLostMode, setShowLostMode] = useState(false);
    const [gamification, setGamification] = useState<{ streak: number, badges: string[] }>({ streak: 0, badges: [] });
    const router = useRouter();

    useEffect(() => {
        const userId = localStorage.getItem("user_id");
        if (!userId) {
            router.push("/");
            return;
        }

        // Check for lost mode flag set during login
        const isLostMode = localStorage.getItem("is_lost_mode") === "true";
        if (isLostMode) {
            setShowLostMode(true);
            localStorage.removeItem("is_lost_mode"); // Clear flag
        }

        // Check for action=create query parameter
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'create') {
                setShowGenerateModal(true);
                // Clean up URL
                window.history.replaceState({}, '', '/dashboard');
            }
        }

        api.getTopics().then(setTopics).catch(console.error);
        api.getUserProjects(userId).then(setProjects).catch(console.error);
        api.getUserProgress(userId).then(setProgress).catch(console.error);
        api.getRecommendations(userId).then(setRecommendation).catch(console.error);
        api.getGamificationData(userId).then(setGamification).catch(console.error);

        // Listen for delete events to dynamically update UI
        const handleTopicDeleted = (e: Event) => {
            const event = e as CustomEvent<{ id: number }>;
            setTopics(prev => prev.filter(t => t.id !== event.detail.id));
        };
        const handleProjectDeleted = (e: Event) => {
            const event = e as CustomEvent<{ id: number }>;
            setProjects(prev => prev.filter(p => p.id !== event.detail.id));
        };
        window.addEventListener("pathfinder:topicDeleted", handleTopicDeleted);
        window.addEventListener("pathfinder:projectDeleted", handleProjectDeleted);
        return () => {
            window.removeEventListener("pathfinder:topicDeleted", handleTopicDeleted);
            window.removeEventListener("pathfinder:projectDeleted", handleProjectDeleted);
        };
    }, [router]);

    const [showSurpriseModal, setShowSurpriseModal] = useState(false);
    const [feeling, setFeeling] = useState("");
    const [isSurprising, setIsSurprising] = useState(false);

    const handleSurpriseMe = async () => {
        if (!feeling.trim()) return;
        setIsSurprising(true);
        try {
            // Generate a topic based on feeling
            const prompt = `Create a learning path for someone who is feeling: "${feeling}". Make it relevant and engaging.`;
            const topic = await api.generateTopic(localStorage.getItem("user_id") || "1", prompt, false);
            router.push(`/topic/${topic.id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to surprise you. Try again!");
        } finally {
            setIsSurprising(false);
            setShowSurpriseModal(false);
        }
    };

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [customTopicPrompt, setCustomTopicPrompt] = useState("");
    const [useHistoryForTopic, setUseHistoryForTopic] = useState(false);
    const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
    const [showTopicInterestsPrompt, setShowTopicInterestsPrompt] = useState(false);
    const [topicInterests, setTopicInterests] = useState(""); // Separate state for interests prompt

    const handleGenerateTopic = async () => {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;

        // If user wants to use history, check if they have any memory first
        if (useHistoryForTopic && !customTopicPrompt.trim()) {
            try {
                const { hasMemory } = await api.checkUserMemory(userId);
                if (!hasMemory) {
                    // Check localStorage for stored interests from Projects
                    const storedInterests = localStorage.getItem("user_interests");
                    if (storedInterests) {
                        // Generate directly using stored interests
                        setIsGeneratingTopic(true);
                        try {
                            const topic = await api.generateTopic(userId, `Based on my interests: ${storedInterests}`, false);
                            router.push(`/topic/${topic.id}`);
                        } finally {
                            setIsGeneratingTopic(false);
                            setShowGenerateModal(false);
                        }
                        return;
                    } else {
                        // No stored interests - show prompt asking for interests
                        setShowTopicInterestsPrompt(true);
                        return;
                    }
                }
            } catch (err) {
                console.error("Failed to check memory:", err);
                // Proceed anyway on error
            }
        }

        setIsGeneratingTopic(true);
        try {
            const topic = await api.generateTopic(userId, customTopicPrompt, useHistoryForTopic);
            router.push(`/topic/${topic.id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to generate topic");
        } finally {
            setIsGeneratingTopic(false);
            setShowGenerateModal(false);
        }
    };

    const [isPathsCollapsed, setIsPathsCollapsed] = useState(false);
    const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false);

    const isEmptyState = topics.length === 0 && projects.length === 0;

    return (
        <div className="min-h-screen p-8 animate-fade-in font-sans">
            {showLostMode && <WelcomeBackModal onClose={() => setShowLostMode(false)} />}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6 mt-12 md:mt-0">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                        Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Explorer</span>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base">Ready to discover something new today?</p>
                </div>

                {/* Gamification Stats */}
                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    <div className="group relative flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 cursor-help hover:bg-orange-500/20 transition-all whitespace-nowrap">
                        <FlameIcon className="w-5 h-5" />
                        <span className="font-bold">{gamification.streak}</span>
                        <div className="absolute top-full right-0 mt-2 w-32 p-2 bg-slate-900/90 backdrop-blur-md text-xs text-slate-300 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                            Current Streak: {gamification.streak} days
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {gamification.badges.map((badge, idx) => (
                            <div key={idx} className="group relative p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 cursor-help hover:bg-yellow-500/20 transition-all flex-shrink-0">
                                <TrophyIcon className="w-5 h-5" />
                                <div className="absolute top-full right-0 mt-2 w-max px-3 py-1 bg-slate-900/90 backdrop-blur-md text-xs text-slate-300 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                                    {badge}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isEmptyState ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center mb-8 border border-white/5 shadow-2xl shadow-cyan-900/20 animate-float">
                        <PathIcon className="w-12 h-12 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 text-center">Start Your Journey</h2>
                    <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed">
                        It looks like you haven't started any paths yet. Create your first learning path or let us surprise you with something interesting!
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" /> Create Path
                        </button>
                        <button
                            onClick={() => setShowSurpriseModal(true)}
                            className="px-8 py-4 bg-slate-800 rounded-xl font-bold text-slate-200 hover:bg-slate-700 transition-all border border-white/5 flex items-center gap-2"
                        >
                            <SurpriseIcon className="w-5 h-5 text-purple-400" /> Surprise Me
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Main Action Area */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="col-span-1 md:col-span-2 relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-900/20 group hover:shadow-cyan-900/40 transition-all hover:scale-[1.01]"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                <PlusIcon className="w-32 h-32" />
                            </div>
                            <div className="relative z-10 flex flex-col items-start h-full justify-between">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm mb-4 group-hover:rotate-12 transition-transform duration-300">
                                    <PlusIcon className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 text-left">Start a New Journey</h2>
                                    <p className="text-cyan-100/80 text-left">Create a custom learning path tailored just for you.</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => setShowSurpriseModal(true)}
                            className="relative overflow-hidden p-8 rounded-3xl bg-slate-800/50 border border-white/5 hover:bg-slate-800/80 transition-all group hover:scale-[1.01]"
                        >
                            <div className="absolute -bottom-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <SurpriseIcon className="w-32 h-32" />
                            </div>
                            <div className="relative z-10 flex flex-col items-start h-full justify-between">
                                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 mb-4 group-hover:animate-bounce">
                                    <SurpriseIcon className="w-8 h-8 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-200 mb-1 text-left">Surprise Me</h2>
                                    <p className="text-slate-400 text-sm text-left">Learn something random.</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Learning Paths (8 cols) */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                                    <PathIcon className="w-5 h-5 text-cyan-400" />
                                    Learning Paths
                                </h2>
                            </div>

                            {recommendation && recommendation.topic && (
                                <div className="glass-card p-6 rounded-3xl relative overflow-hidden group cursor-pointer" onClick={() => router.push(`/topic/${recommendation.topic.id}`)}>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
                                            <span className="animate-pulse w-2 h-2 bg-cyan-400 rounded-full"></span> Recommended
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{recommendation.topic.title}</h3>
                                        <p className="text-slate-400 mb-6 max-w-lg">{recommendation.topic.description}</p>
                                        <div className="flex items-center gap-4">
                                            <button className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-colors">
                                                Continue Path
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topics.map((topic, idx) => (
                                    <div
                                        key={topic.id}
                                        onClick={() => router.push(`/topic/${topic.id}`)}
                                        className="glass-card p-5 rounded-2xl cursor-pointer group flex flex-col justify-between min-h-[140px]"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors text-lg">{topic.title}</h3>
                                                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-4">{topic.description}</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                            <span className="px-2 py-1 bg-slate-800 rounded-lg border border-white/5 uppercase tracking-wider">{topic.difficulty}</span>
                                            <span>{topic.estimated_time} min</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Projects (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                                    <ProjectIcon className="w-5 h-5 text-emerald-400" />
                                    Projects
                                </h2>
                                <button onClick={() => router.push("/projects")} className="text-sm text-slate-500 hover:text-white transition-colors">View All</button>
                            </div>

                            <div className="space-y-4">
                                <div
                                    onClick={() => router.push("/projects")}
                                    className="p-4 border border-dashed border-slate-700 rounded-2xl flex items-center gap-4 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all cursor-pointer group"
                                >
                                    <div className="p-2 bg-slate-800 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                                        <PlusIcon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">New Project</span>
                                </div>

                                {projects.slice(0, 3).map((project, idx) => (
                                    <div
                                        key={project.id}
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                        className="glass-card p-5 rounded-2xl cursor-pointer group"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{project.title}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {project.status}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                                            <div
                                                className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                style={{ width: `${(project.current_step / project.steps.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-[#0B1120] p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl relative animate-scale-up">
                        <button
                            onClick={() => { setShowGenerateModal(false); setShowTopicInterestsPrompt(false); }}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>

                        {showTopicInterestsPrompt ? (
                            <>
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 rotate-3">
                                        <PlusIcon className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">Tell us about yourself</h3>
                                    <p className="text-slate-400 text-sm mt-2">We don't have any learning history for you yet. Share your interests so we can personalize your topic!</p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <textarea
                                        placeholder="e.g. I'm interested in AI, web development, data science..."
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 min-h-[100px] resize-none"
                                        value={topicInterests}
                                        onChange={(e) => setTopicInterests(e.target.value)}
                                        autoFocus
                                    />

                                    <button
                                        onClick={async () => {
                                            // Save interests to localStorage for sharing across Paths and Projects
                                            const rawInterests = topicInterests.trim();
                                            if (rawInterests) {
                                                localStorage.setItem("user_interests", rawInterests);
                                            }
                                            setShowTopicInterestsPrompt(false);
                                            setIsGeneratingTopic(true);
                                            try {
                                                const userId = localStorage.getItem("user_id");
                                                if (!userId) return;
                                                const topic = await api.generateTopic(userId, `Based on my interests: ${rawInterests}`, false);
                                                router.push(`/topic/${topic.id}`);
                                            } catch (err) {
                                                console.error(err);
                                                alert("Failed to generate topic");
                                            } finally {
                                                setIsGeneratingTopic(false);
                                                setShowGenerateModal(false);
                                                setTopicInterests("");
                                            }
                                        }}
                                        disabled={isGeneratingTopic || !topicInterests.trim()}
                                        className="mt-2 px-4 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20"
                                    >
                                        {isGeneratingTopic ? (
                                            <>
                                                <span className="animate-spin">↻</span> Generating...
                                            </>
                                        ) : (
                                            "Create Topic"
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 rotate-3">
                                        <PlusIcon className="w-8 h-8 text-cyan-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">New Topic</h3>
                                    <p className="text-slate-400 text-sm mt-2">What would you like to learn today?</p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <input
                                        type="text"
                                        placeholder="e.g. Quantum Physics, React Hooks..."
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                        value={customTopicPrompt}
                                        onChange={(e) => setCustomTopicPrompt(e.target.value)}
                                    />

                                    <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors group">
                                        <input
                                            type="checkbox"
                                            checked={useHistoryForTopic}
                                            onChange={(e) => setUseHistoryForTopic(e.target.checked)}
                                            className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-cyan-500"
                                        />
                                        <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Base on my learning history</span>
                                    </label>

                                    <button
                                        onClick={handleGenerateTopic}
                                        disabled={isGeneratingTopic}
                                        className="mt-2 px-4 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-cyan-900/20"
                                    >
                                        {isGeneratingTopic ? (
                                            <>
                                                <span className="animate-spin">↻</span> Generating...
                                            </>
                                        ) : (
                                            "Create Topic"
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Surprise Me Modal */}
            {showSurpriseModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-[#0B1120] p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl relative animate-scale-up">
                        <button
                            onClick={() => setShowSurpriseModal(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20 rotate-3">
                                <SurpriseIcon className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Surprise Me</h3>
                            <p className="text-slate-400 text-sm mt-2">How are you feeling right now?</p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="e.g. Curious, Adventurous, Tired..."
                                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600"
                                value={feeling}
                                onChange={(e) => setFeeling(e.target.value)}
                                autoFocus
                            />

                            <button
                                onClick={handleSurpriseMe}
                                disabled={isSurprising || !feeling.trim()}
                                className="mt-2 px-4 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-purple-900/20"
                            >
                                {isSurprising ? (
                                    <>
                                        <span className="animate-spin">↻</span> Surprising you...
                                    </>
                                ) : (
                                    "Surprise Me!"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
