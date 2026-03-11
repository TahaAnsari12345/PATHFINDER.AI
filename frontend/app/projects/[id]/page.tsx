"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import ReactMarkdown from "react-markdown";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css"; // Dark theme for code
import AITutor from "@/components/AITutor";
import { RobotIcon, PathIcon } from "@/components/Icons";

export default function ProjectWorkspace() {
    const { id } = useParams();
    const [project, setProject] = useState<any>(null);
    const [code, setCode] = useState("");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"guide" | "ai" | "code">("guide");

    useEffect(() => {
        if (id) {
            const projectId = Array.isArray(id) ? id[0] : id;
            api.getProjectDetail(projectId).then(data => {
                setProject(data);
                if (data.code_files && data.code_files["main.py"]) {
                    setCode(data.code_files["main.py"]);
                }
            }).catch(console.error);
        }
    }, [id]);

    const [pyodide, setPyodide] = useState<any>(null);
    const [isLoadingPyodide, setIsLoadingPyodide] = useState(true);

    useEffect(() => {
        const initPyodide = async () => {
            try {
                if (window.loadPyodide) {
                    const py = await window.loadPyodide();
                    await py.loadPackage("numpy");
                    setPyodide(py);
                    setIsLoadingPyodide(false);
                } else {
                    setTimeout(initPyodide, 500);
                }
            } catch (err) {
                console.error("Failed to load Pyodide:", err);
            }
        };
        initPyodide();
    }, []);

    const handleVerify = async () => {
        if (!project || !pyodide) return;

        setIsVerifying(true);
        setFeedback(null);

        try {
            let localOutput = "";
            pyodide.setStdout({ batched: (msg: string) => localOutput += msg + "\n" });

            await pyodide.runPythonAsync(code);

            const currentStep = project.steps[project.current_step];
            const codeWithOutput = `CODE:\n${code}\n\nOUTPUT:\n${localOutput}`;

            const result = await api.verifyStep(project.id, codeWithOutput, currentStep.instruction);

            if (result.passed) {
                setFeedback("✅ Passed! " + result.feedback);
                const updated = await api.getProjectDetail(project.id);
                setProject(updated);
            } else {
                setFeedback("❌ Failed. " + result.feedback);
            }
        } catch (err: any) {
            console.error(err);
            setFeedback("❌ Execution Error: " + err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    if (!project) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-200">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400">Loading Workspace...</p>
            </div>
        </div>
    );

    const currentStep = project.steps[project.current_step];
    const isCompleted = project.status === "completed";

    return (
        <div className="min-h-[100dvh] bg-[#0B1120] text-slate-200 flex flex-col h-[100dvh] font-sans overflow-hidden animate-fade-in">
            {/* Minimal Header */}
            <div className="px-6 py-4 bg-[#0B1120]/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/projects")}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">{project.title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">main.py</span>
                </div>
            </div>

            {/* Mobile View - hidden on desktop */}
            <div className="md:hidden flex flex-col flex-1 overflow-hidden">
                {/* Mobile Tab Navigation */}
                <div className="flex border-b border-white/5 bg-[#0B1120] shrink-0">
                    <button
                        onClick={() => setActiveTab("guide")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "guide" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400"}`}
                    >
                        Guide
                    </button>
                    <button
                        onClick={() => setActiveTab("code")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "code" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400"}`}
                    >
                        Code
                    </button>
                    <button
                        onClick={() => setActiveTab("ai")}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "ai" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400"}`}
                    >
                        AI Tutor
                    </button>
                </div>

                {/* Mobile Content */}
                {/* Left Panel Content for Mobile */}
                <div className={`flex-1 flex flex-col bg-[#0B1120] min-h-0 ${activeTab === 'code' ? 'hidden' : 'flex'}`}>
                    <div className="flex-1 overflow-hidden relative min-h-0">
                        {activeTab === "guide" && (
                            <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent animate-fade-in">
                                <div className="max-w-xl mx-auto">
                                    <div className="mb-8">
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-full border border-cyan-500/20 uppercase tracking-wider">
                                                Step {project.current_step + 1} of {project.steps.length}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
                                            {currentStep?.title}
                                        </h2>
                                        {isCompleted ? (
                                            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400 text-center animate-scale-up">
                                                <div className="text-6xl mb-6">🎉</div>
                                                <h3 className="text-2xl font-bold mb-2">Project Completed!</h3>
                                                <p className="text-emerald-400/80">You've successfully finished this project.</p>
                                            </div>
                                        ) : (
                                            <div className="prose prose-invert prose-p:text-slate-400 prose-p:leading-relaxed prose-pre:bg-[#131b2c] prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl prose-code:text-cyan-300 prose-headings:text-slate-200">
                                                <ReactMarkdown>{currentStep?.instruction}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    {!isCompleted && (
                                        <div className="mt-12 pt-8 border-t border-white/5">
                                            <h3 className="font-bold text-slate-500 mb-4 text-xs uppercase tracking-wider">Progress</h3>
                                            <div className="space-y-2">
                                                {project.steps.map((step: any, idx: number) => (
                                                    <div key={idx} className={`flex items-center gap-3 text-sm p-3 rounded-xl transition-all ${idx === project.current_step ? 'bg-slate-800/50 text-white border border-white/5' : idx < project.current_step ? 'text-emerald-400 opacity-70' : 'text-slate-600'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${idx === project.current_step ? 'bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]' : idx < project.current_step ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                                        <span className="font-medium truncate">{step.title}</span>
                                                        {idx < project.current_step && <span className="ml-auto">✓</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === "ai" && (
                            <div className="h-full animate-fade-in flex flex-col min-h-0">
                                <AITutor
                                    topic={{ id: project.id, title: project.title, description: `${project.description}\n\n**Current Step (${project.current_step + 1}/${project.steps.length}):** ${currentStep?.title}\n\n${currentStep?.instruction || ''}` }}
                                    projectId={project.id}
                                    onComplete={() => { }}
                                    onToggleHistory={() => { }}
                                    isProjectMode={true}
                                />
                            </div>
                        )}
                    </div>
                </div>
                {/* Code Editor for Mobile */}
                <div className={`flex-1 flex flex-col bg-[#0F1629] relative min-h-0 ${activeTab === 'code' ? 'flex' : 'hidden'}`}>
                    <div className="flex-1 relative overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <Editor
                            value={code}
                            onValueChange={code => setCode(code)}
                            highlight={code => highlight(code, languages.python, 'python')}
                            padding={32}
                            className="font-mono text-sm min-h-full"
                            style={{ fontFamily: '"Fira Code", "Fira Mono", monospace', fontSize: 15, backgroundColor: "transparent", lineHeight: "1.6" }}
                            textareaClassName="focus:outline-none"
                        />
                    </div>
                    {/* Bottom Bar for Mobile */}
                    <div className="p-4 bg-[#0F1629]/90 backdrop-blur-sm border-t border-white/5 flex flex-col justify-between items-center gap-4 shrink-0">
                        <div className="w-full order-2">
                            {feedback && (
                                <div className={`relative text-sm px-4 py-3 rounded-xl border animate-slide-up shadow-lg flex items-start justify-between gap-3 ${feedback.startsWith("✅") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10" : feedback.startsWith("💡") ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-900/10" : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-900/10"}`}>
                                    <span className="break-words">{feedback}</span>
                                    <button onClick={() => setFeedback(null)} className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        {!isCompleted && (
                            <div className="flex gap-3 w-full order-1">
                                <button
                                    onClick={async () => {
                                        if (!project) return;
                                        setFeedback("💡 Thinking...");
                                        try {
                                            const res = await api.getProjectHint(project.id, code, currentStep.instruction);
                                            setFeedback("💡 Hint: " + res.hint);
                                        } catch (e) { setFeedback("Error getting hint"); }
                                    }}
                                    className="flex-1 px-4 py-2.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl font-medium transition-all text-sm text-center"
                                >
                                    Get Hint
                                </button>
                                <button onClick={handleVerify} disabled={isVerifying} className="flex-1 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/20 text-sm flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
                                    {isVerifying ? (<><span className="animate-spin">↻</span> Verifying...</>) : "Run & Verify"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop Resizable Panels - hidden on mobile */}
            <div className="hidden md:flex flex-1 overflow-hidden min-h-0">
                <PanelGroup direction="horizontal" className="flex flex-1 overflow-hidden relative min-h-0">
                    {/* Left Panel: Guide & AI Tutor */}
                    <Panel defaultSize={35} minSize={20} maxSize={60} className="flex flex-col bg-[#0B1120] min-h-0">
                        {/* Desktop Tab Navigation */}
                        <div className="flex items-center p-2 gap-1 border-b border-white/5">
                            <button
                                onClick={() => setActiveTab("guide")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "guide" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
                            >
                                <PathIcon className="w-4 h-4" /> Guide
                            </button>
                            <button
                                onClick={() => setActiveTab("ai")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "ai" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
                            >
                                <RobotIcon className="w-4 h-4" /> AI Tutor
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden relative min-h-0">
                            {activeTab === "guide" && (
                                <div className="h-full overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent animate-fade-in">
                                    <div className="max-w-xl mx-auto">
                                        <div className="mb-8">
                                            <div className="flex items-center gap-2 mb-6">
                                                <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-full border border-cyan-500/20 uppercase tracking-wider">
                                                    Step {project.current_step + 1} of {project.steps.length}
                                                </span>
                                            </div>

                                            <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
                                                {currentStep?.title}
                                            </h2>

                                            {isCompleted ? (
                                                <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400 text-center animate-scale-up">
                                                    <div className="text-6xl mb-6">🎉</div>
                                                    <h3 className="text-2xl font-bold mb-2">Project Completed!</h3>
                                                    <p className="text-emerald-400/80">You've successfully finished this project.</p>
                                                </div>
                                            ) : (
                                                <div className="prose prose-invert prose-p:text-slate-400 prose-p:leading-relaxed prose-pre:bg-[#131b2c] prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl prose-code:text-cyan-300 prose-headings:text-slate-200">
                                                    <ReactMarkdown>{currentStep?.instruction}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>

                                        {!isCompleted && (
                                            <div className="mt-12 pt-8 border-t border-white/5">
                                                <h3 className="font-bold text-slate-500 mb-4 text-xs uppercase tracking-wider">Progress</h3>
                                                <div className="space-y-2">
                                                    {project.steps.map((step: any, idx: number) => (
                                                        <div key={idx} className={`flex items-center gap-3 text-sm p-3 rounded-xl transition-all ${idx === project.current_step
                                                            ? 'bg-slate-800/50 text-white border border-white/5'
                                                            : idx < project.current_step
                                                                ? 'text-emerald-400 opacity-70'
                                                                : 'text-slate-600'
                                                            }`}>
                                                            <div className={`w-2 h-2 rounded-full ${idx === project.current_step ? 'bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]' :
                                                                idx < project.current_step ? 'bg-emerald-500' : 'bg-slate-700'
                                                                }`} />
                                                            <span className="font-medium truncate">{step.title}</span>
                                                            {idx < project.current_step && <span className="ml-auto">✓</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "ai" && (
                                <div className="h-full animate-fade-in flex flex-col min-h-0">
                                    <AITutor
                                        topic={{
                                            id: project.id,
                                            title: project.title,
                                            description: `${project.description}\n\n**Current Step (${project.current_step + 1}/${project.steps.length}):** ${currentStep?.title}\n\n${currentStep?.instruction || ''}`
                                        }}
                                        projectId={project.id}
                                        onComplete={() => { }}
                                        onToggleHistory={() => { }}
                                        isProjectMode={true}
                                    />
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* Resize Handle */}
                    <PanelResizeHandle className="w-1.5 bg-transparent hover:bg-cyan-500/50 active:bg-cyan-500/70 transition-colors cursor-col-resize group flex items-center justify-center">
                        <div className="w-0.5 h-12 bg-white/10 group-hover:bg-cyan-400/50 rounded-full transition-colors" />
                    </PanelResizeHandle>

                    {/* Right Panel: Code Editor */}
                    <Panel defaultSize={65} minSize={30} className="flex flex-col bg-[#0F1629] relative min-h-0">
                        <div className="flex-1 relative overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                            <Editor
                                value={code}
                                onValueChange={code => setCode(code)}
                                highlight={code => highlight(code, languages.python, 'python')}
                                padding={32}
                                className="font-mono text-sm min-h-full"
                                style={{
                                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                                    fontSize: 15,
                                    backgroundColor: "transparent",
                                    lineHeight: "1.6"
                                }}
                                textareaClassName="focus:outline-none"
                            />
                        </div>

                        {/* Bottom Bar */}
                        <div className="p-4 bg-[#0F1629]/90 backdrop-blur-sm border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0 shrink-0">
                            <div className="w-full md:flex-1 md:mr-4 order-2 md:order-1">
                                {feedback && (
                                    <div className={`relative text-sm px-4 py-3 rounded-xl border animate-slide-up shadow-lg flex items-start justify-between gap-3 ${feedback.startsWith("✅")
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10"
                                        : feedback.startsWith("💡")
                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-900/10"
                                            : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-900/10"
                                        }`}>
                                        <span className="break-words">{feedback}</span>
                                        <button
                                            onClick={() => setFeedback(null)}
                                            className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                            {!isCompleted && (
                                <div className="flex gap-3 w-full md:w-auto order-1 md:order-2">
                                    <button
                                        onClick={async () => {
                                            if (!project) return;
                                            setFeedback("💡 Thinking...");
                                            try {
                                                const res = await api.getProjectHint(project.id, code, currentStep.instruction);
                                                setFeedback("💡 Hint: " + res.hint);
                                            } catch (e) {
                                                setFeedback("Error getting hint");
                                            }
                                        }}
                                        className="flex-1 md:flex-none px-4 py-2.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl font-medium transition-all text-sm text-center"
                                    >
                                        Get Hint
                                    </button>
                                    <button
                                        onClick={handleVerify}
                                        disabled={isVerifying}
                                        className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/20 text-sm flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                                    >
                                        {isVerifying ? (
                                            <>
                                                <span className="animate-spin">↻</span> Verifying...
                                            </>
                                        ) : (
                                            "Run & Verify"
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}

