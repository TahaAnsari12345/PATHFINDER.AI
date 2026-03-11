"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { HomeIcon, PathIcon, ProjectIcon, ChevronRightIcon, SearchIcon, SettingsIcon, TrashIcon, XIcon } from "./Icons";
import { api } from "@/lib/api";

interface SidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<{ topics: any[], projects: any[] }>({ topics: [], projects: [] });
    const [showManage, setShowManage] = useState(false);
    const [manageTab, setManageTab] = useState<"topics" | "projects">("topics");
    const [items, setItems] = useState<any[]>([]);

    const isActive = (path: string) => {
        if (path === "/dashboard" && pathname === "/dashboard") return true;
        if (path !== "/dashboard" && pathname.startsWith(path)) return true;
        return false;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Implement search logic or redirect
            // For now, let's just log or maybe redirect to a search page if we had one.
            // But the user said "Remove any search bar or search UI from the home/dashboard".
            // Maybe we just filter the dashboard? Or redirect to a search result page?
            // The previous implementation had a search bar on dashboard.
            // Let's assume we redirect to dashboard with a query param or just use global search context if we had one.
            // For this MVP, let's just console log as a placeholder or maybe redirect to dashboard?
            console.log("Searching for:", searchQuery);
        }
    };

    const fetchItems = async () => {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;
        try {
            if (manageTab === "topics") {
                // We don't have a "getUserTopics" endpoint, but we have "getTopics".
                // Assuming user can delete any topic for now (or maybe just ones they created if we tracked that).
                // The prompt implies user can delete paths.
                const data = await api.getTopics();
                setItems(data);
            } else {
                const data = await api.getUserProjects(userId);
                setItems(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (showManage) {
            fetchItems();
        }
    }, [showManage, manageTab]);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this?")) return;
        try {
            if (manageTab === "topics") {
                await api.deleteTopic(id);
                // Dispatch custom event for dynamic UI update
                window.dispatchEvent(new CustomEvent("pathfinder:topicDeleted", { detail: { id } }));
                if (pathname === `/topic/${id}`) {
                    router.push("/dashboard");
                }
            } else {
                await api.deleteProject(id);
                // Dispatch custom event for dynamic UI update
                window.dispatchEvent(new CustomEvent("pathfinder:projectDeleted", { detail: { id } }));
                if (pathname === `/projects/${id}`) {
                    router.push("/dashboard");
                }
            }
            await fetchItems(); // Refresh

            // Check if user has any remaining memory after delete
            // If no memory left, clear stored interests so they'll be prompted again
            const userId = localStorage.getItem("user_id");
            if (userId) {
                try {
                    const { hasMemory } = await api.checkUserMemory(userId);
                    if (!hasMemory) {
                        localStorage.removeItem("user_interests");
                    }
                } catch {
                    // Ignore errors
                }
            }
        } catch (e) {
            alert("Failed to delete");
        }
    };

    // Don't show sidebar on login/signup page
    if (pathname === "/") return null;

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={toggleCollapse}
                className="md:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-800/80 backdrop-blur-md text-slate-200 rounded-lg border border-white/10 shadow-lg"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Overlay for mobile */}
            {!isCollapsed && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
                    onClick={toggleCollapse}
                />
            )}

            <aside
                className={`fixed left-0 top-0 h-screen bg-[#0B1120]/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out 
                    ${isCollapsed ? "-translate-x-full md:translate-x-0 md:w-20" : "translate-x-0 w-64"}
                `}
            >
                <div className={`p-6 border-b border-white/5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent whitespace-nowrap overflow-hidden tracking-tight">
                            Pathfinder
                        </h1>
                    )}
                    <button
                        onClick={toggleCollapse}
                        className="hidden md:block p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors border border-white/5"
                    >
                        <ChevronRightIcon className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`} />
                    </button>
                    {/* Mobile Close Button */}
                    <button
                        onClick={toggleCollapse}
                        className="md:hidden p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors border border-white/5"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Section */}
                <div className={`px-4 py-4 ${isCollapsed ? "flex justify-center" : ""}`}>
                    {isCollapsed ? (
                        <button
                            onClick={() => { toggleCollapse(); setIsSearchOpen(true); }}
                            className="hidden md:block p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-white/5"
                        >
                            <SearchIcon className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="relative group">
                            <form onSubmit={handleSearch}>
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (e.target.value.trim().length > 1) {
                                            api.search(e.target.value).then(setSearchResults).catch(console.error);
                                            setIsSearchOpen(true);
                                        } else {
                                            setSearchResults({ topics: [], projects: [] });
                                            setIsSearchOpen(false);
                                        }
                                    }}
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all placeholder:text-slate-600"
                                />
                            </form>

                            {/* Search Results Dropdown */}
                            {isSearchOpen && searchQuery.trim().length > 1 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B1120] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                                    {searchResults.topics.length === 0 && searchResults.projects.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500 text-sm">No results found</div>
                                    ) : (
                                        <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                            {searchResults.topics.length > 0 && (
                                                <div className="p-2">
                                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-1">Paths</h3>
                                                    {searchResults.topics.map((topic: any) => (
                                                        <button
                                                            key={topic.id}
                                                            onClick={() => {
                                                                router.push(`/topic/${topic.id}`);
                                                                setIsSearchOpen(false);
                                                                setSearchQuery("");
                                                                if (window.innerWidth < 768) toggleCollapse();
                                                            }}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/50 text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                                                        >
                                                            <PathIcon className="w-3 h-3 text-cyan-500" />
                                                            <span className="truncate">{topic.title}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {searchResults.projects.length > 0 && (
                                                <div className="p-2 border-t border-white/5">
                                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-1 mt-1">Projects</h3>
                                                    {searchResults.projects.map((project: any) => (
                                                        <button
                                                            key={project.id}
                                                            onClick={() => {
                                                                router.push(`/projects/${project.id}`);
                                                                setIsSearchOpen(false);
                                                                setSearchQuery("");
                                                                if (window.innerWidth < 768) toggleCollapse();
                                                            }}
                                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/50 text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                                                        >
                                                            <ProjectIcon className="w-3 h-3 text-emerald-500" />
                                                            <span className="truncate">{project.title}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    <Link
                        href="/dashboard"
                        onClick={() => window.innerWidth < 768 && toggleCollapse()}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive("/dashboard")
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                            } ${isCollapsed ? "justify-center" : ""}`}
                    >
                        <HomeIcon className="w-5 h-5 min-w-[20px]" />
                        {!isCollapsed && <span className="font-medium">Home</span>}
                    </Link>

                    <Link
                        href="/topic"
                        onClick={() => window.innerWidth < 768 && toggleCollapse()}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive("/topic")
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                            } ${isCollapsed ? "justify-center" : ""}`}
                    >
                        <PathIcon className="w-5 h-5 min-w-[20px]" />
                        {!isCollapsed && <span className="font-medium">Paths</span>}
                    </Link>

                    <Link
                        href="/projects"
                        onClick={() => window.innerWidth < 768 && toggleCollapse()}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive("/projects")
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                            } ${isCollapsed ? "justify-center" : ""}`}
                    >
                        <ProjectIcon className="w-5 h-5 min-w-[20px]" />
                        {!isCollapsed && <span className="font-medium">Projects</span>}
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer group ${isCollapsed ? "justify-center" : ""}`}>
                        <div className="w-8 h-8 min-w-[32px] rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-cyan-900/20">
                            U
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 flex items-center justify-between overflow-hidden">
                                <div className="flex flex-col whitespace-nowrap overflow-hidden">
                                    <span className="text-sm font-medium text-slate-200">User</span>
                                    <span className="text-xs text-slate-500">Learner</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowManage(true); }}
                                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                                >
                                    <SettingsIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Manage Modal */}
            {showManage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B1120]/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-[#0B1120] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] animate-scale-up">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-200">Manage Content</h2>
                            <button onClick={() => setShowManage(false)} className="text-slate-400 hover:text-white transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex border-b border-white/5 p-1 mx-4 mt-4 bg-slate-900/50 rounded-xl">
                            <button
                                onClick={() => setManageTab("topics")}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${manageTab === "topics" ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                            >
                                Learning Paths
                            </button>
                            <button
                                onClick={() => setManageTab("projects")}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${manageTab === "projects" ? "bg-slate-800 text-cyan-400 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                            >
                                Projects
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {items.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">No items found.</p>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-white/5 group hover:border-white/10 hover:bg-slate-800/50 transition-all">
                                        <span className="text-sm text-slate-300 truncate max-w-[200px] font-medium">{item.title}</span>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
