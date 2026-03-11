"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const pathname = usePathname();
    const isAuthPage = pathname === "/";

    return (
        <div className="flex min-h-screen">
            {!isAuthPage && (
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            )}
            <main
                className={`flex-1 transition-all duration-300 ease-in-out ${!isAuthPage ? (isSidebarCollapsed ? "md:ml-20" : "md:ml-64") : ""
                    } ml-0`}
            >
                {children}
            </main>
        </div>
    );
}
