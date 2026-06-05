import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';

const LOADING_MESSAGES = [
  "Turning your idea into reality...",
  "Wiring up your features...",
  "Generating your product screens...",
  "Adding the finishing touches...",
  "Almost ready..."
];

export default function MVPBuilding({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [msgIndex, setMsgIndex] = useState(0);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Cycle loading messages helper
  useEffect(() => {
    const handle = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(handle);
  }, []);

  // Trigger compilation on mounting
  useEffect(() => {
    let active = true;

    async function triggerCompile() {
      try {
        const token = localStorage.getItem('vibelab_token');
        if (!token) {
          toast.error('Session timeout, please log in.');
          navigateTo('/login');
          return;
        }

        // 1. Fetch current session detail to grab active ID
        const sessionRes = await fetch('/api/product/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!sessionRes.ok) {
          throw new Error('Failed to check active product session status');
        }

        const sessionData = await sessionRes.json();
        if (!sessionData.session?.id) {
          toast.error('No active workspace session found. Restart from Phase 2!');
          navigateTo('/phase/2');
          return;
        }

        const sessionId = sessionData.session.id;

        // 2. Issue approval and generation
        const approveRes = await fetch('/api/product/screens/approve', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: sessionId
          })
        });

        if (!approveRes.ok) {
          const errData = await approveRes.json();
          throw new Error(errData.error || 'MVP generation failed');
        }

        if (active) {
          toast.success('MVP compiled successfully! Welcome to your mentor preview.');
          navigateTo('/phase/2/review');
        }
      } catch (err: any) {
        console.error('Fatal compile error:', err);
        if (active) {
          setErrorStatus(err.message || 'Error occurred while generating code.');
        }
      }
    }

    triggerCompile();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#02050e] flex flex-col justify-center items-center text-white px-6 overflow-hidden select-none">
      {/* Immersive background lighting effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#C9A84C]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[180px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-md w-full text-center space-y-10 relative z-10 flex flex-col items-center">
        {!errorStatus ? (
          <>
            {/* Elegant Golden Spinner and particle pulse */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="w-24 h-24 rounded-full border-t-2 border-r-2 border-b-2 border-transparent border-t-[#C9A84C] border-r-[#E3C268] border-b-[#C9A84C]"
              />
              <motion.div
                animate={{ scale: [0.9, 1.1, 0.9] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute w-16 h-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center border border-[#C9A84C]/15"
              >
                <Sparkles className="w-6 h-6 text-[#C9A84C] animate-pulse" />
              </motion.div>
            </div>

            {/* Typography Labels */}
            <div className="space-y-3">
              <h2 className="font-bebas text-4xl sm:text-5xl tracking-[0.2em] text-[#C9A84C] leading-none">
                BUILDING YOUR MVP
              </h2>
              <p className="text-[10px] font-black tracking-widest font-jetbrains text-slate-500 uppercase">
                Step 5 of 10 • Automatic Synthesis Space
              </p>
            </div>

            {/* Cycling system messages */}
            <div className="h-14 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="text-slate-350 text-sm sm:text-base font-sans font-medium tracking-wide max-w-sm leading-relaxed"
                >
                  {LOADING_MESSAGES[msgIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Visual aesthetic spacer and security message */}
            <div className="pt-6 border-t border-slate-900 w-full">
              <p className="text-[10px] font-jetbrains text-cyan-400 uppercase tracking-[0.15em] animate-pulse">
                System Offline Isolation Enabled
              </p>
              <p className="text-[9px] text-slate-500 mt-1 max-w-xs mx-auto">
                All navigation and page actions are suspended until the functional prototype file is compiled and anchored.
              </p>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-3xl bg-slate-950 border border-rose-500/20 backdrop-blur-md space-y-6 flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>

            <div className="space-y-2">
              <h3 className="font-bebas text-2xl tracking-wider text-rose-400 uppercase">
                COMPILATION SUSPENDED
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans px-2">
                We encountered an error while synthesizing your MVP prototype:
                <span className="block mt-2 text-rose-300 font-mono text-[10px] p-2 bg-slate-900 rounded-md border border-slate-850 whitespace-pre-wrap select-text">
                  {errorStatus}
                </span>
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigateTo('/phase/2/screens')}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-black font-jetbrains text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer uppercase"
              >
                Go Back to Screens
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black font-jetbrains rounded-xl transition-all uppercase cursor-pointer shadow-lg shadow-rose-950/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                Retry Compile
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
