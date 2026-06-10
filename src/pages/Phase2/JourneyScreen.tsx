import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Sparkles, 
  Check, 
  Compass, 
  MapPin,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import Phase2Stepper from '../../components/Phase2Stepper';

interface JourneyStep {
  step_number: number;
  title: string;
  description: string;
}

interface UserJourneyData {
  steps: JourneyStep[];
  key_actions: string[];
}

interface ProductSession {
  id: number;
  current_step: string;
  status: string;
}

export default function JourneyScreen({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const navigateTo = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = page;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [session, setSession] = useState<ProductSession | null>(null);
  const [journey, setJourney] = useState<UserJourneyData | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
        throw new Error('Failed to load session details');
      }

      const data = await res.json();
      if (!data.session) {
        navigateTo('/phase/2');
        return;
      }

      setSession(data.session);

      if (!data.user_journey) {
        toast.error('User journey was not generated yet. Redirecting back to feature selection!');
        navigateTo('/phase/2/features');
        return;
      }

      setJourney(data.user_journey);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error fetching user journey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveJourney = async () => {
    setIsApproving(true);
    try {
      const token = localStorage.getItem('vibelab_token');
      const res = await fetch('/api/product/journey/approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session?.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to approve user journey');
      }

      toast.success('User journey approved! Mapping layouts and product wireframes...');
      navigateTo('/phase/2/screens');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error approving user journey');
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-white">
        <Loader2 className="w-12 h-12 text-[#2563eb] animate-spin mb-4" />
        <p className="text-[#2563eb] font-jetbrains text-xs tracking-widest font-bold">LOADING USER JOURNEY MAP...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#2563eb]/25 pb-24 relative overflow-hidden font-dmsans">
      {/* Visual lighting background styles */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#2563eb]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl mx-auto px-6 py-12">
        {/* Navigation row back */}
        <button
          onClick={() => navigateTo('/phase/2/features')}
          className="inline-flex items-center text-xs font-semibold font-jetbrains text-slate-500 hover:text-[#2563eb] mb-8 transition-colors uppercase gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features Discovery
        </button>

        {/* Level Steps Bar (Step 3 of 10) */}
        <Phase2Stepper activeStep={3} onNavigate={navigateTo} />

        {/* Big Bebas title Block */}
        <div className="mb-12 text-center md:text-left">
          <h2 className="font-bebas text-5xl md:text-7xl tracking-widest text-[#2563eb] leading-none mb-4">
            USER JOURNEY
          </h2>
          <p className="font-sans text-slate-650 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
            This shows how someone will use your product, step by step.
          </p>
        </div>

        {/* Horizontal scrollable roadmap step-cards row with design arrows */}
        <div className="mb-12">
          <div className="flex flex-row overflow-x-auto gap-6 pb-6 pt-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {journey?.steps?.map((step, idx) => {
              // We grab corresponding key action or fallback
              const linkedAction = journey?.key_actions?.[idx] || journey?.key_actions?.[idx % (journey?.key_actions?.length || 1)] || "Complete critical interaction";
              const isLast = idx === (journey?.steps?.length || 1) - 1;

              return (
                <div key={idx} className="flex-none flex items-center">
                  {/* Step Card component */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                    className="w-[320px] sm:w-[350px] bg-white/40 hover:bg-white/65 border border-slate-200 hover:border-[#2563eb]/30 p-6 rounded-2xl transition-all duration-300 relative flex flex-col justify-between min-h-[300px] h-full group shadow-lg"
                  >
                    {/* Top status & node index info */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-jetbrains text-xs font-black text-[#2563eb]">
                        0{step.step_number || idx + 1}
                      </div>
                      <span className="text-[9px] font-bold font-jetbrains text-slate-500 uppercase tracking-widest px-2.5 py-1 bg-white rounded-md border border-slate-200">
                        STEP {idx + 1}
                      </span>
                    </div>

                    {/* Step Name Content */}
                    <div className="space-y-1.5 grow mb-5">
                      <h4 className="text-base font-bold text-white tracking-wide font-sans group-hover:text-[#2563eb] transition-colors">
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans font-normal">
                        {step.description}
                      </p>
                    </div>

                    {/* Integrated Key action card block */}
                    <div className="mt-auto p-4 rounded-xl bg-white border border-slate-200 group-hover:bg-[#2563eb]/5 group-hover:border-[#2563eb]/20 transition-all">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2563eb] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold font-jetbrains uppercase tracking-widest text-[#2563eb]">
                            Critical Action
                          </span>
                          <p className="text-[10px] text-slate-650 leading-normal font-sans">
                            {linkedAction}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Golden connector arrows showing progression flow */}
                  {!isLast && (
                    <div className="px-4 flex items-center justify-center">
                      <ChevronRight className="w-8 h-8 text-[#2563eb]/40 animate-pulse stroke-[3px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gold lock-in callout row */}
        <div className="bg-white/65 border border-slate-200 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md">
          <div className="flex items-start gap-3.5 max-w-xl">
            <Compass className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wide">
                User Journey Map Complete
              </h5>
              <p className="text-[11px] sm:text-xs text-slate-500 font-normal leading-relaxed">
                Review this touchpoint flow carefully. Clicking below prompts the AI to generate high fidelity mockup wireframes outlining how these interactive screens render dynamically.
              </p>
            </div>
          </div>

          <button
            onClick={handleApproveJourney}
            disabled={isApproving}
            className="w-full md:w-auto inline-flex items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] text-white font-extrabold tracking-widest text-xs sm:text-sm px-8 py-4.5 rounded-xl transition-all shadow-xl shadow-[#2563eb]/5 hover:shadow-[#2563eb]/25 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer uppercase font-sans font-black whitespace-nowrap"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" />
                Processing Touchpoints...
              </>
            ) : (
              <>
                This is Right — Generate My Screens <ArrowRight className="w-4.5 h-4.5 ml-2.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
