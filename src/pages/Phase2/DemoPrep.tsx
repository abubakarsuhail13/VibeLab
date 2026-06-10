import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Loader2, Play, Pause, RefreshCw, Edit2, Check, Sparkles, Award } from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

interface MVPData {
  id: number;
  session_id: number;
  demo_script: string;
  key_talking_points: string[];
}

export default function DemoPrep({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [scriptItems, setScriptItems] = useState<string[]>([]);
  const [talkingPoints, setTalkingPoints] = useState<string[]>([
    "Start with the problem, not your solution.",
    "Explain how user empathy drove your feature priorities.",
    "Keep mock flows brief so people look at your idea's magic.",
    "Conclude by detailing how fast real users gave you thumbs up!"
  ]);

  // Inline editing state helpers
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Countdown timer helpers
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds
  const [timerActive, setTimerActive] = useState(false);
  const [hasFinishedTimer, setHasFinishedTimer] = useState(false);

  useEffect(() => {
    fetchSessionDetails();
  }, []);

  // Timer logic hook
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            setHasFinishedTimer(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!timerActive && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const fetchSessionDetails = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      if (!token) {
        toast.error('Session timeout, please log in.');
        navigateTo('/login');
        return;
      }

      const res = await fetch('/api/product/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve active step session.');
      }

      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        if (data.mvp) {
          // If the script contains numbers like 1., 2. or newlines, parse it into an array of sections!
          const rawScript = data.mvp.demo_script || '';
          
          let parsed: string[] = [];
          if (rawScript.trim().length > 0) {
            // Split by lines or double-lines, filter out empty rows
            const lines = rawScript.split(/\n+/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);
            
            // Clean up any prefix numbering like "1. ", "Step 1: " for raw storage items
            parsed = lines.map((line: string) => {
              return line.replace(/^\d+[\.\:\-\s]+/, ''); // remove starting item numbers etc.
            });
          }

          if (parsed.length === 0) {
            parsed = [
              "Hook paragraph: Share the problem and why you built this wonderful app.",
              "Feature Showroom: Highlight your absolute favorite features and why users love them.",
              "Outro Pitch: Ask users what they thought and guide them on voting for your applet!"
            ];
          }

          setScriptItems(parsed);

          if (data.mvp.key_talking_points && Array.isArray(data.mvp.key_talking_points) && data.mvp.key_talking_points.length > 0) {
            setTalkingPoints(data.mvp.key_talking_points);
          }
        } else {
          toast.error('No compiled MVP found. Redirecting to compileLoading space...');
          navigateTo('/phase/2/building');
        }
      } else {
        toast.error('No active session found.');
        navigateTo('/phase/2');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error loading demo script.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(scriptItems[index]);
  };

  const handleSaveStep = () => {
    if (editingIndex === null) return;
    const copied = [...scriptItems];
    copied[editingIndex] = editingText;
    setScriptItems(copied);
    setEditingIndex(null);
    toast.success('Script section updated locally!');
  };

  const handleSaveComplete = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      
      // Re-construct numbered list from edited steps
      const fullCustomScript = scriptItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n\n');

      const res = await fetch('/api/product/demo/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          demo_script: fullCustomScript,
          key_talking_points: talkingPoints
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save presentation settings');
      }

      toast.success('Launch preparation approved! Completing Phase 2...');
      navigateTo('/phase/2/complete');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed saving your customized demo preparations.');
    } finally {
      setIsSaving(false);
    }
  };

  // Human timer formatter helper
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const resetTimer = () => {
    setTimeLeft(180);
    setTimerActive(false);
    setHasFinishedTimer(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">LOADING DEMO PRESENTATION PACKS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Immersive graphic neon backdrops */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#2563eb]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[0%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-400/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto px-6 py-12">
        
        {/* Step Progression Bar (Step 9 of 10) */}
        <Phase2Stepper activeStep={9} onNavigate={navigateTo} />

        {/* Branding & Header */}
        <div className="text-center md:text-left mb-10 space-y-3">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none">
            DEMO PREPARATION
          </h2>
          <p className="text-slate-650 text-base md:text-lg leading-relaxed max-w-3xl">
            You are almost ready to present! Use this interactive dashboard guide to prepare with confidence, refine your talking script, and practice.
          </p>
        </div>

        {/* 3 Sections Block */}
        <div className="space-y-12 mb-12">

          {/* SECTION 1 - DEMO SCRIPT */}
          <div className="bg-white/65 border border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-sm space-y-6 shadow-xl">
            <div>
              <span className="text-[10px] font-bold font-jetbrains tracking-wider text-[#2563eb] uppercase">
                SECTION 1
              </span>
              <h3 className="font-bebas text-3xl md:text-4xl tracking-widest mt-1 text-white uppercase">
                Your Interactive Demo Script
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Click any section of your presentation script to edit / tweak it to fit your style.
              </p>
            </div>

            {/* List entries */}
            <div className="space-y-4">
              {scriptItems.map((item, index) => (
                <div key={index} className="group relative">
                  {editingIndex === index ? (
                    <div className="p-5 rounded-2xl bg-white border border-[#2563eb]/50 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-[9px] font-black font-jetbrains text-slate-500">
                        <span>EDITING STEP {index + 1}</span>
                        <span className="text-[#2563eb]">PRESS SAVE COMPLETED</span>
                      </div>
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-white text-slate-700 text-sm px-4 py-3 rounded-xl border border-slate-200 focus:border-[#2563eb] outline-none font-sans leading-relaxed select-text"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="px-3 py-1.5 bg-white hover:bg-white text-slate-500 text-xs font-semibold rounded-md border border-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveStep}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#2563eb] hover:bg-[#3b82f6] text-black text-xs font-black rounded-md cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Section
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleStartEditing(index)}
                      className="p-5 rounded-2xl bg-slate-50/40 hover:bg-white/80 border border-slate-200 group-hover:border-slate-200 transition-all cursor-pointer flex items-start gap-4"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/35 flex items-center justify-center font-jetbrains text-xs font-black text-[#2563eb] shrink-0 mt-0.5 select-none">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-slate-600 font-sans text-sm md:text-base leading-relaxed select-text">
                          {item}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-550 font-jetbrains font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity select-none pt-1">
                          <Edit2 className="w-3 h-3" /> Click to Edit Step inline
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2 - KEY TALKING POINTS */}
          <div className="bg-white/65 border border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-sm space-y-6 shadow-xl">
            <div>
              <span className="text-[10px] font-bold font-jetbrains tracking-wider text-[#2563eb] uppercase">
                SECTION 2
              </span>
              <h3 className="font-bebas text-3xl md:text-4xl tracking-widest mt-1 text-white uppercase">
                Key Talking Points
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Startup mentors recommend anchoring these central insights during pitches to sound like a professional founder.
              </p>
            </div>

            {/* Gold-bordered cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {talkingPoints.map((point, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl bg-white/30 border border-[#2563eb]/20 hover:border-[#2563eb]/45 transition-colors flex items-start gap-3 shadow-md"
                >
                  <div className="w-2 h-2 rounded-full bg-[#2563eb] shrink-0 mt-2 animate-pulse" />
                  <p className="text-xs md:text-sm text-slate-600 font-medium font-sans leading-relaxed select-text">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3 - PRACTICE MODE */}
          <div className="bg-white/65 border border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-sm space-y-6 shadow-xl relative overflow-hidden">
            {/* Ambient accent light inside card */}
            <div className="absolute right-[-10%] top-[-10%] w-[120px] h-[120px] rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />

            <div>
              <span className="text-[10px] font-bold font-jetbrains tracking-wider text-cyan-400 uppercase">
                SECTION 3
              </span>
              <h3 className="font-bebas text-3xl md:text-4xl tracking-widest mt-1 text-white uppercase flex items-center gap-2">
                PRACTICE SPACE <Sparkles className="w-5 h-5 text-[#2563eb] animate-pulse" />
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                Refine your delivery! Play the countdown timer below to simulate presenting your product script to potential customers.
              </p>
            </div>

            {/* Timer component layout */}
            <div className="p-8 rounded-2xl bg-white/70 border border-slate-200 flex flex-col items-center text-center space-y-6 relative z-10 select-none">
              
              {/* Countdown panel */}
              <div className="space-y-2">
                <div className="font-jetbrains text-5xl md:text-7xl font-bold tracking-wider text-white tabular-nums animate-pulse">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-[10px] font-black font-jetbrains text-slate-500 tracking-widest uppercase">
                  3-Minute Showcase Timer
                </div>
              </div>

              {/* Status prompt */}
              <AnimatePresence mode="wait">
                {hasFinishedTimer ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-1 p-3 bg-emerald-950/20 border border-emerald-950/40 rounded-xl max-w-sm"
                  >
                    <Award className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-emerald-400">Great practice! You are ready to go.</p>
                  </motion.div>
                ) : (
                  <p className="text-xs text-slate-500 font-normal max-w-md leading-relaxed">
                    Practice presenting your product using the script above. Click Start when you are ready.
                  </p>
                )}
              </AnimatePresence>

              {/* Action Toggles */}
              <div className="flex gap-3">
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-xs font-black font-jetbrains tracking-widest uppercase transition-all shadow-md cursor-pointer ${
                    timerActive
                      ? 'bg-amber-500/10 border border-amber-500 text-amber-500 hover:bg-amber-500/20'
                      : 'bg-[#2563eb] hover:bg-[#3b82f6] text-black'
                  }`}
                >
                  {timerActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5 mr-2" /> PAUSE
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-2 fill-current" /> START
                    </>
                  )}
                </button>

                <button
                  onClick={resetTimer}
                  className="px-4 py-2.5 bg-white hover:bg-white border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-bold font-jetbrains rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4 border-t border-slate-200 select-none">
          <button
            onClick={() => navigateTo('/phase/2/explain')}
            className="px-6 py-4 bg-white border border-slate-200 hover:border-slate-200 text-slate-600 hover:text-slate-700 text-xs font-black font-jetbrains tracking-widest uppercase rounded-xl transition-all cursor-pointer"
          >
            Go Back to Features
          </button>

          <button
            onClick={handleSaveComplete}
            disabled={isSaving}
            className="inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs uppercase px-8 py-4 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2.5 animate-spin" />
                DRAFTING PITCH...
              </>
            ) : (
              <>
                I'm Ready — Complete Phase 2 <Award className="w-4 h-4 ml-2.5" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
