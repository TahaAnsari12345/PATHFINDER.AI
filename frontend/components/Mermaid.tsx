"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
});

interface MermaidProps {
    chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isRendering, setIsRendering] = useState(false);
    const lastRenderedChart = useRef<string>("");

    useEffect(() => {
        // Debounce rendering to avoid flashing during rapid streaming updates
        // and only render if content has actually changed meaningfully
        if (ref.current && chart !== lastRenderedChart.current) {
            const renderDiagram = async () => {
                try {
                    setIsRendering(true);
                    // Clear previous content safely
                    ref.current!.innerHTML = '';

                    // Generate unique ID
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                    // Insert container
                    const container = document.createElement('div');
                    container.className = "mermaid";
                    container.id = id;
                    container.textContent = chart;
                    ref.current!.appendChild(container);

                    // Render
                    await mermaid.run({
                        nodes: [container],
                    });

                    lastRenderedChart.current = chart;
                } catch (err) {
                    // Don't log expected parsing errors during streaming
                    // mermaid.run throws string errors or objects depending on version
                    const errorMessage = err instanceof Error ? err.message : String(err);

                    if (process.env.NODE_ENV === 'development') {
                        console.debug("Mermaid rendering failed (likely incomplete syntax):", errorMessage);
                    }

                    // Show subtle loading/error state
                    // Show error state with raw code option
                    ref.current!.innerHTML = `
                        <div class="flex flex-col items-center gap-2 p-4 border border-red-500/20 rounded-lg bg-red-500/5">
                            <div class="text-red-400 text-sm font-medium">Failed to render diagram</div>
                            <div class="text-slate-500 text-xs">Syntax error in Mermaid code</div>
                            <details class="w-full mt-2">
                                <summary class="cursor-pointer text-xs text-slate-400 hover:text-white transition-colors">View Raw Code</summary>
                                <pre class="mt-2 p-2 bg-slate-950 rounded text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">${chart.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                            </details>
                        </div>
                    `;
                } finally {
                    setIsRendering(false);
                }
            };

            // Small delay to let streaming settle if it's very fast
            const timeoutId = setTimeout(renderDiagram, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [chart]);

    return <div ref={ref} className="overflow-x-auto my-6 flex items-center justify-center transition-all" />;
}

// Memoize to prevent re-renders when parent re-renders but chart code is same
export const MemoizedMermaid = React.memo(Mermaid, (prev, next) => {
    return prev.chart === next.chart;
});
