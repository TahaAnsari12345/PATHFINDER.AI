"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        const res = await api.login(email, password);
        localStorage.setItem("user_id", res.user_id);
        if (res.is_lost_mode) {
          localStorage.setItem("is_lost_mode", "true");
        }
        router.push("/dashboard");
      } else {
        await api.signup(email, password);
        alert("Signup successful! Please login.");
        setIsLogin(true);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="mb-8 text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 mb-6 shadow-2xl shadow-cyan-900/20 backdrop-blur-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            AIML <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Pathfinder</span>
          </h1>
          <p className="text-slate-400 text-lg">Your personalized AI learning journey</p>
        </div>

        <div className="bg-[#0F1629]/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl shadow-black/50 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex gap-4 mb-8 p-1 bg-slate-800/50 rounded-xl border border-white/5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${isLogin
                ? "bg-slate-700 text-white shadow-lg shadow-black/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${!isLogin
                ? "bg-slate-700 text-white shadow-lg shadow-black/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/20 hover:shadow-cyan-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          © 2024 AIML Pathfinder. All rights reserved.
        </p>
      </div>
    </div>
  );
}
