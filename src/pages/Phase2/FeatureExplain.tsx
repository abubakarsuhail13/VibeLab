import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Loader2, ArrowRight, UserCheck, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

interface FeatureItem {
  id: number;
  feature_name: string;
  feature_description: string;
  category: string;
  is_included: boolean | number;
  student_rationale?: string | null;
  ai_feedback?: string | null;
}

export default function FeatureExplain({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  // Tracking busy states on blur evaluation per card
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchSessionFeatures();
  }, []);

  const fetchSessionFeatures = async () => {
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
        
        // Filter must_have features that are approved/included
        const activeFeatures = (data.features || []).filter((f: any) => {
          const isInc = f.is_included === true || f.is_included === 1 || f.is_included === '1';
          return f.category === 'must_have' && isInc;
        });

        setFeatures(activeFeatures);
      } else {
        toast.error('No active session found.');
        navigateTo('/phase/2');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error loading features list.');
    } finally {
      setIsLoading(false);
    }
  };

  // Triggers feedback evaluation onblur of individual card
  const handleRationaleBlur = async (featureId: number, currentText: string) => {
    if (!currentText.trim()) return;

    // Skip if they already have feedback and haven't altered text
    const matched = features.find(f => f.id === featureId);
    if (matched && matched.student_rationale === currentText && matched.ai_feedback) {
      return;
    }

    setEvaluatingId(featureId);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/features/explain', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          feature_id: featureId,
          student_rationale: currentText
        })
      });

      if (!res.ok) {
        throw new Error('Feedback compilation suspended');
      }

      const resData = await res.json();
      
      // Update local state feature rationale and generated feedback text
      setFeatures(prev => prev.map(f => {
        if (f.id === featureId) {
          return {
            ...f,
            student_rationale: currentText,
            ai_feedback: resData.ai_feedback
          };
        }
        return f;
      }));

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to parse AI mentor rationale evaluation.');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleTextChange = (featureId: number, text: string) => {
    setFeatures(prev => prev.map(f => {
      if (f.id === featureId) {
        return { ...f, student_rationale: text };
      }
      return f;
    }));
  };

  const handleNextStep = () => {
    // Check if at least some entries are filled out
    const emptyCount = features.filter(f => !f.student_rationale || !f.student_rationale.trim()).length;
    if (emptyCount > 0) {
      const confirmProceed = window.confirm(`You haven't explained ${emptyCount} feature(s) yet. It's highly recommended to fill them out to show you understand your product design! Proceed anyway?`);
      if (!confirmProceed) return;
    }

    toast.success('Features declared! Let\'s draft your demo script.');
    navigateTo('/phase/2/demo');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">RETRIEVING FEATURE SPECS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Visual neon drops */}
      <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[0%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#2563eb]/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto px-6 py-12">
        
        {/* Step Progression Bar (Step 8 of 10) */}
        <Phase2Stepper activeStep={8} onNavigate={navigateTo} />

        {/* Branding & Header */}
        <div className="text-center md:text-left mb-10 space-y-3">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none">
            EXPLAIN YOUR FEATURES
          </h2>
          <p className="text-slate-650 text-base md:text-lg leading-relaxed max-w-3xl">
            For each feature, write why you chose to include it. This shows you really understand your product's design and user purpose.
          </p>
        </div>

        {/* Feature Cards Loop */}
        <div className="space-y-8 mb-12">
          {features.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/65 border border-slate-200 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm text-slate-600">
                You didn't include any "Must-Have" features in your scope layouts! Let's bypass to the preparation.
              </p>
            </div>
          ) : (
            features.map((feat) => (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/65 border border-slate-200 hover:border-slate-200 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl space-y-6 transition-all"
              >
                {/* Feature specifications column header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <h3 className="font-sans font-bold text-lg text-white">
                      {feat.feature_name}
                    </h3>
                    <p className="font-sans text-xs text-slate-600 leading-relaxed font-normal">
                      {feat.feature_description}
                    </p>
                  </div>
                  <div>
                    <span className="px-3 py-1 bg-cyan-950/20 border border-cyan-800/15 text-[10px] font-black font-jetbrains tracking-wider rounded-full uppercase text-cyan-400">
                      MUST HAVE
                    </span>
                  </div>
                </div>

                {/* Student Input Space */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black font-jetbrains tracking-wider uppercase text-slate-500 select-none">
                    Why did you include this feature? <span className="text-[#2563eb]">*</span>
                  </label>
                  <textarea
                    value={feat.student_rationale || ''}
                    onChange={(e) => handleTextChange(feat.id, e.target.value)}
                    onBlur={(e) => handleRationaleBlur(feat.id, e.target.value)}
                    rows={3}
                    placeholder="Explain your thinking here... (e.g. 'This is how kids can input their homework quickly before school so they never forget!')"
                    className="w-full bg-white border border-slate-200 hover:border-slate-200 focus:border-[#2563eb] text-sm text-slate-600 px-5 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-650 resize-y leading-relaxed font-normal"
                  />
                </div>

                {/* Real-time validating Gemini feedback block */}
                <div className="min-h-[40px] px-5 py-4 rounded-xl bg-slate-50/35 border border-slate-200 flex items-start gap-3 relative overflow-hidden">
                  <div className="absolute right-3 top-3 select-none pointer-events-none">
                    <Sparkles className="w-5 h-5 text-[#2563eb]/10" />
                  </div>
                  
                  {evaluatingId === feat.id ? (
                    <div className="flex items-center gap-2.5 text-slate-500 font-jetbrains text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
                      Generating mentor validation code...
                    </div>
                  ) : feat.ai_feedback ? (
                    <div className="space-y-1 select-text">
                      <span className="block text-[9px] font-black font-jetbrains text-slate-500 uppercase tracking-widest leading-none select-none">
                        PRO MEMBRUM FEEDBACK:
                      </span>
                      <p className="text-xs text-[#2563eb] font-semibold leading-relaxed">
                        {feat.ai_feedback}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-550 italic font-sans">
                      Start writing your explanation and press tab or click away to get instant validation from your AI Coach!
                    </p>
                  )}
                </div>

              </motion.div>
            ))
          )}
        </div>

        {/* Bottom Actions Frame */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4 border-t border-slate-200 select-none">
          <button
            onClick={() => navigateTo('/phase/2/description')}
            className="px-6 py-4 bg-white border border-slate-200 hover:border-slate-200 text-slate-600 hover:text-slate-700 text-xs font-black font-jetbrains tracking-widest uppercase rounded-xl transition-all cursor-pointer"
          >
            Go Back to Description
          </button>

          <button
            onClick={handleNextStep}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs uppercase px-8 py-4 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/15 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            I've Explained My Features <ArrowRight className="w-4 h-4 ml-2.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
