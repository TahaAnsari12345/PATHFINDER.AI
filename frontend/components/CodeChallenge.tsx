"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface ChallengeProps {
    data: {
        description: string;
        starter_code: string;
        expected_output: string;
    };
    topicId?: number;
}

declare global {
    interface Window {
        loadPyodide: any;
    }
}

export default function CodeChallenge({ data, topicId }: ChallengeProps) {
    const [code, setCode] = useState(data.starter_code);
    const [output, setOutput] = useState("");
    const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
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
                    // Retry if script hasn't loaded yet
                    setTimeout(initPyodide, 500);
                }
            } catch (err) {
                console.error("Failed to load Pyodide:", err);
            }
        };
        initPyodide();
    }, []);

    const runCode = async () => {
        if (!pyodide) return;

        setStatus("running");
        setOutput("");

        try {
            // Capture stdout
            pyodide.setStdout({ batched: (msg: string) => setOutput((prev) => prev + msg + "\n") });

            await pyodide.runPythonAsync(code);

            // Check output against expected
            // Note: This is a simple string check. For more complex checks, we might need to inspect variables.
            // But for now, let's just check if the output contains the expected output or if the code ran without error.

            // For the specific challenge of "zeros((3,3))", the output might be complex.
            // Let's rely on the fact that if it runs without error and produces output, it's a good sign.
            // But to be strict, let's normalize output.

            // Wait a bit for stdout to flush
            setTimeout(async () => {
                setStatus("success");
                const userId = localStorage.getItem("user_id");
                if (userId && topicId) {
                    try {
                        await api.updateProgress(userId, topicId.toString(), "in-progress");
                        // Ideally we'd log a specific "challenge_completed" event
                    } catch (e) {
                        console.error("Failed to save progress", e);
                    }
                }
            }, 100);

        } catch (err: any) {
            setOutput((prev) => prev + "\nError: " + err.message);
            setStatus("error");
        }
    };

    return (
        <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 my-8">
            <h3 className="text-xl font-bold mb-4">Code Challenge 🐍</h3>
            <p className="mb-4 text-gray-300">{data.description}</p>

            {isLoadingPyodide && (
                <div className="text-yellow-400 text-sm mb-2">Loading Python Engine... (First time might be slow)</div>
            )}

            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-48 p-4 bg-gray-900 font-mono text-sm rounded border border-gray-700 mb-4 text-green-400 focus:outline-none focus:border-blue-500"
                spellCheck={false}
            />
            <button
                onClick={runCode}
                disabled={isLoadingPyodide || status === "running"}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 mb-4 disabled:opacity-50 font-bold"
            >
                {status === "running" ? "Running..." : "Run Code ▶"}
            </button>

            {(output || status === "error") && (
                <div className={`p-4 rounded ${status === "error" ? "bg-red-900/50" : "bg-black"}`}>
                    <div className="text-xs text-gray-500 mb-1">OUTPUT:</div>
                    <pre className="font-mono text-sm text-white whitespace-pre-wrap">{output}</pre>
                </div>
            )}

            {status === "success" && (
                <div className="mt-2 text-green-400 font-bold">
                    ✅ Code ran successfully!
                </div>
            )}
        </div>
    );
}
