import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  Trophy, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  Share2, 
  X, 
  FileText, 
  ListTodo, 
  Compass, 
  Monitor, 
  FileCode2, 
  HelpCircle, 
  Users,
  Copy,
  Check,
  Code
} from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

interface BlueprintData {
  project_name: string;
  problem_statement: string;
  target_users: string;
  mvp_scope: string;
}

interface FeatureItem {
  id: number;
  feature_name: string;
  feature_description: string;
  category: string;
  student_rationale?: string | null;
}

interface JourneyData {
  start_step: string;
  middle_step: string;
  final_step: string;
  user_goal: string;
}

interface ScreenItem {
  id: number;
  screen_name: string;
  screen_description: string;
  layout_type: string;
}

interface MVPData {
  mvp_html: string;
  architecture_explanation: string;
  product_description: string;
  demo_script: string;
  builder_reflection?: string | null;
}

export default function PhaseComplete({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projectData, setProjectData] = useState<{
    blueprint: BlueprintData | null;
    features: FeatureItem[];
    journey: JourneyData | null;
    screens: ScreenItem[];
    mvp: MVPData | null;
  }>({
    blueprint: null,
    features: [],
    journey: null,
    screens: [],
    mvp: null
  });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchCompleteProject();
  }, []);

  const fetchCompleteProject = async () => {
    setIsLoading(true);
    try {
      // Load user
      const userStr = localStorage.getItem('vibelab_user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }

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
        throw new Error('Failed to retrieve project deliverables.');
      }

      const data = await res.json();
      setProjectData({
        blueprint: data.blueprint || null,
        features: (data.features || []).filter((f: any) => f.category === 'must_have' && (f.is_included === true || f.is_included === 1 || f.is_included === '1')),
        journey: data.journey || null,
        screens: (data.screens || []).filter((s: any) => s.is_approved === true || s.is_approved === 1 || s.is_approved === '1'),
        mvp: data.mvp || null
      });

    } catch (error: any) {
      console.error(error);
      toast.error('Error loading completed records dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    // Schedule success toast in localStorage
    localStorage.setItem('show_phase2_complete_toast', 'true');
    navigateTo('/dashboard');
  };

  const handleShare = () => {
    if (!currentUser) return;
    const profileUrl = `${window.location.origin}/profile/${currentUser.vl_id || currentUser.id}`;
    
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    toast.success('Link copied! Share your project with anyone.', {
      icon: '🔗'
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const deliverables = [
    { label: 'Working MVP', delayCount: 0 },
    { label: 'Project Description', delayCount: 1 },
    { label: 'Feature List', delayCount: 2 },
    { label: 'User Flow Diagram', delayCount: 3 },
    { label: 'Product Screens', delayCount: 4 },
    { label: 'Demo Script', delayCount: 5 },
    { label: 'MVP Summary', delayCount: 6 },
    { label: 'Builder Reflection', delayCount: 7 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Trophy className="w-12 h-12 text-[#2563eb] animate-bounce mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">PREPARING CREDENTIAL MEMORANDUM...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans flex flex-col justify-center">
      {/* Immersive radial glows */}
      <div className="absolute top-[-20%] left-[-25%] w-[800px] h-[800px] rounded-full bg-[#2563eb]/5 blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-20%] w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
        
        {/* Stepper Progression Bar (Step 10 of 10) */}
        <div className="w-full mb-6">
          <Phase2Stepper activeStep={10} onNavigate={navigateTo} />
        </div>

        {/* TOP PANEL - STAGGER BLOCK 1: 0ms */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center space-y-6 max-w-2xl mb-10"
        >
          {/* Trophy Entrance Indicator */}
          <motion.div
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#2563eb]/20 to-amber-500/5 border border-[#2563eb]/35 flex items-center justify-center shadow-xl shadow-[#2563eb]/10 mx-auto"
          >
            <Trophy className="w-12 h-12 text-[#2563eb]" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="font-bebas text-6xl md:text-8xl tracking-widest text-[#2563eb] leading-none select-none">
              YOUR MVP IS READY
            </h1>
            <p className="text-slate-650 text-sm md:text-base font-medium font-sans">
              You have completed Phase 2 — Product Creation. It's time to celebrate!
            </p>
          </div>
        </motion.div>

        {/* DELIVERABLES GRID - STAGGER BLOCK 2: 150ms */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="w-full max-w-3xl mb-10 space-y-4"
        >
          <h3 className="text-center font-jetbrains text-[10px] tracking-widest font-black uppercase text-slate-500 select-none">
            SIGNED DELIVERABLES ARCHIVE
          </h3>

          {/* 2x4 Grid System */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deliverables.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + (item.delayCount * 0.08) }}
                className="p-4 rounded-2xl bg-white/70 border border-slate-200 flex items-center gap-2.5 transition-all hover:border-slate-200 shadow-md select-none group"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold text-slate-600 font-sans tracking-wide truncate">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* STATUS BADGE - STAGGER BLOCK 3: 300ms */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
          className="text-center p-6 rounded-3xl bg-amber-950/10 border border-amber-950/30 backdrop-blur-md max-w-md w-full mb-12 select-none"
        >
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-black font-jetbrains text-amber-400 tracking-widest uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            READY FOR QA
          </div>
          <p className="text-slate-500 text-xs font-medium font-sans">
            Your project is logged and ready for the next phase.
          </p>
        </motion.div>

        {/* ACTION BUTTONS BUTTONS - STAGGER BLOCK 4: 450ms */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}
          className="w-full max-w-[400px] flex flex-col gap-4 select-none"
        >
          {/* Button 1: Gold Primary */}
          <button
            onClick={handleContinue}
            className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs uppercase px-8 py-4 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/15 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Continue — Phase 3: Testing & Validation <ArrowRight className="w-4 h-4 ml-2.5" />
          </button>

          {/* Button 2: Dark Outline */}
          <button
            onClick={() => setShowProjectModal(true)}
            className="w-full backdrop-blur-sm bg-white/50 border border-slate-200 hover:border-slate-200 text-slate-600 font-extrabold text-xs font-jetbrains tracking-widest uppercase py-4 rounded-xl transition-all hover:bg-white text-center cursor-pointer flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" /> View My Full Project
          </button>

          {/* Button 3: Ghost Text */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-[#2563eb] text-xs font-bold uppercase tracking-widest transition-colors py-3 cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copiedLink ? 'Link Copied!' : 'Share My Project'}
          </button>
        </motion.div>

      </div>

      {/* FULL PROJECT PREVIEW MODAL - FULLY IMMERSIVE PORTAL */}
      <AnimatePresence>
        {showProjectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Headline */}
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-[#2563eb]" />
                  <div>
                    <h3 className="font-bebas text-2xl tracking-wider text-white">
                      FULL ARCHIVAL DOCUMENT KIT
                    </h3>
                    <p className="text-[10px] font-black text-slate-500 font-jetbrains uppercase tracking-widest">
                      {projectData.blueprint?.project_name || 'VibeLab App Builder Project'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Sub-views */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 scrollbar-thin select-text">
                
                {/* 1. Blueprint Overview */}
                <div className="space-y-4">
                  <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                    <FileText className="w-5 h-5" /> 1. Your Project Blueprint
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Project Name</span>
                      <p className="text-sm font-bold text-white">{projectData.blueprint?.project_name}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Audience</span>
                      <p className="text-sm text-slate-650">{projectData.blueprint?.target_users}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1 md:col-span-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Problem Statement</span>
                      <p className="text-sm text-slate-650 leading-relaxed font-normal">{projectData.blueprint?.problem_statement}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1 md:col-span-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">MVP Definition</span>
                      <p className="text-sm text-slate-650 leading-relaxed font-normal">{projectData.blueprint?.mvp_scope}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Feature Stack */}
                <div className="space-y-4 border-t border-slate-200 pt-8">
                  <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                    <ListTodo className="w-5 h-5" /> 2. Feature Discovery & Rationales
                  </h4>
                  <div className="space-y-3">
                    {projectData.features.map((feat) => (
                      <div key={feat.id} className="p-4 rounded-xl bg-slate-50/40 border border-slate-200 flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-white">{feat.feature_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-normal">{feat.feature_description}</p>
                          {feat.student_rationale && (
                            <div className="mt-2 text-[11px] font-sans text-amber-500/90 italic">
                              Rationale: "{feat.student_rationale}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. User Flow */}
                {projectData.journey && (
                  <div className="space-y-4 border-t border-slate-200 pt-8">
                    <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                      <Compass className="w-5 h-5" /> 3. User Journey
                    </h4>
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-[#2563eb] uppercase tracking-widest">End User Objective</span>
                        <p className="text-sm text-slate-800 font-bold">{projectData.journey.user_goal}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-white/65 border border-slate-200">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Step 1: Start</span>
                          <p className="text-xs text-slate-650">{projectData.journey.start_step}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/65 border border-slate-200">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Step 2: Experience</span>
                          <p className="text-xs text-slate-650">{projectData.journey.middle_step}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/65 border border-slate-200">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Step 3: Outcome</span>
                          <p className="text-xs text-slate-650">{projectData.journey.final_step}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Product Screens */}
                <div className="space-y-4 border-t border-slate-200 pt-8">
                  <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                    <Monitor className="w-5 h-5" /> 4. Product Screens
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectData.screens.map((scr) => (
                      <div key={scr.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-white mb-1">{scr.screen_name}</p>
                          <span className="text-[8px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-[#2563eb] rounded-full uppercase">{scr.layout_type}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-normal leading-relaxed">{scr.screen_description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Working MVP iframe Preview */}
                {projectData.mvp?.mvp_html && (
                  <div className="space-y-4 border-t border-slate-200 pt-8">
                    <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                      <FileCode2 className="w-5 h-5" /> 5 & 6. Sandboxed MVP Prototype
                    </h4>
                    <div className="h-[450px] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl">
                      <iframe
                        title="MVP Interactive Prototype Preview Modal"
                        sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                        srcDoc={projectData.mvp.mvp_html}
                        className="w-full h-full border-none object-contain"
                      />
                    </div>
                    {projectData.mvp.architecture_explanation && (
                      <div className="p-5 rounded-2xl bg-slate-50/40 border border-slate-200 space-y-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block border-b border-slate-950 pb-2">Architecture Spec Summary:</span>
                        <p className="text-xs text-slate-650 leading-relaxed font-normal whitespace-pre-wrap select-text pl-1">{projectData.mvp.architecture_explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Product Description */}
                {projectData.mvp?.product_description && (
                  <div className="space-y-4 border-t border-slate-200 pt-8">
                    <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                      <FileText className="w-5 h-5" /> 7. Pitch Story & Description
                    </h4>
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 font-sans text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-wrap pl-1 bg-white/50">
                      {projectData.mvp.product_description}
                    </div>
                  </div>
                )}

                {/* 7. Practice Script */}
                {projectData.mvp?.demo_script && (
                  <div className="space-y-4 border-t border-slate-200 pt-8">
                    <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                      <HelpCircle className="w-5 h-5" /> 9. Demo Script & Presentation
                    </h4>
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-2 select-text font-normal font-sans leading-relaxed text-sm text-slate-600 bg-white/50 whitespace-pre-wrap">
                      {projectData.mvp.demo_script}
                    </div>
                  </div>
                )}

                {/* 8. Builder reflection */}
                {projectData.mvp?.builder_reflection && (
                  <div className="space-y-4 border-t border-slate-200 pt-8">
                    <h4 className="font-bebas text-xl tracking-widest text-[#2563eb] flex items-center gap-2">
                      <Users className="w-5 h-5" /> 6. Builder Key Lessons (MVP Review)
                    </h4>
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 font-sans italic text-sm text-slate-600 leading-relaxed bg-white/50 whitespace-pre-wrap pl-1 font-normal">
                      "{projectData.mvp.builder_reflection}"
                    </div>
                  </div>
                )}

              </div>

              {/* Sticky Footer */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end shrink-0 select-none">
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:text-white text-slate-600 text-xs font-bold font-jetbrains tracking-widest uppercase rounded-xl transition-all cursor-pointer"
                >
                  Close Document preview
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
