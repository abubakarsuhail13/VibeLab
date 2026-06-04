import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Zap,
  Cpu,
  Bookmark,
  Compass,
  CheckCircle,
  HelpCircle,
  Award,
  Terminal,
  Grid,
  TrendingUp,
  X
} from "lucide-react";

interface IntroPageProps {
  onNavigate: (page: string) => void;
  onUpdateUser?: (user: any) => void;
}

export default function IntroPage({ onNavigate, onUpdateUser }: IntroPageProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for back
  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = () => {
    if (currentSlide < 10) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 1) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      const token = localStorage.getItem("vibelab_token");
      const res = await fetch("/api/user/intro-complete", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const storedUser = localStorage.getItem("vibelab_user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.intro_completed = true;
            localStorage.setItem("vibelab_user", JSON.stringify(parsed));
            if (onUpdateUser) onUpdateUser(parsed);
          } catch (_) {}
        }
        onNavigate("ideation");
      } else {
        onNavigate("ideation");
      }
    } catch (err) {
      console.error(err);
      onNavigate("ideation");
    } finally {
      setIsCompleting(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, isCompleting]);

  // Touch Swipe Controls
  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (diff > 50) {
      // swipe left -> Next
      handleNext();
    } else if (diff < -50) {
      // swipe right -> Back
      handleBack();
    }
  };

  // Framer Motion Animation Variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div 
      className="min-h-screen bg-[#0A0A0F] text-[#F3F4F6] flex flex-col justify-between selection:bg-[#C9A84C]/30 selection:text-[#C9A84C] font-dmsans relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background visual overrides per slide */}
      {currentSlide === 1 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Drifting Gold Particles */}
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#C9A84C]/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `scale(${Math.random() * 1.5 + 0.5})`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${Math.random() * 10 + 10}s`,
                marginTop: `${Math.random() * -300}px`
              }}
            />
          ))}
        </div>
      )}

      {currentSlide === 10 && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: "radial-gradient(circle at 50% 50%, #C9A84C 0%, transparent 60%)"
          }}
        />
      )}

      {/* Top Header Row */}
      <div className="flex items-center justify-between px-6 py-6 md:px-12 z-20">
        <div className="text-xs md:text-sm font-jetbrains text-slate-500 font-bold bg-slate-900/50 px-3.5 py-1.5 rounded-full border border-slate-800/80">
          <span className="text-[#C9A84C]">{currentSlide}</span> / 10
        </div>
        <button
          onClick={handleComplete}
          className="text-xs md:text-sm text-slate-400 hover:text-white font-jetbrains uppercase tracking-widest font-bold transition-all flex items-center gap-1 bg-slate-900/45 px-4 py-2 rounded-xl hover:bg-slate-800 border border-slate-800/60"
        >
          Skip Intro <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slides Viewport */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-8 max-w-5xl mx-auto w-full z-10 py-8">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full flex flex-col items-center text-center"
          >
            {/* Slide 1 - Welcome */}
            {currentSlide === 1 && (
              <div className="space-y-8 max-w-3xl">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="text-7xl md:text-8xl select-none"
                >
                  🚀
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-8xl font-bebas tracking-wide leading-none text-white">
                    WHERE IDEAS <span className="text-[#C9A84C]">BECOME REALITY</span>
                  </h1>
                  <center>
                    <div className="w-[60px] h-[2px] bg-[#C9A84C]" />
                  </center>
                </div>
                <div className="space-y-4 text-emerald-100/90 text-base md:text-lg max-w-xl mx-auto">
                  <p className="font-medium text-slate-400">Have you ever thought...</p>
                  <div className="space-y-2.5 text-left bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
                    <p className="flex items-center gap-3">💡 <span className="font-semibold text-slate-200">There should be an easier way to do this.</span></p>
                    <p className="flex items-center gap-3">💡 <span className="font-semibold text-slate-200">Why hasn't anyone fixed this problem?</span></p>
                    <p className="flex items-center gap-3">💡 <span className="font-semibold text-slate-200">I have an idea that could help people.</span></p>
                  </div>
                </div>
                <p className="text-[#C9A84C] font-bold text-sm md:text-base tracking-wide uppercase font-jetbrains">
                  At VibeLab, those ideas don't stay in your imagination. They become real projects.
                </p>
              </div>
            )}

            {/* Slide 2 - Why your ideas matter */}
            {currentSlide === 2 && (
              <div className="space-y-8 max-w-3xl">
                <div className="flex justify-center gap-6 select-none">
                  {[..."💡🌍⚡"].map((emoji, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.2, type: "spring", stiffness: 200 }}
                      className="text-5xl md:text-6xl"
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  YOUR IDEAS CAN <span className="text-[#C9A84C]">CHANGE THINGS</span>
                </h2>
                <div className="text-slate-300 text-base md:text-xl space-y-4 max-w-xl mx-auto leading-relaxed">
                  <p>
                    Every app, every tool, every product you use today started as one person's idea.
                  </p>
                  <p className="text-slate-400">
                    That person was no different from you. They just decided to build it.
                  </p>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-6 py-5 rounded-2xl max-w-xl mx-auto"
                >
                  <p className="text-[#C9A84C] font-bold text-sm md:text-base">
                    "The world's best solutions came from people who refused to accept that problems couldn't be solved."
                  </p>
                </motion.div>
              </div>
            )}

            {/* Slide 3 - What is AI */}
            {currentSlide === 3 && (
              <div className="space-y-8 max-w-4xl w-full">
                <motion.div 
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="text-6xl select-none"
                >
                  🤖
                </motion.div>
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  MEET YOUR CO-BUILDER: <span className="text-[#C9A84C]">AI</span>
                </h2>
                <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto">
                  Artificial Intelligence is a tool that helps you think, design, write, and build — faster than ever before.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4">
                  {[
                    { icon: "🧠", text: "AI understands your ideas" },
                    { icon: "⚙️", text: "AI helps you build them" },
                    { icon: "🚀", text: "AI brings them to life" }
                  ].map((card, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      className="border border-[#C9A84C]/20 bg-slate-900/60 hover:border-[#C9A84C]/40 p-6 rounded-2xl flex flex-col items-center gap-3 transition-colors"
                    >
                      <span className="text-4xl">{card.icon}</span>
                      <p className="font-bold text-slate-100 text-sm md:text-base">{card.text}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="text-slate-400 text-xs md:text-sm uppercase tracking-widest font-jetbrains">
                  You are the creator. AI is your assistant.
                </p>
              </div>
            )}

            {/* Slide 4 - What is VibeLab */}
            {currentSlide === 4 && (
              <div className="space-y-8 max-w-3xl">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 bg-[#C9A84C] rounded-full animate-ping" />
                  <span className="font-bebas text-3xl md:text-4xl text-white tracking-widest">VIBELAB</span>
                </div>
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white leading-none">
                  VIBELAB IS YOUR <span className="text-[#C9A84C]">BUILDER PLATFORM</span>
                </h2>
                <div className="space-y-3 pt-2">
                  {[
                    "You don't need to be a programmer.",
                    "You don't need to be a technology expert.",
                    "You don't need to know how to code."
                  ].map((line, idx) => (
                    <motion.p
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.2 }}
                      className="text-slate-300 font-semibold text-base md:text-lg"
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
                <center>
                  <div className="w-12 h-[2px] bg-[#C9A84C]/40" />
                </center>
                <p className="text-[#C9A84C] font-bold text-base md:text-xl">
                  All you need is curiosity, creativity, and a willingness to learn.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {["🎯 Problem Solver", "💡 Innovator", "🏗️ Builder"].map((pill, idx) => (
                    <span 
                      key={idx} 
                      className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-bold font-jetbrains text-xs rounded-full shadow-sm hover:border-[#C9A84C]/30 transition-colors"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 5 - 5 Phases */}
            {currentSlide === 5 && (
              <div className="space-y-8 max-w-5xl w-full">
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  YOUR PROJECT LIFECYCLE HAS <span className="text-[#C9A84C]">5 PHASES</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 w-full">
                  {[
                    { phase: "PHASE 1", title: "Ideation", icon: "🔍", desc: "Brainstorm and discover your project" },
                    { phase: "PHASE 2", title: "Product Creation", icon: "🏗️", desc: "Build modular custom tools" },
                    { phase: "PHASE 3", title: "Testing & Validation", icon: "🧪", desc: "Validate logic and run sandbox tests" },
                    { phase: "PHASE 4", title: "Deployment", icon: "🚀", desc: "Deploy your containerized service live" },
                    { phase: "PHASE 5", title: "Portfolio", icon: "🏆", desc: "Show your verified badges to the world" }
                  ].map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      className="bg-slate-900/60 border border-slate-800 hover:border-[#C9A84C]/40 rounded-2xl p-5 flex flex-col justify-between text-left transition-all hover:scale-[1.02] group"
                    >
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase font-jetbrains text-[#C9A84C] tracking-widest">{step.phase}</span>
                        <div className="text-3xl py-2 group-hover:scale-110 transition-transform">{step.icon}</div>
                        <h4 className="font-extrabold text-white text-base md:text-md">{step.title}</h4>
                      </div>
                      <p className="text-slate-400 text-xs mt-3 leading-relaxed font-semibold">{step.desc}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-1 text-slate-400 font-medium text-sm md:text-base">
                  <p>You conquer these checkpoints by following VibeLab's 7-Phase Python-to-Agent Mastery Path.</p>
                  <p className="text-[#C9A84C]/90 font-bold uppercase tracking-wide text-xs">Unlock certificates, solid badges, and full deployment validation in every milestone!</p>
                </div>
              </div>
            )}

            {/* Slide 6 - What can you build */}
            {currentSlide === 6 && (
              <div className="space-y-8 max-w-4xl w-full">
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  WHAT WILL <span className="text-[#C9A84C]">YOU CREATE?</span>
                </h2>
                <p className="text-slate-300 text-base md:text-lg">
                  Students just like you have built:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-2">
                  {[
                    "🤖 AI Study Assistants",
                    "📚 Homework Helpers",
                    "🎮 Educational Games",
                    "🌱 Environmental Solutions",
                    "🏥 Health & Wellness Tools",
                    "🏫 School Improvement Projects",
                    "📱 Mobile Apps",
                    "💡 Smart AI Ideas"
                  ].map((card, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                      className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-center text-center font-bold text-xs md:text-sm text-slate-200"
                    >
                      {card}
                    </motion.div>
                  ))}
                </div>
                <p className="text-[#C9A84C] font-extrabold text-sm uppercase tracking-widest font-jetbrains pt-2">
                  The choice is entirely yours.
                </p>
              </div>
            )}

            {/* Slide 7 - How AI will help you */}
            {currentSlide === 7 && (
              <div className="space-y-8 max-w-3xl w-full">
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  AI IS <span className="text-[#C9A84C]">YOUR TEAM</span>
                </h2>
                <p className="text-slate-300 text-base md:text-lg">
                  At every stage, AI helps you move faster and think bigger.
                </p>
                <div className="space-y-4 pt-2">
                  {[
                    { title: "🔍 In Ideation:", desc: "AI helps you discover problems worth solving and design solutions that make real sense." },
                    { title: "🏗️ In Building:", desc: "AI turns your approved design into a working product. No coding required." },
                    { title: "🎤 In Presenting:", desc: "AI helps you explain your product clearly and prepare your demo with full confidence." }
                  ].map((row, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      className="flex flex-col md:flex-row md:items-center text-left gap-4 bg-slate-900/50 p-6 rounded-2xl border-l-4 border-l-[#C9A84C] border-y border-r border-slate-800"
                    >
                      <h4 className="font-black text-[#C9A84C] text-sm font-jetbrains uppercase tracking-wider shrink-0 min-w-[120px]">
                        {row.title}
                      </h4>
                      <p className="text-slate-200 text-sm md:text-base font-semibold leading-relaxed">
                        {row.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 8 - The Builder's Code */}
            {currentSlide === 8 && (
              <div className="space-y-8 max-w-4xl w-full">
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  THE <span className="text-[#C9A84C]">BUILDER'S CODE</span>
                </h2>
                <p className="text-slate-300 text-base md:text-lg">
                  Students who succeed at VibeLab follow these rules:
                </p>
                <div className="space-y-3 pt-2 max-w-2xl mx-auto w-full">
                  {[
                    "Be curious — ask questions about everything",
                    "Try new things — even when you are unsure",
                    "Make mistakes — they are how you grow",
                    "Keep going — every builder faces challenges",
                    "Own your idea — it came from you"
                  ].map((rule, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-xl text-left"
                    >
                      <span className="text-[#C9A84C] font-jetbrains font-bold text-base bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                        0{idx + 1}
                      </span>
                      <p className="text-slate-200 font-bold text-sm md:text-base">{rule}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider font-jetbrains pt-2">
                  The students who learn the most experiment, explore, and never stop.
                </p>
              </div>
            )}

            {/* Slide 9 - Your First Challenge */}
            {currentSlide === 9 && (
              <div className="space-y-8 max-w-3xl">
                <h2 className="text-4xl md:text-7xl font-bebas tracking-wide text-white">
                  YOUR <span className="text-[#C9A84C]">FIRST CHALLENGE</span>
                </h2>
                <div className="flex justify-center gap-8 pt-2 select-none">
                  {[
                    { emoji: "🏠", label: "Home" },
                    { emoji: "🏫", label: "School" },
                    { emoji: "🌍", label: "Community" }
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.2, type: "spring" }}
                      className="flex flex-col items-center gap-2 bg-slate-900/40 border border-slate-800 h-24 w-24 rounded-2xl justify-center shadow-lg"
                    >
                      <span className="text-4xl">{item.emoji}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-jetbrains tracking-wider">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="text-slate-300 text-base md:text-lg max-w-xl mx-auto space-y-1">
                  <p>Look around you.</p>
                  <p className="font-semibold text-slate-400">Ask yourself one question:</p>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-8 py-6 rounded-2xl max-w-xl mx-auto"
                >
                  <h3 className="text-[#C9A84C] font-bebas text-3xl md:text-5xl tracking-wide uppercase leading-tight">
                    "WHAT IS ONE PROBLEM I WOULD LOVE TO SOLVE?"
                  </h3>
                </motion.div>
                <p className="text-slate-400 leading-relaxed max-w-lg mx-auto text-xs md:text-sm">
                  That question is the beginning of your next great project. You will answer it in the very next step.
                </p>
              </div>
            )}

            {/* Slide 10 - Launch */}
            {currentSlide === 10 && (
              <div className="space-y-6 max-w-xl">
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="inline-block px-3 py-1 bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] text-[10px] md:text-xs font-bold uppercase font-jetbrains tracking-widest rounded-full"
                >
                  PHASE 1
                </motion.span>
                <div className="space-y-2">
                  <h2 className="text-5xl md:text-8xl font-bebas text-white tracking-widest leading-none">
                    IDEATION
                  </h2>
                  <center>
                    <div className="w-16 h-[2px] bg-[#C9A84C]" />
                  </center>
                </div>
                <p className="text-[#C9A84C] font-bold text-lg md:text-xl font-display uppercase tracking-widest">
                  Find a problem worth solving.
                </p>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
                  Your AI mentor will guide you through a short conversation to discover your idea, understand your users, and define exactly what you want to build.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {["🎯 Problem Statement", "👤 Target User", "🏗️ Product Blueprint"].map((pill, idx) => (
                    <span 
                      key={idx} 
                      className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-[#C9A84C]/30 text-[#C9A84C] font-bold font-jetbrains text-[10px] rounded-full transition-colors"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                
                <div className="pt-6 w-full max-w-sm mx-auto z-20">
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="w-full bg-[#C9A84C] text-slate-950 px-8 py-5 rounded-2xl font-bold font-jetbrains text-sm uppercase tracking-widest hover:bg-[#D4B662] active:scale-[0.99] transition-all shadow-xl shadow-[#C9A84C]/15"
                  >
                    {isCompleting ? "Starting Journey..." : "BEGIN MY JOURNEY →"}
                  </button>
                </div>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-jetbrains">
                  Your progress is saved automatically.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-6 md:px-12 z-20 border-t border-slate-900/40 bg-slate-950/20">
        <div>
          {currentSlide > 1 ? (
            <button
              onClick={handleBack}
              className="px-6 py-3.5 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white font-jetbrains text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-800/80"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div className="w-24" /> // spacing placeholder
          )}
        </div>

        {/* 10 Navigation Dots */}
        <div className="flex items-center gap-2">
          {[...Array(10)].map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx + 1 > currentSlide ? 1 : -1);
                setCurrentSlide(idx + 1);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx + 1 
                  ? "w-6 bg-[#C9A84C]" 
                  : "w-2 bg-slate-800 border border-slate-700/60 hover:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div>
          <button
            onClick={handleNext}
            className="px-6 py-3.5 bg-[#C9A84C] text-slate-950 font-jetbrains text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#D4B662] transition-all flex items-center gap-2 shadow-lg shadow-[#C9A84C]/5"
          >
            {currentSlide === 10 ? "BEGIN" : currentSlide === 1 ? "Let's Go" : "Next"}{" "}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
