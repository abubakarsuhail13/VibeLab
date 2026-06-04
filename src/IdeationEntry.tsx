import React, { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Sparkles, ChevronRight, HelpCircle } from "lucide-react";

interface IdeationEntryProps {
  onNavigate: (page: string) => void;
}

export default function IdeationEntry({ onNavigate }: IdeationEntryProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStart = async () => {
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
    <div className="min-h-screen bg-[#040814] text-[#E2E8F0] flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Golden/Lux atmosphere backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#C9A84C]/5 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#C9A84C]/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Decorative center micro starfield */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#C9A84C_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center z-10 space-y-12">
        {/* Sparkle Header Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center"
        >
          <div className="relative p-4 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5">
            <Sparkles className="w-8 h-8 text-[#C9A84C]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A84C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C9A84C]"></span>
            </span>
          </div>
        </motion.div>

        {/* Headline & Subtitle */}
        <div className="space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-bebas text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#F3EFE0] to-[#C9A84C] leading-none"
          >
            WHAT WILL YOU BUILD?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-dmsans text-lg sm:text-xl lg:text-2xl text-slate-400 font-light max-w-2xl mx-auto"
          >
            Answer 13 questions. Get your personalised AI project blueprint.
          </motion.p>
        </div>

        {/* 3 Gold-bordered Stat Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-wrap justify-center items-center gap-4 py-4"
        >
          <div className="border border-[#C9A84C]/40 bg-[#C9A84C]/5 text-[#C9A84C] font-jetbrains text-xs uppercase tracking-[0.15em] px-5 py-2 rounded-full shadow-lg shadow-[#000]/50 backdrop-blur-md">
            ⚡ 5 minutes
          </div>
          <div className="border border-[#C9A84C]/40 bg-[#C9A84C]/5 text-[#C9A84C] font-jetbrains text-xs uppercase tracking-[0.15em] px-5 py-2 rounded-full shadow-lg shadow-[#000]/50 backdrop-blur-md">
            📝 13 questions
          </div>
          <div className="border border-[#C9A84C]/40 bg-[#C9A84C]/5 text-[#C9A84C] font-jetbrains text-xs uppercase tracking-[0.15em] px-5 py-2 rounded-full shadow-lg shadow-[#000]/50 backdrop-blur-md">
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
            <p className="text-red-400 font-jetbrains text-xs tracking-tight bg-red-950/40 px-4 py-2 rounded-lg border border-red-900/40">
              ⚠️ {errorMsg}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className="group relative inline-flex items-center justify-center gap-3 bg-[#C9A84C] hover:bg-[#D9B95C] text-black font-dmsans font-extrabold text-base md:text-lg px-8 py-4.5 rounded-2xl transition-all duration-300 transform active:scale-[0.98] shadow-2xl shadow-[#C9A84C]/20 disabled:opacity-50 min-w-[220px]"
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

          <p className="font-dmsans text-xs text-slate-500 font-medium select-none tracking-tight">
            Used by student builders worldwide
          </p>
        </motion.div>
      </div>

      {/* Aesthetic Bottom Accents */}
      <div className="absolute bottom-8 left-8 hidden sm:flex items-center gap-2 text-slate-500 font-jetbrains text-[10px] tracking-widest uppercase">
        <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
        <span>VibeLab Ideation Suite</span>
      </div>
      <div className="absolute bottom-8 right-8 hidden sm:block text-slate-500 font-jetbrains text-[10px] tracking-widest uppercase">
        <span>PHASE 01</span>
      </div>
    </div>
  );
}
