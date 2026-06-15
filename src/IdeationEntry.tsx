import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Loader2, Sparkles, ChevronRight, HelpCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { EducationalAiBackground } from "./components/EducationalAiBackground";

interface IdeationEntryProps {
  onNavigate: (page: string) => void;
}

export default function IdeationEntry({ onNavigate }: IdeationEntryProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const token = localStorage.getItem("vibelab_token");
        if (!token) return;

        const res = await fetch("/api/ideation/active-session", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.session_id) {
            setHasActiveSession(true);
          }
        }
      } catch (err) {
        console.error("Error checking active session:", err);
      } finally {
        setCheckingSession(false);
      }
    };
    checkActiveSession();
  }, []);

  const handleStart = async (forceNew = false) => {
    setLoading(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("vibelab_token");
      if (!token) {
        setErrorMsg("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/ideation/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ force_new: forceNew })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start ideation session.");
      }

      const data = await response.json();
      
      // Save session id to sessionStorage so chat can read it
      if (data.session_id) {
        sessionStorage.setItem("vibelab_ideation_session_id", String(data.session_id));
        onNavigate("ideation-chat");
      } else {
        throw new Error("Invalid response schema from server.");
      }
    } catch (err: any) {
      console.error("Error starting ideation:", err);
      setErrorMsg(err.message || "Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center px-6 relative overflow-hidden">
      <EducationalAiBackground isDark={false} />
      
      {/* Top Header Row with Back Button */}
      <div className="absolute top-0 left-0 right-0 h-20 px-6 sm:px-12 flex items-center justify-between z-30 max-w-5xl mx-auto w-full">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black font-jetbrains text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all uppercase tracking-wider cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyan-600 group-hover:-translate-x-0.5 transition-transform" />
          Exit to Dashboard
        </button>
        <div className="text-right flex items-center gap-2">
          <span className="font-jetbrains text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Phase 1
          </span>
        </div>
      </div>

      {/* Soft blue atmosphere backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-cyan-200/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-cyan-200/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Decorative center micro starfield */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#06b6d4_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center z-10 space-y-12">
        {/* Sparkle Header Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center"
        >
          <div className="relative p-4 rounded-full border border-cyan-200 bg-cyan-50/50 shadow-sm">
            <Sparkles className="w-8 h-8 text-cyan-600" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
        </motion.div>

        {/* Headline & Subtitle */}
        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-bebas text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wider text-slate-900 leading-none"
          >
            WHAT WILL <span className="gradient-text">YOU BUILD?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-dmsans text-lg sm:text-xl lg:text-2xl text-slate-500 font-semibold max-w-2xl mx-auto"
          >
            Answer 13 questions. Get your personalised AI project blueprint.
          </motion.p>
        </div>

        {/* Stat Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-4 py-4"
        >
          <div className="border border-slate-200 bg-white text-cyan-600 font-semibold font-jetbrains text-xs uppercase tracking-[0.15em] px-5 py-2 rounded-full shadow-sm">
            ⚡ 5 minutes
          </div>
          <div className="border border-slate-200 bg-white text-cyan-600 font-semibold font-jetbrains text-xs uppercase tracking-[0.15em] px-5 py-2 rounded-full shadow-sm">
            📝 13 questions
          </div>
          <div className="border border-slate-200 bg-white text-cyan-600 font-semibold font-jetbrains text-xs uppercase tracking-[0.15em] px-5 py-2 rounded-full shadow-sm">
            ✨ 1 blueprint
          </div>
        </motion.div>

        {/* Call To Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col items-center space-y-4"
        >
          {errorMsg && (
            <p className="text-red-600 font-jetbrains text-xs tracking-tight bg-red-50 px-4 py-2 rounded-lg border border-red-100">
              ⚠️ {errorMsg}
            </p>
          )}

          {checkingSession ? (
            <button
              disabled
              className="group relative inline-flex items-center justify-center gap-3 bg-slate-900/60 text-white/80 font-dmsans font-extrabold text-base md:text-lg px-8 py-4.5 rounded-2xl min-w-[220px]"
            >
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Checking suite status...</span>
            </button>
          ) : hasActiveSession ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => handleStart(false)}
                disabled={loading}
                className="group relative inline-flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-dmsans font-extrabold text-base md:text-lg px-8 py-4.5 rounded-2xl transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-slate-950/10 hover:shadow-cyan-500/10 disabled:opacity-50 min-w-[240px] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Entering Lab...</span>
                  </>
                ) : (
                  <>
                    <span>Continue Discovery</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1 text-cyan-400" />
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to start a new discovery session? Your current progress will be reset.")) {
                    handleStart(true);
                  }
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 text-slate-400 hover:text-red-500 font-jetbrains text-[10.5px] uppercase tracking-wide transition-colors bg-transparent border-none outline-none cursor-pointer mt-1 font-bold group"
              >
                <RefreshCw className="w-3.5 h-3.5 transition-transform group-hover:rotate-45" />
                <span>Start Fresh (Reset current progress)</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleStart(false)}
              disabled={loading}
              className="group relative inline-flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-dmsans font-extrabold text-base md:text-lg px-8 py-4.5 rounded-2xl transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-slate-950/10 hover:shadow-cyan-500/10 disabled:opacity-50 min-w-[220px] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entering Lab...</span>
                </>
              ) : (
                <>
                  <span>Start Ideation</span>
                  <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          )}

          <p className="font-dmsans text-xs text-slate-400 font-medium select-none tracking-tight">
            Used by student builders worldwide
          </p>
        </motion.div>
      </div>

      {/* Aesthetic Bottom Accents */}
      <div className="absolute bottom-8 left-8 hidden sm:flex items-center gap-2 text-slate-400 font-jetbrains text-[10px] tracking-widest uppercase">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span>VibeLab Ideation Suite</span>
      </div>
      <div className="absolute bottom-8 right-8 hidden sm:block text-slate-400 font-jetbrains text-[10px] tracking-widest uppercase">
        <span>PHASE 01</span>
      </div>
    </div>
  );
}
