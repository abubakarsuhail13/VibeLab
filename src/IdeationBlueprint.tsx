import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, HelpCircle, Loader2, Share2, Compass, Cpu, Target, CheckCircle, Award } from "lucide-react";
import { EducationalAiBackground } from "./components/EducationalAiBackground";

interface BlueprintData {
  id: number;
  product_name: string;
  problem_statement: string;
  target_user_persona: string;
  solution_concept: string;
  ai_opportunity_map: string[] | null;
  mvp_definition: string;
  learning_path: string[] | null;
  product_features: string[] | null;
  complexity: "beginner" | "intermediate" | "advanced";
  estimated_build_time: string;
  recommended_track: string;
  mvp_note: string | null;
}

interface IdeationBlueprintProps {
  onNavigate: (page: string) => void;
  onUpdateUser?: (user: any) => void;
}

export default function IdeationBlueprint({ onNavigate, onUpdateUser }: IdeationBlueprintProps) {
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [userVlId, setUserVlId] = useState<string>("");

  useEffect(() => {
    // Get logged in user details for making a public link
    const savedUser = localStorage.getItem("vibelab_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.vl_id) {
          setUserVlId(parsed.vl_id);
        }
      } catch (err) {
        console.error("Failed to parse user storage:", err);
      }
    }

    const fetchBlueprint = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const token = localStorage.getItem("vibelab_token");
        if (!token) {
          throw new Error("Authorization credentials not found.");
        }

        const res = await fetch("/api/ideation/blueprint", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error("Failed to load your blueprint.");
        }

        const data = await res.json();
        if (!data) {
          throw new Error("You haven't generated a blueprint yet!");
        }
        setBlueprint(data);

        // Update stored user details locally so dashboard immediately knows Phase 1 is unlocked
        const savedUserLocal = localStorage.getItem("vibelab_user");
        if (savedUserLocal) {
          try {
            const parsed = JSON.parse(savedUserLocal);
            parsed.ideation_completed = true;
            localStorage.setItem("vibelab_user", JSON.stringify(parsed));
            if (onUpdateUser) {
              onUpdateUser(parsed);
            }
          } catch (e) {
            console.error("Failed to update user local storage state", e);
          }
        }
      } catch (err: any) {
        console.error("Error fetching blueprint:", err);
        setErrorMsg(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchBlueprint();
  }, []);

  const handleShare = () => {
    const defaultHost = window.location.origin;
    const shareUrl = userVlId 
      ? `${defaultHost}/verify/${userVlId}`
      : `${defaultHost}/verify-credential`; // fallback if no specific profile page ready
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center font-dmsans">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mx-auto" />
          <p className="font-jetbrains text-xs tracking-widest uppercase text-slate-400 font-bold">
            Fetching Your Project Blueprint...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !blueprint) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center p-6 text-center font-dmsans">
        <div className="max-w-md border border-red-105 bg-red-50 p-8 rounded-3xl space-y-6 shadow-sm">
          <p className="text-red-600 font-jetbrains text-sm font-bold">⚠️ {errorMsg || "Blueprint details could not be found."}</p>
          <button
            onClick={() => onNavigate("ideation")}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl transition-all"
          >
            Start Discovery Session
          </button>
        </div>
      </div>
    );
  }

  // Parse arrays safely
  let opportunities: string[] = [];
  try {
    if (typeof blueprint.ai_opportunity_map === 'string') {
      opportunities = JSON.parse(blueprint.ai_opportunity_map);
    } else if (Array.isArray(blueprint.ai_opportunity_map)) {
      opportunities = blueprint.ai_opportunity_map;
    }
  } catch (e) {
    console.error("Failed to parse opportunities map:", e);
  }
  
  let learningPath: string[] = [];
  try {
    if (typeof blueprint.learning_path === 'string') {
      learningPath = JSON.parse(blueprint.learning_path);
    } else if (Array.isArray(blueprint.learning_path)) {
      learningPath = blueprint.learning_path;
    }
  } catch (e) {
    console.error("Failed to parse learning path:", e);
  }

  let features: string[] = [];
  try {
    if (typeof blueprint.product_features === 'string') {
      features = JSON.parse(blueprint.product_features);
    } else if (Array.isArray(blueprint.product_features)) {
      features = blueprint.product_features;
    }
  } catch (e) {
    console.error("Failed to parse product features:", e);
  }

  // Determine complexity badge color
  const getComplexityStyles = (comp: string) => {
    switch (comp?.toLowerCase()) {
      case "beginner":
        return "bg-emerald-50 border border-emerald-100 text-emerald-600";
      case "intermediate":
        return "bg-amber-50 border border-amber-100 text-amber-600";
      case "advanced":
        return "bg-red-50 border border-red-100 text-red-600";
      default:
        return "bg-white border border-slate-200 text-slate-500";
    }
  };

  // Motion delay multiplier helper
  const itemVariant = (index: number) => ({
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: index * 0.15,
        ease: "easeOut"
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-20 px-6 sm:px-12 relative overflow-hidden font-dmsans">
      <EducationalAiBackground isDark={false} />
      {/* Decorative premium lighting glows */}
      <div className="absolute top-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-bl from-cyan-200/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-15%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-cyan-200/10 to-transparent blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        
        {/* HEADER BLOCK */}
        <motion.div
          variants={itemVariant(0)}
          initial="hidden"
          animate="visible"
          className="text-center space-y-4"
        >
          <div className="inline-flex p-4 rounded-full border border-cyan-200 bg-white shadow-md shadow-slate-100">
            <Trophy className="w-8 h-8 text-cyan-600" />
          </div>
          <p className="font-jetbrains text-[10px] sm:text-xs font-black tracking-[0.25em] text-cyan-600 uppercase">
            Discovery Phase Complete
          </p>
          <h2 className="font-bebas text-3xl sm:text-5xl md:text-6xl text-slate-900 tracking-widest leading-none">
            YOUR AI PRODUCT BLUEPRINT IS READY
          </h2>
        </motion.div>

        {/* COMPREHENSIVE CARD GRID CONTAINER */}
        <div className="space-y-8">
          
          {/* PRODUCT NAME BLOCK */}
          <motion.div
            variants={itemVariant(1)}
            initial="hidden"
            animate="visible"
            className="border border-cyan-100 bg-gradient-to-br from-cyan-50/40 to-white rounded-[2rem] p-8 sm:p-12 text-center space-y-3 relative overflow-hidden shadow-md shadow-cyan-100/30"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <p className="font-jetbrains text-[10px] font-black tracking-widest text-cyan-600 uppercase">
              Assigned Brand Name
            </p>
            <h1 className="font-bebas text-5xl sm:text-7xl lg:text-8xl text-slate-900 tracking-wide uppercase leading-none">
              {blueprint.product_name}
            </h1>
          </motion.div>

          {/* ROW 1 — 3 EQUAL COLUMNS */}
          <motion.div
            variants={itemVariant(2)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="border border-slate-200 bg-white rounded-[2rem] p-6 relative group hover:border-cyan-300 transition-all shadow-sm shadow-slate-100/60 hover:shadow-md">
              <div className="flex items-center gap-2 mb-4 text-cyan-600">
                <Target className="w-4 h-4" />
                <h3 className="font-jetbrains text-xs font-bold uppercase tracking-wider">The Problem</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">{blueprint.problem_statement}</p>
            </div>

            <div className="border border-slate-200 bg-white rounded-[2rem] p-6 relative group hover:border-cyan-300 transition-all shadow-sm shadow-slate-100/60 hover:shadow-md">
              <div className="flex items-center gap-2 mb-4 text-cyan-600">
                <Compass className="w-4 h-4" />
                <h3 className="font-jetbrains text-xs font-bold uppercase tracking-wider">Target User</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">{blueprint.target_user_persona}</p>
            </div>

            <div className="border border-slate-200 bg-white rounded-[2rem] p-6 relative group hover:border-cyan-300 transition-all shadow-sm shadow-slate-100/60 hover:shadow-md">
              <div className="flex items-center gap-2 mb-4 text-cyan-600">
                <Cpu className="w-4 h-4" />
                <h3 className="font-jetbrains text-xs font-bold uppercase tracking-wider">The Solution</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">{blueprint.solution_concept}</p>
            </div>
          </motion.div>

          {/* AI OPPORTUNITY MAP */}
          {opportunities.length > 0 && (
            <motion.div
              variants={itemVariant(3)}
              initial="hidden"
              animate="visible"
              className="border border-slate-200 bg-white rounded-[2rem] p-6 sm:p-8 space-y-4 shadow-sm"
            >
              <h3 className="font-jetbrains text-xs font-bold text-cyan-600 uppercase tracking-wider">
                How AI Can Help
              </h3>
              <div className="flex flex-wrap gap-3">
                {opportunities.map((item, idx) => (
                  <span
                    key={idx}
                    className="border border-cyan-100 bg-cyan-50/50 text-cyan-700 font-semibold font-jetbrains text-xs px-4 py-2 rounded-xl"
                  >
                    ✨ {item}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* MVP DEFINITION */}
          <motion.div
            variants={itemVariant(4)}
            initial="hidden"
            animate="visible"
            className="border border-cyan-150 bg-cyan-50/20 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-sm"
          >
            <div className="space-y-2">
              <h3 className="font-jetbrains text-xs font-bold text-cyan-600 uppercase tracking-wider">
                Your 1-Week MVP
              </h3>
              <p className="text-slate-800 text-base leading-relaxed font-semibold">{blueprint.mvp_definition}</p>
            </div>

            {/* MVP Spec Badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="bg-white border border-slate-200 font-jetbrains text-[11px] font-bold text-slate-500 px-4.5 py-2.5 rounded-xl uppercase tracking-wider">
                ⏳ {blueprint.estimated_build_time}
              </div>
              <div className={`font-jetbrains text-[11px] font-bold px-4.5 py-2.5 rounded-xl uppercase tracking-wider ${getComplexityStyles(blueprint.complexity)}`}>
                🧠 {blueprint.complexity}
              </div>
              <div className="bg-white border border-slate-200 font-jetbrains text-[11px] font-bold text-slate-500 px-4.5 py-2.5 rounded-xl uppercase tracking-wider">
                🛠️ {blueprint.recommended_track}
              </div>
            </div>
          </motion.div>

          {/* SUGGESTED LEARNING PATH */}
          {learningPath.length > 0 && (
            <motion.div
              variants={itemVariant(5)}
              initial="hidden"
              animate="visible"
              className="border border-slate-200 bg-white rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <h3 className="font-jetbrains text-xs font-bold text-cyan-600 uppercase tracking-wider">
                Learn This First
              </h3>
              <div className="space-y-4">
                {learningPath.map((path, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <div className="w-7 h-7 bg-cyan-50 border border-cyan-100 text-cyan-600 font-jetbrains font-bold rounded-lg flex items-center justify-center shrink-0 text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-slate-650 text-sm pt-0.5 leading-relaxed font-semibold">{path}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* KEY FEATURES */}
          {features.length > 0 && (
            <motion.div
              variants={itemVariant(6)}
              initial="hidden"
              animate="visible"
              className="border border-slate-200 bg-white rounded-[2rem] p-6 sm:p-8 space-y-4 shadow-sm"
            >
              <h3 className="font-jetbrains text-xs font-bold text-cyan-600 uppercase tracking-wider">
                Core Features
              </h3>
              <div className="flex flex-wrap gap-3">
                {features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-50 border border-slate-100 text-slate-700 font-semibold font-dmsans text-sm px-4.5 py-2 rounded-xl shadow-sm"
                  >
                    📦 {feat}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* MVP NOTE (CALLOUT IF EXISTENT) */}
          {blueprint.mvp_note && (
            <motion.div
              variants={itemVariant(7)}
              initial="hidden"
              animate="visible"
              className="border-l-4 border-cyan-500 bg-cyan-50/20 rounded-r-2xl p-6 space-y-2 shadow-sm"
            >
              <h4 className="font-jetbrains text-xs font-bold text-cyan-600 uppercase tracking-wider">
                We scoped this down for you:
              </h4>
              <p className="text-slate-700 text-sm leading-relaxed font-semibold">{blueprint.mvp_note}</p>
            </motion.div>
          )}

          {/* CTA SECTIONS */}
          <motion.div
            variants={itemVariant(8)}
            initial="hidden"
            animate="visible"
            className="pt-6 flex flex-col sm:flex-row gap-4 w-full"
          >
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex-grow bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base px-8 py-4.5 rounded-2xl transition-all shadow-xl shadow-slate-950/10 active:scale-[0.98] select-none text-center cursor-pointer"
            >
              Unlock Phase 2 — Start Building →
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-705 font-bold text-sm px-6 py-4.5 rounded-2xl transition-all active:scale-[0.98] shadow-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-cyan-600" />
              <span>{copied ? "Copied!" : "Share My Blueprint"}</span>
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
