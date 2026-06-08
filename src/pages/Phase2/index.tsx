import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  Edit3, 
  FileText, 
  Trash2, 
  Check, 
  AlertTriangle,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

interface BlueprintData {
  id?: number;
  session_id: number;
  project_name: string;
  problem_statement: string;
  target_users: string;
  mvp_scope: string;
}

interface ProductSession {
  id: number;
  current_step: string;
  status: string;
}

export default function Phase2Page({ onNavigate }: { onNavigate?: (page: string) => void }) {
  // Navigation helper for fallback
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<ProductSession | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  
  // Local edit states for Blueprint
  const [projectName, setProjectName] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [mvpScope, setMvpScope] = useState('');

  // UI Flow Step Tracker (0 = Intro, 1 = Blueprint, 2 = Features, etc.)
  const [uiStep, setUiStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch session on mount
  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      if (!token) {
        toast.error('You must be logged in to access Phase 2');
        navigateTo('/login');
        return;
      }

      const res = await fetch('/api/product/session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch session information');
      }

      const data = await res.json();
      if (data.session) {
        setSession(data.session);

        // Check if user came via stepper/back click with "noredirect" query param
        const searchParams = new URL(window.location.href).searchParams;
        const noRedirect = searchParams.get('noredirect') === 'true';

        if (data.session.current_step && data.session.current_step !== 'blueprint' && !noRedirect) {
          const stepPaths: Record<string, string> = {
            'blueprint': '/phase/2',
            'features': '/phase/2/features',
            'user_journey': '/phase/2/journey',
            'screens': '/phase/2/screens',
            'review': '/phase/2/review',
            'description': '/phase/2/description',
            'explain': '/phase/2/explain',
            'demo': '/phase/2/demo',
            'complete': '/phase/2/complete',
            'approved': '/phase/2/complete'
          };
          const targetPath = stepPaths[data.session.current_step];
          if (targetPath && targetPath !== '/phase/2') {
            navigateTo(targetPath);
            return;
          }
        }

        if (data.blueprint) {
          setBlueprint(data.blueprint);
          setProjectName(data.blueprint.project_name || '');
          setProblemStatement(data.blueprint.problem_statement || '');
          setTargetUsers(data.blueprint.target_users || '');
          setMvpScope(data.blueprint.mvp_scope || '');
          
          setUiStep(1); // Blueprint screen
        } else {
          // Session exists but first blueprint generation failed or not started
          setUiStep(0);
        }
      } else {
        // No session exists, show Intro
        setUiStep(0);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error loading Phase 2 content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartProductCreation = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start product creation');
      }

      const data = await res.json();
      setSession({
        id: data.session_id,
        current_step: 'blueprint',
        status: 'in_progress'
      });
      setBlueprint(data.blueprint);
      
      if (data.blueprint) {
        setProjectName(data.blueprint.project_name || '');
        setProblemStatement(data.blueprint.problem_statement || '');
        setTargetUsers(data.blueprint.target_users || '');
        setMvpScope(data.blueprint.mvp_scope || '');
      }

      toast.success('AI pre-generated your initial project blueprint! Let’s refine it.');
      setUiStep(1); // Go to blueprint approval screen
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error starting product build');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveBlueprint = async () => {
    if (!projectName.trim()) return toast.error('Project Name is required');
    if (!problemStatement.trim()) return toast.error('Problem Statement is required');
    if (!targetUsers.trim()) return toast.error('Target Users definition is required');
    if (!mvpScope.trim()) return toast.error('MVP Scope is required');

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/blueprint/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id,
          project_name: projectName,
          problem_statement: problemStatement,
          target_users: targetUsers,
          mvp_scope: mvpScope
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Blueprint approval failed');
      }

      toast.success('Blueprint Approved! Generating features...');
      navigateTo('/phase/2/features');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to approve blueprint');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress Bar percentage helper
  const getProgressPercentage = (step: number) => {
    return Math.min(100, Math.max(0, step * 10));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#02050e] flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mb-4" />
        <p className="text-[#C9A84C] font-jetbrains text-xs tracking-widest font-bold">LOADING PHASE 2 CONTEXT...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02050e] text-white selection:bg-[#C9A84C]/20 selection:text-white relative overflow-hidden font-dmsans">
      {/* Premium ambient glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#C9A84C]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {uiStep === 0 ? (
          /* PHASE 2 INTRO */
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col justify-center min-h-screen px-6 py-20 max-w-4xl mx-auto text-center"
          >
            {/* Phase Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="font-jetbrains text-xs tracking-[0.25em] text-[#C9A84C] font-semibold uppercase mb-4 block"
            >
              PHASE 2 OF 5
            </motion.span>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="font-bebas text-5xl sm:text-7xl lg:text-8xl tracking-widest text-white leading-none mb-6"
            >
              PRODUCT CREATION
            </motion.h1>

            {/* Accent Gold Line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 60 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="h-[2px] bg-[#C9A84C] mx-auto mb-10"
            />

            {/* Narrative Body Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto space-y-6"
            >
              <p>
                Welcome to the Product Creation phase. In Phase 1, you identified a problem and designed a solution. Now it's time to bring your idea to life.
              </p>
              <p>
                You don't need to be a programmer or technology expert. VibeLab's AI Builder will help transform your idea into a working MVP — a Minimum Viable Product.
              </p>
              <p>
                Your role is to think like a product creator. Make decisions about features, user experience, and how your solution will help people.
              </p>
              <p>
                By the end of this phase, you will have a working prototype, a clear understanding of how it works, and the confidence to explain your product to others.
              </p>
            </motion.div>

            {/* Showcase Deliverable Pills */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-3 mt-10"
            >
              <span className="px-5 py-2 rounded-full text-xs font-semibold font-jetbrains bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] backdrop-blur-sm shadow-md">
                🏗️ Working MVP
              </span>
              <span className="px-5 py-2 rounded-full text-xs font-semibold font-jetbrains bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] backdrop-blur-sm shadow-md">
                📋 Blueprint
              </span>
              <span className="px-5 py-2 rounded-full text-xs font-semibold font-jetbrains bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] backdrop-blur-sm shadow-md">
                🎤 Demo Script
              </span>
            </motion.div>

            {/* CTA Trigger Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-14"
            >
              <button
                onClick={handleStartProductCreation}
                disabled={isSubmitting}
                className="w-full max-w-[400px] inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-wider text-sm sm:text-base px-8 py-5 rounded-2xl transition-all shadow-xl shadow-[#C9A84C]/10 hover:shadow-[#C9A84C]/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin text-black" />
                    GENERATING BLUEPRINT...
                  </>
                ) : (
                  <>
                    Let's Build My Product <ArrowRight className="w-5 h-5 ml-3" />
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        ) : uiStep === 1 ? (
          /* BLUEPRINT APPROVAL SCREEN */
          <motion.div
            key="blueprint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl mx-auto px-6 py-12"
          >
            {/* Custom Back Nav Button */}
            <button
              onClick={() => navigateTo('/dashboard')}
              className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-400 hover:text-[#C9A84C] mb-8 transition-colors uppercase gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>

            {/* Progress Tracker (Step 1 of 10) */}
            <Phase2Stepper activeStep={1} onNavigate={navigateTo} />

            {/* Header Content */}
            <div className="mb-10 text-center sm:text-left">
              <h2 className="font-bebas text-4xl sm:text-6xl tracking-widest text-white leading-none mb-3">
                YOUR PROJECT BLUEPRINT
              </h2>
              <p className="font-dmsans text-slate-400 text-sm sm:text-base leading-relaxed">
                Based on your Phase 1 ideation, here is your blueprint. Review it carefully — you can edit anything before approving.
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-8 bg-slate-950/40 border border-slate-800 p-8 rounded-3xl shadow-xl backdrop-blur-md">
              
              {/* Field 1: Project Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider font-jetbrains text-[#C9A84C] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full inline-block"></span> Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. FitTrack Elite"
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-[#C9A84C] text-sm text-white px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-600 font-medium font-sans shadow-inner"
                />
              </div>

              {/* Field 2: Problem Statement */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider font-jetbrains text-[#C9A84C] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full inline-block"></span> Problem Statement
                </label>
                <textarea
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  rows={3}
                  placeholder="Describe the precise, high-importance problem your user faces..."
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-[#C9A84C] text-sm text-slate-200 px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-600 font-medium font-sans resize-y leading-relaxed shadow-inner"
                />
              </div>

              {/* Field 3: Target Users */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider font-jetbrains text-[#C9A84C] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full inline-block"></span> Target Users
                </label>
                <textarea
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  rows={2}
                  placeholder="Define the exact audience type who will benefit most from this app..."
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-[#C9A84C] text-sm text-slate-200 px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-600 font-medium font-sans resize-y leading-relaxed shadow-inner"
                />
              </div>

              {/* Field 4: MVP Scope */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider font-jetbrains text-[#C9A84C] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full inline-block"></span> MVP Scope
                </label>
                <textarea
                  value={mvpScope}
                  onChange={(e) => setMvpScope(e.target.value)}
                  rows={3}
                  placeholder="Outline the lean, focused scope of features or value deliverables for phase 1..."
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-[#C9A84C] text-sm text-slate-200 px-5 py-4 rounded-xl outline-none transition-all placeholder:text-slate-600 font-medium font-sans resize-y leading-relaxed shadow-inner"
                />
              </div>

              {/* Informative Guidance */}
              <div className="p-4 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 flex items-start gap-3 mt-4">
                <Sparkles className="w-5 h-5 text-[#C9A84C] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Reviewing this details allows the Product Builder to set clean guardrails. Our AI will automatically suggest appropriate, high-fidelity UX elements and specific feature listings on the next step.
                </p>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-4">
                <button
                  onClick={handleApproveBlueprint}
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center bg-gradient-to-r from-[#C9A84C] to-[#E3C268] hover:from-[#E3C268] hover:to-[#C9A84C] text-black font-extrabold tracking-wider text-sm sm:text-base px-8 py-4.5 rounded-2xl transition-all shadow-xl shadow-[#C9A84C]/5 hover:shadow-[#C9A84C]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin text-black" />
                      SUBMITTING BLUEPRINT...
                    </>
                  ) : (
                    <>
                      Looks Good — Approve Blueprint <ArrowRight className="w-5 h-5 ml-3" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* PLACEHOLDER / FUTURE STEPS TRANSITION VIEW */
          <motion.div
            key="future"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col justify-center items-center min-h-screen px-6 text-center max-w-lg mx-auto"
          >
            <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 p-6 rounded-full mb-6 text-[#C9A84C] animate-pulse">
              <Check className="w-12 h-12" />
            </div>
            
            <h3 className="font-bebas text-3xl tracking-widest text-white leading-none mb-3">
              Features Generation Active
            </h3>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Your blueprint has been approved! The AI is generating feature suggestions. You're ready for Step 2: Feature Scope Selection.
            </p>

            <button
              onClick={() => navigateTo('/dashboard')}
              className="px-6 py-3 rounded-xl border border-slate-700 hover:border-[#C9A84C] text-[#C9A84C] font-semibold text-xs tracking-wider uppercase transition-colors"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
