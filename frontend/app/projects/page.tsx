"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PlusIcon, ProjectIcon, BrainIcon } from "@/components/Icons";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [completedTopics, setCompletedTopics] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [customPrompt, setCustomPrompt] = useState("");
    const [showInterestsModal, setShowInterestsModal] = useState(false);
    const [userInterests, setUserInterests] = useState("");
    const router = useRouter();

    useEffect(() => {
        const userId = localStorage.getItem("user_id");
        if (!userId) {
            router.push("/");
            return;
        }

        const fetchProjects = () => {
            api.getUserProjects(userId).then(setProjects).catch(console.error);
        };

        fetchProjects();

        // Fetch completed topics to allow generation
        api.getUserProgress(userId).then(progress => {
            // For MVP, we'll just fetch all topics and let user pick (simulating "completed")
            api.getTopics().then(setCompletedTopics).catch(console.error);
        }).catch(console.error);

        // Listen for delete events to dynamically update UI
        const handleProjectDeleted = (e: Event) => {
            const event = e as CustomEvent<{ id: number }>;
            setProjects(prev => prev.filter(p => p.id !== event.detail.id));
        };
        window.addEventListener("pathfinder:projectDeleted", handleProjectDeleted);
        return () => window.removeEventListener("pathfinder:projectDeleted", handleProjectDeleted);
    }, [router]);

    const handleGenerate = async (useHistoryOverride: boolean) => {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;

        // If user wants to use history, check if they have any memory first
        if (useHistoryOverride) {
            try {
                const { hasMemory } = await api.checkUserMemory(userId);
                if (!hasMemory) {
                    // Check localStorage for stored interests
                    const storedInterests = localStorage.getItem("user_interests");
                    if (storedInterests) {
                        // Use stored interests instead of asking again
                        setIsGenerating(true);
                        const topicIds = completedTopics.slice(0, 2).map(t => t.id);
                        const generated = await api.generateProject(userId, topicIds, `Based on my interests: ${storedInterests}`, false);
                        await api.createProject(userId, generated.title, generated.description, generated.steps);
                        const updatedProjects = await api.getUserProjects(userId);
                        setProjects(updatedProjects);
                        setIsGenerating(false);
                        return;
                    }
                    // No stored interests - show interests modal
                    setShowInterestsModal(true);
                    return;
                }
            } catch (err) {
                console.error("Failed to check memory:", err);
                // Proceed anyway on error
            }
        }

        setIsGenerating(true);
        try {
            // For MVP, just pick first 2 topics if no custom prompt
            const topicIds = completedTopics.slice(0, 2).map(t => t.id);

            // If using history, we don't need a custom prompt
            const promptToSend = useHistoryOverride ? "" : customPrompt;

            const generated = await api.generateProject(userId, topicIds, promptToSend, useHistoryOverride);
            await api.createProject(userId, generated.title, generated.description, generated.steps);

            // Refresh list
            const updatedProjects = await api.getUserProjects(userId);
            setProjects(updatedProjects);
            setCustomPrompt(""); // Reset
        } catch (err) {
            console.error(err);
            alert("Failed to generate project");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateFromInterests = async () => {
        const userId = localStorage.getItem("user_id");
        if (!userId || !userInterests.trim()) return;

        // Save interests to localStorage for sharing across Paths and Projects
        localStorage.setItem("user_interests", userInterests);

        setShowInterestsModal(false);
        setIsGenerating(true);
        try {
            const topicIds = completedTopics.slice(0, 2).map(t => t.id);
            // Use interests as the custom prompt
            const generated = await api.generateProject(userId, topicIds, `Based on my interests: ${userInterests}`, false);
            await api.createProject(userId, generated.title, generated.description, generated.steps);

            const updatedProjects = await api.getUserProjects(userId);
            setProjects(updatedProjects);
            setUserInterests("");
        } catch (err) {
            console.error(err);
            alert("Failed to generate project");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen p-8 animate-fade-in font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <ProjectIcon className="w-8 h-8 text-emerald-400" />
                        </div>
                        My Projects
                    </h1>
                    <p className="text-slate-400 mt-2 ml-14">Build real-world applications with AI guidance</p>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="What do you want to build?"
                            className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm w-full md:w-64 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-500 text-white"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                        />
                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:shadow-lg hover:shadow-emerald-900/20 font-bold disabled:opacity-50 whitespace-nowrap text-sm text-white transition-all hover:scale-105 active:scale-95"
                        >
                            {isGenerating ? "..." : "Generate"}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">or</span>
                        <button
                            onClick={() => handleGenerate(true)}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 font-medium disabled:opacity-50 whitespace-nowrap text-sm text-blue-300 flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-900/20"
                        >
                            <BrainIcon className="w-4 h-4" />
                            {isGenerating ? "Thinking..." : "Generate from Memory"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project, idx) => (
                    <div
                        key={project.id}
                        className="glass-card p-6 rounded-2xl cursor-pointer group hover:-translate-y-1"
                        style={{ animationDelay: `${idx * 50}ms` }}
                        onClick={() => router.push(`/projects/${project.id}`)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{project.title}</h2>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                {project.status}
                            </span>
                        </div>
                        <p className="text-slate-400 mb-6 text-sm line-clamp-3 leading-relaxed">{project.description}</p>

                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span className="font-medium uppercase tracking-wider">Progress</span>
                            <span className="font-mono text-emerald-400">{Math.round((project.current_step / project.steps.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                style={{ width: `${(project.current_step / project.steps.length) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {projects.length === 0 && !isGenerating && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <ProjectIcon className="w-16 h-16 mb-4 text-slate-700" />
                    <p className="text-xl font-medium text-slate-400">No projects yet</p>
                    <p className="text-sm mt-2">Complete topics to unlock AI-generated projects!</p>
                </div>
            )}

            {/* Interests Modal for Cold-Start */}
            {showInterestsModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-[#0B1120] p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl relative animate-scale-up">
                        <button
                            onClick={() => setShowInterestsModal(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 rotate-3">
                                <BrainIcon className="w-8 h-8 text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Tell us about yourself</h3>
                            <p className="text-slate-400 text-sm mt-2">We don't have any learning history for you yet. Share your interests so we can personalize your project!</p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <textarea
                                placeholder="e.g. I'm interested in machine learning, web development, and data visualization..."
                                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 min-h-[100px] resize-none"
                                value={userInterests}
                                onChange={(e) => setUserInterests(e.target.value)}
                                autoFocus
                            />

                            <button
                                onClick={handleGenerateFromInterests}
                                disabled={isGenerating || !userInterests.trim()}
                                className="mt-2 px-4 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-white hover:opacity-90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="animate-spin">↻</span> Generating...
                                    </>
                                ) : (
                                    "Generate Project"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
