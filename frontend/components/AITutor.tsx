import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { api } from "@/lib/api";
import FlashcardDeck from "./FlashcardDeck";
import Quiz from "./Quiz";
import { MemoizedMermaid as Mermaid } from "./Mermaid";
import { RobotIcon, HistoryIcon, PencilIcon, CopyIcon } from "./Icons";

interface Message {
    id?: number;
    role: "user" | "ai";
    content: string;
    type?: "text" | "quiz" | "flashcard" | "code";
    data?: any;
}

interface AITutorProps {
    topic: any;
    projectId?: number;
    onComplete: () => void;
    onToggleHistory: () => void;
    onHistoryItemAdded?: (item: { type: "code" | "quiz" | "flashcard" | "mermaid"; data: any }) => void;
    onHistoryReset?: () => void;
    isProjectMode?: boolean;
}

export default function AITutor({ topic, projectId, onComplete, onToggleHistory, onHistoryItemAdded, onHistoryReset, isProjectMode }: AITutorProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [socraticMode, setSocraticMode] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");
    const [userMessageCount, setUserMessageCount] = useState(0);
    const [isCountLoaded, setIsCountLoaded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Persist message count with daily reset
    useEffect(() => {
        const userId = localStorage.getItem("user_id");
        if (!userId || !topic?.id) return;

        const key = `msg_count_${userId}_${topic.id}`;
        const stored = localStorage.getItem(key);
        const today = new Date().toDateString();

        if (stored) {
            try {
                const { count, date } = JSON.parse(stored);
                if (date === today) {
                    setUserMessageCount(count);
                } else {
                    // Reset if date is different (new day)
                    setUserMessageCount(0);
                }
            } catch (e) {
                console.error("Failed to parse stored message count", e);
            }
        }
        setIsCountLoaded(true);
    }, [topic?.id]);

    useEffect(() => {
        if (!isCountLoaded) return;

        const userId = localStorage.getItem("user_id");
        if (!userId || !topic?.id) return;

        const key = `msg_count_${userId}_${topic.id}`;
        const today = new Date().toDateString();
        localStorage.setItem(key, JSON.stringify({ count: userMessageCount, date: today }));
    }, [userMessageCount, topic?.id, isCountLoaded]);

    const extractHistoryItems = (content: string, type: Message["type"], data: any) => {
        if (!onHistoryItemAdded) return;

        // 1. Extract Code
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            if (match[1] === "json") continue; // Skip special blocks

            if (match[1] === "mermaid") {
                onHistoryItemAdded({
                    type: "mermaid",
                    data: { language: "mermaid", code: match[2], timestamp: new Date() }
                });
            } else {
                onHistoryItemAdded({
                    type: "code",
                    data: { language: match[1] || "text", code: match[2], timestamp: new Date() }
                });
            }
        }

        // 2. Extract Quiz/Flashcard
        if (type === "quiz" && data) {
            // Normalize data to array
            let cleanData = data;
            if (!Array.isArray(data)) {
                if (data.questions && Array.isArray(data.questions)) {
                    cleanData = [data]; // Wrap in array to match expected structure of [QuizObject]
                } else {
                    cleanData = [data]; // Fallback
                }
            }

            // Remove timestamp if present in data to avoid duplication issues
            if (Array.isArray(cleanData)) {
                cleanData = cleanData.map((item: any) => {
                    const { timestamp, ...rest } = item;
                    return rest;
                });
            }

            onHistoryItemAdded({ type: "quiz", data: cleanData });
        } else if (type === "flashcard" && data) {
            // Normalize data to array
            let cleanData = data;
            if (!Array.isArray(data)) {
                if (data.flashcards && Array.isArray(data.flashcards)) {
                    cleanData = data.flashcards;
                } else {
                    cleanData = [data]; // Fallback
                }
            }

            // Remove timestamp if present
            if (Array.isArray(cleanData)) {
                cleanData = cleanData.map((item: any) => {
                    const { timestamp, ...rest } = item;
                    return rest;
                });
            }

            onHistoryItemAdded({ type: "flashcard", data: cleanData });
        }
    };

    const parseAIResponse = (text: string) => {
        let content = text;
        let type: Message["type"] = "text";
        let data = null;

        if (text.includes("[SHOW_FLASHCARDS]")) {
            const jsonMatch = /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/.exec(text);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (Array.isArray(parsed)) {
                        data = parsed;
                    } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
                        data = parsed.flashcards;
                    } else {
                        data = [parsed];
                    }
                    type = "flashcard";
                    content = text.replace("[SHOW_FLASHCARDS]", "").replace(jsonMatch[0], "").trim();
                } catch (e) {
                    console.error("Failed to parse flashcards", e);
                }
            }
        } else if (text.includes("[SHOW_QUIZ]")) {
            const jsonMatch = /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/.exec(text);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    if (Array.isArray(parsed)) {
                        data = parsed;
                    } else if (parsed.questions && Array.isArray(parsed.questions)) {
                        data = [parsed];
                    } else {
                        data = [parsed];
                    }
                    type = "quiz";
                    content = text.replace("[SHOW_QUIZ]", "").replace(jsonMatch[0], "").trim();
                } catch (e) {
                    console.error("Failed to parse quiz", e);
                }
            }
        }

        return { content, type, data };
    };

    const readStream = async (response: Response, updateMessage: (text: string) => void) => {
        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            updateMessage(fullText);
            scrollToBottom();
        }
        return fullText;
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setUserMessageCount(prev => prev + 1);
        setInput("");
        setLoading(true);

        setMessages(prev => [...prev, { role: "ai", content: "", type: "text" }]);

        try {
            const userId = localStorage.getItem("user_id") || "1";
            const currentHistory = messages.map(m => ({
                role: m.role === "ai" ? "model" : "user",
                parts: [m.content]
            }));
            currentHistory.push({ role: "user", parts: [userMsg.content] });

            const res = await api.streamChatTutor(currentHistory, input, socraticMode, projectId ? null : topic.id, userId, projectId);

            await readStream(res, (text) => {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: text };
                    return newMsgs;
                });
            });

            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                const { content, type, data } = parseAIResponse(lastMsg.content);
                newMsgs[newMsgs.length - 1] = { ...lastMsg, content, type, data };
                setTimeout(() => extractHistoryItems(content, type, data), 0);
                return newMsgs;
            });

            // Refetch history to get database IDs for new messages
            const history = await api.getChatHistory(projectId ? null : topic.id, userId, projectId);
            const formatted: Message[] = history.map((h: any) => {
                let content = h.parts[0];
                let type: Message["type"] = "text";
                let data = null;

                if (h.parsed) {
                    content = h.parsed.content;
                    type = h.parsed.type;
                    data = h.parsed.data;
                } else if (h.role === "model") {
                    const parsed = parseAIResponse(content);
                    if (parsed.type !== "text") {
                        content = parsed.content;
                        type = parsed.type as Message["type"];
                        data = parsed.data;
                    }
                }

                return {
                    id: h.id,
                    role: h.role === "model" ? "ai" : "user",
                    content,
                    type,
                    data
                } as Message;
            });
            setMessages(formatted);

        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: "Error: Failed to get response." };
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (messageId: number) => {
        if (!editContent.trim()) return;
        setEditingMessageId(null);
        setLoading(true);

        let truncatedMessages: Message[] = [];
        setMessages(prev => {
            const index = prev.findIndex(m => m.id === messageId);
            if (index === -1) return prev;
            truncatedMessages = prev.slice(0, index + 1).map(m => m.id === messageId ? { ...m, content: editContent } : m);
            return truncatedMessages;
        });

        if (onHistoryReset) {
            onHistoryReset();
            truncatedMessages.forEach(msg => {
                if (msg.role === "ai") {
                    extractHistoryItems(msg.content, msg.type || "text", msg.data);
                }
            });
        }

        setMessages(prev => [...prev, { role: "ai", content: "", type: "text" }]);

        try {
            const userId = localStorage.getItem("user_id") || "1";
            const res = await api.streamEditMessage(messageId, editContent, userId, projectId ? null : topic.id, socraticMode, projectId);

            await readStream(res, (text) => {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: text };
                    return newMsgs;
                });
            });

            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                const { content, type, data } = parseAIResponse(lastMsg.content);
                newMsgs[newMsgs.length - 1] = { ...lastMsg, content, type, data };
                setTimeout(() => extractHistoryItems(lastMsg.content, type, data), 0);
                return newMsgs;
            });

        } catch (error) {
            console.error(error);
            alert("Failed to edit message");
        } finally {
            setLoading(false);
        }
    };

    const handleQuizComplete = async (score: number, total: number, incorrectQuestions?: { question: string; userAnswer: string; correctAnswer: string }[], attempt: number = 1) => {
        let feedbackRequest = "";

        if (attempt > 1) {
            feedbackRequest = `I retook the quiz (Attempt #${attempt}) and scored ${score} out of ${total}.`;
        } else {
            feedbackRequest = `I just completed the quiz and scored ${score} out of ${total}.`;
        }

        if (incorrectQuestions && incorrectQuestions.length > 0) {
            feedbackRequest += "\n\nI got the following questions wrong:\n";
            incorrectQuestions.forEach((q, i) => {
                feedbackRequest += `${i + 1}. Question: "${q.question}"\n   My Answer: "${q.userAnswer}"\n   Correct Answer: "${q.correctAnswer}"\n`;
            });
            feedbackRequest += "\nCan you explain why my answers were wrong and help me understand the correct concepts?";
        } else {
            feedbackRequest += " Can you give me some feedback?";
        }

        // Add user message to UI
        const userMsg: Message = { role: "user", content: feedbackRequest };
        setMessages(prev => [...prev, userMsg]);
        setUserMessageCount(prev => prev + 1);
        setLoading(true);

        // Add placeholder AI message
        setMessages(prev => [...prev, { role: "ai", content: "", type: "text" }]);

        try {
            const userId = localStorage.getItem("user_id") || "1";
            const currentHistory = messages.map(m => ({
                role: m.role === "ai" ? "model" : "user",
                parts: [m.content]
            }));
            currentHistory.push({ role: "user", parts: [feedbackRequest] });

            const res = await api.streamChatTutor(currentHistory, feedbackRequest, socraticMode, projectId ? null : topic.id, userId, projectId);

            await readStream(res, (text) => {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: text };
                    return newMsgs;
                });
            });

            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                const { content, type, data } = parseAIResponse(lastMsg.content);
                newMsgs[newMsgs.length - 1] = { ...lastMsg, content, type, data };
                setTimeout(() => extractHistoryItems(lastMsg.content, type, data), 0);
                return newMsgs;
            });

        } catch (error) {
            console.error(error);
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: "Error: Failed to get feedback." };
                return newMsgs;
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userId = localStorage.getItem("user_id") || "1";
        api.getChatHistory(projectId ? null : topic.id, userId, projectId).then(history => {
            const formatted: Message[] = history.map((h: any) => {
                let content = h.parts[0];
                let type = "text";
                let data = null;

                if (h.parsed) {
                    content = h.parsed.content;
                    type = h.parsed.type;
                    data = h.parsed.data;
                } else if (h.role === "model") {
                    const parsed = parseAIResponse(content);
                    if (parsed.type !== "text") {
                        content = parsed.content;
                        type = parsed.type;
                        data = parsed.data;
                    }
                }

                return {
                    id: h.id,
                    role: h.role === "model" ? "ai" : "user",
                    content,
                    type,
                    data
                };
            });
            setMessages(formatted);

            formatted.forEach(msg => {
                if (msg.role === "ai") {
                    extractHistoryItems(msg.content, msg.type || "text", msg.data);
                }
            });
        }).catch(console.error);
    }, [topic.id, projectId]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const markdownComponents = useMemo(() => ({
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            return !inline && match ? (
                match[1] === "mermaid" ? (
                    <Mermaid chart={codeString} />
                ) : (
                    <div className="relative group/code">
                        <div className="flex justify-between items-center px-4 py-2 bg-[#2d2d2d] rounded-t-xl border-b border-white/5">
                            <span className="text-xs font-mono text-slate-400">{match[1]}</span>
                            <button
                                onClick={() => copyToClipboard(codeString)}
                                className="text-slate-400 hover:text-white transition-colors"
                                title="Copy Code"
                            >
                                <CopyIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: "0.75rem", borderBottomRightRadius: "0.75rem", padding: "1.5rem" }}
                            {...props}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </div>
                )
            ) : null;
        }
    }), []);

    return (
        <div className="flex flex-col h-full relative font-sans">
            {!isProjectMode && (
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
                    <div className="pointer-events-auto">
                        <button
                            onClick={() => router.back()}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            onClick={() => setSocraticMode(!socraticMode)}
                            className={`p-2 rounded-xl transition-all ${socraticMode ? "bg-purple-500/20 text-purple-300" : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800"}`}
                            title={socraticMode ? "Socratic Mode On" : "Enable Socratic Mode"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </button>
                        <button
                            onClick={onToggleHistory}
                            className="p-2 bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                            title="History"
                        >
                            <HistoryIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onComplete}
                            disabled={userMessageCount < 5}
                            className={`p-2 rounded-xl transition-all ${userMessageCount >= 5
                                ? "bg-slate-800/50 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-slate-800/20 text-slate-600 cursor-not-allowed"
                                }`}
                            title={userMessageCount < 5 ? `Send ${5 - userMessageCount} more messages to complete` : "Complete Topic"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex-1 overflow-y-auto px-4 md:px-0 pb-32 ${isProjectMode ? 'pt-4' : 'pt-20'} scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent`}>
                <div className="max-w-5xl mx-auto space-y-8">
                    {messages.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
                                <RobotIcon className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-medium text-slate-200 mb-2">{topic.title}</h3>
                            <p className="text-slate-500 text-center max-w-sm leading-relaxed text-sm">
                                {topic.description}
                            </p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-slide-up group`}>
                                    {editingMessageId === msg.id ? (
                                        <div className="w-full max-w-[75%] bg-slate-800 p-3 md:p-4 rounded-2xl rounded-tr-sm border border-blue-500/30 relative">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full bg-transparent text-slate-200 outline-none resize-none text-base leading-relaxed scrollbar-thin scrollbar-thumb-slate-600"
                                                rows={Math.max(1, Math.min(10, editContent.split('\n').length))}
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button
                                                    onClick={() => setEditingMessageId(null)}
                                                    className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                                                    title="Cancel"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => msg.id && handleEdit(msg.id)}
                                                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                                                    title="Save & Regenerate"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 transition-all relative ${msg.role === "user"
                                                ? "bg-slate-800 text-slate-200 rounded-2xl rounded-tr-sm"
                                                : "bg-transparent text-slate-300 pl-0"
                                                }`}>


                                                <div className="prose prose-invert max-w-none 
                                                    prose-p:text-base prose-p:leading-relaxed prose-p:text-slate-300 prose-p:my-3 prose-p:first:mt-0
                                                    prose-headings:text-slate-100 prose-headings:font-bold prose-headings:tracking-tight
                                                    prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-4 prose-h1:first:mt-0 prose-h1:text-white prose-h1:pb-3 prose-h1:border-b prose-h1:border-slate-700
                                                    prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:first:mt-0 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-800
                                                    prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-h3:first:mt-0
                                                    prose-ul:my-3 prose-ul:text-sm prose-ul:text-slate-300 prose-ul:leading-relaxed
                                                    prose-ol:my-3 prose-ol:text-sm prose-ol:text-slate-300 prose-ol:leading-relaxed
                                                    prose-li:my-1 prose-li:leading-relaxed
                                                    prose-strong:text-white prose-strong:font-bold
                                                    prose-em:text-slate-200 prose-em:italic
                                                    prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                                                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400 prose-blockquote:my-4
                                                    prose-hr:border-slate-700 prose-hr:my-6
                                                    prose-table:border prose-table:border-slate-700 prose-table:my-6
                                                    prose-th:bg-slate-800 prose-th:p-2 prose-th:text-left prose-th:font-semibold
                                                    prose-td:border prose-td:border-slate-700 prose-td:p-2
                                                    prose-pre:bg-[#1e1e1e] prose-pre:p-0 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-pre:my-6
                                                    prose-a:text-blue-400 prose-a:underline prose-a:hover:text-blue-300">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={markdownComponents}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>

                                                {/* Render Interactive Components */}
                                                {msg.type === "flashcard" && msg.data && (
                                                    <div className="mt-6 not-prose">
                                                        <FlashcardDeck cards={msg.data} onClose={() => { }} mode="inline" />
                                                    </div>
                                                )}
                                                {msg.type === "quiz" && msg.data && (
                                                    <div className="mt-6 not-prose">
                                                        <Quiz
                                                            data={msg.data}
                                                            topicId={topic.id}
                                                            mode="inline"
                                                            onComplete={handleQuizComplete}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`flex items-center gap-2 mt-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                                <button
                                                    onClick={() => copyToClipboard(msg.content)}
                                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="Copy Message"
                                                >
                                                    <CopyIcon className="w-3.5 h-3.5" />
                                                </button>
                                                {msg.role === "user" && msg.id && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingMessageId(msg.id || null);
                                                            setEditContent(msg.content);
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                        title="Edit Message"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Loading Indicator */}
                            {loading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                                <div className="flex flex-col items-start animate-slide-up">
                                    <div className="max-w-[85%] md:max-w-[80%] p-4 md:p-6 bg-transparent text-slate-300 pl-0">
                                        <div className="flex gap-1.5 items-center">
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 flex justify-center z-20 pointer-events-none bg-gradient-to-t from-[#0B1120] via-[#0B1120]/90 to-transparent">
                <div className="w-full max-w-5xl relative pointer-events-auto group">
                    <textarea
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (!loading) handleSend();
                            }
                        }}
                        placeholder="Ask anything..."
                        disabled={loading}
                        rows={1}
                        className="w-full bg-slate-800/90 backdrop-blur-xl text-slate-200 pl-6 pr-14 py-4 rounded-2xl border border-white/5 focus:border-white/10 focus:ring-0 outline-none shadow-2xl shadow-black/50 transition-all placeholder:text-slate-500 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-y-auto min-h-[56px] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-3 top-3 bottom-3 w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-0 disabled:scale-75"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div >
    );
}
